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
      const response = await fetch('/api/feature-requests', { cache: 'no-store' });
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
      onClick={handleClose}
    >
      <div
        className="brutal-card p-6 sm:p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold mb-6" style={{ color: '#1a1a1a' }}>Feature Requests</h2>

        {/* Tabs */}
        <div className="flex gap-4 border-b-[3px] border-black mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className="pb-3 px-1 font-bold transition-colors"
            style={{
              color: activeTab === 'submit' ? 'var(--primary)' : '#666',
              borderBottom: activeTab === 'submit' ? '3px solid var(--primary)' : 'none'
            }}
          >
            Submit New
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('view')}
            className="pb-3 px-1 font-bold transition-colors"
            style={{
              color: activeTab === 'view' ? 'var(--primary)' : '#666',
              borderBottom: activeTab === 'view' ? '3px solid var(--primary)' : 'none'
            }}
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
            <label htmlFor="title" className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of your feature request"
              maxLength={200}
              className="w-full px-4 py-2 brutal-border rounded-lg text-sm"
              style={{
                color: '#1a1a1a',
                backgroundColor: '#ffffff'
              }}
              required
              disabled={loading}
            />
            <p className="mt-1 text-xs font-medium" style={{ color: '#666' }}>{title.length}/200 characters</p>
          </div>

          {/* Description Textarea */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the feature you'd like to see..."
              rows={6}
              maxLength={5000}
              className="w-full px-4 py-3 brutal-border rounded-lg text-sm resize-y min-h-[120px]"
              style={{
                color: '#1a1a1a',
                backgroundColor: '#ffffff'
              }}
              required
              disabled={loading}
            />
            <p className="mt-1 text-xs font-medium" style={{ color: '#666' }}>{description.length}/5000 characters</p>
          </div>

          {error && (
            <div className="mb-4 p-3 brutal-border rounded-lg" style={{ backgroundColor: '#FFE5E5' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--error)' }}>{error}</p>
            </div>
          )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="brutal-button px-6 py-2 text-base disabled:opacity-50 bg-white"
                  style={{
                    color: '#1a1a1a'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="brutal-button px-6 py-2 text-base disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--secondary)',
                    color: '#1a1a1a'
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
                  <p className="text-sm font-medium" style={{ color: '#666' }}>Loading feature requests...</p>
                </div>
              ) : featureRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm font-medium" style={{ color: '#666' }}>No feature requests yet. Be the first to submit one!</p>
                </div>
              ) : (
                featureRequests.map((request) => (
                  <div
                    key={request.id}
                    className="brutal-card p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-extrabold" style={{ color: '#1a1a1a' }}>
                        {request.title}
                      </h3>
                    </div>
                    <p className="text-sm mb-3 whitespace-pre-wrap" style={{ color: '#1a1a1a' }}>
                      {request.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-medium" style={{ color: '#666' }}>
                      <span>
                        <strong style={{ color: '#1a1a1a' }}>Submitted by:</strong> {request.user.name || request.user.email}
                      </span>
                      <span>
                        <strong style={{ color: '#1a1a1a' }}>Date:</strong>{' '}
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

              <div className="flex justify-end pt-4 border-t-[3px] border-black mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="brutal-button px-6 py-2 text-base bg-white"
                  style={{
                    color: '#1a1a1a'
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

