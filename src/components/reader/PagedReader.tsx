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

  // Use ResizeObserver for robust layout detection
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Only update if dimensions changed significantly to avoid loops
        setLayoutDims(prev => {
          if (!prev || Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1) {
            return { width, height };
          }
          return prev;
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate pages when content or layout changes
  useEffect(() => {
    if (!layoutDims || !contentRef.current) {
        return;
    }
    
    const calculatePages = () => {
        if (!contentRef.current) return;
        
        // Wait for images if any (basic check)
        const images = contentRef.current.getElementsByTagName('img');
        const pendingImages = Array.from(images).filter(img => !img.complete);
        
        if (pendingImages.length > 0) {
            // Recalculate when images load
            Promise.all(pendingImages.map(img => new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            }))).then(calculatePages);
        }

        const scrollWidth = contentRef.current.scrollWidth;
        const pages = Math.max(1, Math.ceil(scrollWidth / layoutDims.width));
        
        setTotalPages(prev => {
            if (prev !== pages) {
                if (onTotalPagesChange) onTotalPagesChange(pages);
                return pages;
            }
            return prev;
        });

        // Safety check: if current page is invalid, move to last page
        if (currentPageIndex >= pages) {
           // We don't call onPageChange here directly if we can avoid it during render cycles
           // but it's safe in useEffect
           onPageChange(pages - 1);
        }
    };

    // Calculate immediately and after a short delay for font rendering
    calculatePages();
    const timer = setTimeout(calculatePages, 100);
    const textTimer = setTimeout(calculatePages, 500); // Fallback

    return () => {
        clearTimeout(timer);
        clearTimeout(textTimer);
    };
  }, [layoutDims, content, settings.fontSize, onTotalPagesChange]); // Removed currentPageIndex from deps to avoid loop calculation logic, handled inside


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
                columnGap: 0,
                columnFill: 'auto',
                width: layoutDims ? `${layoutDims.width}px` : '100%',
                // Remove transform from style, handled by animate
            }}
            
            // Framer Motion Properties
            animate={{ x: `-${currentPageIndex * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.8 }}
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

      {/* Tap Zones for Page Flipping - High Z-index but below buttons */}
      <div 
          className="absolute top-14 bottom-8 left-0 w-[15%] z-30 cursor-pointer active:bg-black/5 transition-colors"
          onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); goToPrevPage(); }}
          role="button"
          aria-label="Previous page tap zone"
      />
      <div 
          className="absolute top-14 bottom-8 right-0 w-[15%] z-30 cursor-pointer active:bg-black/5 transition-colors"
          onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); goToNextPage(); }}
          role="button"
          aria-label="Next page tap zone"
      />

      {/* Navigation Buttons - Improved Mobile Visibility */}
      <button
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); goToPrevPage(); }}
        disabled={!(currentPageIndex > 0 || onPrevChapter)}
        className={`absolute left-2 top-1/2 -translate-y-1/2 p-4 rounded-full shadow-xl transition-all z-50
          ${(currentPageIndex > 0 || onPrevChapter) 
            ? `${theme.ui} ${theme.uiHover} opacity-90 hover:opacity-100 cursor-pointer border-2` 
            : `bg-gray-100 text-gray-300 opacity-0 pointer-events-none`}
        `}
        aria-label="Previous page"
      >
        <ChevronLeft size={28} />
      </button>

      <button
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); goToNextPage(); }}
        disabled={!(currentPageIndex < totalPages - 1 || onNextChapter)}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-4 rounded-full shadow-xl transition-all z-50
          ${(currentPageIndex < totalPages - 1 || onNextChapter)
            ? `${theme.ui} ${theme.uiHover} opacity-90 hover:opacity-100 cursor-pointer border-2`
            : `bg-gray-100 text-gray-300 opacity-0 pointer-events-none`}
        `}
        aria-label="Next page"
      >
        <ChevronRight size={28} />
      </button>

      {/* Footer Info */}
      <div className={`absolute bottom-1 left-0 right-0 flex justify-between px-8 text-[10px] ${theme.ui} opacity-60 font-medium select-none z-0`}>
        <span>{chapterHighlights.length > 0 ? `${chapterHighlights.length} notes` : ''}</span>
        <div className="flex gap-2">
            <span>Page {currentPageIndex + 1} of {totalPages}</span>
            <span>•</span>
            <span>{Math.ceil(content.split(/\s+/).length / 200)} min left</span>
        </div>
      </div>
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
