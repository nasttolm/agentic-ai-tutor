'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

export interface TalkingHeadAvatarHandle {
  speak: (text: string) => boolean;
  pause: () => void;
  stop: () => void;
}

interface TalkingHeadAvatarProps {
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

export const TalkingHeadAvatar = forwardRef<TalkingHeadAvatarHandle, TalkingHeadAvatarProps>(
  function TalkingHeadAvatar({ onSpeakStart, onSpeakEnd }, ref) {
    const mountRef = useRef<HTMLDivElement>(null);
    const headRef = useRef<any>(null);
    const headttsRef = useRef<any>(null);
    const playbackTokenRef = useRef(0);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [statusMsg, setStatusMsg] = useState('Initialising...');

    useImperativeHandle(ref, () => ({
      speak: (text: string) => {
        const tts = headttsRef.current;
        if (!tts) return false;
        try {
          // Invalidate any previous stream and tag this synthesis with a token.
          // Incoming audio chunks with stale token are ignored in onmessage.
          playbackTokenRef.current += 1;
          const token = playbackTokenRef.current;
          tts.clear?.();
          headRef.current?.stopSpeaking?.();
          tts.synthesize({ input: text, userData: { token } });
          return true;
        } catch (e) {
          console.error('[TalkingHeadAvatar] speak error:', e);
          return false;
        }
      },
      pause: () => {
        playbackTokenRef.current += 1;
        headttsRef.current?.clear?.();
        headRef.current?.pauseSpeaking?.();
        onSpeakEnd?.();
      },
      stop: () => {
        playbackTokenRef.current += 1;
        headttsRef.current?.clear?.();
        headRef.current?.stopSpeaking?.();
        onSpeakEnd?.();
      },
    }), [onSpeakEnd]);

    useEffect(() => {
      if (!mountRef.current) return;
      let cancelled = false;

      const init = async () => {
        try {
          setStatusMsg('Loading 3D engine...');
          const { TalkingHead } = await import('@met4citizen/talkinghead');
          if (cancelled) return;

          const head = new TalkingHead(mountRef.current!, {
            cameraView: 'head',
            cameraDistance: 0.5,
            lipsyncModules: ['en'],
          });
          headRef.current = head;

          setStatusMsg('Loading avatar...');
          await head.showAvatar({
            url: '/avatar.glb',
            body: 'F',
            avatarMood: 'neutral',
            lipsyncLang: 'en',
            baseline: {
              headRotateX: -0.05,
              eyeBlinkLeft: 0.15,
              eyeBlinkRight: 0.15,
            },
          });
          if (cancelled) return;

          setStatusMsg('Loading speech model...');
          const { HeadTTS } = await import('@met4citizen/headtts');
          if (cancelled) return;

          const headtts = new HeadTTS({
            // workerModule bypasses import.meta.url resolution in webpack bundles:
            // HeadTTS creates a blob `import "<workerModule>"` worker instead.
            workerModule: `${window.location.origin}/headtts/modules/worker-tts.mjs`,
            dictionaryURL: `${window.location.origin}/headtts/dictionaries`,
            endpoints: ['webgpu', 'wasm'],
            languages: ['en-us'],
            voices: ['af_bella'],
          });

          let speakStartFired = false;
          headtts.onmessage = (message: any) => {
            if (message.type === 'audio') {
              const msgToken = message?.userData?.token;
              if (msgToken !== playbackTokenRef.current) {
                return;
              }
              if (!speakStartFired) {
                speakStartFired = true;
                onSpeakStart?.();
              }
              try {
                head.speakAudio(message.data);
              } catch (e) {
                console.error('[TalkingHeadAvatar] speakAudio error:', e);
              }
            }
          };
          headtts.onend = () => {
            speakStartFired = false;
            // headtts.onend fires when synthesis finishes, but TalkingHead may
            // still be playing queued audio. Poll isSpeaking until playback ends.
            const poll = setInterval(() => {
              if (!headRef.current?.isSpeaking) {
                clearInterval(poll);
                onSpeakEnd?.();
              }
            }, 100);
          };

          await headtts.connect((e: any) => {
            if (e?.loaded && e?.total) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setStatusMsg(`Loading speech model... ${pct}%`);
            }
          });
          // Keep lip-sync tuning in supported HeadTTS setup options.
          // Small offsets help reduce "pre-opened mouth" without patching engine internals.
          headtts.setup({ voice: 'af_bella', speed: 1, deltaStart: -4, deltaEnd: 8 });
          headttsRef.current = headtts;

          if (!cancelled) {
            setStatus('ready');
          }
        } catch (e) {
          console.error('[TalkingHeadAvatar] init error:', e);
          if (!cancelled) {
            setStatus('error');
            setStatusMsg(e instanceof Error ? e.message : 'Failed to load');
          }
        }
      };

      init();

      return () => {
        cancelled = true;
        playbackTokenRef.current += 1;
        headttsRef.current?.clear?.();
        headRef.current?.stopSpeaking?.();
      };
    }, []);

    return (
      <div className="relative w-full h-full">
        <div ref={mountRef} className="w-full h-full" />
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-2xl">
            <span className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span className="text-xs text-white/80 mt-2 text-center px-2">{statusMsg}</span>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-2xl">
            <span className="text-xs text-white/70 text-center px-3">Avatar unavailable</span>
            <span className="text-xs text-white/40 mt-1 text-center px-3">{statusMsg}</span>
          </div>
        )}
      </div>
    );
  }
);
