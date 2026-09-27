import React, { useState, useEffect } from 'react';
import {
  X, Lock, ShieldCheck, Trash2, Megaphone, Video, RefreshCw,
  Plus, ExternalLink, Check, AlertTriangle, Sparkles, Send, Globe,
  Eye, EyeOff, HelpCircle, CheckCircle2, Download, Copy, Code,
  Terminal, Layers, Cloud
} from 'lucide-react';
import { Language, translations } from '../locales/translations';
import { VideoItem, AdsterraConfig, SyncSettings } from '../types';

interface AdminPanelModalProps {
  lang: Language;
  onClose: () => void;
  videos: VideoItem[];
  settings: SyncSettings | null;
  adsterra: AdsterraConfig | null;
  onAdsterraSaved: (cfg: AdsterraConfig) => void;
  onVideoDeleted: (videoId: string) => void;
  onAllVideosDeleted: () => void;
  onRefreshData: () => void;
  showToast: (msg: string, type?: 'success' | 'info') => void;
}

interface VercelUser {
  id?: string;
  username: string;
  email?: string;
  name?: string;
  avatar?: string | null;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  lang,
  onClose,
  videos,
  settings,
  adsterra,
  onAdsterraSaved,
  onVideoDeleted,
  onAllVideosDeleted,
  onRefreshData,
  showToast,
}) => {
  const t = translations[lang];

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('telestream_admin_auth') === 'true';
  });
  const [vercelUser, setVercelUser] = useState<VercelUser | null>(() => {
    try {
      const stored = sessionStorage.getItem('telestream_vercel_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Login Method: 'password' | 'vercel'
  const [loginMethod, setLoginMethod] = useState<'password' | 'vercel'>('password');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Vercel Login Form
  const [vercelTokenInput, setVercelTokenInput] = useState('');
  const [isVercelLoggingIn, setIsVercelLoggingIn] = useState(false);
  const [vercelAuthError, setVercelAuthError] = useState('');

  // Tabs: 'adsterra' | 'videos' | 'sync' | 'vercel'
  const [activeTab, setActiveTab] = useState<'adsterra' | 'videos' | 'sync' | 'vercel'>('adsterra');

  // Adsterra Form State
  const [adsterraEnabled, setAdsterraEnabled] = useState(adsterra?.enabled ?? true);
  const [directLinkUrl, setDirectLinkUrl] = useState(adsterra?.directLinkUrl || '');
  const [directLinkTrigger, setDirectLinkTrigger] = useState<'video_play' | 'first_click' | 'disabled'>(
    adsterra?.directLinkTrigger || 'video_play'
  );
  const [socialBarScript, setSocialBarScript] = useState(adsterra?.socialBarScript || '');
  const [bannerTopCode, setBannerTopCode] = useState(adsterra?.bannerTopCode || '');
  const [bannerPlayerCode, setBannerPlayerCode] = useState(adsterra?.bannerPlayerCode || '');
  const [nativeBannerCode, setNativeBannerCode] = useState(adsterra?.nativeBannerCode || '');
  const [popunderCode, setPopunderCode] = useState(adsterra?.popunderCode || '');
  const [isSavingAdsterra, setIsSavingAdsterra] = useState(false);

  // Delete all confirmation state
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Vercel JSON Copy state
  const [copiedVercelJson, setCopiedVercelJson] = useState(false);

  const vercelJsonContent = JSON.stringify(
    {
      "version": 2,
      "buildCommand": "npm run build",
      "outputDirectory": "dist",
      "installCommand": "npm install --legacy-peer-deps",
      "rewrites": [
        {
          "source": "/api/(.*)",
          "destination": "/api"
        },
        {
          "source": "/(.*)",
          "destination": "/index.html"
        }
      ]
    },
    null,
    2
  );

  useEffect(() => {
    if (adsterra) {
      setAdsterraEnabled(adsterra.enabled);
      setDirectLinkUrl(adsterra.directLinkUrl || '');
      setDirectLinkTrigger(adsterra.directLinkTrigger || 'video_play');
      setSocialBarScript(adsterra.socialBarScript || '');
      setBannerTopCode(adsterra.bannerTopCode || '');
      setBannerPlayerCode(adsterra.bannerPlayerCode || '');
      setNativeBannerCode(adsterra.nativeBannerCode || '');
      setPopunderCode(adsterra.popunderCode || '');
    }
  }, [adsterra]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('telestream_admin_auth', 'true');
        setIsAuthenticated(true);
        setPasswordInput('');
        setShowPassword(false);
        showToast(lang === 'bn' ? 'অ্যাডমিন প্যানেলে স্বাগতম!' : 'Welcome to Admin Panel!');
      } else {
        setAuthError(lang === 'bn' ? 'ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।' : 'Incorrect password! Please try again.');
      }
    } catch {
      setAuthError('Connection error. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVercelLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setVercelAuthError('');
    setIsVercelLoggingIn(true);

    try {
      const res = await fetch('/api/admin/vercel-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vercelToken: vercelTokenInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('telestream_admin_auth', 'true');
        if (data.vercelUser) {
          sessionStorage.setItem('telestream_vercel_user', JSON.stringify(data.vercelUser));
          setVercelUser(data.vercelUser);
        }
        setIsAuthenticated(true);
        setVercelTokenInput('');
        showToast(
          lang === 'bn'
            ? `স্বাগতম @${data.vercelUser?.username || 'User'}! Vercel.com দিয়ে লগইন সফল হয়েছে।`
            : 'Successfully authenticated with Vercel.com!'
        );
      } else {
        setVercelAuthError(
          data.error ||
            (lang === 'bn'
              ? 'ভুল Vercel টোকেন! vercel.com/account/tokens থেকে সঠিক টোকেন দিন।'
              : 'Invalid Vercel Token. Please verify at vercel.com/account/tokens.')
        );
      }
    } catch {
      setVercelAuthError('Connection error. Please try again.');
    } finally {
      setIsVercelLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('telestream_admin_auth');
    sessionStorage.removeItem('telestream_vercel_user');
    setIsAuthenticated(false);
    setVercelUser(null);
    setPasswordInput('');
    setVercelTokenInput('');
    setShowPassword(false);
  };

  const handleDeleteAllVideos = async () => {
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/admin/videos/all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        onAllVideosDeleted();
        setIsConfirmingDeleteAll(false);
        showToast(t.allVideosDeleted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteSingleVideo = async (videoId: string) => {
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
      if (res.ok) {
        onVideoDeleted(videoId);
        showToast(t.singleVideoDeleted);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAdsterra = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAdsterra(true);

    const updatedConfig: AdsterraConfig = {
      enabled: adsterraEnabled,
      directLinkUrl: directLinkUrl.trim(),
      directLinkTrigger,
      socialBarScript: socialBarScript.trim(),
      bannerTopCode: bannerTopCode.trim(),
      bannerPlayerCode: bannerPlayerCode.trim(),
      nativeBannerCode: nativeBannerCode.trim(),
      popunderCode: popunderCode.trim(),
    };

    try {
      const res = await fetch('/api/admin/adsterra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });
      if (res.ok) {
        onAdsterraSaved(updatedConfig);
        showToast(t.adsterraSavedSuccess);
      }
    } catch (err) {
      console.error('Failed to save Adsterra settings:', err);
    } finally {
      setIsSavingAdsterra(false);
    }
  };

  const handleCopyVercelJson = async () => {
    try {
      await navigator.clipboard.writeText(vercelJsonContent);
      setCopiedVercelJson(true);
      setTimeout(() => setCopiedVercelJson(false), 2500);
      showToast(lang === 'bn' ? 'vercel.json ক্লিপবোর্ডে কপি হয়েছে!' : 'vercel.json copied to clipboard!');
    } catch {
      // Fallback
    }
  };

  const handleDownloadVercelJson = () => {
    const blob = new Blob([vercelJsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vercel.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(lang === 'bn' ? 'vercel.json ডাউনলোড শুরু হয়েছে!' : 'vercel.json downloaded!');
  };

  return (
    <div
      data-admin-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>{t.adminPanelTitle}</span>
                {isAuthenticated && (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md flex items-center gap-1">
                    {vercelUser ? (
                      <>
                        <Cloud className="w-3 h-3 text-sky-400" />
                        <span>@{vercelUser.username} (Vercel)</span>
                      </>
                    ) : (
                      <span>Admin Authenticated</span>
                    )}
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t.adminLogout}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Not Logged In -> Dual Login Card (Password / Vercel.com) */}
        {!isAuthenticated ? (
          <div className="p-6 sm:p-10 max-w-md mx-auto w-full text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-lg">
              {loginMethod === 'password' ? <Lock className="w-7 h-7" /> : <Cloud className="w-7 h-7 text-sky-400" />}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {t.adminLoginTitle}
              </h3>
              <p className="text-xs text-slate-400">
                {loginMethod === 'password'
                  ? (lang === 'bn' ? 'অ্যাডমিন এক্সেসের জন্য পাসওয়ার্ড লিখুন' : 'Enter your password to access admin controls')
                  : (lang === 'bn' ? 'Vercel.com একাউন্ট দিয়ে সরাসরি লগইন করুন' : 'Sign in using your Vercel.com account credentials')}
              </p>
            </div>

            {/* Login Method Toggle Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLoginMethod('password')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  loginMethod === 'password'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{t.loginWithPassword}</span>
              </button>

              <button
                type="button"
                onClick={() => setLoginMethod('vercel')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  loginMethod === 'vercel'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Vercel.com</span>
              </button>
            </div>

            {/* Form 1: Password Login */}
            {loginMethod === 'password' && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-1">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full text-center tracking-widest text-lg font-mono px-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {authError && (
                    <p className="text-xs text-rose-400 font-medium pt-1">
                      {authError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn || !passwordInput}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
                >
                  {isLoggingIn ? 'Checking...' : t.adminLoginBtn}
                </button>
              </form>
            )}

            {/* Form 2: Vercel.com Token Login */}
            {loginMethod === 'vercel' && (
              <form onSubmit={handleVercelLogin} className="space-y-4 text-left">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-200">
                      {t.vercelTokenLabel}
                    </label>
                    <a
                      href="https://vercel.com/account/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                    >
                      <span>{t.getVercelToken}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="vercel_tok_..."
                    value={vercelTokenInput}
                    onChange={(e) => setVercelTokenInput(e.target.value)}
                    className="w-full font-mono text-xs px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-400">
                    {t.vercelTokenHelp}
                  </p>

                  {vercelAuthError && (
                    <p className="text-xs text-rose-400 font-medium pt-1">
                      {vercelAuthError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isVercelLoggingIn || !vercelTokenInput}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Cloud className="w-4 h-4" />
                  <span>{isVercelLoggingIn ? 'Verifying with Vercel...' : t.vercelLoginBtn}</span>
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Authenticated -> Admin Dashboard Tabs */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab navigation */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('adsterra')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
                  activeTab === 'adsterra'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Megaphone className="w-4 h-4 text-amber-400" />
                <span>{t.adminTabAdsterra}</span>
                {adsterraEnabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('videos')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
                  activeTab === 'videos'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>{t.adminTabVideos}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded-full font-mono">
                  {videos.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sync')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
                  activeTab === 'sync'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t.adminTabSync}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vercel')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
                  activeTab === 'vercel'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cloud className="w-4 h-4 text-sky-400" />
                <span>{t.adminTabVercel}</span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono bg-sky-500/10 text-sky-400 rounded">
                  vercel.json
                </span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* TAB 1: ADSTERRA INTEGRATION */}
              {activeTab === 'adsterra' && (
                <form onSubmit={handleSaveAdsterra} className="space-y-6">
                  {/* Master Switch */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-white">
                          {t.adsterraMasterLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {t.adsterraMasterHelp}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAdsterraEnabled(!adsterraEnabled)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        adsterraEnabled ? 'bg-blue-600' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          adsterraEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 1. Direct Link / SmartLink Settings */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.adsterraDirectLinkLabel}</span>
                      </label>
                      <span className="text-[11px] text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                        High CPM Smartlink
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://www.profitablecpmrate.com/xyz123..."
                        value={directLinkUrl}
                        onChange={(e) => setDirectLinkUrl(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                      {directLinkUrl && (
                        <a
                          href={directLinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1 shrink-0"
                          title="Test Link"
                        >
                          <span>Test</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      {t.adsterraDirectLinkHelp}
                    </p>

                    {/* Direct Link Trigger selection */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-medium text-slate-300">
                        {t.adsterraTriggerLabel}
                      </label>
                      <select
                        value={directLinkTrigger}
                        onChange={(e) => setDirectLinkTrigger(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="video_play">{t.triggerVideoPlay}</option>
                        <option value="first_click">{t.triggerFirstClick}</option>
                        <option value="disabled">{t.triggerDisabled}</option>
                      </select>
                    </div>
                  </div>

                  {/* 2. Social Bar / In-Page Push */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-white flex items-center justify-between">
                      <span>{t.adsterraSocialBarLabel}</span>
                      <span className="text-[11px] text-sky-400 font-mono bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">
                        Social Bar Script
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="<script type='text/javascript' src='//...profitablecpmrate.com/....js'></script>"
                      value={socialBarScript}
                      onChange={(e) => setSocialBarScript(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      {t.adsterraSocialBarHelp}
                    </p>
                  </div>

                  {/* 3. 728x90 Top Banner Ad Code */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-white flex items-center justify-between">
                      <span>{t.adsterraBannerTopLabel}</span>
                      <span className="text-[11px] text-emerald-400 font-mono bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                        728x90 / Top Banner
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="<script type='text/javascript'> atOptions = { 'key': '...' }; </script> <script src='...'></script>"
                      value={bannerTopCode}
                      onChange={(e) => setBannerTopCode(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      {t.adsterraBannerTopHelp}
                    </p>
                  </div>

                  {/* 4. In-Feed / Native Banner Ad Code */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-white flex items-center justify-between">
                      <span>{t.adsterraNativeLabel}</span>
                      <span className="text-[11px] text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                        Native / Between Videos
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="<script async='async' data-cfasync='false' src='//...native.js'></script>"
                      value={nativeBannerCode}
                      onChange={(e) => setNativeBannerCode(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      {lang === 'bn' ? 'ভিডিও গ্রিডের নিচে বা মাঝে প্রদর্শিত হবে।' : 'Displayed below or between video cards.'}
                    </p>
                  </div>

                  {/* 5. 300x250 Player Banner Ad Code */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-white flex items-center justify-between">
                      <span>{t.adsterraBannerPlayerLabel}</span>
                      <span className="text-[11px] text-blue-400 font-mono bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                        300x250 / Player Banner
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="<script type='text/javascript'> atOptions = { 'key': '...', 'format': 'iframe', 'width': 300, 'height': 250 }; </script>"
                      value={bannerPlayerCode}
                      onChange={(e) => setBannerPlayerCode(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      {t.adsterraBannerPlayerHelp}
                    </p>
                  </div>

                  {/* 6. Popunder Script Code */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-white flex items-center justify-between">
                      <span>{t.adsterraPopunderLabel}</span>
                      <span className="text-[11px] text-purple-400 font-mono bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">
                        Popunder Script
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="<script type='text/javascript' src='//...invoke.js'></script>"
                      value={popunderCode}
                      onChange={(e) => setPopunderCode(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Setup Guide Box */}
                  <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                      <HelpCircle className="w-4 h-4" />
                      <span>{lang === 'bn' ? 'Adsterra কোড কীভাবে সেট করবেন?' : 'How to get Adsterra Codes?'}</span>
                    </div>
                    <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                      {lang === 'bn' ? (
                        <>
                          <li><a href="https://adsterra.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-medium">Adsterra.com</a>-এ Publisher একাউন্ট দিয়ে লগইন করুন।</li>
                          <li>ড্যাশবোর্ড থেকে <strong>Direct Links</strong> এ গিয়ে "Create Direct Link" করে লিঙ্কটি কপি করুন।</li>
                          <li>ব্যানার পেতে <strong>Websites</strong> এ গিয়ে আপনার সাইট যুক্ত করে 728x90, 300x250 বা Social Bar এড ইউনিট তৈরি করুন।</li>
                          <li>কোডগুলো উপরের সংশ্লিষ্ট বক্সে পেস্ট করে নিচের <strong>সেভ</strong> বাটনে ক্লিক করুন।</li>
                        </>
                      ) : (
                        <>
                          <li>Log in to your publisher account at <a href="https://adsterra.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-medium">Adsterra.com</a>.</li>
                          <li>Under <strong>Direct Links</strong>, generate a Smartlink and paste the URL above.</li>
                          <li>Under <strong>Websites</strong>, add your site and create ad units (Social Bar, 728x90, 300x250).</li>
                          <li>Paste the generated code snippets into the slots above and click <strong>Save</strong>.</li>
                        </>
                      )}
                    </ol>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingAdsterra}
                      className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
                    >
                      {isSavingAdsterra ? 'Saving...' : t.saveAdsterraSettings}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: VIDEOS MANAGEMENT */}
              {activeTab === 'videos' && (
                <div className="space-y-6">
                  {/* Danger Zone: Delete All Videos */}
                  <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{lang === 'bn' ? 'সব ভিডিও ডিলিট অপশন' : 'Danger Action: Purge Videos'}</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {lang === 'bn'
                          ? 'এক ক্লিকে ওয়েবসাইটের বর্তমান সমস্ত ভিডিও মুছে ফেলুন।'
                          : 'Remove all currently indexed videos from the website database.'}
                      </p>
                    </div>

                    {!isConfirmingDeleteAll ? (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDeleteAll(true)}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all shrink-0 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.deleteAllVideos}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDeleteAll(false)}
                          className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                        >
                          {t.close}
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingAll}
                          onClick={handleDeleteAllVideos}
                          className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isDeletingAll ? 'Deleting...' : (lang === 'bn' ? 'হ্যাঁ, ডিলিট করুন' : 'Confirm Delete')}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Video List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-300">
                        {lang === 'bn' ? `মোট ভিডিও (${videos.length}টি)` : `Total Videos (${videos.length})`}
                      </h4>
                    </div>

                    {videos.length === 0 ? (
                      <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400">
                        {lang === 'bn' ? 'বর্তমানে কোনো ভিডিও নেই।' : 'No videos in the database.'}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {videos.map((vid, idx) => (
                          <div
                            key={vid.id}
                            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs font-mono font-bold text-blue-400 w-8 shrink-0">
                                #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                              </span>
                              <div className="w-12 h-8 rounded bg-slate-900 overflow-hidden shrink-0">
                                <img
                                  src={vid.thumbnailUrl}
                                  alt={vid.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate max-w-sm">
                                  {vid.title}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {new Date(vid.date).toLocaleDateString()} · {vid.views} views
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteSingleVideo(vid.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                              title="Delete Video"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: TELEGRAM SYNC SETTINGS */}
              {activeTab === 'sync' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-semibold text-white">
                          {lang === 'bn' ? 'টেলিগ্রাম অটো-সিঙ্ক স্ট্যাটাস' : 'Telegram Auto-Sync Status'}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {settings?.channelLink || 'https://t.me/+c4pWPb0Ip4JmMGE1'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Active</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400">Bot Connection</span>
                        <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Connected</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400">Polling Interval</span>
                        <div className="font-semibold text-white">Every 5-10 seconds</div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          onRefreshData();
                          showToast(lang === 'bn' ? 'ডাটা রিফ্রেশ করা হয়েছে!' : 'Data refreshed!');
                        }}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'রিফ্রেশ করুন' : 'Refresh Now'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: VERCEL DEPLOYMENT & LOGIN */}
              {activeTab === 'vercel' && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                        <Cloud className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <span>Vercel.com Deployment Ready</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                            Verified
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {vercelUser ? (
                            <span>Connected to Vercel account: <strong className="text-sky-400">@{vercelUser.username}</strong></span>
                          ) : (
                            <span>{lang === 'bn' ? 'vercel.json এবং /api/index.ts কনফিগার করা রয়েছে।' : 'vercel.json and serverless functions ready.'}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href="https://vercel.com/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
                      >
                        <span>{t.deployToVercel}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Vercel.json File Viewer */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <Code className="w-4 h-4 text-sky-400" />
                        <span>{t.vercelConfigTitle}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyVercelJson}
                          className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          {copiedVercelJson ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">{t.copied}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{t.copyVercelJson}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadVercelJson}
                          className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t.downloadVercelJson}</span>
                        </button>
                      </div>
                    </div>

                    <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-sky-300 overflow-x-auto leading-relaxed">
                      {vercelJsonContent}
                    </pre>
                  </div>

                  {/* Step by step Deploy Guide */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span>{t.vercelDeployGuide}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Method 1: Git Import */}
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                        <h5 className="font-semibold text-sky-400 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'পদ্ধতি ১: GitHub দিয়ে ডেপ্লয়' : 'Method 1: GitHub / Dashboard'}</span>
                        </h5>
                        <ol className="text-[11px] text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                          <li>{lang === 'bn' ? 'প্রজেক্টটি আপনার GitHub রিপোজিটরিতে আপলোড করুন।' : 'Push code to your GitHub repo.'}</li>
                          <li><a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">vercel.com/new</a> {lang === 'bn' ? '-এ যান।' : '- click Add New Project.'}</li>
                          <li>{lang === 'bn' ? 'আপনার রিপোজিটরিটি সিলেক্ট করে Deploy বাটনে চাপুন।' : 'Select repo and click Deploy.'}</li>
                          <li>{lang === 'bn' ? 'স্বয়ংক্রিয়ভাবে vercel.json ডিটেক্ট হয়ে সাইট লাইভ হয়ে যাবে!' : 'vercel.json will automatically route API & Frontend!'}</li>
                        </ol>
                      </div>

                      {/* Method 2: CLI Login & Deploy */}
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                        <h5 className="font-semibold text-emerald-400 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'পদ্ধতি ২: Vercel CLI দিয়ে ডেপ্লয়' : 'Method 2: Vercel CLI'}</span>
                        </h5>
                        <div className="space-y-1.5 text-[11px] text-slate-300 font-mono">
                          <div className="p-2 rounded bg-slate-950 border border-slate-800">
                            npm i -g vercel
                          </div>
                          <div className="p-2 rounded bg-slate-950 border border-slate-800">
                            vercel login
                          </div>
                          <div className="p-2 rounded bg-slate-950 border border-slate-800">
                            vercel --prod
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
