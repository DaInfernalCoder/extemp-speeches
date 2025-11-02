import React from 'react';

/**
 * Parses text and converts URLs to clickable React link elements
 * Detects URLs starting with http://, https://, or www.
 * 
 * @param text - The text to parse for URLs
 * @returns Array of React elements (text nodes and anchor elements)
 */
export function parseLinks(text: string): React.ReactNode[] {
  if (!text) return [];

  // URL pattern: matches http://, https://, or www. followed by valid URL characters
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = urlPattern.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Extract the matched URL
    let url = match[0];
    
    // If URL starts with www., prepend https://
    if (url.toLowerCase().startsWith('www.')) {
      url = `https://${url}`;
    }

    // Create anchor element
    parts.push(
      <a
        key={`link-${match.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold hover:underline transition-colors"
        style={{ color: 'var(--primary)' }}
      >
        {match[0]}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // If no URLs were found, return the original text
  if (parts.length === 0) {
    return [text];
  }

  return parts;
}

