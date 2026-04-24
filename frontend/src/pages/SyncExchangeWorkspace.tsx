import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import JitsiMeetModal from '../components/JitsiMeetModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Participant {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture_url: string | null;
  total_rating: number;
  rating_count: number;
  skill_offering: string;
  skill_receiving: string;
  position_in_cycle: number;
  status: string;
}

interface SyncSession {
  id: string;
  cycle_id: string;
  session_index: number;
  scheduled_at: string | null;
  duration_minutes: number;
  meeting_link: string | null;
  verification_code: string;
  confirmations: Record<string, { confirmed: boolean; confirmed_at: string; notes?: string }>;
  ratings: Record<string, { rating: number; review?: string }>;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  session_notes: string | null;
  completed_at: string | null;
  skill_pair_index: number | null;
  meeting_ended: boolean;
}

interface CycleData {
  id: string;
  cycle_length: number;
  cycle_score: number;
  status: string;
  session_count: number;
  current_session_index: number;
  exchange_mode: string;
  created_at: string;
  completed_at: string | null;
  my_teach_skill: string;
  my_learn_skill: string;
  my_position: number;
  my_acceptance_status: string;
  cycle_data: { participants: any[] };
  pair_session_counts: Record<string, number>;
}

type Modal =
  | { type: 'create_session' }
  | { type: 'rate'; session: SyncSession }
  | { type: 'session_detail'; session: SyncSession }
  | { type: 'verify_code'; session: SyncSession };

