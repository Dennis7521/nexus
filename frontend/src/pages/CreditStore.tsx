import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { ShoppingCart, CheckCircle, XCircle } from 'lucide-react';

interface Package {
  credits: number;
  priceBWP: number;
  popular?: boolean;
}

const PACKAGES: Package[] = [
  { credits: 5,  priceBWP: 100 },
  { credits: 12, priceBWP: 240, popular: true },
  { credits: 20, priceBWP: 400 },
];

const CreditStore: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const verifiedRef = React.useRef(false);
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  useEffect(() => {
    if (verifiedRef.current) return;
    const success = searchParams.get('success');
    const cancelled = searchParams.get('cancelled');
    const sessionId = searchParams.get('session_id');

    if (success === 'true' && sessionId) {
      verifiedRef.current = true;
      verifySession(sessionId);
    } else if (cancelled === 'true') {
      showToast('error', 'Payment cancelled. No charges were made.');
    }

    // Check if we have a pending session to poll (from when new tab opened)
    const pendingSession = sessionStorage.getItem('pending_stripe_session');
    if (pendingSession && !success) {
      startPolling(pendingSession);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (sessionId: string) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 20) {
        clearInterval(pollRef.current!);
        sessionStorage.removeItem('pending_stripe_session');
        return;
      }
      try {
        const response = await axios.get(`/payments/session/${sessionId}`);
        if (response.data.success && response.data.purchase?.status === 'completed') {
          clearInterval(pollRef.current!);
          sessionStorage.removeItem('pending_stripe_session');
          const meResponse = await axios.get('/auth/me');
          if (meResponse.data.user) {
            updateUser({ timeCredits: meResponse.data.user.timeCredits });
          }
          showToast('success', 'Payment successful! Your credits have been added to your account.');
        }
      } catch {
        // keep polling
      }
    }, 3000);
  };

  const verifySession = async (sessionId: string) => {
    try {
      setVerifying(true);
      const response = await axios.get(`/payments/session/${sessionId}`);
      if (response.data.success) {
        const meResponse = await axios.get('/auth/me');
        if (meResponse.data.user) {
          updateUser({ timeCredits: meResponse.data.user.timeCredits });
        }
        navigate('/credit-store', { replace: true });
        showToast('success', 'Payment successful! Your credits have been added to your account.');
      } else {
        navigate('/credit-store', { replace: true });
        showToast('error', 'Could not verify payment. If you were charged, please contact support.');
      }
    } catch (error: any) {
      console.error('Session verification error:', error);
      navigate('/credit-store', { replace: true });
      showToast('error', error.response?.data?.message || 'Payment verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handlePurchase = async (credits: number) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setLoadingPackage(credits);
      const response = await axios.post('/payments/create-checkout-session', { credits });
      if (response.data.success && response.data.url) {
        sessionStorage.setItem('pending_stripe_session', response.data.sessionId);
        startPolling(response.data.sessionId);
        window.open(response.data.url, '_blank');
      } else {
        showToast('error', 'Could not start checkout. Please try again.');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      showToast('error', error.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setLoadingPackage(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-12 py-16">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border max-w-sm transition-all duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-white border-green-200 text-green-800'
              : 'bg-white border-red-200 text-red-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Verifying overlay */}
      {verifying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl p-8 text-center shadow-xl">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 mb-4" style={{ borderColor: 'var(--green-800)' }} />
            <p className="font-semibold text-gray-800">Verifying your payment…</p>
            <p className="text-sm text-gray-500 mt-1">This will only take a moment</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingCart className="w-7 h-7" style={{ color: 'var(--green-800)' }} />
          <h1 className="text-4xl font-semibold tracking-tighter" style={{ color: 'var(--gray-900)' }}>
            Credit Store
          </h1>
        </div>
      </div>

      {/* Current Balance */}
      <div
        className="rounded-xl p-4 mb-10 flex flex-col justify-between items-center mx-auto"
        style={{ background: '#C0C0C0', color: '#111827', width: '170px', height: '80px' }}
      >
        <p className="text-sm font-medium" style={{ color: '#374151' }}>Current Balance</p>
        <div>
          <p className="text-2xl font-bold tracking-tight">
            {Number(user?.timeCredits ?? 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Packages */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
        {PACKAGES.map((pkg) => (
          <div
            key={pkg.credits}
            className="relative rounded-2xl p-8 flex flex-col transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
            style={{ background: 'var(--green-800)' }}
          >
            {pkg.popular && (
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: '#F59E0B', color: '#1A1A1A' }}
              >
                POPULAR
              </span>
            )}

            <div className="mb-4">
              <p
                className="text-5xl font-bold tracking-tight mb-1"
                style={{ color: 'white' }}
              >
                {pkg.credits}
              </p>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>credits</p>
            </div>

            <div className="mb-6">
              <p className="text-2xl font-bold" style={{ color: 'white' }}>
                P{pkg.priceBWP.toLocaleString()}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>BWP · P20/credit</p>
            </div>

            <button
              onClick={() => handlePurchase(pkg.credits)}
              disabled={loadingPackage !== null}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'white', color: 'var(--green-900)' }}
            >
              {loadingPackage === pkg.credits ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  Redirecting…
                </span>
              ) : (
                `Buy ${pkg.credits} Credits`
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800">
        <p className="font-semibold mb-1">No Refund Policy</p>
        <p>
          All credit purchases are final and non-refundable. Credits purchased through the Credit Store are provided as an accessibility mechanism and are functionally identical to earned credits. They confer no additional privilege within the platform.
        </p>
      </div>
    </div>
  );
};

export default CreditStore;
