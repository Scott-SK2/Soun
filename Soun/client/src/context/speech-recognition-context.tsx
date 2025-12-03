import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

type SpeechRecognitionUser = 'wake-word' | 'voice-assistant' | null;

interface SpeechRecognitionContextType {
  currentUser: SpeechRecognitionUser;
  requestMicrophone: (user: SpeechRecognitionUser) => boolean;
  releaseMicrophone: (user: SpeechRecognitionUser) => void;
  isMicrophoneAvailable: () => boolean;
}

const SpeechRecognitionContext = createContext<SpeechRecognitionContextType | undefined>(undefined);

export function SpeechRecognitionProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SpeechRecognitionUser>(null);
  const lockRef = useRef<SpeechRecognitionUser>(null);

  const requestMicrophone = useCallback((user: SpeechRecognitionUser): boolean => {
    if (lockRef.current === null || lockRef.current === user) {
      console.log(`🎤 Microphone granted to: ${user}`);
      lockRef.current = user;
      setCurrentUser(user);
      return true;
    }
    console.log(`🚫 Microphone denied to ${user} (in use by ${lockRef.current})`);
    return false;
  }, []);

  const releaseMicrophone = useCallback((user: SpeechRecognitionUser) => {
    if (lockRef.current === user) {
      console.log(`🎤 Microphone released by: ${user}`);
      lockRef.current = null;
      setCurrentUser(null);
    }
  }, []);

  const isMicrophoneAvailable = useCallback(() => {
    return lockRef.current === null;
  }, []);

  return (
    <SpeechRecognitionContext.Provider value={{
      currentUser,
      requestMicrophone,
      releaseMicrophone,
      isMicrophoneAvailable
    }}>
      {children}
    </SpeechRecognitionContext.Provider>
  );
}

export function useSpeechRecognitionCoordinator() {
  const context = useContext(SpeechRecognitionContext);
  if (!context) {
    throw new Error('useSpeechRecognitionCoordinator must be used within SpeechRecognitionProvider');
  }
  return context;
}
