import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';
import { renderHtmlToPdf, buildGeneralReportHtml, buildSingleChartHtml } from '../services/pdfGenerator.js';

const router = Router();

/**
 * Crée un client Supabase "au nom de l'utilisateur" pour une requête donnée,
 * en passant son token dans l'en-tête Authorization. PostgREST évalue alors
 * les politiques RLS comme si cet utilisateur était directement connecté —
 * sans avoir besoin d'un refresh_token ni d'un appel setSession (qui ne
 * fonctionne pas côté serveur sur un client partagé entre requêtes).
 */
function supabaseAsUser(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const generalReportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  categoryIds: z.array(z.string()).optional(),
});

router.post('/general', requireAuth, async (req, res) => {
  const parsed = generalReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides.', details: parsed.error.flatten() });
  }
  const { startDate, endDate, categoryIds } = parsed.data;
  const token = req.headers.authorization.slice(7);

  try {
    const client = supabaseAsUser(token);

    let query = client
      .from('consumption_values')
      .select('consumption_date, value, note, resources(name, unit, category_id, categories(name))')
      .gte('consumption_date', startDate)
      .lte('consumption_date', endDate)
      .order('consumption_date', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    let rows = (data || []).map((r) => ({
      date: r.consumption_date,
      category: r.resources?.categories?.name || '—',
      resource: r.resources?.name || '—',
      value: Number(r.value),
      unit: r.resources?.unit || '',
      note: r.note,
      categoryId: r.resources?.category_id,
    }));

    if (categoryIds?.length) {
      rows = rows.filter((r) => categoryIds.includes(r.categoryId));
    }

    const totalsMap = new Map();
    for (const r of rows) {
      const key = r.category;
      totalsMap.set(key, {
        category: key,
        total: (totalsMap.get(key)?.total || 0) + r.value,
        unitHint: r.unit,
      });
    }

    const html = buildGeneralReportHtml({
      periodLabel: `Période du ${startDate} au ${endDate}`,
      rows,
      totalsByCategory: Array.from(totalsMap.values()),
      grandTotalRecords: rows.length,
    });

    const pdfBuffer = await renderHtmlToPdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rapport-general.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Erreur génération rapport:', err);
    res.status(500).json({ error: err.message || 'Échec de la génération du rapport.' });
  }
});

const chartExportSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  chartImageBase64: z.string(),
});

router.post('/chart', requireAuth, async (req, res) => {
  const parsed = chartExportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides.', details: parsed.error.flatten() });
  }
  try {
    const html = buildSingleChartHtml(parsed.data);
    const pdfBuffer = await renderHtmlToPdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="graphique.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Erreur export graphique:', err);
    res.status(500).json({ error: err.message || "Échec de l'export du graphique." });
  }
});

export default router;