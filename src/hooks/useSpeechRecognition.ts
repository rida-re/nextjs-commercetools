/**
 * Custom hook for speech recognition functionality
 * Handles Web Speech API integration with noise handling and silence detection
 */

import { useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  silenceTimeout?: number;
  language?: string;
}

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions) => {
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);

  const { 
    onResult, 
    onError, 
    onSpeechStart, 
    onSpeechEnd, 
    silenceTimeout = 1500,
    language = 'en-US'
  } = options;

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      onError?.("Speech recognition is not supported in your browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      onSpeechStart?.();
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
          
          // Reset silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          // Process command after silence timeout
          silenceTimerRef.current = setTimeout(() => {
            if (finalTranscript.trim()) {
              onResult(finalTranscript.trim());
              finalTranscript = "";
            }
          }, silenceTimeout);
        }
      }
      
      onSpeechEnd?.();
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
        return; // Ignore no-speech errors in continuous mode
      }
      
      onError?.(`Recognition error: ${event.error}`);
      
      if (event.error === "not-allowed") {
        stopListening();
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        recognition.start(); // Auto-restart if still supposed to be listening
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    isListeningRef.current = true;
  }, [onResult, onError, onSpeechStart, onSpeechEnd, silenceTimeout]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    isListeningRef.current = false;
  }, []);

  return { startListening, stopListening, isListening: isListeningRef.current };
};
