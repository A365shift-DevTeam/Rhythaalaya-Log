import React from 'react';
import { OrgSettings } from '../types';

interface NavigationProps {
  currentTab: 'home' | 'students' | 'finance' | 'log' | 'menu';
  setCurrentTab: (tab: 'home' | 'students' | 'finance' | 'log' | 'menu') => void;
  onOpenAddStudent: () => void;
  settings: OrgSettings;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAddStudent,
  settings
}) => {
  const navItems = [
    { id: 'home', label: 'Dashboard', icon: 'dashboard' },
    { id: 'students', label: 'Students', icon: 'group' },
    { id: 'finance', label: 'Finance', icon: 'payments' },
    { id: 'log', label: 'Attendance', icon: 'fact_check' },
    { id: 'menu', label: 'Settings', icon: 'settings' },
  ] as const;

  return (
    <>
      {/* Desktop Sidebar Drawer */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[270px] p-5 border-r border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl z-50">
        {/* Brand Header */}
        <div 
          className="flex items-center gap-3 mb-6 px-1 cursor-pointer group" 
          onClick={() => setCurrentTab('home')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-2xl filled">auto_awesome</span>
          </div>
          <div>
            <span className="font-heading text-xl font-extrabold text-slate-900 dark:text-white tracking-tight block">
              StudioSync
            </span>
            <span className="font-sans text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block -mt-1">
              Studio OS
            </span>
          </div>
        </div>

        {/* Studio Profile Card */}
        <div className="flex items-center gap-3 p-3 mb-6 bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border border-indigo-400/30 shadow-inner">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.name} className="w-full h-full object-cover" />
            ) : (
              settings.name.charAt(0) || 'S'
            )}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="font-sans text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {settings.name}
            </p>
            <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
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
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all text-left font-sans text-sm font-medium ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
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
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
          <button
            onClick={onOpenAddStudent}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-sans text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Student</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 flex justify-between items-center px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentTab('home')}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-lg filled">auto_awesome</span>
          </div>
          <h1 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            StudioSync
          </h1>
        </div>
        <button
          onClick={onOpenAddStudent}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-sans text-xs font-semibold hover:bg-indigo-700 transition-all flex items-center gap-1 shadow-xs active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Student</span>
        </button>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-[60px] z-50 flex justify-around items-center px-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-lg">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center w-14 py-1 transition-all ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className="font-sans text-[10px] tracking-tight font-medium mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

