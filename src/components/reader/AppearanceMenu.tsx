import React, { useRef, useEffect } from 'react';
import { Type, Palette, Minus, Plus } from 'lucide-react';
import { ReaderSettings, FontSize } from '../../types';

interface AppearanceMenuProps {
    isOpen: boolean;
    onClose: () => void;
    settings: ReaderSettings;
    onSettingsChange: (settings: ReaderSettings) => void;
    triggerRef: React.RefObject<HTMLButtonElement>;
}

export const AppearanceMenu: React.FC<AppearanceMenuProps> = ({
    isOpen,
    onClose,
    settings,
    onSettingsChange,
    triggerRef
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className={`absolute top-16 right-4 sm:right-16 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200 p-4`}
        >
            <div className="space-y-6">
                {/* Themes Section */}
                <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Palette size={12} /> Themes
                    </div>
                    <div className="flex gap-2 justify-between">
                        {(['light', 'sepia', 'forest', 'dark', 'midnight'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => onSettingsChange({ ...settings, theme: t })}
                                className={`
                  flex flex-col items-center gap-2 group
                `}
                            >
                                <div className={`
                  w-10 h-10 rounded-full border-2 transition-transform group-hover:scale-110 shadow-sm
                  ${t === 'light' ? 'bg-white border-gray-200' : ''}
                  ${t === 'sepia' ? 'bg-[#fbf0d9] border-[#e6d0a0]' : ''}
                  ${t === 'forest' ? 'bg-[#eef5ef] border-[#c0dcc5]' : ''}
                  ${t === 'dark' ? 'bg-slate-900 border-slate-700' : ''}
                  ${t === 'midnight' ? 'bg-[#0f172a] border-[#334155]' : ''}
                  ${settings.theme === t ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}
                `} />
                                <span className="text-[10px] text-gray-500 font-medium capitalize">{t}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <hr className="border-gray-100" />

                {/* Font Section */}
                <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Type size={12} /> Typography
                    </div>

                    {/* Font Family */}
                    <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                        <button
                            onClick={() => onSettingsChange({ ...settings, fontFamily: 'sans' })}
                            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${settings.fontFamily === 'sans' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Sans Serif
                        </button>
                        <button
                            onClick={() => onSettingsChange({ ...settings, fontFamily: 'serif' })}
                            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${settings.fontFamily === 'serif' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Serif
                        </button>
                    </div>

                    {/* Font Size Slider */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onSettingsChange({ ...settings, fontSize: Math.max(1, settings.fontSize - 1) as FontSize })}
                            disabled={settings.fontSize <= 1}
                            className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30 transition-colors"
                        >
                            <Minus size={16} />
                        </button>

                        <div className="flex-1 h-2 bg-gray-100 rounded-full relative">
                            <div
                                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${((settings.fontSize - 1) / 7) * 100}%` }}
                            />
                            <input
                                type="range"
                                min="1"
                                max="8"
                                step="1"
                                value={settings.fontSize}
                                onChange={(e) => onSettingsChange({ ...settings, fontSize: parseInt(e.target.value) as FontSize })}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>

                        <button
                            onClick={() => onSettingsChange({ ...settings, fontSize: Math.min(8, settings.fontSize + 1) as FontSize })}
                            disabled={settings.fontSize >= 8}
                            className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30 transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1 font-mono">
                        <span>Aa</span>
                        <span>Aa</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
