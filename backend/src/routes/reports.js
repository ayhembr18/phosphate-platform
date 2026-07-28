import { Router } from 'express';
import { z } from 'zod';
import { supabaseAuthCheck } from '../services/supabaseAdmin.js';
import { requireAuth } from '../middleware/auth.js';
import { renderHtmlToPdf, buildGeneralReportHtml, buildSingleChartHtml } from '../services/pdfGenerator.js';

const router = Router();

const generalReportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  categoryIds: z.array(z.string()).optional(),
});

/**
 * POST /api/reports/general
 * Construit un rapport PDF agrégé sur une période donnée.
 * Utilise le token de l'utilisateur (pas le service_role) afin que les
 * politiques RLS s'appliquent normalement à la lecture des données.
 */
router.post('/general', requireAuth, async (req, res) => {
  const parsed = generalReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides.', details: parsed.error.flatten() });
  }
  const { startDate, endDate, categoryIds } = parsed.data;
  const token = req.headers.authorization.slice(7);

  try {
    // Client "au nom de l'utilisateur" pour que RLS s'applique
    supabaseAuthCheck.auth.setSession?.({ access_token: token, refresh_token: '' }).catch(() => {});

    let query = supabaseAuthCheck
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
  chartImageBase64: z.string(), // data:image/png;base64,...
});

/**
 * POST /api/reports/chart
 * Enveloppe une image de graphique (générée côté client avec recharts +
 * html-to-image) dans un PDF avec en-tête officiel.
 */
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
