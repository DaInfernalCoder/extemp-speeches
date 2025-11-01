'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface BallotSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SpeechOption {
  id: string;
  title: string;
  speech_url: string;
  user_id: string;
  user_name: string;
  submitted_at: string;
  has_previous_speeches: boolean;
  focus_area: string | null;
}

export default function BallotSubmitModal({ isOpen, onClose, onSuccess }: BallotSubmitModalProps) {
  const [speeches, setSpeeches] = useState<SpeechOption[]>([]);
  const [selectedSpeechId, setSelectedSpeechId] = useState('');
  const [gestures, setGestures] = useState(5);
  const [delivery, setDelivery] = useState(5);
  const [pauses, setPauses] = useState(5);
  const [content, setContent] = useState(5);
  const [entertaining, setEntertaining] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [betterThanLast, setBetterThanLast] = useState(false);
  const [focusAreaRating, setFocusAreaRating] = useState(5);
  const [newFocusArea, setNewFocusArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSpeeches, setLoadingSpeeches] = useState(true);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchSpeeches();
    }
  }, [isOpen]);

  const fetchSpeeches = async () => {
    setLoadingSpeeches(true);
    try {
      const response = await fetch('/api/speeches');
      const result = await response.json();
      
      if (response.ok && result.data) {
        setSpeeches(result.data);
      } else {
        setError('Failed to load speeches');
      }
    } catch (err) {
      console.error('Error fetching speeches:', err);
      setError('Failed to load speeches');
    } finally {
      setLoadingSpeeches(false);
    }
  };

  const selectedSpeech = speeches.find(s => s.id === selectedSpeechId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to submit a ballot');
        setLoading(false);
        return;
      }

      if (!selectedSpeechId) {
        setError('Please select a speech to review');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/ballots/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speech_id: selectedSpeechId,
          gestures,
          delivery,
          pauses,
          content,
          entertaining,
          feedback_text: feedbackText.trim() || null,
          better_than_last: betterThanLast,
          focus_area_rating: selectedSpeech?.focus_area ? focusAreaRating : undefined,
          new_focus_area: newFocusArea.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit ballot');
        setLoading(false);
        return;
      }

      // Success - reset form
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting ballot:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSpeechId('');
    setGestures(5);
    setDelivery(5);
    setPauses(5);
    setContent(5);
    setEntertaining(5);
    setFeedbackText('');
    setBetterThanLast(false);
    setFocusAreaRating(5);
    setNewFocusArea('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
      onClick={handleClose}
    >
      <div
        className="brutal-card p-6 sm:p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold mb-6" style={{ color: '#1a1a1a' }}>Submit Ballot</h2>
        
        {loadingSpeeches ? (
          <div className="flex justify-center items-center py-8">
            <p className="text-gray-600">Loading speeches...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Speech Selection */}
            <div className="mb-6">
              <label htmlFor="speech-select" className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                Select Speech to Review
              </label>
              <select
                id="speech-select"
                value={selectedSpeechId}
                onChange={(e) => {
                  setSelectedSpeechId(e.target.value);
                  setBetterThanLast(false); // Reset checkbox when changing speech
                  setFocusAreaRating(5); // Reset focus area rating
                  setNewFocusArea(''); // Reset new focus area
                }}
                className="w-full px-4 py-2 brutal-border rounded-lg text-sm"
                style={{
                  color: '#1a1a1a',
                  backgroundColor: '#ffffff'
                }}
                required
                disabled={loading}
              >
                <option value="">-- Choose a speech --</option>
                {speeches.map((speech) => (
                  <option key={speech.id} value={speech.id}>
                    {speech.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Criteria */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-extrabold mb-3" style={{ color: '#1a1a1a' }}>Rate Each Criteria (1-10)</h3>
              
              {/* Gestures */}
              <div>
                <label htmlFor="gestures" className="block text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>
                  Gestures: {gestures}
                </label>
                <input
                  id="gestures"
                  type="range"
                  min="1"
                  max="10"
                  value={gestures}
                  onChange={(e) => setGestures(Number(e.target.value))}
                  className="w-full h-8 cursor-pointer mobile-slider"
                  disabled={loading}
                />
              </div>

              {/* Delivery */}
              <div>
                <label htmlFor="delivery" className="block text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>
                  Delivery: {delivery}
                </label>
                <input
                  id="delivery"
                  type="range"
                  min="1"
                  max="10"
                  value={delivery}
                  onChange={(e) => setDelivery(Number(e.target.value))}
                  className="w-full h-8 cursor-pointer mobile-slider"
                  disabled={loading}
                />
              </div>

              {/* Pauses */}
              <div>
                <label htmlFor="pauses" className="block text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>
                  Pauses: {pauses}
                </label>
                <input
                  id="pauses"
                  type="range"
                  min="1"
                  max="10"
                  value={pauses}
                  onChange={(e) => setPauses(Number(e.target.value))}
                  className="w-full h-8 cursor-pointer mobile-slider"
                  disabled={loading}
                />
              </div>

              {/* Content */}
              <div>
                <label htmlFor="content" className="block text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>
                  Content: {content}
                </label>
                <input
                  id="content"
                  type="range"
                  min="1"
                  max="10"
                  value={content}
                  onChange={(e) => setContent(Number(e.target.value))}
                  className="w-full h-8 cursor-pointer mobile-slider"
                  disabled={loading}
                />
              </div>

              {/* Entertaining */}
              <div>
                <label htmlFor="entertaining" className="block text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>
                  Entertaining: {entertaining}
                </label>
                <input
                  id="entertaining"
                  type="range"
                  min="1"
                  max="10"
                  value={entertaining}
                  onChange={(e) => setEntertaining(Number(e.target.value))}
                  className="w-full h-8 cursor-pointer mobile-slider"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Focus Area Section */}
            {selectedSpeech && (
              <div className="mb-6">
                {!selectedSpeech.focus_area ? (
                  // No focus area - require textbox to set one
                  <div>
                    <label htmlFor="new-focus-area" className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                      What should their focus area be? <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="new-focus-area"
                      type="text"
                      value={newFocusArea}
                      onChange={(e) => setNewFocusArea(e.target.value)}
                      placeholder="e.g., Better eye contact, Clearer articulation..."
                      className="w-full px-4 py-3 brutal-border rounded-lg text-sm"
                      style={{
                        color: '#1a1a1a',
                        backgroundColor: '#ffffff'
                      }}
                      required
                      disabled={loading}
                    />
                  </div>
                ) : (
                  // Has focus area - show slider and conditional textbox
                  <div>
                    <label htmlFor="focus-area-rating" className="block text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>
                      Focus Area: {selectedSpeech.focus_area} - {focusAreaRating}
                    </label>
                    <input
                      id="focus-area-rating"
                      type="range"
                      min="1"
                      max="10"
                      value={focusAreaRating}
                      onChange={(e) => setFocusAreaRating(Number(e.target.value))}
                      className="w-full h-8 cursor-pointer mobile-slider"
                      required
                      disabled={loading}
                    />
                    
                    {/* Conditional textbox that appears when rating >= 6 */}
                    <div
                      className={`transition-all duration-300 ease-out overflow-hidden ${
                        focusAreaRating >= 6
                          ? 'max-h-[200px] opacity-100 mt-4'
                          : 'max-h-0 opacity-0 mt-0'
                      }`}
                      style={{
                        transform: focusAreaRating >= 6 ? 'translateY(0)' : 'translateY(-10px)',
                      }}
                    >
                      <label htmlFor="change-focus-area" className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                        Change focus area? (Optional)
                      </label>
                      <input
                        id="change-focus-area"
                        type="text"
                        value={newFocusArea}
                        onChange={(e) => setNewFocusArea(e.target.value)}
                        placeholder="Enter new focus area if they&apos;ve mastered this one..."
                        className="w-full px-4 py-3 brutal-border rounded-lg text-sm"
                        style={{
                          color: '#1a1a1a',
                          backgroundColor: '#ffffff'
                        }}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Focus Area Placeholder (when no speech selected but speeches loaded) */}
            {!selectedSpeechId && speeches.length > 0 && (
              <div className="mb-6 p-4 brutal-border rounded-lg" style={{ backgroundColor: '#FFF8F0' }}>
                <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                  Select a speech to see focus area options
                </p>
              </div>
            )}

            {/* Feedback Text */}
            <div className="mb-6">
              <label htmlFor="feedback" className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                Feedback (Optional)
              </label>
              <textarea
                id="feedback"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your thoughts on this speech..."
                rows={3}
                className="w-full px-4 py-3 brutal-border rounded-lg text-sm resize-y min-h-[80px]"
                style={{
                  color: '#1a1a1a',
                  backgroundColor: '#ffffff'
                }}
                disabled={loading}
              />
            </div>

            {/* Better Than Last Checkbox */}
            {selectedSpeech && selectedSpeech.has_previous_speeches && (
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={betterThanLast}
                    onChange={(e) => setBetterThanLast(e.target.checked)}
                    className="w-6 h-6 rounded brutal-border cursor-pointer"
                    style={{
                      accentColor: 'var(--primary)'
                    }}
                    disabled={loading}
                  />
                  <span className="text-sm font-bold" style={{ color: '#1a1a1a' }}>
                    Better than their last recording
                  </span>
                </label>
              </div>
            )}

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
                {loading ? 'Submitting...' : 'Submit Ballot'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

