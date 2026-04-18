import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, MessageCircle, ArrowRight } from 'lucide-react';

export const Requests: React.FC = () => {
  const { user, acceptRequest, rejectRequest } = useAuth();
  const incomingRequests = user?.incomingRequests || [];
  const outgoingRequests = user?.outgoingRequests || [];
  const pendingIncoming = incomingRequests.filter(req => req.status === 'pending');

  const handleAccept = (requestId: string) => {
    acceptRequest(requestId);
  };

  const handleReject = (requestId: string) => {
    rejectRequest(requestId);
  };

  return (
    <div className="page-background min-h-screen">
      <div className="max-w-6xl mx-auto px-12 py-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold mb-4 tracking-tighter" style={{ color: 'var(--gray-900)' }}>
          Exchange Requests
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="font-bold mb-1" style={{ fontSize: 'var(--text-2xl)', color: 'var(--gray-900)' }}>
            {pendingIncoming.length}
          </div>
          <div className="font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>
            Pending
          </div>
        </div>
        <div className="card">
          <div className="font-bold mb-1" style={{ fontSize: 'var(--text-2xl)', color: 'var(--gray-900)' }}>
            {outgoingRequests.length}
          </div>
          <div className="font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>
            Your Requests
          </div>
        </div>
        <div className="card">
          <div className="font-bold mb-1" style={{ fontSize: 'var(--text-2xl)', color: 'var(--gray-900)' }}>
            {incomingRequests.filter(req => req.status === 'accepted').length + outgoingRequests.filter(req => req.status === 'accepted').length}
          </div>
          <div className="font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>
            Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Incoming Requests */}
        <div>
          <h2 className="font-bold mb-6 tracking-tight" style={{ 
            fontSize: 'var(--text-2xl)', 
            color: 'var(--gray-900)'
          }}>
            Incoming Requests
          </h2>
          
          <div className="space-y-4">
            {pendingIncoming.length === 0 ? (
              <div className="text-center py-12 bg-secondary-50 dark:bg-secondary-800 rounded-2xl">
                <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-secondary-500" />
                </div>
                <h3 className="text-lg font-semibold text-black dark:text-neutral-white mb-2">
                  No pending requests
                </h3>
                <p className="text-black dark:text-neutral-white">
                  When students request to learn from you, they'll appear here.
                </p>
              </div>
            ) : (
              pendingIncoming.map((request) => (
                <div
                  key={request.id}
                  className="card"
                >
                  {/* Request Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-semibold" style={{
                        background: 'var(--green-800)',
                        color: 'var(--white)'
                      }}>
                        {request.requesterName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-secondary-900 dark:text-neutral-white">
                          {request.requesterName}
                        </h3>
                        <p className="text-sm text-black dark:text-neutral-white">
                          {request.requesterEmail}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-black dark:text-neutral-white mb-1">
                        {new Date(request.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-900)' }}>
                        pending
                      </div>
                    </div>
                  </div>

                  {/* Skill and Credits */}
                  <div className="mb-4 p-4 bg-neutral-white dark:bg-secondary-700 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold mb-1" style={{ color: 'var(--gray-900)' }}>
                          {request.skillTitle}
                        </h4>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>
                          Skill exchange request
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold mb-1" style={{ color: 'var(--green-800)' }}>
                          +{request.creditsRequired}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
                          credits earned
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  {request.message && (
                    <div className="mb-6 p-4 bg-accent-50 dark:bg-accent-900/20 rounded-xl border-l-4 border-accent-600">
                      <div className="flex items-start gap-2">
                        <MessageCircle className="w-4 h-4 text-accent-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-accent-700 dark:text-accent-400 mb-1">
                            Message from {request.requesterName}:
                          </p>
                          <p className="text-sm text-black dark:text-neutral-white leading-relaxed">
                            {request.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAccept(request.id)}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      Accept & Start Messaging
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="flex-1 font-semibold py-3 px-6 flex items-center justify-center gap-2 transition-all duration-200"
                      style={{
                        background: 'var(--danger)',
                        color: 'var(--white)',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Outgoing Requests */}
        <div>
          <h2 className="text-2xl font-semibold text-primary-900 mb-6 tracking-tight">
            Your Requests
          </h2>
          
          <div className="space-y-4">
            {outgoingRequests.length === 0 ? (
              <div className="text-center py-12 bg-secondary-50 dark:bg-secondary-800 rounded-2xl">
                <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-secondary-500" />
                </div>
                <h3 className="text-lg font-semibold text-black dark:text-neutral-white mb-2">
                  No outgoing requests
                </h3>
                <p className="text-black dark:text-neutral-white">
                  Browse skills on the dashboard to send exchange requests.
                </p>
              </div>
            ) : (
              outgoingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-secondary-100 dark:bg-secondary-800 rounded-2xl p-6 border border-secondary-200 dark:border-secondary-600"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-semibold" style={{
                        background: 'var(--green-800)',
                        color: 'var(--white)'
                      }}>
                        {request.providerName?.split(' ').map(n => n[0]).join('') || 'U'}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-secondary-900 dark:text-neutral-white">
                          {request.skillTitle}
                        </h3>
                        <p className="text-sm text-black dark:text-neutral-white">
                          Request to {request.providerName}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-medium" style={{ color: 'var(--gray-900)' }}>
                      {request.status}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Request History */}
      {(incomingRequests.filter(req => req.status !== 'pending').length > 0) && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-secondary-900 dark:text-neutral-white mb-6">
            Request History
          </h2>
          <div className="space-y-3">
            {incomingRequests
              .filter(req => req.status !== 'pending')
              .map((request) => (
                <div
                  key={request.id}
                  className="bg-secondary-50 dark:bg-secondary-800/50 rounded-xl p-4 border border-secondary-200 dark:border-secondary-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-secondary-200 dark:bg-secondary-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-secondary-600 dark:text-secondary-300" />
                      </div>
                      <div>
                        <div className="font-medium text-secondary-900 dark:text-neutral-white">
                          {request.requesterName} • {request.skillTitle}
                        </div>
                        <div className="text-sm text-black dark:text-neutral-white">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-medium" style={{ color: 'var(--gray-900)' }}>
                        {request.status === 'accepted' ? 'Accepted' : 'Declined'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Requests;
