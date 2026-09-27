import React, { useEffect } from 'react';
import { AdsterraConfig } from '../types';

interface AdsterraScriptInjectorProps {
  adsterra: AdsterraConfig | null;
}

export const AdsterraScriptInjector: React.FC<AdsterraScriptInjectorProps> = ({ adsterra }) => {
  useEffect(() => {
    if (!adsterra || !adsterra.enabled) return;

    const cleanupFns: Array<() => void> = [];

    // Helper to extract and execute scripts from an HTML/JS snippet
    const injectSnippet = (snippet: string, identifier: string) => {
      if (!snippet || !snippet.trim()) return;

      const container = document.createElement('div');
      container.id = `adsterra-${identifier}-container`;
      container.style.display = 'none';
      container.innerHTML = snippet;
      document.body.appendChild(container);

      // Re-create script elements to execute them (standard DOM doesn't execute innerHTML scripts)
      const scripts = Array.from(container.querySelectorAll('script'));
      const activeScripts: HTMLScriptElement[] = [];

      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        if (oldScript.src) {
          newScript.src = oldScript.src;
          newScript.async = true;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        if (oldScript.type) {
          newScript.type = oldScript.type;
        }
        document.body.appendChild(newScript);
        activeScripts.push(newScript);
      });

      cleanupFns.push(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
        activeScripts.forEach((s) => {
          if (s.parentNode) {
            s.parentNode.removeChild(s);
          }
        });
      });
    };

    // 1. Social Bar / In-Page Push script
    if (adsterra.socialBarScript) {
      injectSnippet(adsterra.socialBarScript, 'social-bar');
    }

    // 2. Popunder script
    if (adsterra.popunderCode) {
      injectSnippet(adsterra.popunderCode, 'popunder');
    }

    // 3. First-click Direct Link handler (if trigger is 'first_click')
    if (adsterra.directLinkUrl && adsterra.directLinkTrigger === 'first_click') {
      let triggered = false;
      const handleFirstClick = (e: MouseEvent) => {
        // Ignore clicks inside the admin modal
        const target = e.target as HTMLElement;
        if (target && target.closest('[data-admin-modal="true"]')) {
          return;
        }
        if (!triggered) {
          triggered = true;
          window.open(adsterra.directLinkUrl, '_blank', 'noopener,noreferrer');
          window.removeEventListener('click', handleFirstClick);
        }
      };
      window.addEventListener('click', handleFirstClick);
      cleanupFns.push(() => window.removeEventListener('click', handleFirstClick));
    }

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [adsterra]);

  return null;
};
