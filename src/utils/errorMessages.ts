// User-friendly error messages for common errors

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
}

// Map API and system errors to user-friendly messages
export function getErrorMessage(error: unknown): AppError {
  const errorString = error instanceof Error ? error.message : String(error);

  // Rate limiting errors
  if (errorString.includes('429') || errorString.includes('rate limit') || errorString.includes('Too many requests')) {
    return {
      code: 'RATE_LIMITED',
      message: errorString,
      userMessage: 'You\'re sending requests too quickly. Please wait a moment and try again.',
      recoverable: true,
    };
  }

  // API key errors
  if (errorString.includes('API key') || errorString.includes('401') || errorString.includes('Unauthorized')) {
    return {
      code: 'AUTH_ERROR',
      message: errorString,
      userMessage: 'There\'s an issue with the AI service configuration. Please try again later.',
      recoverable: false,
    };
  }

  // Model not found
  if (errorString.includes('model') && (errorString.includes('not found') || errorString.includes('404'))) {
    return {
      code: 'MODEL_NOT_FOUND',
      message: errorString,
      userMessage: 'The AI model is temporarily unavailable. We\'re trying alternative models.',
      recoverable: true,
    };
  }

  // Content too long
  if (errorString.includes('too long') || errorString.includes('token limit') || errorString.includes('context length')) {
    return {
      code: 'CONTENT_TOO_LONG',
      message: errorString,
      userMessage: 'This content is too long to process at once. Try with a shorter section.',
      recoverable: true,
    };
  }

  // Network errors
  if (errorString.includes('network') || errorString.includes('fetch') || errorString.includes('ECONNREFUSED')) {
    return {
      code: 'NETWORK_ERROR',
      message: errorString,
      userMessage: 'Unable to connect to the server. Please check your internet connection.',
      recoverable: true,
    };
  }

  // YouTube specific errors
  if (errorString.includes('YouTube') || errorString.includes('transcript')) {
    return {
      code: 'YOUTUBE_ERROR',
      message: errorString,
      userMessage: 'Unable to fetch the video transcript. The video may not have captions available.',
      recoverable: false,
    };
  }

  // File processing errors
  if (errorString.includes('Unsupported file') || errorString.includes('file type')) {
    return {
      code: 'UNSUPPORTED_FILE',
      message: errorString,
      userMessage: 'This file type is not supported. Please use MD, TXT, PDF, DOCX, SRT, or VTT files.',
      recoverable: false,
    };
  }

  // PDF extraction errors
  if (errorString.includes('PDF') || errorString.includes('pdf')) {
    return {
      code: 'PDF_ERROR',
      message: errorString,
      userMessage: 'Unable to read this PDF. It may be encrypted or contain only images.',
      recoverable: false,
    };
  }

  // Safety filter triggered
  if (errorString.includes('safety') || errorString.includes('blocked') || errorString.includes('harmful')) {
    return {
      code: 'SAFETY_BLOCKED',
      message: errorString,
      userMessage: 'The content was blocked by safety filters. Please try with different content.',
      recoverable: false,
    };
  }

  // Server errors
  if (errorString.includes('500') || errorString.includes('Internal Server Error')) {
    return {
      code: 'SERVER_ERROR',
      message: errorString,
      userMessage: 'The server encountered an error. Please try again in a moment.',
      recoverable: true,
    };
  }

  // Default fallback
  return {
    code: 'UNKNOWN_ERROR',
    message: errorString,
    userMessage: 'Something went wrong. Please try again.',
    recoverable: true,
  };
}

// Toast-style error display helper
export function formatErrorForDisplay(error: unknown): string {
  const appError = getErrorMessage(error);
  return appError.userMessage;
}
