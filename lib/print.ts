export function openPrintPage(path: string) {
  if (typeof window === 'undefined') return;

  const popup = window.open(
    path,
    'smartpark-print-popup',
    'width=420,height=760,left=180,top=60,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
  );

  if (!popup) {
    window.open(path, '_blank', 'noopener,noreferrer');
    return;
  }

  popup.focus();
}
