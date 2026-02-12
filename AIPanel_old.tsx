import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Send, Loader2, MessageSquare, BookOpen } from 'lucide-react';
import { THEME_STYLES } from '../constants';
import { ReaderSettings, Chapter, Book } from '../types';
import { summarizeChapter, answerQuestion, summarizeBook } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentChapter: Chapter;
  book: Book;
  settings: ReaderSettings;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export const AIPanel: React.FC<AIPanelProps> = ({
  isOpen,
  onClose,
  currentChapter,
  book,
  settings,
}) => {
  const theme = THEME_STYLES[settings.theme];
  const [activeTab, setActiveTab] = useState<'summary' | 'overview' | 'chat'>('summary');
  const [summary, setSummary] = useState<string | null>(null);
  const [bookOverview, setBookOverview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Reset chapter summary when chapter changes, but keep book overview
  useEffect(() => {
    setSummary(null);
    setChatMessages([]);
  }, [currentChapter.id]);

  useEffect(() => {
    setBookOverview(null); // Reset book overview if book changes (handled by parent unmounting usually, but good practice)
  }, [book.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  const handleSummarize = async () => {
    if (summary) return;
    setIsLoading(true);
    const text = await summarizeChapter(currentChapter.content, book.language);
    setSummary(text);
    setIsLoading(false);
  };

  const handleBookOverview = async () => {
    if (bookOverview) return;
    setIsLoading(true);
    // Aggregate content (limit to reasonable size)
    const fullContent = book.chapters.map(c => c.content).join('\n\n');
    const text = await summarizeBook(fullContent, book.language);
    setBookOverview(text);
    setIsLoading(false);
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = { role: 'user', content: inputValue };
    setChatMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsLoading(true);

    const response = await answerQuestion(currentChapter.content, newMessage.content, book.language);

    setChatMessages(prev => [...prev, { role: 'ai', content: response }]);
    setIsLoading(false);
  };

  return (
    <div className={`
      fixed inset-y-0 right-0 w-full sm:w-96 z-40 transform transition-transform duration-300 ease-in-out shadow-2xl border-l
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      ${theme.bg}
      ${settings.theme.includes('dark') || settings.theme === 'midnight' ? 'border-slate-800' : 'border-gray-200'}
    `}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${settings.theme.includes('dark') || settings.theme === 'midnight' ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className={`flex items-center gap-2 font-serif font-bold ${theme.text}`}>
            <Sparkles size={18} className="text-blue-500" />
            <span>AI Companion</span>
          </div>
          <button onClick={onClose} className={`p-1 rounded-md ${theme.uiHover} ${theme.text}`}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-1 border-b border-gray-200/10">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'summary'
                ? 'bg-blue-50 text-blue-600'
                : `${theme.text} hover:bg-black/5`
              }`}
          >
            Chapter
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'overview'
                ? 'bg-blue-50 text-blue-600'
                : `${theme.text} hover:bg-black/5`
              }`}
          >
            Book Info
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'chat'
                ? 'bg-blue-50 text-blue-600'
                : `${theme.text} hover:bg-black/5`
              }`}
          >
            Chat
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className={`text-sm opacity-70 ${theme.text}`}>
                Get a quick overview of <span className="font-semibold">"{currentChapter.title}"</span>.
              </div>

              {!summary && !isLoading && (
                <button
                  onClick={handleSummarize}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Sparkles size={18} />
                  Generate Summary
                </button>
              )}

              {isLoading && !summary && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                  <span className="text-xs">Analyzing chapter...</span>
                </div>
              )}

              {summary && (
                <div className={`prose prose-sm ${theme.prose} bg-black/5 p-4 rounded-xl`}>
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className={`text-sm opacity-70 ${theme.text}`}>
                Generate a "Back Cover" style summary for <span className="font-semibold">{book.title}</span>.
              </div>

              {!bookOverview && !isLoading && (
                <button
                  onClick={handleBookOverview}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <BookOpen size={18} />
                  Summarize Book
                </button>
              )}

              {isLoading && !bookOverview && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                  <Loader2 size={24} className="animate-spin text-emerald-500" />
                  <span className="text-xs">Reading whole book...</span>
                </div>
              )}

              {bookOverview && (
                <div className={`prose prose-sm ${theme.prose} bg-black/5 p-4 rounded-xl`}>
                  <h3 className="text-sm font-bold uppercase tracking-wider opacity-50 mb-2">Synopsis</h3>
                  <ReactMarkdown>{bookOverview}</ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-10 opacity-50">
                  <MessageSquare size={32} className="mx-auto mb-2" />
                  <p className={`text-sm ${theme.text}`}>Ask me anything about this chapter!</p>
                </div>
              )}

              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`
                    max-w-[85%] rounded-2xl px-4 py-3 text-sm
                    ${msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : `bg-black/5 ${theme.text} rounded-bl-none`}
                  `}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className={`bg-black/5 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-2`}>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input (Only visible on Chat tab) */}
        {activeTab === 'chat' && (
          <div className={`p-4 border-t ${settings.theme.includes('dark') || settings.theme === 'midnight' ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about this chapter..."
                className={`
                  w-full pl-4 pr-12 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all
                  ${settings.theme.includes('dark') || settings.theme === 'midnight' ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'}
                `}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
