import React, { useEffect, useState } from 'react';
import { OrgSettings } from '../types';
import { FinancialSettings } from './FinancialSettings';
import { DetailRow, Section, Toggle } from './SettingsUI';

interface MenuTabProps {
  settings: OrgSettings;
  setSettings: React.Dispatch<React.SetStateAction<OrgSettings>>;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/* Keys match what the server already stores in themeColor. */
const ACCENTS: { key: string; label: string; swatch: string }[] = [
  { key: 'emerald', label: 'Green', swatch: '#1f7a55' },
  { key: 'blue', label: 'Blue', swatch: '#1d5fa8' },
  { key: 'purple', label: 'Purple', swatch: '#6a3fa0' },
  { key: 'rose', label: 'Rose', swatch: '#b23a5f' }
];

export const MenuTab: React.FC<MenuTabProps> = ({
  settings,
  setSettings,
  onExportData,
  onImportData
}) => {
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState(settings.name);
  const [orgType, setOrgType] = useState(settings.type);
  const [orgLogo, setOrgLogo] = useState(settings.logoUrl);

  useEffect(() => {
    if (editingOrg) return;
    setOrgName(settings.name);
    setOrgType(settings.type);
    setOrgLogo(settings.logoUrl);
  }, [settings.name, settings.type, settings.logoUrl, editingOrg]);

  const saveOrg = (event: React.FormEvent) => {
    event.preventDefault();
    setSettings((previous) => ({
      ...previous,
      name: orgName.trim() || previous.name,
      type: orgType.trim(),
      logoUrl: orgLogo.trim()
    }));
    setEditingOrg(false);
  };

  const toggleDarkMode = () => {
    setSettings((previous) => ({ ...previous, darkMode: !previous.darkMode }));
  };

  const accent = settings.themeColor || 'emerald';

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8 md:space-y-6">
      <header>
        <h1 className="display-lg">Settings</h1>
        <p className="label mt-1">Your academy details, how the app looks, receipts, and backups.</p>
      </header>

      <Section
        title="Academy"
        description="Shown in the sidebar, on receipts, and to everyone signed in."
        action={
          <button
            type="button"
            onClick={() => setEditingOrg((open) => !open)}
            className="btn btn-ghost btn-sm text-leaf"
          >
            {editingOrg ? 'Cancel' : 'Edit'}
          </button>
        }
      >
        {editingOrg ? (
          <form onSubmit={saveOrg} className="space-y-3 p-3 md:p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="org-name" className="label mb-1.5 block font-semibold text-ink">Name</label>
                <input
                  id="org-name"
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  required
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="org-type" className="label mb-1.5 block font-semibold text-ink">
                  What you teach
                </label>
                <input
                  id="org-type"
                  value={orgType}
                  onChange={(event) => setOrgType(event.target.value)}
                  placeholder="Music &amp; dance school"
                  className="field"
                />
              </div>
            </div>
            <div>
              <label htmlFor="org-logo" className="label mb-1.5 block font-semibold text-ink">
                Logo image address
              </label>
              <input
                id="org-logo"
                type="url"
                value={orgLogo}
                onChange={(event) => setOrgLogo(event.target.value)}
                placeholder="https://…"
                className="field"
              />
              <p className="label-xs mt-1.5">Leave empty to use the first letter of the academy name.</p>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary btn-sm">Save academy</button>
            </div>
          </form>
        ) : (
          <dl className="divide-y divide-line-2">
            <DetailRow label="Name" value={settings.name} />
            <DetailRow label="What you teach" value={settings.type || 'Not set'} />
            <DetailRow label="Logo">
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-ctl bg-leaf text-[13px] font-semibold text-leaf-on">
                  {settings.logoUrl
                    ? <img src={settings.logoUrl} alt="" className="h-full w-full object-cover" />
                    : settings.name.trim().charAt(0).toUpperCase() || 'A'}
                </span>
                <span className="label-xs">{settings.logoUrl ? 'Custom image' : 'Using the initial'}</span>
              </span>
            </DetailRow>
          </dl>
        )}
      </Section>

      <Section title="Appearance" description="Applies to everyone in this academy.">
        <div className="divide-y divide-line-2">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 md:px-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">Accent colour</p>
              <p className="label-xs mt-0.5">Used for buttons and the selected tab.</p>
            </div>
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Accent colour">
              {ACCENTS.map((option) => {
                const selected = accent === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={option.label}
                    title={option.label}
                    onClick={() => setSettings((previous) => ({ ...previous, themeColor: option.key }))}
                    className={`flex h-9 w-9 items-center justify-center rounded-ctl border-2 transition-colors ${
                      selected ? 'border-ink' : 'border-line hover:border-ink-3'
                    }`}
                  >
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: option.swatch }} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-3 md:px-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">Dark mode</p>
              <p className="label-xs mt-0.5">Easier on the eyes in a dim studio.</p>
            </div>
            <Toggle checked={settings.darkMode} onChange={toggleDarkMode} label="Dark mode" />
          </div>
        </div>
      </Section>

      <FinancialSettings settings={settings} setSettings={setSettings} />

      <Section title="Your data" description="Take a copy of what is in the app.">
        <div className="divide-y divide-line-2">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 md:px-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">Download a copy</p>
              <p className="label-xs mt-0.5">
                Students, batches, courses, teachers, and the ledger, as a JSON file.
              </p>
            </div>
            <button type="button" onClick={onExportData} className="btn btn-secondary btn-sm shrink-0">
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">download</span>
              Download
            </button>
          </div>

          {/* The server rejects direct JSON import, so the screen says so up
              front instead of failing after the file is picked. */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 md:px-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">Restore from a file</p>
              <p className="label-xs mt-0.5">
                Not available here — bulk imports go through your administrator to keep academies separate.
              </p>
            </div>
            <label className="btn btn-secondary btn-sm shrink-0 opacity-60">
              <input type="file" accept=".json" onChange={onImportData} className="sr-only" />
              Choose file
            </label>
          </div>
        </div>
      </Section>
    </div>
  );
};




