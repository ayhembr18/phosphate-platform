import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import AppLayout from '../components/AppLayout';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const [rows, setRows] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [resourceFilter, setResourceFilter] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: res } = await supabase.from('resources').select('id, name, unit').order('name');
      setResources(res || []);

      let query = supabase
        .from('consumption_values')
        .select('consumption_date, value, resources(name, unit, category_id, categories(name, color))')
        .gte('consumption_date', daysAgo(range))
        .order('consumption_date', { ascending: true });
      if (resourceFilter) query = query.eq('resource_id', resourceFilter);

      const { data, error } = await query;
      if (error) toast.error(error.message);
      setRows(data || []);
      setLoading(false);
    }
    load();
  }, [range, resourceFilter]);

  const trendData = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.consumption_date;
      map.set(key, (map.get(key) || 0) + Number(r.value));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, total]) => ({ date, total }));
  }, [rows]);

  const byResource = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.resources?.name || '—';
      map.set(key, (map.get(key) || 0) + Number(r.value));
    }
    return Array.from(map.entries()).map(([name, total]) => ({ name, total }));
  }, [rows]);

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.resources?.categories?.name || '—';
      const color = r.resources?.categories?.color || '#94a3b8';
      const existing = map.get(key) || { name: key, value: 0, color };
      existing.value += Number(r.value);
      map.set(key, existing);
    }
    return Array.from(map.values());
  }, [rows]);

  const totalConsumption = rows.reduce((s, r) => s + Number(r.value), 0);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
          <p className="text-sm text-slate-500">Vue d'ensemble de la consommation des ressources.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Toutes les ressources</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
            <option value={90}>90 derniers jours</option>
            <option value={365}>12 derniers mois</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs uppercase text-slate-400">Total sur la période</div>
          <div className="text-2xl font-bold text-brand-900 mt-1">{totalConsumption.toLocaleString('fr-FR')}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs uppercase text-slate-400">Enregistrements</div>
          <div className="text-2xl font-bold text-brand-900 mt-1">{rows.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs uppercase text-slate-400">Ressources actives</div>
          <div className="text-2xl font-bold text-brand-900 mt-1">{byResource.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Chargement des données…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-4">Évolution de la consommation totale</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#1e3a8a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-4">Consommation par ressource (histogramme)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byResource}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-2">
            <h3 className="font-semibold text-slate-700 mb-4">Répartition par catégorie</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {byCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
