'use client';

import { useState, useEffect } from 'react';
import { api, Message, Source, Subject } from '@/lib/api';

function SourceCard({ source, index }: { source: Source; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-gray-50 rounded-lg overflow-hidden transition-all duration-200 hover:bg-gray-100"
    >
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

interface TabState {
  messages: Message[];
  sources: Source[];
  input: string;
  loading: boolean;
}

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({});

  useEffect(() => {
    api.getSubjects().then((data) => {
      setSubjects(data);
      if (data.length > 0) {
        setActiveTab(data[0].id);
        const initialStates: Record<string, TabState> = {};
        data.forEach((subject) => {
          initialStates[subject.id] = {
            messages: [],
            sources: [],
            input: '',
            loading: false,
          };
        });
        setTabStates(initialStates);
      }
    }).catch(console.error);
  }, []);

  const currentState = tabStates[activeTab] || { messages: [], sources: [], input: '', loading: false };

  const updateTabState = (subjectId: string, updates: Partial<TabState>) => {
    setTabStates((prev) => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], ...updates },
    }));
  };

  const handleSend = async () => {
    const { input, loading, messages } = currentState;
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];

    updateTabState(activeTab, {
      messages: newMessages,
      input: '',
      loading: true,
    });

    try {
      const response = await api.chat({
        subject: activeTab,
        question: input,
        messages: messages,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
      };

      updateTabState(activeTab, {
        messages: [...newMessages, assistantMessage],
        sources: response.sources,
        loading: false,
      });
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error. Please try again.',
      };
      updateTabState(activeTab, {
        messages: [...newMessages, errorMessage],
        loading: false,
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="max-w-3xl mx-auto flex justify-center">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => setActiveTab(subject.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === subject.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {subject.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className={`max-w-3xl mx-auto px-6 ${currentState.messages.length === 0 ? 'h-full flex flex-col' : 'py-4'}`}>
          {currentState.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full -mt-16">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mb-6" />
              <h1 className="text-3xl font-semibold text-gray-800 mb-2">AI Tutor</h1>
              <p className="text-gray-400">What would you like to know?</p>
            </div>
          ) : (
            <div className="space-y-8">
              {currentState.messages.map((message, index) => (
                <div key={index} className={message.role === 'user' ? 'flex justify-end' : ''}>
                  {message.role === 'assistant' && (
                    <div className="flex gap-4">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex-shrink-0" />
                      <div className="pt-0.5">
                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  )}
                  {message.role === 'user' && (
                    <div className="bg-gray-100 px-4 py-2.5 rounded-2xl max-w-2xl">
                      <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}
                </div>
              ))}
              {currentState.loading && (
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
              )}
            </div>
          )}

          {/* Sources */}
          {currentState.sources.length > 0 && currentState.sources.some(s => s.file) && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Sources</p>
              </div>
              <div className="space-y-2">
                {currentState.sources
                  .filter(source => source.file)
                  .map((source, index) => (
                    <SourceCard key={index} source={source} index={index} />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-center bg-gray-100 rounded-2xl">
            <input
              type="text"
              value={currentState.input}
              onChange={(e) => updateTabState(activeTab, { input: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Message AI Tutor..."
              disabled={currentState.loading}
              className="flex-1 bg-transparent px-5 py-4 focus:outline-none placeholder-gray-400 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={currentState.loading || !currentState.input.trim()}
              className="mr-2 p-2 rounded-xl bg-gray-900 text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors hover:bg-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
