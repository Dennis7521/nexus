import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Activity, ChevronDown, ChevronUp, User, X, Ban } from 'lucide-react';

interface Analytics {
  totalUsers: number;
  activeExchanges: number;
  totalSkills: number;
  completedSessions: number;
}

interface Exchange {
  id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  terminated_at?: string;
  skill_title: string;
  category_id: number;
  credits_required: number;
  requester_name: string;
  instructor_name: string;
  requester_picture: string | null;
  instructor_picture: string | null;
  exchange_type?: 'async' | 'sync';
}

interface Skill {
  id: string;
  title: string;
  skill_type: string;
  category_id: number;
  credits_required: number;
  created_at: string;
  user_name: string;
  user_picture: string | null;
  request_count: number;
}

interface Session {
  exchange_id: string;
  skill_title: string;
  session_type?: 'async' | 'sync';
  total_credits: number;
  total_sessions: number;
  completed_sessions: number;
  credits_in_escrow: number;
  credits_released: number;
  requester_name: string;
  instructor_name: string;
  requester_picture: string | null;
  instructor_picture: string | null;
  terminated_at?: string;
}

type SelectedCard = 'exchanges' | 'skills' | 'sessions' | null;

export const AdminReports: React.FC = () => {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0,
    activeExchanges: 0,
    totalSkills: 0,
    completedSessions: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<SelectedCard>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [completedExchanges, setCompletedExchanges] = useState<Exchange[]>([]);
  const [terminatedExchanges, setTerminatedExchanges] = useState<Exchange[]>([]);
  const [openExchangeSections, setOpenExchangeSections] = useState<{ active: boolean; completed: boolean; terminated: boolean }>({ active: true, completed: false, terminated: false });
  const toggleExchangeSection = (key: 'active' | 'completed' | 'terminated') => setOpenExchangeSections(prev => ({ ...prev, [key]: !prev[key] }));
  const [skills, setSkills] = useState<Skill[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [completedSessions, setCompletedSessions] = useState<Session[]>([]);
  const [terminatedSessions, setTerminatedSessions] = useState<Session[]>([]);
  const [openSections, setOpenSections] = useState<{ active: boolean; completed: boolean; terminated: boolean }>({ active: true, completed: false, terminated: false });
  const toggleSection = (key: 'active' | 'completed' | 'terminated') => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  const [detailLoading, setDetailLoading] = useState(false);
  const [escrowModal, setEscrowModal] = useState<{
    session: Session;
    recipient: 'learner' | 'instructor';
  } | null>(null);
  const [escrowReason, setEscrowReason] = useState('');
  const [escrowSubmitting, setEscrowSubmitting] = useState(false);
  const [escrowFeedback, setEscrowFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [terminateModal, setTerminateModal] = useState<Session | null>(null);
  const [terminateReason, setTerminateReason] = useState('');
  const [terminateSubmitting, setTerminateSubmitting] = useState(false);
  const [terminateFeedback, setTerminateFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const openTerminateModal = (session: Session) => {
    setTerminateReason('');
    setTerminateFeedback(null);
    setTerminateModal(session);
  };

  const closeTerminateModal = () => {
    if (terminateSubmitting) return;
    setTerminateModal(null);
    setTerminateReason('');
  };

  const submitTerminate = async () => {
    if (!terminateModal) return;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    setTerminateSubmitting(true);
    setTerminateFeedback(null);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `${apiBase}/admin/sessions/${terminateModal.exchange_id}/terminate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason: terminateReason })
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to terminate exchange');
      }

      // Remove the terminated exchange from the active sessions list
      setSessions(prev => prev.filter(s => s.exchange_id !== terminateModal.exchange_id));

      setTerminateFeedback({ type: 'success', message: 'Exchange terminated. Both parties have been notified.' });
      setTimeout(() => {
        setTerminateModal(null);
        setTerminateFeedback(null);
        setTerminateReason('');
      }, 1200);
    } catch (err: any) {
      setTerminateFeedback({ type: 'error', message: err.message || 'Termination failed' });
    } finally {
      setTerminateSubmitting(false);
    }
  };

  const openEscrowModal = (session: Session, recipient: 'learner' | 'instructor') => {
    setEscrowReason('');
    setEscrowFeedback(null);
    setEscrowModal({ session, recipient });
  };

  const closeEscrowModal = () => {
    if (escrowSubmitting) return;
    setEscrowModal(null);
    setEscrowReason('');
  };

  const submitEscrowTransfer = async () => {
    if (!escrowModal) return;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    setEscrowSubmitting(true);
    setEscrowFeedback(null);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `${apiBase}/admin/sessions/${escrowModal.session.exchange_id}/resolve-escrow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            recipient: escrowModal.recipient,
            reason: escrowReason
          })
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Failed to transfer escrow');
      }

      // Update local state: zero out escrow, mark released increases by transferred amount if instructor
      setSessions(prev => prev.map(s => {
        if (s.exchange_id !== escrowModal.session.exchange_id) return s;
        const transferred = Number(data.credits) || Number(s.credits_in_escrow);
        return {
          ...s,
          credits_in_escrow: 0,
          credits_released: escrowModal.recipient === 'instructor'
            ? Number(s.credits_released) + transferred
            : Number(s.credits_released)
        };
      }));

      setEscrowFeedback({
        type: 'success',
        message: `${Number(data.credits).toFixed(2)} credits transferred to ${escrowModal.recipient}.`
      });
      setTimeout(() => {
        setEscrowModal(null);
        setEscrowFeedback(null);
        setEscrowReason('');
      }, 1200);
    } catch (err: any) {
      setEscrowFeedback({ type: 'error', message: err.message || 'Transfer failed' });
    } finally {
      setEscrowSubmitting(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const fetchAnalytics = async () => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${apiBase}/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExchanges = async () => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    setDetailLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${apiBase}/admin/analytics/exchanges`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setExchanges(data);
          setCompletedExchanges([]);
          setTerminatedExchanges([]);
        } else {
          setExchanges(data.active ?? []);
          setCompletedExchanges(data.completed ?? []);
          setTerminatedExchanges(data.terminated ?? []);
        }
      }
    } catch (error) {
      console.error('Error fetching exchanges:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchSkills = async () => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    setDetailLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${apiBase}/admin/analytics/skills`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSkills(data);
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchSessions = async () => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    setDetailLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${apiBase}/admin/analytics/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setSessions(data);
          setCompletedSessions([]);
          setTerminatedSessions([]);
        } else {
          setSessions(data.active ?? []);
          setCompletedSessions(data.completed ?? []);
          setTerminatedSessions(data.terminated ?? []);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCardClick = (card: SelectedCard) => {
    if (selectedCard === card) {
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
      // Fetch detailed data when card is clicked
      if (card === 'exchanges' && exchanges.length === 0) {
        fetchExchanges();
      } else if (card === 'skills' && skills.length === 0) {
        fetchSkills();
      } else if (card === 'sessions' && sessions.length === 0) {
        fetchSessions();
      }
    }
  };

  return (
    <div style={{ background: 'var(--green-50)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--green-900)' }}>
            Reports & Analytics
          </h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Platform statistics and user activity reports
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div 
            className="p-6 rounded-lg"
            style={{ 
              background: 'var(--white)',
              border: selectedCard === 'exchanges' ? '2px solid var(--green-500)' : '1px solid var(--gray-200)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'pointer'
            }}
            onClick={() => handleCardClick('exchanges')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 59, 34, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8" style={{ color: 'var(--green-500)' }} />
              {selectedCard === 'exchanges' ? (
                <ChevronUp className="w-5 h-5" style={{ color: 'var(--green-500)' }} />
              ) : (
                <ChevronDown className="w-5 h-5" style={{ color: 'var(--gray-400)' }} />
              )}
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--gray-600)' }}>
              Exchanges
            </p>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--green-800)' }}>
              {loading ? '...' : analytics.activeExchanges}
            </p>
          </div>

          <div 
            className="p-6 rounded-lg"
            style={{ 
              background: 'var(--white)',
              border: selectedCard === 'skills' ? '2px solid var(--green-500)' : '1px solid var(--gray-200)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'pointer'
            }}
            onClick={() => handleCardClick('skills')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 59, 34, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-8 h-8" style={{ color: 'var(--green-500)' }} />
              {selectedCard === 'skills' ? (
                <ChevronUp className="w-5 h-5" style={{ color: 'var(--green-500)' }} />
              ) : (
                <ChevronDown className="w-5 h-5" style={{ color: 'var(--gray-400)' }} />
              )}
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--gray-600)' }}>
              Total Skills
            </p>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--green-800)' }}>
              {loading ? '...' : analytics.totalSkills}
            </p>
          </div>

          <div 
            className="p-6 rounded-lg"
            style={{ 
              background: 'var(--white)',
              border: selectedCard === 'sessions' ? '2px solid var(--green-500)' : '1px solid var(--gray-200)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'pointer'
            }}
            onClick={() => handleCardClick('sessions')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 59, 34, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8" style={{ color: 'var(--green-500)' }} />
              {selectedCard === 'sessions' ? (
                <ChevronUp className="w-5 h-5" style={{ color: 'var(--green-500)' }} />
              ) : (
                <ChevronDown className="w-5 h-5" style={{ color: 'var(--gray-400)' }} />
              )}
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--gray-600)' }}>
              Sessions
            </p>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--green-800)' }}>
              {loading ? '...' : analytics.completedSessions}
            </p>
          </div>
        </div>

        {/* Detailed Information Sections */}
        {selectedCard === 'exchanges' && (
          <div
            className="mb-8 rounded-lg overflow-hidden"
            style={{ background: 'var(--white)', border: '1px solid var(--green-200)', animation: 'slideDown 0.3s ease-out' }}
          >
            {detailLoading ? (
              <p className="text-center py-8" style={{ color: 'var(--gray-600)' }}>Loading...</p>
            ) : (
              <>
                {/* ── Active Exchanges ── */}
                <div>
                  <button type="button" onClick={() => toggleExchangeSection('active')} className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors" style={{ background: openExchangeSections.active ? 'var(--green-50)' : 'var(--white)', borderBottom: '1px solid var(--green-100)' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold" style={{ color: 'var(--green-900)' }}>Active Exchanges</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--green-100)', color: 'var(--green-800)' }}>{exchanges.length}</span>
                    </div>
                    {openExchangeSections.active ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--green-700)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--green-700)' }} />}
                  </button>
                  {openExchangeSections.active && (
                    <div className="p-6">
                      {exchanges.length === 0 ? (
                        <p className="text-center py-6 text-sm" style={{ color: 'var(--gray-500)' }}>No active exchanges</p>
                      ) : (
                        <div className="space-y-3">
                          {exchanges.map((exchange) => (
                            <div key={exchange.id} className="p-4 rounded-lg flex items-center justify-between" style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)' }}>
                              <div className="flex items-center gap-4 flex-1">
                                <div className="flex items-center gap-2">
                                  {exchange.requester_picture ? (
                                    <img src={exchange.requester_picture} alt={exchange.requester_name} className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--green-200)' }}>
                                      <User className="w-5 h-5" style={{ color: 'var(--green-700)' }} />
                                    </div>
                                  )}
                                  <span className="font-medium" style={{ color: 'var(--gray-900)' }}>{exchange.requester_name}</span>
                                </div>
                                <span style={{ color: 'var(--gray-500)' }}>&#8596;</span>
                                <div className="flex items-center gap-2">
                                  {exchange.instructor_picture ? (
                                    <img src={exchange.instructor_picture} alt={exchange.instructor_name} className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--green-200)' }}>
                                      <User className="w-5 h-5" style={{ color: 'var(--green-700)' }} />
                                    </div>
                                  )}
                                  <span className="font-medium" style={{ color: 'var(--gray-900)' }}>{exchange.instructor_name}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2 justify-end mb-1">
                                  <p className="font-semibold" style={{ color: 'var(--green-800)' }}>{exchange.skill_title}</p>
                                  {exchange.exchange_type === 'sync' && <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--green-200)', color: 'var(--green-800)' }}>SYNC</span>}
                                  {exchange.exchange_type === 'async' && <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#dbeafe', color: '#1e40af' }}>ASYNC</span>}
                                </div>
                                <p className="text-sm" style={{ color: 'var(--gray-600)' }}>{exchange.exchange_type === 'sync' ? 'Credit-free exchange' : `${exchange.credits_required || 0} credits`}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Completed Exchanges ── */}
                <div style={{ borderTop: '1px solid var(--green-100)' }}>
                  <button type="button" onClick={() => toggleExchangeSection('completed')} className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors" style={{ background: openExchangeSections.completed ? '#f0fdf4' : 'var(--white)', borderBottom: openExchangeSections.completed ? '1px solid #bbf7d0' : 'none' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold" style={{ color: '#166534' }}>Completed Exchanges</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#bbf7d0', color: '#166534' }}>{completedExchanges.length}</span>
                    </div>
                    {openExchangeSections.completed ? <ChevronUp className="w-4 h-4" style={{ color: '#166534' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#166534' }} />}
                  </button>
                  {openExchangeSections.completed && (
                    <div className="p-6">
                      {completedExchanges.length === 0 ? (
                        <p className="text-center py-6 text-sm" style={{ color: 'var(--gray-500)' }}>No completed exchanges</p>
                      ) : (
                        <div className="space-y-3">
                          {completedExchanges.map((exchange) => (
                            <div key={exchange.id} className="p-4 rounded-lg flex items-center justify-between" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                              <div className="flex items-center gap-4 flex-1">
                                <div className="flex items-center gap-2">
                                  {exchange.requester_picture ? (
                                    <img src={exchange.requester_picture} alt={exchange.requester_name} className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#bbf7d0' }}>
                                      <User className="w-5 h-5" style={{ color: '#166534' }} />
                                    </div>
                                  )}
                                  <span className="font-medium" style={{ color: 'var(--gray-900)' }}>{exchange.requester_name}</span>
                                </div>
                                <span style={{ color: 'var(--gray-400)' }}>&#8596;</span>
                                <div className="flex items-center gap-2">
                                  {exchange.instructor_picture ? (
                                    <img src={exchange.instructor_picture} alt={exchange.instructor_name} className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#bbf7d0' }}>
                                      <User className="w-5 h-5" style={{ color: '#166534' }} />
                                    </div>
                                  )}
                                  <span className="font-medium" style={{ color: 'var(--gray-900)' }}>{exchange.instructor_name}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2 justify-end mb-1">
                                  <p className="font-semibold" style={{ color: 'var(--gray-700)' }}>{exchange.skill_title}</p>
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: '#bbf7d0', color: '#166534' }}>COMPLETED</span>
                                </div>
                                <p className="text-sm" style={{ color: 'var(--gray-500)' }}>
                                  {exchange.completed_at ? new Date(exchange.completed_at).toLocaleDateString() : ''}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Terminated Exchanges ── */}
                <div style={{ borderTop: '1px solid var(--green-100)' }}>
                  <button type="button" onClick={() => toggleExchangeSection('terminated')} className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors" style={{ background: openExchangeSections.terminated ? '#fef2f2' : 'var(--white)', borderBottom: openExchangeSections.terminated ? '1px solid #fca5a5' : 'none' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold" style={{ color: '#991b1b' }}>Terminated Exchanges</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#fecaca', color: '#7f1d1d' }}>{terminatedExchanges.length}</span>
                    </div>
                    {openExchangeSections.terminated ? <ChevronUp className="w-4 h-4" style={{ color: '#991b1b' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#991b1b' }} />}
                  </button>
                  {openExchangeSections.terminated && (
                    <div className="p-6">
                      {terminatedExchanges.length === 0 ? (
                        <p className="text-center py-6 text-sm" style={{ color: 'var(--gray-500)' }}>No terminated exchanges</p>
                      ) : (
                        <div className="space-y-3">
                          {terminatedExchanges.map((exchange) => (
                            <div key={exchange.id} className="p-4 rounded-lg flex items-center justify-between" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                              <div className="flex items-center gap-4 flex-1">
                                <div className="flex items-center gap-2">
                                  {exchange.requester_picture ? (
                                    <img src={exchange.requester_picture} alt={exchange.requester_name} className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#fee2e2' }}>
                                      <User className="w-5 h-5" style={{ color: '#991b1b' }} />
                                    </div>
                                  )}
                                  <span className="font-medium" style={{ color: 'var(--gray-900)' }}>{exchange.requester_name}</span>
                                </div>
                                <span style={{ color: 'var(--gray-400)' }}>&#8596;</span>
                                <div className="flex items-center gap-2">
                                  {exchange.instructor_picture ? (
                                    <img src={exchange.instructor_picture} alt={exchange.instructor_name} className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#fee2e2' }}>
                                      <User className="w-5 h-5" style={{ color: '#991b1b' }} />
                                    </div>
                                  )}
                                  <span className="font-medium" style={{ color: 'var(--gray-900)' }}>{exchange.instructor_name}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2 justify-end mb-1">
                                  <p className="font-semibold" style={{ color: 'var(--gray-700)' }}>{exchange.skill_title}</p>
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: '#fca5a5', color: '#7f1d1d' }}>TERMINATED</span>
                                </div>
                                <p className="text-sm" style={{ color: 'var(--gray-500)' }}>
                                  {exchange.terminated_at ? new Date(exchange.terminated_at).toLocaleDateString() : ''}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {selectedCard === 'skills' && (
          <div 
            className="mb-8 p-6 rounded-lg"
            style={{ 
              background: 'var(--white)',
              border: '1px solid var(--green-200)',
              animation: 'slideDown 0.3s ease-out'
            }}
          >
            {detailLoading ? (
              <p className="text-center py-8" style={{ color: 'var(--gray-600)' }}>Loading...</p>
            ) : skills.length === 0 ? (
              <p className="text-center py-8" style={{ color: 'var(--gray-600)' }}>No skills found</p>
            ) : (
              <>
                {/* Most Requested Skills Section */}
                {skills.filter(s => Number(s.request_count) > 0).length > 0 && (
                  <div className="mb-6 p-5 rounded-lg" style={{ background: 'var(--green-100)', border: '2px solid var(--green-500)' }}>
                    <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--green-900)' }}>Most Requested Skills</h3>
                    <div className="space-y-3">
                      {skills
                        .filter(skill => Number(skill.request_count) > 0)
                        .slice(0, 10)
                        .map((skill) => (
                          <div 
                            key={skill.id}
                            className="p-4 rounded-lg flex items-center justify-between"
                            style={{ background: 'var(--white)' }}
                          >
                            <div className="flex items-center gap-3">
                              {skill.user_picture ? (
                                <img 
                                  src={skill.user_picture} 
                                  alt={skill.user_name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--green-200)' }}>
                                  <User className="w-5 h-5" style={{ color: 'var(--green-700)' }} />
                                </div>
                              )}
                              <div>
                                <h4 className="font-semibold" style={{ color: 'var(--green-900)' }}>{skill.title}</h4>
                                <p className="text-sm" style={{ color: 'var(--gray-600)' }}>by {skill.user_name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold" style={{ color: 'var(--green-800)' }}>{Number(skill.request_count)}</p>
                              <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                                {Number(skill.request_count) === 1 ? 'request' : 'requests'}
                              </p>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* All Skills Section */}
                <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--green-900)' }}>
                  All Skills ({skills.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {skills.map((skill) => (
                    <div 
                      key={skill.id}
                      className="p-4 rounded-lg"
                      style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {skill.user_picture ? (
                            <img 
                              src={skill.user_picture} 
                              alt={skill.user_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--green-200)' }}>
                              <User className="w-4 h-4" style={{ color: 'var(--green-700)' }} />
                            </div>
                          )}
                          <span className="text-sm font-medium" style={{ color: 'var(--gray-700)' }}>{skill.user_name}</span>
                        </div>
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ 
                            background: skill.skill_type === 'offer' ? 'var(--green-800)' : 'var(--amber-100)',
                            color: skill.skill_type === 'offer' ? 'var(--white)' : 'var(--amber-800)'
                          }}
                        >
                          {skill.skill_type.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-semibold mb-1" style={{ color: 'var(--green-900)' }}>{skill.title}</h4>
                      <div className="flex items-center justify-between">
                        <p className="text-sm" style={{ color: 'var(--gray-600)' }}>{skill.credits_required} credits</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--green-700)' }}>
                          {Number(skill.request_count)} {Number(skill.request_count) === 1 ? 'request' : 'requests'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {selectedCard === 'sessions' && (
          <div
            className="mb-8 rounded-lg overflow-hidden"
            style={{ background: 'var(--white)', border: '1px solid var(--green-200)', animation: 'slideDown 0.3s ease-out' }}
          >
            {detailLoading ? (
              <p className="text-center py-8" style={{ color: 'var(--gray-600)' }}>Loading...</p>
            ) : (
              <>
                {/* ── Active Sessions ── */}
                <div>
                  <button type="button" onClick={() => toggleSection('active')} className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors" style={{ background: openSections.active ? 'var(--green-50)' : 'var(--white)', borderBottom: '1px solid var(--green-100)' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold" style={{ color: 'var(--green-900)' }}>Active Sessions</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--green-100)', color: 'var(--green-800)' }}>{sessions.length}</span>
                    </div>
                    {openSections.active ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--green-700)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--green-700)' }} />}
                  </button>
                  {openSections.active && (
                    <div className="p-6">
                      {sessions.length === 0 ? (
                        <p className="text-center py-6 text-sm" style={{ color: 'var(--gray-500)' }}>No active sessions</p>
                      ) : (
                        <div className="space-y-4">
                          {sessions.map((session) => (
                            <div key={session.exchange_id} className="p-5 rounded-lg" style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)' }}>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    {session.requester_picture ? (
                                      <img src={session.requester_picture} alt={session.requester_name} className="w-10 h-10 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--green-200)' }}>
                                        <User className="w-5 h-5" style={{ color: 'var(--green-700)' }} />
                                      </div>
                                    )}
                                    <span className="font-medium" style={{ color: 'var(--gray-900)' }}>{session.requester_name}</span>
                                  </div>
                                  <span style={{ color: 'var(--gray-400)' }}>&#8596;</span>
                                  <div className="flex items-center gap-2">
                                    {session.instructor_picture ? (
                                      <img src={session.instructor_picture} alt={session.instructor_name} className="w-10 h-10 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--green-200)' }}>
                                        <User className="w-5 h-5" style={{ color: 'var(--green-700)' }} />
                                      </div>
                                    )}
                                    <span className="font-medium" style={{ color: 'var(--gray-900)' }}>{session.instructor_name}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold" style={{ color: 'var(--green-800)' }}>{session.skill_title}</p>
                                  {session.session_type === 'sync' ? (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--green-200)', color: 'var(--green-800)' }}>SYNC</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#dbeafe', color: '#1e40af' }}>ASYNC</span>
                                  )}
                                </div>
                              </div>
                              <div className={`grid gap-4 mb-3 ${session.session_type === 'sync' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                <div>
                                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-600)' }}>Sessions Progress</p>
                                  <p className="text-lg font-bold" style={{ color: 'var(--green-800)' }}>{session.completed_sessions} / {session.total_sessions > 0 ? session.total_sessions : '?'}</p>
                                  <div className="w-full h-2 rounded-full mt-1" style={{ background: 'var(--gray-200)' }}>
                                    <div className="h-2 rounded-full transition-all" style={{ background: 'var(--green-500)', width: session.total_sessions > 0 ? `${Math.min((Number(session.completed_sessions) / Number(session.total_sessions)) * 100, 100)}%` : '0%' }} />
                                  </div>
                                </div>
                                {session.session_type !== 'sync' && (
                                  <div>
                                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-600)' }}>Credit Transfer Progress</p>
                                    <p className="text-lg font-bold" style={{ color: 'var(--green-800)' }}>{Number(session.credits_released).toFixed(2)} / {session.total_credits}</p>
                                    <div className="w-full h-2 rounded-full mt-1" style={{ background: 'var(--gray-200)' }}>
                                      <div className="h-2 rounded-full transition-all" style={{ background: 'var(--green-500)', width: `${(Number(session.credits_released) / session.total_credits) * 100}%` }} />
                                    </div>
                                  </div>
                                )}
                              </div>
                              {session.session_type === 'sync' ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}>Credit-free exchange</span>
                                </div>
                              ) : (
                                <div className="flex gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span style={{ color: 'var(--gray-600)' }}>Total Credits:</span>
                                    <span className="font-semibold" style={{ color: 'var(--green-800)' }}>{session.total_credits}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span style={{ color: 'var(--gray-600)' }}>In Escrow:</span>
                                    <span className="font-semibold" style={{ color: '#b45309' }}>{Number(session.credits_in_escrow).toFixed(2)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span style={{ color: 'var(--gray-600)' }}>Released:</span>
                                    <span className="font-semibold" style={{ color: 'var(--green-600)' }}>{Number(session.credits_released).toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                              {session.session_type !== 'sync' && Number(session.credits_in_escrow) > 0 && (
                                <div className="mt-4 pt-4 flex flex-wrap items-center gap-2" style={{ borderTop: '1px dashed var(--green-200)' }}>
                                  <button type="button" onClick={() => openEscrowModal(session, 'learner')} className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors" style={{ background: 'var(--white)', color: 'var(--green-800)', border: '1px solid var(--green-500)' }}>Refund to Learner</button>
                                  <button type="button" onClick={() => openEscrowModal(session, 'instructor')} className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors" style={{ background: 'var(--green-800)', color: 'var(--white)', border: '1px solid var(--green-800)' }}>Release to Instructor</button>
                                </div>
                              )}
                              {session.session_type !== 'sync' && (
                                <div className="mt-3 pt-3 flex items-center justify-end" style={{ borderTop: '1px dashed var(--gray-200)' }}>
                                  <button type="button" onClick={() => openTerminateModal(session)} className="px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }} title="Force-end the exchange.">
                                    <Ban className="w-3.5 h-3.5" />
                                    Terminate Exchange
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Completed Sessions ── */}
                <div style={{ borderTop: '1px solid var(--green-100)' }}>
                  <button type="button" onClick={() => toggleSection('completed')} className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors" style={{ background: openSections.completed ? '#f0fdf4' : 'var(--white)', borderBottom: openSections.completed ? '1px solid #bbf7d0' : 'none' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold" style={{ color: '#166534' }}>Completed Sessions</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#bbf7d0', color: '#166534' }}>{completedSessions.length}</span>
                    </div>
                    {openSections.completed ? <ChevronUp className="w-4 h-4" style={{ color: '#166534' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#166534' }} />}
                  </button>
                  {openSections.completed && (
                    <div className="p-6">
                      {completedSessions.length === 0 ? (
                        <p className="text-center py-6 text-sm" style={{ color: 'var(--gray-500)' }}>No completed sessions</p>
                      ) : (
                        <div className="space-y-4">
                          {completedSessions.map((session) => (
                            <div key={session.exchange_id} className="p-5 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    {session.requester_picture ? (
                                      <img src={session.requester_picture} alt={session.requester_name} className="w-9 h-9 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#bbf7d0' }}>
                                        <User className="w-4 h-4" style={{ color: '#166534' }} />
                                      </div>
                                    )}
                                    <span className="font-medium text-sm" style={{ color: 'var(--gray-900)' }}>{session.requester_name}</span>
                                  </div>
                                  <span style={{ color: 'var(--gray-400)' }}>&#8596;</span>
                                  <div className="flex items-center gap-2">
                                    {session.instructor_picture ? (
                                      <img src={session.instructor_picture} alt={session.instructor_name} className="w-9 h-9 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#bbf7d0' }}>
                                        <User className="w-4 h-4" style={{ color: '#166534' }} />
                                      </div>
                                    )}
                                    <span className="font-medium text-sm" style={{ color: 'var(--gray-900)' }}>{session.instructor_name}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm" style={{ color: 'var(--gray-700)' }}>{session.skill_title}</p>
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: '#bbf7d0', color: '#166534' }}>COMPLETED</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--gray-600)' }}>
                                <span>Sessions: <strong>{session.completed_sessions}/{session.total_sessions > 0 ? session.total_sessions : '?'}</strong></span>
                                {session.session_type !== 'sync' && (
                                  <span>Credits Released: <strong style={{ color: '#166534' }}>{Number(session.credits_released).toFixed(2)} / {session.total_credits}</strong></span>
                                )}
                                {(session as any).completed_at && (
                                  <span>Completed: <strong>{new Date((session as any).completed_at).toLocaleDateString()}</strong></span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Terminated Sessions ── */}
                <div style={{ borderTop: '1px solid var(--green-100)' }}>
                  <button type="button" onClick={() => toggleSection('terminated')} className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors" style={{ background: openSections.terminated ? '#fef2f2' : 'var(--white)', borderBottom: openSections.terminated ? '1px solid #fca5a5' : 'none' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold" style={{ color: '#991b1b' }}>Terminated Sessions</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#fecaca', color: '#7f1d1d' }}>{terminatedSessions.length}</span>
                    </div>
                    {openSections.terminated ? <ChevronUp className="w-4 h-4" style={{ color: '#991b1b' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#991b1b' }} />}
                  </button>
                  {openSections.terminated && (
                    <div className="p-6">
                      {terminatedSessions.length === 0 ? (
                        <p className="text-center py-6 text-sm" style={{ color: 'var(--gray-500)' }}>No terminated sessions</p>
                      ) : (
                        <div className="space-y-4">
                          {terminatedSessions.map((session) => (
                            <div key={session.exchange_id} className="p-5 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    {session.requester_picture ? (
                                      <img src={session.requester_picture} alt={session.requester_name} className="w-9 h-9 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#fee2e2' }}>
                                        <User className="w-4 h-4" style={{ color: '#991b1b' }} />
                                      </div>
                                    )}
                                    <span className="font-medium text-sm" style={{ color: 'var(--gray-900)' }}>{session.requester_name}</span>
                                  </div>
                                  <span style={{ color: 'var(--gray-400)' }}>&#8596;</span>
                                  <div className="flex items-center gap-2">
                                    {session.instructor_picture ? (
                                      <img src={session.instructor_picture} alt={session.instructor_name} className="w-9 h-9 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#fee2e2' }}>
                                        <User className="w-4 h-4" style={{ color: '#991b1b' }} />
                                      </div>
                                    )}
                                    <span className="font-medium text-sm" style={{ color: 'var(--gray-900)' }}>{session.instructor_name}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm" style={{ color: 'var(--gray-700)' }}>{session.skill_title}</p>
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: '#fca5a5', color: '#7f1d1d' }}>TERMINATED</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--gray-600)' }}>
                                <span>Sessions: <strong>{session.completed_sessions}/{session.total_sessions > 0 ? session.total_sessions : '?'}</strong></span>
                                {session.session_type !== 'sync' && (
                                  <>
                                    <span>Credits Released: <strong style={{ color: 'var(--green-700)' }}>{Number(session.credits_released).toFixed(2)}</strong></span>
                                    {Number(session.credits_in_escrow) > 0 && (
                                      <span>Escrow Remaining: <strong style={{ color: '#b45309' }}>{Number(session.credits_in_escrow).toFixed(2)}</strong></span>
                                    )}
                                  </>
                                )}
                                {session.terminated_at && (
                                  <span>Terminated: <strong>{new Date(session.terminated_at).toLocaleDateString()}</strong></span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Escrow transfer confirmation modal */}
      {escrowModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(13, 59, 34, 0.45)' }}
          onClick={closeEscrowModal}
        >
          <div
            className="w-full max-w-md rounded-lg p-6"
            style={{ background: 'var(--white)', border: '1px solid var(--green-200)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--green-900)' }}>
                  {escrowModal.recipient === 'learner' ? 'Refund escrow to learner' : 'Release escrow to instructor'}
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--gray-600)' }}>
                  {escrowModal.session.skill_title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEscrowModal}
                disabled={escrowSubmitting}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" style={{ color: 'var(--gray-500)' }} />
              </button>
            </div>

            <div className="p-3 rounded-md mb-4" style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)' }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--gray-600)' }}>Amount to transfer</span>
                <span className="font-bold" style={{ color: 'var(--green-800)' }}>
                  {Number(escrowModal.session.credits_in_escrow).toFixed(2)} credits
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span style={{ color: 'var(--gray-600)' }}>Recipient</span>
                <span className="font-semibold" style={{ color: 'var(--green-800)' }}>
                  {escrowModal.recipient === 'learner'
                    ? escrowModal.session.requester_name
                    : escrowModal.session.instructor_name}
                </span>
              </div>
            </div>

            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--gray-700)' }}>
              Reason / report reference
            </label>
            <textarea
              value={escrowReason}
              onChange={(e) => setEscrowReason(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="Explain why you are transferring the remaining escrow (e.g. report #123 – instructor no-show)…"
              className="w-full p-2 rounded-md text-sm"
              style={{ border: '1px solid var(--gray-300)', resize: 'vertical' }}
              disabled={escrowSubmitting}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--gray-500)' }}>
              This note is recorded in the credit ledger as <code>{escrowModal.recipient === 'learner' ? 'admin_refund' : 'admin_release'}</code>.
            </p>

            {escrowFeedback && (
              <div
                className="mt-3 p-2 rounded-md text-sm"
                style={{
                  background: escrowFeedback.type === 'success' ? 'var(--green-100)' : '#fee2e2',
                  color: escrowFeedback.type === 'success' ? 'var(--green-800)' : '#991b1b'
                }}
              >
                {escrowFeedback.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={closeEscrowModal}
                disabled={escrowSubmitting}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{ background: 'var(--white)', color: 'var(--gray-700)', border: '1px solid var(--gray-300)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEscrowTransfer}
                disabled={escrowSubmitting}
                className="px-4 py-2 rounded-md text-sm font-semibold"
                style={{
                  background: 'var(--green-800)',
                  color: 'var(--white)',
                  border: '1px solid var(--green-800)',
                  opacity: escrowSubmitting ? 0.7 : 1
                }}
              >
                {escrowSubmitting ? 'Transferring…' : 'Confirm transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate exchange confirmation modal */}
      {terminateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(127, 29, 29, 0.45)' }}
          onClick={closeTerminateModal}
        >
          <div
            className="w-full max-w-md rounded-lg p-6"
            style={{ background: 'var(--white)', border: '1px solid #fca5a5' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#991b1b' }}>
                  Terminate exchange
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--gray-600)' }}>
                  {terminateModal.skill_title} — {terminateModal.requester_name} ↔ {terminateModal.instructor_name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeTerminateModal}
                disabled={terminateSubmitting}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" style={{ color: 'var(--gray-500)' }} />
              </button>
            </div>

            <div className="p-3 rounded-md mb-4" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
              <p className="text-sm" style={{ color: '#7f1d1d' }}>
                Both participants will see an <strong>Exchange terminated</strong> banner in their workspace and receive a system message. No new sessions can be created.
              </p>
              {Number(terminateModal.credits_in_escrow) > 0 && (
                <p className="text-xs mt-2" style={{ color: '#7f1d1d' }}>
                  ⚠️ {Number(terminateModal.credits_in_escrow).toFixed(2)} credits are still in escrow. Termination does <strong>not</strong> release them — use <em>Refund to Learner</em> or <em>Release to Instructor</em> separately.
                </p>
              )}
            </div>

            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--gray-700)' }}>
              Reason (shown to both parties)
            </label>
            <textarea
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="e.g. Report #123 – policy violation confirmed"
              className="w-full p-2 rounded-md text-sm"
              style={{ border: '1px solid var(--gray-300)', resize: 'vertical' }}
              disabled={terminateSubmitting}
            />

            {terminateFeedback && (
              <div
                className="mt-3 p-2 rounded-md text-sm"
                style={{
                  background: terminateFeedback.type === 'success' ? 'var(--green-100)' : '#fee2e2',
                  color: terminateFeedback.type === 'success' ? 'var(--green-800)' : '#991b1b'
                }}
              >
                {terminateFeedback.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={closeTerminateModal}
                disabled={terminateSubmitting}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{ background: 'var(--white)', color: 'var(--gray-700)', border: '1px solid var(--gray-300)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitTerminate}
                disabled={terminateSubmitting}
                className="px-4 py-2 rounded-md text-sm font-semibold inline-flex items-center gap-1.5"
                style={{
                  background: '#991b1b',
                  color: 'var(--white)',
                  border: '1px solid #991b1b',
                  opacity: terminateSubmitting ? 0.7 : 1
                }}
              >
                <Ban className="w-4 h-4" />
                {terminateSubmitting ? 'Terminating…' : 'Terminate exchange'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
