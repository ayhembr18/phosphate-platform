import { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';
import { FileDown, Image as ImageIcon } from 'lucide-react';
import { supabase, API_URL } from '../lib/supabaseClient';
import AppLayout from '../components/AppLayout';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` };
}

export default function Reports() {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(daysAgo(0));
  const [downloading, setDownloading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const chartRef = useRef(null);

  useEffect(() => {
    supabase.from('categories').select('id, name').order('name').then(({ data }) => setCategories(data || []));

    supabase
      .from('consumption_values')
      .select('consumption_date, value, resources(name)')
      .gte('consumption_date', daysAgo(30))
      .then(({ data }) => {
        const map = new Map();
        (data || []).forEach((r) => {
          const key = r.resources?.name || '—';
          map.set(key, (map.get(key) || 0) + Number(r.value));
        });
        setChartData(Array.from(map.entries()).map(([name, total]) => ({ name, total })));
      });
  }, []);

  function toggleCategory(id) {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function downloadGeneralReport() {
    setDownloading(true);
    try {
      const res = await fetch(`${API_URL}/api/reports/general`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ startDate, endDate, categoryIds: selectedCategories.length ? selectedCategories : undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Échec de la génération du rapport.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-general-${startDate}-${endDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Rapport téléchargé.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading(false);
    }
  }

  async function downloadChartPdf() {
    if (!chartRef.current) return;
    setDownloading(true);
    try {
      const imageBase64 = await toPng(chartRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const res = await fetch(`${API_URL}/api/reports/chart`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          title: 'Consommation par ressource — 30 derniers jours',
          subtitle: `Du ${daysAgo(30)} au ${daysAgo(0)}`,
          chartImageBase64: imageBase64,
        }),
      });
      if (!res.ok) throw new Error('Échec de la génération du PDF.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'graphique-consommation.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Graphique exporté.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Rapports</h1>
        <p className="text-sm text-slate-500">Générez et téléchargez des rapports PDF officiels.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Rapport général de consommation</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Du</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Au</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-500 mb-2">Catégories (optionnel — toutes si aucune sélection)</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    selectedCategories.includes(c.id) ? 'bg-brand-700 text-white border-brand-700' : 'border-slate-300 text-slate-600'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={downloadGeneralReport}
            disabled={downloading}
            className="flex items-center gap-2 bg-brand-700 hover:bg-brand-900 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
          >
            <FileDown size={16} /> Télécharger le rapport PDF
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Exporter un graphique seul</h3>
          <div ref={chartRef} className="bg-white p-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <button
            onClick={downloadChartPdf}
            disabled={downloading}
            className="flex items-center gap-2 mt-4 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
          >
            <ImageIcon size={16} /> Exporter ce graphique en PDF
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
