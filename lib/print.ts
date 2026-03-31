function readStoredPrintMethod() {
  if (typeof window === 'undefined') return 'browser';
  return window.localStorage.getItem('smartpark:printMethod') || 'browser';
}

function isAndroidDevice() {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(window.navigator.userAgent || '');
}

function buildReturnTo() {
  if (typeof window === 'undefined') return '';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
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

  url.searchParams.set('t', String(Date.now()));
  url.searchParams.set('returnTo', buildReturnTo());

  if (useRawBtFlow) {
    url.searchParams.set('printMode', 'rawbt');
    url.searchParams.set('autoPrint', '0');
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
    return;
  }

  url.searchParams.set('autoPrint', isAndroid ? '0' : '1');

  const finalPath = `${url.pathname}${url.search}${url.hash}`;

  const popup = window.open(
    finalPath,
    'smartpark-print-popup',
    'width=420,height=760,left=180,top=60,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
  );

  if (!popup) {
    window.location.assign(finalPath);
    return;
  }

  popup.focus();
}
