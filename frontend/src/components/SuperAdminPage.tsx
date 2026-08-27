import { Button } from './ui/button';
import { JisIcon } from './JisIcon';
import { Spinner } from './ui/spinner';
import { DarkModeToggle } from './DarkModeToggle';
import { SuperAdminModule, SuperAdminNavigation } from './SuperAdminNavigation';
import { CreateAcademyModal } from './modals/CreateAcademyModal';
import { AcademyUsersModal } from './modals/AcademyUsersModal';
import { AddOrgAdminModal } from './modals/AddOrgAdminModal';
import { RenewSubscriptionModal } from './modals/RenewSubscriptionModal';
import { CreatePlanModal } from './modals/CreatePlanModal';
import React, { useEffect, useMemo, useState } from 'react';
import { ApiError, api, Plan, Session, Tenant, TenantUser } from '../api';

type TenantStatus = 'Active' | 'Trial' | 'Suspended';

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : 'Not assigned';

// Suspended beats everything (isActive gates login regardless of subscription); otherwise the
// subscription's own status (Trial vs Active/PastDue/etc, everything else grouped as "Active"
// for this coarse filter) decides.
const tenantStatus = (tenant: Tenant): TenantStatus =>
  !tenant.isActive ? 'Suspended' : tenant.subscription?.status === 'Trial' ? 'Trial' : 'Active';

