import React from 'react';
import { ReaderSettings } from '../../types';
import { THEME_STYLES } from '../../constants';

interface ReadingFooterProps {
  chapterTitle: string;
  currentPage: number;
  totalPages: number;
  totalWords: number;
  settings: ReaderSettings;
}

// Average adult reading speed (words per minute)
const AVERAGE_WPM = 238;

export const ReadingFooter: React.FC<ReadingFooterProps> = ({
  chapterTitle,
  currentPage,
  totalPages,
  totalWords,
  settings,
}) => {
  const theme = THEME_STYLES[settings.theme];

  // Calculate remaining time
  const wordsPerPage = totalWords / totalPages;
  const remainingPages = totalPages - currentPage;
  const remainingWords = remainingPages * wordsPerPage;
  const remainingMinutes = Math.ceil(remainingWords / AVERAGE_WPM);

  // Format remaining time
  const formatTime = (minutes: number) => {
    if (minutes <= 0) return 'Almost done';
    if (minutes < 60) return `~${minutes} min left`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `~${hours}h left`;
    return `~${hours}h ${mins}m left`;
  };

  return (
    <div
      className={`
        flex items-center justify-between
        px-6 py-3
        border-t
        text-xs font-medium
        ${theme.ui}
        opacity-70 hover:opacity-100 transition-opacity
      `}
    >
      {/* Left: Chapter title (truncated) */}
      <div className="flex-1 truncate max-w-[200px]" title={chapterTitle}>
        {chapterTitle}
      </div>

      {/* Right: Page number and remaining time */}
      <div className="flex items-center gap-4 text-right">
        <span className="tabular-nums">
          Page {currentPage} of {totalPages}
        </span>
        <span className="opacity-60">•</span>
        <span className="opacity-80">
          {formatTime(remainingMinutes)}
        </span>
      </div>
    </div>
  );
};
