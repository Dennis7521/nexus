import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ProfilePicture from '../components/ProfilePicture';
import { SkillDetailsModal } from '../components/SkillDetailsModal';

interface Skill {
  id: string;
  title: string;
  description: string;
  category: string;
  category_name: string;
  skill_type: 'offer' | 'request';
  difficulty_level: string;
  time_commitment_hours: number;
  time_commitment_period: string;
  location: string;
  prerequisites?: string;
  tags?: string[];
  credits_required: number;
  first_name: string;
  last_name: string;
  instructor_rating: number;
  user_id: string;
  profile_picture_url?: string;
  duration_per_week: string;
  background_image?: string;
}

export const Browse: React.FC = () => {
  const { user, sendExchangeRequest } = useAuth();
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Programming', 'Design', 'Mathematics', 'Languages', 'Business', 'Science', 'Engineering', 'Arts'];

  // Fetch skills from database
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/skills`);
        if (response.ok) {
          const data = await response.json();
          setSkills(data);
        }
      } catch (error) {
        console.error('Error fetching skills:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, []);

  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         skill.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleExchangeRequest = async (skillId: string, skillTitle: string, instructorName: string) => {
    if (!user) {
      alert('Please log in to request exchanges');
      return;
    }

    try {
      const nameParts = instructorName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      const userResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/exchanges/find-user/${firstName}/${lastName}`);
      
      if (!userResponse.ok) {
        throw new Error(`Could not find ${instructorName} in database`);
      }
      
      await userResponse.json();
      
      const success = await sendExchangeRequest(
        skillId,
        1,
        `Hi ${firstName}! I would love to learn ${skillTitle} from you.`
      );

      if (success) {
        alert(`✅ Exchange request sent to ${instructorName}!`);
      } else {
        alert('❌ Failed to send exchange request.');
      }
    } catch (error) {
      console.error('Error sending exchange request:', error);
      alert('❌ Could not send request. Please try again.');
    }
  };

  return (
    <>
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
      <div className="page-background min-h-screen">
      <div className="max-w-7xl mx-auto px-12 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-semibold mb-4 tracking-tighter" style={{ color: 'var(--gray-900)' }}>
            Browse Skills
          </h1>
        </div>

        {/* Search and Filters */}
        <div className="mb-12">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--gray-400)' }} />
              <input
                type="text"
                placeholder="Search skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full pl-12"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-5 h-5" style={{ color: 'var(--gray-500)' }} />
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-green-800 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-green-800'
                }`}
                style={{
                  background: selectedCategory === category ? 'var(--green-800)' : 'white',
                  color: selectedCategory === category ? 'white' : 'var(--gray-700)',
                  borderColor: selectedCategory === category ? 'var(--green-800)' : 'var(--gray-300)'
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="font-medium" style={{ color: 'var(--gray-600)' }}>
            Found <span style={{ color: 'var(--green-600)' }}>{filteredSkills.length}</span> skills
          </p>
        </div>

        {/* Skills Grid */}
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--gray-500)' }}>
            Loading skills...
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--gray-500)' }}>
            No skills found. Try adjusting your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSkills.map((skill) => {
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
                      onClick={() => handleExchangeRequest(skill.id, skill.title, instructorName)}
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
    </>
  );
};
