import { Button } from './ui/button';
import { JisIcon } from './JisIcon';
import React, { useEffect, useState } from 'react';

export interface SpeedDialAction {
  label: string;
  icon: string;
  /* gradient + shadow classes for the action circle */
  tone: string;
  onClick: () => void;
}

/*
 * Mobile-only floating action button, fixed above the bottom nav.
 * With one action it triggers directly; with several it fans out a
 * speed dial of label pills + colored circles. Actions are listed
 * top-to-bottom, so put the primary action last (closest to the FAB).
 */
export function MobileSpeedDial({ actions, openLabel }: { actions: SpeedDialAction[]; openLabel: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (actions.length === 0) return null;
  const single = actions.length === 1;

  const pick = (action: SpeedDialAction) => {
    setOpen(false);
    action.onClick();
  };

  return (
    <div className="mobile-speed-dial md:hidden">
      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-xs"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-end gap-3">
        {open && !single && actions.map((action, index) => (
          <button
            key={action.label}
            type="button"
            onClick={() => pick(action)}
            className="fab-dial-item group flex items-center gap-2.5 focus-visible:outline-none"
            style={{ animationDelay: `${(actions.length - 1 - index) * 45}ms` }}
          >
            <span className="rounded-full border border-[#dbdbdb] bg-white px-3.5 py-2 text-xs font-bold text-[#212121] shadow-lg dark:border-[#243244] dark:bg-[#111c2b] dark:text-white">
              {action.label}
            </span>
            <span className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b text-white shadow-lg ${action.tone} group-active:scale-95 transition-transform`}>
              <JisIcon className="text-[20px]">{action.icon}</JisIcon>
            </span>
          </button>
        ))}
        <Button
          type="button"
          onClick={() => (single ? actions[0].onClick() : setOpen((value) => !value))}
          aria-label={single ? actions[0].label : open ? 'Close quick actions' : openLabel}
          aria-expanded={single ? undefined : open}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white shadow-xl shadow-[#3fc073]/35 border border-white/20 active:scale-95 transition-transform"
        >
          <JisIcon className={`text-[26px] transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>add</JisIcon>
        </Button>
      </div>
    </div>
  );
}
