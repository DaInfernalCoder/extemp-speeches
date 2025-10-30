'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SpeechSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SpeechSubmitModal({ isOpen, onClose, onSuccess }: SpeechSubmitModalProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to submit a speech');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/speeches/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtube_url: youtubeUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit speech');
        setLoading(false);
        return;
      }

      // Success
      setYoutubeUrl('');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting speech:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setYoutubeUrl('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Submit New Speech</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-2">
              Unlisted YouTube URL
            </label>
            <input
              id="youtube-url"
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Please provide an unlisted YouTube link to your speech
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-2 rounded-lg font-normal text-base hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: '#E5E5E5',
                color: '#2C2C2C'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg font-normal text-base hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: '#2C2C2C',
                color: '#F5F5F5'
              }}
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

