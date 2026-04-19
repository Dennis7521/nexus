import { useState, useRef } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isNavigatingRef = useRef(false);
  
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isNavigatingRef.current) {
      console.log('WARNING: Already navigating, skipping...');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with email:', email);
      const result = await login(email, password);
      console.log('Login result:', result);
      
      // Check if user must change password
      if (result && result.mustChangePassword) {
        console.log('Must change password - redirecting to /change-password');
        isNavigatingRef.current = true;
        navigate('/change-password', { replace: true });
        return;
      }
      
      console.log('Login successful - normal flow');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(145deg, var(--green-900), var(--green-700))'
    }}>
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}></div>

      {/* Centered Login Form */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-8 absolute inset-0">
        <div className="rounded-3xl p-8 max-w-sm w-full" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }}>
          {/* Logo and title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img 
                src="/images/node.png" 
                alt="NEXUS Logo" 
                className="w-20 h-20 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight text-white">
              Log in to NEXUS
            </h1>
            <p className="text-sm text-white">
              Connect with peers and exchange skills
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-2 text-white" style={{ 
                  fontSize: 'var(--text-sm)' 
                }}>
                  Email or username
                </label>
                <input
                  type="email"
                  required
                  className="input"
                  placeholder="Email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold mb-2 text-white" style={{ 
                  fontSize: 'var(--text-sm)' 
                }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  className="input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-white transition-colors hover:underline hover:opacity-80">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>

            <div className="text-center space-y-3">
              <div className="text-sm text-white">
                Don't have an account? <Link to="/register" className="underline hover:opacity-80 font-medium">Sign up</Link>
              </div>
              <div className="pt-3 border-t border-white border-opacity-20">
                <button
                  onClick={() => navigate('/admin')}
                  type="button"
                  className="text-sm text-white font-medium transition-colors hover:underline hover:opacity-80 inline-flex items-center gap-2 bg-transparent border-none cursor-pointer"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Login as Admin
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          @keyframes float-delayed {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(-3deg); }
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          .animate-float-delayed {
            animation: float-delayed 8s ease-in-out infinite 2s;
          }
        `
      }} />
    </div>
  );
};
