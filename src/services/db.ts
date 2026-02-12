import { Book } from '../types';

const DB_NAME = 'ZenReaderDB';
const STORE_NAME = 'books';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveBook = async (book: Book): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(book);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllBooks = async (): Promise<Book[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by date added desc
      const books = request.result as Book[];
      books.sort((a, b) => b.dateAdded - a.dateAdded);
      resolve(books);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteBook = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const exportLibraryAsJSON = async (): Promise<string> => {
    const books = await getAllBooks();
    return JSON.stringify(books, null, 2);
};

export const importLibraryFromJSON = async (jsonString: string): Promise<number> => {
    const books = JSON.parse(jsonString);
    if (!Array.isArray(books)) throw new Error("Invalid backup format");
    
    let count = 0;
    for (const book of books) {
        if (book.id && book.title && book.chapters) {
            await saveBook(book);
            count++;
        }
    }
    return count;
};