"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { Camera, ScanQrCode } from 'lucide-react';

interface QrScannerProps {
  onRead: (text: string) => void;
}

export default function QrScanner({ onRead }: QrScannerProps) {
  const elementId = useId().replace(/:/g, '');
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      if (!active) return;
      try {
        const mod = await import('html5-qrcode');
        const Html5Qrcode = mod.Html5Qrcode;
        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText: string) => {
            if (!mounted) return;
            onRead(decodedText);
            try {
              await scanner.stop();
              await scanner.clear();
            } catch {}
            setActive(false);
          },
          () => undefined
        );
        setError('');
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError('Não foi possível acessar a câmera neste navegador.');
          setActive(false);
        }
      }
    }

    startScanner();
    return () => {
      mounted = false;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => undefined).finally(() => scanner.clear().catch(() => undefined));
      }
    };
  }, [active, elementId, onRead]);

  return (
    <div className="panel-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><ScanQrCode size={20} /></div>
        <div>
          <h3 className="font-semibold text-slate-900">Leitura de QR Code</h3>
          <p className="text-sm text-slate-500">Use apenas a câmera do dispositivo para localizar o ticket.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="primary-button" onClick={() => setActive((v) => !v)}>
          <Camera size={16} />
          {active ? 'Parar câmera' : 'Ler QR Code'}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      <div id={elementId} className={`mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 ${active ? 'min-h-[280px]' : 'hidden'}`} />
    </div>
  );
}
