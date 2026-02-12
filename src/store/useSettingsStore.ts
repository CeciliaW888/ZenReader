import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import { ReaderSettings, Theme, FontSize } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

interface SettingsState extends ReaderSettings {
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  setFontFamily: (family: 'serif' | 'sans') => void;
  setSettings: (settings: Partial<ReaderSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setSettings: (settings) => set(settings),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'zenreader-settings',
    }
  )
);

// Convenience hook to get all settings as an object
export const useSettings = (): ReaderSettings =>
  useSettingsStore(
    useShallow((state) => ({
      theme: state.theme,
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
    }))
  );
