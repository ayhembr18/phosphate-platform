import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import AppLayout from '../components/AppLayout';

const todayStr = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = { resource_id: '', consumption_date: todayStr(), value: '', note: '' };

export default function Consumption() {
  const [values, setValues] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterResource, setFilterResource] = useState('');

  async function load() {
    setLoading(true);
    const { data: res } = await supabase.from('resources').select('id, name, unit, daily_threshold').order('name');
    setResources(res || []);

    let query = supabase
      .from('consumption_values')
      .select('*, resources(name, unit, daily_threshold)')
      .order('consumption_date', { ascending: false })
      .limit(200);
    if (filterResource) query = query.eq('resource_id', filterResource);

    const { data, error } = await query;
    if (error) toast.error(error.message);
    setValues(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterResource]);

  function openNew() {
    setForm({ ...EMPTY_FORM, resource_id: resources[0]?.id || '' });
    setEditing({});
  }

  function openEdit(v) {
    setForm({
      resource_id: v.resource_id,
      consumption_date: v.consumption_date,
      value: v.value,
      note: v.note || '',
    });
    setEditing(v);
  }

  async function handleSave(e) {
    e.preventDefault();
    const payload = {
      resource_id: form.resource_id,
      consumption_date: form.consumption_date,
      value: Number(form.value),
      note: form.note || null,
    };
    try {
      if (editing?.id) {
        const { error } = await supabase.from('consumption_values').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Valeur modifiée.');
      } else {
        const { error } = await supabase.from('consumption_values').insert(payload);
        if (error) throw error;
        toast.success('Valeur enregistrée.');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message.includes('duplicate') ? 'Une valeur existe déjà pour cette ressource à cette date.' : err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette valeur de consommation ?')) return;
    const { error } = await supabase.from('consumption_values').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Valeur supprimée.');
    load();
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Consommation quotidienne</h1>
          <p className="text-sm text-slate-500">Ajoutez, modifiez ou supprimez les valeurs enregistrées.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterResource}
            onChange={(e) => setFilterResource(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Toutes les ressources</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            onClick={openNew}
            disabled={resources.length === 0}
            className="flex items-center gap-2 bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Plus size={16} /> Nouvelle valeur
          </button>
        </div>
      </div>

      {resources.length === 0 && !loading && (
        <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm mb-6">
          Créez d'abord une ressource avant d'ajouter des valeurs de consommation.
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm">Chargement…</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Ressource</th>
                <th className="px-5 py-3 font-medium">Valeur</th>
                <th className="px-5 py-3 font-medium">Note</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {values.map((v) => {
                const overThreshold = v.resources?.daily_threshold && v.value > v.resources.daily_threshold;
                return (
                  <tr key={v.id}>
                    <td className="px-5 py-3 text-slate-600">{v.consumption_date}</td>
                    <td className="px-5 py-3 font-medium text-slate-700">{v.resources?.name}</td>
                    <td className="px-5 py-3">
                      <span className={overThreshold ? 'text-red-600 font-medium inline-flex items-center gap-1' : 'text-slate-600'}>
                        {overThreshold && <AlertTriangle size={13} />}
                        {v.value} {v.resources?.unit}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{v.note || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(v)} className="p-1.5 text-slate-400 hover:text-brand-700">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(v.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {values.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    Aucune valeur enregistrée.
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
            <h2 className="font-semibold text-lg mb-4">{editing.id ? 'Modifier la valeur' : 'Nouvelle valeur'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Ressource</label>
                <select
                  required
                  value={form.resource_id}
                  onChange={(e) => setForm({ ...form, resource_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={form.consumption_date}
                    onChange={(e) => setForm({ ...form, consumption_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Valeur</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Note (optionnel)</label>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
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
