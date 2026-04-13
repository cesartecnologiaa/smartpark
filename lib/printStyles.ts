/**
 * Shared print styles for ticket pages (entrada, saida, caixa).
 * Uses px units on screen (Android-safe) and mm units inside @media print.
 */

export function buildStyles(is58: boolean) {
  return {
    pageWidthPx: is58 ? '220px' : '302px',
    pageWidthMm: is58 ? '58mm' : '80mm',
    paddingPx: is58 ? '4px 3px 4px' : '11px 10px 8px',
    paddingMm: is58 ? '1.4mm 1.15mm 1.5mm' : '4mm 3.5mm 3mm',
    companyFontPx: is58 ? '10px' : '16px',
    companyFontMm: is58 ? '3.45mm' : '5.6mm',
    companySubPx: is58 ? '7px' : '10px',
    companySubMm: is58 ? '1.85mm' : '2.9mm',
    metaFontPx: is58 ? '6px' : '9px',
    metaFontMm: is58 ? '1.72mm' : '2.8mm',
    labelTopPx: is58 ? '7px' : '12px',
    labelTopMm: is58 ? '2.2mm' : '3.8mm',
    codeFontPx: is58 ? '20px' : '34px',
    codeFontMm: is58 ? '7.1mm' : '12mm',
    subtitlePx: is58 ? '9px' : '13px',
    subtitleMm: is58 ? '2.75mm' : '4.3mm',
    rowFontPx: is58 ? '7px' : '12px',
    rowFontMm: is58 ? '2.32mm' : '4.3mm',
    footerFontPx: is58 ? '6px' : '8px',
    footerFontMm: is58 ? '1.68mm' : '2.6mm',
    qrSizePx: is58 ? '76px' : '117px',
    qrSizeMm: is58 ? '20mm' : '31mm',
    cutHeightPx: is58 ? '22px' : '52px',
    cutHeightMm: is58 ? '6mm' : '14mm',
  };
}

export type PrintStyles = ReturnType<typeof buildStyles>;

export function basePrintStyles(styles: PrintStyles, is58: boolean): string {
  return `
  /* ─── Screen / Android preview (px units) ─── */
  html.print-route-active, body.print-route-active {
    margin:0!important; padding:0!important; background:#fff!important;
    height:auto!important; overflow-x:hidden!important;
  }
  .print-ticket-page {
    display:block; padding:0; margin:0; background:#fff;
  }
  .print-ticket {
    width:${styles.pageWidthPx}; max-width:${styles.pageWidthPx};
    background:#fff; color:#111827;
    padding:${styles.paddingPx};
    box-sizing:border-box; font-family:Arial,Helvetica,sans-serif;
    box-shadow:${is58 ? 'none' : '0 0 0 1px #e5e7eb, 0 8px 20px rgba(15,23,42,0.08)'};
    margin:0 auto;
  }
  .print-ticket-loading { text-align:center; padding-top:30px; padding-bottom:30px; }
  .ticket-header{text-align:center;margin-bottom:6px;}
  .ticket-company{text-align:center;font-size:${styles.companyFontPx};font-weight:600;line-height:1.15;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .ticket-company-sub{font-size:${styles.companySubPx};font-weight:500;line-height:1.25;color:#000;margin-bottom:2px;}
  .ticket-company-meta{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;font-size:${styles.metaFontPx};line-height:1.2;color:#000;font-weight:500;}
  .ticket-dashed{border-top:1px dashed #94a3b8;margin:8px 0;}
  .ticket-label-top{text-align:center;font-size:${styles.labelTopPx};font-weight:700;letter-spacing:.5px;margin-bottom:3px;}
  .ticket-code{text-align:center;font-size:${styles.codeFontPx};font-weight:700;line-height:1;letter-spacing:${is58?'0.5px':'1px'};margin-bottom:5px;}
  .ticket-qr-wrap{display:flex;justify-content:center;margin:3px 0 5px;}
  .ticket-qr{width:${styles.qrSizePx};height:${styles.qrSizePx};image-rendering:pixelated;}
  .ticket-subtitle{text-align:center;font-size:${styles.subtitlePx};font-weight:600;color:#000;margin:4px 0 6px;}
  .ticket-row{display:flex;justify-content:space-between;align-items:flex-start;gap:5px;margin:3px 0;font-size:${styles.rowFontPx};line-height:1.35;}
  .ticket-row-label{color:#000;font-weight:500;}
  .ticket-row-value{color:#111827;font-weight:600;text-align:right;}
  .ticket-footer{text-align:center;font-size:${styles.footerFontPx};line-height:1.2;color:#000;font-weight:500;margin-top:3px;}
  .ticket-footer p{margin:0 0 2px;}
  .cut-space{height:${styles.cutHeightPx};}

  /* ─── @page: explicit paper width so Android print dialog respects it ─── */
  @page { size:${styles.pageWidthMm} auto; margin:0; }

  /* ─── Print media: switch to mm units for real paper output ─── */
  @media print {
    html, body {
      background:#fff!important;
      width:${styles.pageWidthMm}!important;
      margin:0!important; padding:0!important;
    }
    .print-ticket-page { display:block!important; }
    .print-ticket {
      width:${styles.pageWidthMm}!important; max-width:${styles.pageWidthMm}!important;
      margin:0!important; box-shadow:none!important;
      break-inside:avoid; page-break-inside:avoid;
      padding:${styles.paddingMm}!important;
    }
    .ticket-company{font-size:${styles.companyFontMm}!important;}
    .ticket-company-sub{font-size:${styles.companySubMm}!important;}
    .ticket-company-meta{font-size:${styles.metaFontMm}!important;gap:2.2mm!important;}
    .ticket-dashed{margin:3mm 0!important;}
    .ticket-label-top{font-size:${styles.labelTopMm}!important;letter-spacing:.2mm!important;}
    .ticket-code{font-size:${styles.codeFontMm}!important;letter-spacing:${is58?'0.25mm':'0.4mm'}!important;}
    .ticket-qr{width:${styles.qrSizeMm}!important;height:${styles.qrSizeMm}!important;}
    .ticket-subtitle{font-size:${styles.subtitleMm}!important;margin:1.5mm 0 2.5mm!important;}
    .ticket-row{font-size:${styles.rowFontMm}!important;margin:1.2mm 0!important;gap:2mm!important;}
    .ticket-footer{font-size:${styles.footerFontMm}!important;margin-top:1.2mm!important;}
    .ticket-footer p{margin:0 0 .6mm!important;}
    .cut-space{height:${styles.cutHeightMm}!important;}
  }
`;
}
