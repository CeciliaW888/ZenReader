import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Upload, Youtube, FileText, Trash2, Library, Plus, Leaf, Search, ArrowRight, Loader2, Sparkles, Wand2, FileType, Settings, Download, UploadCloud, X, FilePenLine } from 'lucide-react';
import { parseMarkdownToBook } from '../../utils/markdownProcessor';
import { extractTextFromFile } from '../../utils/fileHelpers';
import { formatErrorForDisplay } from '../../utils/errorMessages';
import { Book } from '../../types';
import { getAllBooks, saveBook, deleteBook, exportLibraryAsJSON, importLibraryFromJSON } from '../../services/db';
import { generateBookFromYouTube, generateBookFromText } from '../../services/geminiService';

interface LibraryUploadProps {
  onBookLoaded: (book: Book) => void;
  initialTab?: 'import' | 'library';
}

export const LibraryUpload: React.FC<LibraryUploadProps> = ({ onBookLoaded, initialTab = 'import' }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'library'>(initialTab);
  const [importType, setImportType] = useState<'file' | 'youtube' | 'text'>('file');
  const [library, setLibrary] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Notes State
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [currentBookForNotes, setCurrentBookForNotes] = useState<Book | null>(null);
  const [notesText, setNotesText] = useState('');

  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [smartFormat, setSmartFormat] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('original');


  // Inputs
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');

  const loadLibrary = async () => {
    const books = await getAllBooks();
    setLibrary(books);
    if (books.length > 0 && activeTab === 'import' && !isLoading) {
      // Optional: Auto switch logic if needed, but keeping user control is better usually
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBookReady = async (book: Book) => {
    await saveBook(book);
    await loadLibrary();
    onBookLoaded(book);
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setStatusMessage(`Extracting text from ${file.name}...`);

    try {
      const text = await extractTextFromFile(file);

      if (smartFormat) {
        setStatusMessage('AI is analyzing and restructuring content...');
        // Use Gemini to structure raw text
        const book = await generateBookFromText(text, file.name.split('.')[0], targetLanguage);
        await handleBookReady(book);
      } else {
        setStatusMessage('Parsing markdown...');
        // Standard parsing
        const { title, chapters } = parseMarkdownToBook(text, file.name);
        const newBook: Book = {
          id: crypto.randomUUID(),
          title,
          chapters,
          fileName: file.name,
          dateAdded: Date.now(),
          source: 'upload'
        };
        await handleBookReady(newBook);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(formatErrorForDisplay(err));
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    // Reset value so same file can be selected again
    event.target.value = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [smartFormat]);

  // Drag and Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if the related target is still within the drop zone
    // This prevents flickering when dragging over child elements
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }

    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Validate type roughly
      const validExtensions = ['md', 'txt', 'markdown', 'pdf', 'docx', 'srt', 'vtt'];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext && validExtensions.includes(ext)) {
        await processFile(file);
      } else {
        setError("Unsupported file type. Please upload .md, .txt, .pdf, .docx, .srt, or .vtt");
      }
    }
  };

  const handleYouTubeImport = async () => {
    if (!urlInput) return;
    setIsLoading(true);
    setError(null);
    setStatusMessage(smartFormat ? 'AI is watching the video & writing a book...' : 'Fetching transcript...');
    try {
      const book = await generateBookFromYouTube(urlInput, smartFormat, targetLanguage);
      await handleBookReady(book);
    } catch (err: unknown) {
      console.error(err);
      setError(formatErrorForDisplay(err));
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const handleTextImport = async () => {
    if (!textInput) return;
    setIsLoading(true);
    setStatusMessage(smartFormat ? 'AI is formatting and translating...' : 'Importing text...');
    try {
      if (smartFormat) {
        const book = await generateBookFromText(textInput, "Imported Text", targetLanguage);
        await handleBookReady(book);
      } else {
        // Direct import without AI
        const newBook: Book = {
          id: crypto.randomUUID(),
          title: "Imported Text",
          chapters: [{
            id: 'chap-0',
            title: 'Content',
            content: textInput,
            order: 0
          }],
          fileName: 'pasted.txt',
          dateAdded: Date.now(),
          source: 'text'
        };
        await handleBookReady(newBook);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(formatErrorForDisplay(err));
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const handleOpenNotes = (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    setCurrentBookForNotes(book);
    setNotesText(book.notes || '');
    setNotesModalOpen(true);
  };

  const handleSaveNotes = async () => {
    if (currentBookForNotes) {
      const updatedBook = { ...currentBookForNotes, notes: notesText };
      await saveBook(updatedBook);
      await loadLibrary();
      setNotesModalOpen(false);
      setCurrentBookForNotes(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this book?")) {
      await deleteBook(id);
      loadLibrary();
    }
  };

  const handleExportBackup = async () => {
    try {
      setStatusMessage("Preparing backup...");
      const json = await exportLibraryAsJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zenreader-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage("Backup downloaded!");
      setTimeout(() => setStatusMessage(""), 2000);
    } catch (err) {
      console.error(err);
      setError("Failed to export library");
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMessage("Reading backup file...");
    setError(null);

    try {
      const text = await file.text();
      const count = await importLibraryFromJSON(text);
      await loadLibrary();
      setStatusMessage(`Success! Restored ${count} books.`);

      // Wait a moment so user sees the success message before closing
      setTimeout(() => {
        setShowSettings(false);
        setStatusMessage("");
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("Invalid backup file. Please ensure it is a valid .json file from ZenReader.");
    } finally {
      setIsLoading(false);
      // Reset the input so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const filteredLibrary = library.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Scroll to import section helper
  const handleScrollToImport = () => {
    setActiveTab('import');
    // slight delay to allow render
    setTimeout(() => {
      const element = document.getElementById('import-card');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 text-emerald-950 font-sans selection:bg-emerald-200 selection:text-emerald-900">

      {/* Navbar / Header */}
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-emerald-100/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('import')}>
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Leaf size={24} fill="currentColor" className="text-white/90" />
          </div>
          <span className="text-2xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-800 to-teal-700">
            ZenReader
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleScrollToImport}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'import' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 shadow-sm' : 'hover:bg-emerald-50 text-emerald-600'}`}
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Import New</span>
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'library' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 shadow-sm' : 'hover:bg-emerald-50 text-emerald-600'}`}
          >
            <Library size={18} />
            <span className="hidden sm:inline">My Library</span>
            {library.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-emerald-200 text-emerald-800 rounded-full">{library.length}</span>
            )}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors ml-2 border border-emerald-200 shadow-sm bg-white"
            title="Settings & Backup"
          >
            <Settings size={18} />
            <span className="hidden sm:inline font-medium">Backup / Restore</span>
          </button>
        </div>
      </nav>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-100">
            <div className="p-4 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
              <h3 className="font-serif font-bold text-lg text-emerald-900 flex items-center gap-2">
                <Settings size={20} /> Backup & Restore
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-emerald-900 mb-2">Sync Devices</h4>
                <p className="text-sm text-emerald-600 mb-4 leading-relaxed">
                  To read your books on another device:
                </p>
                <ol className="list-decimal list-inside text-sm text-emerald-600 mb-4 space-y-1 ml-1">
                  <li>Export a backup from this device</li>
                  <li>Send the file to your other device</li>
                  <li>Click 'Import Backup' on the new device</li>
                </ol>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleExportBackup}
                    className="flex flex-col items-center justify-center gap-2 p-4 border border-emerald-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all group bg-emerald-50/30"
                  >
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shadow-sm border border-emerald-200">
                      <Download size={20} />
                    </div>
                    <span className="text-sm font-medium text-emerald-800">Export Backup</span>
                  </button>

                  <label className="flex flex-col items-center justify-center gap-2 p-4 border border-emerald-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer group bg-emerald-50/30">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shadow-sm border border-emerald-200">
                      <UploadCloud size={20} />
                    </div>
                    <span className="text-sm font-medium text-emerald-800">Import Backup</span>
                    <input type="file" className="hidden" accept=".json" onChange={handleImportBackup} />
                  </label>
                </div>
              </div>

              {statusMessage && (
                <div className="p-3 bg-emerald-100 text-emerald-800 text-sm font-medium rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 border border-emerald-200">
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>}
                  {statusMessage}
                </div>
              )}
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-lg animate-in fade-in slide-in-from-bottom-2 border border-rose-100">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModalOpen && currentBookForNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-100">
            <div className="p-4 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
              <h3 className="font-serif font-bold text-lg text-emerald-900 flex items-center gap-2 truncate">
                <FilePenLine size={20} /> Notes: {currentBookForNotes.title}
              </h3>
              <button onClick={() => setNotesModalOpen(false)} className="p-1 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                className="w-full h-48 p-4 bg-emerald-50/30 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none resize-none text-emerald-900 placeholder-emerald-400/70"
                placeholder="Write your personal notes here..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setNotesModalOpen(false)}
                  className="px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-md shadow-emerald-200"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* IMPORT VIEW (HERO + INPUTS) */}
        {activeTab === 'import' && (
          <div className="animate-in fade-in duration-700 slide-in-from-bottom-4 space-y-12">

            {/* HERO SECTION */}
            <div className="relative rounded-3xl overflow-hidden bg-emerald-900 shadow-2xl shadow-emerald-900/20">
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=2000&auto=format&fit=crop"
                  alt="Lady reading a book in a library"
                  className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-emerald-900/80 to-transparent"></div>
              </div>

              <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 max-w-3xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-100 border border-emerald-400/30 rounded-full text-xs font-medium uppercase tracking-wider backdrop-blur-sm">
                    AI-Powered Reading
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight">
                  Rediscover the <br />
                  <span className="text-emerald-200">Joy of Reading</span>
                </h1>
                <p className="text-lg md:text-xl text-emerald-100/80 mb-8 max-w-xl leading-relaxed">
                  Transform any document or video into a beautiful, interactive book. Let AI summarize chapters, answer questions, and guide your journey.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => document.getElementById('import-card')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-6 py-3 bg-white text-emerald-900 rounded-xl font-bold hover:bg-emerald-50 transition-all flex items-center gap-2"
                  >
                    Start Reading <ArrowRight size={18} />
                  </button>
                  <button
                    onClick={() => setActiveTab('library')}
                    className="px-6 py-3 bg-emerald-800/50 backdrop-blur-sm text-white border border-emerald-700/50 rounded-xl font-medium hover:bg-emerald-800/70 transition-all"
                  >
                    Go to Library
                  </button>
                </div>
              </div>
            </div>

            {/* IMPORT CARD */}
            <div id="import-card" className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-serif font-bold text-emerald-950">Add to your collection</h2>
                <p className="text-emerald-600">Choose a source to begin</p>
              </div>

              <div className="bg-white rounded-3xl shadow-xl shadow-emerald-100/50 border border-emerald-100 overflow-hidden">
                {/* Tabs */}
                <div className="flex p-2 bg-emerald-50/50 gap-2 border-b border-emerald-100/50">
                  <button
                    onClick={() => setImportType('file')}
                    className={`flex-1 py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${importType === 'file' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5' : 'text-emerald-600/70 hover:bg-emerald-100/50'}`}
                  >
                    <Upload size={18} /> Upload File
                  </button>
                  <button
                    onClick={() => setImportType('youtube')}
                    className={`flex-1 py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${importType === 'youtube' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5' : 'text-emerald-600/70 hover:bg-emerald-100/50'}`}
                  >
                    <Youtube size={18} /> YouTube
                  </button>
                  <button
                    onClick={() => setImportType('text')}
                    className={`flex-1 py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${importType === 'text' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5' : 'text-emerald-600/70 hover:bg-emerald-100/50'}`}
                  >
                    <FileText size={18} /> Paste Text
                  </button>
                </div>

                <div className="p-6 md:p-8 min-h-[320px] flex flex-col bg-white">
                  {/* Shared Smart Format Settings - Rendered for each active tab that needs it */}
                  {['file', 'youtube', 'text'].includes(importType) && (
                    <div className="flex flex-col gap-4 p-4 mb-6 bg-indigo-50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Wand2 size={20} />
                          </div>
                          <div>
                            <div className="font-semibold text-indigo-900">Smart Format with AI</div>
                            <div className="text-xs text-indigo-700/70">
                              {importType === 'youtube'
                                ? 'Convert video to structured book chapters'
                                : 'Convert content into styled book chapters'}
                            </div>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={smartFormat}
                            onChange={(e) => setSmartFormat(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {smartFormat && (
                        <div className="animate-in fade-in slide-in-from-top-2 pt-2 border-t border-indigo-100 flex items-center justify-between">
                          <span className="text-sm font-medium text-indigo-900">Target Language:</span>
                          <select
                            className="bg-white border border-indigo-200 text-indigo-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none"
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                          >
                            <option value="original">Original Language</option>
                            <option value="English">English</option>
                            <option value="Chinese">Chinese (Simplified)</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                            <option value="German">German</option>
                            <option value="Japanese">Japanese</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {importType === 'file' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">

                      <label
                        htmlFor="file-upload"
                        className={`
                                    group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                                    ${isDragging
                            ? 'border-emerald-500 bg-emerald-50 scale-[1.02] shadow-lg'
                            : 'border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50/50'}
                                  `}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        {isLoading ? (
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                            <p className="text-lg text-emerald-800 font-medium">{statusMessage}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                              {isDragging ? <ArrowRight className="w-8 h-8 text-emerald-600" /> : <Upload className="w-8 h-8 text-emerald-600" />}
                            </div>
                            <p className="mb-2 text-lg text-emerald-800 font-medium">Click to upload or drag and drop</p>
                            <p className="text-sm text-emerald-500 flex items-center gap-2">
                              <FileType size={14} /> MD, TXT, PDF, DOCX, SRT
                            </p>
                          </div>
                        )}
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          accept=".md,.txt,.markdown,.pdf,.docx,.srt,.vtt"
                          onChange={handleFileUpload}
                          disabled={isLoading}
                        />
                      </label>
                      {error && (
                        <div className="text-center text-rose-500 text-sm font-medium">{error}</div>
                      )}
                    </div>
                  )}

                  {importType === 'youtube' && (
                    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex items-start gap-3">
                        <div className="p-2 bg-rose-100 rounded-lg shrink-0">
                          <Sparkles className="text-rose-500 w-5 h-5" />
                        </div>
                        <div className="text-sm text-rose-900">
                          <p className="font-bold mb-1">AI Video to Book</p>
                          <p className="opacity-80 leading-relaxed">Paste a YouTube URL. Our AI will research the content, extract the transcript, and write a structured book chapter-by-chapter.</p>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="https://youtube.com/watch?v=..."
                          className="w-full pl-4 pr-12 py-4 bg-emerald-50/30 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none text-emerald-900 placeholder-emerald-400/70 transition-all"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                        />
                        {urlInput && (
                          <button
                            onClick={() => { setUrlInput(''); setError(null); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-emerald-400 hover:text-rose-500 transition-colors"
                            title="Clear URL"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </div>
                      {error && <div className="text-rose-500 text-sm font-medium px-2 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" />{error}</div>}
                      <button
                        onClick={handleYouTubeImport}
                        disabled={isLoading || !urlInput}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 font-bold text-lg flex items-center justify-center gap-2 transition-all"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="animate-spin" /> {statusMessage || 'Processing...'}
                          </>
                        ) : (
                          <>
                            Generate Book <ArrowRight size={20} />
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {importType === 'text' && (
                    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="relative w-full">
                        <textarea
                          placeholder="Paste your article, notes, or story here..."
                          className="w-full p-4 bg-emerald-50/30 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none h-48 resize-none text-emerald-900 placeholder-emerald-400/70 transition-all"
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                        />
                        {textInput && (
                          <button
                            onClick={() => { setTextInput(''); setError(null); }}
                            className="absolute top-3 right-3 p-2 bg-white/50 hover:bg-white text-emerald-600 rounded-lg shadow-sm border border-emerald-100 transition-all backdrop-blur-sm"
                            title="Clear text"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={handleTextImport}
                        disabled={isLoading || !textInput}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 font-bold text-lg flex items-center justify-center gap-2 transition-all"
                      >
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Read Now'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-2 text-emerald-800 font-medium"><Leaf size={16} /> Gemini AI</div>
              <div className="flex items-center gap-2 text-emerald-800 font-medium"><BookOpen size={16} /> Smart Parse</div>
              <div className="flex items-center gap-2 text-emerald-800 font-medium"><Sparkles size={16} /> Auto Summary</div>
            </div>

          </div>
        )}

        {/* LIBRARY VIEW */}
        {activeTab === 'library' && (
          <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-serif font-bold text-emerald-950">My Library</h1>
                <p className="text-emerald-600/80 mt-1">
                  {library.length === 0 ? "Your collection is empty." : "Continue where you left off."}
                </p>
              </div>

              {library.length > 0 && (
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder="Search your books..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white/60 border border-emerald-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/50 w-full md:w-64 transition-all"
                  />
                </div>
              )}
            </div>

            {library.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-emerald-100 rounded-3xl bg-white/30">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <Library size={40} className="text-emerald-300" />
                </div>
                <h3 className="text-xl font-bold text-emerald-900 mb-2">Your library is waiting</h3>
                <p className="text-emerald-600 max-w-md mb-8">
                  Upload markdown files, paste text, or import from YouTube to start building your personal reading collection.
                </p>
                <button
                  onClick={handleScrollToImport}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add First Book
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Add New Card (Small) */}
                <button
                  onClick={handleScrollToImport}
                  className="group flex flex-col items-center justify-center h-64 border-2 border-dashed border-emerald-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/50 transition-all cursor-pointer"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Plus size={32} className="text-emerald-600" />
                  </div>
                  <span className="font-medium text-emerald-700">Add New</span>
                </button>

                {filteredLibrary.map(book => (
                  <div
                    key={book.id}
                    onClick={() => onBookLoaded(book)}
                    className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl hover:shadow-emerald-100/50 border border-emerald-50/50 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Card Cover Pattern */}
                    <div className={`h-32 w-full relative overflow-hidden ${book.source === 'youtube' ? 'bg-gradient-to-br from-rose-50 to-rose-100' :
                      book.source === 'text' ? 'bg-gradient-to-br from-amber-50 to-orange-50' :
                        'bg-gradient-to-br from-sky-50 to-blue-50'
                      }`}>
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,#000_1px,transparent_0)] [background-size:16px_16px]"></div>
                      <div className="absolute bottom-4 left-4 p-3 bg-white/90 backdrop-blur rounded-xl shadow-sm">
                        {book.source === 'youtube' ? (
                          <Youtube size={24} className="text-rose-500" />
                        ) : (
                          <BookOpen size={24} className="text-emerald-600" />
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="font-serif font-bold text-lg text-emerald-950 truncate mb-2 leading-tight" title={book.title}>
                        {book.title}
                      </h3>
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md">
                          {book.chapters.length} Chapters
                        </span>
                        <span className="text-xs text-emerald-400">
                          {new Date(book.dateAdded).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, book.id)}
                      className="absolute top-2 right-2 p-2 bg-white/90 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 shadow-sm transform scale-90 group-hover:scale-100"
                      title="Delete Book"
                    >
                      <Trash2 size={16} />
                    </button>

                    <button
                      onClick={(e) => handleOpenNotes(e, book)}
                      className="absolute top-2 right-10 p-2 bg-white/90 text-emerald-600 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-50 shadow-sm transform scale-90 group-hover:scale-100"
                      title="Book Notes"
                    >
                      <FilePenLine size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      <footer className="py-6 text-center text-emerald-600/60 text-sm font-medium tracking-wide">
        Bring knowledge to your fingertips
      </footer>
    </div>
  );
};