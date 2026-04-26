import React, { useState } from 'react';
import ProfilePictureUpload from './ProfilePictureUpload';
import ClearStorageButton from './ClearStorageButton';

export const ProfileManager: React.FC = () => {
  const [users] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProfilePictureChange = (_userInitials: string, _imageUrl: string | null) => {
    // Force re-render to show updated pictures
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="bg-secondary-100 dark:bg-secondary-800 rounded-2xl p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-secondary-900 dark:text-neutral-white tracking-tight">
          Manage User Profile Pictures
        </h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('profilePictureUpdated', { 
                detail: { userInitials: 'refresh', imageUrl: null } 
              }));
            }}
            className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-neutral-white text-sm font-medium rounded-lg transition-all duration-200"
          >
            Refresh Dashboard
          </button>
          <ClearStorageButton />
        </div>
      </div>
      <p className="text-secondary-600 dark:text-secondary-300 mb-8">
        Upload profile pictures for different users. These will appear on skill cards throughout the platform.
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {users.map((user) => (
          <div key={user.id} className="text-center">
            <ProfilePictureUpload
              key={`${user.initials}-${refreshKey}`}
              currentImage={null}
              onImageChange={(imageUrl) => handleProfilePictureChange(user.initials, imageUrl)}
              size="md"
              initials={user.initials}
            />
            <div className="mt-3">
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-neutral-white">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-xs text-secondary-600 dark:text-secondary-300">
                {user.initials} • ★ {user.rating}
              </p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                {user.email}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-700 rounded-xl">
        <h3 className="text-sm font-semibold text-accent-700 dark:text-accent-300 mb-2">
          💡 How it works:
        </h3>
        <ul className="text-xs text-accent-600 dark:text-accent-400 space-y-1">
          <li>• Click on any profile picture to upload a new image</li>
          <li>• Uploaded pictures are saved and will appear on skill cards</li>
          <li>• Pictures persist across browser sessions</li>
          <li>• Hover over pictures to see upload option</li>
        </ul>
      </div>
    </div>
  );
};

export default ProfileManager;
