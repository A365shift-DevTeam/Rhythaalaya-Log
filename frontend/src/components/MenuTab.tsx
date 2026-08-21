import React, { useState } from 'react';
import { OrgSettings } from '../types';
import { FinancialSettings } from './FinancialSettings';

interface MenuTabProps {
  settings: OrgSettings;
  setSettings: React.Dispatch<React.SetStateAction<OrgSettings>>;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MenuTab: React.FC<MenuTabProps> = ({
  settings,
  setSettings,
  onExportData,
  onImportData
}) => {
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState(settings.name);
  const [orgType, setOrgType] = useState(settings.type);
  const [feeDueDate, setFeeDueDate] = useState(settings.feeDueDate);
  const [defaultFee, setDefaultFee] = useState(settings.defaultMonthlyFee);

  const handleSaveOrg = () => {
    setSettings((prev) => ({
      ...prev,
      name: orgName,
      type: orgType,
      feeDueDate: feeDueDate,
      defaultMonthlyFee: Number(defaultFee)
    }));
    setIsEditingOrg(false);
  };

  const handleToggleDarkMode = () => {
    const newDark = !settings.darkMode;
    setSettings((prev) => ({ ...prev, darkMode: newDark }));
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Title */}
      <div>
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Academy Settings
        </h2>
        <p className="font-sans text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure organization profile, fee structure, appearance, and data backup
        </p>
      </div>

      {/* Organization Section */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-heading text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs">
            Studio Profile
          </h3>
          <button
            type="button"
            onClick={() => setIsEditingOrg(!isEditingOrg)}
            className="min-h-11 rounded-xl px-2 text-xs font-bold text-brand-500 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/50 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isEditingOrg ? 'close' : 'edit'}
            </span>
            <span>{isEditingOrg ? 'Cancel' : 'Edit Profile'}</span>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-200/60 dark:border-brand-800 shadow-xs overflow-hidden">
          {isEditingOrg ? (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="org-name" className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    Studio / Academy Name
                  </label>
                  <input
                    id="org-name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-brand-200 dark:border-brand-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="org-type" className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    Category / Type
                  </label>
                  <input
                    id="org-type"
                    type="text"
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-brand-200 dark:border-brand-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveOrg}
                className="btn-brand min-h-11 px-5 py-2.5 rounded-xl text-xs font-bold"
              >
                Save Profile
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <div className="p-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/60 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">storefront</span>
                  </div>
                  <div>
                    <div className="font-sans text-xs text-slate-400 font-medium">Academy Name</div>
                    <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                      {settings.name}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/60 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">category</span>
                  </div>
                  <div>
                    <div className="font-sans text-xs text-slate-400 font-medium">Academy Type</div>
                    <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                      {settings.type}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/60 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">image</span>
                  </div>
                  <div>
                    <div className="font-sans text-xs text-slate-400 font-medium">Logo</div>
                    <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                      Active Banner Logo
                    </div>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-brand-200 dark:border-brand-700 shrink-0">
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Appearance Section */}
      <section className="space-y-3">
        <h3 className="font-heading text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs px-1">
          Theme & Display
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-200/60 dark:border-brand-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
          <div className="p-4 sm:px-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/60 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">palette</span>
              </div>
              <div>
                <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                  Accent Color Palette
                </div>
                <div className="font-sans text-xs text-slate-500">
                  Select primary studio accent color
                </div>
              </div>
            </div>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
              <button
                type="button"
                onClick={() => setSettings((p) => ({ ...p, themeColor: 'blue' }))}
                aria-label="Use blue accent color"
                aria-pressed={settings.themeColor === 'blue'}
                className={`w-11 h-11 rounded-full border-[8px] border-white dark:border-slate-900 bg-blue-500 transition-all ${
                  settings.themeColor === 'blue' ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setSettings((p) => ({ ...p, themeColor: 'purple' }))}
                aria-label="Use purple accent color"
                aria-pressed={settings.themeColor === 'purple'}
                className={`w-11 h-11 rounded-full border-[8px] border-white dark:border-slate-900 bg-brand-500 transition-all ${
                  settings.themeColor === 'purple' ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setSettings((p) => ({ ...p, themeColor: 'emerald' }))}
                aria-label="Use emerald accent color"
                aria-pressed={settings.themeColor === 'emerald'}
                className={`w-11 h-11 rounded-full border-[8px] border-white dark:border-slate-900 bg-emerald-500 transition-all ${
                  settings.themeColor === 'emerald' ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setSettings((p) => ({ ...p, themeColor: 'rose' }))}
                aria-label="Use rose accent color"
                aria-pressed={settings.themeColor === 'rose'}
                className={`w-11 h-11 rounded-full border-[8px] border-white dark:border-slate-900 bg-rose-500 transition-all ${
                  settings.themeColor === 'rose' ? 'ring-2 ring-offset-2 ring-rose-500 scale-110' : ''
                }`}
              />
            </div>
          </div>

          <div className="p-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/60 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">dark_mode</span>
              </div>
              <div>
                <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                  Dark Atmosphere
                </div>
                <div className="font-sans text-xs text-slate-500">
                  Toggle dark mode interface
                </div>
              </div>
            </div>
            <label className="relative inline-flex min-h-11 items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label="Toggle dark mode"
                checked={settings.darkMode}
                onChange={handleToggleDarkMode}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
          </div>
        </div>
      </section>

      {/* Fee Settings Section */}
      <section className="space-y-3">
        <h3 className="font-heading text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs px-1">
          Fee Settings
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-200/60 dark:border-brand-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
          <div className="p-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/60 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div>
                <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                  Default Monthly Fee
                </div>
                <div className="font-sans text-xs text-slate-500">Standard rate for new students</div>
              </div>
            </div>
            <div className="font-heading font-extrabold text-base text-slate-900 dark:text-white">
              ₹{settings.defaultMonthlyFee}.00
            </div>
          </div>

          <div className="p-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/60 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">event_repeat</span>
              </div>
              <div>
                <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                  Fee Due Date
                </div>
                <div className="font-sans text-xs text-slate-500">Monthly invoice dispatch day</div>
              </div>
            </div>
            <div className="font-sans text-xs font-bold text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/80 px-3 py-1 rounded-full">
              {settings.feeDueDate}
            </div>
          </div>

        </div>
      </section>

      <FinancialSettings settings={settings} setSettings={setSettings} />

      {/* Data Backup Section */}
      <section className="space-y-3">
        <h3 className="font-heading text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs px-1">
          Data Management
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-200/60 dark:border-brand-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
          <button type="button"
            onClick={onExportData}
            className="w-full p-4 sm:px-6 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">file_download</span>
              </div>
              <div>
                <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                  Export Backup File
                </div>
                <div className="font-sans text-xs text-slate-500">
                  Download local snapshot as JSON file
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </button>

          <label className="min-h-16 p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-brand-500">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/60 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">file_upload</span>
              </div>
              <div>
                <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                  Restore Data Backup
                </div>
                <div className="font-sans text-xs text-slate-500">
                  Import existing JSON data file
                </div>
              </div>
            </div>
            <input type="file" accept=".json" onChange={onImportData} className="hidden" />
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </label>
        </div>
      </section>
    </div>
  );
};
