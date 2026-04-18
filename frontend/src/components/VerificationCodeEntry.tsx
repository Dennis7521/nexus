import { useState } from 'react';
import { useToast } from './Toast';

interface VerificationCodeEntryProps {
  sessionId: number;
  onVerified: () => void;
}

export default function VerificationCodeEntry({ sessionId, onVerified }: VerificationCodeEntryProps) {
  const { success, error: showError } = useToast();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      showError('Please enter the verification code');
      return;
    }

    setVerifying(true);
    
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/exchanges/sessions/${sessionId}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          verificationCode: code.toUpperCase().trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.message || 'Invalid verification code. Please try again.');
        return;
      }

      success('Code verified! Credits have been released.');
      onVerified();
      
    } catch (err: any) {
      console.error('Error verifying code:', err);
      showError(err.message || 'Failed to verify code');
    } finally {
      setVerifying(false);
    }
  };

  const formatCodeInput = (value: string) => {
    // Remove all non-alphanumeric characters
    let cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Add dashes at positions 3 and 6
    if (cleaned.length > 3) {
      cleaned = cleaned.slice(0, 3) + '-' + cleaned.slice(3);
    }
    if (cleaned.length > 7) {
      cleaned = cleaned.slice(0, 7) + '-' + cleaned.slice(7);
    }
    
    // Limit to 11 characters (ABC-123-XYZ)
    return cleaned.slice(0, 11);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCodeInput(e.target.value);
    setCode(formatted);
  };

  return (
    <form onSubmit={handleVerify} className="bg-[var(--green-50)] border border-[var(--green-200)] rounded-lg p-4">
      <p className="text-sm font-medium text-[var(--gray-700)] mb-2">
        Enter Verification Code:
      </p>
      <p className="text-xs text-[var(--gray-600)] mb-3">
        Ask your mentor for the verification code to confirm session completion
      </p>
      
      <input
        type="text"
        value={code}
        onChange={handleCodeChange}
        placeholder="ABC-123-XYZ"
        maxLength={11}
        className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-center text-lg font-mono font-bold tracking-wider mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--green-500)]"
        disabled={verifying}
      />
      
      <button
        type="submit"
        disabled={verifying || !code}
        className="w-full px-4 py-2 bg-[var(--green-500)] text-white rounded-lg hover:bg-[var(--green-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {verifying ? 'Verifying...' : 'Verify Code'}
      </button>
    </form>
  );
}
