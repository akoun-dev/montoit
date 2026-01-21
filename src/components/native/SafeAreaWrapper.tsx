import React from 'react';
import { Capacitor } from '@capacitor/core';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  className?: string;
  includeTop?: boolean;
  includeBottom?: boolean;
}

export function SafeAreaWrapper({
  children,
  className = '',
  includeTop = true,
  includeBottom = true,
}: SafeAreaWrapperProps) {
  const isNative = Capacitor.isNativePlatform();

  if (!isNative) {
    return <div className={className}>{children}</div>;
  }

  const safeAreaStyles: React.CSSProperties = {
    paddingTop: includeTop ? 'env(safe-area-inset-top)' : undefined,
    paddingBottom: includeBottom ? 'env(safe-area-inset-bottom)' : undefined,
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)',
  };

  return (
    <div className={className} style={safeAreaStyles}>
      {children}
    </div>
  );
}
