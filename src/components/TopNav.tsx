import React from 'react';
import { Send, Shield, Globe } from 'lucide-react';
import { Language, translations } from '../locales/translations';

interface TopNavProps {
  lang: Language;
  setLang: (lang: Language) => void;
  onOpenAdminPanel: () => void;
  totalVideos: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  lang,
  setLang,
  onOpenAdminPanel,
  totalVideos,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Send className="w-4 h-4 -rotate-12 translate-x-px -translate-y-px" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">
              TeleStream
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>{lang === 'bn' ? 'টেলিগ্রাম অটো-সিঙ্ক' : 'Auto-Sync Active'}</span>
            </div>
          </div>
        </div>

        {/* Right Zone: Language Toggle & Admin Panel Only */}
        <div className="flex items-center gap-2.5">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
          </button>

          {/* Admin Panel Button */}
          <button
            type="button"
            onClick={onOpenAdminPanel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 transition-all shadow-sm active:scale-95"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.navAdminPanel}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
