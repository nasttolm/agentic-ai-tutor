declare module '@met4citizen/talkinghead' {
  export class TalkingHead {
    constructor(node: HTMLElement, options?: Record<string, unknown>);
    showAvatar(options: Record<string, unknown>): Promise<void>;
    speakAudio(audio: unknown, options?: Record<string, unknown>, onSubtitle?: (word: string) => void): void;
    speakText(text: string, options?: Record<string, unknown>, onSubtitle?: (word: string) => void): void;
    stopSpeaking(): void;
  }
}

declare module '@met4citizen/headtts' {
  export class HeadTTS {
    constructor(options?: Record<string, unknown>);
    connect(onprogress?: (e: ProgressEvent) => void): Promise<void>;
    setup(options: Record<string, unknown>): void;
    synthesize(options: { input: string }): void;
    onmessage: ((message: { type: string; data: unknown }) => void) | null;
    onend: (() => void) | null;
  }
}
