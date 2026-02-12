import { create } from 'zustand';
import { Book, ReadingProgress } from '../types';
import { saveBook } from '../services/db';

interface BookState {
  book: Book | null;
  currentChapterId: string;
  currentPageIndex: number;
  setBook: (book: Book | null) => void;
  setCurrentChapterId: (chapterId: string) => void;
  setCurrentPageIndex: (pageIndex: number) => void;
  updateBook: (book: Book) => Promise<void>;
  saveReadingProgress: () => Promise<void>;
  clearBook: () => void;
}

export const useBookStore = create<BookState>((set, get) => ({
  book: null,
  currentChapterId: '',
  currentPageIndex: 0,

  setBook: (book) => {
    if (book && book.chapters.length > 0) {
      // Restore reading progress if available
      if (book.readingProgress) {
        const { chapterId, pageIndex } = book.readingProgress;
        // Verify the chapter still exists
        const chapterExists = book.chapters.some(c => c.id === chapterId);
        if (chapterExists) {
          set({ book, currentChapterId: chapterId, currentPageIndex: pageIndex });
          return;
        }
      }
      // Default to first chapter, page 0
      set({ book, currentChapterId: book.chapters[0].id, currentPageIndex: 0 });
    } else {
      set({ book });
    }
  },

  setCurrentChapterId: (chapterId) => {
    set({ currentChapterId: chapterId, currentPageIndex: 0 });
  },

  setCurrentPageIndex: (pageIndex) => {
    set({ currentPageIndex: pageIndex });
  },

  updateBook: async (updatedBook) => {
    await saveBook(updatedBook);
    set({ book: updatedBook });
  },

  saveReadingProgress: async () => {
    const { book, currentChapterId, currentPageIndex } = get();
    if (!book) return;

    const progress: ReadingProgress = {
      chapterId: currentChapterId,
      pageIndex: currentPageIndex,
      lastRead: Date.now(),
    };

    const updatedBook = { ...book, readingProgress: progress };
    await saveBook(updatedBook);
    set({ book: updatedBook });
  },

  clearBook: () => {
    set({ book: null, currentChapterId: '', currentPageIndex: 0 });
  },
}));

// Selectors for performance optimization
export const useCurrentChapter = () =>
  useBookStore((state) =>
    state.book?.chapters.find((c) => c.id === state.currentChapterId)
  );

export const useCurrentPageIndex = () =>
  useBookStore((state) => state.currentPageIndex);
