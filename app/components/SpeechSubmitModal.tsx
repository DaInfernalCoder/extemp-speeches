'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SpeechSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type SubmissionType = 'video' | 'audio' | 'youtube-link';

export default function SpeechSubmitModal({ isOpen, onClose, onSuccess }: SpeechSubmitModalProps) {
  const [submissionType, setSubmissionType] = useState<SubmissionType>('video');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const supabase = createClient();

  // Validate YouTube URL format
  const isValidYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadProgress(0);

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to submit a speech');
        setLoading(false);
        return;
      }

      let response;
      let youtubeUrl = '';

      if (submissionType === 'video') {
        // Upload video to YouTube
        if (!videoFile) {
          setError('Please select a video file');
          setLoading(false);
          return;
        }

        // Validate file size (1.5 GB)
        const maxSize = 1.5 * 1024 * 1024 * 1024;
        if (videoFile.size > maxSize) {
          setError('Video file must be less than 1.5 GB');
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('video_file', videoFile);

        // Upload to YouTube via resumable upload (0-50% progress)
        setUploadProgress(10);

        const youtubeResponse = await fetch('/api/youtube/upload', {
          method: 'POST',
          body: formData,
        });

        setUploadProgress(50);

        const youtubeData = await youtubeResponse.json();

        if (!youtubeResponse.ok) {
          setError(youtubeData.error || 'Failed to upload video to YouTube');
          setLoading(false);
          return;
        }

        youtubeUrl = youtubeData.youtube_url;

        // Now submit the YouTube URL to speeches
        setUploadProgress(70);

        response = await fetch('/api/speeches/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ speech_url: youtubeUrl }),
        });

        setUploadProgress(100);
      } else if (submissionType === 'audio') {
        // Submit audio file
        if (!audioFile) {
          setError('Please select an audio file');
          setLoading(false);
          return;
        }

        // Validate file size (50 MB)
        const maxSize = 50 * 1024 * 1024;
        if (audioFile.size > maxSize) {
          setError('Audio file must be less than 50 MB');
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('audio_file', audioFile);

        // Simulate upload progress
        setUploadProgress(30);

        response = await fetch('/api/speeches/submit', {
          method: 'POST',
          body: formData,
        });

        setUploadProgress(100);
      } else {
        // Submit YouTube link
        if (!youtubeUrl.trim()) {
          setError('Please enter a YouTube URL');
          setLoading(false);
          return;
        }

        // Validate YouTube URL format
        if (!isValidYouTubeUrl(youtubeUrl.trim())) {
          setError('Invalid YouTube URL format. Please provide a valid YouTube link (e.g., https://www.youtube.com/watch?v=...)');
          setLoading(false);
          return;
        }

        setUploadProgress(50);

        response = await fetch('/api/speeches/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ speech_url: youtubeUrl.trim() }),
        });

        setUploadProgress(100);
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit speech');
        setLoading(false);
        return;
      }

      // Success
      setVideoFile(null);
      setAudioFile(null);
      setYoutubeUrl('');
      setUploadProgress(0);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting speech:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file');
        return;
      }
      setVideoFile(file);
      setError('');
    }
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        setError('Please select a valid audio file');
        return;
      }
      setAudioFile(file);
      setError('');
    }
  };

  const handleYoutubeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeUrl(e.target.value);
    setError('');
  };

  const handleClose = () => {
    setVideoFile(null);
    setAudioFile(null);
    setYoutubeUrl('');
    setError('');
    setUploadProgress(0);
    setSubmissionType('video');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Submit New Speech</h2>
        
        {/* Submission Type Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setSubmissionType('video')}
            disabled={loading}
            className="flex-1 px-3 py-3 rounded-lg font-medium text-xs transition-all disabled:opacity-50 active:scale-95"
            style={{
              backgroundColor: submissionType === 'video' ? '#2C2C2C' : '#E5E5E5',
              color: submissionType === 'video' ? '#F5F5F5' : '#2C2C2C'
            }}
          >
            Upload Video
          </button>
          <button
            type="button"
            onClick={() => setSubmissionType('youtube-link')}
            disabled={loading}
            className="flex-1 px-3 py-3 rounded-lg font-medium text-xs transition-all disabled:opacity-50 active:scale-95"
            style={{
              backgroundColor: submissionType === 'youtube-link' ? '#2C2C2C' : '#E5E5E5',
              color: submissionType === 'youtube-link' ? '#F5F5F5' : '#2C2C2C'
            }}
          >
            YouTube Link
          </button>
          <button
            type="button"
            onClick={() => setSubmissionType('audio')}
            disabled={loading}
            className="flex-1 px-3 py-3 rounded-lg font-medium text-xs transition-all disabled:opacity-50 active:scale-95"
            style={{
              backgroundColor: submissionType === 'audio' ? '#2C2C2C' : '#E5E5E5',
              color: submissionType === 'audio' ? '#F5F5F5' : '#2C2C2C'
            }}
          >
            Upload Audio
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {submissionType === 'video' ? (
            <div className="mb-4">
              <label htmlFor="video-file" className="block text-sm font-medium text-gray-700 mb-2">
                Video File
              </label>
              <input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-base file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 active:file:bg-gray-300 cursor-pointer"
                required
                disabled={loading}
              />
              {videoFile && (
                <p className="text-xs text-gray-600 mt-2">
                  Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Maximum file size: 1.5 GB. Video will be uploaded to YouTube as unlisted.
              </p>
              
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 text-center">
                    {uploadProgress < 50 ? 'Uploading video to YouTube (this may take a while for large files)...' : uploadProgress < 70 ? 'Processing upload...' : 'Submitting speech...'} {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          ) : submissionType === 'youtube-link' ? (
            <div className="mb-4">
              <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URL
              </label>
              <input
                id="youtube-url"
                type="url"
                value={youtubeUrl}
                onChange={handleYoutubeUrlChange}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste a YouTube link to an existing video (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)
              </p>
              
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 text-center">Submitting speech... {uploadProgress}%</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <label htmlFor="audio-file" className="block text-sm font-medium text-gray-700 mb-2">
                Audio File
              </label>
              <input
                id="audio-file"
                type="file"
                accept="audio/*"
                onChange={handleAudioFileChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-base file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 active:file:bg-gray-300 cursor-pointer"
                required
                disabled={loading}
              />
              {audioFile && (
                <p className="text-xs text-gray-600 mt-2">
                  Selected: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Maximum file size: 50 MB. Supported formats: MP3, M4A, WAV, etc.
              </p>
              
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 text-center">Uploading... {uploadProgress}%</p>
                </div>
              )}
            </div>
          )}

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

