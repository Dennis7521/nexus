import { useState, useEffect } from 'react';
import { KeyRound, CheckCircle, Clock, User } from 'lucide-react';
import { useToast, ToastContainer } from '../components/Toast';

interface PasswordResetRequest {
  id: number;
  user_id: number;
  email: string;
  student_id: string;
  first_name: string;
  last_name: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  processed_at: string | null;
  processed_by_username: string | null;
  notes: string | null;
}

export const AdminAccounts: React.FC = () => {
  const { toasts, success, error, removeToast } = useToast();
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);

  useEffect(() => {
    fetchPasswordResetRequests();
  }, []);

  const fetchPasswordResetRequests = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/password-reset-requests?status=pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResetRequests(data);
      }
    } catch (err) {
      console.error('Error fetching password reset requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    setPendingRequestId(requestId);
    setShowConfirmModal(true);
  };

  const confirmApproval = async () => {
    if (!pendingRequestId) return;

    setShowConfirmModal(false);
    setProcessingRequest(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/approve-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId: pendingRequestId, notes: adminNotes })
      });

      const data = await response.json();

      if (response.ok) {
        success('Password reset approved and email sent to user');
        setSelectedRequest(null);
        setAdminNotes('');
        fetchPasswordResetRequests();
      } else {
        error(data.error || 'Failed to approve password reset');
      }
    } catch (err) {
      console.error('Error approving password reset:', err);
      error('Error approving password reset');
    } finally {
      setProcessingRequest(false);
    }
  };

  return (
    <div style={{ background: 'var(--green-50)', minHeight: '100vh' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--green-900)' }}>
            Account Management
          </h1>
        </div>

        {/* Password Reset Requests Section */}
        <div 
          className="rounded-lg p-8"
          style={{ 
            background: 'var(--white)',
            border: '1px solid var(--gray-200)'
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--white)', border: '1px solid var(--gray-200)' }}
            >
              <KeyRound className="w-6 h-6" style={{ color: 'var(--green-800)' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--gray-900)' }}>
                Password Reset Requests
              </h2>
              <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                Review and approve user password reset requests
              </p>
            </div>
          </div>

          {loadingRequests ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--gray-600)' }}>Loading requests...</p>
            </div>
          ) : resetRequests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--gray-400)' }} />
              <p style={{ color: 'var(--gray-600)' }}>No pending password reset requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {resetRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 rounded-lg"
                  style={{
                    border: '1px solid var(--gray-200)',
                    background: selectedRequest?.id === request.id ? 'var(--green-50)' : 'var(--white)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--gray-200)' }}
                      >
                        <User className="w-5 h-5" style={{ color: 'var(--gray-600)' }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                          {request.first_name} {request.last_name}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                          {request.email} • {request.student_id}
                        </p>
                        {request.reason && (
                          <div className="mt-2 p-2 rounded" style={{ background: 'var(--gray-100)' }}>
                            <p className="text-sm" style={{ color: 'var(--gray-700)' }}>
                              <strong>Reason:</strong> {request.reason}
                            </p>
                          </div>
                        )}
                        <p className="text-xs mt-2" style={{ color: 'var(--gray-500)' }}>
                          Requested: {new Date(request.requested_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setAdminNotes('');
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          background: 'var(--green-800)',
                          color: 'var(--white)'
                        }}
                      >
                        Review
                      </button>
                    </div>
                  </div>

                  {/* Review Panel */}
                  {selectedRequest?.id === request.id && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--gray-200)' }}>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-700)' }}>
                          Message to User (Optional)
                        </label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            border: '1px solid var(--gray-300)',
                            color: 'var(--gray-900)'
                          }}
                          placeholder="Add a message that will be sent to the user along with their temporary password..."
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApproveRequest(request.id)}
                          disabled={processingRequest}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
                          style={{
                            background: processingRequest ? 'var(--gray-400)' : 'var(--green-800)',
                            color: 'var(--white)',
                            cursor: processingRequest ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {processingRequest ? 'Processing...' : 'Approve & Send Password'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(null);
                            setAdminNotes('');
                          }}
                          disabled={processingRequest}
                          className="px-4 py-2 rounded-lg font-medium transition-colors"
                          style={{
                            border: '1px solid var(--gray-300)',
                            color: 'var(--gray-700)',
                            cursor: processingRequest ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-2xl max-w-md w-full p-8"
            style={{ background: 'var(--white)' }}
          >
            <div className="text-center mb-6">
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--green-100)' }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: 'var(--green-800)' }} />
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--gray-900)' }}>
                Approve Password Reset?
              </h3>
              <p className="text-base" style={{ color: 'var(--gray-600)' }}>
                A temporary password will be generated and sent to the user's email address. 
                They will be required to change it upon first login.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingRequestId(null);
                }}
                className="flex-1 px-6 py-3 rounded-xl font-medium transition-colors"
                style={{
                  background: 'var(--gray-200)',
                  color: 'var(--gray-700)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmApproval}
                className="flex-1 px-6 py-3 rounded-xl font-medium transition-colors"
                style={{
                  background: 'var(--green-500)',
                  color: 'var(--white)'
                }}
              >
                Approve & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
