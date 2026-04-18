import { useState } from 'react';
import { Calendar, Clock, CheckCircle, Video } from 'lucide-react';
import { useToast } from './Toast';
import VerificationCodeEntry from './VerificationCodeEntry';
import JitsiMeetModal from './JitsiMeetModal';
import { useAuth } from '../contexts/AuthContext';

interface SessionCardProps {
  session: any;
  isMentor: boolean;
  isLearner: boolean;
  onUpdate: () => void;
}

export default function SessionCard({ session, isMentor, isLearner, onUpdate }: SessionCardProps) {
  const { success, error: showError } = useToast();
  const { user } = useAuth();
  const [sessionNotes, setSessionNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [jitsiOpen, setJitsiOpen] = useState(false);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleMentorConfirm = async () => {
    setConfirming(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/exchanges/sessions/${session.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: 'mentor',
          sessionNotes: sessionNotes || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to confirm session');
      }

      await response.json();
      success('Session confirmed! Share the verification code with the learner.');
      onUpdate();
    } catch (err: any) {
      console.error('Error confirming session:', err);
      showError(err.message || 'Failed to confirm session');
    } finally {
      setConfirming(false);
    }
  };

  const statusColor = 
    session.status === 'completed' ? 'bg-white text-black border border-gray-300' :
    session.status === 'cancelled' ? 'bg-white text-black border border-gray-300' :
    'bg-white text-black border border-gray-300';

  return (
    <div className="border border-[var(--gray-200)] rounded-lg p-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-[var(--gray-900)]">
          Session {session.session_index}
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {session.status}
        </span>
      </div>

      {/* Session Details */}
      <div className="space-y-2 mb-4">
        {session.scheduled_at && (
          <div className="flex items-center text-sm text-[var(--gray-600)]">
            <Calendar className="w-4 h-4 mr-2" />
            {formatDate(session.scheduled_at)}
          </div>
        )}
        
        {session.duration_minutes && (
          <div className="flex items-center text-sm text-[var(--gray-600)]">
            <Clock className="w-4 h-4 mr-2" />
            {session.duration_minutes} minutes
          </div>
        )}

        {session.topics_covered && session.topics_covered.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium text-black mb-1">Topics:</p>
            <div className="flex flex-wrap gap-2">
              {session.topics_covered.map((topic: string, index: number) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-white text-black text-xs rounded border border-gray-300"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {session.credit_share && (
          <div className="text-sm text-[var(--gray-600)] mt-2">
            <span className="font-medium">Credits:</span> {(typeof session.credit_share === 'number' ? session.credit_share : parseFloat(session.credit_share) || 0).toFixed(1)}
          </div>
        )}
      </div>

      {/* Meeting Link */}
      {session.meeting_link && session.status === 'scheduled' && !session.mentor_confirmed && (
        <button
          onClick={async () => {
            try {
              const token = localStorage.getItem('token');
              const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
              const res = await fetch(`${API_URL}/exchanges/sessions/${session.id}/join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                console.error('Join recording failed:', res.status, body);
              }
            } catch (err) {
              console.error('Join recording error:', err);
            }
            setJitsiOpen(true);
          }}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-white rounded-lg transition-colors mb-4 font-semibold"
          style={{ background: '#0D3B22' }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#165a3a'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#0D3B22'}
        >
          <Video className="w-4 h-4" />
          Join Session
        </button>
      )}

      {/* Embedded Jitsi Meeting */}
      {jitsiOpen && session.meeting_link && (
        <JitsiMeetModal
          meetingLink={session.meeting_link}
          displayName={user ? `${user.firstName} ${user.lastName}` : 'Participant'}
          sessionTitle={`Session ${session.session_index}`}
          onClose={() => setJitsiOpen(false)}
        />
      )}

      {/* Mentor Confirmation Section */}
      {isMentor && session.status === 'scheduled' && !session.mentor_confirmed && (
        <div className="border-t border-[var(--gray-200)] pt-4 mt-4">
          <p className="text-sm font-medium text-[var(--gray-700)] mb-2">
            After the session, mark it as complete:
          </p>
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Session notes (optional)..."
            className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--green-500)]"
            rows={3}
          />
          <button
            onClick={handleMentorConfirm}
            disabled={confirming}
            className="w-full px-4 py-2 bg-[var(--green-500)] text-white rounded-lg hover:bg-[var(--green-600)] disabled:opacity-50 transition-colors"
          >
            {confirming ? 'Confirming...' : 'Mark Session Complete'}
          </button>
        </div>
      )}

      {/* Mentor Confirmed - Show Code */}
      {isMentor && session.mentor_confirmed && (
        <div className="border-t border-[var(--gray-200)] pt-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-[var(--gray-700)]">
              Confirmed at {formatDate(session.mentor_confirmed_at)}
            </span>
          </div>
          
          {!session.learner_confirmed && (
            <div className="bg-[var(--green-50)] border border-[var(--green-200)] rounded-lg p-3 mt-2">
              <p className="text-sm font-medium text-[var(--gray-700)] mb-1">
                Verification Code:
              </p>
              <code className="text-2xl font-mono font-bold text-[var(--green-800)] tracking-wider">
                {session.verification_code}
              </code>
              <p className="text-xs text-[var(--gray-600)] mt-2">
                Share this code with the learner to release credits
              </p>
            </div>
          )}
        </div>
      )}

      {/* Learner Verification Section */}
      {isLearner && session.mentor_confirmed && !session.learner_confirmed && (
        <div className="border-t border-[var(--gray-200)] pt-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-[var(--gray-700)]">
              Mentor confirmed session
            </span>
          </div>
          <VerificationCodeEntry sessionId={session.id} onVerified={onUpdate} />
        </div>
      )}

      {/* Both Confirmed */}
      {session.mentor_confirmed && session.learner_confirmed && (
        <div className="border-t border-[var(--gray-200)] pt-4 mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-[var(--gray-700)]">
              Mentor confirmed at {formatDate(session.mentor_confirmed_at)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-[var(--gray-700)]">
              Learner confirmed at {formatDate(session.learner_confirmed_at)}
            </span>
          </div>
          {session.status === 'completed' && (
            <div className="flex items-center gap-2 text-blue-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">
                Credits released: {(typeof session.credit_share === 'number' ? session.credit_share : parseFloat(session.credit_share) || 0).toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Session Notes (if any) */}
      {session.session_notes && (
        <div className="border-t border-[var(--gray-200)] pt-4 mt-4">
          <p className="text-sm font-medium text-[var(--gray-700)] mb-1">Session Notes:</p>
          <p className="text-sm text-[var(--gray-600)]">{session.session_notes}</p>
        </div>
      )}

    </div>
  );
}
