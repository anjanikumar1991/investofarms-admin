import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

// ── Types ──────────────────────────────────────────────────────────────────────
interface StatItem  { value: string; label: string }
interface StepItem  { emoji: string; step: string; title: string; description: string }
interface FeatItem  { emoji: string; title: string; desc: string; color: string }

interface HomeContent {
  hero: { badge: string; title: string; sub: string; cta: string; image_url: string };
  stats: StatItem[];
  howItWorks: { title: string; sub: string; steps: StepItem[] };
  features: { title: string; items: FeatItem[] };
  cta: { title: string; desc: string; button: string };
}

interface TermsContent { content: string; updated_at: string }

// ── Defaults (mirrors mobile HomeScreen.tsx DEFAULT_CONTENT) ──────────────────
const DEFAULT_HOME: HomeContent = {
  hero: {
    badge: '🌾 Premium Agri Opportunities',
    title: 'Grow Your Wealth\nWith Farming',
    sub: 'Returns up to 25% with secure, insured agricultural participation',
    cta: 'Explore Projects →',
    image_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1000&auto=format&fit=crop',
  },
  stats: [
    { value: '₹4.2Cr+', label: 'Capital Deployed' },
    { value: '1,200+',  label: 'Participants' },
    { value: '18 States', label: 'Farm Locations' },
    { value: '98%',     label: 'On-time Payouts' },
  ],
  howItWorks: {
    title: 'How It Works',
    sub: 'Your path to agricultural growth',
    steps: [
      { emoji: '🌿', step: 'Step 01', title: 'Choose Your Crop',   description: 'Browse agricultural projects with varying risk levels and return profiles.' },
      { emoji: '🔒', step: 'Step 02', title: 'Secure Your Plot',   description: 'Participate with a few taps, backed by real agricultural assets and legal documents.' },
      { emoji: '📈', step: 'Step 03', title: 'Track Growth',       description: 'Monitor your growth progress via live feeds and periodic reports.' },
      { emoji: '☀️', step: 'Step 04', title: 'Harvest Returns',    description: 'Receive your returns after crops are harvested and sold to market.' },
    ],
  },
  features: {
    title: 'Why InvestoFarms',
    items: [
      { emoji: '📈', title: '18–25% Returns',    desc: 'Higher than traditional fixed deposits', color: '#E8F5E9' },
      { emoji: '🌧️', title: 'Weather Protected', desc: 'Insurance against crop failures',        color: '#E3F2FD' },
      { emoji: '🛡️', title: 'Secure Assets',     desc: 'Backed by real farmland titles',         color: '#FFF8E1' },
      { emoji: '🌱', title: 'Eco-Friendly',       desc: 'Support sustainable farming',            color: '#F3E5F5' },
    ],
  },
  cta: {
    title: 'Start With Just ₹10,000',
    desc: 'Begin your agricultural growth journey and watch your money grow with the crops.',
    button: 'Start Growing Now →',
  },
};

