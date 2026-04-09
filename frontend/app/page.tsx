'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api, Message, Subject } from '@/lib/api';
import { ChatMessage, LoadingMessage, SubjectTabs, ChatInput } from './components';
import dynamic from 'next/dynamic';
import type { TalkingHeadAvatarHandle } from './components/TalkingHeadAvatar';

const TalkingHeadAvatar = dynamic(
  () => import('./components/TalkingHeadAvatar').then(m => m.TalkingHeadAvatar),
  { ssr: false }
);

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

  const [audioAutoPlayEnabled, setAudioAutoPlayEnabled] = useState(false);
  const [avatarVisible, setAvatarVisible] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [loadingAudioIndex, setLoadingAudioIndex] = useState<number | null>(null);
  const loadingAudioIndexRef = useRef<number | null>(null);
  const speakingIndexRef = useRef<number | null>(null);
  const avatarRef = useRef<TalkingHeadAvatarHandle>(null);

  useEffect(() => {
    speakingIndexRef.current = speakingIndex;
  }, [speakingIndex]);

  useEffect(() => {
    setAudioAutoPlayEnabled(localStorage.getItem('ttsEnabled') === 'true');
    setAvatarVisible(localStorage.getItem('avatarEnabled') === 'true');
  }, []);

  useEffect(() => {
    api.getSubjects().then((data) => {
      setSubjects(data);
      if (data.length > 0) {
        setActiveTab(data[0].id);
        const initialStates: Record<string, TabState> = {};
        data.forEach((subject) => {
          initialStates[subject.id] = { messages: [], input: '', loading: false };
        });
        setTabStates(initialStates);
      }
    }).catch(console.error);
  }, []);

  const currentState = tabStates[activeTab] || { messages: [], input: '', loading: false };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentState.messages, currentState.loading]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    avatarRef.current?.stop();
    setSpeakingIndex(null);
    setLoadingAudioIndex(null);
    loadingAudioIndexRef.current = null;
  }, []);

  const speakWithSystemTts = useCallback((text: string, index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => {
      setSpeakingIndex(index);
      setLoadingAudioIndex(null);
      loadingAudioIndexRef.current = null;
    };
    utterance.onend = () => {
      if (speakingIndexRef.current === index) {
        setSpeakingIndex(null);
      }
    };
    utterance.onerror = () => {
      if (speakingIndexRef.current === index) {
        setSpeakingIndex(null);
      }
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const startSpeaking = useCallback((text: string, index: number) => {
    setLoadingAudioIndex(index);
    loadingAudioIndexRef.current = index;

    // Use TalkingHead/HeadTTS as the primary audio engine regardless of avatar visibility.
    // Avatar visibility controls only rendering, not playback.
    const started = avatarRef.current?.speak(text);
    if (started) {
      return;
    }

    // Fallback is kept for rare cases where TalkingHead is not ready yet.
    speakWithSystemTts(text, index);
  }, [speakWithSystemTts]);

  const toggleMessageAudio = useCallback((text: string, index: number) => {
    if (speakingIndex === index || loadingAudioIndex === index) {
      stopSpeaking();
      return;
    }
    stopSpeaking();
    startSpeaking(text, index);
  }, [speakingIndex, loadingAudioIndex, stopSpeaking, startSpeaking]);

  const toggleTts = () => {
    const next = !audioAutoPlayEnabled;
    setAudioAutoPlayEnabled(next);
    localStorage.setItem('ttsEnabled', String(next));
    if (!next) stopSpeaking();
  };

  const toggleAvatar = () => {
    const next = !avatarVisible;
    setAvatarVisible(next);
    localStorage.setItem('avatarEnabled', String(next));
  };

  const handleTabChange = (tabId: string) => {
    stopSpeaking();
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

    updateTabState(activeTab, { messages: newMessages, input: '', loading: true });

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
      updateTabState(activeTab, { messages: updatedMessages, loading: false });

      if (audioAutoPlayEnabled) {
        const idx = newMessages.length;
        stopSpeaking();
        startSpeaking(response.answer, idx);
      }
    } catch (error) {
      console.error('Chat error:', error);
      updateTabState(activeTab, {
        messages: [...newMessages, { role: 'assistant', content: 'Sorry, there was an error. Please try again.' }],
        loading: false,
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <SubjectTabs subjects={subjects} activeTab={activeTab} onTabChange={handleTabChange} />

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
                  isPlaying={speakingIndex === index}
                  isLoadingAudio={loadingAudioIndex === index}
                  onPlayAudio={
                    message.role === 'assistant'
                      ? () => toggleMessageAudio(message.content, index)
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

      <div className={avatarVisible ? 'border-t border-gray-100 py-4 flex justify-center bg-white' : 'hidden'}>
        <div className="w-80 h-80 rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 relative -top-2">
          <TalkingHeadAvatar
            ref={avatarRef}
            onSpeakStart={() => {
              setSpeakingIndex(loadingAudioIndexRef.current);
              setLoadingAudioIndex(null);
              loadingAudioIndexRef.current = null;
            }}
            onSpeakEnd={() => setSpeakingIndex(null)}
          />
        </div>
      </div>

      <ChatInput
        value={currentState.input}
        onChange={(value) => updateTabState(activeTab, { input: value })}
        onSend={handleSend}
        disabled={currentState.loading}
        ttsEnabled={audioAutoPlayEnabled}
        onToggleTts={toggleTts}
        avatarEnabled={avatarVisible}
        onToggleAvatar={toggleAvatar}
      />
    </div>
  );
}