export default function SyncExchangeWorkspace() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sessions, setSessions] = useState<SyncSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jitsiSession, setJitsiSession] = useState<SyncSession | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Create session form state
  const [sessionForm, setSessionForm] = useState({
    scheduledAt: '',
    durationMinutes: 60,
    sessionNotes: '',
  });

  // Global session count state (kept for legacy, no longer shown)
  const [sessionCountInput, setSessionCountInput] = useState(10);
  const [settingSessionCount, setSettingSessionCount] = useState(false);

  // Skill pair selection
  const [selectedPairIndex, setSelectedPairIndex] = useState<number | null>(null);

  // Per-pair session count input (keyed by pairIndex)
  const [pairCountInputs, setPairCountInputs] = useState<Record<number, number>>({});
  const [settingPairCount, setSettingPairCount] = useState<number | null>(null);

  // Instructor rating (shown when cycle is completed)
  const [myReview, setMyReview] = useState<{ rating: number; comment: string | null; reviewee_name?: string } | null>(null);
  const [reviewLoaded, setReviewLoaded] = useState(false);

  // Verification code and confirmation notes
  const [verifyCode, setVerifyCode] = useState('');
  const [confirmNotes, setConfirmNotes] = useState('');
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchWorkspace();
  }, [cycleId]);

  // Has the current user's learning pair completed all required sessions?
  const myLearningPairCompleted = (() => {
    if (!cycle || participants.length === 0) return false;
    const n = participants.length;
    const myPos = cycle.my_position;
    const teacherPos = ((myPos - 1) % n + n) % n;
    const required = Number((cycle.pair_session_counts || {})[String(teacherPos)] || 0);
    if (required <= 0) return false;
    const completed = sessions.filter(s => s.skill_pair_index === teacherPos && s.status === 'completed').length;
    return completed >= required;
  })();

  useEffect(() => {
    const ready = cycle?.status === 'completed' || myLearningPairCompleted;
    if (ready && cycleId && !reviewLoaded) {
      fetchMyReview();
    }
  }, [cycle?.status, cycleId, reviewLoaded, myLearningPairCompleted]);

  const fetchMyReview = async () => {
    try {
      const res = await fetch(`${API}/sync-exchanges/${cycleId}/review`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyReview(data.review || null);
      }
    } catch (e) {
      // ignore
    } finally {
      setReviewLoaded(true);
    }
  };

  const handleSubmitReview = async () => {
    if (ratingValue < 1 || ratingValue > 5) {
      showToast('error', 'Please select a rating from 1 to 5 stars');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`${API}/sync-exchanges/${cycleId}/review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingValue, comment: ratingComment || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to submit review');
      }
      showToast('success', 'Thanks! Your rating has been submitted.');
      setRatingValue(0);
      setRatingComment('');
      await fetchMyReview();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const token = () => localStorage.getItem('token') || '';

  const handleResponse = (res: Response) => {
    if (res.status === 401) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const fetchWorkspace = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/sync-exchanges/${cycleId}/workspace`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!handleResponse(res)) return;
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to load workspace');
      }
      const data = await res.json();
      setCycle(data.cycle);
      setParticipants(data.participants || []);
      setSessions(data.sessions || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/sync-exchanges/${cycleId}/sessions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: sessionForm.scheduledAt || null,
          durationMinutes: sessionForm.durationMinutes,
          sessionNotes: sessionForm.sessionNotes || null,
          skillPairIndex: selectedPairIndex,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message);
      }
      setModal(null);
      setSessionForm({ scheduledAt: '', durationMinutes: 60, sessionNotes: '' });
      showToast('success', 'Session created! A Jitsi room has been generated. Share the verification code after the session.');
      fetchWorkspace();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndMeeting = async (session: SyncSession) => {
    try {
      const res = await fetch(`${API}/sync-exchanges/sessions/${session.id}/end-meeting`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message);
      }
      showToast('success', 'Meeting ended — session marked as completed.');
      fetchWorkspace();
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const handleSetPairSessionCount = async (pairIndex: number) => {
    const count = pairCountInputs[pairIndex];
    if (!count || count < 1 || count > 50) return;
    setSettingPairCount(pairIndex);
    try {
      const res = await fetch(`${API}/sync-exchanges/${cycleId}/set-pair-session-count`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairIndex, sessionCount: count }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message);
      }
      showToast('success', 'Session count set for this skill pair.');
      fetchWorkspace();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSettingPairCount(null);
    }
  };



  const handleSetSessionCount = async () => {
    if (!cycleId || sessionCountInput < 1 || sessionCountInput > 50) return;
    setSettingSessionCount(true);
    try {
      const res = await fetch(`${API}/sync-exchanges/${cycleId}/set-session-count`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCount: sessionCountInput }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message);
      }
      showToast('success', `Session count set to ${sessionCountInput}`);
      fetchWorkspace();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSettingSessionCount(false);
    }
  };

  const handleVerifyCode = async (session: SyncSession) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/sync-exchanges/sessions/${session.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ verification_code: verifyCode })
      });
      if (!res.ok) throw new Error('Verification failed');
      showToast('success', 'Attendance confirmed!');
      setModal(null);
      setVerifyCode('');
      fetchWorkspace();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async (session: SyncSession) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/sync-exchanges/sessions/${session.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notes: confirmNotes })
      });
      if (!res.ok) throw new Error('Confirmation failed');
      showToast('success', 'Session confirmed!');
      setModal(null);
      setConfirmNotes('');
      fetchWorkspace();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--gray-50)' }}>
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--green-600)' }} />
        </div>
      </div>
    );
  }

  if (error || !cycle) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--gray-50)' }}>
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-red-600 mb-4">{error || 'Exchange not found'}</p>
          <button onClick={() => navigate('/matches')} className="px-4 py-2 rounded-lg text-white" style={{ background: 'var(--green-800)' }}>
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  const isActive = cycle.status === 'active';
  const isCompleted = cycle.status === 'completed';

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--gray-50)' }}>
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-700' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <button onClick={() => navigate('/matches')} className="flex items-center gap-1 text-sm mb-2" style={{ color: 'var(--green-700)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Matches
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--green-100)', color: 'var(--green-800)' }}>SYNC • CREDIT FREE</span>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--gray-900)' }}>
                {cycle.cycle_length}-Person Exchange Cycle
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--gray-500)' }}>
              You teach <strong style={{ color: 'var(--green-700)' }}>{cycle.my_teach_skill}</strong> · You learn <strong style={{ color: 'var(--gray-800)' }}>{cycle.my_learn_skill}</strong>
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: '#145A32' }}>
            {isCompleted ? '✓ Completed' : isActive ? 'Active' : cycle.status}
          </span>
        </div>

        {/* Global session count setup prompt — only show if no pair counts set yet and no pair_session_counts exist */}
        {isActive && cycle.session_count === 0 && Object.keys(cycle.pair_session_counts || {}).length === 0 && false && (
          <div className="bg-white rounded-2xl p-5 mb-6" style={{ border: '2px solid var(--green-400)' }}>
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--gray-900)' }}>Set Total Number of Sessions</p>
            <p className="text-xs mb-4" style={{ color: 'var(--gray-500)' }}>Any participant can set how many sessions this exchange requires to be considered complete (1–50).</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={50}
                value={sessionCountInput}
                onChange={e => setSessionCountInput(Number(e.target.value))}
                className="w-28 px-3 py-2 rounded-xl text-center text-xl font-bold"
                style={{ border: '2px solid var(--green-400)', outline: 'none', color: 'var(--gray-900)' }}
              />
              <button
                onClick={handleSetSessionCount}
                disabled={settingSessionCount || sessionCountInput < 1 || sessionCountInput > 50}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--green-800)' }}
              >
                {settingSessionCount ? 'Saving...' : 'Confirm'}
              </button>
              <span className="text-xs" style={{ color: 'var(--gray-400)' }}>sessions total</span>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="bg-white rounded-2xl p-4 mb-6 text-center" style={{ border: '1px solid var(--green-200)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--green-700)' }}>🎉 Exchange complete! Everyone learned their skill.</p>
          </div>
        )}

        {/* Rate Your Instructor — shown when learner's pair (or whole cycle) is complete */}
        {(isCompleted || myLearningPairCompleted) && reviewLoaded && (() => {
          const n = participants.length;
          if (n === 0) return null;
          const myPos = cycle.my_position;
          const teacherPos = ((myPos - 1) % n + n) % n;
          const instructor = participants.find(p => p.position_in_cycle === teacherPos);
          if (!instructor) return null;
          const instructorName = `${instructor.first_name} ${instructor.last_name}`;
          const skillLearned = cycle.my_learn_skill;

          if (myReview) {
            return (
              <div className="bg-white rounded-2xl p-5 mb-6" style={{ border: '1px solid var(--green-200)' }}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--green-700)' }}>Your Rating Submitted</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--gray-900)' }}>
                      You rated <strong>{instructorName}</strong> for teaching <strong>{skillLearned}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <svg key={star} className="w-5 h-5" viewBox="0 0 24 24" fill={star <= myReview.rating ? '#f59e0b' : 'none'} stroke={star <= myReview.rating ? '#f59e0b' : 'var(--gray-300)'} strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.098 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.518-4.674z" />
                      </svg>
                    ))}
                  </div>
                </div>
                {myReview.comment && (
                  <p className="text-sm italic px-3 py-2 rounded-lg" style={{ background: 'var(--green-50)', color: 'var(--gray-700)' }}>
                    "{myReview.comment}"
                  </p>
                )}
              </div>
            );
          }

          return (
            <div className="bg-white rounded-2xl p-5 mb-6" style={{ border: '2px solid var(--green-400)' }}>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--green-700)' }}>Rate Your Instructor</p>
                <p className="text-base font-semibold mt-1" style={{ color: 'var(--gray-900)' }}>
                  How was learning <strong style={{ color: 'var(--green-700)' }}>{skillLearned}</strong> from <strong>{instructorName}</strong>?
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--gray-500)' }}>
                  Your rating helps other students and updates their instructor reputation.
                </p>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    onMouseEnter={() => setRatingHover(star)}
                    onMouseLeave={() => setRatingHover(0)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    <svg className="w-9 h-9" viewBox="0 0 24 24"
                      fill={star <= (ratingHover || ratingValue) ? '#f59e0b' : 'none'}
                      stroke={star <= (ratingHover || ratingValue) ? '#f59e0b' : 'var(--gray-300)'}
                      strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.098 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.518-4.674z" />
                    </svg>
                  </button>
                ))}
                {ratingValue > 0 && (
                  <span className="ml-2 text-sm font-semibold" style={{ color: 'var(--gray-700)' }}>
                    {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][ratingValue - 1]}
                  </span>
                )}
              </div>

              <textarea
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                rows={3}
                placeholder={`Share how ${instructor.first_name} taught you ${skillLearned} (optional)...`}
                className="w-full px-3 py-2 rounded-xl text-sm resize-none mb-3"
                style={{ border: '1px solid var(--gray-300)', outline: 'none' }}
              />

              <button
                onClick={handleSubmitReview}
                disabled={submittingReview || ratingValue === 0}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--green-800)' }}
                onMouseEnter={e => !submittingReview && ratingValue > 0 && (e.currentTarget.style.background = 'var(--green-700)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--green-800)')}
              >
                {submittingReview ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          );
        })()}

        {/* Skill pair cards / focused session view */}
        {(() => {
          if (participants.length === 0) return null;
          const n = participants.length;

          // Build skill pairs: p[i] teaches skill_offering to p[(i+1)%n]
          const pairs = participants.map((teacher, i) => {
            const learner = participants[(i + 1) % n];
            return { teacher, learner, skill: teacher.skill_offering, pairIndex: i };
          });

          // If a pair is selected, show focused session view
          if (selectedPairIndex !== null) {
            const pair = pairs[selectedPairIndex];
            const pairSessions = sessions.filter(s => s.skill_pair_index === selectedPairIndex);
            const isTeacher = pair.teacher.user_id === user?.id;
            const isLearner = pair.learner.user_id === user?.id;
            const focusedPairSessionCount = (cycle.pair_session_counts || {})[String(selectedPairIndex)] || 0;

            return (
              <div className="space-y-4">
                {/* Back + header */}
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => setSelectedPairIndex(null)} className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--green-700)' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    All Skill Pairs
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-5" style={{ border: '2px solid var(--green-400)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--green-700)' }}>Skill Being Taught</p>
                      <p className="text-xl font-bold" style={{ color: 'var(--gray-900)' }}>{pair.skill}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-1" style={{ background: 'var(--green-800)' }}>
                          {pair.teacher.first_name.charAt(0)}{pair.teacher.last_name.charAt(0)}
                        </div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--gray-700)' }}>{pair.teacher.user_id === user?.id ? 'You' : pair.teacher.first_name}</p>
                        <p className="text-xs" style={{ color: 'var(--gray-400)' }}>Teacher</p>
                      </div>
                      <svg className="w-6 h-6" style={{ color: 'var(--green-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-1" style={{ background: 'var(--gray-500)' }}>
                          {pair.learner.first_name.charAt(0)}{pair.learner.last_name.charAt(0)}
                        </div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--gray-700)' }}>{pair.learner.user_id === user?.id ? 'You' : pair.learner.first_name}</p>
                        <p className="text-xs" style={{ color: 'var(--gray-400)' }}>Learner</p>
                      </div>
                    </div>
                    {isActive && isTeacher && focusedPairSessionCount > 0 && pairSessions.length < focusedPairSessionCount && (
                      <button
                        onClick={() => setModal({ type: 'create_session' })}
                        className="px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-2"
                        style={{ background: 'var(--green-800)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--green-700)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--green-800)')}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Schedule Session
                      </button>
                    )}
                  </div>
                </div>

                {/* Sessions for this pair */}
                {pairSessions.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center" style={{ border: '1px dashed var(--gray-300)' }}>
                    <svg className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--gray-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="font-semibold text-sm mb-1" style={{ color: 'var(--gray-700)' }}>No sessions yet for this skill</p>
                    {isTeacher && <p className="text-xs" style={{ color: 'var(--gray-400)' }}>As the instructor for this skill, you can schedule the first session.</p>}
                    {isLearner && !isTeacher && <p className="text-xs" style={{ color: 'var(--gray-400)' }}>Waiting for the instructor to schedule sessions.</p>}
                  </div>
                ) : (
                  pairSessions.map((session) => {
                    return (
                      <div key={session.id} className="rounded-2xl overflow-hidden" style={{ background: '#145A32' }}>
                        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                              {session.session_index}
                            </div>
                            <div>
                              <p className="font-semibold text-sm" style={{ color: 'white' }}>Session {session.session_index}</p>
                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                {session.scheduled_at ? new Date(session.scheduled_at).toLocaleString() : 'Time not set'} · {session.duration_minutes} min
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{
                            background: session.status === 'completed' ? 'transparent' : session.status === 'cancelled' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.15)',
                            color: 'white'
                          }}>
                            {session.status === 'scheduled' ? 'Scheduled' : session.status === 'completed' ? '✓ Completed' : session.status}
                          </span>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                          {session.meeting_link && !session.meeting_ended && session.status !== 'completed' && (
                            <div className="flex items-center justify-between">
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`${API}/sync-exchanges/sessions/${session.id}/join`, {
                                      method: 'POST',
                                      headers: { Authorization: `Bearer ${token()}` },
                                    });
                                    if (!res.ok) {
                                      const body = await res.json().catch(() => ({}));
                                      console.error('Join recording failed:', res.status, body);
                                    }
                                  } catch (err) {
                                    console.error('Join recording error:', err);
                                  }
                                  setJitsiSession(session);
                                }}
                                className="flex items-center gap-2 text-sm font-semibold"
                                style={{ color: '#4ade80', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                Join Session
                              </button>
                              {isTeacher && (
                                <button
                                  onClick={() => handleEndMeeting(session)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                                  style={{ background: '#dc2626' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
                                  onMouseLeave={e => (e.currentTarget.style.background = '#dc2626')}
                                >
                                  End Meeting
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Upcoming placeholder slots */}
                {isActive && focusedPairSessionCount > 0 && Array.from({ length: Math.max(0, focusedPairSessionCount - pairSessions.length) }).map((_, i) => (
                  <div key={`ph-${i}`} className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: 'var(--gray-100)', border: '1px dashed var(--gray-300)' }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'var(--gray-200)', color: 'var(--gray-400)' }}>{pairSessions.length + i + 1}</div>
                    <p className="text-sm" style={{ color: 'var(--gray-400)' }}>Session {pairSessions.length + i + 1} — not yet scheduled</p>
                  </div>
                ))}
              </div>
            );
          }

          // Default: show skill-pair cards
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pairs.map((pair) => {
                  const isTeacher = pair.teacher.user_id === user?.id;
                  const isLearner = pair.learner.user_id === user?.id;
                  const isMember = isTeacher || isLearner;
                  const pairSessions = sessions.filter(s => s.skill_pair_index === pair.pairIndex);
                  const completed = pairSessions.filter(s => s.status === 'completed').length;
                  const pairSessionCount = (cycle.pair_session_counts || {})[String(pair.pairIndex)] || 0;
                  return (
                    <div
                      key={pair.pairIndex}
                      className="rounded-2xl p-5 transition-all duration-200"
                      style={{ background: '#145A32', border: `2px solid ${isMember ? '#4ade80' : '#1a7a45'}` }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.25)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                    >
                      {/* Clickable area */}
                      <button className="w-full text-left" onClick={() => (pairSessionCount > 0 || isCompleted) ? setSelectedPairIndex(pair.pairIndex) : undefined}>
                        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'rgba(255,255,255,0.65)' }}>{pair.skill}</p>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                            {pair.teacher.first_name.charAt(0)}{pair.teacher.last_name.charAt(0)}
                          </div>
                          <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}>
                            {pair.learner.first_name.charAt(0)}{pair.learner.last_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'white' }}>
                              {pair.teacher.user_id === user?.id ? 'You' : pair.teacher.first_name} → {pair.learner.user_id === user?.id ? 'You' : pair.learner.first_name}
                            </p>
                          </div>
                        </div>
                        {pairSessionCount > 0 ? (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{completed}/{pairSessionCount} sessions done</span>
                              {isMember && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>Your pair</span>}
                            </div>
                            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                              <div className="h-full rounded-full" style={{ width: `${(completed / pairSessionCount) * 100}%`, background: '#4ade80' }} />
                            </div>
                          </>
                        ) : (
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            {isCompleted ? 'No sessions recorded for this pair.' : isTeacher ? 'Set the number of sessions below to begin.' : 'Waiting for instructor to set session count.'}
                          </p>
                        )}
                      </button>

                      {/* Instructor: set session count inline */}
                      {isTeacher && pairSessionCount === 0 && isActive && (
                        <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            placeholder="e.g. 5"
                            value={pairCountInputs[pair.pairIndex] ?? ''}
                            onChange={e => setPairCountInputs(prev => ({ ...prev, [pair.pairIndex]: Number(e.target.value) }))}
                            onClick={e => e.stopPropagation()}
                            className="w-20 px-2 py-1.5 rounded-lg text-sm text-center font-bold"
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', outline: 'none' }}
                          />
                          <span className="text-xs flex-1" style={{ color: 'rgba(255,255,255,0.5)' }}>sessions</span>
                          <button
                            onClick={e => { e.stopPropagation(); handleSetPairSessionCount(pair.pairIndex); }}
                            disabled={settingPairCount === pair.pairIndex || !pairCountInputs[pair.pairIndex]}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                            style={{ background: '#4ade80', color: '#0D3B22' }}
                          >
                            {settingPairCount === pair.pairIndex ? 'Saving...' : 'Confirm'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* Create Session Modal */}
            {modal.type === 'create_session' && (
              <>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <h3 className="font-bold text-lg" style={{ color: 'var(--gray-900)' }}>Schedule Session {sessions.filter(s => s.skill_pair_index === selectedPairIndex).length + 1}</h3>
                  <button onClick={() => setModal(null)}><svg className="w-5 h-5" style={{ color: 'var(--gray-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--gray-700)' }}>Date &amp; Time</label>
                    <input type="datetime-local" value={sessionForm.scheduledAt} onChange={e => setSessionForm(f => ({ ...f, scheduledAt: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm" style={{ border: '1px solid var(--gray-300)', outline: 'none' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--gray-700)' }}>Duration (minutes)</label>
                    <input type="number" min={15} max={240} value={sessionForm.durationMinutes} onChange={e => setSessionForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl text-sm" style={{ border: '1px solid var(--gray-300)', outline: 'none' }} />
                  </div>
                  <div className="flex items-start gap-3 px-3 py-3 rounded-xl" style={{ background: '#E8F5F1', border: '1px solid #D1E7DD' }}>
                    <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#0D3B22' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#0D3B22' }}>Meeting room auto-generated</p>
                      <p className="text-xs mt-0.5" style={{ color: '#4B7A62' }}>A private Jitsi Meet room will be created for this session — no external app needed.</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--gray-700)' }}>Notes (optional)</label>
                    <textarea rows={2} placeholder="Topics to cover..." value={sessionForm.sessionNotes} onChange={e => setSessionForm(f => ({ ...f, sessionNotes: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm resize-none" style={{ border: '1px solid var(--gray-300)', outline: 'none' }} />
                  </div>
                  <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--green-50)', color: 'var(--green-800)' }}>
                    A verification code will be generated. Share it with all participants after the session to confirm attendance.
                  </p>
                </div>
                <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid var(--gray-100)' }}>
                  <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}>Cancel</button>
                  <button onClick={handleCreateSession} disabled={actionLoading} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--green-800)' }}>
                    {actionLoading ? 'Creating...' : 'Create Session'}
                  </button>
                </div>
              </>
            )}

            {/* Verify Code Modal */}
            {modal.type === 'verify_code' && (
              <>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <h3 className="font-bold text-lg" style={{ color: 'var(--gray-900)' }}>Enter Verification Code</h3>
                  <button onClick={() => setModal(null)}><svg className="w-5 h-5" style={{ color: 'var(--gray-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                    Enter the verification code for Session {modal.session.session_index}. The session creator shared this code with all participants.
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. ABC-DEF-GHJ"
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.toUpperCase())}
                    maxLength={11}
                    className="w-full px-4 py-3 rounded-xl text-center font-mono font-bold text-lg tracking-widest"
                    style={{ border: '2px solid var(--green-400)', outline: 'none' }}
                  />
                </div>
                <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid var(--gray-100)' }}>
                  <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}>Cancel</button>
                  <button onClick={() => handleVerifyCode(modal.session)} disabled={actionLoading || verifyCode.length < 9} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--green-800)' }}>
                    {actionLoading ? 'Verifying...' : 'Confirm Attendance'}
                  </button>
                </div>
              </>
            )}

            {/* Confirm Without Code Modal */}
            {modal.type === 'session_detail' && (
              <>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <h3 className="font-bold text-lg" style={{ color: 'var(--gray-900)' }}>Confirm Attendance</h3>
                  <button onClick={() => setModal(null)}><svg className="w-5 h-5" style={{ color: 'var(--gray-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <p className="text-sm" style={{ color: 'var(--gray-600)' }}>Confirm that Session {modal.session.session_index} took place. Add optional notes.</p>
                  <textarea rows={3} placeholder="Optional notes about the session..." value={confirmNotes} onChange={e => setConfirmNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm resize-none" style={{ border: '1px solid var(--gray-300)', outline: 'none' }} />
                  <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--amber-50, #fffbeb)', color: '#92400e' }}>
                    If another participant didn't show, you can report them via <strong>Messages</strong> → flag icon.
                  </p>
                </div>
                <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid var(--gray-100)' }}>
                  <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}>Cancel</button>
                  <button onClick={() => handleConfirm(modal.session)} disabled={actionLoading} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--green-800)' }}>
                    {actionLoading ? 'Confirming...' : 'Confirm'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Embedded Jitsi Meeting */}
      {jitsiSession && jitsiSession.meeting_link && (
        <JitsiMeetModal
          meetingLink={jitsiSession.meeting_link}
          displayName={user ? `${user.firstName} ${user.lastName}` : 'Participant'}
          sessionTitle={`Session ${jitsiSession.session_index}`}
          onClose={() => setJitsiSession(null)}
          onJoined={async () => {
            try {
              await fetch(`${API}/sync-exchanges/sessions/${jitsiSession.id}/join`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}` },
              });
            } catch (err) {
              console.error('Join recording error:', err);
            }
          }}
        />
      )}
    </div>
  );
}

