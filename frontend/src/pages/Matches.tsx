import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../components/Toast';

interface AsyncMatch {
  id: number;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  teacherPicture?: string;
  rating: number;
  ratingCount: number;
  skillName: string;
  skillId: string | null;
  creditsRequired: number | null;
  matchScore: number;
  status: string;
  createdAt: string;
}

interface CycleParticipant {
  userId: string;
  skill: string;
  wantSkill: string;
  name?: string;
}

interface Cycle {
  id: string;
  cycle_data: {
    participants: CycleParticipant[];
  };
  cycle_length: number;
  cycle_score: string;
  status: string;
  created_at: string;
  session_count: number;
  current_session_index: number;
  accepted_count: number;
  total_participants: number;
  position_in_cycle: number;
  teach_skill: string;
  learn_skill: string;
  acceptance_status: string;
}

interface CompletedExchange {
  id: string;
  type: 'async' | 'sync';
  skillName?: string;
  partnerName?: string;
  partnerId?: string;
  role?: 'learned' | 'taught';
  cycleData?: Cycle;
  completedAt: string;
}

export default function Matches() {
  const { user, getAvailableCredits, sendExchangeRequest } = useAuth();
  const navigate = useNavigate();
  const { toasts, success, error: toastError, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'async' | 'cycles' | 'completed'>('cycles');
  const [asyncMatches, setAsyncMatches] = useState<AsyncMatch[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [completedExchanges, setCompletedExchanges] = useState<CompletedExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [requestingId, setRequestingId] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === 'async') {
      generateMatchesForUser();
    } else if (activeTab === 'cycles') {
      fetchCycles();
    } else if (activeTab === 'completed') {
      fetchCompletedExchanges();
    }
  }, [activeTab]);

  const generateMatchesForUser = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      
      // First, trigger async matching for each skill the user is interested in
      if (user?.skillsInterestedIn && user.skillsInterestedIn.length > 0) {
        console.log('Generating matches for skills:', user.skillsInterestedIn);
        
        for (const skill of user.skillsInterestedIn) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/matches/async/${encodeURIComponent(skill)}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (err) {
            console.warn(`Failed to generate matches for ${skill}:`, err);
          }
        }
      }
      
      // Then fetch all matches
      await fetchAsyncMatches();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchAsyncMatches = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch suggested matches
      const suggestedResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/matches/suggestions?status=suggested&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!suggestedResponse.ok) throw new Error('Failed to fetch matches');
      const suggestedData = await suggestedResponse.json();
      setAsyncMatches(suggestedData.suggestions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCycles = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sync-exchanges/cycles/my?status=proposed`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch cycles');
      const data = await response.json();
      setCycles(data.cycles || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedExchanges = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const completed: CompletedExchange[] = [];

      // Fetch completed async exchanges
      try {
        const asyncResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/exchanges/completed`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (asyncResponse.ok) {
          const asyncData = await asyncResponse.json();
          (asyncData.exchanges || []).forEach((exchange: any) => {
            completed.push({
              id: exchange.id.toString(),
              type: 'async',
              skillName: exchange.skillName,
              partnerName: exchange.partnerName,
              partnerId: exchange.skillId,
              role: exchange.role === 'taught' ? 'taught' : 'learned',
              completedAt: exchange.completedAt
            });
          });
        }
      } catch (err) {
        console.warn('Failed to fetch completed async exchanges:', err);
      }

      // Fetch completed sync cycles
      try {
        const syncResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sync-exchanges/cycles/my?status=completed`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          (syncData.cycles || []).forEach((cycle: Cycle) => {
            completed.push({
              id: cycle.id,
              type: 'sync',
              cycleData: cycle,
              completedAt: cycle.created_at
            });
          });
        }
      } catch (err) {
        console.warn('Failed to fetch completed sync cycles:', err);
      }

      // Sort by completion date descending
      completed.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      setCompletedExchanges(completed);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestExchange = async (match: AsyncMatch) => {
    if (requestingId) return; // Prevent duplicate clicks

    if (!user) {
      toastError('Please log in to request an exchange');
      return;
    }

    if (!match.skillId) {
      toastError(`${match.teacherName} hasn't published a skill card for ${match.skillName} yet, so an exchange can't be booked.`);
      return;
    }

    const credits = match.creditsRequired ?? 0;
    if (getAvailableCredits() < credits) {
      toastError(`Insufficient credits! You need ${credits} credits but only have ${getAvailableCredits()}.`);
      return;
    }

    setRequestingId(match.id);
    try {
      const firstName = match.teacherName.split(' ')[0];
      const requestSuccess = await sendExchangeRequest(
        match.skillId,
        1,
        `Hi ${firstName}! I would love to learn ${match.skillName} from you. I'm excited to exchange knowledge and skills with you!`
      );

      if (!requestSuccess) {
        toastError('Failed to send exchange request. Please try again.');
        return;
      }

      // Mark the match as contacted so it disappears from the One-on-One Matches list
      try {
        const token = localStorage.getItem('token');
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/matches/${match.id}/contact`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('Failed to update match status after exchange request:', err);
      }

      success(`Exchange request sent to ${match.teacherName}!`);
      fetchAsyncMatches();
    } catch (err: any) {
      console.error('Error sending exchange request:', err);
      toastError(err.message || 'Could not send request. Please try again.');
    } finally {
      setRequestingId(null);
    }
  };

  const handleCycleResponse = async (cycleId: string, accept: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sync-exchanges/cycles/${cycleId}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accept })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to respond to cycle');
      }

      const data = await response.json();

      if (accept && data.cycleStatus === 'active') {
        navigate(`/sync-exchange/${cycleId}`);
        return;
      }

      if (accept && data.cycleStatus === 'proposed') {
        setSuccessMessage('You accepted! Waiting for other participants to accept.');
        setTimeout(() => setSuccessMessage(''), 5000);
      }

      fetchCycles();
    } catch (err: any) {
      setError(err.message || 'Failed to respond to cycle');
      setTimeout(() => setError(''), 5000);
    }
  };


  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Matches</h1>
          <p className="mt-2 text-gray-600">
            Discover skill exchange opportunities tailored for you
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6" style={{ borderColor: 'var(--gray-200)' }}>
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('async')}
              className={`${
                activeTab === 'async'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              One-on-One Matches
              {asyncMatches.length > 0 && (
                <span className="ml-2 bg-green-100 text-green-600 py-0.5 px-2 rounded-full text-xs">
                  {asyncMatches.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('cycles')}
              className={`${
                activeTab === 'cycles'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Multi-Party Exchanges
              {cycles.length > 0 && (
                <span className="ml-2 bg-green-100 text-green-600 py-0.5 px-2 rounded-full text-xs">
                  {cycles.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`${
                activeTab === 'completed'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Completed Exchanges
              {completedExchanges.length > 0 && (
                <span className="ml-2 bg-green-100 text-green-600 py-0.5 px-2 rounded-full text-xs">
                  {completedExchanges.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="mt-2 text-gray-600">Loading matches...</p>
          </div>
        )}

        {/* Async Matches Tab */}
        {!loading && activeTab === 'async' && (
          <div className="space-y-4">
            {asyncMatches.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No matches yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try searching for skills you want to learn to get personalized matches
                </p>
              </div>
            ) : (
              asyncMatches.map((match) => (
                <div key={match.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold text-lg overflow-hidden">
                          {match.teacherPicture ? (
                            <img 
                              src={match.teacherPicture.startsWith('http') ? match.teacherPicture : match.teacherPicture} 
                              alt={match.teacherName}
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            match.teacherName.charAt(0)
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{match.teacherName}</h3>
                          <p className="text-sm text-gray-500">{match.teacherEmail}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center gap-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border border-green-500 text-green-700">
                          {match.skillName}
                        </span>
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {match.rating.toFixed(1)} ({match.ratingCount} reviews)
                        </div>
                        <div className="text-sm font-medium text-green-600">
                          Match: {match.matchScore}%
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleRequestExchange(match)}
                      disabled={requestingId === match.id || !match.skillId}
                      title={!match.skillId ? 'Instructor has not published a skill card for this skill yet' : ''}
                      className="ml-4 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'var(--green-800)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--green-700)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--green-800)')}
                    >
                      {requestingId === match.id ? 'Requesting...' : 'Request Exchange'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Cycles Tab */}
        {!loading && activeTab === 'cycles' && (
          <div className="space-y-6">

            {cycles.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl" style={{ border: '1px solid var(--gray-200)' }}>
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--green-50)' }}>
                  <svg className="w-8 h-8" style={{ color: 'var(--green-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--gray-900)' }}>No pending cycle proposals</h3>
                <p className="text-sm" style={{ color: 'var(--gray-500)' }}>
                  3+ person exchange cycles will appear here when the system detects a matching opportunity for your skills.
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--gray-400)' }}>Make sure you have filled in both <strong>Skills I Can Teach</strong> and <strong>Skills I Want to Learn</strong> in your profile.</p>
              </div>
            ) : (
              cycles.map((cycle) => (
                <div key={cycle.id} className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--gray-200)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                  <div className="flex">
                    {/* Left Side */}
                    <div className="w-1/2 p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--green-100)', color: 'var(--green-800)' }}>SYNC • CREDIT FREE</span>
                          </div>
                          <h3 className="text-lg font-bold" style={{ color: 'var(--gray-900)' }}>
                            {cycle.cycle_length}-Person Exchange Cycle
                          </h3>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--gray-500)' }}>
                            Score: {cycle.cycle_score}% • {cycle.session_count} sessions • {new Date(cycle.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          cycle.acceptance_status === 'accepted' ? 'bg-green-100 text-green-800' :
                          cycle.acceptance_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {cycle.acceptance_status === 'pending' ? 'Awaiting Your Response' : cycle.acceptance_status}
                        </span>
                      </div>

                      {/* Acceptance progress */}
                      <div className="mb-4 rounded-lg p-3" style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium" style={{ color: 'var(--gray-600)' }}>Participants Accepted</span>
                          <span className="text-xs font-bold" style={{ color: 'var(--green-700)' }}>{cycle.accepted_count}/{cycle.total_participants}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--gray-200)' }}>
                          <div className="h-full rounded-full" style={{ width: `${(cycle.accepted_count / cycle.total_participants) * 100}%`, background: 'var(--green-500)' }} />
                        </div>
                      </div>

                      {/* Your Role */}
                      <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)' }}>
                        <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--gray-900)' }}>Your Role:</h4>
                        <div className="flex items-center gap-3 text-sm flex-wrap">
                          <span className="px-2 py-1 rounded-md font-medium" style={{ background: 'var(--green-100)', color: 'var(--green-800)' }}>You teach: {cycle.teach_skill}</span>
                          <svg className="w-4 h-4" style={{ color: 'var(--gray-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <span className="px-2 py-1 rounded-md font-medium" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}>You learn: {cycle.learn_skill}</span>
                        </div>
                      </div>

                      {/* Exchange Flow */}
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--gray-900)' }}>Exchange Flow:</h4>
                        <div className="space-y-2">
                          {cycle.cycle_data.participants.map((participant, idx) => {
                            const nextParticipant = cycle.cycle_data.participants[(idx + 1) % cycle.cycle_data.participants.length];
                            const isMe = participant.userId === user?.id;
                            const participantName = isMe ? 'You' : participant.name || `Participant ${idx + 1}`;
                            const nextName = nextParticipant.userId === user?.id ? 'you' : nextParticipant.name || `Participant ${(idx + 1) % cycle.cycle_data.participants.length + 1}`;
                            return (
                              <div key={idx} className="flex items-center gap-3 text-sm p-3 rounded-xl" style={{ background: isMe ? 'var(--green-50)' : 'var(--gray-50)', border: `1px solid ${isMe ? 'var(--green-200)' : 'var(--gray-200)'}` }}>
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: isMe ? 'var(--green-800)' : 'var(--gray-500)' }}>
                                  {idx + 1}
                                </div>
                                <div className="flex-1">
                                  <span className="font-semibold" style={{ color: isMe ? 'var(--green-800)' : 'var(--gray-900)' }}>{participantName}</span>
                                  <span className="mx-1" style={{ color: 'var(--gray-500)' }}>teaches</span>
                                  <span className="font-medium" style={{ color: 'var(--green-700)' }}>{participant.skill}</span>
                                  <span className="mx-1" style={{ color: 'var(--gray-500)' }}>to</span>
                                  <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{nextName}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      {cycle.acceptance_status === 'pending' && (
                        <div className="flex gap-3 pt-4" style={{ borderTop: '1px solid var(--gray-200)' }}>
                          <button
                            onClick={() => handleCycleResponse(cycle.id, true)}
                            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors"
                            style={{ background: 'var(--green-800)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--green-700)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--green-800)')}
                          >
                            Accept Exchange
                          </button>
                          <button
                            onClick={() => handleCycleResponse(cycle.id, false)}
                            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors text-white"
                            style={{ background: '#dc2626' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#dc2626')}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {cycle.acceptance_status === 'accepted' && (
                        <div className="pt-4" style={{ borderTop: '1px solid var(--gray-200)' }}>
                          <p className="text-sm text-center mb-3" style={{ color: 'var(--gray-500)' }}>Waiting for {cycle.total_participants - cycle.accepted_count} more participant(s) to accept.</p>
                        </div>
                      )}
                    </div>

                    {/* Right Side - Animated Network Visualization */}
                    <div className="w-1/2 flex items-center justify-center p-8" style={{ borderLeft: '1px solid var(--gray-200)' }}>
                      <CycleVisualization participants={cycle.cycle_data.participants} userId={user?.id || ''} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Completed Exchanges Tab */}
        {!loading && activeTab === 'completed' && (
          <div className="space-y-4">
            {completedExchanges.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No completed exchanges yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your completed skill exchanges will appear here
                </p>
              </div>
            ) : (
              <>
                {/* Async Completed Exchanges */}
                {completedExchanges.filter(e => e.type === 'async').length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">One-on-One Exchanges</h3>
                    <div className="space-y-3">
                      {completedExchanges
                        .filter(e => e.type === 'async')
                        .map(exchange => (
                          <div key={exchange.id} className="bg-white rounded-lg border border-gray-200 p-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {exchange.role === 'taught' ? (
                                      <>Taught <span className="text-green-600">{exchange.skillName}</span> to {exchange.partnerName}</>
                                    ) : (
                                      <>Learned <span className="text-green-600">{exchange.skillName}</span> from {exchange.partnerName}</>
                                    )}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Completed on {new Date(exchange.completedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Sync Completed Exchanges */}
                {completedExchanges.filter(e => e.type === 'sync').length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Multi-Party Exchange Cycles</h3>
                    <div className="space-y-3">
                      {completedExchanges
                        .filter(e => e.type === 'sync')
                        .map(exchange => {
                          const cycle = exchange.cycleData!;
                          return (
                            <div key={exchange.id} className="bg-white rounded-lg border border-gray-200 p-5">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {cycle.cycle_length}-Person Exchange Cycle
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      Completed on {new Date(exchange.completedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-13 pl-13">
                                <p className="text-sm text-gray-600">
                                  You taught <span className="font-medium text-green-700">{cycle.teach_skill}</span> and learned <span className="font-medium text-green-700">{cycle.learn_skill}</span>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
    <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

const NODE_COLORS = ['#FF6B6B', '#4169E1', '#FFA500', '#9B59B6', '#2ECC71'];

function CycleVisualization({ participants, userId }: { participants: CycleParticipant[]; userId: string }) {
  const count = participants.length;
  const size = 192;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 68;

  const points = participants.map((_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* SVG lines layer */}
      <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#1e7a46" opacity="0.5" />
          </marker>
        </defs>
        {/* Center pulse */}
        <circle cx={cx} cy={cy} r="5" fill="#1e7a46" opacity="0.3">
          <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
        {/* Connection lines with animated dash */}
        {points.map((pt, i) => {
          const next = points[(i + 1) % count];
          return (
            <line
              key={i}
              x1={pt.x} y1={pt.y}
              x2={next.x} y2={next.y}
              stroke="#1e7a46"
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.45"
              markerEnd="url(#arrow)"
            >
              <animate attributeName="stroke-dashoffset" values="0;-20" dur={`${1.2 + i * 0.2}s`} repeatCount="indefinite" />
            </line>
          );
        })}
      </svg>

      {/* Animated avatar nodes */}
      {points.map((pt, i) => {
        const p = participants[i];
        const isMe = p.userId === userId;
        const color = isMe ? '#0D3B22' : NODE_COLORS[i % NODE_COLORS.length];
        const delay = `${i * 0.44}s`;
        return (
          <div
            key={i}
            className="absolute flex items-center justify-center rounded-full shadow-lg"
            style={{
              width: 44,
              height: 44,
              left: pt.x - 22,
              top: pt.y - 22,
              background: color,
              animation: `bounce 1.8s ease-in-out ${delay} infinite`,
              zIndex: 10,
            }}
            title={isMe ? 'You' : (p.name || `Participant ${i + 1}`)}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" fill="white" />
              <path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </svg>
            {isMe && (
              <span className="absolute -bottom-5 text-xs font-bold" style={{ color: '#0D3B22', whiteSpace: 'nowrap' }}>You</span>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
