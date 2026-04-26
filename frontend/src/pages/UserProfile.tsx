import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Star, MapPin, Calendar, Award, BookOpen, ArrowLeft, FileText, ExternalLink } from 'lucide-react';
import ProfilePicture from '../components/ProfilePicture';

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
  rating_count: number;
  is_active: boolean;
  students_count: string;
}

interface UserData {
  id: string;
  studentId: string;
  email: string;
  firstName: string;
  lastName: string;
  bio?: string;
  degreeProgram?: string;
  yearOfStudy?: number;
  profilePictureUrl?: string;
  transcriptUrl?: string;
  timeCredits: number;
  totalRating: string;
  ratingCount: number;
  skillsPossessing: string[];
  skillsInterestedIn: string[];
}

export const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (!token || !userId) return;

      try {
        setLoading(true);

        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

        // Fetch user basic info
        const userResponse = await fetch(`${apiBase}/users/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (userResponse.ok) {
          const data = await userResponse.json();
          setUserData({ ...data.user, skillsPossessing: data.user.skillsPossessing || [], skillsInterestedIn: data.user.skillsInterestedIn || [] });
        }

        // Fetch user stats
        const statsResponse = await fetch(`${apiBase}/users/${userId}/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setUserStats(statsData.stats);
        }

        // Fetch user skills
        const skillsResponse = await fetch(`${apiBase}/users/${userId}/skills`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (skillsResponse.ok) {
          const skillsData = await skillsResponse.json();
          setUserSkills(skillsData.skills);
        }

        // Fetch user reviews
        const reviewsResponse = await fetch(`${apiBase}/users/${userId}/reviews`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setUserReviews(reviewsData.reviews || []);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  if (loading) {
    return (
      <div className="page-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--gray-600)' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="page-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p style={{ color: 'var(--gray-600)' }}>User not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 rounded-lg"
            style={{ background: 'var(--green-800)', color: 'white' }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const initials = `${userData.firstName?.[0] || ''}${userData.lastName?.[0] || ''}`;
  const averageRating = userData.ratingCount > 0 
    ? (parseFloat(userData.totalRating) / userData.ratingCount).toFixed(1) 
    : '0.0';

  return (
    <div className="page-background min-h-screen">
      <div className="max-w-7xl mx-auto px-12 py-16">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{ color: 'var(--green-800)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-50)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Profile Header */}
        <div className="card mb-8" style={{ boxShadow: 'var(--shadow-md)' }}>
          <div className="flex gap-8 items-start">
            <ProfilePicture
              imageUrl={userData.profilePictureUrl ? (userData.profilePictureUrl.includes('cloudinary.com') ? userData.profilePictureUrl : userData.profilePictureUrl.startsWith('http') ? new URL(userData.profilePictureUrl).pathname : userData.profilePictureUrl) : undefined}
              initials={initials}
              size="lg"
            />
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="font-bold mb-2 tracking-tighter" style={{ fontSize: 'var(--text-2xl)', color: 'var(--gray-900)' }}>
                    {userData.firstName} {userData.lastName}
                  </h1>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1" style={{ color: 'var(--warning)' }}>
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-semibold">{averageRating}</span>
                      <span style={{ color: 'var(--gray-500)' }}>({userData.ratingCount} reviews)</span>
                    </div>
                  </div>
                  {userData.bio && (
                    <p className="mb-4" style={{ color: 'var(--gray-700)' }}>{userData.bio}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2" style={{ color: 'var(--gray-600)' }}>
                  <BookOpen className="w-4 h-4" />
                  <span>{userData.degreeProgram || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--gray-600)' }}>
                  <Calendar className="w-4 h-4" />
                  <span>Year {userData.yearOfStudy || 'N/A'} Student</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--gray-600)' }}>
                  <Clock className="w-4 h-4" />
                  <span>{Number(userData.timeCredits).toFixed(2)} Time Credits</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--gray-600)' }}>
                  <Award className="w-4 h-4" />
                  <span>{userStats?.skills_offered || 0} Skills Offered</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="card text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--gray-900)' }}>
              {Number(userData.timeCredits).toFixed(2)}
            </div>
            <div className="text-sm" style={{ color: 'var(--gray-500)' }}>TIME CREDITS</div>
          </div>
          <div className="card text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--gray-900)' }}>
              {userStats?.skills_offered || 0}
            </div>
            <div className="text-sm" style={{ color: 'var(--gray-500)' }}>SKILLS OFFERED</div>
          </div>
          <div className="card text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--gray-900)' }}>
              {userStats?.exchanges_completed || 0}
            </div>
            <div className="text-sm" style={{ color: 'var(--gray-500)' }}>EXCHANGES MADE</div>
          </div>
          <div className="card text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--gray-900)' }}>
              {averageRating}
            </div>
            <div className="text-sm" style={{ color: 'var(--gray-500)' }}>AVERAGE RATING</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card mb-8" style={{ boxShadow: 'var(--shadow-md)' }}>
          <div className="flex gap-8 border-b" style={{ borderColor: 'var(--gray-200)' }}>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'skills', label: 'Skills' },
              { id: 'reviews', label: 'Reviews' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-2 font-medium transition-colors ${
                  activeTab === tab.id ? 'border-b-2' : ''
                }`}
                style={{
                  color: activeTab === tab.id ? 'var(--green-800)' : 'var(--gray-500)',
                  borderColor: activeTab === tab.id ? 'var(--green-800)' : 'transparent'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h3 className="font-bold mb-4" style={{ fontSize: 'var(--text-lg)', color: 'var(--gray-900)' }}>
                  Profile Overview
                </h3>
                
                {/* Academic Transcript Section */}
                {userData.transcriptUrl && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3" style={{ color: 'var(--gray-900)' }}>Academic Transcript</h4>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const res = await fetch(userData.transcriptUrl!, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (!res.ok) {
                            alert('Unable to load transcript');
                            return;
                          }
                          const blob = await res.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          window.open(blobUrl, '_blank', 'noopener,noreferrer');
                          setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
                        } catch (err) {
                          console.error('Error opening transcript:', err);
                          alert('Failed to open transcript');
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-lg transition-all"
                      style={{ 
                        background: 'var(--green-800)', 
                        color: 'white',
                        border: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--green-700)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--green-800)';
                      }}
                    >
                      <FileText className="w-5 h-5" />
                      <span className="font-medium">View Academic Transcript</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <p className="text-sm mt-2" style={{ color: 'var(--gray-500)' }}>
                      Click to view this instructor's verified academic transcript
                    </p>
                  </div>
                )}

                {/* Skills Possessing */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3" style={{ color: 'var(--gray-900)' }}>Skills They Can Teach</h4>
                  {userData.skillsPossessing.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {userData.skillsPossessing.map((skill, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-full text-sm font-medium"
                          style={{ background: 'var(--green-100)', color: 'var(--green-800)' }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--gray-400)' }}>No skills listed</p>
                  )}
                </div>

                {/* Skills Interested In */}
                <div>
                  <h4 className="font-semibold mb-3" style={{ color: 'var(--gray-900)' }}>Skills They Want to Learn</h4>
                  {userData.skillsInterestedIn.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {userData.skillsInterestedIn.map((skill, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-full text-sm font-medium"
                          style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--gray-400)' }}>No interests listed</p>
                  )}
                </div>
              </div>
            )}

            {/* Skills Tab */}
            {activeTab === 'skills' && (
              <div>
                <h3 className="font-bold mb-4" style={{ fontSize: 'var(--text-lg)', color: 'var(--gray-900)' }}>
                  Skills Offered
                </h3>
                {userSkills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="p-4 rounded-lg border"
                        style={{ borderColor: 'var(--gray-200)', background: 'var(--gray-50)' }}
                      >
                        <h3 className="font-semibold mb-2" style={{ color: 'var(--gray-900)' }}>
                          {skill.title}
                        </h3>
                        <p className="text-sm mb-3" style={{ color: 'var(--gray-600)' }}>
                          {skill.description}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1" style={{ color: 'var(--gray-500)' }}>
                            <MapPin className="w-3 h-3" />
                            <span>{skill.location}</span>
                          </div>
                          <div className="flex items-center gap-1" style={{ color: 'var(--warning)' }}>
                            {skill.rating_count > 0 ? (
                              <>
                                <Star className="w-3 h-3 fill-current" />
                                <span>{Number(skill.rating).toFixed(1)}</span>
                              </>
                            ) : (
                              <span className="text-xs" style={{ color: 'var(--gray-400)' }}>No ratings</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--gray-500)' }}>No skills offered yet</p>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div>
                <h3 className="font-bold mb-6" style={{ fontSize: 'var(--text-lg)', color: 'var(--gray-900)' }}>
                  Reviews ({userReviews.length})
                </h3>
                {userReviews.length === 0 ? (
                  <p style={{ color: 'var(--gray-500)' }}>No reviews yet</p>
                ) : (
                  <div className="space-y-4">
                    {userReviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-5 rounded-xl"
                        style={{ border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <ProfilePicture
                              imageUrl={review.reviewer_picture
                                ? (review.reviewer_picture.includes('cloudinary.com')
                                    ? review.reviewer_picture
                                    : review.reviewer_picture.startsWith('http')
                                      ? new URL(review.reviewer_picture).pathname
                                      : review.reviewer_picture)
                                : undefined}
                              initials={review.reviewer_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                              size="sm"
                            />
                            <div>
                              <p className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                                {review.reviewer_name}
                              </p>
                              {review.skill_title && (
                                <p className="text-xs mt-0.5" style={{ color: 'var(--gray-500)' }}>
                                  {review.skill_title}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 justify-end mb-1">
                              {[1,2,3,4,5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-4 h-4 ${
                                    s <= review.rating
                                      ? 'text-yellow-400 fill-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-xs" style={{ color: 'var(--gray-400)' }}>
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm italic" style={{ color: 'var(--gray-700)' }}>
                            "{review.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
