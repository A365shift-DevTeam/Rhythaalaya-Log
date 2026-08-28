import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useState } from 'react';
import { useDialogLifecycle } from './useDialogLifecycle';
import { SimpleSelect } from '../ui/select';
import { PasswordInput } from '../ui/password-input';

interface AddOrgAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantName: string;
  busy: boolean;
  onAdd: (fullName: string, email: string, password: string, role: 'TenantAdmin' | 'Staff') => Promise<void>;
}

export const AddOrgAdminModal: React.FC<AddOrgAdminModalProps> = ({ isOpen, onClose, tenantName, busy, onAdd }) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'TenantAdmin' | 'Staff'>('TenantAdmin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(''); setFullName(''); setRole('TenantAdmin'); setPassword(''); setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await onAdd(fullName.trim(), email.trim(), password, role);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to add that person.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-md animate-fadeIn"
      role="dialog" aria-modal="true" aria-labelledby="add-org-admin-title" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422]"
        onClick={(event) => event.stopPropagation()}>
        <div className="h-1.5 bg-gradient-to-r from-[#4d999d] to-[#64a85a]" />
        <div ref={dialogRef} tabIndex={-1} className="p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 id="add-org-admin-title" className="font-heading text-lg font-bold text-[#212121] dark:text-white">
                Add someone to {tenantName}
              </h3>
              <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">They can sign in right away with the email and password below.</p>
            </div>
            <Button type="button" onClick={onClose} aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
              <JisIcon className="text-[19px]">close</JisIcon>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
            <div>
              <label htmlFor="org-admin-email" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Email address</label>
              <input id="org-admin-email" type="email" required autoFocus placeholder="Enter email" value={email}
                onChange={(event) => setEmail(event.target.value)} className="settings-input" />
            </div>
            <div>
              <label htmlFor="org-admin-name" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Full name</label>
              <input id="org-admin-name" required placeholder="Enter full name" value={fullName}
                onChange={(event) => setFullName(event.target.value)} className="settings-input" />
            </div>
            <div>
              <label htmlFor="org-admin-role" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Role</label>
              <SimpleSelect
                id="org-admin-role"
                value={role}
                onValueChange={(value) => setRole(value as 'TenantAdmin' | 'Staff')}
                options={[
                  { value: 'TenantAdmin', label: 'Academy Admin — full control' },
                  { value: 'Staff', label: 'Staff — day-to-day work' },
                ]}
              />
            </div>
            <div>
              <label htmlFor="org-admin-password" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Temporary password</label>
              <PasswordInput id="org-admin-password" required minLength={8} placeholder="At least 8 characters" value={password}
                onChange={(event) => setPassword(event.target.value)} className="settings-input" />
            </div>

            {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button type="button" onClick={onClose} disabled={busy}
                className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] dark:text-[#cbd5e1] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">
                Cancel
              </Button>
              <Button type="submit" disabled={busy}
                className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
                <JisIcon className="text-[17px]">{busy ? 'progress_activity' : 'person_add'}</JisIcon>
                {busy ? 'Adding…' : 'Add to academy'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
