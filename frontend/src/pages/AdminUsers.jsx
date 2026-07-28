import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { UserPlus, ShieldOff, RotateCcw, X } from 'lucide-react';
import { supabase, API_URL } from '../lib/supabaseClient';
import AppLayout from '../components/AppLayout';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` };
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'utilisateur' });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, { headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Invitation envoyée par email.');
      setShowForm(false);
      setForm({ email: '', full_name: '', role: 'utilisateur' });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user) {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(user.is_active ? 'Compte désactivé.' : 'Compte réactivé.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function resetMfa(user) {
    if (!confirm(`Réinitialiser la double authentification de ${user.full_name} ?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${user.id}/reset-mfa`, {
        method: 'POST',
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('MFA réinitialisée. L\'utilisateur devra reconfigurer son authentificateur.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des utilisateurs</h1>
          <p className="text-sm text-slate-500">Seuls les administrateurs peuvent créer des comptes.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-900 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          <UserPlus size={16} /> Créer un compte
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Chargement…</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Nom</th>
                <th className="px-5 py-3 font-medium">Rôle</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3 font-medium text-slate-700">{u.full_name}</td>
                  <td className="px-5 py-3 capitalize text-slate-600">{u.role}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {u.is_active ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => resetMfa(u)} title="Réinitialiser la double authentification" className="p-1.5 text-slate-400 hover:text-brand-700">
                        <RotateCcw size={15} />
                      </button>
                      <button onClick={() => toggleActive(u)} title={u.is_active ? 'Désactiver' : 'Réactiver'} className="p-1.5 text-slate-400 hover:text-red-600">
                        <ShieldOff size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-slate-400">
              <X size={18} />
            </button>
            <h2 className="font-semibold text-lg mb-4">Créer un compte employé</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nom complet</label>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Adresse email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Rôle</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="utilisateur">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <p className="text-xs text-slate-400">
                Un email d'invitation sera envoyé pour définir le mot de passe. La double authentification sera
                exigée à la première connexion.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand-700 hover:bg-brand-900 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm"
              >
                {submitting ? 'Création…' : 'Créer le compte'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
