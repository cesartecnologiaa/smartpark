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
  const useRawBtFlow = printMethod === 'rawbt' && isAndroidDevice();

  const url = new URL(path, window.location.origin);
  if (tenantId && !url.searchParams.get('tenant')) {
    url.searchParams.set('tenant', tenantId);
  }

  if (useRawBtFlow) {
    url.searchParams.set('printMode', 'rawbt');
    url.searchParams.set('autoPrint', '0');
    url.searchParams.set('returnTo', `${window.location.pathname}${window.location.search}${window.location.hash}`);
  }

  const finalPath = `${url.pathname}${url.search}${url.hash}`;

  if (useRawBtFlow) {
    window.location.assign(finalPath);
    return;
  }

  const popup = window.open(
    finalPath,
    'smartpark-print-popup',
    'width=420,height=760,left=180,top=60,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
  );

  if (!popup) {
    window.open(finalPath, '_blank', 'noopener,noreferrer');
    return;
  }

  popup.focus();
}
