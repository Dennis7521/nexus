import { useState } from 'react';
import { Star } from 'lucide-react';
import { useToast } from './Toast';

interface SessionRatingProps {
  sessionId: number;
  onRated: () => void;
}

export default function SessionRating({ sessionId, onRated }: SessionRatingProps) {
  const { success, error: showError } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      showError('Please select a rating');
      return;
    }

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/exchanges/sessions/${sessionId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          review: review.trim() || null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit rating');
      }

      success('Rating submitted successfully!');
      onRated();
      
    } catch (err: any) {
      console.error('Error submitting rating:', err);
      showError(err.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--green-50)] border border-[var(--green-200)] rounded-lg p-4">
      <p className="text-sm font-medium text-[var(--gray-700)] mb-3">
        Rate This Session
      </p>
      
      {/* Star Rating */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= (hoverRating || rating)
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-[var(--gray-300)]'
              }`}
            />
          </button>
        ))}
      </div>
      
      {rating > 0 && (
        <p className="text-sm text-[var(--gray-600)] mb-3">
          {rating === 1 && 'Poor'}
          {rating === 2 && 'Fair'}
          {rating === 3 && 'Good'}
          {rating === 4 && 'Very Good'}
          {rating === 5 && 'Excellent'}
        </p>
      )}
      
      {/* Review Text */}
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Share your experience (optional)..."
        className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--green-500)]"
        rows={3}
      />
      
      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="w-full px-4 py-2 bg-[var(--green-500)] text-white rounded-lg hover:bg-[var(--green-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Submitting...' : 'Submit Rating'}
      </button>
    </form>
  );
}
