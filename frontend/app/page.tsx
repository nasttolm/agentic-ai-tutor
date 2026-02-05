'use client';

import { useState, useEffect, useRef } from 'react';
import { api, Message, Subject, Source } from '@/lib/api';
import { ChatMessage, LoadingMessage, SourceCard, SubjectTabs, ChatInput } from './components';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentState.messages, currentState.loading]);

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
      <SubjectTabs
        subjects={subjects}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

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
                <ChatMessage key={index} message={message} />
              ))}
              {currentState.loading && <LoadingMessage />}
              <div ref={messagesEndRef} />
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
      <ChatInput
        value={currentState.input}
        onChange={(value) => updateTabState(activeTab, { input: value })}
        onSend={handleSend}
        disabled={currentState.loading}
      />
    </div>
  );
}
