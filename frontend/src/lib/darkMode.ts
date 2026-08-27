// Dark mode is a per-viewer preference (localStorage), not the shared org setting — the backend
// only lets a TenantAdmin write org settings (PUT /api/settings is TenantAdmin-only), so wiring
// this to settings.darkMode would 403 for Staff. Kept independent of OrgSettings.darkMode
// entirely so every role — TenantAdmin, Staff, SuperAdmin — can flip it for themselves.
//
// Read/applied once at the top of App() (not inside a role-specific branch below it) so it's
// consistent no matter which view renders: scoping this to just one branch previously left a
// stray `dark` class on <html> when switching roles in the same tab, with the other branch never
// accounting for it.
export const DARK_MODE_KEY = 'rhythaalaya_dark_mode';

export function readStoredDarkMode(): boolean {
  try { return localStorage.getItem(DARK_MODE_KEY) === 'true'; } catch { return false; }
}

export function applyDarkMode(darkMode: boolean): void {
  document.documentElement.classList.toggle('dark', darkMode);
  try { localStorage.setItem(DARK_MODE_KEY, String(darkMode)); } catch { /* private browsing etc. */ }
}
