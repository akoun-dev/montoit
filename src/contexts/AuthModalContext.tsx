import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthModalContextType {
  isOpen: boolean;
  message: string;
  openAuthModal: (message?: string) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

const AuthModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const openAuthModal = (msg?: string) => {
    setMessage(msg || 'Pour accéder à cette fonctionnalité, vous devez être connecté');
    setIsOpen(true);
  };

  const closeAuthModal = () => {
    setIsOpen(false);
    setMessage('');
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, message, openAuthModal, closeAuthModal }}>
      {children}
    </AuthModalContext.Provider>
  );
};

export { AuthModalContext, AuthModalProvider };

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}
