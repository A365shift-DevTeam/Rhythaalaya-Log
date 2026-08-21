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
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[270px] p-5 border-r border-brand-200/70 dark:border-brand-800 bg-white/95 dark:bg-brand-950/95 backdrop-blur-xl z-50">
        {/* Brand Header */}
        <button
          type="button"
          className="flex w-full items-center gap-3 mb-6 px-1 rounded-xl text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          onClick={() => navigate('home')}
          aria-label="Go to dashboard"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-400 to-[#63c06a] text-white flex items-center justify-center shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-2xl filled">auto_awesome</span>
          </div>
          <div>
            <span className="font-heading text-xl font-extrabold text-slate-900 dark:text-white tracking-tight block">
              StudioSync
            </span>
            <span className="font-sans text-[11px] font-semibold text-brand-500 dark:text-brand-400 uppercase tracking-widest block -mt-1">
              Studio OS
            </span>
          </div>
        </button>

        {/* Studio Profile Card */}
        <div className="flex items-center gap-3 p-3 mb-6 bg-brand-50/90 dark:bg-brand-900/50 border border-brand-200/70 dark:border-brand-700/50 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border border-brand-400/30 shadow-inner">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.name} className="w-full h-full object-cover" />
            ) : (
              settings.name.charAt(0) || 'S'
            )}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="font-sans text-xs font-bold text-slate-900 dark:text-brand-50 truncate">
              {settings.name}
            </p>
            <p className="font-sans text-[11px] text-slate-500 dark:text-brand-200/80 truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
              {settings.type}
            </p>
          </div>
        </div>

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
                className={`w-full min-h-11 flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all text-left font-sans text-sm font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-400 via-brand-500 to-[#63c06a] text-white shadow-md shadow-brand-400/30 font-semibold'
                    : 'text-slate-600 dark:text-brand-100 hover:bg-brand-50 dark:hover:bg-brand-900/60'
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
        <div className="pt-4 border-t border-brand-200/70 dark:border-brand-800 space-y-3">
          <button
            type="button"
            onClick={onOpenAddStudent}
            className="btn-brand w-full min-h-11 py-3 px-4 rounded-xl font-sans text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Student</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 flex justify-between items-center px-4 py-3 bg-white/95 dark:bg-brand-950/95 backdrop-blur-xl border-b border-brand-200/70 dark:border-brand-800 shadow-xs">
        <button type="button" className="flex min-h-11 items-center gap-2.5 rounded-xl text-left" onClick={() => navigate('home')} aria-label="Go to dashboard">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-400 to-[#63c06a] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-lg filled">auto_awesome</span>
          </div>
          <h1 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            StudioSync
          </h1>
        </button>
        <button
          type="button"
          onClick={onOpenAddStudent}
          className="btn-brand min-h-11 px-3.5 py-2 rounded-xl font-sans text-xs font-semibold flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Student</span>
        </button>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-[55] bg-slate-950/35 backdrop-blur-[2px]" onClick={() => setIsMoreOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 rounded-2xl border border-brand-200/70 dark:border-brand-800 bg-white dark:bg-brand-950 p-2 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-slate-400">More</p>
            {mobileMoreItems.map((item) => (
              <button key={item.id} type="button" onClick={() => navigate(item.id)}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-brand-900/60">
                <span className="material-symbols-outlined text-[21px] text-brand-500">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav aria-label="Primary navigation" className="md:hidden fixed bottom-0 left-0 w-full z-[60] grid grid-cols-5 items-stretch px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] bg-white/95 dark:bg-brand-950/95 backdrop-blur-xl border-t border-brand-200/70 dark:border-brand-800 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
        {mobileNavItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative min-h-[60px] flex flex-col items-center justify-center rounded-xl px-1 py-1 transition-all ${
                isActive
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/60 dark:text-brand-300 font-bold'
                  : 'text-slate-500 dark:text-brand-200/70 hover:text-brand-700'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className="font-sans text-[11px] leading-tight tracking-tight font-semibold mt-1">
                {item.label}
              </span>
            </button>
          );
        })}
        <button type="button" onClick={() => setIsMoreOpen((open) => !open)} aria-expanded={isMoreOpen}
          className={`relative min-h-[60px] flex flex-col items-center justify-center rounded-xl px-1 py-1 transition-all ${moreIsActive || isMoreOpen ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/60 dark:text-brand-300 font-bold' : 'text-slate-500 dark:text-brand-200/70'}`}>
          <span className={`material-symbols-outlined text-[20px] ${moreIsActive ? 'filled' : ''}`}>more_horiz</span>
          <span className="font-sans text-[11px] leading-tight tracking-tight font-semibold mt-1">More</span>
        </button>
      </nav>
    </>
  );
};
