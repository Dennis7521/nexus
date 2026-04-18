import { useState } from 'react';
import { useToast } from './Toast';

interface CreateSessionFormProps {
  exchangeId: number;
  sessionCount: number;
  existingSessions: any[];
  onSessionCreated: () => void;
  onCancel: () => void;
}

export default function CreateSessionForm({
  exchangeId,
  sessionCount,
  existingSessions,
  onSessionCreated,
  onCancel
}: CreateSessionFormProps) {
  const { error: showError } = useToast();
  
  // Get available session numbers
  const availableSessions = Array.from({ length: sessionCount }, (_, i) => i + 1)
    .filter(num => !existingSessions.some(s => s.session_index === num));
  
  const [formData, setFormData] = useState({
    sessionIndex: availableSessions[0] || 1,
    scheduledAt: '',
    durationMinutes: 60,
    topicsCovered: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  
  // If all sessions are created, show message
  if (availableSessions.length === 0) {
    return (
      <div className="bg-[var(--green-50)] rounded-lg p-4 border border-[var(--green-200)]">
        <h3 className="text-lg font-bold text-[var(--gray-900)] mb-2">All Sessions Created</h3>
        <p className="text-sm text-[var(--gray-600)] mb-4">
          All {sessionCount} session(s) for this exchange have been scheduled.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-[var(--gray-700)] bg-white border border-[var(--gray-300)] rounded-lg hover:bg-[var(--gray-50)]"
        >
          Close
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.sessionIndex > sessionCount) {
      showError(`Cannot create more than ${sessionCount} sessions`);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/exchanges/${exchangeId}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionIndex: formData.sessionIndex,
          scheduledAt: formData.scheduledAt,
          durationMinutes: formData.durationMinutes,
          topicsCovered: formData.topicsCovered 
            ? formData.topicsCovered.split(',').map(t => t.trim()).filter(t => t)
            : []
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create session');
      }
      
      onSessionCreated();
      
    } catch (err: any) {
      console.error('Error creating session:', err);
      showError(err.message || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  const nextSession = availableSessions[0];
  const progressPercentage = (existingSessions.length / sessionCount) * 100;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-[var(--gray-200)] shadow-sm">
      {/* Header with Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-[var(--gray-900)]">
            Schedule Session {nextSession}
          </h3>
          <span className="text-sm font-medium text-[var(--gray-600)]">
            {existingSessions.length}/{sessionCount} completed
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-[var(--gray-200)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[var(--green-500)] to-[var(--green-600)] transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Session Number - Hidden input, auto-selected */}
        <input type="hidden" value={formData.sessionIndex} />
        
        {/* Scheduled Time */}
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
            Date & Time
          </label>
          <input 
            type="datetime-local" 
            value={formData.scheduledAt}
            onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
            className="w-full px-4 py-3 border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--green-500)] focus:border-transparent"
            required
          />
        </div>
        
        {/* Duration */}
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
            Duration
          </label>
          <select
            value={formData.durationMinutes}
            onChange={(e) => setFormData({...formData, durationMinutes: parseInt(e.target.value)})}
            className="w-full px-4 py-3 border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--green-500)] focus:border-transparent"
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
        
        {/* Jitsi Info Banner */}
        <div className="col-span-2 flex items-start gap-3 px-4 py-3 rounded-lg" style={{ background: '#E8F5F1', border: '1px solid #D1E7DD' }}>
          <svg className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#0D3B22' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#0D3B22' }}>Meeting room auto-generated</p>
            <p className="text-xs mt-0.5" style={{ color: '#4B7A62' }}>A private Jitsi Meet room will be created for this session. Both participants can join directly from NEXUS — no external app needed.</p>
          </div>
        </div>
        
        {/* Topics to Cover */}
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
            Topics to Cover
          </label>
          <textarea
            value={formData.topicsCovered}
            onChange={(e) => setFormData({...formData, topicsCovered: e.target.value})}
            placeholder="Enter topics separated by commas (e.g., React Hooks, State Management, API Integration)"
            rows={3}
            className="w-full px-4 py-3 border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--green-500)] focus:border-transparent resize-none"
          />
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-3 mt-6 pt-6 border-t border-[var(--gray-200)]">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-white text-[var(--gray-700)] border-2 border-[var(--gray-300)] rounded-lg hover:bg-[var(--gray-50)] transition-all font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            backgroundColor: submitting ? '#9CA3AF' : '#0D3B22',
            color: '#FFFFFF'
          }}
          className="flex-1 px-6 py-3 rounded-lg disabled:cursor-not-allowed transition-all font-bold text-base shadow-md"
          onMouseEnter={(e) => {
            if (!submitting) e.currentTarget.style.backgroundColor = '#165a3a';
          }}
          onMouseLeave={(e) => {
            if (!submitting) e.currentTarget.style.backgroundColor = '#0D3B22';
          }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating Session...
            </span>
          ) : (
            `Schedule Session ${nextSession}`
          )}
        </button>
      </div>
    </form>
  );
}
