import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  skillTitle: string;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  skillTitle,
  isDeleting = false
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{
                background: '#FEF2F2'
              }}>
                <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
              </div>
              <div>
                <h3 className="text-xl font-semibold" style={{ color: 'var(--gray-900)' }}>
                  Delete Skill
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={isDeleting}
            >
              <X className="w-5 h-5" style={{ color: 'var(--gray-500)' }} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <p className="text-base mb-2" style={{ color: 'var(--gray-700)' }}>
              Are you sure you want to delete <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>"{skillTitle}"</span>?
            </p>
            <p className="text-sm" style={{ color: 'var(--gray-500)' }}>
              This action cannot be undone. The skill will be permanently removed from your profile.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 hover:bg-gray-100"
              style={{
                background: 'var(--gray-50)',
                color: 'var(--gray-700)',
                border: '1px solid var(--gray-200)'
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 hover:opacity-90"
              style={{
                background: '#DC2626',
                color: 'white'
              }}
            >
              {isDeleting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Deleting...
                </span>
              ) : (
                'Delete Skill'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
