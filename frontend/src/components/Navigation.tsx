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
    { id: 'menu', label: 'Settings', icon: 'settings' },
  ] as const;
  const mobileNavItems = navItems.filter((item) =>
    ['home', 'students', 'log', 'finance'].includes(item.id)
  );
  const mobileMoreItems = navItems.filter((item) => ['batches', 'menu'].includes(item.id));
  const moreIsActive = currentTab === 'batches' || currentTab === 'menu';

  const navigate = (tab: AppTab) => {
    setCurrentTab(tab);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar Drawer */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[270px] p-5 border-r border-[#dbdbdb]/80 dark:border-[#243244] bg-white/80 dark:bg-[#0b1422]/85 backdrop-blur-2xl z-50">
        {/* Academy Profile Header Card */}
        <button
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
        </button>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
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
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Action */}
        <div className="pt-4 border-t border-[#dbdbdb]/80 dark:border-[#243244] space-y-3">
          <button
            type="button"
            onClick={onOpenAddStudent}
            className="btn-brand w-full min-h-11 py-3 px-4 rounded-2xl font-sans text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Student</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 flex justify-between items-center px-4 py-2.5 bg-white/85 dark:bg-[#0b1422]/85 backdrop-blur-xl border-b border-[#dbdbdb]/80 dark:border-[#243244] shadow-xs">
        <button type="button" className="flex min-h-11 items-center gap-2.5 rounded-2xl text-left min-w-0 flex-1 pr-2" onClick={() => navigate('home')} aria-label="Go to dashboard">
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
        <button
          type="button"
          onClick={onOpenAddStudent}
          className="btn-brand min-h-10 px-3.5 py-1.5 rounded-2xl font-sans text-xs font-semibold flex items-center gap-1.5 shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Student</span>
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
            {mobileMoreItems.map((item) => (
              <button key={item.id} type="button" onClick={() => navigate(item.id)}
                className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#212121] hover:bg-[#f0f0f0] dark:text-[#e2e8f0] dark:hover:bg-[#172435]">
                <span className="material-symbols-outlined text-[21px] text-[#3fc073]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav aria-label="Primary navigation" className="md:hidden fixed bottom-0 left-0 w-full z-[60] grid grid-cols-5 items-stretch px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] bg-white/85 dark:bg-[#0b1422]/85 backdrop-blur-xl border-t border-[#dbdbdb]/80 dark:border-[#243244] shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        {mobileNavItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative min-h-[60px] flex flex-col items-center justify-center rounded-2xl px-1 py-1 transition-all ${
                isActive
                  ? 'bg-[#e9f7ee] text-[#35a160] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7] font-bold'
                  : 'text-[#6b6b6b] dark:text-[#94a3b8] hover:text-[#3fc073]'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className="font-sans text-xs leading-tight tracking-tight font-semibold mt-1">
                {item.label}
              </span>
            </button>
          );
        })}
        <button type="button" onClick={() => setIsMoreOpen((open) => !open)} aria-expanded={isMoreOpen}
          className={`relative min-h-[60px] flex flex-col items-center justify-center rounded-2xl px-1 py-1 transition-all ${moreIsActive || isMoreOpen ? 'bg-[#e9f7ee] text-[#35a160] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7] font-bold' : 'text-[#6b6b6b] dark:text-[#94a3b8]'}`}>
          <span className={`material-symbols-outlined text-[20px] ${moreIsActive ? 'filled' : ''}`}>more_horiz</span>
          <span className="font-sans text-xs leading-tight tracking-tight font-semibold mt-1">More</span>
        </button>
      </nav>
    </>
  );
};
