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
        // Upload video to YouTube using client-side direct upload
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

        // Step 1: Initialize YouTube upload (get upload URL)
        setUploadProgress(5);

        let initResponse;
        try {
          initResponse = await fetch('/api/youtube/init', {
            method: 'POST',
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

          if (!initResponse.ok) {
            setError(initData.error || 'Failed to initialize YouTube upload');
            setLoading(false);
            return;
          }

          setUploadProgress(10);

          // Step 2: Upload file directly to YouTube using resumable upload (Blob.slice loop)
          const uploadUrl = initData.upload_url;
          const chunkSize = 5 * 1024 * 1024; // 5MB chunks
          const totalSize = videoFile.size;
          let start = 0;

          const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

          const probePosition = async (): Promise<number | null> => {
            const probe = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Range': `bytes */${totalSize}`,
              },
            });
            if (probe.status === 308) {
              const rangeHeader = probe.headers.get('Range');
              const match = rangeHeader?.match(/bytes=0-(\d+)/);
              if (match) return parseInt(match[1], 10) + 1;
              return 0;
            }
            return null;
          };

          const putChunk = async (
            startByte: number,
            endByte: number,
            attempt = 0
          ): Promise<{ nextStart: number; finished: boolean; videoId?: string }> => {
            const body = videoFile.slice(startByte, endByte);
            const contentRange = `bytes ${startByte}-${endByte - 1}/${totalSize}`;
            let response: Response;
            try {
              response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/octet-stream',
                  'Content-Length': String(endByte - startByte),
                  'Content-Range': contentRange,
                },
                body,
              });
            } catch (networkErr: any) {
              if (attempt < 5) {
                await sleep(250 * Math.pow(2, attempt));
                return putChunk(startByte, endByte, attempt + 1);
              }
              throw new Error(networkErr?.message || 'Network error during upload');
            }

            // Update progress (10-90%) using acknowledged endByte
            const acknowledged = Math.min(endByte, totalSize);
            const progressPercent = Math.min(90, 10 + Math.floor((acknowledged / totalSize) * 80));
            setUploadProgress(progressPercent);

            if (response.status === 308) {
              const rangeHeader = response.headers.get('Range');
              if (rangeHeader) {
                const match = rangeHeader.match(/bytes=0-(\d+)/);
                const lastByte = match ? parseInt(match[1], 10) : endByte - 1;
                const nextStart = lastByte + 1;
                if (nextStart < endByte) {
                  // Server only accepted partial chunk; resend remaining part
                  return putChunk(nextStart, endByte, attempt);
                }
                return { nextStart, finished: false };
              }

              // Missing Range; probe current position
              const probed = await probePosition();
              if (probed !== null) {
                if (probed < endByte) {
                  return putChunk(probed, endByte, attempt);
                }
                return { nextStart: probed, finished: false };
              }

              // Fallback advance by chunk size
              return { nextStart: endByte, finished: false };
            }

            if (response.status === 200 || response.status === 201) {
              const videoData = await response.json();
              const videoId = videoData?.id;
              if (!videoId) {
                throw new Error('Failed to get video ID from YouTube');
              }
              return { nextStart: totalSize, finished: true, videoId };
            }

            // Retry on 5xx
            if (response.status >= 500 && attempt < 5) {
              await sleep(250 * Math.pow(2, attempt));
              return putChunk(startByte, endByte, attempt + 1);
            }

            const errBody = await response.text().catch(() => '');
            throw new Error(`Upload failed with status ${response.status}: ${errBody?.slice(0, 200)}`);
          };

          while (start < totalSize) {
            const end = Math.min(start + chunkSize, totalSize);
            const result = await putChunk(start, end);
            if (result.finished) {
              youtubeUrl = `https://www.youtube.com/watch?v=${result.videoId}`;
              setUploadProgress(90);
              break;
            }
            start = result.nextStart;
          }

          if (!youtubeUrl) {
            throw new Error('Upload incomplete - failed to complete chunked upload');
          }

          // Now submit the YouTube URL to speeches
          setUploadProgress(95);

          response = await fetch('/api/speeches/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ speech_url: youtubeUrl }),
          });

          setUploadProgress(100);
        } catch (fetchError: any) {
          if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('SSL') || fetchError.message?.includes('ERR_SSL')) {
            setError('Connection error during upload - this can happen with large files. Please try again or use a smaller file.');
          } else {
            setError(fetchError.message || 'Failed to upload video to YouTube');
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

