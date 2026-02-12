import React, { useMemo } from 'react';
import { Book as BookType, ReaderSettings } from '../types';
import { X, AlignLeft, Download, Globe } from 'lucide-react';
import { THEME_STYLES } from '../constants';
import { extractHeadings } from '../utils/markdownProcessor';
import { downloadEpub } from '../utils/epubGenerator';

interface SidebarProps {
  book: BookType;
  currentChapterId: string;
  onChapterSelect: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({
  book,
  currentChapterId,
  onChapterSelect,
  isOpen,
  onClose,
  settings
}) => {
  const theme = THEME_STYLES[settings.theme];
  const isSingleChapter = book.chapters.length === 1;

  // If single chapter, extract headings for TOC
  const tocItems = useMemo(() => {
    if (isSingleChapter) {
      return extractHeadings(book.chapters[0].content);
    }
    return [];
  }, [book, isSingleChapter]);

  const handleHeadingClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.innerWidth < 1024) onClose();
    }
  };

  const handleExport = async () => {
    await downloadEpub(book);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 bottom-0 w-80 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${theme.bg} border-r ${settings.theme.includes('dark') || settings.theme === 'midnight' ? 'border-slate-800' : 'border-gray-200'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200/10 flex justify-between items-center shrink-0">
          <h2 className={`font-bold font-serif truncate ${theme.text} w-48`}>{book.title}</h2>
          <button onClick={onClose} className={`p-1 rounded-md ${theme.uiHover} ${theme.text}`}>
            <X size={20} />
          </button>
        </div>

        {/* Chapters / TOC List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className={`text-xs font-bold uppercase tracking-wider mb-3 ml-2 opacity-50 ${theme.text} flex items-center gap-2`}>
            <AlignLeft size={12} />
            {isSingleChapter ? 'Table of Contents' : 'Chapters'}
          </div>

          {/* Single Chapter Mode: Show Headings */}
          {isSingleChapter && tocItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleHeadingClick(item.id)}
              className={`
                  w-full text-left px-4 py-2 rounded-lg text-sm transition-all
                  ${theme.text} hover:bg-black/5 opacity-80 hover:opacity-100
                `}
              style={{ paddingLeft: `${item.level * 12}px` }}
            >
              <span className="truncate block">{item.text}</span>
            </button>
          ))}

          {/* Multi Chapter Mode: Show Chapters */}
          {!isSingleChapter && book.chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => {
                onChapterSelect(chapter.id);
                if (window.innerWidth < 1024) onClose();
              }}
              className={`
                  w-full text-left px-4 py-3 rounded-lg text-sm transition-all
                  ${currentChapterId === chapter.id
                  ? `${theme.accent} bg-black/5 font-medium`
                  : `${theme.text} hover:bg-black/5 opacity-80 hover:opacity-100`}
                `}
            >
              <div className="flex items-center gap-3">
                <span className="opacity-50 text-xs w-4 shrink-0">{chapter.order + 1}</span>
                <span className="truncate">{chapter.title}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Language Info (Read-only) */}
        {book.language && (
          <div className="px-4 pb-3 border-b border-gray-200/10 shrink-0">
            <div className={`text-xs font-medium uppercase tracking-wider opacity-50 ${theme.text} flex items-center gap-2 mb-2`}>
              <Globe size={12} />
              Import Language
            </div>
            <div className={`px-3 py-2 rounded-lg text-sm ${settings.theme.includes('dark') || settings.theme === 'midnight' ? 'bg-slate-800/50' : 'bg-gray-100'}`}>
              <span className={theme.text}>{book.language}</span>
            </div>
            <p className={`text-xs mt-1 opacity-40 ${theme.text}`}>
              AI interactions now auto-detect language naturally
            </p>
          </div>
        )}

        {/* Export Button */}
        <div className="p-4 border-t border-gray-200/10 shrink-0">
          <button
            onClick={handleExport}
            className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${theme.ui} ${theme.uiHover}`}
          >
            <Download size={18} />
            Export as EPUB
          </button>
        </div>
      </div>
    </>
  );
};