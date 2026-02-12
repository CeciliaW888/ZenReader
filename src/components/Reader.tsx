import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, FilePenLine, X } from 'lucide-react';
import { ReaderSettings, Book, Highlight } from '../types';
import { THEME_STYLES, FONT_SIZES } from '../constants';
import { ReaderTopBar } from './reader/ReaderTopBar';
import { PagedReader } from './reader/PagedReader';
import { ReadingFooter } from './reader/ReadingFooter';
import { AIPanel } from './ai/AIPanel';
import { BookNotesModal } from './BookNotesModal';
import { ErrorBoundary } from './common/ErrorBoundary';
import { saveBook } from '../services/db';
import { useBookStore } from '../store/useBookStore';

interface ReaderProps {
  book: Book;
  currentChapterId: string;
  onChapterSelect: (id: string) => void;
  settings: ReaderSettings;
  onSettingsChange: (settings: ReaderSettings) => void;
  onBack: () => void;
  onToggleTOC: () => void;
  onBookUpdate?: (book: Book) => void;
}

export const Reader: React.FC<ReaderProps> = ({
  book,
  currentChapterId,
  onChapterSelect,
  settings,
  onSettingsChange,
  onBack,
  onToggleTOC,
  onBookUpdate
}) => {
  const topRef = useRef<HTMLDivElement>(null);
  const theme = THEME_STYLES[settings.theme];
  const fontSizeClass = FONT_SIZES[settings.fontSize];

  // Sort chapters by order to ensure correct flow
  const sortedChapters = React.useMemo(() => {
    return [...book.chapters].sort((a, b) => a.order - b.order);
  }, [book.chapters]);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Highlight State
  const [selectedText, setSelectedText] = useState<{ text: string; top: number; left: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  // Page state from store
  const { currentPageIndex, setCurrentPageIndex, saveReadingProgress } = useBookStore();
  const [totalPages, setTotalPages] = useState(1);

  // Computed properties
  // Computed properties
  const currentChapter = sortedChapters.find(c => c.id === currentChapterId);
  const currentChapterIndex = sortedChapters.findIndex(c => c.id === currentChapterId);
  const hasPrev = currentChapterIndex > 0;
  const hasNext = currentChapterIndex > -1 && currentChapterIndex < sortedChapters.length - 1;

  // Count words for time estimation
  const wordCount = currentChapter?.content.split(/\s+/).filter(w => w.length > 0).length || 0;

  // Reset page on chapter change
  useEffect(() => {
    setSearchQuery('');
    setSelectedText(null);
    // Page reset is handled by setCurrentChapterId in the store
  }, [currentChapterId]);

  // Auto-save progress (debounced)
  const saveProgressDebounced = useCallback(() => {
    const timeoutId = setTimeout(() => {
      saveReadingProgress();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [saveReadingProgress]);

  useEffect(() => {
    const cleanup = saveProgressDebounced();
    return cleanup;
  }, [currentPageIndex, currentChapterId, saveProgressDebounced]);

  // Handle page change (from PagedReader)
  const handlePageChange = useCallback((pageIndex: number) => {
    setCurrentPageIndex(pageIndex);
  }, [setCurrentPageIndex]);

  // Handle page updates from PagedReader
  const handleTotalPagesChange = useCallback((total: number) => {
    setTotalPages(total);
  }, []);

  // Handle chapter boundary navigation
  // Handle chapter boundary navigation
  const handleNextPage = useCallback(() => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    } else if (hasNext) {
      // Move to next chapter
      onChapterSelect(sortedChapters[currentChapterIndex + 1].id);
    }
  }, [currentPageIndex, totalPages, hasNext, currentChapterIndex, sortedChapters, onChapterSelect, setCurrentPageIndex]);

  const handlePrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    } else if (hasPrev) {
      // Move to previous chapter (last page)
      onChapterSelect(sortedChapters[currentChapterIndex - 1].id);
      // We'll need to navigate to last page after chapter loads
    }
  }, [currentPageIndex, hasPrev, currentChapterIndex, sortedChapters, onChapterSelect, setCurrentPageIndex]);

  // Handle Selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectedText(null);
        return;
      }

      const text = selection.toString().trim();
      if (text.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (text.length > 0) {
          setSelectedText({
            text,
            top: rect.top,
            left: rect.left + (rect.width / 2)
          });
        }
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  // Handle Adding Highlight
  const handleAddHighlight = async () => {
    if (!selectedText) return;

    const newHighlight: Highlight = {
      id: crypto.randomUUID(),
      chapterId: currentChapterId,
      text: selectedText.text,
      note: '',
      color: 'yellow',
      created: Date.now()
    };

    const updatedBook = {
      ...book,
      highlights: [...(book.highlights || []), newHighlight]
    };

    await saveBook(updatedBook);

    if (onBookUpdate) {
      onBookUpdate(updatedBook);
    }

    setSelectedText(null);
    setActiveHighlightId(newHighlight.id);
    window.getSelection()?.removeAllRanges();
  };

  // Chapter highlights
  const chapterHighlights = (book.highlights || []).filter(h => h.chapterId === currentChapterId);

  if (!currentChapter) return <div>Chapter not found</div>;

  return (
    <div className={`flex flex-col h-full bg-slate-100`}>
      <ReaderTopBar
        bookTitle={book.title}
        onBack={onBack}
        onToggleTOC={onToggleTOC}
        onToggleSearch={() => {
          setShowSearch(!showSearch);
          if (!showSearch) setTimeout(() => document.getElementById('search-input')?.focus(), 100);
        }}
        onToggleNotes={() => setShowNotes(true)}
        onToggleAI={() => setShowAI(!showAI)}
        settings={settings}
        onSettingsChange={onSettingsChange}
        showAI={showAI}
      />

      {/* Search Bar Overlay */}
      {showSearch && (
        <div className="fixed top-14 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 animate-in slide-in-from-top-2 duration-200 flex items-center gap-2 z-30 shadow-sm">
          <div className="flex-1 relative">
            <input
              id="search-input"
              type="text"
              placeholder="Search in this chapter..."
              className="w-full pl-4 pr-10 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg outline-none transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <ChevronLeft size={16} className="rotate-45" />
              </button>
            )}
          </div>
          <div className="text-xs text-gray-500 font-medium">
            {searchQuery ? 'Matches highlighted' : 'Type to search'}
          </div>
        </div>
      )}

      {/* Selection Tooltip */}
      {selectedText && (
        <div
          className="fixed z-50 bg-slate-800 text-white rounded-lg shadow-xl flex items-center gap-1 p-1 animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: Math.max(10, selectedText.top - 50) + 'px',
            left: Math.max(10, selectedText.left - 50) + 'px'
          }}
        >
          <button
            onClick={handleAddHighlight}
            className="px-3 py-1.5 hover:bg-slate-700 rounded-md text-xs font-bold flex items-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-200"></span>
            Highlight
          </button>
          <div className="w-px h-4 bg-slate-600 mx-1"></div>
          <button
            onClick={() => setSelectedText(null)}
            className="px-2 py-1.5 hover:bg-slate-700 rounded-md text-xs text-slate-400"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className={`flex-1 overflow-hidden relative ${theme.bg} mt-14 ${showSearch ? 'pt-[60px]' : ''}`}>
        <div ref={topRef} />

        <div className={`h-full flex flex-col transition-colors duration-300`}>
          {/* General Notes Display */}
          {book.notes && (
            <div className="mx-6 mt-6 p-6 bg-yellow-50 border border-yellow-200 rounded-xl relative group">
              <div className="flex items-center gap-2 mb-2 text-yellow-800 font-serif font-bold">
                <FilePenLine size={18} />
                <span>Book Notes</span>
              </div>
              <div className="text-yellow-900/80 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {book.notes}
              </div>
              <button
                onClick={() => setShowNotes(true)}
                className="absolute top-4 right-4 p-2 bg-yellow-100 text-yellow-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-yellow-200"
                title="Edit Notes"
              >
                <FilePenLine size={16} />
              </button>
            </div>
          )}

          {/* Chapter Title Header */}
          <div className={`px-8 py-4 ${theme.text}`}>
            {sortedChapters.length > 1 && (
              <span className="text-xs uppercase tracking-widest opacity-40 mb-2 block">
                Chapter {currentChapter.order + 1}
              </span>
            )}
            {(sortedChapters.length > 1 || (currentChapter.title !== book.title && currentChapter.title !== 'Full Text')) && (
              <h1 className={`text-2xl font-serif font-bold ${theme.text}`}>
                {currentChapter.title}
              </h1>
            )}
          </div>

          {/* Paged Content */}
          <div className="flex-1 overflow-hidden">
            <PagedReader
              content={currentChapter.content}
              currentPageIndex={currentPageIndex}
              onPageChange={handlePageChange}
              onTotalPagesChange={handleTotalPagesChange}
              settings={settings}
              chapterHighlights={chapterHighlights}
              searchQuery={searchQuery}
              onHighlightClick={(id) => setActiveHighlightId(id)}
              onNextChapter={hasNext ? () => onChapterSelect(sortedChapters[currentChapterIndex + 1].id) : undefined}
              onPrevChapter={hasPrev ? () => onChapterSelect(sortedChapters[currentChapterIndex - 1].id) : undefined}
            />
          </div>

          {/* Kindle-style Footer */}
          <ReadingFooter
            chapterTitle={currentChapter.title}
            currentPage={currentPageIndex + 1}
            totalPages={totalPages}
            totalWords={wordCount}
            settings={settings}
          />
        </div>
      </div>

      {/* AI Panel Overlay/Side */}
      <ErrorBoundary>
        <AIPanel
          isOpen={showAI}
          onClose={() => setShowAI(false)}
          currentChapter={currentChapter}
          book={book}
          settings={settings}
        />
      </ErrorBoundary>

      <BookNotesModal
        isOpen={showNotes}
        onClose={() => setShowNotes(false)}
        book={book}
        onBookUpdate={async (updated) => {
          await saveBook(updated);
          if (onBookUpdate) onBookUpdate(updated);
        }}
      />
    </div>
  );
};