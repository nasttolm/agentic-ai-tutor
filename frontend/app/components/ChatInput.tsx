'use client';

import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  avatarEnabled: boolean;
  onToggleAvatar: () => void;
}

export function ChatInput({ value, onChange, onSend, disabled, ttsEnabled, onToggleTts, avatarEnabled, onToggleAvatar }: ChatInputProps) {
  return (
    <div className="px-6 py-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-center bg-gray-100 rounded-2xl">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
            placeholder="Message AI Tutor..."
            disabled={disabled}
            className="flex-1 bg-transparent px-5 py-4 focus:outline-none placeholder-gray-400 disabled:opacity-50"
          />
          {/* TTS toggle */}
          <button
            onClick={onToggleTts}
            title={ttsEnabled ? 'Auto-play ON' : 'Auto-play OFF'}
            className={`mr-1 p-2 rounded-xl transition-colors ${
              ttsEnabled ? 'text-violet-600 hover:bg-violet-100' : 'text-gray-400 hover:bg-gray-200'
            }`}
          >
            {ttsEnabled
              ? <SpeakerWaveIcon className="w-5 h-5" />
              : <SpeakerXMarkIcon className="w-5 h-5" />
            }
          </button>
          {/* Avatar toggle */}
          <button
            onClick={onToggleAvatar}
            title={avatarEnabled ? 'Avatar ON' : 'Avatar OFF'}
            className={`mr-1 p-2 rounded-xl transition-colors ${
              avatarEnabled ? 'text-violet-600 hover:bg-violet-100' : 'text-gray-400 hover:bg-gray-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
            </svg>
          </button>
          {/* Send */}
          <button
            onClick={onSend}
            disabled={disabled || !value.trim()}
            className="mr-2 p-2 rounded-xl bg-gray-900 text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors hover:bg-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
