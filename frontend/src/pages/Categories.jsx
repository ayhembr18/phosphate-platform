import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/AppLayout';

const COLORS = ['#1e3a8a', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed'];

export default function Categories() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} | category
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) toast.error(error.message);
    setCategories(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm({ name: '', description: '', color: COLORS[0] });
    setEditing({});
  }

  function openEdit(cat) {
    setForm({ name: cat.name, description: cat.description || '', color: cat.color || COLORS[0] });
    setEditing(cat);
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (editing?.id) {
        const { error } = await supabase.from('categories').update(form).eq('id', editing.id);
        if (error) throw error;
        toast.success('Catégorie modifiée.');
      } else {
        const { error } = await supabase.from('categories').insert(form);
        if (error) throw error;
        toast.success('Catégorie créée.');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette catégorie et toutes ses ressources associées ?')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Catégorie supprimée.');
    load();
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catégories</h1>
          <p className="text-sm text-slate-500">Organisez vos ressources par catégorie (eau, énergie, réactifs…)</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-brand-700 hover:bg-brand-900 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          <Plus size={16} /> Nouvelle catégorie
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Chargement…</div>
      ) : categories.length === 0 ? (
        <div className="text-slate-400 text-sm bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
          Aucune catégorie pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <h3 className="font-semibold text-slate-800">{cat.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(cat)} className="p-1.5 text-slate-400 hover:text-brand-700">
                    <Pencil size={15} />
                  </button>
                  {profile?.role === 'admin' && (
                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
              {cat.description && <p className="text-sm text-slate-500 mt-2">{cat.description}</p>}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button onClick={() => setEditing(null)} className="absolute top-4 right-4 text-slate-400">
              <X size={18} />
            </button>
            <h2 className="font-semibold text-lg mb-4">{editing.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nom</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Description (optionnel)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Couleur</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-full ${form.color === c ? 'ring-2 ring-offset-2 ring-brand-700' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
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
