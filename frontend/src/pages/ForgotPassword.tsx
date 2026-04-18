import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Mail, Lock } from 'lucide-react';

type Step = 'email' | 'reset' | 'done';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])/.test(password)) return 'Must contain a lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Must contain an uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Must contain a number';
    return null;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('reset');
      } else {
        setError(data.message || 'Failed to send reset code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (enteredCode: string) => {
    if (enteredCode.length !== 6) return;
    setVerifyingCode(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: enteredCode }),
      });
      const data = await response.json();
      if (response.ok) {
        setCodeVerified(true);
      } else {
        setError(data.message || 'Invalid or expired code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const passwordError = validatePassword(newPassword);
    if (passwordError) { setError(passwordError); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('done');
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const bgStyle = {
    background: 'linear-gradient(145deg, var(--green-900), var(--green-700))'
  };
  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
  };
  const inputStyle = {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white'
  };

  if (step === 'done') {
    return (
      <div className="min-h-screen relative overflow-hidden" style={bgStyle}>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }} />
        <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md w-full rounded-3xl p-8 text-center" style={cardStyle}>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                <CheckCircle className="w-12 h-12 text-green-300" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">Password Reset!</h2>
            <p className="text-white mb-8 leading-relaxed">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all"
              style={{ background: 'var(--green-500)', color: 'white' }}
            >
              <ArrowLeft className="w-5 h-5" />
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={bgStyle}>
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
        backgroundSize: '20px 20px'
      }} />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full rounded-3xl p-8" style={cardStyle}>

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.15)' }}>
                {step === 'email' ? <Mail className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-white" />}
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-2 text-white">
              {step === 'email' ? 'Forgot Password' : 'Reset Password'}
            </h2>
            <p className="text-sm text-white opacity-90">
              {step === 'email'
                ? 'Enter your UB email to receive a reset code'
                : `Enter the 6-digit code sent to ${email}`}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Email */}
          {step === 'email' && (
            <form className="space-y-6" onSubmit={handleSendCode}>
              <div>
                <label className="block text-sm font-medium mb-2 text-white">University Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors placeholder-white placeholder-opacity-70"
                  style={inputStyle}
                  placeholder="202200358@ub.ac.bw"
                  pattern="\d{9}@ub\.ac\.bw"
                  title="Must be a valid UB email (studentID@ub.ac.bw)"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-white transition-all duration-200"
                style={{ background: loading ? 'var(--gray-400)' : 'var(--green-500)', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Sending Code...' : 'Send Reset Code'}
              </button>

              <div className="text-center">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-white hover:opacity-80 transition-opacity">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}

          {/* Step 2: Code + New Password */}
          {step === 'reset' && (
            <form className="space-y-5" onSubmit={handleResetPassword}>
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Reset Code</label>
                <div className="relative">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setCode(val);
                      if (val.length === 6 && !codeVerified) handleVerifyCode(val);
                    }}
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors text-center tracking-widest text-xl font-bold placeholder-white placeholder-opacity-70"
                    style={{
                      ...inputStyle,
                      borderColor: codeVerified ? 'rgba(74,222,128,0.8)' : inputStyle.borderColor
                    }}
                    placeholder="000000"
                    maxLength={6}
                    readOnly={codeVerified}
                    required
                  />
                  {verifyingCode && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white opacity-70">Checking...</span>
                  )}
                  {codeVerified && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-300 text-lg">✓</span>
                  )}
                </div>
                <p className="text-xs text-white opacity-70 mt-1">
                  {codeVerified ? 'Code verified — enter your new password below' : 'Check your email for the 6-digit code (valid for 10 minutes)'}
                </p>
              </div>

              {codeVerified && <div>
                <label className="block text-sm font-medium mb-2 text-white">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors placeholder-white placeholder-opacity-70"
                  style={inputStyle}
                  placeholder="Enter new password"
                  required
                />
                <div className="mt-2 space-y-0.5">
                  <p className="text-xs text-white opacity-70">8+ chars, uppercase, lowercase, number</p>
                </div>
              </div>}

              {codeVerified && <div>
                <label className="block text-sm font-medium mb-2 text-white">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors placeholder-white placeholder-opacity-70"
                  style={inputStyle}
                  placeholder="Confirm new password"
                  required
                />
              </div>}

              {codeVerified && <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-white transition-all duration-200"
                style={{ background: loading ? 'var(--gray-400)' : 'var(--green-500)', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); setCode(''); }}
                  className="text-sm text-white hover:opacity-80 transition-opacity inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Use a different email
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
