import React, { useState, useEffect } from 'react';
export const DebugStorage: React.FC = () => {
  const [storageData, setStorageData] = useState<any>({});

  const refreshStorageData = () => {
    const data = {
      token: localStorage.getItem('token'),
      profilePictures: Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('profilePicture_'))),
      allKeys: Object.keys(localStorage),
    };
    setStorageData(data);
  };

  useEffect(() => {
    refreshStorageData();
  }, []);

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-yellow-800">Debug: localStorage Data</h3>
        <button 
          onClick={refreshStorageData}
          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded transition-colors"
        >
          Refresh
        </button>
      </div>
      <pre className="text-xs text-yellow-700 bg-yellow-100 p-3 rounded overflow-x-auto">
        {JSON.stringify(storageData, null, 2)}
      </pre>
    </div>
  );
};

export default DebugStorage;
