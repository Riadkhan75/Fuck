import React, { useEffect, useRef } from 'react';

interface AdsterraAdBannerProps {
  adCode: string;
  format?: '728x90' | '300x250' | 'responsive' | 'native';
  className?: string;
}

export const AdsterraAdBanner: React.FC<AdsterraAdBannerProps> = ({
  adCode,
  format = 'responsive',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !adCode || !adCode.trim()) return;

    const container = containerRef.current;
    container.innerHTML = '';

    // Create an iframe to safely isolate and execute Adsterra script tags and options
    const iframe = document.createElement('iframe');
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.background = 'transparent';
    iframe.scrolling = 'no';

    if (format === '728x90') {
      iframe.style.width = '100%';
      iframe.style.maxWidth = '728px';
      iframe.style.height = '90px';
    } else if (format === '300x250') {
      iframe.style.width = '300px';
      iframe.style.height = '250px';
    } else {
      iframe.style.width = '100%';
      iframe.style.height = 'auto';
      iframe.style.minHeight = '90px';
    }

    container.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; }
            </style>
          </head>
          <body>
            ${adCode}
          </body>
        </html>
      `);
      doc.close();
    }
  }, [adCode, format]);

  if (!adCode || !adCode.trim()) return null;

  return (
    <div className={`w-full flex justify-center items-center overflow-hidden my-3 ${className}`}>
      <div ref={containerRef} className="flex justify-center items-center w-full" />
    </div>
  );
};
