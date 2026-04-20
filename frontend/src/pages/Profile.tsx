import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Star, MapPin, Calendar, Award, BookOpen, Users, Edit3, Mail, Phone, Globe } from 'lucide-react';
import ProfilePictureUpload from '../components/ProfilePictureUpload';
import EditProfileModal from '../components/EditProfileModal';

interface UserStats {
  time_credits: number;
  total_rating: string;
  rating_count: number;
  skills_offered: string;
  exchanges_completed: string;
}

interface UserSkill {
  id: number;
  title: string;
  description: string;
  category: string;
  time_commitment: string;
  location: string;
  credits_required: number;
  rating: string;
  is_active: boolean;
  students_count: string;
}

interface ExchangeHistoryItem {
  id: number;
  skill_title: string;
  partner_name: string;
  exchange_type: string;
  created_at: string;
  status: string;
}

interface ReviewItem {
  id: number;
  reviewer_name: string;
  skill_title: string;
  rating: number;
  created_at: string;
  comment: string;
}

export const Profile: React.FC = () => {
  const { user, updateProfilePicture } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [exchangeHistory, setExchangeHistory] = useState<ExchangeHistoryItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  // Fetch user statistics and skills
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        // Fetch stats
        const statsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setUserStats(statsData.stats);
        }

        // Fetch user skills
        const skillsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/my-skills`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (skillsResponse.ok) {
          const skillsData = await skillsResponse.json();
          setUserSkills(skillsData.skills);
        }

        // Fetch exchange history
        const historyResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/exchange-history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setExchangeHistory(historyData.history);
        }

        // Fetch reviews
        const reviewsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/reviews`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setReviews(reviewsData.reviews);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Data will be fetched from API

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'skills', label: 'My Skills', icon: Award },
    { id: 'history', label: 'Exchange History', icon: Clock },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  return (
    <div className="page-background min-h-screen">
      <div className="max-w-7xl mx-auto px-12 py-16">
      {/* Profile Header */}
      <div className="card mb-8" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="flex gap-8 items-start">
          <ProfilePictureUpload
            currentImage={user?.profilePictureUrl ? (user.profilePictureUrl.startsWith('http') ? new URL(user.profilePictureUrl).pathname : user.profilePictureUrl) : undefined}
            onImageChange={updateProfilePicture}
            size="lg"
            initials={`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`}
          />
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="font-bold mb-2 tracking-tighter" style={{ fontSize: 'var(--text-2xl)', color: 'var(--gray-900)' }}>
                  {user?.firstName} {user?.lastName}
                </h1>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1" style={{ color: 'var(--warning)' }}>
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-semibold">{user?.totalRating && user.totalRating > 0 ? Number(user.totalRating).toFixed(1) : '0.0'}</span>
                  </div>
                  <span style={{ color: 'var(--gray-500)' }}>•</span>
                  <span style={{ color: 'var(--gray-500)' }}>{userStats?.rating_count ?? user?.ratingCount ?? 0} reviews</span>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
                style={{ 
                  background: 'var(--green-800)',
                  color: 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-700)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--green-800)'}
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3" style={{ color: 'var(--gray-700)' }}>
                  <BookOpen className="w-4 h-4" />
                  <span>{user?.degreeProgram || 'Computer Science'}</span>
                </div>
                <div className="flex items-center gap-3" style={{ color: 'var(--gray-700)' }}>
                  <Users className="w-4 h-4" />
                  <span>Student ID: {user?.studentId || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-3" style={{ color: 'var(--gray-700)' }}>
                  <Calendar className="w-4 h-4" />
                  <span>Year {user?.yearOfStudy || 1} Student</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3" style={{ color: 'var(--gray-700)' }}>
                  <Mail className="w-4 h-4" />
                  <span>{user?.email}</span>
                </div>
                <div className="flex items-center gap-3" style={{ color: 'var(--gray-700)' }}>
                  <Phone className="w-4 h-4" />
                  <span>Contact via messaging</span>
                </div>
                <div className="flex items-center gap-3" style={{ color: 'var(--gray-700)' }}>
                  <Globe className="w-4 h-4" />
                  <span>University of Botswana</span>
                </div>
              </div>
            </div>

            <p className="mb-6 leading-relaxed" style={{ color: 'var(--gray-700)' }}>
              {user?.bio || 'No bio added yet. Click "Edit Profile" to add your bio.'}
            </p>

            {/* Skills Possessing */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--gray-700)' }}>
                Skills Possessing
              </h3>
              <div className="flex gap-2 flex-wrap">
                {user?.skillsPossessing && user.skillsPossessing.length > 0 ? (
                  user.skillsPossessing.map((skill, index) => (
                    <span key={index} className="px-4 py-2 rounded-xl font-medium" style={{
                      background: 'var(--green-100)',
                      color: 'var(--green-800)',
                      fontSize: 'var(--text-sm)',
                      borderRadius: '999px'
                    }}>
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="px-4 py-2 bg-secondary-100 text-black dark:text-neutral-white rounded-xl text-sm font-medium italic">
                    No skills added yet
                  </span>
                )}
              </div>
            </div>

            {/* Skills Interested In */}
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--gray-700)' }}>
                Skills Interested In
              </h3>
              <div className="flex gap-2 flex-wrap">
                {user?.skillsInterestedIn && user.skillsInterestedIn.length > 0 ? (
                  user.skillsInterestedIn.map((skill, index) => (
                    <span key={index} className="px-4 py-2 rounded-xl font-medium" style={{
                      background: 'var(--gray-100)',
                      color: 'var(--gray-700)',
                      fontSize: 'var(--text-sm)',
                      borderRadius: '999px'
                    }}>
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="px-4 py-2 bg-secondary-100 text-black dark:text-neutral-white rounded-xl text-sm font-medium italic">
                    No interests added yet
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <div className="font-bold" style={{ 
            fontSize: 'var(--text-3xl)', 
            color: 'var(--gray-900)' 
          }}>
            {Number(userStats?.time_credits ?? user?.timeCredits ?? 0).toFixed(2)}
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
            {userStats?.skills_offered ?? '0'}
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
            {userStats?.exchanges_completed ?? '0'}
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
            {userStats?.total_rating && Number(userStats.total_rating) > 0 
              ? Number(userStats.total_rating).toFixed(1) 
              : user?.totalRating && user.totalRating > 0 
                ? Number(user.totalRating).toFixed(1) 
                : '0.0'}
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

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex gap-8 border-b" style={{ borderColor: 'var(--gray-100)' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-semibold transition-all duration-200 ${
                  activeTab === tab.id ? 'font-semibold' : ''
                }`}
                style={{
                  color: activeTab === tab.id ? 'var(--green-800)' : 'var(--gray-500)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--green-800)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = 'var(--green-800)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = 'var(--gray-500)';
                  }
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-secondary-100 dark:bg-secondary-800 rounded-2xl p-8 shadow-sm">
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-2xl font-semibold text-black dark:text-neutral-white mb-6">Profile Overview</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-neutral-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {exchangeHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-black dark:text-neutral-white">No recent activity</p>
                    </div>
                  ) : (
                    exchangeHistory.slice(0, 3).map((exchange) => (
                      <div key={exchange.id} className="flex items-center gap-4 p-4 bg-secondary-50 dark:bg-secondary-700 rounded-xl">
                        <div className={`w-2 h-2 rounded-full ${
                          exchange.status === 'accepted' ? 'bg-emerald-500' : 
                          exchange.status === 'pending' ? 'bg-blue-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-black dark:text-neutral-white">
                            {exchange.status === 'accepted' ? 'Accepted' : 'Requested'} exchange with {exchange.partner_name}
                          </p>
                          <p className="text-xs text-black dark:text-neutral-white">
                            {exchange.skill_title} • {new Date(exchange.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-neutral-white mb-4">Achievements</h3>
                <div className="space-y-3">
                  {userStats && Number(userStats.exchanges_completed) >= 5 && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                      <Award className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">Active Exchanger</p>
                        <p className="text-xs text-emerald-600">Completed {userStats.exchanges_completed} exchanges</p>
                      </div>
                    </div>
                  )}
                  {userStats && Number(userStats.skills_offered) >= 1 && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <Star className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Skill Sharer</p>
                        <p className="text-xs text-blue-600">Offering {userStats.skills_offered} skills</p>
                      </div>
                    </div>
                  )}
                  {userStats && Number(userStats.time_credits) >= 20 && (
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-purple-800">Credit Saver</p>
                        <p className="text-xs text-purple-600">{Number(userStats.time_credits).toFixed(2)} credits available</p>
                      </div>
                    </div>
                  )}
                  {(!userStats || (Number(userStats.exchanges_completed) === 0 && Number(userStats.skills_offered) === 0)) && (
                    <div className="text-center py-8">
                      <p className="text-black dark:text-neutral-white">Complete exchanges to unlock achievements!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div>
            <h2 className="text-2xl font-semibold text-black dark:text-neutral-white mb-6">My Skills</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userSkills.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Award className="w-6 h-6 text-secondary-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-black dark:text-neutral-white mb-2">
                    No skills offered yet
                  </h3>
                  <p className="text-black dark:text-neutral-white">
                    Start sharing your knowledge by adding skills you can teach others.
                  </p>
                </div>
              ) : (
                userSkills.map((skill) => (
                  <div key={skill.id} className="bg-neutral-white dark:bg-secondary-700 rounded-2xl p-6 shadow-sm border border-secondary-200 dark:border-secondary-600">
                    <div className="flex justify-between items-start mb-4">
                      <div className="inline-block px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide bg-accent-50 text-accent-700">
                        Offer
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        skill.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {skill.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-neutral-white mb-2">{skill.title}</h3>
                    <p className="text-sm text-black dark:text-neutral-white mb-4">{skill.category}</p>
                    <div className="flex items-center justify-between text-xs text-black dark:text-neutral-white mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{skill.time_commitment}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{skill.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-black dark:text-neutral-white">
                        <Star className="w-4 h-4 fill-current text-yellow-400" />
                        <span>{Number(skill.rating).toFixed(1)}</span>
                        <span className="text-black dark:text-neutral-white">({skill.students_count} students)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-black dark:text-neutral-white">
                        <span>{skill.credits_required} credits</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 className="text-2xl font-semibold text-black dark:text-neutral-white mb-6">Exchange History</h2>
            <div className="space-y-4">
              {exchangeHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-secondary-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-black dark:text-neutral-white mb-2">
                    No exchange history yet
                  </h3>
                  <p className="text-black dark:text-neutral-white">
                    Your completed skill exchanges will appear here.
                  </p>
                </div>
              ) : (
                exchangeHistory.map((exchange) => (
                  <div key={exchange.id} className="border border-secondary-200 dark:border-secondary-600 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-black dark:text-neutral-white">{exchange.skill_title}</h3>
                        <p className="text-black dark:text-neutral-white">with {exchange.partner_name}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          exchange.status === 'accepted' 
                            ? 'bg-green-100 text-green-700' 
                            : exchange.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {exchange.status}
                        </span>
                        <p className="text-sm text-black dark:text-neutral-white mt-1">
                          {new Date(exchange.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-black dark:text-neutral-white">
                      <span className="font-medium">Type:</span> {exchange.exchange_type}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            <h2 className="text-2xl font-semibold text-black dark:text-neutral-white mb-6">Reviews & Feedback</h2>
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Star className="w-6 h-6 text-secondary-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-black dark:text-neutral-white mb-2">
                    No reviews yet
                  </h3>
                  <p className="text-black dark:text-neutral-white">
                    Reviews from students you've helped will appear here.
                  </p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border border-secondary-200 dark:border-secondary-600 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-black dark:text-neutral-white">{review.reviewer_name}</h3>
                        <p className="text-sm text-black dark:text-neutral-white">{review.skill_title}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating ? 'text-yellow-400 fill-current' : 'text-secondary-300'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-black dark:text-neutral-white">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-black dark:text-neutral-white italic">"{review.comment}"</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
      </div>
    </div>
  );
};
