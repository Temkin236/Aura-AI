/**
 * Browser Speech Synthesis (TTS) & Speech Recognition (STT) for AURA AI
 */

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Strips markdown symbols so speech synthesis sounds natural and fluid
 */
export function sanitizeMarkdownForSpeech(md: string): string {
  if (!md) return '';
  return md
    .replace(/```[\s\S]*?```/g, 'Code block omitted.') // Replace big code blocks
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/^#+\s+/gm, '') // Headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/[*_~]{1,3}/g, '') // Bold, italics, strikethrough
    .replace(/^>\s+/gm, '') // Blockquotes
    .replace(/^[-*•]\s+/gm, '') // Bullet lists
    .replace(/^\d+\.\s+/gm, '') // Numbered lists
    .replace(/\|.*\|/g, '') // Tables
    .trim();
}

class SpeechController {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private recognitionInstance: any = null;

  /**
   * Speak response using the best available natural voice
   */
  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: () => void
  ) {
    if (!isSpeechSynthesisSupported()) {
      onError?.();
      return;
    }

    this.stopSpeaking();

    const cleanText = sanitizeMarkdownForSpeech(text);
    if (!cleanText) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;

    // Select natural sounding voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Daniel') ||
          v.name.includes('Serena'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 0.98;

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        this.currentUtterance = null;
        onError?.();
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis.speaking
      : false;
  }

  /**
   * Start speech recognition for voice typing
   */
  public startListening(
    onResult: (transcript: string) => void,
    onError: (err: any) => void,
    onEnd: () => void
  ): () => void {
    if (!isSpeechRecognitionSupported()) {
      onError(new Error('Speech recognition is not supported in this browser.'));
      return () => {};
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    this.recognitionInstance = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      onResult(finalTranscript);
    };

    recognition.onerror = (event: any) => {
      onError(event.error);
    };

    recognition.onend = () => {
      this.recognitionInstance = null;
      onEnd();
    };

    try {
      recognition.start();
    } catch (e) {
      onError(e);
    }

    return () => {
      try {
        recognition.stop();
      } catch {}
      this.recognitionInstance = null;
    };
  }

  public stopListening() {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch {}
      this.recognitionInstance = null;
    }
  }
}

export const speechController = new SpeechController();
