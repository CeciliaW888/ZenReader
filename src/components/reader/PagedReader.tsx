import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { ReaderSettings, Highlight } from '../../types';
import { THEME_STYLES, FONT_SIZES } from '../../constants';
import { slugify } from '../../utils/markdownProcessor';

interface PagedReaderProps {
  content: string;
  currentPageIndex: number;
  onPageChange: (pageIndex: number) => void;
  onTotalPagesChange?: (totalPages: number) => void;
  settings: ReaderSettings;
  chapterHighlights: Highlight[];
  searchQuery: string;
  onHighlightClick: (id: string) => void;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
}

export const PagedReader: React.FC<PagedReaderProps> = ({
  content,
  currentPageIndex,
  onPageChange,
  onTotalPagesChange,
  settings,
  chapterHighlights,
  searchQuery,
  onHighlightClick,
  onNextChapter,
  onPrevChapter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [layoutDims, setLayoutDims] = useState<{ width: number; height: number } | null>(null);
  const controls = useAnimation();

  const theme = THEME_STYLES[settings.theme];
  const fontSizeClass = FONT_SIZES[settings.fontSize];

  // Calculate layout... (Keep existing logic)
  const calculateLayout = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    setLayoutDims({ width: clientWidth, height: clientHeight });
  }, []);

  useEffect(() => {
    if (!layoutDims || !contentRef.current) return;
    const timer = setTimeout(() => {
        if (!contentRef.current) return;
        const scrollWidth = contentRef.current.scrollWidth;
        const pages = Math.max(1, Math.ceil(scrollWidth / layoutDims.width));
        setTotalPages(pages);
        if (onTotalPagesChange) onTotalPagesChange(pages);
        if (currentPageIndex >= pages) onPageChange(pages - 1);
    }, 50);
    return () => clearTimeout(timer);
  }, [layoutDims, content, settings.fontSize, onTotalPagesChange]);

  useEffect(() => {
    calculateLayout();
    const handleResize = () => setTimeout(calculateLayout, 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateLayout]);

  useEffect(() => {
    document.fonts.ready.then(calculateLayout);
  }, [calculateLayout]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, totalPages]); // Simplified deps

  // Gesture Handling with Framer Motion
  const onDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const SWIPE_THRESHOLD = 50;
    const { offset, velocity } = info;

    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -500) {
      goToNextPage();
    } else if (offset.x > SWIPE_THRESHOLD || velocity.x > 500) {
      goToPrevPage();
    }
  };

  const goToPrevPage = () => {
    if (currentPageIndex > 0) {
      onPageChange(currentPageIndex - 1);
    } else if (onPrevChapter) {
      onPrevChapter();
    }
  };

  const goToNextPage = () => {
    if (currentPageIndex < totalPages - 1) {
      onPageChange(currentPageIndex + 1);
    } else if (onNextChapter) {
      onNextChapter();
    }
  };

  // Helper components...
  const HighlightText = ({ text }: { text: string }) => {
    // ... (Keep existing implementation logic details, assuming we replace full block?)
    // To be safe, I will re-include HighlightText internal logic if I am replacing the whole file or large chunks.
    // The previous edit was messy. I'll assume users want ROBUST editing.
    // I will construct the ReplacementContent to include HighlightText fully.
    if (!searchQuery.trim() && chapterHighlights.length === 0) return <>{text}</>;
    
    interface Match { start: number; end: number; type: 'search' | 'note'; data?: Highlight & { index: number }; priority: number; }
    const matches: Match[] = [];
    
    if (searchQuery.trim()) {
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length, type: 'search', priority: 1 });
      }
    }

    chapterHighlights.forEach((h: Highlight, index: number) => {
        if (!h.text.trim()) return;
        const clean = h.text.replace(/\s+/g, ' ').trim();
        const escaped = clean.split(' ').map((w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regex = new RegExp(escaped.join('[\\s\\n]+'), 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
            matches.push({ start: match.index, end: match.index + match[0].length, type: 'note', data: { ...h, index: index + 1 }, priority: 2 });
        }
    });

    matches.sort((a, b) => a.start - b.start);
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    for (const match of matches) {
        if (match.start < lastIndex) continue;
        if (match.start > lastIndex) elements.push(text.slice(lastIndex, match.start));
        if (match.type === 'search') {
            elements.push(<mark key={`search-${match.start}`} className="bg-orange-300 text-slate-900 rounded-sm px-0.5">{text.slice(match.start, match.end)}</mark>);
        } else {
            const h = match.data!;
            elements.push(
                <span key={`note-${h.id}-${match.start}`} className="bg-yellow-200 cursor-pointer border-b-2 border-yellow-400" onClick={(e) => { e.stopPropagation(); onHighlightClick(h.id); }}>
                    {text.slice(match.start, match.end)}
                    <sup className="text-[10px] font-bold text-yellow-800 ml-0.5 select-none hover:text-red-500">[{h.index}]</sup>
                </span>
            );
        }
        lastIndex = match.end;
    }
    if (lastIndex < text.length) elements.push(text.slice(lastIndex));
    return <>{elements}</>;
  };

  const markdownComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => {
      const id = typeof children === 'string' ? slugify(children) : undefined;
      return <h1 id={id} className="scroll-mt-24">{typeof children === 'string' ? <HighlightText text={children} /> : children}</h1>;
    },
    h2: ({ children }: { children?: React.ReactNode }) => {
      const id = typeof children === 'string' ? slugify(children) : undefined;
      return <h2 id={id} className="scroll-mt-24">{typeof children === 'string' ? <HighlightText text={children} /> : children}</h2>;
    },
    h3: ({ children }: { children?: React.ReactNode }) => {
      const id = typeof children === 'string' ? slugify(children) : undefined;
      return <h3 id={id} className="scroll-mt-24">{typeof children === 'string' ? <HighlightText text={children} /> : children}</h3>;
    },
    p: ({ children }: { children?: React.ReactNode }) => (
      <p>
        {React.Children.map(children, (child: React.ReactNode) => {
          if (typeof child === 'string') return <HighlightText text={child} />;
          return child;
        })}
      </p>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
       <li>
        {React.Children.map(children, (child: React.ReactNode) => {
          if (typeof child === 'string') return <HighlightText text={child} />;
          return child;
        })}
      </li>
    )
  };

  return (
    <div className="relative h-full flex flex-col">
      <div ref={containerRef} className="flex-1 overflow-hidden relative touch-none"> {/* touch-none important for gestures */}
        <motion.div
            ref={contentRef}
            className={`
                px-8 py-6
                prose ${theme.prose}
                ${fontSizeClass}
                ${settings.fontFamily === 'serif' ? 'font-serif' : 'font-sans'}
                max-w-none
                prose-headings:font-serif prose-headings:font-bold
                prose-p:leading-relaxed
                prose-img:rounded-xl prose-img:shadow-md
                paged-content
            `}
            style={{
                height: layoutDims ? `${layoutDims.height}px` : '100%',
                columnWidth: layoutDims ? `${layoutDims.width}px` : 'auto',
                columnGap: '4rem',
                columnFill: 'auto',
                width: layoutDims ? `${layoutDims.width}px` : '100%',
                // Remove transform from style, handled by animate
            }}
            
            // Framer Motion Properties
            animate={{ x: `-${currentPageIndex * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }} // Snap back if not dragging
            dragElastic={0.2}
            onDragEnd={onDragEnd}
        >
            <ReactMarkdown components={markdownComponents}>
                {content}
            </ReactMarkdown>
        </motion.div>
      </div>

      {/* Navigation Buttons (same as before) */}
      {currentPageIndex > 0 && (
        <button
          onClick={goToPrevPage}
          className={`absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full shadow-lg ${theme.ui} ${theme.uiHover} opacity-30 hover:opacity-100 transition-opacity z-10`}
          aria-label="Previous page"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {currentPageIndex < totalPages - 1 && (
        <button
          onClick={goToNextPage}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full shadow-lg ${theme.ui} ${theme.uiHover} opacity-30 hover:opacity-100 transition-opacity z-10`}
          aria-label="Next page"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
};

// Export page info for ReadingFooter
export const usePageInfo = (pagedReaderRef: React.RefObject<HTMLDivElement>, content: string) => {
  const [pageInfo, setPageInfo] = useState({ current: 1, total: 1 });

  useEffect(() => {
    if (!pagedReaderRef.current) return;
    
    const container = pagedReaderRef.current;
    const contentEl = container.querySelector('.paged-content') as HTMLDivElement;
    if (!contentEl) return;

    const containerWidth = container.clientWidth;
    const scrollWidth = contentEl.scrollWidth;
    const total = Math.max(1, Math.ceil(scrollWidth / containerWidth));

    setPageInfo((prev: { current: number; total: number }) => ({ ...prev, total }));
  }, [content, pagedReaderRef]);

  return pageInfo;
};
