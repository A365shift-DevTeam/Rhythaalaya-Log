import { Button } from './ui/button';
import { JisIcon } from './JisIcon';
import React from 'react';

export function DarkModeToggle({ darkMode, onToggle }: { darkMode: boolean; onToggle: () => void }) {
  return (
    <Button type="button" onClick={onToggle}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border border-[#dbdbdb] bg-white text-[#575757] transition-all hover:border-[#3fc073]/40 hover:text-[#212121] dark:border-[#243244] dark:bg-[#111c2b] dark:text-[#cbd5e1] dark:hover:text-white active:scale-95">
      <JisIcon className="text-[18px]">{darkMode ? 'light_mode' : 'dark_mode'}</JisIcon>
    </Button>
  );
}
