'use client';

import { useState } from 'react';
import { Source } from '@/lib/api';

interface SourceCardProps {
  source: Source;
  index: number;
}

export function SourceCard({ source, index }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden transition-all duration-200 hover:bg-gray-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-start gap-3 text-left"
      >
        <span className="flex-shrink-0 w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xs font-semibold">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{source.file}</p>
          {!expanded && source.text && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{source.text}</p>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && source.text && (
        <div className="px-4 pb-3 pl-13">
          <div className="ml-9 p-3 bg-white rounded-md border border-gray-100">
            <p className="text-xs text-gray-600 leading-relaxed">{source.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
