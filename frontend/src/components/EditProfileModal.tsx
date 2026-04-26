import React, { useState } from 'react';
import { X, Save, User, Mail, BookOpen, MapPin, FileText, Plus, Trash2, Award, Upload, File } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast, ToastContainer } from './Toast';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const { toasts, removeToast, success, error } = useToast();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    bio: user?.bio || '',
    degreeProgram: user?.degreeProgram || '',
    yearOfStudy: user?.yearOfStudy || 1,
    skillsPossessing: user?.skillsPossessing || [],
    skillsInterestedIn: user?.skillsInterestedIn || [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newSkillPossessing, setNewSkillPossessing] = useState('');
  const [newSkillInterested, setNewSkillInterested] = useState('');
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [isUploadingTranscript, setIsUploadingTranscript] = useState(false);
  const [transcriptUrl, setTranscriptUrl] = useState(user?.transcriptUrl || '');

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'yearOfStudy' ? parseInt(value) || 1 : value
    }));
  };

  const handleAddSkillPossessing = () => {
    if (newSkillPossessing.trim() && !formData.skillsPossessing.includes(newSkillPossessing.trim())) {
      setFormData(prev => ({
        ...prev,
        skillsPossessing: [...prev.skillsPossessing, newSkillPossessing.trim()]
      }));
      setNewSkillPossessing('');
    }
  };

  const handleAddSkillInterested = () => {
    if (newSkillInterested.trim() && !formData.skillsInterestedIn.includes(newSkillInterested.trim())) {
      setFormData(prev => ({
        ...prev,
        skillsInterestedIn: [...prev.skillsInterestedIn, newSkillInterested.trim()]
      }));
      setNewSkillInterested('');
    }
  };

  const handleRemoveSkillPossessing = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skillsPossessing: prev.skillsPossessing.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleRemoveSkillInterested = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skillsInterestedIn: prev.skillsInterestedIn.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleKeyPressPossessing = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkillPossessing();
    }
  };

  const handleKeyPressInterested = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkillInterested();
    }
  };

  const handleTranscriptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        error('Only PDF files are allowed');
        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        error('File size must be less than 10MB');
        return;
      }
      setTranscriptFile(file);
    }
  };

  const handleUploadTranscript = async () => {
    if (!transcriptFile) return;

    setIsUploadingTranscript(true);
    try {
      const formData = new FormData();
      formData.append('transcript', transcriptFile);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/upload-transcript`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload transcript');
      }

      const data = await response.json();
      setTranscriptUrl(data.transcriptUrl);
      setTranscriptFile(null);
      success('Transcript uploaded successfully!');
    } catch (err: any) {
      console.error('Failed to upload transcript:', err);
      error('Failed to upload transcript: ' + err.message);
    } finally {
      setIsUploadingTranscript(false);
    }
  };

  const handleRemoveTranscript = async () => {
    if (!confirm('Are you sure you want to remove your transcript?')) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/delete-transcript`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete transcript');
      }

      setTranscriptUrl('');
      success('Transcript removed successfully!');
    } catch (err: any) {
      console.error('Failed to remove transcript:', err);
      error('Failed to remove transcript: ' + err.message);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Send update to backend API
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (jsonError) {
          console.error('Could not parse error response as JSON:', jsonError);
        }
        throw new Error(errorMessage);
      }

      const responseText = await response.text();

      if (!responseText) {
        throw new Error('Empty response from server');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        throw new Error('Invalid JSON response from server');
      }
      
      // Update user context with response data
      updateUser(data.user);
      onClose();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-white dark:bg-secondary-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-600">
          <h2 className="text-2xl font-semibold text-secondary-900 dark:text-neutral-white tracking-tight">
            Edit Profile
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl text-secondary-900 dark:text-neutral-white bg-neutral-white dark:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl text-secondary-900 dark:text-neutral-white bg-neutral-white dark:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
                placeholder="Enter last name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl text-secondary-900 dark:text-neutral-white bg-neutral-white dark:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
              placeholder="Enter email address"
            />
          </div>

          {/* Degree Program */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <BookOpen className="w-4 h-4 inline mr-2" />
              Degree Program
            </label>
            <input
              type="text"
              name="degreeProgram"
              value={formData.degreeProgram}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl text-secondary-900 dark:text-neutral-white bg-neutral-white dark:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
              placeholder="e.g., BSc Computer Science"
            />
          </div>

          {/* Year of Study */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Year of Study
            </label>
            <select
              name="yearOfStudy"
              value={formData.yearOfStudy}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl text-secondary-900 dark:text-neutral-white bg-neutral-white dark:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
            >
              <option value={1}>1st Year</option>
              <option value={2}>2nd Year</option>
              <option value={3}>3rd Year</option>
              <option value={4}>4th Year</option>
              <option value={5}>5th Year</option>
              <option value={6}>6th Year</option>
            </select>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl text-secondary-900 dark:text-neutral-white bg-neutral-white dark:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200 resize-none"
              placeholder="Tell others about yourself, your interests, and what you're passionate about..."
            />
          </div>

          {/* Skills Possessing */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <Award className="w-4 h-4 inline mr-2" />
              Skills Possessing (Skills you can offer/teach)
            </label>

            {/* Info banner: this field is profile-display only; matching uses skill cards */}
            <div
              className="mb-3 px-4 py-3 rounded-xl text-sm flex gap-3 items-start"
              style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)', color: 'var(--gray-700)' }}
            >
              <span style={{ color: 'var(--green-800)', fontSize: '1.1rem', lineHeight: 1 }}>i</span>
              <div>
                <strong style={{ color: 'var(--green-800)' }}>This field is for display only.</strong>
                {' '}It appears on your public profile so learners can see at a glance what you teach.
                Matching itself runs on your <strong>published skill cards</strong>, so make sure the skills you list here
                reflect the cards you've actually published — otherwise your profile will look inconsistent to visitors.
              </div>
            </div>

            {/* Add new skill possessing */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSkillPossessing}
                onChange={(e) => setNewSkillPossessing(e.target.value)}
                onKeyPress={handleKeyPressPossessing}
                className="flex-1 px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl text-secondary-900 dark:text-neutral-white bg-neutral-white dark:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
                placeholder="Add a skill you can teach (e.g., JavaScript, Python, Design)"
              />
              <button
                type="button"
                onClick={handleAddSkillPossessing}
                className="px-4 py-3 bg-accent-600 hover:bg-accent-700 text-neutral-white rounded-xl transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Current skills possessing */}
            <div className="flex flex-wrap gap-2 mb-6">
              {formData.skillsPossessing.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--green-100)', color: 'var(--green-800)' }}
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkillPossessing(skill)}
                    className="hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--green-600)' }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {formData.skillsPossessing.length === 0 && (
                <p className="text-sm text-secondary-500 dark:text-secondary-400 italic">
                  No skills added yet. Add skills you can teach!
                </p>
              )}
            </div>
          </div>

          {/* Skills Interested In */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <Award className="w-4 h-4 inline mr-2" />
              Skills Interested In (Skills you want to learn)
            </label>
            
            {/* Add new skill interested */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSkillInterested}
                onChange={(e) => setNewSkillInterested(e.target.value)}
                onKeyPress={handleKeyPressInterested}
                className="flex-1 px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl text-secondary-900 dark:text-neutral-white bg-neutral-white dark:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
                placeholder="Add a skill you want to learn (e.g., Machine Learning, UI/UX)"
              />
              <button
                type="button"
                onClick={handleAddSkillInterested}
                className="px-4 py-3 bg-accent-600 hover:bg-accent-700 text-neutral-white rounded-xl transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Current skills interested */}
            <div className="flex flex-wrap gap-2">
              {formData.skillsInterestedIn.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-secondary-100 text-secondary-700 rounded-lg text-sm"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkillInterested(skill)}
                    className="text-secondary-600 hover:text-secondary-800 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {formData.skillsInterestedIn.length === 0 && (
                <p className="text-sm text-secondary-500 dark:text-secondary-400 italic">
                  No interests added yet. Add skills you want to learn!
                </p>
              )}
            </div>
          </div>

          {/* Transcript Upload */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <File className="w-4 h-4 inline mr-2" />
              Academic Transcript (PDF)
            </label>
            
            {transcriptUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <File className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">Transcript uploaded</p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const res = await fetch(transcriptUrl, {
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
                      className="text-xs text-green-600 hover:underline"
                    >
                      View transcript
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveTranscript}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleTranscriptFileChange}
                  className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl text-secondary-900 dark:text-neutral-white bg-neutral-white dark:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all duration-200"
                />
                {transcriptFile && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 p-3 bg-secondary-50 rounded-lg">
                      <p className="text-sm text-secondary-700">
                        <File className="w-4 h-4 inline mr-2" />
                        {transcriptFile.name}
                      </p>
                      <p className="text-xs text-secondary-500 mt-1">
                        {(transcriptFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUploadTranscript}
                      disabled={isUploadingTranscript}
                      className="px-4 py-3 bg-accent-600 hover:bg-accent-700 text-neutral-white rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {isUploadingTranscript ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                )}
                <p className="text-xs text-secondary-500">
                  Upload your academic transcript (PDF only, max 10MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-secondary-200 dark:border-secondary-600">
          <button
            onClick={onClose}
            className="px-6 py-3 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 font-medium rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-accent-600 hover:bg-accent-700 text-neutral-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default EditProfileModal;
