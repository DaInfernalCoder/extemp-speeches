'use client';

import { useState } from 'react';
import * as tus from 'tus-js-client';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { hasYouTubeUploadScope, requestYouTubeUploadAuth } from '@/lib/youtube-auth';

interface SpeechSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type SubmissionType = 'video' | 'audio' | 'youtube-link';
type UploadDestination = 'cloudflare' | 'youtube';

export default function SpeechSubmitModal({ isOpen, onClose, onSuccess }: SpeechSubmitModalProps) {
  const [submissionType, setSubmissionType] = useState<SubmissionType>('video');
  const [uploadDestination, setUploadDestination] = useState<UploadDestination>('cloudflare');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const supabase = createClient();

  // Validate YouTube URL format
  const isValidYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  // Helper function to upload with XMLHttpRequest for real progress tracking
  const uploadWithProgress = (
    url: string,
    formData: FormData | null,
    jsonData: object | null,
    onProgress: (progress: number) => void,
    headers?: Record<string, string>,
    withCredentials: boolean = true
  ): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track real upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Simulate a Response object
          const response = new Response(xhr.responseText, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers({ 'content-type': 'application/json' }),
          });
          resolve(response);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.onabort = () => reject(new Error('Upload aborted'));

      xhr.open('POST', url);

      // Set custom headers if provided
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }

      // Set credentials (default to true for backward compatibility)
      xhr.withCredentials = withCredentials;

      if (jsonData) {
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(jsonData));
      } else if (formData) {
        xhr.send(formData);
      } else {
        xhr.send();
      }
    });
  };

  // Helper function for YouTube resumable chunk uploads via server proxy
  const uploadYouTubeChunk = async (
    resumableUploadUrl: string,
    chunk: Blob,
    contentRange: string,
    contentType: string,
    onProgress: (progress: number) => void
  ): Promise<Response> => {
    // Log upload details
    const urlParts = resumableUploadUrl.split('?');
    const baseUrl = urlParts[0];
    const queryParams = urlParts[1] ? urlParts[1].substring(0, 50) + '...' : '';
    console.log('[DEBUG] YouTube chunk upload via proxy:', {
      url: `${baseUrl}?${queryParams}`,
      contentRange,
      contentType,
      chunkSize: chunk.size,
    });

    // Convert blob to base64 for transmission through our API
    const base64Promise = new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(chunk);
    });

    try {
      const chunkDataBase64 = await base64Promise;

      // Upload via our proxy endpoint
      const response = await fetch('/api/youtube/upload-chunk', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunkData: chunkDataBase64,
          resumableUploadUrl,
          contentRange,
          contentType,
        }),
      });

      // Report progress (we simulate 100% since chunk is already uploaded to our server)
      onProgress(100);

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Upload failed (status ${response.status})`);
      }

      // Create Response with Range header if present (from response body)
      const responseHeaders = new Headers();
      if (responseData.rangeHeader) {
        responseHeaders.set('Range', responseData.rangeHeader);
      }

      // If upload is complete, include video data
      if (responseData.status === 200 && responseData.videoData) {
        return new Response(JSON.stringify(responseData.videoData), {
          status: 200,
          headers: responseHeaders,
        });
      }

      // Return response with status
      return new Response('', {
        status: responseData.status || 308,
        headers: responseHeaders,
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('[DEBUG] YouTube chunk upload proxy error:', error);
      throw new Error(err.message || 'Failed to upload chunk');
    }
  };

  // Helper function for Supabase Storage uploads (PUT with ArrayBuffer)
  const uploadToSupabaseStorage = (
    signedUrl: string,
    file: File,
    onProgress: (progress: number) => void
  ): Promise<Response> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Convert file to ArrayBuffer (required by Supabase Storage)
        const arrayBuffer = await file.arrayBuffer();

        const xhr = new XMLHttpRequest();

        // Track real upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Simulate a Response object
            const response = new Response(xhr.responseText || '', {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers({ 'content-type': xhr.getResponseHeader('content-type') || 'application/json' }),
            });
            resolve(response);
          } else {
            // Try to parse error response
            let errorMessage = `Upload failed with status ${xhr.status}`;
            try {
              const errorData = JSON.parse(xhr.responseText);
              if (errorData.error || errorData.message) {
                errorMessage = errorData.error || errorData.message;
              }
            } catch {
              // If response isn't JSON, use default message
            }
            reject(new Error(errorMessage));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.onabort = () => reject(new Error('Upload aborted'));

        // Use PUT method (required by Supabase Storage signed URLs)
        xhr.open('PUT', signedUrl);

        // Set Content-Type header (important for Supabase Storage)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        // Don't send credentials (signed URL contains auth)
        xhr.withCredentials = false;

        // Send ArrayBuffer as body
        xhr.send(arrayBuffer);
      } catch (error: unknown) {
        const err = error as { message?: string };
        reject(new Error(err.message || 'Failed to prepare file for upload'));
      }
    });
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
        const errorMessage = 'You must be logged in to submit a speech';
        setError(errorMessage);
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      let response;
      let streamVideoUrl = '';

      if (submissionType === 'video') {
        // Upload video to Cloudflare Stream or YouTube
        if (!videoFile) {
          const errorMessage = 'Please select a video file';
          setError(errorMessage);
          toast.error(errorMessage);
          setLoading(false);
          return;
        }

        // Validate file size (1.5 GB)
        const maxSize = 1.5 * 1024 * 1024 * 1024;
        if (videoFile.size > maxSize) {
          const errorMessage = 'Video file must be less than 1.5 GB';
          setError(errorMessage);
          toast.error(errorMessage);
          setLoading(false);
          return;
        }

        // Check YouTube authentication if YouTube is selected
        if (uploadDestination === 'youtube') {
          const hasScope = await hasYouTubeUploadScope();
          if (!hasScope) {
            setShowAuthPopup(true);
            setLoading(false);
            return;
          }
        }

        // Initialize upload (Cloudflare Stream or YouTube)
        setUploadProgress(5);

        // YouTube upload flow
        if (uploadDestination === 'youtube') {
          try {
            // Step 1: Initialize YouTube resumable upload
            const initResponse = await fetch('/api/youtube/init', {
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
            console.log('[DEBUG] /api/youtube/init response:', { status: initResponse.status, data: initData });

            if (!initResponse.ok) {
              const errorMessage = initData.error || 'Failed to initialize YouTube upload';
              setError(errorMessage);
              toast.error(errorMessage);
              setLoading(false);
              return;
            }

            const resumableUploadUrl = initData.upload_url;
            setUploadProgress(10);
            
            console.log('[DEBUG] Before YouTube chunk upload loop:', {
              resumableUploadUrl: resumableUploadUrl.substring(0, 100) + '...',
              fileSize: videoFile.size,
              fileName: videoFile.name,
              fileType: videoFile.type,
            });

            // Step 2: Upload video to YouTube using resumable protocol
            // YouTube resumable upload: upload in chunks and track progress
            const chunkSize = 256 * 1024; // 256KB chunks
            let bytesUploaded = 0;
            let youtubeVideoId = '';

            console.log('[DEBUG] YouTube upload strategy:', {
              chunkSize,
              totalChunks: Math.ceil(videoFile.size / chunkSize),
              contentRangeFormat: `bytes ${bytesUploaded}-${Math.min(chunkSize - 1, videoFile.size - 1)}/${videoFile.size}`,
            });

            while (bytesUploaded < videoFile.size) {
              const chunk = videoFile.slice(bytesUploaded, Math.min(bytesUploaded + chunkSize, videoFile.size));
              const chunkEnd = bytesUploaded + chunk.size - 1;

              // Determine Content-Range header
              const contentRange = `bytes ${bytesUploaded}-${chunkEnd}/${videoFile.size}`;

              try {
                const chunkResponse = await uploadYouTubeChunk(
                  resumableUploadUrl,
                  chunk,
                  contentRange,
                  videoFile.type,
                  (chunkProgress) => {
                    // Scale progress from 10-90% during upload
                    const totalProgress = bytesUploaded + (chunkProgress / 100) * chunk.size;
                    const scaledProgress = 10 + Math.floor((totalProgress / videoFile.size) * 80);
                    setUploadProgress(Math.min(90, scaledProgress));
                  }
                );

                // Check if we need to resume (308 Resume Incomplete)
                if (chunkResponse.status === 308) {
                  const rangeHeader = chunkResponse.headers.get('Range');
                  if (rangeHeader) {
                    // Extract uploaded bytes from Range header (e.g., "bytes=0-12345")
                    const match = rangeHeader.match(/bytes=0-(\d+)/);
                    if (match) {
                      bytesUploaded = parseInt(match[1]) + 1;
                      continue; // Resume from where we left off
                    }
                  }
                }

                // If upload is complete (200), get the video ID
                if (chunkResponse.status === 200) {
                  const videoData = await chunkResponse.json();
                  youtubeVideoId = videoData.id;
                  setUploadProgress(90);
                  break;
                }

                // Move to next chunk
                bytesUploaded = chunkEnd + 1;
              } catch (chunkError: unknown) {
                const error = chunkError as { message?: string };
                
                // Enhanced error logging
                const isCorsError = error.message?.includes('CORS') || 
                                   error.message?.includes('network error') ||
                                   error.message?.includes('Access-Control-Allow-Origin');
                const isAuthError = error.message?.includes('authentication') || 
                                error.message?.includes('401') ||
                                error.message?.includes('sign in again');
                
                console.error('[DEBUG] YouTube chunk upload error:', {
                  errorMessage: error.message,
                  bytesUploaded,
                  totalBytes: videoFile.size,
                  isCorsError,
                  isAuthError,
                });
                
                // Check if it's an API rejection (403, 429, 503) - don't try to resume
                const isApiRejection = error.message?.includes('rejected') || 
                                       error.message?.includes('rate limit') || 
                                       error.message?.includes('unavailable') ||
                                       error.message?.includes('quota');
                
                // Only try to resume if it's not an API rejection and we have progress
                if (!isApiRejection && bytesUploaded > 0) {
                  // Check upload status before resuming via proxy
                  try {
                    // Send empty chunk with Content-Range: bytes */{total} to check status
                    const emptyChunk = new Blob([]);
                    const statusResponse = await uploadYouTubeChunk(
                      resumableUploadUrl,
                      emptyChunk,
                      `bytes */${videoFile.size}`,
                      videoFile.type,
                      () => {}
                    );

                    if (statusResponse.status === 308) {
                      const rangeHeader = statusResponse.headers.get('Range');
                      if (rangeHeader) {
                        const match = rangeHeader.match(/bytes=0-(\d+)/);
                        if (match) {
                          bytesUploaded = parseInt(match[1]) + 1;
                          continue; // Resume from where we left off
                        }
                      }
                    }
                  } catch (statusError) {
                    console.error('[DEBUG] Status check failed:', statusError);
                    // If status check fails, throw original error
                  }
                }

                // If API rejection, show error and stop
                if (isApiRejection) {
                  const errorMessage = error.message || 'YouTube rejected the upload';
                  setError(errorMessage);
                  toast.error(errorMessage);
                  setLoading(false);
                  return;
                }

                // Otherwise, show error and throw
                const errorMessage = error.message || `Upload failed at byte ${bytesUploaded}`;
                toast.error(errorMessage);
                throw new Error(errorMessage);
              }
            }

            if (!youtubeVideoId) {
              throw new Error('Failed to get YouTube video ID from upload response');
            }

            // Construct YouTube watch URL
            streamVideoUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
            setUploadProgress(95);

            // Submit YouTube URL to speeches API
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
            let errorMessage = '';
            if (error.message?.includes('Failed to fetch') || error.message?.includes('SSL') || error.message?.includes('ERR_SSL')) {
              errorMessage = 'Connection error during upload - this can happen with large files. Please try again or use a smaller file.';
            } else {
              errorMessage = error.message || 'Failed to upload video to YouTube';
            }
            setError(errorMessage);
            toast.error(errorMessage);
            setLoading(false);
            return;
          }
        } else {
          // Cloudflare Stream upload flow (existing code)
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
            const errorMessage = initData.error || 'Failed to initialize Cloudflare Stream upload';
            setError(errorMessage);
            toast.error(errorMessage);
            setLoading(false);
            return;
          }

          setUploadProgress(5);

          // Upload file directly to Cloudflare Stream
          // Raw video files are uploaded - Cloudflare handles encoding server-side
          const uploadUrl = initData.upload_url;
          const uploadType = initData.upload_type;
          const videoUid = initData.uid; // For direct uploads, UID is provided immediately

          if (uploadType === 'direct' && videoUid) {
            // Direct upload for files <=200MB with real progress tracking
            const formData = new FormData();
            formData.append('file', videoFile);

            const uploadResponse = await uploadWithProgress(
              uploadUrl,
              formData,
              null,
              (progress) => {
                // Scale progress from 5-90% during upload
                const scaledProgress = 5 + Math.floor((progress / 100) * 85);
                setUploadProgress(scaledProgress);
              },
              undefined,
              false // Don't send credentials to Cloudflare Stream
            );

            if (!uploadResponse.ok) {
              let errorMessage = 'Failed to upload video to Cloudflare Stream';
              
              // Check for API rejection errors
              if (uploadResponse.status === 403 || uploadResponse.status === 402) {
                errorMessage = 'Cloudflare Stream quota exceeded. Please try again later or use YouTube instead.';
              } else if (uploadResponse.status === 429) {
                errorMessage = 'Cloudflare API rate limit exceeded. Please wait a few minutes and try again.';
              } else if (uploadResponse.status === 503) {
                errorMessage = 'Cloudflare Stream service is temporarily unavailable. Please try again in a few minutes.';
              }
              
              setError(errorMessage);
              toast.error(errorMessage);
              setLoading(false);
              return;
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
                  // Update progress (5-90%)
                  const progress = Math.min(90, 5 + Math.floor((bytesUploaded / bytesTotal) * 85));
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
                  let errorMessage = `Upload failed: ${error.message}`;
                  
                  // Check for API rejection in error message
                  if (error.message.includes('403') || error.message.includes('quota') || error.message.includes('limit')) {
                    errorMessage = 'Cloudflare Stream quota exceeded. Please try again later or use YouTube instead.';
                  } else if (error.message.includes('429')) {
                    errorMessage = 'Cloudflare API rate limit exceeded. Please wait a few minutes and try again.';
                  } else if (error.message.includes('503')) {
                    errorMessage = 'Cloudflare Stream service is temporarily unavailable. Please try again in a few minutes.';
                  }
                  
                  setError(errorMessage);
                  toast.error(errorMessage);
                  setLoading(false);
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
          let errorMessage = '';
          if (error.message?.includes('Failed to fetch') || error.message?.includes('SSL') || error.message?.includes('ERR_SSL')) {
            errorMessage = 'Connection error during upload - this can happen with large files. Please try again or use a smaller file.';
          } else {
            errorMessage = error.message || 'Failed to upload video to Cloudflare Stream';
          }
          setError(errorMessage);
          toast.error(errorMessage);
          setLoading(false);
          return;
          }
        }
      } else if (submissionType === 'audio') {
        // Upload audio file directly to Supabase Storage using signed URL
        if (!audioFile) {
          const errorMessage = 'Please select an audio file';
          setError(errorMessage);
          toast.error(errorMessage);
          setLoading(false);
          return;
        }

        // Validate file size (50 MB)
        const maxSize = 50 * 1024 * 1024;
        if (audioFile.size > maxSize) {
          const errorMessage = 'Audio file must be less than 50 MB';
          setError(errorMessage);
          toast.error(errorMessage);
          setLoading(false);
          return;
        }

        // Step 1: Get signed upload URL from API
        setUploadProgress(5);

        let signedUrlResponse;
        try {
          signedUrlResponse = await fetch('/api/storage/signed-url', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName: audioFile.name,
              fileSize: audioFile.size,
              fileType: audioFile.type,
              bucket: 'speech-audio',
            }),
          });

          const signedUrlData = await signedUrlResponse.json();
          console.log('[DEBUG] /api/storage/signed-url response:', { status: signedUrlResponse.status, data: signedUrlData });

          if (!signedUrlResponse.ok) {
            console.error('[DEBUG] Signed URL generation failed:', signedUrlResponse.status, signedUrlData);
            const errorMessage = signedUrlData.error || 'Failed to initialize audio upload';
            setError(errorMessage);
            toast.error(errorMessage);
            setLoading(false);
            return;
          }

          setUploadProgress(10);

          // Step 2: Upload audio directly to Supabase Storage using signed URL
          const signedUrl = signedUrlData.signed_url;
          const publicUrl = signedUrlData.public_url;

          // Upload file using PUT method with ArrayBuffer (required by Supabase Storage)
          const uploadResponse = await uploadToSupabaseStorage(
            signedUrl,
            audioFile,
            (progress) => {
              // Scale progress from 10-90% during upload
              const scaledProgress = 10 + Math.floor((progress / 100) * 80);
              setUploadProgress(scaledProgress);
            }
          );

          if (!uploadResponse.ok) {
            const errorMessage = 'Failed to upload audio to Supabase Storage';
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }

          setUploadProgress(90);

          // Step 3: Submit the public URL to speeches API
          response = await fetch('/api/speeches/submit', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ speech_url: publicUrl }),
          });

          setUploadProgress(100);
        } catch (fetchError: unknown) {
          const error = fetchError as { message?: string };
          let errorMessage = '';
          if (error.message?.includes('Failed to fetch') || error.message?.includes('SSL') || error.message?.includes('ERR_SSL')) {
            errorMessage = 'Connection error during upload - this can happen with large files. Please try again or use a smaller file.';
          } else {
            errorMessage = error.message || 'Failed to upload audio file';
          }
          setError(errorMessage);
          toast.error(errorMessage);
          setLoading(false);
          return;
        }
      } else {
        // Submit YouTube link
        if (!youtubeUrl.trim()) {
          const errorMessage = 'Please enter a YouTube URL';
          setError(errorMessage);
          toast.error(errorMessage);
          setLoading(false);
          return;
        }

        // Validate YouTube URL format
        if (!isValidYouTubeUrl(youtubeUrl.trim())) {
          const errorMessage = 'Invalid YouTube URL format. Please provide a valid YouTube link (e.g., https://www.youtube.com/watch?v=...)';
          setError(errorMessage);
          toast.error(errorMessage);
          setLoading(false);
          return;
        }

        setUploadProgress(50);

        response = await uploadWithProgress(
          '/api/speeches/submit',
          null,
          { speech_url: youtubeUrl.trim() },
          (progress) => setUploadProgress(progress)
        );

        setUploadProgress(100);
      }

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to submit speech';
        setError(errorMessage);
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      // Success - show toast notification
      if (submissionType === 'audio') {
        toast.success('Audio uploaded successfully! Please wait 3-5 minutes for processing on the provider&apos;s servers.');
      } else if (submissionType === 'video') {
        toast.success(`Video uploaded successfully to ${uploadDestination === 'cloudflare' ? 'Cloudflare Stream' : 'YouTube'}! Please allow a few minutes for the video to process.`);
      } else {
        toast.success('Speech submitted successfully!');
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
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
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

  const handleAuthPopupConfirm = async () => {
    setIsCheckingAuth(true);
    try {
      const authUrl = await requestYouTubeUploadAuth();
      if (authUrl) {
        // Redirect to Google OAuth
        window.location.href = authUrl;
      } else {
        setError('Failed to start authentication. Please try again.');
        toast.error('Failed to start authentication');
        setShowAuthPopup(false);
        setIsCheckingAuth(false);
      }
    } catch (err) {
      console.error('Error requesting YouTube auth:', err);
      setError('Failed to start authentication. Please try again.');
      toast.error('Failed to start authentication');
      setShowAuthPopup(false);
      setIsCheckingAuth(false);
    }
  };

  const handleAuthPopupCancel = () => {
    setShowAuthPopup(false);
    setLoading(false);
  };

  const handleClose = () => {
    setVideoFile(null);
    setAudioFile(null);
    setYoutubeUrl('');
    setError('');
    setUploadProgress(0);
    setSubmissionType('video');
    setUploadDestination('cloudflare');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Auth Popup Modal */}
      {showAuthPopup && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-60"
          onClick={handleAuthPopupCancel}
        >
          <div
            className="brutal-card p-6 sm:p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-extrabold mb-4" style={{ color: '#1a1a1a' }}>
              YouTube Upload Permission Required
            </h2>
            <p className="text-sm mb-6" style={{ color: '#1a1a1a' }}>
              To upload videos to YouTube, you need to grant YouTube upload permissions. 
              You&apos;ll be redirected to sign in with Google and grant access.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleAuthPopupCancel}
                disabled={isCheckingAuth}
                className="brutal-button px-6 py-2 text-base disabled:opacity-50 bg-white"
                style={{
                  color: '#1a1a1a'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAuthPopupConfirm}
                disabled={isCheckingAuth}
                className="brutal-button px-6 py-2 text-base disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--secondary)',
                  color: '#1a1a1a'
                }}
              >
                {isCheckingAuth ? 'Redirecting...' : 'Sign In & Grant Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
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
              
              {/* Upload Destination Selection */}
              <div className="mt-4 mb-2">
                <label className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
                  Upload Destination
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadDestination('cloudflare')}
                    disabled={loading}
                    className="flex-1 px-4 py-3 brutal-border rounded-lg font-bold text-xs transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: uploadDestination === 'cloudflare' ? 'var(--primary)' : '#ffffff',
                      color: uploadDestination === 'cloudflare' ? '#ffffff' : '#1a1a1a',
                      boxShadow: uploadDestination === 'cloudflare' ? 'var(--shadow-brutal)' : '2px 2px 0px #000'
                    }}
                  >
                    Cloudflare
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadDestination('youtube')}
                    disabled={loading}
                    className="flex-1 px-4 py-3 brutal-border rounded-lg font-bold text-xs transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: uploadDestination === 'youtube' ? 'var(--primary)' : '#ffffff',
                      color: uploadDestination === 'youtube' ? '#ffffff' : '#1a1a1a',
                      boxShadow: uploadDestination === 'youtube' ? 'var(--shadow-brutal)' : '2px 2px 0px #000'
                    }}
                  >
                    YouTube
                  </button>
                </div>
              </div>
              
              <p className="text-xs mt-1" style={{ color: '#666' }}>
                Maximum file size: 1.5 GB. Video will be uploaded to {uploadDestination === 'cloudflare' ? 'Cloudflare Stream' : 'YouTube (unlisted)'}.
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
                    {uploadProgress < 50 ? `Uploading video to ${uploadDestination === 'cloudflare' ? 'Cloudflare Stream' : 'YouTube'} (this may take a while for large files)...` : uploadProgress < 70 ? 'Processing upload...' : 'Submitting speech...'} {uploadProgress}%
                  </p>
                  <p className="text-xs mt-2 text-center" style={{ color: '#666' }}>
                    You can leave this tab open - the upload will continue in the background
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
    </>
  );
}

