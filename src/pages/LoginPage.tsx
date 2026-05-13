import { FormEvent, useState } from 'react';
import { Sprout } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type LoginMode = 'phone' | 'email';

export function LoginPage() {
  const { token, sendOtp, verifyOtp, sendEmailOtp, verifyEmailOtp } = useAuth();
  const [mode, setMode] = useState<LoginMode>('phone');

  // Phone state
  const [phone, setPhone] = useState('');
  // Email state
  const [email, setEmail] = useState('');

  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const handleModeSwitch = (next: LoginMode) => {
    setMode(next);
    setPhone('');
    setEmail('');
    setOtp('');
    setSessionId('');
    setMessage('');
  };

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (mode === 'email') {
        const response = await sendEmailOtp(email.trim().toLowerCase());
        setSessionId(response.session_id);
        if (response.otp) {
          console.log('Email OTP:', response.otp);
        }
        setMessage(response.otp ? `OTP sent to your email. Test OTP: ${response.otp}` : 'OTP sent to your email. Check your inbox.');
      } else {
        const response = await sendOtp(phone);
        setSessionId(response.session_id);
        if (response.otp) {
          console.log('Phone OTP:', response.otp);
        }
        setMessage(response.otp ? `OTP sent. Test OTP: ${response.otp}` : 'OTP sent. Check backend logs in development.');
      }
    } catch (error: any) {
      setMessage(error?.response?.data?.detail || error.message || 'Unable to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (mode === 'email') {
        await verifyEmailOtp(email.trim().toLowerCase(), sessionId, otp);
      } else {
        await verifyOtp(phone, sessionId, otp);
      }
    } catch (error: any) {
      setMessage(error?.response?.data?.detail || error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="logo-circle"><Sprout size={38} /></div>
        <h1>InvestoFarms Admin</h1>
        <p>Plan farm projects, crop timelines, and operational activity rosters from one premium control center.</p>
      </div>

      <form className="login-card" onSubmit={sessionId ? handleVerifyOtp : handleSendOtp}>
        <h2>Admin / Supervisor Login</h2>

        {/* Toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#f3f4f6', borderRadius: 10, padding: 4 }}>
          {(['phone', 'email'] as LoginMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModeSwitch(m)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13,
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#174A2A' : '#888',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {m === 'phone' ? '📱 Phone' : '✉️ Email'}
            </button>
          ))}
        </div>

        {mode === 'phone' ? (
          <>
            <label>Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter registered phone (e.g. +919876543210)"
              required
              disabled={!!sessionId}
            />
          </>
        ) : (
          <>
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter registered email"
              required
              disabled={!!sessionId}
            />
          </>
        )}

        {sessionId && (
          <>
            <label>OTP</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              required
              autoFocus
            />
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#2A7D52', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '4px 0', textAlign: 'left' }}
              onClick={() => { setSessionId(''); setOtp(''); setMessage(''); }}
            >
              ← Change {mode === 'email' ? 'email' : 'phone'}
            </button>
          </>
        )}

        {message && <div className="notice">{message}</div>}

        <button disabled={loading}>
          {loading ? 'Please wait...' : sessionId ? 'Verify & Enter Dashboard' : 'Send OTP'}
        </button>
      </form>
    </div>
  );
}
