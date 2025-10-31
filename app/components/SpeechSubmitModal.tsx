'use client';

import { useState } from 'react';
import * as tus from 'tus-js-client';
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
      console.log('[DEBUG] User authentication check:', { user: user?.id, email: user?.email });
      if (!user) {
        setError('You must be logged in to submit a speech');
        setLoading(false);
        return;
      }

      let response;
      let streamVideoUrl = '';

      if (submissionType === 'video') {
        // Upload video to Cloudflare Stream
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

        // Step 1: Initialize Cloudflare Stream upload (get upload URL)
        setUploadProgress(5);

        let initResponse;
        try {
          console.log('[DEBUG] Calling /api/cloudflare-stream/init with credentials');
          initResponse = await fetch('/api/cloudflare-stream/init', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName: videoFile.name,
              fileSize: videoFile.size,
              fileType: videoFile.type,
            }),
          });

          const initData = await initResponse.json();
          console.log('[DEBUG] /api/cloudflare-stream/init response:', { status: initResponse.status, data: initData });

          if (!initResponse.ok) {
            console.error('[DEBUG] Cloudflare init failed with status:', initResponse.status, initData);
            setError(initData.error || 'Failed to initialize Cloudflare Stream upload');
            setLoading(false);
            return;
          }

          setUploadProgress(10);

          // Step 2: Upload file directly to Cloudflare Stream
          const uploadUrl = initData.upload_url;
          const uploadType = initData.upload_type;
          const videoUid = initData.uid; // For direct uploads, UID is provided immediately

          if (uploadType === 'direct' && videoUid) {
            // Direct upload for files <=200MB
            // Upload file using POST
            const formData = new FormData();
            formData.append('file', videoFile);

            const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              body: formData,
            });

            if (!uploadResponse.ok) {
              throw new Error('Failed to upload video to Cloudflare Stream');
            }

            // Construct playback URL from UID
            streamVideoUrl = `https://iframe.videodelivery.net/${videoUid}`; // Full iframe URL for Cloudflare Stream
            setUploadProgress(90);
          } else {
            // TUS resumable upload for files >200MB using tus-js-client
            // This provides automatic retry, session persistence, and resume capability
            await new Promise<void>((resolve, reject) => {
              const tusUpload = new tus.Upload(videoFile, {
                endpoint: uploadUrl,
                retryDelays: [0, 3000, 5000, 10000, 20000], // Default retry delays with exponential backoff
                chunkSize: 5 * 1024 * 1024, // 5MB chunks
                metadata: {
                  filename: videoFile.name,
                  filetype: videoFile.type,
                },
                onProgress: (bytesUploaded: number, bytesTotal: number) => {
                  // Update progress (10-90%)
                  const progress = Math.min(90, 10 + Math.floor((bytesUploaded / bytesTotal) * 80));
                  setUploadProgress(progress);
                },
                onSuccess: () => {
                  // Extract video UID from upload URL
                  const urlParts = uploadUrl.split('/');
                  const extractedUid = urlParts[urlParts.length - 1] || '';

                  if (!extractedUid) {
                    reject(new Error('Failed to extract video ID from Cloudflare Stream'));
                    return;
                  }

                  streamVideoUrl = `https://iframe.videodelivery.net/${extractedUid}`;
                  setUploadProgress(90);
                  resolve();
                },
                onError: (error: Error) => {
                  reject(new Error(`TUS upload failed: ${error.message}`));
                },
              });

              tusUpload.start();
            });
          }

          if (!streamVideoUrl) {
            throw new Error('Upload incomplete - failed to get video ID');
          }

          // Now submit the Stream video URL/UID to speeches
          setUploadProgress(95);

          response = await fetch('/api/speeches/submit', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ speech_url: streamVideoUrl }),
          });

          setUploadProgress(100);
        } catch (fetchError: unknown) {
          const error = fetchError as { message?: string };
          if (error.message?.includes('Failed to fetch') || error.message?.includes('SSL') || error.message?.includes('ERR_SSL')) {
            setError('Connection error during upload - this can happen with large files. Please try again or use a smaller file.');
          } else {
            setError(error.message || 'Failed to upload video to Cloudflare Stream');
          }
          setLoading(false);
          return;
        }
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
          credentials: 'include',
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
          credentials: 'include',
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
      onClick={handleClose}
    >
      <div
        className="brutal-card p-6 sm:p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold mb-4" style={{ color: '#1a1a1a' }}>Submit New Speech</h2>
        
        {/* Submission Type Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setSubmissionType('video')}
            disabled={loading}
            className="flex-1 px-3 py-3 brutal-border rounded-lg font-bold text-xs transition-all disabled:opacity-50"
            style={{
              backgroundColor: submissionType === 'video' ? 'var(--primary)' : '#ffffff',
              color: submissionType === 'video' ? '#ffffff' : '#1a1a1a',
              boxShadow: submissionType === 'video' ? 'var(--shadow-brutal)' : '2px 2px 0px #000'
            }}
          >
            Upload Video
          </button>
          <button
            type="button"
            onClick={() => setSubmissionType('youtube-link')}
            disabled={loading}
            className="flex-1 px-3 py-3 brutal-border rounded-lg font-bold text-xs transition-all disabled:opacity-50"
            style={{
              backgroundColor: submissionType === 'youtube-link' ? 'var(--primary)' : '#ffffff',
              color: submissionType === 'youtube-link' ? '#ffffff' : '#1a1a1a',
              boxShadow: submissionType === 'youtube-link' ? 'var(--shadow-brutal)' : '2px 2px 0px #000'
            }}
          >
            YouTube Link
          </button>
          <button
            type="button"
            onClick={() => setSubmissionType('audio')}
            disabled={loading}
            className="flex-1 px-3 py-3 brutal-border rounded-lg font-bold text-xs transition-all disabled:opacity-50"
            style={{
              backgroundColor: submissionType === 'audio' ? 'var(--primary)' : '#ffffff',
              color: submissionType === 'audio' ? '#ffffff' : '#1a1a1a',
              boxShadow: submissionType === 'audio' ? 'var(--shadow-brutal)' : '2px 2px 0px #000'
            }}
          >
            Upload Audio
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {submissionType === 'video' ? (
            <div className="mb-4">
              <label htmlFor="video-file" className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                Video File
              </label>
              <input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="w-full px-4 py-3 brutal-border rounded-lg text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:brutal-border file:rounded-md file:text-sm file:font-bold file:bg-white file:cursor-pointer"
                style={{
                  color: '#1a1a1a',
                  backgroundColor: '#ffffff'
                }}
                required
                disabled={loading}
              />
              {videoFile && (
                <p className="text-xs font-medium mt-2" style={{ color: '#1a1a1a' }}>
                  Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: '#666' }}>
                Maximum file size: 1.5 GB. Video will be uploaded to Cloudflare Stream.
              </p>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3">
                  <div className="w-full bg-white brutal-border rounded-lg h-4 overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${uploadProgress}%`,
                        backgroundColor: 'var(--primary)'
                      }}
                    ></div>
                  </div>
                  <p className="text-xs font-bold mt-1 text-center" style={{ color: '#1a1a1a' }}>
                    {uploadProgress < 50 ? 'Uploading video to Cloudflare Stream (this may take a while for large files)...' : uploadProgress < 70 ? 'Processing upload...' : 'Submitting speech...'} {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          ) : submissionType === 'youtube-link' ? (
            <div className="mb-4">
              <label htmlFor="youtube-url" className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                YouTube URL
              </label>
              <input
                id="youtube-url"
                type="url"
                value={youtubeUrl}
                onChange={handleYoutubeUrlChange}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 brutal-border rounded-lg text-sm"
                style={{
                  color: '#1a1a1a',
                  backgroundColor: '#ffffff'
                }}
                required
                disabled={loading}
              />
              <p className="text-xs mt-1" style={{ color: '#666' }}>
                Paste a YouTube link to an existing video (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)
              </p>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3">
                  <div className="w-full bg-white brutal-border rounded-lg h-4 overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${uploadProgress}%`,
                        backgroundColor: 'var(--primary)'
                      }}
                    ></div>
                  </div>
                  <p className="text-xs font-bold mt-1 text-center" style={{ color: '#1a1a1a' }}>Submitting speech... {uploadProgress}%</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <label htmlFor="audio-file" className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                Audio File
              </label>
              <input
                id="audio-file"
                type="file"
                accept="audio/*"
                onChange={handleAudioFileChange}
                className="w-full px-4 py-3 brutal-border rounded-lg text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:brutal-border file:rounded-md file:text-sm file:font-bold file:bg-white file:cursor-pointer"
                style={{
                  color: '#1a1a1a',
                  backgroundColor: '#ffffff'
                }}
                required
                disabled={loading}
              />
              {audioFile && (
                <p className="text-xs font-medium mt-2" style={{ color: '#1a1a1a' }}>
                  Selected: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: '#666' }}>
                Maximum file size: 50 MB. Supported formats: MP3, M4A, WAV, etc.
              </p>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3">
                  <div className="w-full bg-white brutal-border rounded-lg h-4 overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${uploadProgress}%`,
                        backgroundColor: 'var(--primary)'
                      }}
                    ></div>
                  </div>
                  <p className="text-xs font-bold mt-1 text-center" style={{ color: '#1a1a1a' }}>Uploading... {uploadProgress}%</p>
                </div>
              )}
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
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

