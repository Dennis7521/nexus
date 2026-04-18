import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, BookOpen, DollarSign, Upload, X } from 'lucide-react';
import { useToast, ToastContainer } from '../components/Toast';

export const CreateSkill: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, success, error, removeToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '1',
    difficulty_level: 'beginner',
    time_commitment_hours: '',
    time_commitment_period: 'week',
    prerequisites: '',
    tags: ''
  });

  const categories = [
    { id: 1, name: 'Programming' },
    { id: 2, name: 'Design' },
    { id: 3, name: 'Mathematics' },
    { id: 4, name: 'Languages' },
    { id: 5, name: 'Business' },
    { id: 6, name: 'Science' },
    { id: 7, name: 'Engineering' },
    { id: 8, name: 'Arts' }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        error('Please upload an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        error('Image size should be less than 5MB');
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setBackgroundImage(null);
    setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert tags string to array
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      const skillData = {
        title: formData.title,
        description: formData.description,
        category_id: parseInt(formData.category_id),
        time_commitment_hours: parseInt(formData.time_commitment_hours),
        time_commitment_period: formData.time_commitment_period,
        background_image: backgroundImage // Store base64 image
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(skillData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to create skill');
      }

      // Show success notification
      success('Skill created successfully!');

      // Navigate to dashboard
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error('Error creating skill:', err);
      error('Failed to create skill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(100%); }
            to { opacity: 1; transform: translateX(0); }
          }
        `
      }} />
      <div className="page-background min-h-screen">
        <div className="max-w-4xl mx-auto px-12 py-16">
          {/* Page Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-semibold mb-4 tracking-tighter" style={{ color: 'var(--gray-900)' }}>
              Create a Skill
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="card">
            {/* Title */}
            <div className="mb-6">
              <label className="block font-semibold mb-2" style={{ color: 'var(--gray-900)' }}>
                Skill Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g., React.js Fundamentals"
                className="input w-full"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block font-semibold mb-2" style={{ color: 'var(--gray-900)' }}>
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe what you'll teach or what you want to learn..."
                className="input w-full resize-none"
              />
            </div>

            {/* Category and Difficulty */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block font-semibold mb-2" style={{ color: 'var(--gray-900)' }}>
                  <BookOpen className="inline w-4 h-4 mr-2" />
                  Category *
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                  className="input w-full"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-2" style={{ color: 'var(--gray-900)' }}>
                  Difficulty Level *
                </label>
                <select
                  name="difficulty_level"
                  value={formData.difficulty_level}
                  onChange={handleChange}
                  required
                  className="input w-full"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Time Commitment */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block font-semibold mb-2" style={{ color: 'var(--gray-900)' }}>
                  <Clock className="inline w-4 h-4 mr-2" />
                  Time Commitment (hours) *
                </label>
                <input
                  type="number"
                  name="time_commitment_hours"
                  value={formData.time_commitment_hours}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="e.g., 2"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2" style={{ color: 'var(--gray-900)' }}>
                  Per
                </label>
                <select
                  name="time_commitment_period"
                  value={formData.time_commitment_period}
                  onChange={handleChange}
                  className="input w-full"
                >
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="total">Total</option>
                </select>
              </div>
            </div>

            {/* Prerequisites */}
            <div className="mb-6">
              <label className="block font-semibold mb-2" style={{ color: 'var(--gray-900)' }}>
                Prerequisites
              </label>
              <textarea
                name="prerequisites"
                value={formData.prerequisites}
                onChange={handleChange}
                rows={2}
                placeholder="What should students know before starting? (optional)"
                className="input w-full resize-none"
              />
            </div>

            {/* Tags */}
            <div className="mb-8">
              <label className="block font-semibold mb-2" style={{ color: 'var(--gray-900)' }}>
                Tags
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="e.g., react, javascript, frontend (comma-separated)"
                className="input w-full"
              />
              <p className="text-sm mt-1" style={{ color: 'var(--gray-400)' }}>
                Separate tags with commas
              </p>
            </div>

            {/* Background Image Upload */}
            <div className="mb-8">
              <label className="block font-semibold mb-2" style={{ color: 'var(--gray-900)' }}>
                <Upload className="inline w-4 h-4 mr-2" />
                Background Image (Optional)
              </label>
              <p className="text-sm mb-3" style={{ color: 'var(--gray-500)' }}>
                Upload a background image for your skill card (max 5MB)
              </p>
              
              {backgroundImage ? (
                <div className="relative">
                  <div 
                    className="w-full h-48 rounded-xl bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${backgroundImage})` }}
                  >
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm mt-2" style={{ color: 'var(--gray-500)' }}>
                    Click the X to remove the image
                  </p>
                </div>
              ) : (
                <label className="border-2 border-dashed rounded-xl p-8 text-center block cursor-pointer hover:border-green-400 transition-colors" style={{ borderColor: 'var(--gray-300)' }}>
                  <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--gray-400)' }} />
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--green-600)' }}>
                      Click to upload
                    </span>
                    <span className="text-sm" style={{ color: 'var(--gray-500)' }}> or drag and drop</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--gray-400)' }}>
                    PNG, JPG, GIF up to 5MB
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1"
                style={{ background: 'var(--green-800)' }}
              >
                {isSubmitting ? 'Creating...' : 'Create Skill'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-secondary flex-1"
                style={{ 
                  background: 'var(--gray-100)', 
                  color: 'var(--gray-700)',
                  border: '1px solid var(--gray-300)'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
