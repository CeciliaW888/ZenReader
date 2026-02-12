import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 bg-red-50 rounded-xl border border-red-200">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-red-600 mb-4 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for the AI Panel
export const AIPanelErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
    <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
    <h3 className="font-medium text-gray-800 mb-2">AI Panel Error</h3>
    <p className="text-sm text-gray-600 mb-4">
      The AI assistant encountered an issue. Please try again.
    </p>
    <button
      onClick={onRetry}
      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
    >
      <RefreshCw size={14} />
      Retry
    </button>
  </div>
);

// Specialized error boundary for the Reader content
export const ReaderErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
    <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
    <h2 className="text-xl font-serif font-bold text-gray-800 mb-2">
      Unable to display content
    </h2>
    <p className="text-gray-600 mb-6 text-center max-w-md">
      There was a problem rendering this chapter. The content may be malformed.
    </p>
    <button
      onClick={onRetry}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <RefreshCw size={16} />
      Try Again
    </button>
  </div>
);
