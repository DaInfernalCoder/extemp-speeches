'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface FeatureRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  created_at: string;
  user: {
    name: string | null;
    email: string;
  };
}

type Tab = 'submit' | 'view';

export default function FeatureRequestModal({ isOpen, onClose, onSuccess }: FeatureRequestModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('submit');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
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
    setActiveTab('submit');
    onClose();
  };

  const fetchFeatureRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await fetch('/api/feature-requests');
      const data = await response.json();
      
      if (response.ok) {
        setFeatureRequests(data.featureRequests || []);
      } else {
        console.error('Failed to fetch feature requests:', data.error);
      }
    } catch (err) {
      console.error('Error fetching feature requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'view') {
      fetchFeatureRequests();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Feature Requests</h2>
        
        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'submit'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Submit New
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('view')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'view'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            View All
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'submit' ? (
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
          ) : (
            <div className="space-y-4">
              {loadingRequests ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Loading feature requests...</p>
                </div>
              ) : featureRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No feature requests yet. Be the first to submit one!</p>
                </div>
              ) : (
                featureRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {request.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">
                      {request.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        <strong>Submitted by:</strong> {request.user.name || request.user.email}
                      </span>
                      <span>
                        <strong>Date:</strong>{' '}
                        {new Date(request.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              
              <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2 rounded-lg font-normal text-base hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: '#E5E5E5',
                    color: '#2C2C2C'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

