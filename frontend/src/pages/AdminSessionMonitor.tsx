import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Users, Video, RefreshCw, Filter } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface SessionRow {
  exchange_type: 'regular' | 'sync';
  session_id: string;
  session_index: number;
  status: string;
  scheduled_at: string | null;
  planned_duration: number | null;
  actual_duration_minutes: number | null;
  mentor_joined_at: string | null;
  learner_joined_at: string | null;
  actual_started_at: string | null;
  actual_ended_at: string | null;
  meeting_link: string | null;
  exchange_id: string;
  skill_title?: string;
  session_notes?: string | null;
  mentor_name?: string;
  mentor_email?: string;
  learner_name?: string;
  learner_email?: string;
  join_timestamps?: Record<string, string>;
  join_timestamps_named?: Record<string, string>;
  confirmations?: Record<string, { confirmed: boolean; confirmed_at: string; notes?: string }>;
  confirmations_named?: Record<string, { confirmed: boolean; confirmed_at: string; notes?: string }>;
  cycle_length?: number;
  total_participants?: number;
  flagged: boolean;
}

function formatDt(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
  });
}

function DurationBadge({ actual, planned }: { actual: number | null; planned: number | null }) {
  if (actual === null) return <span className="text-xs text-gray-400">—</span>;
  const flagged = planned !== null && actual < planned * 0.5;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
      flagged ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
    }`}>
      {flagged && <AlertTriangle className="w-3 h-3" />}
      {actual} min
      {planned && <span className="font-normal opacity-60">/ {planned}</span>}
    </span>
  );
}

function JoinStatus({ joinedAt, label }: { joinedAt: string | null; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {joinedAt
        ? <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
        : <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
      <span className={joinedAt ? 'text-gray-700' : 'text-gray-400'}>
        <span className="font-medium">{label}:</span> {joinedAt ? formatDt(joinedAt) : 'Did not join'}
      </span>
    </div>
  );
}

export default function AdminSessionMonitor() {
  const [regular, setRegular] = useState<SessionRow[]>([]);
  const [sync, setSync] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'regular' | 'sync'>('regular');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const adminToken = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (flaggedOnly) params.set('flagged', 'true');

      const res = await fetch(`${API_URL}/admin/session-monitor?${params}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch session data');
      const data = await res.json();
      setRegular(data.regular || []);
      setSync(data.sync || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [statusFilter, flaggedOnly]);

  const rows = activeTab === 'regular' ? regular : sync;
  const flaggedCount = [...regular, ...sync].filter(r => r.flagged).length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--green-50)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--gray-900)' }}>Session Monitor</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--gray-500)' }}>
              Audit join times, actual durations, and attendance for all sessions.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--green-800)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--green-700)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--green-800)')}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>


        {/* Filters */}
        <div className="bg-white rounded-xl px-4 py-3 mb-4 flex items-center gap-4 flex-wrap" style={{ border: '1px solid var(--gray-200)' }}>
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={e => setFlaggedOnly(e.target.checked)}
              className="rounded"
            />
            <span>Flagged only</span>
            {flaggedOnly && flaggedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{flaggedCount}</span>
            )}
          </label>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          {(['regular', 'sync'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: activeTab === tab ? 'var(--green-800)' : 'white',
                color: activeTab === tab ? 'white' : 'var(--gray-600)',
                border: '1px solid var(--gray-200)'
              }}
            >
              {tab === 'regular' ? (
                <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />One-on-One ({regular.length})</span>
              ) : (
                <span className="flex items-center gap-2"><Video className="w-3.5 h-3.5" />Sync Cycles ({sync.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-800" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center" style={{ border: '1px solid var(--gray-200)' }}>
            <p className="text-gray-500 text-sm">No sessions found matching your filters.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map(row => (
              <div
                key={row.session_id}
                className={`bg-white rounded-xl overflow-hidden transition-all ${row.flagged ? 'ring-1 ring-red-300' : ''}`}
                style={{ border: '1px solid var(--gray-200)' }}
              >
                {/* Row Summary */}
                <button
                  onClick={() => setExpandedId(expandedId === row.session_id ? null : row.session_id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4"
                >
                  {row.flagged && (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">
                        {row.exchange_type === 'regular' ? 'Exchange' : 'Cycle'} #{row.exchange_id.slice(0, 8)}
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        Session {row.session_index}
                      </p>
                      {row.exchange_type === 'sync' && (row.skill_title || row.session_notes) && (
                        <p className="text-xs text-gray-400 truncate max-w-[160px]">{row.skill_title || row.session_notes}</p>
                      )}
                      {row.exchange_type === 'regular' && row.skill_title && (
                        <p className="text-xs text-gray-400 truncate max-w-[160px]">{row.skill_title}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Scheduled</p>
                      <p className="text-sm text-gray-700">{formatDt(row.scheduled_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Actual Duration</p>
                      <DurationBadge actual={row.actual_duration_minutes} planned={row.planned_duration} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Participants Joined</p>
                      {row.exchange_type === 'regular' ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${row.mentor_joined_at ? 'bg-green-500' : 'bg-gray-200'}`} />
                          <span className={`w-2 h-2 rounded-full ${row.learner_joined_at ? 'bg-green-500' : 'bg-gray-200'}`} />
                          <span className="text-xs text-gray-600">
                            {[row.mentor_joined_at, row.learner_joined_at].filter(Boolean).length}/2
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">
                          {Object.keys(row.join_timestamps_named || row.join_timestamps || {}).length} joined
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        row.status === 'completed' ? 'bg-green-100 text-green-700' :
                        row.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {row.status}
                      </span>
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expandedId === row.session_id ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded Detail */}
                {expandedId === row.session_id && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 grid grid-cols-2 gap-6">
                    {/* Join Timeline */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--green-800)' }}>Join Timeline</p>
                      {row.exchange_type === 'regular' ? (
                        <div className="space-y-2">
                          <JoinStatus joinedAt={row.mentor_joined_at} label={`Mentor (${row.mentor_name || 'Unknown'})`} />
                          <JoinStatus joinedAt={row.learner_joined_at} label={`Learner (${row.learner_name || 'Unknown'})`} />
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {Object.entries(row.join_timestamps_named || {}).length === 0 ? (
                            <p className="text-xs text-gray-400">No join data recorded</p>
                          ) : (
                            Object.entries(row.join_timestamps_named || {}).sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime()).map(([name, ts]) => (
                              <div key={name} className="flex items-center gap-1.5 text-xs">
                                <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                <span className="text-gray-700 font-medium">{name}</span>
                                <span className="text-gray-400">{formatDt(ts)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Session Timing */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--green-800)' }}>Session Timing</p>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Planned duration</span>
                          <span className="font-semibold text-gray-700">{row.planned_duration != null ? `${row.planned_duration} min` : '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Started at</span>
                          <span className="font-semibold text-gray-700">{formatDt(row.actual_started_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ended at</span>
                          <span className="font-semibold text-gray-700">{formatDt(row.actual_ended_at)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-gray-100">
                          <span className="text-gray-500">Actual duration</span>
                          <DurationBadge actual={row.actual_duration_minutes} planned={row.planned_duration} />
                        </div>
                      </div>
                    </div>

                    {/* Flag explanation */}
                    {row.flagged && (
                      <div className="col-span-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">
                          <span className="font-semibold">Flagged:</span> Actual duration ({row.actual_duration_minutes} min) is less than 50% of the planned duration ({row.planned_duration} min). This may indicate a no-show or very short session.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
