import React, { useEffect, useRef, useState } from 'react';
import { AppTab, OrgSettings } from '../types';

export interface PrimaryAction {
  label: string;
  icon: string;
  onClick: () => void;
}

interface NavigationProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  settings: OrgSettings;
  userName: string;
  userRole: string;
  onLogout: () => void;
  primaryAction: PrimaryAction | null;
  renderNotifications: (tone: 'rail' | 'bar') => React.ReactNode;
}

const NAV_ITEMS = [
  { id: 'home', label: 'Today', icon: 'today' },
  { id: 'students', label: 'Students', icon: 'group' },
  { id: 'batches', label: 'Batches', icon: 'event_note' },
  { id: 'finance', label: 'Fees', icon: 'currency_rupee' },
  { id: 'log', label: 'Attendance', icon: 'fact_check' },
  { id: 'menu', label: 'Settings', icon: 'settings' }
] as const;

/* Settings is not a daily destination; Batches is. The bottom bar carries
   the five screens staff actually move between, and Settings moves into
   the top-bar menu alongside Sign out. */
const BOTTOM_BAR_IDS: AppTab[] = ['home', 'students', 'batches', 'finance', 'log'];

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  settings,
  userName,
  userRole,
  onLogout,
  primaryAction,
  renderNotifications
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsMenuOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  const navigate = (tab: AppTab) => {
    setCurrentTab(tab);
    setIsMenuOpen(false);
  };

  const bottomItems = NAV_ITEMS.filter((item) => BOTTOM_BAR_IDS.includes(item.id));
  const academyInitial = settings.name.trim().charAt(0).toUpperCase() || 'A';

  const academyMark = (size: string) => (
    <span
      className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-ctl bg-leaf font-semibold text-leaf-on`}
      aria-hidden="true"
    >
      {settings.logoUrl
        ? <img src={settings.logoUrl} alt="" className="h-full w-full object-cover" />
        : academyInitial}
    </span>
  );

  return (
    <>
      {/* ---------------------------------------------------------------
          Desktop rail. Ink, so that leaf can mean "active" and nothing
          else. Carries identity, navigation, and the account — which is
          why the main column no longer needs a header of its own.
          --------------------------------------------------------------- */}
      <aside className="fixed left-0 top-0 z-50 hidden h-dvh w-[240px] flex-col border-r border-rail-line bg-rail md:flex">
        <div className="flex items-center gap-2.5 px-4 py-5">
          {academyMark('h-9 w-9 text-sm')}
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-rail-text">{settings.name}</span>
            <span className="block truncate text-[11px] text-rail-text-2">{settings.type}</span>
          </span>
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto px-2.5 py-1">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => navigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-ctl px-3 text-left text-[13px] transition-colors ${
                      isActive
                        ? 'bg-leaf font-semibold text-leaf-on'
                        : 'font-medium text-rail-text-2 hover:bg-rail-2 hover:text-rail-text'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-3 border-t border-rail-line p-2.5">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="btn btn-primary w-full"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {primaryAction.icon}
              </span>
              {primaryAction.label}
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 px-1">
              <span className="block truncate text-[12px] font-medium text-rail-text">{userName}</span>
              <span className="block truncate text-[11px] text-rail-text-2">{userRole}</span>
            </span>
            {renderNotifications('rail')}
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="icon-btn text-rail-text-2 hover:bg-rail-2 hover:text-rail-text"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------------------
          Mobile top bar — the only header on the screen.
          --------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-line bg-surface px-3 py-2 md:hidden">
        <button
          type="button"
          onClick={() => navigate('home')}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-ctl text-left"
        >
          {academyMark('h-8 w-8 text-[13px]')}
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-ink">{settings.name}</span>
            <span className="block truncate text-[11px] text-ink-3">{settings.type}</span>
          </span>
        </button>

        {renderNotifications('bar')}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
            className="icon-btn h-11 w-11 border border-line"
          >
            <span className="material-symbols-outlined text-[21px]" aria-hidden="true">more_vert</span>
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              aria-label="Account"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 overflow-hidden rounded-card border border-line bg-surface shadow-[var(--shadow-pop)]"
            >
              <div className="border-b border-line-2 px-3 py-2.5">
                <p className="truncate text-[13px] font-semibold text-ink">{userName}</p>
                <p className="truncate text-[11px] text-ink-3">{userRole}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => navigate('menu')}
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-[13px] font-medium text-ink hover:bg-surface-2"
              >
                <span className="material-symbols-outlined text-[20px] text-ink-2" aria-hidden="true">settings</span>
                Settings
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className="flex min-h-11 w-full items-center gap-3 border-t border-line-2 px-3 text-left text-[13px] font-medium text-kumkum hover:bg-kumkum-tint"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ---------------------------------------------------------------
          The action follows the screen instead of always saying
          "Add Student" on tabs where that is not the next thing to do.
          --------------------------------------------------------------- */}
      {primaryAction && (
        <button
          type="button"
          onClick={primaryAction.onClick}
          className="btn btn-primary fixed right-4 z-40 shadow-[var(--shadow-pop)] md:hidden"
          style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            {primaryAction.icon}
          </span>
          {primaryAction.label}
        </button>
      )}

      <nav
        aria-label="Main"
        className="fixed bottom-0 left-0 z-50 grid w-full grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {bottomItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex min-h-[3.5rem] flex-col items-center justify-center gap-1 px-0.5 pt-2 pb-1.5 transition-colors ${
                isActive ? 'text-leaf' : 'text-ink-3'
              }`}
            >
              {isActive && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-b bg-leaf" aria-hidden="true" />
              )}
              <span
                className={`material-symbols-outlined text-[21px] ${isActive ? 'filled' : ''}`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className={`text-[10px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
