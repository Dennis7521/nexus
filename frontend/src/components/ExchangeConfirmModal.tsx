import React, { useState } from 'react';
import { X, Clock, User, CreditCard } from 'lucide-react';

interface ExchangeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sessionCount: number, message: string) => void;
  skill: {
    title: string;
    instructor: string;
    timeCommitment: string;
    location: string;
  };
  creditsRequired: number;
  userCredits: number;
  isProcessing: boolean;
}

export const ExchangeConfirmModal: React.FC<ExchangeConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  skill,
  creditsRequired,
  userCredits,
  isProcessing
}) => {
  const [sessionCount, setSessionCount] = useState(1);
  const [message, setMessage] = useState('');
  
  if (!isOpen) return null;

  const canAfford = userCredits >= creditsRequired;
  const creditsPerSession = (creditsRequired / sessionCount).toFixed(1);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .modal-overlay { animation: fadeIn 0.2s ease; }
          .modal-content { animation: slideUp 0.3s ease; }
        `
      }} />
      
      <div 
        className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="modal-content bg-neutral-white dark:bg-secondary-800 rounded-2xl shadow-2xl max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 pb-0 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase tracking-wider text-secondary-500 dark:text-secondary-400 mb-2 font-medium">
                Confirm Exchange
              </div>
              <h2 className="text-xl font-semibold text-secondary-900 dark:text-neutral-white">
                Request Exchange
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-full transition-colors text-secondary-500 dark:text-secondary-400"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 pt-4">
            {/* Skill Details */}
            <div className="border border-secondary-200 dark:border-secondary-600 rounded-xl overflow-hidden bg-secondary-50 dark:bg-secondary-700 mb-5">
              <div className="p-5 border-b border-secondary-200 dark:border-secondary-600">
                <div className="text-xs uppercase tracking-wider text-secondary-500 dark:text-secondary-400 mb-2 font-medium">
                  Skill
                </div>
                <div className="text-lg font-semibold text-secondary-900 dark:text-neutral-white">{skill.title}</div>
              </div>
              
              <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-600 flex justify-between">
                <span className="text-sm text-secondary-500 dark:text-secondary-400">Instructor</span>
                <span className="text-sm text-secondary-900 dark:text-neutral-white font-medium">{skill.instructor}</span>
              </div>
              
              <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-600 flex justify-between">
                <span className="text-sm text-secondary-500 dark:text-secondary-400">Time Commitment</span>
                <span className="text-sm text-secondary-900 dark:text-neutral-white font-medium">{skill.timeCommitment}</span>
              </div>
              
              <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-600 flex justify-between">
                <span className="text-sm text-secondary-500 dark:text-secondary-400">Location</span>
                <span className="text-sm text-secondary-900 dark:text-neutral-white font-medium">{skill.location}</span>
              </div>
              
              <div className="px-5 py-4 border-b border-secondary-200 dark:border-secondary-600 flex justify-between">
                <span className="text-sm text-secondary-500 dark:text-secondary-400">Total Cost</span>
                <span className="text-sm text-secondary-900 dark:text-neutral-white font-bold">
                  {creditsRequired} credit{creditsRequired > 1 ? "s" : ""}
                </span>
              </div>
              
              <div className="px-5 py-4 flex justify-between bg-secondary-100 dark:bg-secondary-600">
                <span className="text-sm text-secondary-500 dark:text-secondary-400">Balance after</span>
                <span className={`text-sm font-medium ${
                  canAfford ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {userCredits - creditsRequired} credits
                </span>
              </div>
            </div>

            {/* Session Count */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Number of Sessions
              </label>
              <input
                type="number"
                min="1"
                value={sessionCount}
                onChange={(e) => setSessionCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-neutral-white focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                Credits per session: {creditsPerSession}
              </p>
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself or specify learning goals..."
                className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-neutral-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                rows={3}
              />
            </div>

            {/* Warning if insufficient credits */}
            {!canAfford && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-5">
                <div className="text-sm text-red-700 dark:text-red-400">
                  ⚠️ Insufficient credits! You need {creditsRequired} credits but only have {userCredits}.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-transparent border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 rounded-xl py-3 px-4 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={() => onConfirm(sessionCount, message)}
              disabled={!canAfford || isProcessing}
              className={`flex-2 rounded-xl py-3 px-6 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                !canAfford || isProcessing
                  ? 'bg-secondary-400 dark:bg-secondary-600 text-secondary-200 dark:text-secondary-400 cursor-not-allowed'
                  : 'bg-accent-600 hover:bg-accent-700 text-neutral-white'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-neutral-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm & Request"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExchangeConfirmModal;
