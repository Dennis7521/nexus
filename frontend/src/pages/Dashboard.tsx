import { useAuth } from '../contexts/AuthContext';
import ProfilePicture from '../components/ProfilePicture';
import { useEffect, useState } from 'react';
import { useToast, ToastContainer } from '../components/Toast';
import { SkillDetailsModal } from '../components/SkillDetailsModal';

interface Skill {
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
  background_image?: string;
}

export const Dashboard: React.FC = () => {
  const { user, getAvailableCredits, sendExchangeRequest } = useAuth();
  const { toasts, success, error, removeToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [recommendedSkills, setRecommendedSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exchangesCompleted, setExchangesCompleted] = useState<number>(0);

  // Fetch exchanges completed count
  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('/api/auth/stats', {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          setExchangesCompleted(Number(data.stats?.exchanges_completed ?? 0));
        }
      } catch {}
    };
    fetchStats();
  }, []);

  // Fetch skills from database
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/skills?skill_type=offer`);
        if (response.ok) {
          const data = await response.json();
          setSkills(data.slice(0, 12)); // Limit to 12 skills for dashboard
        }
      } catch (error) {
        console.error('Error fetching skills:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, []);

  // Fetch recommended skills based on user's exchange history
  useEffect(() => {
    const fetchRecommendedSkills = async () => {
      if (!user) return;
      
      try {
        setLoadingRecommended(true);
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/skills/recommended?limit=8`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setRecommendedSkills(data);
        }
      } catch (error) {
        console.error('Error fetching recommended skills:', error);
      } finally {
        setLoadingRecommended(false);
      }
    };

    fetchRecommendedSkills();
  }, [user]);

  // Refresh dashboard when profile pictures are updated
  useEffect(() => {
    const handleFocus = () => setRefreshKey(prev => prev + 1);
    const handleProfileUpdate = (event: any) => {
      console.log('Dashboard: Profile picture updated event received', event.detail);
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('profilePictureUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('profilePictureUpdated', handleProfileUpdate);
    };
  }, []);

  const handleExchangeRequest = async (skillId: string, skillTitle: string, instructorName: string, creditsRequired: number) => {
    if (!user) {
      error('Please log in to request an exchange');
      return;
    }

    if (getAvailableCredits() < creditsRequired) {
      error(`Insufficient credits! You need ${creditsRequired} credits but only have ${getAvailableCredits()}.`);
      return;
    }

    try {
      const firstName = instructorName.split(' ')[0];
      
      const requestSuccess = await sendExchangeRequest(
        parseInt(skillId),
        1, // Default to 1 session, can be changed in ExchangeConfirmModal
        `Hi ${firstName}! I would love to learn ${skillTitle} from you. I'm excited to exchange knowledge and skills with you!`
      );

      if (requestSuccess) {
        success(`Exchange request sent to ${instructorName}!`);
      } else {
        error('Failed to send exchange request. Please try again.');
      }
    } catch (err: any) {
      console.error('Error sending exchange request:', err);
      error(err.message || 'Could not send request. Please try again.');
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {selectedSkill && (
        <SkillDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSkill(null);
          }}
          onRequestExchange={handleExchangeRequest}
          currentUserId={user?.id}
          skill={selectedSkill}
        />
      )}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(100%); }
            to { opacity: 1; transform: translateX(0); }
          }
        `
      }} />
      <div className="page-background min-h-screen">
        <div className="max-w-7xl mx-auto px-12 py-16">
          {/* Dashboard Header */}
          <div className="mb-16">
            <h1 className="text-4xl font-semibold mb-4 tracking-tighter" style={{ color: 'var(--gray-900)' }}>
              Welcome back, {user?.firstName}
            </h1>
            <p className="text-1xl tracking-tight" style={{ color: 'var(--gray-500)' }}>
              Discover new skills and connect with peers who can help you grow!
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mb-20">
            <div className="card text-center">
              <div className="font-bold mb-2 tracking-tighter" style={{ 
                fontSize: 'var(--text-3xl)', 
                color: 'var(--gray-900)' 
              }}>
                {Number(getAvailableCredits()).toFixed(2)}
              </div>
              <div className="uppercase font-medium tracking-wider" style={{ 
                fontSize: 'var(--text-sm)', 
                color: 'var(--gray-500)',
                letterSpacing: '0.05em'
              }}>
                Time Credits
              </div>
            </div>
            <div className="card text-center">
              <div className="font-bold mb-2 tracking-tighter" style={{ 
                fontSize: 'var(--text-3xl)', 
                color: 'var(--gray-900)' 
              }}>
                {skills.filter(s => s.user_id === user?.id).length}
              </div>
              <div className="uppercase font-medium tracking-wider" style={{ 
                fontSize: 'var(--text-sm)', 
                color: 'var(--gray-500)',
                letterSpacing: '0.05em'
              }}>
                Skills Offered
              </div>
            </div>
            <div className="card text-center">
              <div className="font-bold mb-2 tracking-tighter" style={{ 
                fontSize: 'var(--text-3xl)', 
                color: 'var(--gray-900)' 
              }}>
                {exchangesCompleted}
              </div>
              <div className="uppercase font-medium tracking-wider" style={{ 
                fontSize: 'var(--text-sm)', 
                color: 'var(--gray-500)',
                letterSpacing: '0.05em'
              }}>
                Exchanges Made
              </div>
            </div>
            <div className="card text-center">
              <div className="font-bold mb-2 tracking-tighter" style={{ 
                fontSize: 'var(--text-3xl)', 
                color: 'var(--gray-900)' 
              }}>
                {user?.totalRating && user.totalRating > 0 ? Number(user.totalRating).toFixed(1) : '5.0'}
              </div>
              <div className="uppercase font-medium tracking-wider" style={{ 
                fontSize: 'var(--text-sm)', 
                color: 'var(--gray-500)',
                letterSpacing: '0.05em'
              }}>
                Average Rating
              </div>
            </div>
          </div>

          {/* Recommended Skills Section */}
          {recommendedSkills.length > 0 && (
            <div className="mb-20">
              <h2 className="font-bold mb-8 tracking-tighter" style={{ 
                fontSize: 'var(--text-2xl)', 
                color: 'var(--gray-900)',
                borderLeft: '4px solid var(--green-500)',
                paddingLeft: '12px'
              }}>
                Recommended For You
              </h2>
              
              {loadingRecommended ? (
                <div className="text-center py-12" style={{ color: 'var(--gray-500)' }}>
                  Loading recommendations...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {recommendedSkills.map((skill) => {
                    const initials = `${skill.first_name[0]}${skill.last_name[0]}`;
                    const instructorName = `${skill.first_name} ${skill.last_name}`;
                    
                    return (
                      <div key={skill.id} className="rounded-2xl overflow-hidden group relative hover:-translate-y-2 transition-all duration-300" style={{ background: 'var(--green-800)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                        {/* Background Image Header */}
                        {skill.background_image ? (
                          <div 
                            className="h-32 w-full"
                            style={{
                              backgroundImage: `url(${skill.background_image})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                          />
                        ) : (
                          <div className="h-32 w-full" style={{ background: 'var(--green-800)' }} />
                        )}
                        
                        {/* Card Content */}
                        <div className="p-5" style={{ background: 'var(--green-800)' }}>
                          {/* Profile Picture - Overlapping the header */}
                          <div className="-mt-12 mb-3">
                            <ProfilePicture
                              key={`${initials}-${refreshKey}`}
                              imageUrl={skill.profile_picture_url || undefined}
                              initials={initials}
                              size="lg"
                            />
                          </div>
                          
                          {/* Name */}
                          <h3 className="font-bold text-lg mb-1" style={{ color: 'white' }}>
                            {instructorName}
                          </h3>
                          
                          {/* Title & Category */}
                          <p className="text-sm font-medium mb-2" style={{ color: 'white', opacity: 0.9 }}>
                            {skill.title}
                          </p>
                          
                          {/* Description - Collapsed */}
                          <p className="text-sm mb-4 line-clamp-2 group-hover:line-clamp-none transition-all" style={{ color: 'white', opacity: 0.8 }}>
                            {skill.description}
                          </p>
                          
                          {/* Stats Row */}
                          <div className="flex items-center justify-between mb-4 text-sm font-medium">
                            <div className="flex items-center gap-1" style={{ color: 'white' }}>
                              <svg className="w-4 h-4" fill="#FFD700" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span>{skill.instructor_rating ? Number(skill.instructor_rating).toFixed(1) : '5.0'}</span>
                            </div>
                            <button 
                              onClick={() => {
                                setSelectedSkill(skill);
                                setIsModalOpen(true);
                              }}
                              className="text-xs underline hover:no-underline transition-all"
                              style={{ color: 'white', opacity: 0.9, background: 'none', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.9'}
                            >
                              View Details
                            </button>
                          </div>
                          
                          {/* Request Exchange Button */}
                          <button 
                            onClick={() => handleExchangeRequest(skill.id, skill.title, instructorName, skill.credits_required)}
                            className="w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
                            style={{ 
                              background: 'white',
                              color: 'var(--green-800)'
                            }}
                          >
                            Request Exchange
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Available Skills */}
          <div className="mb-20">
            <h2 className="font-bold mb-8 tracking-tighter" style={{ 
              fontSize: 'var(--text-2xl)', 
              color: 'var(--gray-900)',
              borderLeft: '4px solid var(--green-800)',
              paddingLeft: '12px'
            }}>
              Available Skills
            </h2>
            
            {loading ? (
              <div className="text-center py-12" style={{ color: 'var(--gray-500)' }}>
                Loading skills...
              </div>
            ) : skills.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--gray-500)' }}>
                No skills available yet. Be the first to create one!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {skills.map((skill) => {
                  const initials = `${skill.first_name[0]}${skill.last_name[0]}`;
                  const instructorName = `${skill.first_name} ${skill.last_name}`;
                  
                  return (
                    <div key={skill.id} className="rounded-2xl overflow-hidden group relative hover:-translate-y-2 transition-all duration-300" style={{ background: 'var(--green-800)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                      {/* Background Image Header */}
                      {skill.background_image ? (
                        <div 
                          className="h-32 w-full"
                          style={{
                            backgroundImage: `url(${skill.background_image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        />
                      ) : (
                        <div className="h-32 w-full" style={{ background: 'var(--green-800)' }} />
                      )}
                      
                      {/* Card Content */}
                      <div className="p-5" style={{ background: 'var(--green-800)' }}>
                        {/* Profile Picture - Overlapping the header */}
                        <div className="-mt-12 mb-3">
                          <ProfilePicture
                            key={`${initials}-${refreshKey}`}
                            imageUrl={skill.profile_picture_url || undefined}
                            initials={initials}
                            size="lg"
                          />
                        </div>
                        
                        {/* Name */}
                        <h3 className="font-bold text-lg mb-1" style={{ color: 'white' }}>
                          {instructorName}
                        </h3>
                        
                        {/* Title & Category */}
                        <p className="text-sm font-medium mb-2" style={{ color: 'white', opacity: 0.9 }}>
                          {skill.title}
                        </p>
                        
                        {/* Description - Collapsed */}
                        <p className="text-sm mb-4 line-clamp-2 group-hover:line-clamp-none transition-all" style={{ color: 'white', opacity: 0.8 }}>
                          {skill.description}
                        </p>
                        
                        {/* Stats Row */}
                        <div className="flex items-center justify-between mb-4 text-sm font-medium">
                          <div className="flex items-center gap-1" style={{ color: 'white' }}>
                            <svg className="w-4 h-4" fill="#FFD700" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span>{skill.instructor_rating ? Number(skill.instructor_rating).toFixed(1) : '5.0'}</span>
                          </div>
                          <button 
                            onClick={() => {
                              setSelectedSkill(skill);
                              setIsModalOpen(true);
                            }}
                            className="text-xs underline hover:no-underline transition-all"
                            style={{ color: 'white', opacity: 0.9, background: 'none', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.9'}
                          >
                            View Details
                          </button>
                        </div>
                        
                        {/* Request Exchange Button */}
                        <button 
                          onClick={() => handleExchangeRequest(skill.id, skill.title, instructorName, skill.credits_required)}
                          className="w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
                          style={{ 
                            background: skill.user_id === user?.id ? 'rgba(255, 255, 255, 0.2)' : 'white',
                            color: skill.user_id === user?.id ? 'rgba(255, 255, 255, 0.6)' : 'var(--green-800)'
                          }}
                          disabled={skill.user_id === user?.id}
                        >
                          {skill.user_id === user?.id ? 'Your Skill' : 'Request Exchange'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
