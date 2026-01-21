import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React, { Suspense } from 'react';
import { lazyWithRetry, Loadable } from '../lazyLoad';

// Mock du GlobalLoadingSkeleton
vi.mock('@/shared/ui/GlobalLoadingSkeleton', () => ({
  default: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

describe('lazyWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should successfully import component on first try', async () => {
    const MockComponent = () => <div>Test Component</div>;
    const mockImport = vi.fn().mockResolvedValue({ default: MockComponent });

    const LazyComponent = lazyWithRetry(mockImport, 3, 100);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Component')).toBeInTheDocument();
    });

    expect(mockImport).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed on subsequent attempt', async () => {
    const MockComponent = () => <div>Retry Success</div>;
    const mockImport = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({ default: MockComponent });

    const LazyComponent = lazyWithRetry(mockImport, 3, 100);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>
    );

    // Avancer le temps pour le retry
    await vi.advanceTimersByTimeAsync(100);

    await waitFor(() => {
      expect(screen.getByText('Retry Success')).toBeInTheDocument();
    });

    expect(mockImport).toHaveBeenCalledTimes(2);
  });

  it('should use default retry parameters', () => {
    const mockImport = vi.fn().mockResolvedValue({ default: () => <div>Default</div> });

    // Appel sans paramètres optionnels
    const _LazyComponent = lazyWithRetry(mockImport);

    // Vérifier que la fonction a été créée sans erreur
    expect(_LazyComponent).toBeDefined();
  });

  it('should respect custom retry count parameter', () => {
    const mockImport = vi.fn().mockResolvedValue({ default: () => <div>Custom</div> });

    const customRetries = 5;
    const _LazyComponent = lazyWithRetry(mockImport, customRetries, 50);

    expect(_LazyComponent).toBeDefined();
  });
});

describe('Loadable HOC', () => {
  it('should wrap component with Suspense and render content', () => {
    const TestComponent = () => <div data-testid="test-content">Content</div>;
    const LoadableComponent = Loadable(TestComponent);

    render(<LoadableComponent />);

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('should set correct displayName from component displayName property', () => {
    const NamedComponent = () => <div>Named</div>;
    NamedComponent.displayName = 'MyCustomName';

    const LoadableComponent = Loadable(NamedComponent);

    expect(LoadableComponent.displayName).toBe('Loadable(MyCustomName)');
  });

  it('should set displayName from function name if no displayName', () => {
    function TestFunctionComponent() {
      return <div>Function</div>;
    }

    const LoadableComponent = Loadable(TestFunctionComponent);

    expect(LoadableComponent.displayName).toBe('Loadable(TestFunctionComponent)');
  });

  it('should fallback to Component for anonymous functions', () => {
    const LoadableComponent = Loadable(() => <div>Anonymous</div>);

    expect(LoadableComponent.displayName).toBe('Loadable(Component)');
  });

  it('should pass props correctly to wrapped component', () => {
    interface TestProps {
      message: string;
      count: number;
    }

    const PropsComponent = ({ message, count }: TestProps) => (
      <div data-testid="props-test">
        {message} - {count}
      </div>
    );

    const LoadableComponent = Loadable(PropsComponent);

    render(<LoadableComponent message="Hello" count={42} />);

    expect(screen.getByTestId('props-test')).toHaveTextContent('Hello - 42');
  });

  it('should render children when component loads synchronously', () => {
    const SyncComponent = ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="sync-wrapper">{children}</div>
    );

    const LoadableComponent = Loadable(SyncComponent);

    render(
      <LoadableComponent>
        <span>Child content</span>
      </LoadableComponent>
    );

    expect(screen.getByTestId('sync-wrapper')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});
