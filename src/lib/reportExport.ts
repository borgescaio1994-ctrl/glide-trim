export interface ReportAppointmentRow {
  id: string;
  status: string;
  appointment_date: string;
  start_time: string;
  completed_at: string | null;
  cancelled_at: string | null;
  service: { name?: string; price?: number; duration_minutes?: number } | null;
  client: { full_name?: string } | null;
  barber: { full_name?: string } | null;
}

function escapeCsvField(val: string): string {
  const s = val ?? '';
  if (/[",;\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** CSV com separador `;` e BOM UTF-8 — abre bem no Excel em PT-BR. */
export function buildAppointmentsCsv(
  rows: ReportAppointmentRow[],
  meta: { establishmentName?: string; periodLabel: string }
): string {
  const header = [
    'Serviço',
    'Cliente',
    'Profissional',
    'Status',
    'Valor (R$)',
    'Data/hora conclusão ou cancelamento',
    'Data agendamento',
    'Hora início',
    'Duração (min)',
  ];
  const lines: string[] = [
    escapeCsvField(`BookNow — Relatório`),
    escapeCsvField(meta.establishmentName ? `Estabelecimento: ${meta.establishmentName}` : ''),
    escapeCsvField(`Período: ${meta.periodLabel}`),
    escapeCsvField(''),
    header.join(';'),
  ];

  for (const a of rows) {
    const price = Number(a.service?.price ?? 0);
    const statusLabel = a.status === 'completed' ? 'Concluído' : 'Cancelado';
    const when =
      a.status === 'completed' && a.completed_at
        ? a.completed_at
        : a.cancelled_at || '';
    const row = [
      escapeCsvField(a.service?.name || ''),
      escapeCsvField(a.client?.full_name || 'N/A'),
      escapeCsvField(a.barber?.full_name || 'N/A'),
      escapeCsvField(statusLabel),
      escapeCsvField(price.toFixed(2).replace('.', ',')),
      escapeCsvField(when),
      escapeCsvField(a.appointment_date || ''),
      escapeCsvField((a.start_time || '').slice(0, 5)),
      escapeCsvField(String(a.service?.duration_minutes ?? '')),
    ];
    lines.push(row.join(';'));
  }

  return '\uFEFF' + lines.join('\r\n');
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Abre janela de impressão (guardar como PDF no browser). */
export function printReportAsPdf(
  rows: ReportAppointmentRow[],
  meta: { establishmentName?: string; periodLabel: string; generatedAt: string }
) {
  const rowsHtml = rows
    .map((a) => {
      const price = Number(a.service?.price ?? 0);
      const statusLabel = a.status === 'completed' ? 'Concluído' : 'Cancelado';
      const when =
        a.status === 'completed' && a.completed_at
          ? new Date(a.completed_at).toLocaleString('pt-BR')
          : a.cancelled_at
            ? new Date(a.cancelled_at).toLocaleString('pt-BR')
            : '—';
      return `<tr>
        <td>${escapeHtml(a.service?.name || '')}</td>
        <td>${escapeHtml(a.client?.full_name || 'N/A')}</td>
        <td>${escapeHtml(a.barber?.full_name || 'N/A')}</td>
        <td>${statusLabel}</td>
        <td>${price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td>${when}</td>
        <td>${escapeHtml(a.appointment_date || '')}</td>
        <td>${escapeHtml((a.start_time || '').slice(0, 5))}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório BookNow</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 12px; padding: 16px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .meta { color: #444; margin-bottom: 16px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #f4f4f4; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Relatório — procedimentos concluídos e cancelados</h1>
  <div class="meta">
    ${meta.establishmentName ? `<div><strong>Estabelecimento:</strong> ${escapeHtml(meta.establishmentName)}</div>` : ''}
    <div><strong>Período:</strong> ${escapeHtml(meta.periodLabel)}</div>
    <div><strong>Gerado em:</strong> ${escapeHtml(meta.generatedAt)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Serviço</th><th>Cliente</th><th>Profissional</th><th>Status</th><th>Valor</th>
        <th>Data/hora registo</th><th>Data agend.</th><th>Hora</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
