import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { JisIcon } from './JisIcon';
import { Spinner } from './ui/spinner';
import React, { useEffect, useRef, useState } from 'react';
import { OrgSettings } from '../types';
import { FinancialSettings } from './FinancialSettings';
import { DEFAULT_WHATSAPP_TEMPLATE, WHATSAPP_TEMPLATE_VARIABLES } from '../whatsappTemplate';
import { ApiError, api, Session, TenantUser } from '../api';
import { confirmAction } from '../lib/confirm';

// Gathers everything a TenantAdmin manages for their academy: their team's accounts/sign-in, org
// profile, financial settings, the WhatsApp template, and data backup — each its own tab. Only
// ever rendered for a TenantAdmin — App.tsx keeps this tab out of Staff's navigation entirely, so
// there's no internal role check here. Dark mode lives outside this page now (a per-viewer
// preference in the shared header, not an org-wide admin setting).
interface AdminPageProps {
  settings: OrgSettings;
  setSettings: React.Dispatch<React.SetStateAction<OrgSettings>>;
  onExportData: () => void;
  session: Session;
}

type AdminSection = 'users' | 'profile' | 'finance' | 'whatsapp' | 'backup';

const SECTIONS: { id: AdminSection; label: string; icon: string }[] = [
  { id: 'users', label: 'User Management', icon: 'group' },
  { id: 'profile', label: 'General Settings', icon: 'storefront' },
  { id: 'finance', label: 'Financial Settings', icon: 'payments' },
  { id: 'whatsapp', label: 'WhatsApp Template', icon: 'forum' },
  { id: 'backup', label: 'Data Backup', icon: 'file_download' }
];

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

