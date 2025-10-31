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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">View Ballots</h2>

        {ballots.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <p className="text-gray-600">No ballots available</p>
          </div>
        ) : (
          <>
            {/* Ballot Selection Dropdown */}
            <div className="mb-6">
              <label htmlFor="ballot-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Ballot
              </label>
              <select
                id="ballot-select"
                value={selectedBallotIndex}
                onChange={(e) => setSelectedBallotIndex(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
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
                  <p className="text-sm text-gray-600">Reviewed by</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedBallot.reviewer_name}</p>
                </div>

                {/* Rating Criteria - Read Only Display */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Ratings</h3>

                  {/* Gestures */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gestures: {selectedBallot.gestures}/10
                    </label>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(selectedBallot.gestures / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Delivery */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery: {selectedBallot.delivery}/10
                    </label>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(selectedBallot.delivery / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Pauses */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pauses: {selectedBallot.pauses}/10
                    </label>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(selectedBallot.pauses / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content: {selectedBallot.content}/10
                    </label>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(selectedBallot.content / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Entertaining */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entertaining: {selectedBallot.entertaining}/10
                    </label>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(selectedBallot.entertaining / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Better Than Last Indicator */}
                {selectedBallot.better_than_last && (
                  <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">✓ Better than their last recording</p>
                  </div>
                )}

                {/* Feedback Text */}
                {selectedBallot.feedback_text && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                      {selectedBallot.feedback_text}
                    </div>
                  </div>
                )}

                {/* Submitted Date */}
                <div className="text-xs text-gray-500 mb-6">
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
                className="px-6 py-2 rounded-lg font-normal text-base hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: '#E5E5E5',
                  color: '#2C2C2C'
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
