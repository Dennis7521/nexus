import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X } from 'lucide-react';

interface ProfilePictureUploadProps {
  currentImage?: string | null;
  onImageChange: (imageUrl: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  initials?: string;
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentImage,
  onImageChange,
  size = 'md',
  initials = 'U'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync previewUrl with currentImage prop changes
  useEffect(() => {
    setPreviewUrl(currentImage || null);
  }, [currentImage]);

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-24 h-24 text-3xl'
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Upload to backend
      const formData = new FormData();
      formData.append('profilePicture', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }

      const data = await response.json();
      console.log('Frontend: Upload response:', data);
      console.log('Frontend: profilePictureUrl from backend:', data.profilePictureUrl);
      
      // Extract just the path (Vite proxy will handle the backend URL)
      const imageUrl = data.profilePictureUrl.startsWith('http')
        ? new URL(data.profilePictureUrl).pathname
        : data.profilePictureUrl;
      
      console.log('Frontend: Final imageUrl (proxied):', imageUrl);
      console.log('Frontend: Calling onImageChange with:', imageUrl);
      
      // Update preview and notify parent
      setPreviewUrl(imageUrl);
      onImageChange(imageUrl);
      setIsUploading(false);
      
      console.log('Frontend: Upload complete, preview updated');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload profile picture. Please try again.');
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      setIsUploading(true);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/delete-profile-picture`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete profile picture');
      }

      // Update local state
      setPreviewUrl(null);
      onImageChange(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      console.log('Profile picture removed successfully');
    } catch (error) {
      console.error('Remove profile picture error:', error);
      alert('Failed to remove profile picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative group">
      {/* Profile Picture Display */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-accent-100 to-accent-200 dark:from-secondary-600 dark:to-secondary-700 rounded-full flex items-center justify-center border-2 border-accent-200 dark:border-secondary-500 shadow-sm overflow-hidden relative`}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-accent-700 dark:text-secondary-200 font-semibold">
            {initials}
          </span>
        )}
        
        {/* Upload Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer" onClick={handleUploadClick}>
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Camera className="w-4 h-4 text-white" />
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Buttons (for larger sizes) */}
      {size === 'lg' && (
        <div className="mt-3 flex gap-2">
          {previewUrl ? (
            <>
              <button
                onClick={handleUploadClick}
                disabled={isUploading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
                style={{ 
                  background: 'var(--green-800)',
                  color: 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-700)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--green-800)'}
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Change Photo'}
              </button>
              <button
                onClick={handleRemoveImage}
                disabled={isUploading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
                style={{ 
                  background: 'var(--green-800)',
                  color: 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-700)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--green-800)'}
              >
                <X className="w-4 h-4" />
                Remove
              </button>
            </>
          ) : (
            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
              style={{ 
                background: 'var(--green-800)',
                color: 'white'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-700)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--green-800)'}
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePictureUpload;