export const AdminPage: React.FC<AdminPageProps> = ({
  settings,
  setSettings,
  onExportData,
  session
}) => {
  const [section, setSection] = useState<AdminSection>('users');

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#212121] dark:text-white tracking-tight">
          Admin
        </h2>
        <p className="font-sans text-xs md:text-sm text-[#808080] dark:text-[#94a3b8] mt-1">
          Manage your academy's team, profile, fee structure, and data backup
        </p>
      </div>

      <div role="tablist" aria-label="Admin sections" className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {SECTIONS.map((item) => {
          const isActive = section === item.id;
          return (
            <button key={item.id} type="button" role="tab" aria-selected={isActive}
              onClick={() => setSection(item.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#4d999d] to-[#64a85a] text-white shadow-md shadow-[#4d999d]/25'
                  : 'border border-[#dbdbdb] bg-white text-[#575757] hover:border-[#3fc073]/40 dark:border-[#243244] dark:bg-[#111c2b] dark:text-[#cbd5e1]'
              }`}>
              <JisIcon className="text-[16px]">{item.icon}</JisIcon>
              {item.label}
            </button>
          );
        })}
      </div>

      {section === 'users' && <UserManagementSection session={session} />}
      {section === 'profile' && <OrgProfileSection settings={settings} setSettings={setSettings} />}
      {section === 'finance' && <FinancialSettings settings={settings} setSettings={setSettings} />}
      {section === 'whatsapp' && <WhatsAppTemplateSection settings={settings} setSettings={setSettings} />}
      {section === 'backup' && <DataBackupSection onExportData={onExportData} />}
    </div>
  );
};

function UserManagementSection({ session }: { session: Session }) {
  const [team, setTeam] = useState<TenantUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [togglingOtpId, setTogglingOtpId] = useState<string | null>(null);

  const loadTeam = () => {
    setTeamLoading(true);
    return api.myTeam(session.token)
      .then(setTeam)
      .catch((requestError) => {
        setTeamError(requestError instanceof ApiError ? requestError.message : 'Unable to load your team.');
      })
      .finally(() => setTeamLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setTeamLoading(true);
    api.myTeam(session.token)
      .then((users) => { if (!cancelled) setTeam(users); })
      .catch((requestError) => {
        if (!cancelled) setTeamError(requestError instanceof ApiError ? requestError.message : 'Unable to load your team.');
      })
      .finally(() => { if (!cancelled) setTeamLoading(false); });
    return () => { cancelled = true; };
  }, [session.token]);

  async function createTeamMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setTeamError('');
    setCreating(true);
    try {
      await api.createTeamMember(session.token, {
        fullName: String(data.get('fullName')),
        email: String(data.get('email')),
        password: String(data.get('password'))
      });
      form.reset();
      await loadTeam();
    } catch (requestError) {
      setTeamError(requestError instanceof ApiError ? requestError.message : 'Unable to add that user.');
    } finally {
      setCreating(false);
    }
  }

  async function saveEditingUser(event: React.FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get('newPassword') || '').trim();
    setTeamError('');
    setSavingUserId(userId);
    try {
      const updated = await api.updateTeamMember(session.token, userId, {
        fullName: String(data.get('fullName')), email: String(data.get('email')),
        newPassword: newPassword || undefined
      });
      setTeam((current) => current.map((user) => user.id === userId ? updated : user));
      setEditingUserId(null);
    } catch (requestError) {
      setTeamError(requestError instanceof ApiError ? requestError.message : 'Unable to save changes.');
    } finally {
      setSavingUserId(null);
    }
  }

  async function toggleActive(user: TenantUser) {
    if (user.isActive && !(await confirmAction({
      title: `Deactivate ${user.fullName}?`,
      text: "They won't be able to sign in until reactivated.",
      confirmText: 'Deactivate',
      tone: 'destructive',
    }))) return;
    setTeamError('');
    setStatusChangingId(user.id);
    try {
      const updated = await api.setTeamMemberActive(session.token, user.id, !user.isActive);
      setTeam((current) => current.map((row) => row.id === user.id ? updated : row));
    } catch (requestError) {
      setTeamError(requestError instanceof ApiError ? requestError.message : 'Unable to update that account.');
    } finally {
      setStatusChangingId(null);
    }
  }

  async function toggleOtp(userId: string, enabled: boolean) {
    setTeamError('');
    setTogglingOtpId(userId);
    try {
      const updated = await api.setMyTeamMemberOtp(session.token, userId, enabled);
      setTeam((current) => current.map((user) => user.id === userId ? updated : user));
    } catch (requestError) {
      setTeamError(requestError instanceof ApiError ? requestError.message : 'Unable to update OTP setting.');
    } finally {
      setTogglingOtpId(null);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={createTeamMember} className="premium-card p-4 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <JisIcon className="text-[#3fc073] text-[18px]">person_add</JisIcon>
          <h3 className="text-xs font-bold text-[#212121] dark:text-white">Add a Staff account</h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <label className="block">
            <span className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Full name</span>
            <input name="fullName" required placeholder="Staff member's name"
              className="w-full px-3.5 py-2.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm text-[#212121] dark:text-white outline-none focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073]" />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Email address</span>
            <input name="email" type="email" required placeholder="staff@academy.com"
              className="w-full px-3.5 py-2.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm text-[#212121] dark:text-white outline-none focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073]" />
          </label>
          <label className="block">
            <span className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Temporary password</span>
            <input name="password" type="password" required minLength={8} placeholder="Minimum 8 characters"
              className="w-full px-3.5 py-2.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm text-[#212121] dark:text-white outline-none focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073]" />
          </label>
        </div>
        <Button disabled={creating}
          className="btn-brand rounded-2xl px-4 py-2.5 text-xs font-bold inline-flex items-center gap-2 disabled:opacity-50">
          <JisIcon className="text-[17px]">{creating ? 'progress_activity' : 'person_add'}</JisIcon>
          {creating ? 'Adding…' : 'Add Staff account'}
        </Button>
      </form>

      <div className="premium-card divide-y divide-[#dbdbdb]/60 dark:divide-[#243244]">
        {teamError && <div className="p-4 sm:px-6 text-xs font-semibold text-[#ef4444]">{teamError}</div>}
        {teamLoading ? (
          <div className="p-4 sm:px-6"><Spinner size="sm" inline text="Loading your team…" /></div>
        ) : team.length === 0 ? (
          <div className="p-4 sm:px-6 text-xs text-[#808080] dark:text-[#94a3b8]">No staff accounts yet.</div>
        ) : team.map((user) => {
          const managed = user.role === 'Staff';
          const isEditing = editingUserId === user.id;
          return (
            <div key={user.id} className="p-4 sm:px-6">
              {isEditing ? (
                <form onSubmit={(event) => saveEditingUser(event, user.id)} className="space-y-3">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <label className="block">
                      <span className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Full name</span>
                      <input name="fullName" required defaultValue={user.fullName}
                        className="w-full px-3.5 py-2.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm text-[#212121] dark:text-white outline-none focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073]" />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Email address</span>
                      <input name="email" type="email" required defaultValue={user.email}
                        className="w-full px-3.5 py-2.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm text-[#212121] dark:text-white outline-none focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073]" />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">New password</span>
                      <input name="newPassword" type="password" minLength={8} placeholder="Leave blank to keep current"
                        className="w-full px-3.5 py-2.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm text-[#212121] dark:text-white outline-none focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073]" />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button disabled={savingUserId === user.id}
                      className="btn-brand rounded-2xl px-4 py-2 text-xs font-bold disabled:opacity-50">
                      {savingUserId === user.id ? 'Saving…' : 'Save changes'}
                    </Button>
                    <Button type="button" onClick={() => setEditingUserId(null)}
                      className="rounded-2xl border border-[#dbdbdb] dark:border-[#243244] px-4 py-2 text-xs font-bold text-[#575757] dark:text-[#cbd5e1]">
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#e9f7ee] dark:bg-[#3fc073]/20 text-[#3fc073] font-bold text-xs flex items-center justify-center shrink-0">
                      {user.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-sans text-sm font-bold text-[#212121] dark:text-white truncate flex items-center gap-1.5">
                        {user.fullName}
                        {user.role === 'TenantAdmin' && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700">Admin</span>
                        )}
                        {!user.isActive && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#f0f0f0] text-[#808080] dark:bg-[#172435] dark:text-[#94a3b8]">Inactive</span>
                        )}
                      </div>
                      <div className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-2 shrink-0"
                      title={!managed ? 'Only Staff accounts can be managed here' : 'Require a login code emailed to this user'}>
                      <span className="text-xs font-semibold text-[#808080] dark:text-[#94a3b8]">OTP</span>
                      <Switch size="default" aria-label={`Toggle OTP for ${user.fullName}`}
                        checked={user.otpEnabled} disabled={!managed || togglingOtpId === user.id}
                        onCheckedChange={(checked) => toggleOtp(user.id, checked)}
                        className="data-checked:bg-[#64a85a] data-unchecked:bg-[#dbdbdb] dark:data-unchecked:bg-[#243244]" />
                    </label>
                    <Button type="button" disabled={!managed} onClick={() => setEditingUserId(user.id)}
                      title={!managed ? 'Only Staff accounts can be managed here' : undefined}
                      className="rounded-2xl border border-[#dbdbdb] dark:border-[#243244] px-3 py-2 text-xs font-bold text-[#575757] dark:text-[#cbd5e1] disabled:opacity-40 inline-flex items-center gap-1">
                      <JisIcon className="text-[15px]">edit</JisIcon>Edit
                    </Button>
                    <Button type="button" disabled={!managed || statusChangingId === user.id} onClick={() => toggleActive(user)}
                      title={!managed ? 'Only Staff accounts can be managed here' : undefined}
                      className={`rounded-2xl px-3 py-2 text-xs font-bold disabled:opacity-40 inline-flex items-center gap-1 ${
                        user.isActive
                          ? 'border border-rose-200 bg-rose-50 text-[#ef4444] hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40'
                          : 'border border-emerald-200 bg-emerald-50 text-[#22c55e] hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40'
                      }`}>
                      <JisIcon className="text-[15px]">
                        {statusChangingId === user.id ? 'progress_activity' : user.isActive ? 'person_off' : 'person'}
                      </JisIcon>
                      {user.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrgProfileSection({ settings, setSettings }: {
  settings: OrgSettings; setSettings: React.Dispatch<React.SetStateAction<OrgSettings>>;
}) {
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

  return (
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
  );
}

function WhatsAppTemplateSection({ settings, setSettings }: {
  settings: OrgSettings; setSettings: React.Dispatch<React.SetStateAction<OrgSettings>>;
}) {
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

  return (
    <section className="space-y-3">
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
  );
}

function DataBackupSection({ onExportData }: { onExportData: () => void }) {
  return (
    <section className="space-y-3">
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
  );
}
