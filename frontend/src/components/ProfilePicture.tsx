import React from 'react';

interface ProfilePictureProps {
  imageUrl?: string | null;
  initials: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProfilePicture: React.FC<ProfilePictureProps> = ({
  imageUrl,
  initials,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    xs: 'w-8 h-8 text-xs',
    sm: 'w-10 h-10 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg'
  };

  const baseClasses = `${sizeClasses[size]} bg-gradient-to-br from-accent-100 to-accent-200 dark:from-secondary-600 dark:to-secondary-700 rounded-full flex items-center justify-center border-2 border-accent-200 dark:border-secondary-500 shadow-sm overflow-hidden ${className}`;

  return (
    <div className={baseClasses}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Profile"
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-accent-700 dark:text-secondary-200 font-semibold">
          {initials}
        </span>
      )}
    </div>
  );
};

export default ProfilePicture;
