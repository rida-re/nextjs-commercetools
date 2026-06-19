/**
 * Custom hook for text-to-speech functionality
 * Handles audio queue management and TTS API calls
 */

import { useRef, useCallback } from 'react';

interface UseTextToSpeechOptions {
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  onError?: (error: string) => void;
}

export const useTextToSpeech = (options: UseTextToSpeechOptions = {}) => {
  const audioQueueRef = useRef<string[]>([]);
  const isProcessingAudioRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const { onSpeakStart, onSpeakEnd, onError } = options;

  const speak = useCallback(async (text: string) => {
    audioQueueRef.current.push(text);
    
    if (!isProcessingAudioRef.current) {
      await processAudioQueue();
    }
  }, []);

  const processAudioQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isProcessingAudioRef.current = false;
      onSpeakEnd?.();
      return;
    }

    isProcessingAudioRef.current = true;
    onSpeakStart?.();
    const text = audioQueueRef.current.shift()!;

    try {
      const res = await fetch("/api/murf/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error("TTS request failed");
      }

      const data = await res.json();
      if (!data?.audioUrl) {
        console.error("No audio returned from TTS", data);
        await processAudioQueue();
        return;
      }

      const audio = new Audio(data.audioUrl);
      currentAudioRef.current = audio;
      
      await audio.play();
      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
      });

      // Process next in queue
      await processAudioQueue();
    } catch (err) {
      console.error("TTS error:", err);
      onError?.("Speech synthesis failed");
      await processAudioQueue();
    }
  }, [onSpeakStart, onSpeakEnd, onError]);

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    audioQueueRef.current = [];
    isProcessingAudioRef.current = false;
  }, []);

  return { speak, stop, isPlaying: isProcessingAudioRef.current };
};
