import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/AppLayout';

const EMPTY_FORM = { name: '', unit: '', category_id: '', daily_threshold: '' };

export default function Resources() {
  const { profile } = useAuth();
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    const [{ data: res, error: resErr }, { data: cats, error: catErr }] = await Promise.all([
      supabase.from('resources').select('*, categories(name, color)').order('name'),
      supabase.from('categories').select('id, name').order('name'),
    ]);
    if (resErr) toast.error(resErr.message);
    if (catErr) toast.error(catErr.message);
    setResources(res || []);
    setCategories(cats || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id || '' });
    setEditing({});
  }

  function openEdit(r) {
    setForm({
      name: r.name,
      unit: r.unit,
      category_id: r.category_id,
      daily_threshold: r.daily_threshold ?? '',
    });
    setEditing(r);
  }

  async function handleSave(e) {
    e.preventDefault();
    const payload = {
      name: form.name,
      unit: form.unit,
      category_id: form.category_id,
      daily_threshold: form.daily_threshold === '' ? null : Number(form.daily_threshold),
    };
    try {
      if (editing?.id) {
        const { error } = await supabase.from('resources').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Ressource modifiée.');
      } else {
        const { error } = await supabase.from('resources').insert(payload);
        if (error) throw error;
        toast.success('Ressource créée.');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette ressource et toutes ses valeurs de consommation ?')) return;
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Ressource supprimée.');
    load();
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ressources</h1>
          <p className="text-sm text-slate-500">Les éléments dont vous suivez la consommation quotidienne.</p>
        </div>
        <button
          onClick={openNew}
          disabled={categories.length === 0}
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          <Plus size={16} /> Nouvelle ressource
        </button>
      </div>

      {categories.length === 0 && !loading && (
        <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm mb-6">
          Créez d'abord une catégorie avant d'ajouter une ressource.
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm">Chargement…</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Ressource</th>
                <th className="px-5 py-3 font-medium">Catégorie</th>
                <th className="px-5 py-3 font-medium">Unité</th>
                <th className="px-5 py-3 font-medium">Seuil d'alerte</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resources.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 font-medium text-slate-700">{r.name}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.categories?.color }} />
                      {r.categories?.name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{r.unit}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {r.daily_threshold ? (
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle size={13} className="text-amber-500" /> {r.daily_threshold} {r.unit}/jour
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-brand-700">
                        <Pencil size={15} />
                      </button>
                      {profile?.role === 'admin' && (
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {resources.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    Aucune ressource pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button onClick={() => setEditing(null)} className="absolute top-4 right-4 text-slate-400">
              <X size={18} />
            </button>
            <h2 className="font-semibold text-lg mb-4">{editing.id ? 'Modifier la ressource' : 'Nouvelle ressource'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nom</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="ex: Eau industrielle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Catégorie</label>
                <select
                  required
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Unité</label>
                  <input
                    required
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="ex: m³, kg, kWh"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Seuil d'alerte</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.daily_threshold}
                    onChange={(e) => setForm({ ...form, daily_threshold: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="optionnel"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-2.5 rounded-lg text-sm">
                Enregistrer
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
