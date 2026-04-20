import { useState } from 'react';
import { Link } from 'react-router-dom';
import { OTPVerification } from '../components/OTPVerification';

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    studentId: '',
    email: '',
    degreeProgram: '',
    yearOfStudy: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-generate email when student ID is entered
    if (name === 'studentId') {
      const cleanedId = value.replace(/[^0-9]/g, ''); // Only allow digits
      setFormData(prev => ({
        ...prev,
        studentId: cleanedId,
        email: cleanedId ? `${cleanedId}@ub.ac.bw` : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('Please accept the Terms & Conditions to continue');
      return;
    }
    
    // Validate student ID format
    const studentIdRegex = /^20[0-2][0-9]\d{5}$/;
    if (!studentIdRegex.test(formData.studentId)) {
      setError('Student ID must be 9 digits starting with a year from 2000-2029 (e.g., 202200358)');
      return;
    }
    
    // Validate email format
    const expectedEmail = `${formData.studentId}@ub.ac.bw`;
    if (formData.email !== expectedEmail) {
      setError(`Email must be ${expectedEmail}`);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setRegistrationEmail(formData.email);
        setShowOTP(true);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSuccess = () => {
    window.location.href = '/dashboard';
  };

  const handleBackToRegistration = () => {
    setShowOTP(false);
    setRegistrationEmail('');
  };

  if (showOTP) {
    return (
      <OTPVerification
        email={registrationEmail}
        onSuccess={handleOTPSuccess}
        onBack={handleBackToRegistration}
      />
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(145deg, var(--green-900), var(--green-700))'
    }}>
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
        backgroundSize: '20px 20px'
      }}></div>

      {/* Centered Registration Form */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-8 absolute inset-0">
        <div className="max-w-2xl w-full rounded-3xl p-8" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }}>
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="/images/node.png" 
                alt="NEXUS Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold mb-2 text-white">
              Create an account
            </h2>
            <p className="text-sm text-white">
              Join NEXUS and start exchanging skills
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-1 text-white">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors placeholder-white placeholder-opacity-70"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white'
                  }}
                  placeholder="Mothusi"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-1 text-white">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors placeholder-white placeholder-opacity-70"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white'
                  }}
                  placeholder="Gaamangwe"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="studentId" className="block text-sm font-medium mb-1 text-white">
                Student ID
              </label>
              <input
                id="studentId"
                name="studentId"
                type="text"
                value={formData.studentId}
                onChange={handleChange}
                maxLength={9}
                pattern="20[0-2][0-9]\d{5}"
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors placeholder-white placeholder-opacity-70"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}
                placeholder="202200358"
                title="9 digits starting with year (2000-2029)"
                required
              />
              <p className="text-xs text-white mt-1 opacity-80">9 digits starting with year (e.g., 202200358)</p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-white">
                University Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                readOnly
                className="w-full px-4 py-3 border rounded-xl focus:outline-none transition-colors placeholder-white placeholder-opacity-70 cursor-not-allowed"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  opacity: 0.9
                }}
                placeholder="Enter Student ID first"
                required
              />
              <p className="text-xs text-white mt-1 opacity-80">Auto-generated from Student ID</p>
            </div>

            <div>
              <label htmlFor="degreeProgram" className="block text-sm font-medium mb-1 text-white">
                Degree Program
              </label>
              <input
                id="degreeProgram"
                name="degreeProgram"
                type="text"
                value={formData.degreeProgram}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors placeholder-white placeholder-opacity-70"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}
                placeholder="Computer Science"
                required
              />
            </div>

            <div>
              <label htmlFor="yearOfStudy" className="block text-sm font-medium mb-1 text-white">
                Year of Study
              </label>
              <select
                id="yearOfStudy"
                name="yearOfStudy"
                value={formData.yearOfStudy}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors text-white"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}
                required
              >
                <option value="" style={{ color: 'black' }}>Select year</option>
                <option value="1" style={{ color: 'black' }}>1st Year</option>
                <option value="2" style={{ color: 'black' }}>2nd Year</option>
                <option value="3" style={{ color: 'black' }}>3rd Year</option>
                <option value="4" style={{ color: 'black' }}>4th Year</option>
                <option value="5" style={{ color: 'black' }}>5th Year</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1 text-white">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors placeholder-white placeholder-opacity-70"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white'
                  }}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1 text-white">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors placeholder-white placeholder-opacity-70"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white'
                  }}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-semibold text-white transition-all duration-200"
              style={{
                background: loading ? 'var(--gray-400)' : 'var(--green-800)',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.target as HTMLElement).style.background = 'var(--green-700)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  (e.target as HTMLElement).style.background = 'var(--green-800)';
                }
              }}
            >
              {loading ? 'Creating account...' : 'Submit'}
            </button>

            {/* Terms and conditions */}
            <div className="flex items-start gap-2 text-xs text-white">
              <input
                id="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5"
                required
              />
              <label htmlFor="terms">
                I accept the <Link to="/terms" className="underline hover:opacity-80">Terms & Conditions</Link>
              </label>
            </div>

            <div className="text-center text-sm text-white">
              Have an account? <Link to="/login" className="underline hover:opacity-80 font-medium">Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
