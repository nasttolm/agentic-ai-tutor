'use client';

import { useState } from 'react';
import { SpeakerWaveIcon, StopIcon } from '@heroicons/react/24/solid';
import { Message } from '@/lib/api';
import { SourceCard } from './SourceCard';

interface ChatMessageProps {
  message: Message;
  isPlaying?: boolean;
  isLoadingAudio?: boolean;
  onPlayAudio?: () => void;
}

export function ChatMessage({ message, isPlaying, isLoadingAudio, onPlayAudio }: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-gray-100 px-4 py-2.5 rounded-2xl max-w-2xl">
          <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const sources = message.sources?.filter(s => s.file) || [];
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600" />
        {onPlayAudio && (
          <button
            onClick={onPlayAudio}
            disabled={isLoadingAudio}
            title={isPlaying ? 'Stop' : 'Listen'}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isPlaying
                ? 'text-violet-600 hover:bg-violet-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            {isLoadingAudio ? (
              <span className="block w-4 h-4 border border-gray-300 border-t-violet-500 rounded-full animate-spin" />
            ) : isPlaying ? (
              <StopIcon className="w-4 h-4" />
            ) : (
              <SpeakerWaveIcon className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      <div className="pt-0.5 flex-1">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{message.content}</p>

        {sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              className="flex items-center gap-2 text-left hover:opacity-70 transition-opacity"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Sources ({sources.length})
              </p>
              <svg
                className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${sourcesOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {sourcesOpen && (
              <div className="mt-3 space-y-2">
                {sources.map((source, index) => (
                  <SourceCard key={index} source={source} index={index} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function LoadingMessage() {
  return (
    <div className="flex gap-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex-shrink-0" />
      <div className="pt-1">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
