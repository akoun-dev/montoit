/**
 * Types pour Web Speech API (Speech Recognition)
 * Ces types ne sont pas dans lib.dom.d.ts standard
 */

// =====================================================
// Speech Recognition Event Types
// =====================================================

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'audio-capture'
  | 'not-allowed'
  | 'network'
  | 'aborted'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';

export interface SpeechRecognitionErrorEvent extends Event {
  error: SpeechRecognitionErrorCode | string;
  message: string;
}

// =====================================================
// Speech Recognition Instance Type
// =====================================================

export interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// =====================================================
// Parsed Voice Query Result
// =====================================================

export interface ParsedVoiceQuery {
  city?: string;
  propertyType?: string;
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
}

// =====================================================
// Window Extension for Speech Recognition
// =====================================================

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
