'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface FeatureRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FeatureRequestModal({ isOpen, onClose, onSuccess }: FeatureRequestModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
        setError('You must be logged in to submit a feature request');
        setLoading(false);
        return;
      }

      // Client-side validation
      if (!title.trim()) {
        setError('Title is required');
        setLoading(false);
        return;
      }

      if (!description.trim()) {
        setError('Description is required');
        setLoading(false);
        return;
      }

      if (title.trim().length > 200) {
        setError('Title must be 200 characters or less');
        setLoading(false);
        return;
      }

      if (description.trim().length > 5000) {
        setError('Description must be 5000 characters or less');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/feature-requests/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit feature request');
        setLoading(false);
        return;
      }

      // Success - reset form
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting feature request:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Submit Feature Request</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Title Input */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of your feature request"
              maxLength={200}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              required
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">{title.length}/200 characters</p>
          </div>

          {/* Description Textarea */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the feature you&apos;d like to see..."
              rows={6}
              maxLength={5000}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 resize-y min-h-[120px]"
              required
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">{description.length}/5000 characters</p>
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
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

