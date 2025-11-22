'use client';

import { useState, useMemo } from 'react';

interface ShareSpeechModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechId: string;
}

export default function ShareSpeechModal({ isOpen, onClose, speechId }: ShareSpeechModalProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (!speechId) return '';
    // Get site URL from environment variable or construct from window.location
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : '');
    return `${siteUrl}/?speech=${speechId}`;
  }, [speechId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Failed to copy to clipboard. Please copy manually.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
      onClick={handleClose}
    >
      <div
        className="brutal-card p-6 sm:p-8 max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold mb-6" style={{ color: '#1a1a1a' }}>Share Speech</h2>

        <div className="mb-6">
          <label className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
            Shareable Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-4 py-2 brutal-border rounded-lg text-sm"
              style={{
                color: '#1a1a1a',
                backgroundColor: '#ffffff'
              }}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="brutal-button px-4 py-2 text-sm whitespace-nowrap"
              style={{
                backgroundColor: copied ? 'var(--success)' : 'var(--primary)',
                color: '#ffffff'
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {copied && (
            <p className="text-xs font-medium mt-2" style={{ color: 'var(--success)' }}>
              Link copied to clipboard!
            </p>
          )}
        </div>

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
      </div>
    </div>
  );
}

