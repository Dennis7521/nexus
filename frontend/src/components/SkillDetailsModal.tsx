import { X, Clock, MapPin, Award, BookOpen, Users, Tag } from 'lucide-react';

interface SkillDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestExchange?: (skillId: string, skillTitle: string, instructorName: string, creditsRequired: number) => void;
  currentUserId?: string;
  skill: {
    id: string;
    title: string;
    description: string;
    category_name: string;
    skill_type: 'offer' | 'request';
    difficulty_level: string;
    time_commitment_hours: number;
    time_commitment_period: string;
    prerequisites?: string;
    tags?: string[];
    credits_required: number;
    first_name: string;
    last_name: string;
    instructor_rating: number;
    user_id: string;
    profile_picture_url?: string;
  };
}

export const SkillDetailsModal: React.FC<SkillDetailsModalProps> = ({ isOpen, onClose, onRequestExchange, currentUserId, skill }) => {
  if (!isOpen) return null;

  const getDifficultyColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner':
        return 'var(--green-500)';
      case 'intermediate':
        return 'var(--warning)';
      case 'advanced':
        return 'var(--danger)';
      default:
        return 'var(--gray-500)';
    }
  };


  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl"
          style={{ background: 'var(--white)', boxShadow: 'var(--shadow-lg)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--gray-200)', background: 'var(--green-800)' }}
          >
            <h2 className="text-xl font-bold" style={{ color: 'white' }}>
              Skill Details
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-all hover:bg-white hover:bg-opacity-20"
              style={{ color: 'white' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-6">
            {/* Title & Category */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--gray-900)' }}>
                {skill.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span 
                  className="px-3 py-1 rounded-md text-xs font-medium"
                  style={{ 
                    background: 'white',
                    color: 'var(--gray-700)',
                    border: '1px solid var(--gray-300)'
                  }}
                >
                  {skill.category_name}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--gray-900)' }}>
                <BookOpen className="w-4 h-4" style={{ color: 'var(--green-800)' }} />
                Description
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--gray-600)' }}>
                {skill.description}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Time Commitment */}
              <div 
                className="p-4 rounded-xl"
                style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4" style={{ color: 'var(--green-800)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--gray-900)' }}>
                    Time Commitment
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                  {skill.time_commitment_hours} hours per {skill.time_commitment_period}
                </p>
              </div>

              {/* Difficulty Level */}
              <div 
                className="p-4 rounded-xl"
                style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4" style={{ color: 'var(--green-800)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--gray-900)' }}>
                    Difficulty Level
                  </span>
                </div>
                <p 
                  className="text-sm font-medium capitalize"
                  style={{ color: getDifficultyColor(skill.difficulty_level) }}
                >
                  {skill.difficulty_level || 'Not specified'}
                </p>
              </div>

              {/* Location */}
              <div 
                className="p-4 rounded-xl"
                style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4" style={{ color: 'var(--green-800)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--gray-900)' }}>
                    Location
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                  Online
                </p>
              </div>

              {/* Credits Required */}
              <div 
                className="p-4 rounded-xl"
                style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4" style={{ color: 'var(--green-800)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--gray-900)' }}>
                    Credits Required
                  </span>
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--green-800)' }}>
                  {skill.credits_required} credits
                </p>
              </div>
            </div>

            {/* Prerequisites */}
            {skill.prerequisites && (
              <div className="mb-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--gray-900)' }}>
                  <BookOpen className="w-4 h-4" style={{ color: 'var(--green-800)' }} />
                  Prerequisites
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--gray-600)' }}>
                  {skill.prerequisites}
                </p>
              </div>
            )}

            {/* Tags */}
            {skill.tags && skill.tags.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--gray-900)' }}>
                  <Tag className="w-4 h-4" style={{ color: 'var(--green-800)' }} />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {skill.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'var(--green-100)', color: 'var(--green-800)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Instructor Info */}
            <div 
              className="p-4 rounded-xl"
              style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)' }}
            >
              <h4 className="font-semibold mb-2" style={{ color: 'var(--gray-900)' }}>
                Instructor
              </h4>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                  style={{ background: 'var(--green-800)', color: 'white' }}
                >
                  {skill.first_name?.[0]}{skill.last_name?.[0]}
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--gray-900)' }}>
                    {skill.first_name} {skill.last_name}
                  </p>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="#FFD700" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: 'var(--gray-600)' }}>
                      {skill.instructor_rating ? Number(skill.instructor_rating).toFixed(1) : '5.0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div 
            className="px-6 py-4 flex items-center justify-center gap-3"
            style={{ background: 'var(--gray-50)' }}
          >
            {onRequestExchange && currentUserId !== skill.user_id && (
              <button
                onClick={() => {
                  onRequestExchange(skill.id, skill.title, `${skill.first_name} ${skill.last_name}`, skill.credits_required);
                  onClose();
                }}
                className="px-6 py-2 rounded-lg font-medium text-sm transition-all"
                style={{ 
                  background: 'var(--green-800)', 
                  color: 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-700)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--green-800)'}
              >
                Request Exchange
              </button>
            )}
            <button
              onClick={() => window.location.href = `/user/${skill.user_id}`}
              className="px-6 py-2 rounded-lg font-medium text-sm transition-all"
              style={{ 
                background: 'var(--green-800)', 
                color: 'white'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-700)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--green-800)'}
            >
              View Instructor Profile
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
