import puppeteer from 'puppeteer';

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

/** Convertit du HTML en buffer PDF (format A4). */
export async function renderHtmlToPdf(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '16mm', left: '14mm', right: '14mm' },
    });
      return Buffer.from(pdfBuffer);;
  } finally {
    await page.close();
  }
}

const HEADER = (title, subtitle) => `
  <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1e3a8a; padding-bottom:12px; margin-bottom:24px;">
    <div>
      <div style="font-size:12px; letter-spacing:1px; color:#64748b; text-transform:uppercase;">Compagnie de Phosphate de Gafsa</div>
      <h1 style="margin:4px 0 0; font-size:22px; color:#1e293b;">${title}</h1>
      ${subtitle ? `<div style="font-size:13px; color:#475569; margin-top:4px;">${subtitle}</div>` : ''}
    </div>
    <div style="font-size:11px; color:#94a3b8; text-align:right;">
      Généré le ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </div>
`;

const BASE_STYLE = `
  <style>
    * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
    body { margin: 0; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th { background: #1e3a8a; color: #fff; text-align: left; padding: 8px 10px; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .summary-grid { display: flex; gap: 16px; margin: 16px 0 24px; }
    .summary-card { flex: 1; background: #f1f5f9; border-radius: 8px; padding: 14px 16px; }
    .summary-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; }
    .summary-card .value { font-size: 20px; font-weight: 700; color: #1e3a8a; margin-top: 4px; }
    .footer { margin-top: 32px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  </style>
`;

/** Génère le HTML d'un rapport général de consommation à partir de données agrégées. */
export function buildGeneralReportHtml({ periodLabel, rows, totalsByCategory, grandTotalRecords }) {
  const categoryCards = totalsByCategory
    .map(
      (c) => `
      <div class="summary-card">
        <div class="label">${c.category}</div>
        <div class="value">${c.total.toLocaleString('fr-FR')} ${c.unitHint || ''}</div>
      </div>`
    )
    .join('');

  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td>${r.date}</td>
        <td>${r.category}</td>
        <td>${r.resource}</td>
        <td>${r.value.toLocaleString('fr-FR')} ${r.unit}</td>
        <td>${r.note || ''}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" />${BASE_STYLE}</head>
  <body>
    ${HEADER('Rapport Général de Consommation', periodLabel)}
    <div class="summary-grid">${categoryCards}</div>
    <table>
      <thead><tr><th>Date</th><th>Catégorie</th><th>Ressource</th><th>Valeur</th><th>Note</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="footer">${grandTotalRecords} enregistrement(s) — Document confidentiel à usage interne — Compagnie de Phosphate de Gafsa</div>
  </body></html>`;
}

/** Génère le HTML pour l'export d'un seul graphique (image PNG en base64 fournie par le frontend). */
export function buildSingleChartHtml({ title, subtitle, chartImageBase64 }) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" />${BASE_STYLE}</head>
  <body>
    ${HEADER(title, subtitle)}
    <div style="text-align:center; margin-top:20px;">
      <img src="${chartImageBase64}" style="max-width:100%; border:1px solid #e2e8f0; border-radius:8px;" />
    </div>
    <div class="footer">Document confidentiel à usage interne — Compagnie de Phosphate de Gafsa</div>
  </body></html>`;
}
