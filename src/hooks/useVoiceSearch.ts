import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export const useVoiceSearch = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition || !isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      logger.warn('Speech recognition error', { error: event.error });
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        toast({
          title: "Aucun son détecté",
          description: "Veuillez réessayer et parler clairement",
          variant: "destructive",
        });
      }
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [isListening]);

  const startListening = () => {
    if (!isSupported) {
      toast({
        title: "Non supporté",
        description: "La recherche vocale n'est pas supportée sur ce navigateur",
        variant: "destructive",
      });
      return;
    }
    setIsListening(true);
  };

  const stopListening = () => {
    setIsListening(false);
  };

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
  };
};
