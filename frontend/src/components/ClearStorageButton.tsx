import React from 'react';
import { Trash2 } from 'lucide-react';

export const ClearStorageButton: React.FC = () => {
  const handleClearStorage = () => {
    if (window.confirm('This will log you out and clear all stored data. Continue?')) {
      // Clear all localStorage data
      localStorage.clear();
      
      // Reload the page to reset the app state
      window.location.reload();
    }
  };

  return (
    <button
      onClick={handleClearStorage}
      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
    >
      <Trash2 className="w-4 h-4" />
      Clear All Data
    </button>
  );
};

export default ClearStorageButton;
