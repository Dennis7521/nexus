import { useEffect, useState } from 'react';
import { X, Video, ExternalLink, CheckCircle } from 'lucide-react';

interface JitsiMeetModalProps {
  meetingLink: string;
  displayName: string;
  sessionTitle: string;
  onClose: () => void;
  onJoined?: () => void;
}

export default function JitsiMeetModal({
  meetingLink,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  displayName: _displayName,
  sessionTitle,
  onClose,
  onJoined,
}: JitsiMeetModalProps) {
  const [opened, setOpened] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Open the meeting tab immediately on mount and record join
  useEffect(() => {
    window.open(meetingLink, '_blank', 'noopener,noreferrer');
    setOpened(true);
    onJoined?.();
  }, []);

  // Live elapsed timer
  useEffect(() => {
    if (!opened) return;
    const interval = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [opened]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl overflow-hidden shadow-2xl w-full max-w-md" style={{ background: '#0a2e1a', border: '1px solid rgba(74,222,128,0.3)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white font-bold text-base">{sessionTitle}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">

          {/* Status */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Meeting opened in new tab</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Session active · {formatTime(elapsed)}
              </p>
            </div>
          </div>

          {/* Meeting link display */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>Meeting Room</p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Video className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-xs font-mono text-green-300 truncate flex-1">{meetingLink}</span>
            </div>
          </div>

          {/* Rejoin button */}
          <button
            onClick={() => window.open(meetingLink, '_blank', 'noopener,noreferrer')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(74,222,128,0.15)')}
          >
            <ExternalLink className="w-4 h-4" />
            Reopen Meeting Tab
          </button>

          <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Switch to the Jitsi tab to participate. Come back here to confirm the session when done.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: '#145A32' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1a7a45')}
            onMouseLeave={e => (e.currentTarget.style.background = '#145A32')}
          >
            Return to Session Page
          </button>
        </div>

      </div>
    </div>
  );
}
