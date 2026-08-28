import { Button } from './ui/button';
import { JisIcon } from './JisIcon';
import React from 'react';

export type SuperAdminModule = 'overview' | 'academies' | 'plans';

interface SuperAdminNavigationProps {
  currentModule: SuperAdminModule;
  setCurrentModule: (module: SuperAdminModule) => void;
  onOpenAddAcademy: () => void;
}

// Mirrors Navigation.tsx's shell (fixed desktop sidebar, mobile top header + bottom nav) so the
// platform console reads as the same app, not a bolted-on admin tool. Only three modules, so
// unlike Navigation there's no mobile "More" overflow — all three fit directly in the bottom bar.
const NAV_ITEMS: { id: SuperAdminModule; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'academies', label: 'Academies', icon: 'apartment' },
  { id: 'plans', label: 'Plans', icon: 'workspace_premium' }
];

export const SuperAdminNavigation: React.FC<SuperAdminNavigationProps> = ({
  currentModule,
  setCurrentModule,
  onOpenAddAcademy
}) => {
  return (
    <>
      {/* Desktop Sidebar Drawer */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[270px] p-5 border-r border-[#dbdbdb]/80 dark:border-[#243244] bg-white/80 dark:bg-[#0b1422]/85 backdrop-blur-2xl z-50">
        {/* Platform Header Card */}
        <Button
          type="button"
          className="flex w-full items-center gap-3 mb-6 p-3 bg-[#f0f0f0] dark:bg-[#111c2b]/60 border border-[#dbdbdb]/70 dark:border-[#243244] rounded-2xl text-left group hover:border-[#3fc073]/40 dark:hover:border-[#3fc073]/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3fc073]"
          onClick={() => setCurrentModule('overview')}
          aria-label="Go to platform overview"
        >
          <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[#111c2b] flex items-center justify-center shrink-0 border border-[#dbdbdb]/70 dark:border-[#243244] shadow-sm shadow-[#3fc073]/15 group-hover:scale-105 transition-transform overflow-hidden p-1">
            <img src="/Batchly%20logo.png" alt="Batchly Logo" className="w-full h-full object-contain" />
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="font-heading text-sm font-bold text-[#212121] dark:text-[#e2e8f0] truncate">Batchly</p>
            <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] truncate flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fc073]"></span>
              Super Admin Console
            </p>
          </div>
        </Button>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentModule === item.id;
            return (
              <Button
                key={item.id}
                type="button"
                onClick={() => setCurrentModule(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full min-h-12 flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all text-left font-sans text-base font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-[#4d999d] to-[#64a85a] text-white shadow-md shadow-[#4d999d]/25 font-semibold'
                    : 'text-[#575757] dark:text-[#cbd5e1] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] hover:text-[#212121] dark:hover:text-white'
                }`}
              >
                <JisIcon className={`text-[20px] ${isActive ? 'filled' : ''}`}>
                  {item.icon}
                </JisIcon>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                )}
              </Button>
            );
          })}
        </nav>

        {/* Sidebar Footer Action */}
        <div className="pt-4 border-t border-[#dbdbdb]/80 dark:border-[#243244] space-y-3">
          <Button
            type="button"
            onClick={onOpenAddAcademy}
            className="btn-brand w-full min-h-11 py-3 px-4 rounded-2xl font-sans text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <JisIcon className="text-[18px]">add_business</JisIcon>
            <span>Add Academy</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 flex items-center px-4 py-2.5 bg-white/85 dark:bg-[#0b1422]/85 backdrop-blur-xl border-b border-[#dbdbdb]/80 dark:border-[#243244] shadow-xs">
        <button
          type="button"
          className="flex items-center gap-2.5 text-left min-w-0 py-1 focus-visible:outline-none"
          onClick={() => setCurrentModule('overview')}
          aria-label="Go to platform overview"
        >
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#111c2b] flex items-center justify-center shrink-0 border border-[#dbdbdb]/70 dark:border-[#243244] shadow-xs overflow-hidden p-0.5">
            <img src="/Batchly%20logo.png" alt="Batchly Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-heading text-base font-bold text-[#212121] dark:text-white tracking-tight truncate">
            Batchly Admin
          </h1>
        </button>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav aria-label="Primary navigation" className="md:hidden fixed bottom-0 left-0 w-full z-[45] grid grid-cols-3 items-stretch p-0 bg-white/95 dark:bg-[#0b1422]/95 backdrop-blur-xl border-t border-[#dbdbdb]/80 dark:border-[#243244] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const isActive = currentModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentModule(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded-none transition-all focus-visible:outline-none ${
                isActive
                  ? 'bg-gradient-to-r from-[#4d999d] to-[#64a85a] text-white shadow-xs'
                  : 'text-[#6b6b6b] dark:text-[#94a3b8] hover:bg-[#f0f0f0]/50 dark:hover:bg-[#172435]/50 hover:text-[#212121] dark:hover:text-white'
              }`}
            >
              <JisIcon className={`text-[20px] ${isActive ? 'filled' : ''}`}>
                {item.icon}
              </JisIcon>
              <span
                className={`font-sans text-[11px] leading-tight tracking-tight mt-1 truncate max-w-full ${
                  isActive ? 'font-semibold text-white' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