// ── Component ──────────────────────────────────────────────────────────────────
export function ContentPage() {
  const [tab, setTab] = useState<'home' | 'terms'>('home');

  // Home content state
  const [home, setHome]         = useState<HomeContent>(structuredClone(DEFAULT_HOME));
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeSaving, setHomeSaving]   = useState(false);
  const [homeMsg, setHomeMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Terms state
  const [terms, setTerms]             = useState<TermsContent>({ content: '', updated_at: '' });
  const [termsLoaded, setTermsLoaded] = useState(false);
  const [termsSaving, setTermsSaving] = useState(false);
  const [termsMsg, setTermsMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  // ── Load home content on mount ────────────────────────────────────────────
  useEffect(() => {
    setHomeLoading(true);
    api.get('/content/home')
      .then(r => {
        const d = r?.data?.data ?? r?.data;
        if (d?.hero) setHome(d as HomeContent);
      })
      .catch(() => {/* use defaults */})
      .finally(() => setHomeLoading(false));
  }, []);

  // ── Load terms when tab is first opened ───────────────────────────────────
  useEffect(() => {
    if (tab === 'terms' && !termsLoaded) {
      api.get('/content/terms')
        .then(r => {
          const d = r?.data?.data ?? r?.data;
          if (d?.content !== undefined) {
            setTerms({ content: d.content ?? '', updated_at: d.updated_at?.slice(0, 10) ?? '' });
          }
        })
        .catch(() => {})
        .finally(() => setTermsLoaded(true));
    }
  }, [tab, termsLoaded]);

  // ── Save home ─────────────────────────────────────────────────────────────
  async function saveHome() {
    setHomeSaving(true);
    setHomeMsg(null);
    try {
      await api.put('/content/home', home);
      setHomeMsg({ type: 'ok', text: '✅ Home content saved successfully.' });
    } catch (err: any) {
      setHomeMsg({ type: 'err', text: `❌ Save failed: ${err?.message ?? 'Unknown error'}` });
    } finally {
      setHomeSaving(false);
      setTimeout(() => setHomeMsg(null), 4000);
    }
  }

  // ── Save terms ────────────────────────────────────────────────────────────
  async function saveTerms() {
    setTermsSaving(true);
    setTermsMsg(null);
    try {
      const payload = { content: terms.content, updated_at: terms.updated_at || new Date().toISOString().slice(0, 10) };
      await api.put('/content/terms', payload);
      setTermsMsg({ type: 'ok', text: '✅ Terms & Conditions saved.' });
    } catch (err: any) {
      setTermsMsg({ type: 'err', text: `❌ Save failed: ${err?.message ?? 'Unknown error'}` });
    } finally {
      setTermsSaving(false);
      setTimeout(() => setTermsMsg(null), 4000);
    }
  }

  // ── Home field helpers ────────────────────────────────────────────────────
  const setHero = (k: keyof HomeContent['hero'], v: string) =>
    setHome(h => ({ ...h, hero: { ...h.hero, [k]: v } }));

  const setHowItWorks = (k: keyof HomeContent['howItWorks'], v: string) =>
    setHome(h => ({ ...h, howItWorks: { ...h.howItWorks, [k]: v } }));

  const setFeatTitle = (v: string) =>
    setHome(h => ({ ...h, features: { ...h.features, title: v } }));

  const setCta = (k: keyof HomeContent['cta'], v: string) =>
    setHome(h => ({ ...h, cta: { ...h.cta, [k]: v } }));

  const setStat = (i: number, k: keyof StatItem, v: string) =>
    setHome(h => {
      const stats = [...h.stats];
      stats[i] = { ...stats[i], [k]: v };
      return { ...h, stats };
    });

  const setStep = (i: number, k: keyof StepItem, v: string) =>
    setHome(h => {
      const steps = [...h.howItWorks.steps];
      steps[i] = { ...steps[i], [k]: v };
      return { ...h, howItWorks: { ...h.howItWorks, steps } };
    });

  const setFeat = (i: number, k: keyof FeatItem, v: string) =>
    setHome(h => {
      const items = [...h.features.items];
      items[i] = { ...items[i], [k]: v };
      return { ...h, features: { ...h.features, items } };
    });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <header className="page-header">
        <span>Platform</span>
        <h1>App Content</h1>
        <p>Edit all CMS-driven text shown in the mobile app.</p>
      </header>

      {/* Tab strip */}
      <div className="content-tabs">
        <button
          className={`content-tab-btn${tab === 'home' ? ' active' : ''}`}
          onClick={() => setTab('home')}
        >🏠 Home Screen</button>
        <button
          className={`content-tab-btn${tab === 'terms' ? ' active' : ''}`}
          onClick={() => setTab('terms')}
        >📜 Terms &amp; Conditions</button>
      </div>

      {/* ═══ HOME CONTENT ═══════════════════════════════════════════════════ */}
      {tab === 'home' && (
        <div className="content-layout">

          {/* Editor column */}
          <div className="content-editor">
            {homeLoading && <p className="loading-inline">Loading current content…</p>}

            {homeMsg && (
              <div className={homeMsg.type === 'ok' ? 'notice' : 'error-box'}>{homeMsg.text}</div>
            )}

            {/* Hero */}
            <section className="panel">
              <h2>🖼 Hero Section</h2>
              <p className="panel-sub">Full-width banner at the top of the HomeScreen.</p>
              <div className="form-grid">
                <label>
                  Badge Text
                  <input value={home.hero.badge} onChange={e => setHero('badge', e.target.value)} placeholder="🌾 Premium Agri Opportunities" />
                </label>
                <label>
                  CTA Button Text
                  <input value={home.hero.cta} onChange={e => setHero('cta', e.target.value)} placeholder="Explore Projects →" />
                </label>
                <label className="full-width">
                  Title <small style={{ fontWeight: 400 }}>(use \n for line break)</small>
                  <input value={home.hero.title} onChange={e => setHero('title', e.target.value)} placeholder="Grow Your Wealth\nWith Farming" />
                </label>
                <label className="full-width">
                  Subtitle
                  <textarea value={home.hero.sub} onChange={e => setHero('sub', e.target.value)} rows={2} />
                </label>
                <label className="full-width">
                  Background Image URL
                  <input value={home.hero.image_url} onChange={e => setHero('image_url', e.target.value)} placeholder="https://images.unsplash.com/…" />
                </label>
              </div>
            </section>

            {/* Stats */}
            <section className="panel">
              <h2>📊 Stats Strip</h2>
              <p className="panel-sub">4 key metrics shown below the hero banner.</p>
              {home.stats.map((s, i) => (
                <div key={i} className="repeat-row">
                  <span className="repeat-label">Stat {i + 1}</span>
                  <div className="form-grid">
                    <label>
                      Value
                      <input value={s.value} onChange={e => setStat(i, 'value', e.target.value)} placeholder="₹4.2Cr+" />
                    </label>
                    <label>
                      Label
                      <input value={s.label} onChange={e => setStat(i, 'label', e.target.value)} placeholder="Capital Deployed" />
                    </label>
                  </div>
                </div>
              ))}
            </section>

            {/* How It Works */}
            <section className="panel">
              <h2>🔄 How It Works</h2>
              <p className="panel-sub">Step-by-step process cards with auto-advancing animation.</p>
              <div className="form-grid">
                <label>
                  Section Title
                  <input value={home.howItWorks.title} onChange={e => setHowItWorks('title', e.target.value)} />
                </label>
                <label>
                  Section Subtitle
                  <input value={home.howItWorks.sub} onChange={e => setHowItWorks('sub', e.target.value)} />
                </label>
              </div>
              {home.howItWorks.steps.map((s, i) => (
                <div key={i} className="repeat-row">
                  <span className="repeat-label">{s.step || `Step ${i + 1}`}</span>
                  <div className="form-grid">
                    <label>
                      Emoji
                      <input value={s.emoji} onChange={e => setStep(i, 'emoji', e.target.value)} style={{ fontSize: 20, textAlign: 'center' }} maxLength={4} />
                    </label>
                    <label>
                      Step Label
                      <input value={s.step} onChange={e => setStep(i, 'step', e.target.value)} placeholder="Step 01" />
                    </label>
                    <label>
                      Title
                      <input value={s.title} onChange={e => setStep(i, 'title', e.target.value)} />
                    </label>
                    <label className="full-width">
                      Description
                      <textarea value={s.description} onChange={e => setStep(i, 'description', e.target.value)} rows={2} />
                    </label>
                  </div>
                </div>
              ))}
            </section>

            {/* Features */}
            <section className="panel">
              <h2>✨ Why InvestoFarms</h2>
              <p className="panel-sub">2×2 feature grid tiles.</p>
              <div className="form-grid">
                <label className="full-width">
                  Section Title
                  <input value={home.features.title} onChange={e => setFeatTitle(e.target.value)} />
                </label>
              </div>
              {home.features.items.map((f, i) => (
                <div key={i} className="repeat-row">
                  <span className="repeat-label">Feature {i + 1}</span>
                  <div className="form-grid">
                    <label>
                      Emoji
                      <input value={f.emoji} onChange={e => setFeat(i, 'emoji', e.target.value)} style={{ fontSize: 20, textAlign: 'center' }} maxLength={4} />
                    </label>
                    <label>
                      Title
                      <input value={f.title} onChange={e => setFeat(i, 'title', e.target.value)} />
                    </label>
                    <label>
                      Description
                      <input value={f.desc} onChange={e => setFeat(i, 'desc', e.target.value)} />
                    </label>
                    <label>
                      Background Color
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="color"
                          value={f.color}
                          onChange={e => setFeat(i, 'color', e.target.value)}
                          style={{ width: 40, height: 34, padding: 2, borderRadius: 6, cursor: 'pointer', border: '1px solid #ddd5c0' }}
                        />
                        <input
                          value={f.color}
                          onChange={e => setFeat(i, 'color', e.target.value)}
                          maxLength={7}
                          style={{ fontFamily: 'monospace', flex: 1 }}
                        />
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </section>

            {/* CTA */}
            <section className="panel">
              <h2>📢 CTA Banner</h2>
              <p className="panel-sub">Bottom call-to-action with dark green gradient background.</p>
              <div className="form-grid">
                <label className="full-width">
                  Title
                  <input value={home.cta.title} onChange={e => setCta('title', e.target.value)} />
                </label>
                <label className="full-width">
                  Description
                  <textarea value={home.cta.desc} onChange={e => setCta('desc', e.target.value)} rows={2} />
                </label>
                <label className="full-width">
                  Button Text
                  <input value={home.cta.button} onChange={e => setCta('button', e.target.value)} />
                </label>
              </div>
            </section>

            <div className="form-actions" style={{ marginBottom: 32 }}>
              <button onClick={saveHome} disabled={homeSaving}>
                {homeSaving ? 'Saving…' : 'Save Home Content'}
              </button>
            </div>
          </div>

          {/* Preview column */}
          <div className="content-preview" ref={previewRef}>
            <div className="preview-header">Live Preview</div>
            <div className="phone-shell">
              <div className="phone-notch"><div className="phone-pill" /></div>
              <div className="phone-screen">
                <MobilePreview content={home} />
              </div>
            </div>
            <div className="preview-note">320px · iOS layout</div>
          </div>
        </div>
      )}

      {/* ═══ TERMS ══════════════════════════════════════════════════════════ */}
      {tab === 'terms' && (
        <div style={{ maxWidth: 860 }}>
          {!termsLoaded && <p className="loading-inline">Loading Terms &amp; Conditions…</p>}

          {termsMsg && (
            <div className={termsMsg.type === 'ok' ? 'notice' : 'error-box'}>{termsMsg.text}</div>
          )}

          <section className="panel">
            <h2>📜 Terms &amp; Conditions</h2>
            <p className="panel-sub">Displayed in the investor app under Profile → Terms &amp; Conditions.</p>
            <div className="form-grid">
              <label>
                Last Updated Date
                <input
                  type="date"
                  value={terms.updated_at}
                  onChange={e => setTerms(t => ({ ...t, updated_at: e.target.value }))}
                />
              </label>
            </div>
            <label style={{ display: 'block', marginTop: 8 }}>
              <span style={{ fontWeight: 800, color: '#75664b', fontSize: 12 }}>
                Content <span style={{ fontWeight: 400 }}>(Markdown supported)</span>
              </span>
              <textarea
                value={terms.content}
                onChange={e => setTerms(t => ({ ...t, content: e.target.value }))}
                rows={22}
                style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, lineHeight: 1.6, marginTop: 6 }}
                placeholder={'# Terms and Conditions\n\n## 1. Introduction\n\nWrite your T&C here in Markdown…'}
              />
            </label>
          </section>

          {/* Plain-text preview */}
          <section className="panel">
            <h2>👁 Preview</h2>
            <p className="panel-sub">Approximate plain-text rendering in the mobile app.</p>
            <div className="terms-preview">
              {terms.content
                .replace(/^#{1,6}\s+/gm, '')
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/\*(.*?)\*/g, '$1')
                .replace(/^[-*]\s+/gm, '• ')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') || (
                <span style={{ color: '#9a9088' }}>Start typing above to see a preview…</span>
              )}
            </div>
          </section>

          <div className="form-actions" style={{ marginBottom: 32 }}>
            <button onClick={saveTerms} disabled={termsSaving}>
              {termsSaving ? 'Saving…' : 'Save Terms & Conditions'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mobile Preview Component ───────────────────────────────────────────────────
function MobilePreview({ content: c }: { content: HomeContent }) {
  const titleLines = c.hero.title.replace(/\\n/g, '\n');

  return (
    <div className="pv">
      {/* Hero */}
      <div className="pv-hero" style={{ backgroundImage: `url(${c.hero.image_url})` }}>
        <div className="pv-hero-overlay" />
        <div className="pv-hero-content">
          <div className="pv-badge">{c.hero.badge}</div>
          <div className="pv-title" style={{ whiteSpace: 'pre-line' }}>{titleLines}</div>
          <div className="pv-sub">{c.hero.sub}</div>
          <div className="pv-cta-btn">{c.hero.cta}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="pv-stats">
        {c.stats.map((s, i) => (
          <div key={i} className="pv-stat-wrap">
            {i > 0 && <div className="pv-stat-div" />}
            <div className="pv-stat">
              <div className="pv-stat-val">{s.value}</div>
              <div className="pv-stat-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="pv-section">
        <div className="pv-sec-title">{c.howItWorks.title}</div>
        <div className="pv-sec-sub">{c.howItWorks.sub}</div>
        <div className="pv-step-tabs">
          {c.howItWorks.steps.map((s, i) => (
            <div key={i} className={`pv-step-tab${i === 0 ? ' active' : ''}`}>{s.step}</div>
          ))}
        </div>
        {c.howItWorks.steps[0] && (
          <div className="pv-step-card">
            <div className="pv-step-emoji">{c.howItWorks.steps[0].emoji}</div>
            <div>
              <div className="pv-step-lbl">{c.howItWorks.steps[0].step}</div>
              <div className="pv-step-title">{c.howItWorks.steps[0].title}</div>
              <div className="pv-step-desc">{c.howItWorks.steps[0].description}</div>
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="pv-section">
        <div className="pv-sec-title">{c.features.title}</div>
        <div className="pv-feat-grid">
          {c.features.items.map((f, i) => (
            <div key={i} className="pv-feat-tile" style={{ background: f.color }}>
              <div className="pv-feat-emoji">{f.emoji}</div>
              <div className="pv-feat-title">{f.title}</div>
              <div className="pv-feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Banner */}
      <div className="pv-cta-banner">
        <div className="pv-cta-badge">🌾 Limited Plots Available</div>
        <div className="pv-cta-title">{c.cta.title}</div>
        <div className="pv-cta-desc">{c.cta.desc}</div>
        <div className="pv-cta-button">{c.cta.button}</div>
      </div>
    </div>
  );
}
