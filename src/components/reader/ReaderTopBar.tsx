import React, { useRef, useState } from 'react';
import { ChevronLeft, AlignLeft, Search, Type, Sparkles, FilePenLine } from 'lucide-react';
import { AppearanceMenu } from './AppearanceMenu';
import { ReaderSettings } from '../../types';

interface ReaderTopBarProps {
    bookTitle: string;
    onBack: () => void;
    onToggleTOC: () => void;
    onToggleSearch: () => void;
    onToggleNotes: () => void;
    onToggleAI: () => void;
    settings: ReaderSettings;
    onSettingsChange: (settings: ReaderSettings) => void;
    showAI: boolean;
}

export const ReaderTopBar: React.FC<ReaderTopBarProps> = ({
    bookTitle,
    onBack,
    onToggleTOC,
    onToggleSearch,
    onToggleNotes,
    onToggleAI,
    settings,
    onSettingsChange,
    showAI
}) => {
    const [showAppearance, setShowAppearance] = useState(false);
    const aaButtonRef = useRef<HTMLButtonElement>(null);

    // Determine icon color based on theme
    const isDark = settings.theme === 'dark' || settings.theme === 'midnight';
    const iconClass = isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black';
    const bgClass = isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-gray-100';

    return (
        <div className={`
      fixed top-0 left-0 right-0 h-14 z-40 backdrop-blur-md border-b
      flex items-center justify-between px-1.5 md:px-4 transition-colors duration-300
      ${bgClass}
    `}>
            {/* Left: Navigation */}
            <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
                <button
                    onClick={onBack}
                    className={`p-1.5 md:p-2 rounded-lg hover:bg-black/5 transition-colors ${iconClass}`}
                    title="Back to Library"
                >
                    <ChevronLeft className="w-5 h-5 md:w-[22px] md:h-[22px]" />
                </button>
                <button
                    onClick={onToggleTOC}
                    className={`p-1.5 md:p-2 rounded-lg hover:bg-black/5 transition-colors ${iconClass}`}
                    title="Table of Contents"
                >
                    <AlignLeft className="w-5 h-5 md:w-[22px] md:h-[22px]" />
                </button>
            </div>

            {/* Center: Title (Responsive truncation) */}
            <div className="flex-1 flex justify-center min-w-0 px-2">
                <h1 className={`
                    font-serif font-bold truncate text-sm md:text-base cursor-default opacity-80 select-none
                    ${isDark ? 'text-gray-200' : 'text-gray-800'}
                `}>
                    {bookTitle}
                </h1>
            </div>

            {/* Right: Tools */}
            <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
                {/* Appearance "Aa" */}
                <div className="relative">
                    <button
                        ref={aaButtonRef}
                        onClick={() => setShowAppearance(!showAppearance)}
                        className={`p-1.5 md:p-2 rounded-lg hover:bg-black/5 transition-colors ${iconClass} ${showAppearance ? 'bg-black/5' : ''}`}
                        title="Appearance Settings"
                    >
                        <Type className="w-4.5 h-4.5 md:w-5 md:h-5" />
                    </button>

                    <AppearanceMenu
                        isOpen={showAppearance}
                        onClose={() => setShowAppearance(false)}
                        triggerRef={aaButtonRef}
                        settings={settings}
                        onSettingsChange={onSettingsChange}
                    />
                </div>

                {/* Search */}
                <button
                    onClick={onToggleSearch}
                    className={`p-1.5 md:p-2 rounded-lg hover:bg-black/5 transition-colors ${iconClass}`}
                    title="Search in Book"
                >
                    <Search className="w-4.5 h-4.5 md:w-5 md:h-5" />
                </button>

                {/* Notes - Hidden on very small screens, keep for now */}
                <button
                    onClick={onToggleNotes}
                    className={`p-1.5 md:p-2 rounded-lg hover:bg-black/5 transition-colors ${iconClass} hidden xs:flex`}
                    title="My Notes"
                >
                    <FilePenLine className="w-4.5 h-4.5 md:w-5 md:h-5" />
                </button>

                {/* AI Companion */}
                <button
                    onClick={onToggleAI}
                    className={`p-1.5 md:p-2 rounded-lg hover:bg-black/5 transition-colors flex items-center gap-1 ${showAI ? 'text-blue-500 bg-blue-50/10' : iconClass}`}
                    title="AI Companion"
                >
                    <Sparkles className="w-4.5 h-4.5 md:w-[18px] md:h-[18px]" />
                </button>
            </div>
        </div>
    );
};
