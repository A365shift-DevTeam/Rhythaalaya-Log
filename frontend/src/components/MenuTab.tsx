import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { JisIcon } from './JisIcon';
import React, { useEffect, useRef, useState } from 'react';
import { OrgSettings } from '../types';
import { FinancialSettings } from './FinancialSettings';
import { DEFAULT_WHATSAPP_TEMPLATE, WHATSAPP_TEMPLATE_VARIABLES } from '../whatsappTemplate';

interface MenuTabProps {
  settings: OrgSettings;
  setSettings: React.Dispatch<React.SetStateAction<OrgSettings>>;
  onExportData: () => void;
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
  onExportData
}) => {
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState(settings.name);
  const [orgType, setOrgType] = useState(settings.type);
  const [orgLogoUrl, setOrgLogoUrl] = useState(settings.logoUrl);
  const [logoProcessing, setLogoProcessing] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [templateDraft, setTemplateDraft] = useState(settings.whatsappTemplate);
  const templateRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTemplateDraft(settings.whatsappTemplate);
  }, [settings.whatsappTemplate]);

  const templateDirty = templateDraft !== settings.whatsappTemplate;

  const insertTemplateVariable = (token: string) => {
    const el = templateRef.current;
    if (!el) {
      setTemplateDraft((prev) => prev + token);
      return;
    }
    const start = el.selectionStart ?? templateDraft.length;
    const end = el.selectionEnd ?? start;
    const next = templateDraft.slice(0, start) + token + templateDraft.slice(end);
    setTemplateDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSaveTemplate = () => {
    setSettings((prev) => ({ ...prev, whatsappTemplate: templateDraft.trim() || DEFAULT_WHATSAPP_TEMPLATE }));
  };

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
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#212121] dark:text-white tracking-tight">
          Academy Settings
        </h2>
        <p className="font-sans text-xs md:text-sm text-[#808080] dark:text-[#94a3b8] mt-1">
          Configure organization profile, fee structure, appearance, and data backup
        </p>
      </div>

      {/* Organization Section */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-heading text-xs font-bold text-[#808080] dark:text-[#94a3b8] uppercase tracking-wider">
            Studio Profile
          </h3>
          <Button
            type="button"
            onClick={() => isEditingOrg ? setIsEditingOrg(false) : openEditOrg()}
            className="min-h-10 rounded-2xl px-2.5 text-xs font-bold text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 flex items-center gap-1 transition-colors"
          >
            <JisIcon className="text-[16px]">
              {isEditingOrg ? 'close' : 'edit'}
            </JisIcon>
            <span>{isEditingOrg ? 'Cancel' : 'Edit Profile'}</span>
          </Button>
        </div>

        <div className="premium-card overflow-hidden">
          {isEditingOrg ? (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="org-name" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                    Studio / Academy Name
                  </label>
                  <input
                    id="org-name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm font-semibold text-[#212121] dark:text-white focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073] outline-none transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="org-type" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                    Category / Type
                  </label>
                  <input
                    id="org-type"
                    type="text"
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm font-semibold text-[#212121] dark:text-white focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073] outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Logo</label>
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#dbdbdb] dark:border-[#243244] shrink-0 flex items-center justify-center bg-[#f0f0f0] dark:bg-[#0b1422]">
                    {orgLogoUrl
                      ? <img src={orgLogoUrl} alt="Logo preview" className="w-full h-full object-contain" />
                      : <JisIcon className="text-[#3fc073] text-2xl">image</JisIcon>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="min-h-11 inline-flex items-center gap-1.5 px-4 rounded-2xl text-xs font-bold text-[#3fc073] bg-[#e9f7ee] dark:bg-[#3fc073]/20 hover:bg-[#cbecd8] cursor-pointer transition-colors">
                      <JisIcon className="text-[16px]">{logoProcessing ? 'progress_activity' : 'upload'}</JisIcon>
                      <span>{logoProcessing ? 'Processing…' : orgLogoUrl ? 'Change logo' : 'Upload logo'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoChange} disabled={logoProcessing} className="hidden" />
                    </label>
                    {orgLogoUrl && (
                      <Button type="button" onClick={() => setOrgLogoUrl('')} disabled={logoProcessing}
                        className="min-h-11 px-3.5 rounded-2xl text-xs font-bold text-[#ef4444] hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50">
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-[#808080] dark:text-[#94a3b8]">PNG or JPG, up to 5MB — resized automatically.</p>
                {logoError && <p className="mt-1 text-xs font-semibold text-[#ef4444]">{logoError}</p>}
              </div>

              <Button
                type="button"
                onClick={handleSaveOrg}
                disabled={logoProcessing}
                className="btn-brand min-h-11 px-5 py-2.5 rounded-2xl text-xs font-bold disabled:opacity-50"
              >
                Save Profile
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[#dbdbdb]/60 dark:divide-[#243244]">
              <div className="p-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#e9f7ee] dark:bg-[#3fc073]/20 text-[#3fc073] flex items-center justify-center shrink-0">
                    <JisIcon className="">storefront</JisIcon>
                  </div>
                  <div>
                    <div className="font-sans text-xs text-[#808080] font-medium">Academy Name</div>
                    <div className="font-sans text-sm font-bold text-[#212121] dark:text-white">
                      {settings.name}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#e9f7ee] dark:bg-[#3fc073]/20 text-[#3fc073] flex items-center justify-center shrink-0">
                    <JisIcon className="">category</JisIcon>
                  </div>
                  <div>
                    <div className="font-sans text-xs text-[#808080] font-medium">Academy Type</div>
                    <div className="font-sans text-sm font-bold text-[#212121] dark:text-white">
                      {settings.type}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#e9f7ee] dark:bg-[#3fc073]/20 text-[#3fc073] flex items-center justify-center shrink-0">
                    <JisIcon className="">image</JisIcon>
                  </div>
                  <div>
                    <div className="font-sans text-xs text-[#808080] font-medium">Logo</div>
                    <div className="font-sans text-sm font-bold text-[#212121] dark:text-white">
                      {settings.logoUrl ? 'Active banner logo' : 'No logo uploaded yet'}
                    </div>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-2xl overflow-hidden border border-[#dbdbdb] dark:border-[#243244] shrink-0 flex items-center justify-center bg-[#f0f0f0] dark:bg-[#0b1422]">
                  {settings.logoUrl
                    ? <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    : <JisIcon className="text-[#3fc073] text-[18px]">image</JisIcon>}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Appearance Section */}
      <section className="space-y-3">
        <h3 className="font-heading text-xs font-bold text-[#808080] dark:text-[#94a3b8] uppercase tracking-wider px-1">
          Theme & Display
        </h3>
        <div className="premium-card">
          <div className="p-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#e9f7ee] dark:bg-[#3fc073]/20 text-[#3fc073] flex items-center justify-center shrink-0">
                <JisIcon className="">dark_mode</JisIcon>
              </div>
              <div>
                <div className="font-sans text-sm font-bold text-[#212121] dark:text-white">
                  Dark Atmosphere
                </div>
                <div className="font-sans text-xs text-[#808080]">
                  Toggle dark mode interface
                </div>
              </div>
            </div>
            <Switch
              size="lg"
              aria-label="Toggle dark mode"
              checked={settings.darkMode}
              onCheckedChange={handleToggleDarkMode}
              className="data-checked:bg-[#64a85a] data-unchecked:bg-[#dbdbdb] dark:data-unchecked:bg-[#243244]"
            />
          </div>
        </div>
      </section>

      <FinancialSettings settings={settings} setSettings={setSettings} />

      {/* WhatsApp Template Section */}
      <section className="space-y-3">
        <h3 className="font-heading text-xs font-bold text-[#808080] dark:text-[#94a3b8] uppercase tracking-wider px-1">
          WhatsApp Message Template
        </h3>
        <div className="premium-card p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#25D366]/15 text-[#13773a] dark:text-emerald-300 flex items-center justify-center shrink-0">
              <JisIcon className="">forum</JisIcon>
            </div>
            <div>
              <div className="font-sans text-sm font-bold text-[#212121] dark:text-white">Fee reminder message</div>
              <div className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">
                This template fills the WhatsApp message for a student. Variables in curly braces are replaced with the
                student's real details when you send.
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="whatsapp-template" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
              Message template
            </label>
            <textarea
              id="whatsapp-template"
              ref={templateRef}
              rows={6}
              value={templateDraft}
              onChange={(e) => setTemplateDraft(e.target.value)}
              maxLength={2000}
              className="w-full p-3.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm text-[#212121] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0b1422] focus:border-[#25D366] focus:ring-4 focus:ring-[#25D366]/20 transition-all"
            />
          </div>

          <div>
            <div className="text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Insert a variable</div>
            <div className="flex flex-wrap gap-1.5">
              {WHATSAPP_TEMPLATE_VARIABLES.map(({ token, label }) => (
                <Button
                  key={token}
                  type="button"
                  onClick={() => insertTemplateVariable(token)}
                  title={`Insert ${label}`}
                  className="min-h-8 px-2.5 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] text-xs font-semibold text-[#575757] dark:text-[#cbd5e1] hover:border-[#25D366]/50 hover:text-[#13773a] dark:hover:text-emerald-300 transition-colors"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              onClick={() => setTemplateDraft(DEFAULT_WHATSAPP_TEMPLATE)}
              disabled={templateDraft === DEFAULT_WHATSAPP_TEMPLATE}
              className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#808080] dark:text-[#94a3b8] hover:text-[#212121] dark:hover:text-white hover:bg-[#f0f0f0] dark:hover:bg-[#172435] disabled:opacity-50 transition-colors"
            >
              Reset to default
            </Button>
            <Button
              type="button"
              onClick={handleSaveTemplate}
              disabled={!templateDirty}
              className="btn-brand min-h-11 px-5 py-2.5 rounded-2xl text-xs font-bold disabled:opacity-50"
            >
              Save template
            </Button>
          </div>
        </div>
      </section>

      {/* Data Backup Section */}
      <section className="space-y-3">
        <h3 className="font-heading text-xs font-bold text-[#808080] dark:text-[#94a3b8] uppercase tracking-wider px-1">
          Data Management
        </h3>
        <div className="premium-card divide-y divide-[#dbdbdb]/60 dark:divide-[#243244]">
          <Button type="button"
            onClick={onExportData}
            className="w-full p-4 sm:px-6 flex items-center justify-between text-left hover:bg-[#f0f0f0]/70 dark:hover:bg-[#172435]/60 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#22c55e] flex items-center justify-center shrink-0">
                <JisIcon className="">file_download</JisIcon>
              </div>
              <div>
                <div className="font-sans text-sm font-bold text-[#212121] dark:text-white">
                  Export Backup File
                </div>
                <div className="font-sans text-xs text-[#808080]">
                  Download local snapshot as JSON file
                </div>
              </div>
            </div>
            <JisIcon className="text-[#9e9e9e]">chevron_right</JisIcon>
          </Button>

          {/* Restore is not self-serve: it used to open a file picker and then reject every
              file. Say so up front rather than letting anyone pick a backup that goes nowhere. */}
          <div className="min-h-16 p-4 sm:px-6 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#f0f0f0] dark:bg-[#172435] text-[#6b6b6b] dark:text-[#94a3b8] flex items-center justify-center shrink-0">
              <JisIcon className="">lock</JisIcon>
            </div>
            <div>
              <div className="font-sans text-sm font-bold text-[#6b6b6b] dark:text-[#94a3b8]">
                Restoring a backup
              </div>
              <div className="font-sans text-xs text-[#6b6b6b] dark:text-[#94a3b8]">
                Uploading a backup file here is not supported. Contact support to restore an
                academy from a snapshot — they run it through the migration workflow so existing
                records are not overwritten.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
