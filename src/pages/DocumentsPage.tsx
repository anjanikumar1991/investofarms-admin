import { useEffect, useMemo, useState } from 'react';
import { Download, Edit, Eye, EyeOff, Upload } from 'lucide-react';
import { api, unwrap } from '../api/client';

interface AdminDocument {
  id: number;
  document_name: string;
  document_type: string;
  document_location: string;
  document_badge: string;
  is_visible: boolean;
  expiry_date: string | null;
  created_at: string;
  groups: Array<{ id: number; name: string }>;
  user_distribution_count: number;
}

interface DistributionGroup {
  id: number;
  name: string;
  description: string | null;
  is_system_group: boolean;
}

export function DocumentsPage() {
  const [groups, setGroups] = useState<DistributionGroup[]>([]);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [filterGroupId, setFilterGroupId] = useState('');
  const [filterBadge, setFilterBadge] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentBadge, setDocumentBadge] = useState<'public' | 'sensitive'>('sensitive');
  const [uploadGroupIds, setUploadGroupIds] = useState<number[]>([]);
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingDocument, setEditingDocument] = useState<AdminDocument | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);

  const filterableGroups = useMemo(() => groups.filter(g => !g.is_system_group), [groups]);

  const loadGroups = async () => {
    try {
      const response = await api.get('/v1/distribution-groups/');
      setGroups(unwrap<DistributionGroup[]>(response) || []);
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterGroupId) params.append('group_id', filterGroupId);
      if (filterBadge) params.append('badge', filterBadge);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const response = await api.get(`/v1/admin/documents${params.toString() ? `?${params.toString()}` : ''}`);
      setDocuments(unwrap<AdminDocument[]>(response) || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [filterGroupId, filterBadge, startDate, endDate]);

  const resetUploadForm = () => {
    setDocumentName('');
    setDocumentType('');
    setDocumentBadge('sensitive');
    setUploadGroupIds([]);
    setExpiryDate('');
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!documentName.trim() || !documentType.trim() || !selectedFile) {
      alert('Please fill in document name, type and file');
      return;
    }

    if (documentBadge === 'sensitive' && uploadGroupIds.length === 0) {
      alert('Please select at least one distribution group for sensitive documents');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document_name', documentName.trim());
      formData.append('document_type', documentType.trim());
      formData.append('document_badge', documentBadge);
      if (uploadGroupIds.length > 0) formData.append('distribution_group_ids', uploadGroupIds.join(','));
      if (expiryDate) formData.append('expiry_date', expiryDate);
      formData.append('file', selectedFile);

      await api.post('/v1/admin/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await loadDocuments();
      resetUploadForm();
      setShowUploadModal(false);
      alert('Document uploaded as invisible. Click Post to make it visible.');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (doc: AdminDocument) => {
    setEditingDocument(doc);
    setDocumentName(doc.document_name);
    setDocumentType(doc.document_type);
    setDocumentBadge(doc.document_badge as 'public' | 'sensitive');
    setUploadGroupIds(doc.groups.map(group => group.id));
    setExpiryDate(doc.expiry_date ? doc.expiry_date.slice(0, 16) : '');
    setEditFile(null);
  };

  const handleEditSave = async () => {
    if (!editingDocument) return;
    if (!documentName.trim() || !documentType.trim()) {
      alert('Please fill in document name and type');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document_name', documentName.trim());
      formData.append('document_type', documentType.trim());
      formData.append('document_badge', documentBadge);
      formData.append('distribution_group_ids', uploadGroupIds.join(','));
      formData.append('expiry_date', expiryDate);
      if (editFile) formData.append('file', editFile);
      await api.patch(`/v1/admin/documents/${editingDocument.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadDocuments();
      setEditingDocument(null);
      resetUploadForm();
      setEditFile(null);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update document');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleVisibility = async (doc: AdminDocument) => {
    setPublishingId(doc.id);
    try {
      await api.patch(`/v1/admin/documents/${doc.id}/visibility`, {
        is_visible: !doc.is_visible,
      });
      await loadDocuments();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update document visibility');
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <section style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, color: '#174a2a' }}>Document Management</h1>
          <p style={{ margin: '8px 0 0', color: '#75664b', fontSize: 14 }}>
            Upload documents as invisible drafts, then post them when ready.
          </p>
        </div>
        <button onClick={() => setShowUploadModal(true)}>
          <Upload size={16} />
          Upload Document
        </button>
      </header>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>Group</label>
            <select value={filterGroupId} onChange={e => setFilterGroupId(e.target.value)}>
              <option value="">All groups</option>
              {filterableGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>Badge</label>
            <select value={filterBadge} onChange={e => setFilterBadge(e.target.value)}>
              <option value="">All badges</option>
              <option value="public">Public</option>
              <option value="sensitive">Sensitive</option>
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button onClick={() => { setFilterGroupId(''); setFilterBadge(''); setStartDate(''); setEndDate(''); }} style={{ background: 'white', color: '#75664b', border: '1px solid #e2d7c3' }}>
            Clear
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#75664b' }}>Loading documents...</div>
        ) : documents.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#75664b' }}>No documents found.</div>
        ) : (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Groups</th>
                  <th>Badge</th>
                  <th>Status</th>
                  <th>Expiry</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td><strong>{doc.document_name}</strong><div style={{ fontSize: 12, color: '#75664b' }}>{doc.document_type}</div></td>
                    <td style={{ fontSize: 13 }}>{doc.groups.length > 0 ? doc.groups.map(g => g.name).join(', ') : '—'}</td>
                    <td><span className={`badge ${doc.document_badge === 'public' ? 'green' : 'gold'}`}>{doc.document_badge}</span></td>
                    <td><span className={`badge ${doc.is_visible ? 'green' : 'gold'}`}>{doc.is_visible ? 'Posted' : 'Invisible'}</span></td>
                    <td style={{ fontSize: 13, color: '#75664b' }}>{doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : 'Never'}</td>
                    <td style={{ fontSize: 13, color: '#75664b' }}>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEditModal(doc)} style={{ padding: '6px 10px', fontSize: 12, background: 'white', color: '#174a2a', border: '1px solid #e2d7c3' }}>
                          <Edit size={14} /> Edit
                        </button>
                        <button onClick={() => handleToggleVisibility(doc)} disabled={publishingId === doc.id} style={{ padding: '6px 10px', fontSize: 12 }} title={doc.is_visible ? 'Make invisible' : 'Post document'}>
                          {doc.is_visible ? <EyeOff size={14} /> : <Eye size={14} />}
                          {publishingId === doc.id ? '...' : doc.is_visible ? 'Hide' : 'Post'}
                        </button>
                        <button onClick={() => window.open(doc.document_location, '_blank')} style={{ padding: '6px 10px', fontSize: 12, background: 'white', color: '#174a2a', border: '1px solid #e2d7c3' }}>
                          <Download size={14} /> File
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>Upload Document</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>Document Name</label><input value={documentName} onChange={e => setDocumentName(e.target.value)} placeholder="Enter document name" /></div>
                <div><label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>Document Type</label><input value={documentType} onChange={e => setDocumentType(e.target.value)} placeholder="PDF, Report, Certificate" /></div>
                <div><label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>Badge</label><select value={documentBadge} onChange={e => setDocumentBadge(e.target.value as 'public' | 'sensitive')}><option value="sensitive">Sensitive</option><option value="public">Public</option></select></div>
                <div>
                  <label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>
                    Distribution Groups
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, maxHeight: 180, overflowY: 'auto', border: '1px solid #e2d7c3', borderRadius: 12, padding: 10 }}>
                    {groups.map(group => {
                      const checked = uploadGroupIds.includes(group.id);
                      return (
                        <label key={group.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              if (e.target.checked) {
                                setUploadGroupIds([...uploadGroupIds, group.id]);
                              } else {
                                setUploadGroupIds(uploadGroupIds.filter(id => id !== group.id));
                              }
                            }}
                            style={{ width: 16, height: 16 }}
                          />
                          <span style={{ fontWeight: 700 }}>{group.name}</span>
                          {group.is_system_group && <span className="badge gold">System</span>}
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#75664b' }}>
                    Select one or more groups. Use Investofarmers to target all investors in that group.
                  </div>
                </div>
                <div><label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>Expiry Date</label><input type="datetime-local" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} /></div>
                <div><label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>File</label><input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />{selectedFile && <div style={{ marginTop: 6, fontSize: 12, color: '#174a2a' }}>{selectedFile.name}</div>}</div>
                <div className="notice"><strong>Note:</strong> Uploaded documents are invisible by default. Use Post from the list to make them visible to users.</div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => { setShowUploadModal(false); resetUploadForm(); }} style={{ background: 'white', color: '#75664b', border: '1px solid #e2d7c3' }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload as Invisible'}</button>
            </div>
          </div>
        </div>
      )}

      {editingDocument && (
        <div className="modal-overlay" onClick={() => setEditingDocument(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>Edit Document</h2>
              <button onClick={() => setEditingDocument(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>Document Name</label><input value={documentName} onChange={e => setDocumentName(e.target.value)} /></div>
                <div><label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>Document Type</label><input value={documentType} onChange={e => setDocumentType(e.target.value)} /></div>
                <div><label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>Badge</label><select value={documentBadge} onChange={e => setDocumentBadge(e.target.value as 'public' | 'sensitive')}><option value="sensitive">Sensitive</option><option value="public">Public</option></select></div>
                <div>
                  <label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>Distribution Groups</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, maxHeight: 180, overflowY: 'auto', border: '1px solid #e2d7c3', borderRadius: 12, padding: 10 }}>
                    {groups.map(group => {
                      const checked = uploadGroupIds.includes(group.id);
                      return (
                        <label key={group.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                          <input type="checkbox" checked={checked} onChange={e => e.target.checked ? setUploadGroupIds([...uploadGroupIds, group.id]) : setUploadGroupIds(uploadGroupIds.filter(id => id !== group.id))} style={{ width: 16, height: 16 }} />
                          <span style={{ fontWeight: 700 }}>{group.name}</span>
                          {group.is_system_group && <span className="badge gold">System</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div><label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>Expiry Date</label><input type="datetime-local" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} /></div>
                <div><label style={{ fontWeight: 700, fontSize: 12, color: '#75664b' }}>Replace File</label><input type="file" onChange={e => setEditFile(e.target.files?.[0] || null)} />{editFile && <div style={{ marginTop: 6, fontSize: 12, color: '#174a2a' }}>{editFile.name}</div>}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => { setEditingDocument(null); resetUploadForm(); setEditFile(null); }} style={{ background: 'white', color: '#75664b', border: '1px solid #e2d7c3' }}>Cancel</button>
              <button onClick={handleEditSave} disabled={uploading}>{uploading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
