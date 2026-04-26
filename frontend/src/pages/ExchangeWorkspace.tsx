import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import CreateSessionForm from '../components/CreateSessionForm';
import SessionCard from '../components/SessionCard';
import { Star } from 'lucide-react';

interface Exchange {
  id: number;
  skill_id: number;
  requester_id: string;
  instructor_id: string;
  status: string;
  message: string;
  total_credits: number | string;  // Database returns NUMERIC as string
  escrow_credits: number | string; // Database returns NUMERIC as string
  session_count: number;
  skill_title: string;
  skill_description: string;
  skill_category?: string;
  requester_name: string;
  requester_email: string;
  requester_picture: string;
  instructor_name: string;
  instructor_email: string;
  instructor_picture: string;
  created_at: string;
}

interface Session {
  id: number;
  exchange_request_id: number;
  session_index: number;
  scheduled_at: string;
  duration_minutes: number;
  credit_share: number;
  verification_code: string;
  code_attempts: number;
  mentor_confirmed: boolean;
  mentor_confirmed_at: string;
  learner_confirmed: boolean;
  learner_confirmed_at: string;
  session_notes: string;
  topics_covered: string[];
  meeting_link: string;
  learner_rating: number;
  learner_review: string;
  status: string;
  completed_at: string;
  created_at: string;
}