export function SuperAdminPage({ session, onLogout, darkMode, onToggleDarkMode }: {
  session: Session; onLogout: () => void; darkMode: boolean; onToggleDarkMode: () => void;
}) {
  const [currentModule, setCurrentModule] = useState<SuperAdminModule>('overview');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isCreateAcademyOpen, setIsCreateAcademyOpen] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [renewingTenant, setRenewingTenant] = useState<Tenant | null>(null);
  const [managingUsersTenant, setManagingUsersTenant] = useState<Tenant | null>(null);
  const [addingUserTenant, setAddingUserTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<Record<string, TenantUser[]>>({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [togglingOtpId, setTogglingOtpId] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | TenantStatus>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load(showLoader = false) {
    if (showLoader) setLoading(true);
    try {
      const [planRows, tenantRows] = await Promise.all([
        api.plans(session.token), api.tenants(session.token)
      ]);
      setPlans(planRows);
      setTenants(tenantRows);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to load platform data.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => { void load(true); }, []);

  const filteredTenants = useMemo(() => tenants.filter((tenant) => {
    const matchesSearch = tenant.name.toLowerCase().includes(search.toLowerCase())
      || tenant.slug.toLowerCase().includes(search.toLowerCase())
      || (tenant.subscription?.planName || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || tenantStatus(tenant) === statusFilter;
    return matchesSearch && matchesStatus;
  }), [tenants, search, statusFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const pagedTenants = filteredTenants.slice((page - 1) * pageSize, page * pageSize);

  const activeCount = tenants.filter((tenant) => tenantStatus(tenant) === 'Active').length;
  const trialCount = tenants.filter((tenant) => tenantStatus(tenant) === 'Trial').length;
  const suspendedCount = tenants.filter((tenant) => tenantStatus(tenant) === 'Suspended').length;
  const totalStudents = tenants.reduce((sum, tenant) => sum + tenant.studentCount, 0);
  const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.userCount, 0);

  const clearMessages = () => { setError(''); setNotice(''); };

  const openAddAcademy = () => {
    setCurrentModule('academies');
    setIsCreateAcademyOpen(true);
  };

  async function createTenant(data: {
    name: string; slug: string; planId: string; subscriptionEndsAt: string;
    adminName: string; adminEmail: string; adminPassword: string;
  }) {
    clearMessages();
    setBusyId('new-tenant');
    try {
      await api.createTenant(session.token, data);
      setNotice('Academy and administrator account created successfully.');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function createPlan(data: { name: string; code: string; monthlyPrice: number; maxUsers: number; maxStudents: number }) {
    clearMessages();
    setBusyId('new-plan');
    try {
      await api.createPlan(session.token, data);
      setNotice('Subscription plan created successfully.');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function renewSubscription(planId: string, endsAt: string) {
    if (!renewingTenant) return;
    clearMessages();
    setBusyId('subscription-' + renewingTenant.id);
    try {
      await api.assignTenantPlan(session.token, renewingTenant.id, { planId, endsAt });
      setNotice('Subscription updated successfully.');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleTenant(tenant: Tenant) {
    clearMessages();
    setBusyId('status-' + tenant.id);
    try {
      await api.setTenantStatus(session.token, tenant.id, !tenant.isActive);
      setNotice(`Academy ${tenant.isActive ? 'suspended' : 'activated'} successfully.`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to update status.');
    } finally {
      setBusyId(null);
    }
  }

  async function openUsers(tenant: Tenant) {
    setManagingUsersTenant(tenant);
    setUsersLoading(true);
    clearMessages();
    try {
      const users = await api.tenantUsers(session.token, tenant.id);
      setTenantUsers((current) => ({ ...current, [tenant.id]: users }));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to load academy users.');
    } finally {
      setUsersLoading(false);
    }
  }

  async function createTenantUser(tenantId: string, fullName: string, email: string, password: string, role: 'TenantAdmin' | 'Staff') {
    clearMessages();
    setBusyId('user-' + tenantId);
    try {
      await api.createTenantUser(session.token, tenantId, { fullName, email, password, role });
      const users = await api.tenantUsers(session.token, tenantId);
      setTenantUsers((current) => ({ ...current, [tenantId]: users }));
      setNotice('Person added successfully.');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function updateTenantUser(tenantId: string, userId: string, fullName: string, email: string, newPassword?: string) {
    clearMessages();
    setSavingUserId(userId);
    try {
      const updated = await api.updateTenantUser(session.token, tenantId, userId, { fullName, email, newPassword });
      setTenantUsers((current) => ({
        ...current, [tenantId]: (current[tenantId] || []).map((user) => user.id === userId ? updated : user)
      }));
      setNotice('Person updated successfully.');
    } finally {
      setSavingUserId(null);
    }
  }

  async function toggleUserActive(tenantId: string, user: TenantUser) {
    clearMessages();
    setStatusChangingId(user.id);
    try {
      const updated = await api.setTenantUserActive(session.token, tenantId, user.id, !user.isActive);
      setTenantUsers((current) => ({
        ...current, [tenantId]: (current[tenantId] || []).map((row) => row.id === user.id ? updated : row)
      }));
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to update that person.');
    } finally {
      setStatusChangingId(null);
    }
  }

  async function toggleUserOtp(tenantId: string, userId: string, otpEnabled: boolean) {
    clearMessages();
    setTogglingOtpId(userId);
    try {
      const updated = await api.setTenantUserOtp(session.token, tenantId, userId, otpEnabled);
      setTenantUsers((current) => ({
        ...current,
        [tenantId]: (current[tenantId] || []).map((user) => user.id === userId ? updated : user)
      }));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to update that setting.');
    } finally {
      setTogglingOtpId(null);
    }
  }

  const initials = session.user.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2);

  return (
    <div className="app-shell min-h-screen bg-[#f4fbf7] text-[#212121] dark:bg-[#07111f] dark:text-[#e2e8f0] font-sans antialiased">
      <SuperAdminNavigation currentModule={currentModule} setCurrentModule={setCurrentModule}
        onOpenAddAcademy={openAddAcademy} />

      <main className="md:ml-[270px] min-h-screen px-3 sm:px-6 lg:px-8 py-3 sm:py-6 md:py-8 pb-24 md:pb-12">
        <div className="mx-auto w-full max-w-[1440px] space-y-5 sm:space-y-6">
          <header className="relative z-30 flex min-w-0 items-center justify-between gap-2.5 rounded-2xl border border-[#dbdbdb]/80 bg-white/80 px-3.5 py-2 sm:py-2.5 shadow-xs backdrop-blur-xl dark:border-[#243244] dark:bg-[#0b1422]/80 sm:px-4">
            <div className="min-w-0">
              <p className="truncate text-xs sm:text-sm font-bold text-[#212121] dark:text-white">{session.user.fullName}</p>
              <p className="truncate text-xs text-[#808080] dark:text-[#94a3b8]">{session.user.email}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] px-2.5 py-1.5">
                <div className="w-7 h-7 rounded-xl bg-[#e9f7ee] dark:bg-[#3fc073]/20 text-[#3fc073] font-bold text-xs flex items-center justify-center">{initials}</div>
                <span className="text-xs font-bold text-[#212121] dark:text-white pr-1">Super Admin</span>
              </div>
              <DarkModeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />
              <Button type="button" onClick={onLogout} aria-label="Sign out"
                className="min-h-9 sm:min-h-11 shrink-0 rounded-2xl border border-[#dbdbdb] px-2.5 sm:px-3.5 text-xs font-semibold bg-white text-[#212121] transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-[#243244] dark:bg-[#111c2b] dark:text-[#e2e8f0] dark:hover:bg-rose-950/40 flex items-center gap-1 active:scale-95">
                <span className="hidden sm:inline">Sign out</span>
                <JisIcon className="text-[17px] sm:hidden">logout</JisIcon>
              </Button>
            </div>
          </header>

          {(error || notice) && (
            <div role="alert" className={'rounded-2xl px-4 py-3.5 text-sm flex items-start gap-3 border shadow-sm ' +
              (error
                ? 'bg-rose-50 text-[#ef4444] border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300'
                : 'bg-emerald-50 text-[#22c55e] border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300')}>
              <JisIcon className="text-[20px]">{error ? 'error' : 'check_circle'}</JisIcon>
              <span className="flex-1 font-medium">{error || notice}</span>
              <Button type="button" onClick={clearMessages} aria-label="Dismiss notification" className="rounded-lg p-0.5 hover:bg-black/5 dark:hover:bg-white/10">
                <JisIcon className="text-[18px]">close</JisIcon>
              </Button>
            </div>
          )}

          {currentModule === 'overview' && (
            <OverviewModule tenants={tenants} plans={plans} activeCount={activeCount}
              totalUsers={totalUsers} totalStudents={totalStudents} onAddAcademy={openAddAcademy} />
          )}

          {currentModule === 'academies' && (
            <AcademiesModule
              tenants={tenants} pagedTenants={pagedTenants} filteredCount={filteredTenants.length}
              loading={loading} busyId={busyId} search={search} setSearch={setSearch}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              activeCount={activeCount} trialCount={trialCount} suspendedCount={suspendedCount}
              onOpenCreate={() => setIsCreateAcademyOpen(true)}
              onOpenSubscription={setRenewingTenant} onOpenUsers={openUsers}
              onOpenAddUser={setAddingUserTenant} toggleTenant={toggleTenant}
              page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalPages={totalPages}
            />
          )}

          {currentModule === 'plans' && (
            <PlansModule plans={plans} onOpenCreate={() => setIsCreatePlanOpen(true)} />
          )}
        </div>
      </main>

      <CreateAcademyModal isOpen={isCreateAcademyOpen} onClose={() => setIsCreateAcademyOpen(false)}
        plans={plans} onCreate={createTenant} />
      <CreatePlanModal isOpen={isCreatePlanOpen} onClose={() => setIsCreatePlanOpen(false)}
        busy={busyId === 'new-plan'} onCreate={createPlan} />
      <RenewSubscriptionModal isOpen={renewingTenant !== null} onClose={() => setRenewingTenant(null)}
        tenant={renewingTenant} plans={plans} busy={busyId === 'subscription-' + renewingTenant?.id}
        onRenew={renewSubscription} />
      {managingUsersTenant && (
        <AcademyUsersModal isOpen={managingUsersTenant !== null} onClose={() => setManagingUsersTenant(null)}
          tenant={managingUsersTenant} plan={plans.find((plan) => plan.id === managingUsersTenant.subscription?.planId)}
          users={tenantUsers[managingUsersTenant.id] || []} loading={usersLoading}
          onOpenAddUser={() => setAddingUserTenant(managingUsersTenant)}
          onOpenSetLimit={() => setRenewingTenant(managingUsersTenant)}
          onToggleOtp={(userId, enabled) => toggleUserOtp(managingUsersTenant.id, userId, enabled)}
          togglingOtpId={togglingOtpId}
          onUpdateUser={(userId, fullName, email, newPassword) =>
            updateTenantUser(managingUsersTenant.id, userId, fullName, email, newPassword)}
          savingUserId={savingUserId}
          onToggleActive={(user) => toggleUserActive(managingUsersTenant.id, user)}
          statusChangingId={statusChangingId} />
      )}
      {addingUserTenant && (
        <AddOrgAdminModal isOpen={addingUserTenant !== null} onClose={() => setAddingUserTenant(null)}
          tenantName={addingUserTenant.name} busy={busyId === 'user-' + addingUserTenant.id}
          onAdd={(fullName, email, password, role) => createTenantUser(addingUserTenant.id, fullName, email, password, role)} />
      )}
    </div>
  );
}

function OverviewModule({ tenants, plans, activeCount, totalUsers, totalStudents, onAddAcademy }: {
  tenants: Tenant[]; plans: Plan[]; activeCount: number; totalUsers: number; totalStudents: number;
  onAddAcademy: () => void;
}) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-[#212121] text-white p-6 sm:p-8 shadow-2xl border border-[#333333]">
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#3fc073]/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-semibold text-[#b3e6c7] mb-3">
              <span className="w-2 h-2 rounded-full bg-[#3fc073] animate-pulse" /> Platform overview
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold">Manage every academy in one place</h2>
            <p className="text-sm text-[#9e9e9e] mt-2 max-w-2xl">Create customer workspaces, control subscriptions, and monitor platform usage.</p>
          </div>
          <Button type="button" onClick={onAddAcademy}
            className="btn-brand rounded-2xl px-5 py-3 text-sm font-bold flex items-center justify-center gap-2 shrink-0">
            <JisIcon className="text-[20px]">add_business</JisIcon>
            Add academy
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon="apartment" label="Total academies" value={tenants.length} hint={activeCount + ' active'} color="blue" />
        <Stat icon="verified" label="Active tenants" value={activeCount} hint={(tenants.length - activeCount) + ' other'} color="emerald" />
        <Stat icon="groups" label="Platform users" value={totalUsers} hint={totalStudents + ' students'} color="indigo" />
        <Stat icon="workspace_premium" label="Plans available" value={plans.length} hint="Subscription catalogue" color="amber" />
      </section>
    </div>
  );
}

function AcademiesModule({ tenants, pagedTenants, filteredCount, loading, busyId, search, setSearch,
  statusFilter, setStatusFilter, activeCount, trialCount, suspendedCount, onOpenCreate, onOpenSubscription,
  onOpenUsers, onOpenAddUser, toggleTenant, page, setPage, pageSize, setPageSize, totalPages }: {
  tenants: Tenant[]; pagedTenants: Tenant[]; filteredCount: number; loading: boolean; busyId: string | null;
  search: string; setSearch: (value: string) => void;
  statusFilter: 'All' | TenantStatus; setStatusFilter: (value: 'All' | TenantStatus) => void;
  activeCount: number; trialCount: number; suspendedCount: number;
  onOpenCreate: () => void; onOpenSubscription: (tenant: Tenant) => void;
  onOpenUsers: (tenant: Tenant) => Promise<void>; onOpenAddUser: (tenant: Tenant) => void;
  toggleTenant: (tenant: Tenant) => Promise<void>;
  page: number; setPage: (page: number) => void; pageSize: number; setPageSize: (size: number) => void; totalPages: number;
}) {
  const FILTERS: { id: 'All' | TenantStatus; label: string; count: number; dot?: string }[] = [
    { id: 'All', label: 'All', count: tenants.length },
    { id: 'Active', label: 'Active', count: activeCount, dot: 'bg-[#22c55e]' },
    { id: 'Trial', label: 'Trial', count: trialCount, dot: 'bg-[#f59e0b]' },
    { id: 'Suspended', label: 'Suspended', count: suspendedCount, dot: 'bg-[#ef4444]' }
  ];
  const rangeStart = filteredCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(filteredCount, page * pageSize);

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <OrgStat icon="apartment" label="Total academies" value={tenants.length} color="blue" />
        <OrgStat icon="verified" label="Active" value={activeCount} color="emerald" />
        <OrgStat icon="schedule" label="Trial" value={trialCount} color="amber" />
        <OrgStat icon="pause_circle" label="Suspended" value={suspendedCount} color="rose" />
      </section>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter academies by status" className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => {
            const isActive = statusFilter === item.id;
            return (
              <button key={item.id} type="button" role="tab" aria-selected={isActive}
                onClick={() => setStatusFilter(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] text-[#212121] dark:text-white shadow-sm'
                    : 'text-[#808080] dark:text-[#94a3b8] hover:text-[#212121] dark:hover:text-white'
                }`}>
                {item.dot && <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />}
                {item.label} <span className={isActive ? 'text-[#3fc073]' : ''}>{item.count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <JisIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9e9e9e] text-[18px]">search</JisIcon>
            <input value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Search academies…" className="w-full sm:w-56 pl-10 pr-3 py-2.5 rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] text-xs text-[#212121] dark:text-white outline-none focus:border-[#3fc073] focus:ring-4 focus:ring-[#3fc073]/15" />
          </div>
          <Button type="button" onClick={onOpenCreate}
            className="btn-brand rounded-2xl px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shrink-0">
            <JisIcon className="text-[18px]">add</JisIcon>
            New academy
          </Button>
        </div>
      </div>

      <section className="premium-card rounded-3xl overflow-hidden">
        {loading ? <LoadingRows /> : pagedTenants.length === 0 ? (
          <EmptyState hasTenants={tenants.length > 0} onCreate={onOpenCreate} />
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wider text-[#808080] dark:text-[#94a3b8] bg-[#f0f0f0]/90 dark:bg-[#111c2b]/90 border-b border-[#dbdbdb]/60 dark:border-[#243244]">
                  <th className="px-6 py-3.5">Academy</th><th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Users</th><th className="px-5 py-3.5">Created</th>
                  <th className="px-5 py-3.5">Subscription</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-[#dbdbdb]/60 dark:divide-[#243244]">{pagedTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-[#f0f0f0]/60 dark:hover:bg-[#111c2b]/60 transition-colors">
                    <td className="px-6 py-4"><div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white font-bold flex items-center justify-center">{tenant.name.charAt(0).toUpperCase()}</div>
                      <div><div className="font-bold text-[#212121] dark:text-white">{tenant.name}</div>
                        <div className="text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">/{tenant.slug}</div></div></div></td>
                    <td className="px-5 py-4"><StatusBadge status={tenantStatus(tenant)} /></td>
                    <td className="px-5 py-4"><UsageCell tenant={tenant} /></td>
                    <td className="px-5 py-4"><span className="text-xs text-[#575757] dark:text-[#cbd5e1]">{formatDate(tenant.createdAt)}</span></td>
                    <td className="px-5 py-4"><div className="font-semibold text-[#212121] dark:text-white">{tenant.subscription?.planName || 'No active plan'}</div>
                      <div className="text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">Ends {formatDate(tenant.subscription?.endsAt)}</div></td>
                    <td className="px-6 py-4"><TenantActions tenant={tenant} busyId={busyId}
                      onOpenSubscription={onOpenSubscription} onOpenUsers={onOpenUsers}
                      onOpenAddUser={onOpenAddUser} toggleTenant={toggleTenant} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            <div className="lg:hidden p-4 grid sm:grid-cols-2 gap-4">{pagedTenants.map((tenant) => (
              <article key={tenant.id} className="rounded-3xl border border-[#dbdbdb] dark:border-[#243244] p-4 bg-white dark:bg-[#0b1422] shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white font-bold flex items-center justify-center shrink-0">{tenant.name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0"><h3 className="font-bold truncate text-[#212121] dark:text-white">{tenant.name}</h3>
                      <p className="text-xs text-[#808080] dark:text-[#94a3b8] truncate">/{tenant.slug}</p></div>
                  </div><StatusBadge status={tenantStatus(tenant)} />
                </div>
                <div className="grid grid-cols-2 gap-2 my-4">
                  <MiniInfo icon="workspace_premium" label="Plan" value={tenant.subscription?.planName || 'None'} />
                  <MiniInfo icon="event" label="Ends" value={formatDate(tenant.subscription?.endsAt)} />
                  <MiniInfo icon="calendar_today" label="Created" value={formatDate(tenant.createdAt)} />
                  <MiniInfo icon="group" label="Users" value={`${tenant.userCount}`} />
                </div>
                <TenantActions tenant={tenant} busyId={busyId}
                  onOpenSubscription={onOpenSubscription} onOpenUsers={onOpenUsers}
                  onOpenAddUser={onOpenAddUser} toggleTenant={toggleTenant} mobile />
              </article>
            ))}</div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-[#dbdbdb]/60 dark:border-[#243244]">
              <div className="flex items-center gap-2 text-xs text-[#808080] dark:text-[#94a3b8]">
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] text-[#212121] dark:text-white px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-[#3fc073]">
                  <option value={10}>10 per page</option><option value={25}>25 per page</option><option value={50}>50 per page</option>
                </select>
                <span>Showing {rangeStart} to {rangeEnd} of {filteredCount} academies</span>
              </div>
              <div className="flex items-center gap-1.5">
                <PageButton icon="first_page" label="First page" disabled={page === 1} onClick={() => setPage(1)} />
                <PageButton icon="chevron_left" label="Previous page" disabled={page === 1} onClick={() => setPage(page - 1)} />
                <span className="text-xs font-bold text-[#575757] dark:text-[#cbd5e1] px-2">Page {page} of {totalPages}</span>
                <PageButton icon="chevron_right" label="Next page" disabled={page === totalPages} onClick={() => setPage(page + 1)} />
                <PageButton icon="last_page" label="Last page" disabled={page === totalPages} onClick={() => setPage(totalPages)} />
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function PlansModule({ plans, onOpenCreate }: { plans: Plan[]; onOpenCreate: () => void }) {
  return (
    <section className="premium-card rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div><h2 className="font-heading font-bold text-xl text-[#212121] dark:text-white">Subscription plans</h2>
          <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-1">Limits are enforced automatically by the API.</p></div>
        <Button type="button" onClick={onOpenCreate}
          className="rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0] dark:bg-[#111c2b] text-[#212121] dark:text-white hover:bg-[#e5e5e5] dark:hover:bg-[#172435] px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-colors">
          <JisIcon className="text-[18px]">add_card</JisIcon>
          New plan
        </Button>
      </div>

      {plans.length === 0 ? <div className="rounded-3xl border border-dashed border-[#dbdbdb] dark:border-[#243244] p-8 text-center text-sm text-[#808080] dark:text-[#94a3b8]">No plans created yet.</div> :
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{plans.map((plan) =>
          <div key={plan.id} className="rounded-3xl border border-[#dbdbdb] dark:border-[#243244] p-5 hover:border-[#3fc073]/50 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between gap-3"><div><div className="font-bold text-lg text-[#212121] dark:text-white">{plan.name}</div>
              <div className="text-xs text-[#808080] dark:text-[#94a3b8] uppercase tracking-wider mt-0.5">{plan.code}</div></div>
              <span className={'rounded-full px-2.5 py-1 text-xs font-bold ' + (plan.isActive ? 'bg-emerald-50 text-[#22c55e] dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-[#f0f0f0] text-[#808080] dark:bg-[#172435] dark:text-[#94a3b8]')}>
                {plan.isActive ? 'Available' : 'Inactive'}</span></div>
            <div className="mt-5 flex items-end gap-1"><span className="text-3xl font-bold text-[#212121] dark:text-white">₹{plan.monthlyPrice}</span><span className="text-xs text-[#808080] dark:text-[#94a3b8] mb-1">/ month</span></div>
            <div className="mt-4 pt-4 border-t border-[#dbdbdb]/60 dark:border-[#243244] grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#575757] dark:text-[#cbd5e1]"><JisIcon className="text-[18px] text-[#3fc073]">school</JisIcon><span><b>{plan.maxStudents}</b><br />students</span></div>
              <div className="flex items-center gap-2 text-[#575757] dark:text-[#cbd5e1]"><JisIcon className="text-[18px] text-indigo-500">group</JisIcon><span><b>{plan.maxUsers}</b><br />users</span></div>
            </div>
          </div>)}</div>}
    </section>
  );
}

function Stat({ icon, label, value, hint, color }: {
  icon: string; label: string; value: number; hint: string; color: 'blue' | 'emerald' | 'indigo' | 'amber'
}) {
  const colors = {
    blue: 'bg-[#e9f7ee] dark:bg-[#3fc073]/20 text-[#3fc073]',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-[#22c55e] dark:text-emerald-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300',
    amber: 'bg-amber-50 dark:bg-amber-950/60 text-[#f59e0b] dark:text-amber-300'
  };
  return <div className="premium-card rounded-3xl p-4 sm:p-5">
    <div className={'w-10 h-10 rounded-2xl flex items-center justify-center ' + colors[color]}>
      <JisIcon className="text-[21px]">{icon}</JisIcon></div>
    <div className="text-2xl sm:text-3xl font-bold mt-3 text-[#212121] dark:text-white">{value}</div>
    <div className="text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mt-0.5">{label}</div>
    <div className="text-xs text-[#9e9e9e] dark:text-[#94a3b8] mt-1">{hint}</div>
  </div>;
}

function OrgStat({ icon, label, value, color }: {
  icon: string; label: string; value: number; color: 'blue' | 'emerald' | 'amber' | 'rose';
}) {
  const colors = {
    blue: 'bg-[#e9f7ee] dark:bg-[#3fc073]/20 text-[#3fc073]',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/60 text-[#22c55e] dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-950/60 text-[#f59e0b] dark:text-amber-300',
    rose: 'bg-rose-50 dark:bg-rose-950/60 text-[#ef4444] dark:text-rose-300'
  };
  return <div className="premium-card rounded-2xl p-4 flex items-center gap-3">
    <div className={'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ' + colors[color]}>
      <JisIcon className="text-[20px]">{icon}</JisIcon>
    </div>
    <div className="min-w-0">
      <div className="text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8] truncate">{label}</div>
      <div className="text-2xl font-bold text-[#212121] dark:text-white">{value}</div>
    </div>
  </div>;
}

function UsageCell({ tenant }: { tenant: Tenant }) {
  // No plan resolved yet (rare — e.g. between subscription changes) just shows the raw count.
  const ratio = tenant.userCount > 0 ? Math.min(100, tenant.userCount) : 0;
  return <div className="min-w-[90px]">
    <div className="text-xs font-bold text-[#212121] dark:text-white">{tenant.userCount}</div>
    <div className="h-1.5 w-20 rounded-full bg-[#f0f0f0] dark:bg-[#172435] overflow-hidden mt-1">
      <div className="h-full rounded-full bg-[#3fc073]" style={{ width: ratio + '%' }} />
    </div>
  </div>;
}

function StatusBadge({ status }: { status: TenantStatus }) {
  const styles: Record<TenantStatus, string> = {
    Active: 'bg-emerald-50 text-[#22c55e] dark:bg-emerald-950/40 dark:text-emerald-300',
    Trial: 'bg-amber-50 text-[#f59e0b] dark:bg-amber-950/40 dark:text-amber-300',
    Suspended: 'bg-rose-50 text-[#ef4444] dark:bg-rose-950/40 dark:text-rose-300'
  };
  const dots: Record<TenantStatus, string> = { Active: 'bg-[#22c55e]', Trial: 'bg-[#f59e0b]', Suspended: 'bg-[#ef4444]' };
  return <span className={'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold shrink-0 ' + styles[status]}>
    <span className={'w-1.5 h-1.5 rounded-full ' + dots[status]} />
    {status}
  </span>;
}

function PageButton({ icon, label, disabled, onClick }: { icon: string; label: string; disabled: boolean; onClick: () => void }) {
  return <Button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] text-[#575757] dark:text-[#cbd5e1] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] disabled:opacity-40 transition-colors">
    <JisIcon className="text-[16px]">{icon}</JisIcon>
  </Button>;
}

function TenantActions({ tenant, busyId, onOpenSubscription, onOpenUsers, onOpenAddUser, toggleTenant, mobile = false }: {
  tenant: Tenant; busyId: string | null;
  onOpenSubscription: (tenant: Tenant) => void;
  onOpenUsers: (tenant: Tenant) => Promise<void>;
  onOpenAddUser: (tenant: Tenant) => void;
  toggleTenant: (tenant: Tenant) => Promise<void>; mobile?: boolean;
}) {
  const changingStatus = busyId === 'status-' + tenant.id;
  return <div className={'flex items-center gap-1.5 ' + (mobile ? 'grid grid-cols-4' : 'justify-end')}>
    <IconAction icon="visibility" label={`View ${tenant.name}`} onClick={() => void onOpenUsers(tenant)}
      className="text-[#575757] dark:text-[#cbd5e1] border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0] dark:bg-[#111c2b] hover:bg-[#e5e5e5] dark:hover:bg-[#172435]" />
    <IconAction icon="person_add" label={`Add user to ${tenant.name}`} onClick={() => onOpenAddUser(tenant)}
      className="text-[#3fc073] dark:text-[#b3e6c7] border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0] dark:bg-[#111c2b] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20" />
    <IconAction icon="tune" label={`Subscription for ${tenant.name}`} onClick={() => onOpenSubscription(tenant)}
      className="text-[#575757] dark:text-[#cbd5e1] border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0] dark:bg-[#111c2b] hover:bg-[#e5e5e5] dark:hover:bg-[#172435]" />
    <IconAction icon={changingStatus ? 'progress_activity' : tenant.isActive ? 'pause_circle' : 'play_circle'}
      label={tenant.isActive ? `Suspend ${tenant.name}` : `Activate ${tenant.name}`}
      disabled={changingStatus} onClick={() => void toggleTenant(tenant)}
      className={tenant.isActive
        ? 'text-[#ef4444] border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:hover:bg-rose-950/70'
        : 'text-[#22c55e] border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70'} />
  </div>;
}

function IconAction({ icon, label, onClick, disabled = false, className }: {
  icon: string; label: string; onClick: () => void; disabled?: boolean; className: string;
}) {
  return <Button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95 disabled:opacity-50 ${className}`}>
    <JisIcon className="text-[17px]">{icon}</JisIcon>
  </Button>;
}

function MiniInfo({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] p-2.5 min-w-0">
    <div className="flex items-center gap-1 text-xs text-[#808080] dark:text-[#94a3b8]"><JisIcon className="text-[14px]">{icon}</JisIcon>{label}</div>
    <div className="text-xs font-bold text-[#212121] dark:text-white mt-1 truncate">{value}</div>
  </div>;
}

function LoadingRows() {
  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center gap-2 py-1 text-xs text-[#808080] dark:text-[#94a3b8]">
        <Spinner size="xs" inline text="Loading academies…" />
      </div>
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-16 rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ hasTenants, onCreate }: { hasTenants: boolean; onCreate: () => void }) {
  return <div className="px-5 py-14 text-center">
    <div className="w-14 h-14 rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] text-[#808080] dark:text-[#94a3b8] mx-auto flex items-center justify-center">
      <JisIcon className="text-[28px]">{hasTenants ? 'search_off' : 'domain_add'}</JisIcon></div>
    <h3 className="font-bold mt-4 text-[#212121] dark:text-white">{hasTenants ? 'No academies match your filters' : 'No academies yet'}</h3>
    <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-1">{hasTenants ? 'Try another search or status.' : 'Create your first customer workspace to get started.'}</p>
    {!hasTenants && <Button type="button" onClick={onCreate} className="btn-brand rounded-2xl px-4 py-2.5 text-xs font-bold mt-4">Create academy</Button>}
  </div>;
}
