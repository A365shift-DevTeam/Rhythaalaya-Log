import React, { useState } from 'react';
import { OrgSettings } from '../types';
import { FinancialSettings } from './FinancialSettings';

interface MenuTabProps {
  settings: OrgSettings;
  setSettings: React.Dispatch<React.SetStateAction<OrgSettings>>;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MAX_LOGO_DIMENSION = 320;
const MAX_LOGO_FILE_BYTES = 5 * 1024 * 1024;

function resizeLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_LOGO_DIMENSION / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Could not process that image.')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
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
  const [orgLogoUrl, setOrgLogoUrl] = useState(settings.logoUrl);
  const [logoProcessing, setLogoProcessing] = useState(false);
  const [logoError, setLogoError] = useState('');

  const openEditOrg = () => {
    setOrgName(settings.name);
    setOrgType(settings.type);
    setOrgLogoUrl(settings.logoUrl);
    setLogoError('');
    setIsEditingOrg(true);
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setLogoError('Please choose an image file.'); return; }
    if (file.size > MAX_LOGO_FILE_BYTES) { setLogoError('Image is too large — please choose one under 5MB.'); return; }
    setLogoError('');
    setLogoProcessing(true);
    try {
      setOrgLogoUrl(await resizeLogoFile(file));
    } catch (requestError) {
      setLogoError(requestError instanceof Error ? requestError.message : 'Could not process that image.');
    } finally {
      setLogoProcessing(false);
    }
  };

  const handleSaveOrg = () => {
    setSettings((prev) => ({ ...prev, name: orgName, type: orgType, logoUrl: orgLogoUrl }));
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
            onClick={() => isEditingOrg ? setIsEditingOrg(false) : openEditOrg()}
            className="min-h-11 rounded-xl px-2 text-xs font-bold text-brand-500 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/50 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isEditingOrg ? 'close' : 'edit'}
            </span>
            <span>{isEditingOrg ? 'Cancel' : 'Edit Profile'}</span>
          </button>
        </div>

        <div className="premium-card overflow-hidden">
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

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Logo</label>
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-brand-200 dark:border-brand-700 shrink-0 flex items-center justify-center bg-brand-50 dark:bg-brand-900/60">
                    {orgLogoUrl
                      ? <img src={orgLogoUrl} alt="Logo preview" className="w-full h-full object-contain" />
                      : <span className="material-symbols-outlined text-brand-400 text-2xl">image</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="min-h-11 inline-flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/60 hover:bg-brand-100 dark:hover:bg-brand-900 cursor-pointer transition-colors">
                      <span className="material-symbols-outlined text-[16px]">{logoProcessing ? 'progress_activity' : 'upload'}</span>
                      <span>{logoProcessing ? 'Processing…' : orgLogoUrl ? 'Change logo' : 'Upload logo'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoChange} disabled={logoProcessing} className="hidden" />
                    </label>
                    {orgLogoUrl && (
                      <button type="button" onClick={() => setOrgLogoUrl('')} disabled={logoProcessing}
                        className="min-h-11 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">PNG or JPG, up to 5MB — resized automatically.</p>
                {logoError && <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">{logoError}</p>}
              </div>

              <button
                type="button"
                onClick={handleSaveOrg}
                disabled={logoProcessing}
                className="btn-brand min-h-11 px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
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
                      {settings.logoUrl ? 'Active banner logo' : 'No logo uploaded yet'}
                    </div>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-brand-200 dark:border-brand-700 shrink-0 flex items-center justify-center bg-brand-50 dark:bg-brand-900/60">
                  {settings.logoUrl
                    ? <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    : <span className="material-symbols-outlined text-brand-400 text-[18px]">image</span>}
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
        <div className="premium-card">
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
              <div className="relative w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-slate-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
          </div>
        </div>
      </section>

      <FinancialSettings settings={settings} setSettings={setSettings} />

      {/* Data Backup Section */}
      <section className="space-y-3">
        <h3 className="font-heading text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs px-1">
          Data Management
        </h3>
        <div className="premium-card divide-y divide-slate-100 dark:divide-slate-800">
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
