import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import { Spinner } from '../ui/spinner';
import { Switch } from '../ui/switch';
import React, { useState } from 'react';
import { Plan, Tenant, TenantUser } from '../../api';
import { formatRelativeTime } from '../../lib/schedule';
import { useDialogLifecycle } from './useDialogLifecycle';
import { PasswordInput } from '../ui/password-input';

interface AcademyUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  plan?: Plan;
  users: TenantUser[];
  loading: boolean;
  onOpenAddUser: () => void;
  onOpenSetLimit: () => void;
  onToggleOtp: (userId: string, enabled: boolean) => void;
  togglingOtpId: string | null;
  onUpdateUser: (userId: string, fullName: string, email: string, newPassword?: string) => Promise<void>;
  savingUserId: string | null;
  onToggleActive: (user: TenantUser) => Promise<void>;
  statusChangingId: string | null;
}

export const AcademyUsersModal: React.FC<AcademyUsersModalProps> = ({
  isOpen, onClose, tenant, plan, users, loading, onOpenAddUser, onOpenSetLimit,
  onToggleOtp, togglingOtpId, onUpdateUser, savingUserId, onToggleActive, statusChangingId
}) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editError, setEditError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  if (!isOpen) return null;

  const atLimit = plan ? tenant.userCount >= plan.maxUsers : false;
  const capacityPercent = plan ? Math.min(100, Math.round(tenant.userCount / plan.maxUsers * 100)) : 0;
  const activeCount = users.filter((user) => user.isActive).length;

  const saveEdit = async (event: React.FormEvent<HTMLFormElement>, userId: string) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get('newPassword') || '').trim();
    setEditError('');
    try {
      await onUpdateUser(userId, String(data.get('fullName')), String(data.get('email')), newPassword || undefined);
      setEditingUserId(null);
    } catch (requestError) {
      setEditError(requestError instanceof Error ? requestError.message : 'Unable to save changes.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-md animate-fadeIn"
      role="dialog" aria-modal="true" aria-labelledby="academy-users-title" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[92dvh] rounded-3xl overflow-hidden shadow-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] flex flex-col"
        onClick={(event) => event.stopPropagation()}>
        <div className="h-1.5 bg-gradient-to-r from-[#4d999d] to-[#64a85a] shrink-0" />
        <div ref={dialogRef} tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-5">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 id="academy-users-title" className="font-heading text-xl font-bold text-[#212121] dark:text-white">
                {tenant.name} — Users
              </h3>
              <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">
                {tenant.userCount} {tenant.userCount === 1 ? 'member' : 'members'} in this academy
              </p>
            </div>
            <Button type="button" onClick={onClose} aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
              <JisIcon className="text-[19px]">close</JisIcon>
            </Button>
          </div>

          {plan && (
            <div className="rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0] dark:bg-[#111c2b] p-4">
              <div className="flex justify-between items-center gap-3 text-xs font-bold text-[#575757] dark:text-[#cbd5e1]">
                <span className="inline-flex items-center gap-1.5"><JisIcon className="text-[16px] text-[#3fc073]">group</JisIcon>User capacity</span>
                <span>{tenant.userCount} / {plan.maxUsers} users</span>
              </div>
              <div className="h-2 rounded-full bg-white dark:bg-[#0b1422] overflow-hidden mt-2">
                <div className={'h-full rounded-full transition-all ' + (atLimit ? 'bg-[#ef4444]' : 'bg-gradient-to-r from-[#4d999d] to-[#64a85a]')}
                  style={{ width: capacityPercent + '%' }} />
              </div>
              <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-1.5">{capacityPercent}% capacity — {tenant.userCount} active</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={onOpenAddUser}
                className="rounded-2xl px-3.5 py-2 text-xs font-bold text-[#3fc073] bg-[#e9f7ee] dark:bg-[#3fc073]/20 hover:bg-[#cbecd8] dark:hover:bg-[#3fc073]/30 inline-flex items-center gap-1.5">
                <JisIcon className="text-[16px]">person_add</JisIcon>Add user
              </Button>
              <Button type="button" onClick={onOpenSetLimit}
                className="rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] px-3.5 py-2 text-xs font-bold text-[#575757] dark:text-[#cbd5e1] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] inline-flex items-center gap-1.5">
                <JisIcon className="text-[16px]">tune</JisIcon>Set limit
              </Button>
            </div>
            <span className="text-xs text-[#808080] dark:text-[#94a3b8]">{activeCount} active · {users.length - activeCount} inactive</span>
          </div>

          <div className="space-y-2">
            {loading ? <div className="py-4"><Spinner size="sm" inline text="Loading…" /></div> :
              users.length === 0 ? <p className="text-xs text-[#808080] dark:text-[#94a3b8] py-3 text-center">Nobody has been added yet.</p> :
              users.map((user) => {
                const isEditing = editingUserId === user.id;
                return (
                  <div key={user.id} className="rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0] dark:bg-[#111c2b] p-3">
                    {isEditing ? (
                      <form onSubmit={(event) => saveEdit(event, user.id)} className="space-y-3">
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div>
                            <label htmlFor={`edit-name-${user.id}`} className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Full name</label>
                            <input id={`edit-name-${user.id}`} name="fullName" required defaultValue={user.fullName} className="settings-input" />
                          </div>
                          <div>
                            <label htmlFor={`edit-email-${user.id}`} className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Email</label>
                            <input id={`edit-email-${user.id}`} name="email" type="email" required defaultValue={user.email} className="settings-input" />
                          </div>
                          <div>
                            <label htmlFor={`edit-password-${user.id}`} className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">New password</label>
                            <PasswordInput id={`edit-password-${user.id}`} name="newPassword" minLength={8} placeholder="Leave blank to keep current" className="settings-input" />
                          </div>
                        </div>
                        {editError && <div role="alert" className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{editError}</div>}
                        <div className="flex gap-2">
                          <Button disabled={savingUserId === user.id} className="btn-brand rounded-2xl px-4 py-2 text-xs font-bold disabled:opacity-50">
                            {savingUserId === user.id ? 'Saving…' : 'Save changes'}
                          </Button>
                          <Button type="button" onClick={() => { setEditingUserId(null); setEditError(''); }}
                            className="rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] px-4 py-2 text-xs font-bold text-[#575757] dark:text-[#cbd5e1]">
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#e9f7ee] dark:bg-[#3fc073]/20 text-[#3fc073] font-bold text-xs flex items-center justify-center shrink-0">
                          {user.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[#212121] dark:text-white truncate">{user.fullName}</div>
                          <div className="text-xs text-[#808080] dark:text-[#94a3b8] truncate">{user.email}</div>
                        </div>
                        <span className={'rounded-full px-2 py-1 text-xs font-bold shrink-0 ' +
                          (user.role === 'TenantAdmin' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' : 'bg-white text-[#808080] dark:bg-[#0b1422] dark:text-[#94a3b8]')}>
                          {user.role === 'TenantAdmin' ? 'Academy Admin' : 'Staff'}
                        </span>
                        <span className={'inline-flex items-center gap-1 text-xs font-bold shrink-0 ' + (user.isActive ? 'text-[#22c55e]' : 'text-[#9e9e9e]')}>
                          <span className={'w-1.5 h-1.5 rounded-full ' + (user.isActive ? 'bg-[#22c55e]' : 'bg-[#9e9e9e]')} />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-[#9e9e9e] dark:text-[#64748b] shrink-0 hidden sm:inline">{formatRelativeTime(user.lastLoginAt)}</span>
                        <label className="flex items-center gap-1.5 shrink-0" title="Require a login code emailed to this person">
                          <span className="text-xs font-semibold text-[#808080] dark:text-[#94a3b8] hidden md:inline">Code sign-in</span>
                          <Switch size="sm" aria-label={`Toggle code sign-in for ${user.fullName}`}
                            checked={user.otpEnabled} disabled={togglingOtpId === user.id}
                            onCheckedChange={(checked) => onToggleOtp(user.id, checked)} />
                        </label>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button type="button" onClick={() => { setEditingUserId(user.id); setEditError(''); }}
                            aria-label={`Edit ${user.fullName}`} title="Edit"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] text-[#575757] dark:text-[#cbd5e1] hover:text-[#3fc073] hover:border-[#3fc073]/40 transition-all active:scale-95">
                            <JisIcon className="text-[15px]">edit</JisIcon>
                          </Button>
                          <Button type="button" disabled={statusChangingId === user.id} onClick={() => void onToggleActive(user)}
                            aria-label={user.isActive ? `Deactivate ${user.fullName}` : `Reactivate ${user.fullName}`}
                            title={user.isActive ? 'Deactivate' : 'Reactivate'}
                            className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all active:scale-95 disabled:opacity-50 ${
                              user.isActive
                                ? 'border-rose-200 bg-rose-50 text-[#ef4444] hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40'
                                : 'border-emerald-200 bg-emerald-50 text-[#22c55e] hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40'
                            }`}>
                            <JisIcon className="text-[15px]">
                              {statusChangingId === user.id ? 'progress_activity' : user.isActive ? 'block' : 'check_circle'}
                            </JisIcon>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {atLimit && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 text-[#f59e0b] dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 px-4 py-3 text-xs flex items-start gap-2">
              <JisIcon className="text-[18px]">warning</JisIcon>
              <span>This academy has reached its <b>{plan?.maxUsers}-person</b> limit. Use "Set limit" to assign a larger plan before adding another person.</span>
            </div>
          )}
        </div>
        <div className="shrink-0 flex justify-end px-5 sm:px-7 py-4 border-t border-[#dbdbdb]/60 dark:border-[#243244]">
          <Button type="button" onClick={onClose}
            className="rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] px-5 py-2.5 text-xs font-bold text-[#575757] dark:text-[#cbd5e1] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
