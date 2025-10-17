import React, { createContext, useContext, useState, useEffect } from 'react';

export type UIDensity = 'comfortable' | 'compact' | 'dense';

interface DensityContextType {
  density: UIDensity;
  setDensity: (density: UIDensity) => void;
  spacingMap: {
    card: string;
    section: string;
    padding: string;
  };
}

const spacingMaps: Record<UIDensity, { card: string; section: string; padding: string }> = {
  comfortable: { card: 'space-y-6', section: 'space-y-8', padding: 'p-6' },
  compact: { card: 'space-y-4', section: 'space-y-6', padding: 'p-4' },
  dense: { card: 'space-y-2', section: 'space-y-4', padding: 'p-2' },
};

const STORAGE_KEY = 'mon-toit-ui-density';

const DensityContext = createContext<DensityContextType | undefined>(undefined);

export const DensityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [density, setDensityState] = useState<UIDensity>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as UIDensity) || 'comfortable';
  });

  const setDensity = (newDensity: UIDensity) => {
    setDensityState(newDensity);
    localStorage.setItem(STORAGE_KEY, newDensity);
  };

  return (
    <DensityContext.Provider
      value={{
        density,
        setDensity,
        spacingMap: spacingMaps[density],
      }}
    >
      {children}
    </DensityContext.Provider>
  );
};

export const useDensity = () => {
  const context = useContext(DensityContext);
  if (context === undefined) {
    throw new Error('useDensity must be used within a DensityProvider');
  }
  return context;
};
