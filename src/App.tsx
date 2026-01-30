import React from 'react';
import { LibraryUpload } from './components/library/LibraryUpload';
import { SplashScreen } from './components/library/SplashScreen';
import { Reader } from './components/Reader';
import { Sidebar } from './components/Sidebar';
import { Book } from './types';
import { THEME_STYLES } from './constants';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useBookStore, useCurrentChapter, useSettings, useUIStore, useSettingsStore } from './store';

export default function App() {
  // Book state from store
  const { book, currentChapterId, setBook, setCurrentChapterId } = useBookStore();
  const currentChapter = useCurrentChapter();

  // Settings from store (with persistence)
  const settings = useSettings();
  const setSettings = useSettingsStore((state) => state.setSettings);

  // UI state from store
  const { showSplash, sidebarOpen, initialLibraryTab, setShowSplash, setSidebarOpen, setInitialLibraryTab } = useUIStore();

  const handleBookLoaded = (newBook: Book) => {
    setBook(newBook);
  };

  const handleBackToLibrary = () => {
    setInitialLibraryTab('library');
    setBook(null);
    setSidebarOpen(false);
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!book) {
    return <LibraryUpload onBookLoaded={handleBookLoaded} initialTab={initialLibraryTab} />;
  }

  const theme = THEME_STYLES[settings.theme];

  return (
    <div className={`h-full flex flex-col ${theme.bg} ${theme.text} transition-colors duration-300`}>
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          book={book}
          currentChapterId={currentChapterId}
          onChapterSelect={setCurrentChapterId}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          settings={settings}
        />

        {currentChapter && (
          <main className="flex-1 relative flex">
            <ErrorBoundary>
              <Reader
                book={book}
                currentChapterId={currentChapterId}
                onChapterSelect={setCurrentChapterId}
                settings={settings}
                onSettingsChange={setSettings}
                onBack={handleBackToLibrary}
                onToggleTOC={() => setSidebarOpen(true)}
                onBookUpdate={setBook}
              />
            </ErrorBoundary>
          </main>
        )}
      </div>
      {/* Debug version removed */}
    </div>
  );
}
