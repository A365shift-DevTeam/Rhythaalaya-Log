import React, { useEffect, useMemo, useState } from 'react';
import { ApiError, api, Plan, Session, Tenant, TenantUser } from '../api';

const oneYearFromNow = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : 'None';

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
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null);

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
      setError(requestError instanceof ApiError ? requestError.message : 'The platform data could not be loaded.');
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
      setNotice('Plan created.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The plan could not be created.');
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
      setNotice('Academy created, along with its first admin account.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The academy could not be created.');
    } finally {
      setBusyId(null);
    }
  }

  /* Suspension is confirmed in the row rather than through a blocking
     browser dialog, so the academy being suspended stays visible. */
  async function setTenantActive(tenant: Tenant, active: boolean) {
    clearMessages();
    setConfirmSuspend(null);
    setBusyId('status-' + tenant.id);
    try {
      await api.setTenantStatus(session.token, tenant.id, active);
      setNotice(active ? 'Academy activated.' : 'Academy suspended.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The academy could not be updated.');
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
      setNotice('Subscription updated.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The subscription could not be updated.');
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
      setError(requestError instanceof ApiError ? requestError.message : 'The users could not be loaded.');
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
      setNotice('User added.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The user could not be created.');
    } finally {
      setBusyId(null);
    }
  }

  const rowProps = (tenant: Tenant) => ({
    tenant,
    renewing,
    busyId,
    confirmSuspend,
    setConfirmSuspend,
    setRenewing,
    openUsers,
    setTenantActive
  });

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-rail-line bg-rail">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="title text-rail-text">Rhythaalaya Platform</h1>
            <p className="text-[11px] text-rail-text-2">Every academy on the service</p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="hidden min-w-0 text-right sm:block">
              <span className="block truncate text-[12px] font-medium text-rail-text">{session.user.fullName}</span>
              <span className="block truncate text-[11px] text-rail-text-2">{session.user.email}</span>
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="icon-btn h-11 w-11 text-rail-text-2 hover:bg-rail-2 hover:text-rail-text"
              title="Sign out"
              aria-label="Sign out"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 md:space-y-6 md:py-7 lg:px-8">
        {(error || notice) && (
          <div
            role="alert"
            className={`flex items-start gap-2.5 rounded-card border px-3.5 py-3 text-[13px] ${
              error
                ? 'border-kumkum-line bg-kumkum-tint text-kumkum'
                : 'border-leaf-line bg-leaf-tint text-leaf-strong'
            }`}
          >
            <span className="material-symbols-outlined mt-px shrink-0 text-[19px]" aria-hidden="true">
              {error ? 'error' : 'check_circle'}
            </span>
            <span className="min-w-0 flex-1 py-0.5">{error || notice}</span>
            <button
              type="button"
              onClick={clearMessages}
              aria-label="Dismiss"
              className="icon-btn h-8 w-8 shrink-0 text-current hover:bg-black/5"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
            </button>
          </div>
        )}

        <section aria-label="Platform summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Academies" value={tenants.length} note={`${activeTenants} active`} />
          <Stat
            label="Suspended"
            value={tenants.length - activeTenants}
            note={tenants.length - activeTenants ? 'No access' : 'None'}
            tone={tenants.length - activeTenants > 0 ? 'due' : 'plain'}
          />
          <Stat label="Users" value={totalUsers} note={`${totalStudents} students`} />
          <Stat label="Plans" value={plans.length} note="On the price list" />
        </section>

        <section className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line px-3 py-3 md:px-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="title">Academies</h2>
              <p className="label-xs mt-0.5">Access, usage, and subscription dates.</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0">
                <label htmlFor="tenant-search" className="sr-only">Search academies</label>
                <span
                  className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-ink-3"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  id="tenant-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, slug, or plan"
                  className="field pl-10 sm:w-60"
                />
              </div>
              <label htmlFor="tenant-status" className="sr-only">Filter by status</label>
              <select
                id="tenant-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="field sm:w-36"
              >
                <option>All</option>
                <option>Active</option>
                <option>Suspended</option>
              </select>
              <button
                type="button"
                onClick={() => { setShowTenant(!showTenant); setShowPlan(false); }}
                className="btn btn-primary shrink-0"
              >
                {showTenant ? 'Cancel' : 'Add academy'}
              </button>
            </div>
          </div>

          {showTenant && (
            <form onSubmit={createTenant} className="border-b border-line-2 bg-surface-2 p-3 md:p-4">
              <p className="label mb-3">
                This creates the workspace, its first admin account, and the subscription.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input name="name" label="Academy name" placeholder="Sruthi Laya Academy" required />
                <Input name="slug" label="Workspace slug" placeholder="sruthi-laya" required />
                <SelectPlan plans={plans} />
                <Input name="endsAt" label="Subscription ends" type="date" defaultValue={oneYearFromNow()} required />
                <Input name="adminName" label="Admin name" placeholder="Full name" required />
                <Input name="adminEmail" label="Admin email" type="email" placeholder="admin@academy.com" required />
                <Input
                  name="adminPassword"
                  label="Temporary password"
                  type="password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
                <div className="flex items-end">
                  <button
                    disabled={busyId === 'new-tenant' || plans.length === 0}
                    className="btn btn-primary w-full"
                  >
                    {busyId === 'new-tenant' ? 'Creating…' : 'Create academy'}
                  </button>
                </div>
              </div>
              {plans.length === 0 && (
                <p className="label mt-3 text-kumkum">Add a subscription plan before creating an academy.</p>
              )}
            </form>
          )}

          {loading ? (
            <div className="space-y-2.5 p-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-card bg-surface-2" />
              ))}
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-3">
              <div className="empty">
                <p className="text-[13px] font-semibold text-ink">
                  {tenants.length ? 'Nothing matches that' : 'No academies yet'}
                </p>
                <p className="label max-w-80">
                  {tenants.length
                    ? 'Try another search or status.'
                    : 'Create the first customer workspace to get started.'}
                </p>
                {!tenants.length && (
                  <button
                    type="button"
                    onClick={() => setShowTenant(true)}
                    className="btn btn-secondary btn-sm mt-1"
                  >
                    Add academy
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Academy</th>
                      <th scope="col">Plan</th>
                      <th scope="col" className="text-right">Students</th>
                      <th scope="col" className="text-right">Users</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map((tenant) => (
                      <React.Fragment key={tenant.id}>
                        <tr>
                          <td>
                            <span className="block truncate text-[13px] font-medium text-ink">{tenant.name}</span>
                            <span className="num block text-[11px] text-ink-3">{tenant.slug}</span>
                          </td>
                          <td>
                            <span className="block truncate text-[13px] text-ink">
                              {tenant.subscription?.planName || 'No plan'}
                            </span>
                            <span className="num block text-[11px] text-ink-3">
                              ends {formatDate(tenant.subscription?.endsAt)}
                            </span>
                          </td>
                          <td className="col-num">{tenant.studentCount}</td>
                          <td className="col-num">{tenant.userCount}</td>
                          <td><StatusChip active={tenant.isActive} /></td>
                          <td>
                            <TenantActions {...rowProps(tenant)} />
                          </td>
                        </tr>

                        {renewing === tenant.id && (
                          <tr>
                            <td colSpan={6} className="bg-surface-2">
                              <SubscriptionForm
                                tenant={tenant}
                                plans={plans}
                                busy={busyId === 'subscription-' + tenant.id}
                                onSubmit={(event) => renew(event, tenant.id)}
                                onCancel={() => setRenewing(null)}
                              />
                            </td>
                          </tr>
                        )}

                        {managingUsers === tenant.id && (
                          <tr>
                            <td colSpan={6} className="bg-surface-2">
                              <TenantUsersPanel
                                tenant={tenant}
                                plan={plans.find((plan) => plan.id === tenant.subscription?.planId)}
                                users={tenantUsers[tenant.id] || []}
                                loading={usersLoading}
                                busy={busyId === 'user-' + tenant.id}
                                onSubmit={(event) => createTenantUser(event, tenant.id)}
                                onClose={() => setManagingUsers(null)}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-line-2 lg:hidden">
                {filteredTenants.map((tenant) => (
                  <article key={tenant.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-[13px] font-semibold text-ink">{tenant.name}</h3>
                        <p className="num truncate text-[11px] text-ink-3">{tenant.slug}</p>
                      </div>
                      <StatusChip active={tenant.isActive} />
                    </div>

                    <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <MiniInfo label="Plan" value={tenant.subscription?.planName || 'None'} />
                      <MiniInfo label="Ends" value={formatDate(tenant.subscription?.endsAt)} mono />
                      <MiniInfo label="Students" value={String(tenant.studentCount)} mono />
                      <MiniInfo label="Users" value={String(tenant.userCount)} mono />
                    </dl>

                    <div className="mt-3">
                      <TenantActions {...rowProps(tenant)} />
                    </div>

                    {renewing === tenant.id && (
                      <div className="mt-3 border-t border-line-2 pt-3">
                        <SubscriptionForm
                          tenant={tenant}
                          plans={plans}
                          busy={busyId === 'subscription-' + tenant.id}
                          onSubmit={(event) => renew(event, tenant.id)}
                          onCancel={() => setRenewing(null)}
                          compact
                        />
                      </div>
                    )}

                    {managingUsers === tenant.id && (
                      <div className="mt-3 border-t border-line-2 pt-3">
                        <TenantUsersPanel
                          tenant={tenant}
                          plan={plans.find((plan) => plan.id === tenant.subscription?.planId)}
                          users={tenantUsers[tenant.id] || []}
                          loading={usersLoading}
                          busy={busyId === 'user-' + tenant.id}
                          onSubmit={(event) => createTenantUser(event, tenant.id)}
                          onClose={() => setManagingUsers(null)}
                          compact
                        />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-start justify-between gap-2.5 border-b border-line px-3 py-3 md:px-4">
            <div>
              <h2 className="title">Plans</h2>
              <p className="label-xs mt-0.5">The API enforces these limits automatically.</p>
            </div>
            <button
              type="button"
              onClick={() => { setShowPlan(!showPlan); setShowTenant(false); }}
              className="btn btn-secondary btn-sm shrink-0"
            >
              {showPlan ? 'Cancel' : 'Add plan'}
            </button>
          </div>

          {showPlan && (
            <form onSubmit={createPlan} className="border-b border-line-2 bg-surface-2 p-3 md:p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <Input name="name" label="Name" placeholder="Professional" required />
                <Input name="code" label="Code" placeholder="PRO" required />
                <Input name="monthlyPrice" label="Per month (₹)" type="number" min={0} placeholder="1999" required />
                <Input name="maxUsers" label="Max users" type="number" min={1} placeholder="10" required />
                <Input name="maxStudents" label="Max students" type="number" min={1} placeholder="250" required />
                <div className="flex items-end">
                  <button disabled={busyId === 'new-plan'} className="btn btn-primary w-full">
                    {busyId === 'new-plan' ? 'Creating…' : 'Create plan'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {plans.length === 0 ? (
            <div className="p-3">
              <div className="empty">
                <p className="text-[13px] font-semibold text-ink">No plans yet</p>
                <p className="label max-w-72">An academy needs a plan before it can be created.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 p-3 md:grid-cols-2 md:p-4 xl:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.id} className="card-inset p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="title truncate">{plan.name}</h3>
                      <p className="num text-[11px] text-ink-3">{plan.code}</p>
                    </div>
                    {!plan.isActive && <span className="chip chip-neutral shrink-0">Retired</span>}
                  </div>

                  <p className="mt-2.5 flex items-baseline gap-1.5">
                    <span className="num-lg">₹{plan.monthlyPrice.toLocaleString('en-IN')}</span>
                    <span className="label-xs">per month</span>
                  </p>

                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line-2 pt-3">
                    <MiniInfo label="Students" value={String(plan.maxStudents)} mono />
                    <MiniInfo label="Users" value={String(plan.maxUsers)} mono />
                  </dl>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  note,
  tone = 'plain'
}: {
  label: string;
  value: number;
  note: string;
  tone?: 'plain' | 'due';
}) {
  return (
    <div className="card p-3.5 md:p-4">
      <p className="label">{label}</p>
      <p className={`num-lg mt-1.5 ${tone === 'due' ? 'text-kumkum' : 'text-ink'}`}>{value}</p>
      <p className="label-xs mt-1 truncate">{note}</p>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...input } = props;
  const id = `field-${props.name}`;
  const numeric = props.type === 'number' || props.type === 'date';
  return (
    <div>
      <label htmlFor={id} className="label mb-1.5 block font-semibold text-ink">{label}</label>
      <input {...input} id={id} className={`field ${numeric ? 'num' : ''}`} />
    </div>
  );
}

function SelectPlan({ plans, defaultValue }: { plans: Plan[]; defaultValue?: string }) {
  return (
    <div>
      <label htmlFor="field-planId" className="label mb-1.5 block font-semibold text-ink">Plan</label>
      <select id="field-planId" name="planId" required defaultValue={defaultValue || ''} className="field">
        <option value="" disabled>Pick a plan</option>
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>{plan.name} — ₹{plan.monthlyPrice}</option>
        ))}
      </select>
    </div>
  );
}

function StatusChip({ active }: { active: boolean }) {
  return active
    ? <span className="chip chip-settled">Active</span>
    : <span className="chip chip-due">Suspended</span>;
}

interface TenantActionsProps {
  tenant: Tenant;
  renewing: string | null;
  busyId: string | null;
  confirmSuspend: string | null;
  setConfirmSuspend: React.Dispatch<React.SetStateAction<string | null>>;
  setRenewing: React.Dispatch<React.SetStateAction<string | null>>;
  openUsers: (tenantId: string) => Promise<void>;
  setTenantActive: (tenant: Tenant, active: boolean) => Promise<void>;
}

function TenantActions({
  tenant,
  renewing,
  busyId,
  confirmSuspend,
  setConfirmSuspend,
  setRenewing,
  openUsers,
  setTenantActive
}: TenantActionsProps) {
  const changing = busyId === 'status-' + tenant.id;

  if (confirmSuspend === tenant.id) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-[12px] text-ink">Suspend {tenant.name}? Everyone loses access now.</span>
        <button type="button" onClick={() => setConfirmSuspend(null)} className="btn btn-ghost btn-sm">
          Keep active
        </button>
        <button
          type="button"
          disabled={changing}
          onClick={() => void setTenantActive(tenant, false)}
          className="btn btn-danger btn-sm"
        >
          {changing ? 'Suspending…' : 'Suspend'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      <button
        type="button"
        onClick={() => setRenewing(renewing === tenant.id ? null : tenant.id)}
        className="btn btn-secondary btn-sm"
      >
        Subscription
      </button>
      <button
        type="button"
        onClick={() => { setRenewing(null); void openUsers(tenant.id); }}
        className="btn btn-secondary btn-sm"
      >
        Users
      </button>
      {tenant.isActive ? (
        <button
          type="button"
          disabled={changing}
          onClick={() => setConfirmSuspend(tenant.id)}
          className="btn btn-danger btn-sm"
        >
          Suspend
        </button>
      ) : (
        <button
          type="button"
          disabled={changing}
          onClick={() => void setTenantActive(tenant, true)}
          className="btn btn-secondary btn-sm"
        >
          {changing ? 'Activating…' : 'Activate'}
        </button>
      )}
    </div>
  );
}

function TenantUsersPanel({
  tenant,
  plan,
  users,
  loading,
  busy,
  onSubmit,
  onClose,
  compact = false
}: {
  tenant: Tenant;
  plan?: Plan;
  users: TenantUser[];
  loading: boolean;
  busy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  compact?: boolean;
}) {
  const atLimit = plan ? tenant.userCount >= plan.maxUsers : false;

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h3 className="title">Users at {tenant.name}</h3>
          <p className="label-xs mt-0.5">
            <span className="num">{tenant.userCount}</span>
            {plan ? <> of <span className="num">{plan.maxUsers}</span> allowed on {plan.name}</> : ' users'}
          </p>
        </div>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm shrink-0">Close</button>
      </div>

      {loading ? (
        <p className="label">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="label">No users yet.</p>
      ) : (
        <ul className={compact ? 'space-y-2' : 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3'}>
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-2.5 rounded-card border border-line bg-surface p-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{user.fullName}</span>
                <span className="block truncate text-[11px] text-ink-3">{user.email}</span>
              </span>
              <span className="chip chip-neutral shrink-0">
                {user.role === 'TenantAdmin' ? 'Admin' : 'Staff'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {atLimit ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-ctl border border-brass-line bg-brass-tint px-3 py-2.5 text-[13px] text-brass"
        >
          <span className="material-symbols-outlined mt-px shrink-0 text-[18px]" aria-hidden="true">info</span>
          {tenant.name} is at the <span className="num">{plan?.maxUsers}</span>-user limit on {plan?.name}.
          Move it to a larger plan to add another user.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="rounded-card border border-line bg-surface p-3">
          <p className="label mb-2.5 font-semibold text-ink">Add a user</p>
          <div className={compact ? 'space-y-3' : 'grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-5'}>
            <Input name="fullName" label="Name" placeholder="Full name" required />
            <Input name="email" label="Email" type="email" placeholder="user@academy.com" required />
            <Input
              name="password"
              label="Temporary password"
              type="password"
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
            <div>
              <label htmlFor="field-role" className="label mb-1.5 block font-semibold text-ink">Role</label>
              <select id="field-role" name="role" defaultValue="Staff" required className="field">
                <option value="Staff">Staff</option>
                <option value="TenantAdmin">Admin</option>
              </select>
            </div>
            <button disabled={busy} className="btn btn-primary w-full">
              {busy ? 'Adding…' : 'Add user'}
            </button>
          </div>
          <p className="label-xs mt-2.5">
            They can sign in straight away with this email and temporary password.
          </p>
        </form>
      )}
    </div>
  );
}

function SubscriptionForm({
  tenant,
  plans,
  busy,
  onSubmit,
  onCancel,
  compact = false
}: {
  tenant: Tenant;
  plans: Plan[];
  busy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  compact?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className={compact ? 'space-y-3' : 'flex flex-wrap items-end gap-3'}>
      <div className={compact ? '' : 'min-w-52'}>
        <SelectPlan plans={plans} defaultValue={tenant.subscription?.planId} />
      </div>
      <div className={compact ? '' : 'min-w-48'}>
        <Input name="endsAt" label="New end date" type="date" defaultValue={oneYearFromNow()} required />
      </div>
      <div className={`flex gap-2 ${compact ? 'w-full' : ''}`}>
        <button disabled={busy} className="btn btn-primary flex-1">
          {busy ? 'Applying…' : 'Apply plan'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

function MiniInfo({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="label-xs">{label}</dt>
      <dd className={`truncate text-[12px] font-medium text-ink ${mono ? 'num' : ''}`} title={value}>
        {value}
      </dd>
    </div>
  );
}
