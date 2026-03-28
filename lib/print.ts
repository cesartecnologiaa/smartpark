export function openPrintPage(path: string) {
  if (typeof window === 'undefined') return;

  const tenantId = window.localStorage.getItem('smartpark:tenantId');
  const url = new URL(path, window.location.origin);
  if (tenantId && !url.searchParams.get('tenant')) {
    url.searchParams.set('tenant', tenantId);
  }
  const finalPath = `${url.pathname}${url.search}${url.hash}`;

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
