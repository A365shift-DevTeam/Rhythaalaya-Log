import React, { useEffect, useMemo, useState } from 'react';
import { ApiError, api, Plan, Session, Tenant, TenantUser } from '../api';

const oneYearFromNow = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : 'Not assigned';

export function SuperAdminPage({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [showTenant, setShowTenant] = useState(false);
  const [renewing, setRenewing] = useState<string | null>(null);
  const [managingUsers, setManagingUsers] = useState<string | null>(null);
  const [tenantUsers, setTenantUsers] = useState<Record<string, TenantUser[]>>({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');

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
    const matchesStatus = statusFilter === 'All'
      || (statusFilter === 'Active' && tenant.isActive)
      || (statusFilter === 'Suspended' && !tenant.isActive);
    return matchesSearch && matchesStatus;
  }), [tenants, search, statusFilter]);

  const activeTenants = tenants.filter((tenant) => tenant.isActive).length;
  const totalStudents = tenants.reduce((sum, tenant) => sum + tenant.studentCount, 0);
  const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.userCount, 0);

  const clearMessages = () => { setError(''); setNotice(''); };

  async function createPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setBusyId('new-plan');
    const data = new FormData(event.currentTarget);
    try {
      await api.createPlan(session.token, {
        name: String(data.get('name')), code: String(data.get('code')),
        monthlyPrice: Number(data.get('monthlyPrice')), maxUsers: Number(data.get('maxUsers')),
        maxStudents: Number(data.get('maxStudents'))
      });
      setShowPlan(false);
      setNotice('Subscription plan created successfully.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to create plan.');
    } finally {
      setBusyId(null);
    }
  }

  async function createTenant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setBusyId('new-tenant');
    const data = new FormData(event.currentTarget);
    try {
      await api.createTenant(session.token, {
        name: String(data.get('name')), slug: String(data.get('slug')),
        planId: String(data.get('planId')),
        subscriptionEndsAt: new Date(String(data.get('endsAt')) + 'T23:59:59Z').toISOString(),
        adminName: String(data.get('adminName')), adminEmail: String(data.get('adminEmail')),
        adminPassword: String(data.get('adminPassword'))
      });
      setShowTenant(false);
      setNotice('Academy and tenant administrator created successfully.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to create academy.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleTenant(tenant: Tenant) {
    if (tenant.isActive && !window.confirm(
      'Suspend ' + tenant.name + '? Its users will immediately lose access.'
    )) return;
    clearMessages();
    setBusyId('status-' + tenant.id);
    try {
      await api.setTenantStatus(session.token, tenant.id, !tenant.isActive);
      setNotice(tenant.isActive ? 'Academy suspended.' : 'Academy activated.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to update academy.');
    } finally {
      setBusyId(null);
    }
  }

  async function renew(event: React.FormEvent<HTMLFormElement>, tenantId: string) {
    event.preventDefault();
    clearMessages();
    setBusyId('subscription-' + tenantId);
    const data = new FormData(event.currentTarget);
    try {
      await api.assignSubscription(session.token, tenantId, String(data.get('planId')),
        new Date(String(data.get('endsAt')) + 'T23:59:59Z').toISOString());
      setRenewing(null);
      setNotice('Subscription updated successfully.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to update subscription.');
    } finally {
      setBusyId(null);
    }
  }

  async function openUsers(tenantId: string) {
    if (managingUsers === tenantId) {
      setManagingUsers(null);
      return;
    }
    setRenewing(null);
    setManagingUsers(tenantId);
    setUsersLoading(true);
    clearMessages();
    try {
      const users = await api.tenantUsers(session.token, tenantId);
      setTenantUsers((current) => ({ ...current, [tenantId]: users }));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to load tenant users.');
    } finally {
      setUsersLoading(false);
    }
  }

  async function createTenantUser(event: React.FormEvent<HTMLFormElement>, tenantId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    clearMessages();
    setBusyId('user-' + tenantId);
    const data = new FormData(event.currentTarget);
    try {
      await api.createTenantUser(session.token, tenantId, {
        fullName: String(data.get('fullName')),
        email: String(data.get('email')),
        password: String(data.get('password')),
        role: String(data.get('role')) as 'TenantAdmin' | 'Staff'
      });
      form.reset();
      const users = await api.tenantUsers(session.token, tenantId);
      setTenantUsers((current) => ({ ...current, [tenantId]: users }));
      setNotice('Tenant user created successfully.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to create tenant user.');
    } finally {
      setBusyId(null);
    }
  }

  const initials = session.user.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2);

  return (
    <main className="min-h-screen bg-[#f4f8f6] text-slate-900">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-brand-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-heading font-extrabold text-lg sm:text-xl truncate">Rhythaalaya Platform</h1>
              <p className="text-[11px] sm:text-xs text-slate-500">Super Admin Console</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">{initials}</div>
              <div className="leading-tight"><div className="text-xs font-bold">{session.user.fullName}</div>
                <div className="text-[10px] text-slate-500">{session.user.email}</div></div>
            </div>
            <button type="button" onClick={onLogout} title="Sign out"
              className="h-10 px-3 sm:px-4 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 font-bold text-xs flex items-center gap-2 transition-all">
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#102a22] via-brand-900 to-brand-700 text-white p-6 sm:p-8 shadow-xl shadow-brand-900/10">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-brand-300/15 blur-2xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[11px] font-semibold text-brand-100 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Platform overview
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-extrabold">Manage every academy in one place</h2>
              <p className="text-sm text-brand-100/80 mt-2 max-w-2xl">Create customer workspaces, control subscriptions, and monitor platform usage.</p>
            </div>
            <button type="button" onClick={() => { setShowTenant(true); setShowPlan(false); }}
              className="btn-brand rounded-xl px-5 py-3 text-sm font-bold flex items-center justify-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-[20px]">add_business</span>
              Add academy
            </button>
          </div>
        </section>

        {(error || notice) && (
          <div role="alert" className={'rounded-2xl px-4 py-3.5 text-sm flex items-start gap-3 border shadow-sm ' +
            (error ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>
            <span className="material-symbols-outlined text-[20px]">{error ? 'error' : 'check_circle'}</span>
            <span className="flex-1 font-medium">{error || notice}</span>
            <button type="button" onClick={clearMessages} aria-label="Dismiss notification" className="rounded-lg p-0.5 hover:bg-black/5">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Stat icon="apartment" label="Total academies" value={tenants.length} hint={activeTenants + ' active'} color="brand" />
          <Stat icon="verified" label="Active tenants" value={activeTenants} hint={(tenants.length - activeTenants) + ' suspended'} color="emerald" />
          <Stat icon="groups" label="Platform users" value={totalUsers} hint={totalStudents + ' students'} color="blue" />
          <Stat icon="workspace_premium" label="Plans available" value={plans.length} hint="Subscription catalogue" color="amber" />
        </section>

        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div><h2 className="font-heading font-extrabold text-xl">Academies</h2>
                <p className="text-xs text-slate-500 mt-1">Manage tenant access, usage and subscription dates.</p></div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                  <input value={search} onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search academies…" className="w-full sm:w-60 pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10" />
                </div>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-brand-400">
                  <option>All</option><option>Active</option><option>Suspended</option>
                </select>
                <button type="button" onClick={() => setShowTenant(!showTenant)}
                  className="btn-brand rounded-xl px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">{showTenant ? 'close' : 'add'}</span>
                  {showTenant ? 'Close form' : 'New academy'}
                </button>
              </div>
            </div>
          </div>

          {showTenant && (
            <form onSubmit={createTenant} className="p-5 sm:p-6 bg-brand-50/60 border-b border-brand-100">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">add_business</span>
                </div>
                <div><h3 className="font-bold text-sm">Create customer academy</h3>
                  <p className="text-xs text-slate-500 mt-0.5">This also creates the first Tenant Admin account and subscription.</p></div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input name="name" label="Academy name" placeholder="Rhythaalaya Chennai" required />
                <Input name="slug" label="Workspace slug" placeholder="rhythaalaya-chennai" required />
                <SelectPlan plans={plans} />
                <Input name="endsAt" label="Subscription ends" type="date" defaultValue={oneYearFromNow()} required />
                <Input name="adminName" label="Administrator name" placeholder="Full name" required />
                <Input name="adminEmail" label="Administrator email" type="email" placeholder="admin@academy.com" required />
                <Input name="adminPassword" label="Temporary password" type="password" placeholder="Minimum 8 characters" minLength={8} required />
                <div className="flex items-end">
                  <button disabled={busyId === 'new-tenant' || plans.length === 0}
                    className="btn-brand w-full rounded-xl py-2.5 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">{busyId === 'new-tenant' ? 'progress_activity' : 'check'}</span>
                    {busyId === 'new-tenant' ? 'Creating…' : 'Create academy'}
                  </button>
                </div>
              </div>
              {plans.length === 0 && <p className="text-xs text-amber-700 mt-3">Create at least one subscription plan before adding an academy.</p>}
            </form>
          )}

          {loading ? <LoadingRows /> : filteredTenants.length === 0 ? (
            <EmptyState hasTenants={tenants.length > 0} onCreate={() => setShowTenant(true)} />
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50/70 border-b border-slate-100">
                    <th className="px-6 py-3.5">Academy</th><th className="px-5 py-3.5">Subscription</th>
                    <th className="px-5 py-3.5">Usage</th><th className="px-5 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">{filteredTenants.map((tenant) => (
                    <React.Fragment key={tenant.id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4"><div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 font-extrabold flex items-center justify-center">{tenant.name.charAt(0).toUpperCase()}</div>
                          <div><div className="font-bold text-slate-900">{tenant.name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{tenant.slug}</div></div></div></td>
                        <td className="px-5 py-4"><div className="font-semibold text-slate-700">{tenant.subscription?.planName || 'No active plan'}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">Ends {formatDate(tenant.subscription?.endsAt)}</div></td>
                        <td className="px-5 py-4"><div className="flex gap-4 text-xs">
                          <span className="inline-flex items-center gap-1 text-slate-600"><span className="material-symbols-outlined text-[16px] text-brand-500">school</span>{tenant.studentCount}</span>
                          <span className="inline-flex items-center gap-1 text-slate-600"><span className="material-symbols-outlined text-[16px] text-blue-500">group</span>{tenant.userCount}</span>
                        </div></td>
                        <td className="px-5 py-4"><StatusBadge active={tenant.isActive} /></td>
                        <td className="px-6 py-4"><TenantActions tenant={tenant} renewing={renewing}
                          managingUsers={managingUsers} busyId={busyId}
                          setRenewing={setRenewing} openUsers={openUsers} toggleTenant={toggleTenant} /></td>
                      </tr>
                      {renewing === tenant.id && <tr><td colSpan={5} className="px-6 py-4 bg-slate-50">
                        <SubscriptionForm tenant={tenant} plans={plans} busy={busyId === 'subscription-' + tenant.id}
                          onSubmit={(event) => renew(event, tenant.id)} onCancel={() => setRenewing(null)} />
                      </td></tr>}
                      {managingUsers === tenant.id && <tr><td colSpan={5} className="px-6 py-5 bg-slate-50">
                        <TenantUsersPanel tenant={tenant}
                          plan={plans.find((plan) => plan.id === tenant.subscription?.planId)}
                          users={tenantUsers[tenant.id] || []}
                          loading={usersLoading} busy={busyId === 'user-' + tenant.id}
                          onSubmit={(event) => createTenantUser(event, tenant.id)}
                          onClose={() => setManagingUsers(null)} />
                      </td></tr>}
                    </React.Fragment>
                  ))}</tbody>
                </table>
              </div>

              <div className="lg:hidden p-4 grid sm:grid-cols-2 gap-4">{filteredTenants.map((tenant) => (
                <article key={tenant.id} className="rounded-2xl border border-slate-200 p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-brand-100 text-brand-700 font-extrabold flex items-center justify-center shrink-0">{tenant.name.charAt(0).toUpperCase()}</div>
                      <div className="min-w-0"><h3 className="font-bold truncate">{tenant.name}</h3>
                        <p className="text-[11px] text-slate-400 truncate">{tenant.slug}</p></div>
                    </div><StatusBadge active={tenant.isActive} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 my-4">
                    <MiniInfo icon="workspace_premium" label="Plan" value={tenant.subscription?.planName || 'None'} />
                    <MiniInfo icon="event" label="Ends" value={formatDate(tenant.subscription?.endsAt)} />
                    <MiniInfo icon="school" label="Students" value={String(tenant.studentCount)} />
                    <MiniInfo icon="group" label="Users" value={String(tenant.userCount)} />
                  </div>
                  <TenantActions tenant={tenant} renewing={renewing} managingUsers={managingUsers}
                    busyId={busyId} setRenewing={setRenewing} openUsers={openUsers}
                    toggleTenant={toggleTenant} mobile />
                  {renewing === tenant.id && <div className="mt-4 pt-4 border-t border-slate-100">
                    <SubscriptionForm tenant={tenant} plans={plans} busy={busyId === 'subscription-' + tenant.id}
                      onSubmit={(event) => renew(event, tenant.id)} onCancel={() => setRenewing(null)} compact />
                  </div>}
                  {managingUsers === tenant.id && <div className="mt-4 pt-4 border-t border-slate-100">
                    <TenantUsersPanel tenant={tenant}
                      plan={plans.find((plan) => plan.id === tenant.subscription?.planId)}
                      users={tenantUsers[tenant.id] || []}
                      loading={usersLoading} busy={busyId === 'user-' + tenant.id}
                      onSubmit={(event) => createTenantUser(event, tenant.id)}
                      onClose={() => setManagingUsers(null)} compact />
                  </div>}
                </article>
              ))}</div>
            </>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div><h2 className="font-heading font-extrabold text-xl">Subscription plans</h2>
              <p className="text-xs text-slate-500 mt-1">Limits are enforced automatically by the API.</p></div>
            <button type="button" onClick={() => setShowPlan(!showPlan)}
              className="rounded-xl border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-[18px]">{showPlan ? 'close' : 'add_card'}</span>
              {showPlan ? 'Close form' : 'New plan'}
            </button>
          </div>

          {showPlan && <form onSubmit={createPlan} className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <Input name="name" label="Plan name" placeholder="Professional" required />
              <Input name="code" label="Plan code" placeholder="PRO" required />
              <Input name="monthlyPrice" label="Monthly price (₹)" type="number" min={0} placeholder="1999" required />
              <Input name="maxUsers" label="Maximum users" type="number" min={1} placeholder="10" required />
              <Input name="maxStudents" label="Maximum students" type="number" min={1} placeholder="250" required />
              <div className="flex items-end"><button disabled={busyId === 'new-plan'}
                className="btn-brand w-full rounded-xl py-2.5 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">{busyId === 'new-plan' ? 'progress_activity' : 'check'}</span>
                {busyId === 'new-plan' ? 'Creating…' : 'Create plan'}
              </button></div>
            </div>
          </form>}

          {plans.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No plans created yet.</div> :
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{plans.map((plan) =>
              <div key={plan.id} className="rounded-2xl border border-slate-200 p-5 hover:border-brand-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3"><div><div className="font-extrabold text-lg">{plan.name}</div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">{plan.code}</div></div>
                  <span className={'rounded-full px-2.5 py-1 text-[10px] font-bold ' + (plan.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                    {plan.isActive ? 'Available' : 'Inactive'}</span></div>
                <div className="mt-5 flex items-end gap-1"><span className="text-3xl font-black">₹{plan.monthlyPrice}</span><span className="text-xs text-slate-400 mb-1">/ month</span></div>
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600"><span className="material-symbols-outlined text-[18px] text-brand-500">school</span><span><b>{plan.maxStudents}</b><br />students</span></div>
                  <div className="flex items-center gap-2 text-slate-600"><span className="material-symbols-outlined text-[18px] text-blue-500">group</span><span><b>{plan.maxUsers}</b><br />users</span></div>
                </div>
              </div>)}</div>}
        </section>
      </div>
    </main>
  );
}

function Stat({ icon, label, value, hint, color }: {
  icon: string; label: string; value: number; hint: string; color: 'brand' | 'emerald' | 'blue' | 'amber'
}) {
  const colors = {
    brand: 'bg-brand-100 text-brand-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700'
  };
  return <div className="rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-sm">
    <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + colors[color]}>
      <span className="material-symbols-outlined text-[21px]">{icon}</span></div>
    <div className="text-2xl sm:text-3xl font-black mt-3">{value}</div>
    <div className="text-xs font-bold text-slate-700 mt-0.5">{label}</div>
    <div className="text-[10px] text-slate-400 mt-1">{hint}</div>
  </div>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...input } = props;
  return <label className="block"><span className="block text-[11px] font-bold text-slate-600 mb-1.5">{label}</span>
    <input {...input} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 placeholder:text-slate-300" /></label>;
}

function SelectPlan({ plans, defaultValue }: { plans: Plan[]; defaultValue?: string }) {
  return <label className="block"><span className="block text-[11px] font-bold text-slate-600 mb-1.5">Subscription plan</span>
    <select name="planId" required defaultValue={defaultValue || ''} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-brand-400">
      <option value="" disabled>Select a plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} — ₹{plan.monthlyPrice}</option>)}
    </select></label>;
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold shrink-0 ' +
    (active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
    <span className={'w-1.5 h-1.5 rounded-full ' + (active ? 'bg-emerald-500' : 'bg-rose-500')} />
    {active ? 'Active' : 'Suspended'}
  </span>;
}

function TenantActions({ tenant, renewing, managingUsers, busyId, setRenewing, openUsers,
  toggleTenant, mobile = false }: {
  tenant: Tenant; renewing: string | null; managingUsers: string | null; busyId: string | null;
  setRenewing: React.Dispatch<React.SetStateAction<string | null>>;
  openUsers: (tenantId: string) => Promise<void>;
  toggleTenant: (tenant: Tenant) => Promise<void>; mobile?: boolean;
}) {
  const changingStatus = busyId === 'status-' + tenant.id;
  return <div className={'flex items-center gap-2 ' + (mobile ? 'grid grid-cols-3' : 'justify-end')}>
    <button type="button" onClick={() => {
      if (managingUsers) void openUsers(managingUsers);
      setRenewing(renewing === tenant.id ? null : tenant.id);
    }}
      className="h-9 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 px-3 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors">
      <span className="material-symbols-outlined text-[17px]">event_repeat</span>
      <span className={mobile ? 'hidden sm:inline' : ''}>Subscription</span>
    </button>
    <button type="button" onClick={() => {
      setRenewing(null);
      void openUsers(tenant.id);
    }}
      className="h-9 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors">
      <span className="material-symbols-outlined text-[17px]">manage_accounts</span>
      <span className={mobile ? 'hidden sm:inline' : ''}>Users</span>
    </button>
    <button type="button" disabled={changingStatus} onClick={() => void toggleTenant(tenant)}
      className={'h-9 rounded-xl border px-3 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 ' +
        (tenant.isActive ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100')}>
      <span className="material-symbols-outlined text-[17px]">{changingStatus ? 'progress_activity' : tenant.isActive ? 'pause_circle' : 'play_circle'}</span>
      <span className={mobile ? 'hidden sm:inline' : ''}>
        {changingStatus ? 'Updating…' : tenant.isActive ? 'Suspend' : 'Activate'}
      </span>
    </button>
  </div>;
}

function TenantUsersPanel({ tenant, plan, users, loading, busy, onSubmit, onClose, compact = false }: {
  tenant: Tenant; plan?: Plan; users: TenantUser[]; loading: boolean; busy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void; compact?: boolean;
}) {
  const atLimit = plan ? tenant.userCount >= plan.maxUsers : false;
  return <div className="space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 text-[21px]">manage_accounts</span>
          <h3 className="font-extrabold text-sm">Users for {tenant.name}</h3>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          {tenant.userCount} active user{tenant.userCount === 1 ? '' : 's'}
          {plan ? ' of ' + plan.maxUsers + ' allowed by ' + plan.name : ''}
        </p>
      </div>
      <button type="button" onClick={onClose}
        className="self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[16px]">close</span>Close
      </button>
    </div>

    {plan && <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-semibold text-slate-500">
        <span>Plan user usage</span><span>{tenant.userCount} / {plan.maxUsers}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div className={'h-full rounded-full transition-all ' + (atLimit ? 'bg-rose-500' : 'bg-blue-500')}
          style={{ width: Math.min(100, tenant.userCount / plan.maxUsers * 100) + '%' }} />
      </div>
    </div>}

    <div className={compact ? 'space-y-2' : 'grid sm:grid-cols-2 lg:grid-cols-3 gap-2'}>
      {loading ? <div className="text-xs text-slate-500 py-4">Loading tenant users…</div> :
        users.map((user) => <div key={user.id}
          className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
            {user.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 truncate">{user.fullName}</div>
            <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
          </div>
          <span className={'rounded-full px-2 py-1 text-[9px] font-bold shrink-0 ' +
            (user.role === 'TenantAdmin' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600')}>
            {user.role === 'TenantAdmin' ? 'Admin' : 'Staff'}
          </span>
        </div>)}
    </div>

    {atLimit ? <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-xs flex items-start gap-2">
      <span className="material-symbols-outlined text-[18px]">warning</span>
      <span>This tenant has reached the <b>{plan?.maxUsers}-user</b> limit. Assign a larger subscription plan before adding another user.</span>
    </div> :
      <form onSubmit={onSubmit} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-blue-600 text-[18px]">person_add</span>
          <h4 className="text-xs font-extrabold">Add tenant user</h4>
        </div>
        <div className={compact ? 'space-y-3' : 'grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end'}>
          <Input name="fullName" label="Full name" placeholder="User's full name" required />
          <Input name="email" label="Email address" type="email" placeholder="user@academy.com" required />
          <Input name="password" label="Temporary password" type="password" placeholder="Minimum 8 characters" minLength={8} required />
          <label className="block"><span className="block text-[11px] font-bold text-slate-600 mb-1.5">Role</span>
            <select name="role" defaultValue="Staff" required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-blue-400">
              <option value="Staff">Staff</option>
              <option value="TenantAdmin">Tenant Admin</option>
            </select>
          </label>
          <button disabled={busy}
            className="btn-brand w-full rounded-xl py-2.5 px-4 text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
            <span className="material-symbols-outlined text-[17px]">{busy ? 'progress_activity' : 'person_add'}</span>
            {busy ? 'Creating…' : 'Add user'}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-3">The user can sign in immediately with this email and temporary password.</p>
      </form>}
  </div>;
}

function SubscriptionForm({ tenant, plans, busy, onSubmit, onCancel, compact = false }: {
  tenant: Tenant; plans: Plan[]; busy: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void; compact?: boolean;
}) {
  return <form onSubmit={onSubmit} className={compact ? 'space-y-3' : 'flex flex-wrap items-end gap-3'}>
    <div className={compact ? '' : 'min-w-52'}><SelectPlan plans={plans} defaultValue={tenant.subscription?.planId} /></div>
    <div className={compact ? '' : 'min-w-48'}><Input name="endsAt" label="New subscription end date" type="date" defaultValue={oneYearFromNow()} required /></div>
    <div className={'flex gap-2 ' + (compact ? 'w-full' : '')}>
      <button disabled={busy} className="btn-brand rounded-xl px-4 py-2.5 text-xs font-bold flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50">
        <span className="material-symbols-outlined text-[17px]">{busy ? 'progress_activity' : 'check'}</span>
        {busy ? 'Applying…' : 'Apply plan'}
      </button>
      <button type="button" onClick={onCancel} disabled={busy}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
    </div>
  </form>;
}

function MiniInfo({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-2.5 min-w-0">
    <div className="flex items-center gap-1 text-[10px] text-slate-400"><span className="material-symbols-outlined text-[14px]">{icon}</span>{label}</div>
    <div className="text-xs font-bold text-slate-700 mt-1 truncate">{value}</div>
  </div>;
}

function LoadingRows() {
  return <div className="p-6 space-y-3">{[1, 2, 3].map((item) =>
    <div key={item} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}</div>;
}

function EmptyState({ hasTenants, onCreate }: { hasTenants: boolean; onCreate: () => void }) {
  return <div className="px-5 py-14 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
      <span className="material-symbols-outlined text-[28px]">{hasTenants ? 'search_off' : 'domain_add'}</span></div>
    <h3 className="font-bold mt-4">{hasTenants ? 'No academies match your filters' : 'No academies yet'}</h3>
    <p className="text-xs text-slate-500 mt-1">{hasTenants ? 'Try another search or status.' : 'Create your first customer workspace to get started.'}</p>
    {!hasTenants && <button type="button" onClick={onCreate} className="btn-brand rounded-xl px-4 py-2.5 text-xs font-bold mt-4">Create academy</button>}
  </div>;
}
