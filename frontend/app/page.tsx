'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api, Message, Subject } from '@/lib/api';
import { ChatMessage, LoadingMessage, SubjectTabs, ChatInput } from './components';

interface TabState {
  messages: Message[];
  input: string;
  loading: boolean;
}

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TTS state
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [loadingAudioIndex, setLoadingAudioIndex] = useState<number | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load TTS preference from localStorage (client-side only)
  useEffect(() => {
    setTtsEnabled(localStorage.getItem('ttsEnabled') === 'true');
  }, []);

  useEffect(() => {
    api.getSubjects().then((data) => {
      setSubjects(data);
      if (data.length > 0) {
        setActiveTab(data[0].id);
        const initialStates: Record<string, TabState> = {};
        data.forEach((subject) => {
          initialStates[subject.id] = {
            messages: [],
            input: '',
            loading: false,
          };
        });
        setTabStates(initialStates);
      }
    }).catch(console.error);
  }, []);

  const currentState = tabStates[activeTab] || { messages: [], input: '', loading: false };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentState.messages, currentState.loading]);

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setPlayingIndex(null);
    setLoadingAudioIndex(null);
  }, []);

  const playAudio = useCallback(async (text: string, subject: string, index: number) => {
    // Toggle off if already playing this message
    if (playingIndex === index) {
      stopCurrentAudio();
      return;
    }
    stopCurrentAudio();
    setLoadingAudioIndex(index);
    try {
      const blob = await api.tts(text, subject);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      setLoadingAudioIndex(null);
      setPlayingIndex(index);
      audio.onended = () => {
        setPlayingIndex(null);
        URL.revokeObjectURL(url);
        currentAudioRef.current = null;
      };
      audio.play();
    } catch {
      setLoadingAudioIndex(null);
      setPlayingIndex(null);
    }
  }, [playingIndex, stopCurrentAudio]);

  const toggleTts = () => {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    localStorage.setItem('ttsEnabled', String(next));
    if (!next) stopCurrentAudio();
  };

  const handleTabChange = (tabId: string) => {
    stopCurrentAudio();
    setActiveTab(tabId);
  };

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
        sources: response.sources,
      };

      const updatedMessages = [...newMessages, assistantMessage];
      updateTabState(activeTab, {
        messages: updatedMessages,
        loading: false,
      });

      if (ttsEnabled) {
        playAudio(response.answer, activeTab, newMessages.length);
      }
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
        onTabChange={handleTabChange}
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
                <ChatMessage
                  key={index}
                  message={message}
                  isPlaying={playingIndex === index}
                  isLoadingAudio={loadingAudioIndex === index}
                  onPlayAudio={
                    message.role === 'assistant'
                      ? () => playAudio(message.content, activeTab, index)
                      : undefined
                  }
                />
              ))}
              {currentState.loading && <LoadingMessage />}
              <div ref={messagesEndRef} />
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
        ttsEnabled={ttsEnabled}
        onToggleTts={toggleTts}
      />
    </div>
  );
}
