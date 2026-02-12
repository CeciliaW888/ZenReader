import React, { useState, useEffect } from 'react';
import { X, FilePenLine, Save } from 'lucide-react';
import { Book } from '../types';
import { saveBook } from '../services/db';

interface BookNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    book: Book;
    onBookUpdate?: (updatedBook: Book) => void;
}

export const BookNotesModal: React.FC<BookNotesModalProps> = ({
    isOpen,
    onClose,
    book,
    onBookUpdate
}) => {
    const [notes, setNotes] = useState(book.notes || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setNotes(book.notes || '');
    }, [book, isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedBook = { ...book, notes };
            await saveBook(updatedBook);
            if (onBookUpdate) {
                onBookUpdate(updatedBook);
            }
            onClose();
        } catch (error) {
            console.error('Failed to save notes:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-100 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
                    <h3 className="font-serif font-bold text-lg text-emerald-900 flex items-center gap-2 truncate">
                        <FilePenLine size={20} /> Notes: {book.title}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex-1 flex flex-col min-h-0 space-y-4">
                    <div className="text-sm text-emerald-600/70 mb-2">
                        Write your thoughts, ideas, or summary of this book.
                    </div>
                    <textarea
                        className="w-full flex-1 p-4 bg-emerald-50/30 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none resize-none text-emerald-900 placeholder-emerald-400/70 min-h-[200px]"
                        placeholder="Start typing your notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-md shadow-emerald-200 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {isSaving ? 'Saving...' : 'Save Notes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