export default function ExchangeWorkspace() {
  const { exchangeId } = useParams<{ exchangeId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchExchangeData();
  }, [exchangeId, user]);

  const fetchExchangeData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Fetch exchange details
      const exchangeRes = await fetch(`${API_URL}/exchanges/${exchangeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!exchangeRes.ok) {
        throw new Error('Failed to fetch exchange');
      }
      
      const exchangeData = await exchangeRes.json();
      setExchange(exchangeData);
      
      // Fetch sessions
      const sessionsRes = await fetch(`${API_URL}/exchanges/${exchangeId}/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
      }

      // Fetch existing review for this exchange (learner only)
      const reviewRes = await fetch(`${API_URL}/exchanges/${exchangeId}/review`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (reviewRes.ok) {
        const reviewData = await reviewRes.json();
        setExistingReview(reviewData.review);
      }
      
    } catch (err) {
      console.error('Error fetching exchange data:', err);
      showError('Failed to load exchange workspace');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--green-50)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--green-800)] mx-auto"></div>
          <p className="mt-4 text-[var(--gray-600)]">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!exchange) {
    return (
      <div className="min-h-screen bg-[var(--green-50)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--gray-900)] mb-2">Exchange Not Found</h2>
          <p className="text-[var(--gray-600)] mb-4">This exchange doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/requests')}
            className="px-6 py-2 bg-[var(--green-500)] text-white rounded-lg hover:bg-[var(--green-600)]"
          >
            Back to Requests
          </button>
        </div>
      </div>
    );
  }

  const isMentor = user?.id === exchange.instructor_id;
  const isLearner = user?.id === exchange.requester_id;
  const partnerName = isMentor ? exchange.requester_name : exchange.instructor_name;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewRating === 0) {
      showError('Please select a star rating');
      return;
    }
    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/exchanges/${exchangeId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment.trim() || null })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to submit review');
      success('Review submitted! Thank you for your feedback.');
      setExistingReview(data.review);
    } catch (err: any) {
      showError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };
  
  // Convert to numbers (database returns strings for NUMERIC types)
  const totalCredits = typeof exchange.total_credits === 'number' 
    ? exchange.total_credits 
    : parseFloat(exchange.total_credits) || 0;
  const escrowCredits = typeof exchange.escrow_credits === 'number'
    ? exchange.escrow_credits
    : parseFloat(exchange.escrow_credits) || 0;
  const creditsReleased = totalCredits - escrowCredits;
  const progressPercentage = totalCredits > 0 ? (creditsReleased / totalCredits) * 100 : 0;
  
  // Calculate completed sessions
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const sessionProgressPercentage = exchange.session_count > 0 
    ? (completedSessions / exchange.session_count) * 100 
    : 0;
  const creditsPerSession = totalCredits / exchange.session_count;

  return (
    <div className="min-h-screen" style={{ background: 'var(--green-50)' }}>
      {/* Admin Termination Banner */}
      {exchange.status === 'terminated' && (
        <div
          className="w-full"
          style={{ background: '#fee2e2', borderBottom: '1px solid #fca5a5' }}
        >
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="font-semibold" style={{ color: '#991b1b' }}>
                Exchange terminated
              </div>
              <div className="text-sm" style={{ color: '#7f1d1d' }}>
                This exchange was terminated by NEXUS administration. No further sessions can be scheduled. Any escrow will be resolved by an administrator.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white" style={{ borderBottom: '1px solid var(--gray-200)' }}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Title and Status */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--gray-900)' }}>
                Exchange Workspace
              </h1>
              <p className="text-lg" style={{ color: 'var(--gray-600)' }}>
                {exchange.skill_title} with {partnerName}
              </p>
            </div>
            <span 
              className="text-sm font-semibold"
              style={{
                color: 'var(--gray-900)'
              }}
            >
              {exchange.status.charAt(0).toUpperCase() + exchange.status.slice(1)}
            </span>
          </div>

          {/* Credit Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4" style={{ border: '1px solid var(--gray-200)' }}>
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--gray-500)' }}>
                Total Credits
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--gray-900)' }}>
                {totalCredits.toFixed(1)}
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4" style={{ border: '1px solid var(--gray-200)' }}>
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--gray-500)' }}>
                Sessions Required
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--gray-900)' }}>
                {exchange.session_count}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--gray-500)' }}>
                {creditsPerSession.toFixed(3)} credits/session
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4" style={{ border: '1px solid var(--gray-200)' }}>
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--gray-500)' }}>
                In Escrow
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--green-800)' }}>
                {escrowCredits.toFixed(1)}
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4" style={{ border: '1px solid var(--gray-200)' }}>
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--gray-500)' }}>
                Released
              </div>
              <div className="text-3xl font-bold" style={{ color: '#10B981' }}>
                {creditsReleased.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="grid grid-cols-2 gap-4">
            {/* Session Progress */}
            <div 
              className="rounded-lg p-6" 
              style={{ 
                background: '#E8F5F1',
                border: '1px solid #D1E7DD'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 
                  className="text-sm font-semibold" 
                  style={{ color: '#1E4D3B' }}
                >
                  Session Progress
                </h3>
                <span 
                  className="text-sm font-bold" 
                  style={{ color: '#10B981' }}
                >
                  {completedSessions}/{exchange.session_count}
                </span>
              </div>
              
              <div 
                className="w-full h-2 rounded-full overflow-hidden" 
                style={{ backgroundColor: '#D1E7DD' }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${sessionProgressPercentage}%`,
                    background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                  }}
                />
              </div>
            </div>

            {/* Credit Release Progress */}
            <div 
              className="rounded-lg p-6" 
              style={{ 
                background: '#E8F5F1',
                border: '1px solid #D1E7DD'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 
                  className="text-sm font-semibold" 
                  style={{ color: '#1E4D3B' }}
                >
                  Credit Release Progress
                </h3>
                <span 
                  className="text-sm font-bold" 
                  style={{ color: '#10B981' }}
                >
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              
              <div 
                className="w-full h-2 rounded-full overflow-hidden" 
                style={{ backgroundColor: '#D1E7DD' }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${progressPercentage}%`,
                    background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Sessions Section */}
        <div className="bg-white rounded-2xl p-8" style={{ border: '1px solid var(--gray-200)', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--gray-900)' }}>
                  Sessions
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--gray-600)' }}>
                  {completedSessions} completed, {sessions.length} scheduled of {exchange.session_count} required
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--gray-500)' }}>
                  Each completed session releases {creditsPerSession.toFixed(3)} credits from escrow
                </p>
              </div>
              {isMentor && (exchange.status === 'accepted' || exchange.status === 'in_progress') && sessions.length < exchange.session_count && (
                <button
                  onClick={() => setShowCreateSession(!showCreateSession)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
                  style={{
                    background: showCreateSession ? 'var(--gray-200)' : 'var(--green-800)',
                    color: showCreateSession ? 'var(--gray-700)' : 'white'
                  }}
                  onMouseEnter={(e) => {
                    if (!showCreateSession) e.currentTarget.style.background = 'var(--green-700)';
                  }}
                  onMouseLeave={(e) => {
                    if (!showCreateSession) e.currentTarget.style.background = 'var(--green-800)';
                  }}
                >
                  {showCreateSession ? 'Cancel' : '+ Create Session'}
                </button>
              )}
            </div>

            {/* Create Session Form */}
            {showCreateSession && isMentor && (
              <div className="mb-8">
                <CreateSessionForm
                  exchangeId={parseInt(exchangeId!)}
                  sessionCount={exchange.session_count}
                  existingSessions={sessions}
                  onSessionCreated={() => {
                    fetchExchangeData();
                    setShowCreateSession(false);
                    success('Session created successfully!');
                  }}
                  onCancel={() => setShowCreateSession(false)}
                />
              </div>
            )}

            {/* Session List */}
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="text-center py-16 rounded-xl" style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)' }}>
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--green-100)' }}>
                    <svg className="w-8 h-8" style={{ color: 'var(--green-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--gray-900)' }}>
                    No sessions scheduled yet
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                    {isMentor 
                      ? 'Create your first session using the button above to get started.'
                      : 'Your mentor will create and schedule sessions soon.'}
                  </p>
                </div>
              ) : (
                sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isMentor={isMentor}
                    isLearner={isLearner}
                    onUpdate={fetchExchangeData}
                  />
                ))
              )}
            </div>
        </div>

        {/* Review Section — shown to learner only when exchange is completed */}
        {isLearner && exchange.status === 'completed' && (
          <div className="bg-white rounded-2xl p-8 mt-6" style={{ border: '1px solid var(--gray-200)', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
            <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--gray-900)' }}>
              Rate Your Instructor
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--gray-500)' }}>
              How was your experience learning <strong>{exchange.skill_title}</strong> with <strong>{partnerName}</strong>?
            </p>

            {existingReview ? (
              <div className="rounded-xl p-6" style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)' }}>
                <div className="flex items-center gap-2 mb-3">
                  {[1,2,3,4,5].map((s) => (
                    <Star
                      key={s}
                      className={`w-6 h-6 ${
                        s <= existingReview.rating
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-[var(--gray-300)]'
                      }`}
                    />
                  ))}
                  <span className="ml-2 font-semibold" style={{ color: 'var(--gray-700)' }}>
                    {existingReview.rating}/5
                  </span>
                </div>
                {existingReview.comment && (
                  <p className="text-sm italic" style={{ color: 'var(--gray-600)' }}>
                    "{existingReview.comment}"
                  </p>
                )}
                <p className="text-xs mt-3" style={{ color: 'var(--gray-400)' }}>
                  Submitted on {new Date(existingReview.created_at).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit}>
                {/* Star picker */}
                <div className="flex gap-2 mb-4">
                  {[1,2,3,4,5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHover(star)}
                      onMouseLeave={() => setReviewHover(0)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-9 h-9 ${
                          star <= (reviewHover || reviewRating)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-[var(--gray-300)]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {reviewRating > 0 && (
                  <p className="text-sm mb-3" style={{ color: 'var(--gray-600)' }}>
                    {reviewRating === 1 && 'Poor'}
                    {reviewRating === 2 && 'Fair'}
                    {reviewRating === 3 && 'Good'}
                    {reviewRating === 4 && 'Very Good'}
                    {reviewRating === 5 && 'Excellent'}
                  </p>
                )}
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this instructor (optional)..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--green-500)]"
                  style={{ border: '1px solid var(--gray-300)' }}
                />
                <button
                  type="submit"
                  disabled={submittingReview || reviewRating === 0}
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'var(--green-800)' }}
                  onMouseEnter={(e) => { if (!submittingReview) e.currentTarget.style.background = 'var(--green-700)'; }}
                  onMouseLeave={(e) => { if (!submittingReview) e.currentTarget.style.background = 'var(--green-800)'; }}
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
