'use client';

import { Message } from '@/lib/api';
import { SourceCard } from './SourceCard';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
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

  return (
    <div className="flex gap-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex-shrink-0" />
      <div className="pt-0.5 flex-1">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{message.content}</p>

        {sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Sources</p>
            </div>
            <div className="space-y-2">
              {sources.map((source, index) => (
                <SourceCard key={index} source={source} index={index} />
              ))}
            </div>
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
