import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { useToast, ToastContainer } from '../components/Toast';

interface Skill {
  id: string;
  title: string;
  description: string;
  category: string;
  duration_per_week: string;
  location: string;
  credits_required: number;
  is_active: boolean;
  created_at: string;
}

export const MySkills: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, success, error, removeToast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    fetchMySkills();
  }, []);

  const fetchMySkills = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/skills`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const allSkills = await response.json();
        // Filter to show only current user's skills
        const mySkills = allSkills.filter((skill: any) => skill.user_id === user?.id);
        setSkills(mySkills);
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (skillId: string, skillTitle: string) => {
    setSkillToDelete({ id: skillId, title: skillTitle });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!skillToDelete) return;

    try {
      setDeletingId(skillToDelete.id);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/skills/${skillToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        // Show success notification
        success('Skill deleted successfully!');

        // Close modal and refresh the list
        setShowDeleteModal(false);
        setSkillToDelete(null);
        fetchMySkills();
      } else {
        throw new Error('Failed to delete skill');
      }
    } catch (err) {
      console.error('Error deleting skill:', err);
      error('Failed to delete skill. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSkillToDelete(null);
  };

  const handleEdit = (skillId: string) => {
    // For now, navigate to create page with skill data (we'll implement edit modal later)
    navigate(`/edit-skill/${skillId}`);
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="page-background min-h-screen">
        <div className="max-w-7xl mx-auto px-12 py-16">
          {/* Header */}
          <div className="mb-12 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-semibold mb-4 tracking-tighter" style={{ color: 'var(--gray-900)' }}>
                My Skills
              </h1>
            </div>
            <button
              onClick={() => navigate('/create-skill')}
              className="btn-primary flex items-center gap-2 px-6 py-3 text-base"
              style={{ background: 'var(--green-800)' }}
            >
              <Plus className="w-5 h-5" />
              Create New Skill
            </button>
          </div>

          {/* Skills List */}
          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--gray-500)' }}>
              Loading your skills...
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg mb-4" style={{ color: 'var(--gray-500)' }}>
                You haven't created any skills yet.
              </p>
              <button
                onClick={() => navigate('/create-skill')}
                className="btn-primary"
                style={{ background: 'var(--green-800)' }}
              >
                Create Your First Skill
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {skills.map((skill) => (
                <div key={skill.id} className="card relative">
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <div className="px-3 py-1 rounded-lg text-xs font-medium" style={{ color: 'var(--gray-900)' }}>
                      {skill.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  {/* Category */}
                  <div className="mb-4">
                    <div className="px-3 py-1 rounded-lg text-xs font-medium inline-block" style={{
                      background: 'var(--gray-100)',
                      color: 'var(--gray-700)'
                    }}>
                      {skill.category}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold mb-2 tracking-tight pr-20" style={{ 
                    fontSize: 'var(--text-lg)', 
                    color: 'var(--gray-900)' 
                  }}>
                    {skill.title}
                  </h3>

                  {/* Description */}
                  <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--gray-500)' }}>
                    {skill.description}
                  </p>

                  {/* Credits */}
                  <div className="mb-6 text-sm font-medium" style={{ color: 'var(--gray-700)' }}>
                    Credits: <span style={{ color: 'var(--green-600)' }}>{skill.credits_required}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(skill.id)}
                      className="flex-1 btn-secondary flex items-center justify-center gap-2"
                      style={{
                        background: 'var(--gray-100)',
                        color: 'var(--gray-700)',
                        border: '1px solid var(--gray-300)'
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(skill.id, skill.title)}
                      disabled={deletingId === skill.id}
                      className="flex-1 btn-secondary flex items-center justify-center gap-2"
                      style={{
                        background: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FECACA'
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        skillTitle={skillToDelete?.title || ''}
        isDeleting={deletingId === skillToDelete?.id}
      />
    </>
  );
};
