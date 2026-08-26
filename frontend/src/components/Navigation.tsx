import { Button } from './ui/button';
import { JisIcon } from './JisIcon';
import React, { useState } from 'react';
import { AppTab, OrgSettings } from '../types';

interface NavigationProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  onOpenAddStudent: () => void;
  settings: OrgSettings;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAddStudent,
  settings
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const navItems = [
    { id: 'home', label: 'Dashboard', icon: 'dashboard' },
    { id: 'students', label: 'Students', icon: 'group' },
    { id: 'batches', label: 'Batches', icon: 'calendar_view_week' },
    { id: 'finance', label: 'Finance', icon: 'payments' },
    { id: 'log', label: 'Attendance', icon: 'fact_check' },
    { id: 'reports', label: 'Reports', icon: 'insights' },
    { id: 'menu', label: 'Settings', icon: 'settings' },
  ] as const;
  const mobileNavItems = navItems.filter((item) =>
    ['home', 'students', 'batches', 'log'].includes(item.id)
  );
  const mobileMoreItems = navItems.filter((item) => ['finance', 'reports', 'menu'].includes(item.id));
  const moreIsActive = currentTab === 'finance' || currentTab === 'reports' || currentTab === 'menu';

  const navigate = (tab: AppTab) => {
    setCurrentTab(tab);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar Drawer */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[270px] p-5 border-r border-[#dbdbdb]/80 dark:border-[#243244] bg-white/80 dark:bg-[#0b1422]/85 backdrop-blur-2xl z-50">
        {/* Academy Profile Header Card */}
        <Button
          type="button"
          className="flex w-full items-center gap-3 mb-6 p-3 bg-[#f0f0f0] dark:bg-[#111c2b]/60 border border-[#dbdbdb]/70 dark:border-[#243244] rounded-2xl text-left group hover:border-[#3fc073]/40 dark:hover:border-[#3fc073]/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3fc073]"
          onClick={() => navigate('home')}
          aria-label="Go to dashboard"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white flex items-center justify-center font-bold text-base overflow-hidden shrink-0 border border-white/20 shadow-sm shadow-[#3fc073]/25 group-hover:scale-105 transition-transform">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.name} className="w-full h-full object-cover" />
            ) : (
              settings.name.charAt(0) || 'R'
            )}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="font-heading text-sm font-bold text-[#212121] dark:text-[#e2e8f0] truncate">
              {settings.name}
            </p>
            <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] truncate flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fc073]"></span>
              {settings.type}
            </p>
          </div>
        </Button>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <Button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
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
            onClick={onOpenAddStudent}
            className="btn-brand w-full min-h-11 py-3 px-4 rounded-2xl font-sans text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <JisIcon className="text-[18px]">person_add</JisIcon>
            <span>Add Student</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 flex items-center px-4 py-2.5 bg-white/85 dark:bg-[#0b1422]/85 backdrop-blur-xl border-b border-[#dbdbdb]/80 dark:border-[#243244] shadow-xs">
        <button
          type="button"
          className="flex items-center gap-2.5 text-left min-w-0 py-1 focus-visible:outline-none"
          onClick={() => navigate('home')}
          aria-label="Go to dashboard"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 border border-white/20 shadow-xs">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.name} className="w-full h-full object-cover" />
            ) : (
              settings.name.charAt(0) || 'R'
            )}
          </div>
          <h1 className="font-heading text-base font-bold text-[#212121] dark:text-white tracking-tight truncate">
            {settings.name}
          </h1>
        </button>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-[55] bg-black/40 backdrop-blur-xs" onClick={() => setIsMoreOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 rounded-3xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] p-2 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-[#9e9e9e]">More</p>
            {mobileMoreItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <Button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#4d999d] to-[#64a85a] text-white shadow-md shadow-[#4d999d]/25 font-semibold'
                      : 'text-[#212121] dark:text-[#e2e8f0] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]'
                  }`}
                >
                  <JisIcon className={`text-[21px] ${isActive ? 'text-white filled' : 'text-[#3fc073]'}`}>{item.icon}</JisIcon>
                  <span className="flex-1">{item.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <nav aria-label="Primary navigation" className="md:hidden fixed bottom-0 left-0 w-full z-[45] grid grid-cols-5 items-stretch p-0 bg-white/95 dark:bg-[#0b1422]/95 backdrop-blur-xl border-t border-[#dbdbdb]/80 dark:border-[#243244] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
        {mobileNavItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
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
        <button
          type="button"
          onClick={() => setIsMoreOpen((open) => !open)}
          aria-expanded={isMoreOpen}
          className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded-none transition-all focus-visible:outline-none ${
            moreIsActive || isMoreOpen
              ? 'bg-gradient-to-r from-[#4d999d] to-[#64a85a] text-white shadow-xs'
              : 'text-[#6b6b6b] dark:text-[#94a3b8] hover:bg-[#f0f0f0]/50 dark:hover:bg-[#172435]/50 hover:text-[#212121] dark:hover:text-white'
          }`}
        >
          <JisIcon className={`text-[20px] ${moreIsActive ? 'filled' : ''}`}>more_horiz</JisIcon>
          <span
            className={`font-sans text-[11px] leading-tight tracking-tight mt-1 truncate max-w-full ${
              moreIsActive || isMoreOpen ? 'font-semibold text-white' : 'font-medium'
            }`}
          >
            More
          </span>
        </button>
      </nav>
    </>
  );
};
