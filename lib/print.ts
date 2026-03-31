function readStoredPrintMethod() {
  if (typeof window === 'undefined') return 'browser';
  return window.localStorage.getItem('smartpark:printMethod') || 'browser';
}

function isAndroidDevice() {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(window.navigator.userAgent || '');
}

export function openPrintPage(path: string) {
  if (typeof window === 'undefined') return;

  const tenantId = window.localStorage.getItem('smartpark:tenantId');
  const printMethod = readStoredPrintMethod();
  const isAndroid = isAndroidDevice();
  const useRawBtFlow = printMethod === 'rawbt' && isAndroid;

  const url = new URL(path, window.location.origin);
  if (tenantId && !url.searchParams.get('tenant')) {
    url.searchParams.set('tenant', tenantId);
  }

  // ── RawBT flow (Android thermal printer app) ─────────────────────────────
  if (useRawBtFlow) {
    url.searchParams.set('printMode', 'rawbt');
    url.searchParams.set('autoPrint', '1');
    url.searchParams.set('returnTo', `${window.location.pathname}${window.location.search}${window.location.hash}`);
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
    return;
  }

  // ── Android browser flow ──────────────────────────────────────────────────
  // Android blocks window.open() popups. We navigate the current tab to the
  // print page and pass returnTo so the page can navigate back after printing.
  if (isAndroid) {
    url.searchParams.set('autoPrint', '1');
    url.searchParams.set('returnTo', `${window.location.pathname}${window.location.search}${window.location.hash}`);
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
    return;
  }

  // ── Desktop popup flow ────────────────────────────────────────────────────
  const finalPath = `${url.pathname}${url.search}${url.hash}`;
  const popup = window.open(
    finalPath,
    'smartpark-print-popup',
    'width=420,height=760,left=180,top=60,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
  );

  if (!popup) {
    // Popup blocked on desktop too — open in new tab as last resort
    window.open(finalPath, '_blank', 'noopener,noreferrer');
    return;
  }

  popup.focus();
}
