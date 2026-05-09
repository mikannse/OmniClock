import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const { error, errorInfo } = this.state;
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-foreground">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">Please reload the application.</p>
          {error && (
            <details className="w-full max-w-lg rounded-lg border border-border bg-muted p-4 text-left text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">Error details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">{error.toString()}</pre>
              {errorInfo?.componentStack && (
                <pre className="mt-2 whitespace-pre-wrap break-all">{errorInfo.componentStack}</pre>
              )}
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
