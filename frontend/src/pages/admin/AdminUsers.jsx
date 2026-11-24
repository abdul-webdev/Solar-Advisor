import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Trash2, ShieldCheck, UserCog, Plus } from 'lucide-react';
import { get, post, patch, del } from '../../services/api';
import { ConfirmModal, FormModal, Field, Badge, ErrorBanner, inputCls, btnPrimary } from '../../components/ui';

export default function AdminUsers() {
  const { setCrumb } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [manage, setManage] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { setCrumb('User management'); }, [setCrumb]);
  useEffect(() => { load(); }, []);

  async function load() {
    try { const d = await get('/admin/users'); setUsers(d.users); }
    catch (e) { setError(e.message); }
  }

  async function saveManage(e) {
    e.preventDefault();
    try {
      await patch(`/admin/users/${manage.id}`, { role: manage.role, status: manage.status, name: manage.name });
      setManage(null); setNotice('User access updated.'); load();
      setTimeout(() => setNotice(''), 3500);
    } catch (err) { setError(err.message); }
  }

  async function sendInvite(e) {
    e.preventDefault();
    setError('');
    try {
      const generated = 'Solar@' + Math.random().toString(36).slice(2, 8) + '1';
      await post('/auth/register', { name: invite.name, email: invite.email, password: generated });
      setInvite(null);
      setNotice(`Invitation created. Temporary password: ${generated} — share it securely; the user should change it after signing in.`);
      load();
      setTimeout(() => setNotice(''), 12000);
    } catch (err) { setError(err.message); }
  }

  const filtered = users.filter((u) => {
    const ms = !search || `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    return ms && (!roleFilter || u.role === roleFilter) && (!statusFilter || u.status === statusFilter);
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-[28px]">User management</h1>
          <p className="mt-1 text-[15px] text-muted">Manage access, review account activity and protect role-based permissions.</p>
        </div>
        <button onClick={() => setInvite({ name: '', email: '' })} className={btnPrimary}><Plus className="h-4 w-4" /> Invite user</button>
      </div>
      <ErrorBanner message={error} />
      {notice && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-success">{notice}</div>}

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: 'Registered users', v: users.length },
          { l: 'General users', v: users.filter((u) => u.role === 'user').length },
          { l: 'Solar experts', v: users.filter((u) => u.role === 'admin').length },
          { l: 'Active', v: users.filter((u) => u.status === 'active').length },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <p className="text-2xl font-bold text-navy">{s.v}</p>
            <p className="text-xs text-muted">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email address…" className={`${inputCls} pl-10`} />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-auto rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm">
          <option value="">All roles</option><option value="user">General user</option><option value="admin">Administrator</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm">
          <option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="invited">Invited</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-appbg"><tr className="text-left text-xs uppercase tracking-wider text-muted">
            <th className="px-5 py-3 font-semibold">Name / email</th><th className="px-5 py-3 font-semibold">Role</th>
            <th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Consultations</th>
            <th className="px-5 py-3 font-semibold">Last active</th><th className="px-5 py-3 text-right font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-line/70">
                <td className="px-5 py-3">
                  <p className="font-medium text-navy">{u.name}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-5 py-3">
                  <Badge tone={u.role === 'admin' ? 'blue' : 'gray'}>{u.role === 'admin' ? 'Administrator' : 'General user'}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone={u.status === 'active' ? 'green' : u.status === 'suspended' ? 'red' : 'amber'}>{u.status}</Badge>
                </td>
                <td className="px-5 py-3 text-navy">{u.consultations}</td>
                <td className="px-5 py-3 text-muted">{u.last_active || 'Not yet signed in'}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setManage({ ...u })} title="Manage access" className="rounded-md p-2 text-muted hover:bg-lightblue hover:text-primary"><UserCog className="h-4 w-4" /></button>
                    <button onClick={() => setToDelete(u)} title="Delete user" className="rounded-md p-2 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">No matching users.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-lightblue p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-[15px] font-bold text-navy">Role-based access is enforced across the entire system</p>
          <p className="mt-1 text-sm leading-relaxed text-navy">
            General users can chat, view their own reports and browse published knowledge. Only administrators and authorized solar experts
            can modify facts, rules or equipment specifications. Permission changes are enforced server-side.
          </p>
        </div>
      </div>

      <FormModal open={!!manage} title="Manage user access" subtitle={manage?.email} onClose={() => setManage(null)} onSubmit={saveManage}>
        {manage && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2">
              <input value={manage.name} onChange={(e) => setManage({ ...manage, name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Role">
              <select value={manage.role} onChange={(e) => setManage({ ...manage, role: e.target.value })} className={inputCls}>
                <option value="user">General user</option><option value="admin">Administrator / Solar expert</option>
              </select>
            </Field>
            <Field label="Account status">
              <select value={manage.status} onChange={(e) => setManage({ ...manage, status: e.target.value })} className={inputCls}>
                <option value="active">Active</option><option value="suspended">Suspended</option><option value="invited">Invited</option>
              </select>
            </Field>
            <p className="sm:col-span-2 rounded-lg bg-appbg px-4 py-3 text-xs text-muted">
              Role changes take effect immediately. You cannot change your own role or delete your own account.
            </p>
          </div>
        )}
      </FormModal>

      <FormModal open={!!invite} title="Invite user" subtitle="Creates a General User account" onClose={() => setInvite(null)} onSubmit={sendInvite} submitLabel="Create invitation">
        {invite && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><input required value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} className={inputCls} /></Field>
            <Field label="Email address"><input type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} className={inputCls} /></Field>
            <p className="sm:col-span-2 rounded-lg bg-appbg px-4 py-3 text-xs text-muted">
              New accounts are always created with the General User role. A temporary password is generated and marked invited until first sign-in.
            </p>
          </div>
        )}
      </FormModal>

      <ConfirmModal open={!!toDelete} title="Delete selected record?"
        message={`This permanently removes ${toDelete?.name}'s account and access. Their saved recommendations are retained for audit. This action cannot be undone.`}
        onConfirm={async () => { try { await del(`/admin/users/${toDelete.id}`); setToDelete(null); load(); } catch (e) { setError(e.message); } }}
        onCancel={() => setToDelete(null)} />
    </div>
  );
}
