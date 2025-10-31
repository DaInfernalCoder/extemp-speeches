'use client';

import { useState } from 'react';

interface Ballot {
  id: string;
  gestures: number;
  delivery: number;
  pauses: number;
  content: number;
  entertaining: number;
  feedback_text?: string;
  better_than_last: boolean;
  created_at: string;
  reviewer_name: string;
}

interface BallotViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ballots: Ballot[];
  speechTitle: string;
}

export default function BallotViewModal({ isOpen, onClose, ballots, speechTitle }: BallotViewModalProps) {
  const [selectedBallotIndex, setSelectedBallotIndex] = useState(0);

  const selectedBallot = ballots.length > 0 ? ballots[selectedBallotIndex] : null;

  const handleClose = () => {
    setSelectedBallotIndex(0);
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
        <h2 className="text-2xl font-extrabold mb-6" style={{ color: '#1a1a1a' }}>View Ballots</h2>

        {ballots.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <p className="text-sm font-medium" style={{ color: '#666' }}>No ballots available</p>
          </div>
        ) : (
          <>
            {/* Ballot Selection Dropdown */}
            <div className="mb-6">
              <label htmlFor="ballot-select" className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                Select Ballot
              </label>
              <select
                id="ballot-select"
                value={selectedBallotIndex}
                onChange={(e) => setSelectedBallotIndex(Number(e.target.value))}
                className="w-full px-4 py-2 brutal-border rounded-lg text-sm"
                style={{
                  color: '#1a1a1a',
                  backgroundColor: '#ffffff'
                }}
              >
                {ballots.map((ballot, index) => (
                  <option key={ballot.id} value={index}>
                    {ballot.reviewer_name} - {new Date(ballot.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Ballot Display */}
            {selectedBallot && (
              <>
                {/* Reviewer Name */}
                <div className="mb-6">
                  <p className="text-sm font-medium" style={{ color: '#666' }}>Reviewed by</p>
                  <p className="text-lg font-extrabold" style={{ color: '#1a1a1a' }}>{selectedBallot.reviewer_name}</p>
                </div>

                {/* Rating Criteria - Read Only Display */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-extrabold mb-3" style={{ color: '#1a1a1a' }}>Ratings</h3>

                  {/* Gestures */}
                  <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>
                      Gestures: {selectedBallot.gestures}/10
                    </label>
                    <div className="w-full h-3 bg-white brutal-border rounded-lg overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${(selectedBallot.gestures / 10) * 100}%`,
                          backgroundColor: 'var(--primary)'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Delivery */}
                  <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>
                      Delivery: {selectedBallot.delivery}/10
                    </label>
                    <div className="w-full h-3 bg-white brutal-border rounded-lg overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${(selectedBallot.delivery / 10) * 100}%`,
                          backgroundColor: 'var(--primary)'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Pauses */}
                  <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>
                      Pauses: {selectedBallot.pauses}/10
                    </label>
                    <div className="w-full h-3 bg-white brutal-border rounded-lg overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${(selectedBallot.pauses / 10) * 100}%`,
                          backgroundColor: 'var(--primary)'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>
                      Content: {selectedBallot.content}/10
                    </label>
                    <div className="w-full h-3 bg-white brutal-border rounded-lg overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${(selectedBallot.content / 10) * 100}%`,
                          backgroundColor: 'var(--primary)'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Entertaining */}
                  <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>
                      Entertaining: {selectedBallot.entertaining}/10
                    </label>
                    <div className="w-full h-3 bg-white brutal-border rounded-lg overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${(selectedBallot.entertaining / 10) * 100}%`,
                          backgroundColor: 'var(--primary)'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Better Than Last Indicator */}
                {selectedBallot.better_than_last && (
                  <div className="mb-6 p-3 brutal-border rounded-lg" style={{ backgroundColor: '#E5FFE5' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--success)' }}>✓ Better than their last recording</p>
                  </div>
                )}

                {/* Feedback Text */}
                {selectedBallot.feedback_text && (
                  <div className="mb-6">
                    <label className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>Feedback</label>
                    <div className="w-full px-4 py-3 brutal-border rounded-lg text-sm" style={{ backgroundColor: '#ffffff', color: '#1a1a1a' }}>
                      {selectedBallot.feedback_text}
                    </div>
                  </div>
                )}

                {/* Submitted Date */}
                <div className="text-xs font-medium mb-6" style={{ color: '#666' }}>
                  Submitted on {new Date(selectedBallot.created_at).toLocaleDateString()} at{' '}
                  {new Date(selectedBallot.created_at).toLocaleTimeString()}
                </div>
              </>
            )}

            {/* Close Button */}
            <div className="flex gap-3 justify-end">
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
          </>
        )}
      </div>
    </div>
  );
}
