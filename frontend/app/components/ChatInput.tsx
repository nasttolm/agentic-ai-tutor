'use client';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
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
