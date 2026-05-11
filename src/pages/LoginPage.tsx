import { FormEvent, useState } from 'react';
import { Sprout } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { token, sendOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const nextSessionId = await sendOtp(phone);
      setSessionId(nextSessionId);
      setMessage('OTP sent. Check backend terminal logs in development.');
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
      await verifyOtp(phone, sessionId, otp);
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
        <label>Phone Number</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter registered phone" required />
        {sessionId && (
          <>
            <label>OTP</label>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" required />
          </>
        )}
        {message && <div className="notice">{message}</div>}
        <button disabled={loading}>{loading ? 'Please wait...' : sessionId ? 'Verify & Enter Dashboard' : 'Send OTP'}</button>
      </form>
    </div>
  );
}
