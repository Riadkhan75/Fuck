/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Film, Sparkles, CheckCircle2, Shield, Send
} from 'lucide-react';
import { VideoItem, SyncSettings, AdsterraConfig } from './types';
import { Language, translations } from './locales/translations';
import { TopNav } from './components/TopNav';
import { VideoCard } from './components/VideoCard';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AdsterraAdBanner } from './components/AdsterraAdBanner';
import { AdsterraScriptInjector } from './components/AdsterraScriptInjector';

export default function App() {
  const [lang, setLang] = useState<Language>('bn');
  const t = translations[lang];

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [adsterra, setAdsterra] = useState<AdsterraConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals & Selected Video
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/videos');
      if (res.ok) {
        const data = await res.json();
        const incomingVideos = data.videos || [];
        setVideos((prev) => {
          if (prev.length > 0 && incomingVideos.length > prev.length) {
            showToast(
              lang === 'bn'
                ? 'টেলিগ্রাম চ্যানেল থেকে নতুন ভিডিও যুক্ত হয়েছে!'
                : 'New video arrived from Telegram channel!'
            );
          }
          return incomingVideos;
        });
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchAdsterra = async () => {
    try {
      const res = await fetch('/api/adsterra');
      if (res.ok) {
        const data = await res.json();
        setAdsterra(data);
      }
    } catch (err) {
      console.error('Failed to load Adsterra config:', err);
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchSettings();
    fetchAdsterra();

    // Automated real-time polling: checks every 5 seconds for Telegram updates
    const pollInterval = setInterval(() => {
      fetchVideos();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [lang]);

  const handleLikeToggle = async (videoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId) {
          const newLiked = !v.liked;
          return {
            ...v,
            liked: newLiked,
            likes: newLiked ? v.likes + 1 : Math.max(0, v.likes - 1),
          };
        }
        return v;
      })
    );

    if (selectedVideo && selectedVideo.id === videoId) {
      setSelectedVideo((prev) => {
        if (!prev) return null;
        const newLiked = !prev.liked;
        return {
          ...prev,
          liked: newLiked,
          likes: newLiked ? prev.likes + 1 : Math.max(0, prev.likes - 1),
        };
      });
    }

    try {
      await fetch(`/api/videos/${videoId}/like`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleCommentAdded = (videoId: string, newComment: any) => {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId) {
          return {
            ...v,
            comments: [newComment, ...(v.comments || [])],
          };
        }
        return v;
      })
    );

    if (selectedVideo && selectedVideo.id === videoId) {
      setSelectedVideo((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          comments: [newComment, ...(prev.comments || [])],
        };
      });
    }
  };

  const handleVideoDeleted = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    if (selectedVideo && selectedVideo.id === videoId) {
      setSelectedVideo(null);
    }
  };

  const handleAllVideosDeleted = () => {
    setVideos([]);
    setSelectedVideo(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Adsterra Scripts (Popunder, Social Bar, First-Click Smartlink) */}
      <AdsterraScriptInjector adsterra={adsterra} />

      {/* Floating Real-Time Sync Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl flex items-center gap-3 text-xs font-medium text-slate-200">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Clean Top Navigation Bar */}
      <TopNav
        lang={lang}
        setLang={setLang}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        totalVideos={videos.length}
      />

      {/* Adsterra Top Banner (728x90) */}
      {adsterra?.enabled && adsterra?.bannerTopCode && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <AdsterraAdBanner adCode={adsterra.bannerTopCode} format="728x90" />
        </div>
      )}

      {/* Main Content: Serial Video Stream Only */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {loading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-xl bg-slate-900/40 border border-slate-800/60 p-4 space-y-3 animate-pulse"
              >
                <div className="aspect-video w-full rounded-lg bg-slate-800/50" />
                <div className="h-4 bg-slate-800/50 rounded w-3/4" />
                <div className="h-3 bg-slate-800/50 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : videos.length > 0 ? (
          <>
            {/* Pure Serial Video Feed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {videos.map((video, index) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  serialNumber={index + 1}
                  lang={lang}
                  onSelect={(v) => setSelectedVideo(v)}
                  onLikeToggle={handleLikeToggle}
                />
              ))}
            </div>

            {/* Adsterra Native / In-Feed Banner */}
            {adsterra?.enabled && adsterra?.nativeBannerCode && (
              <div className="pt-6 w-full">
                <AdsterraAdBanner adCode={adsterra.nativeBannerCode} format="native" />
              </div>
            )}
          </>
        ) : (
          /* Empty state: Waiting for Telegram Post */
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-12 sm:p-16 text-center space-y-4 max-w-md mx-auto my-16">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-md">
              <Film className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {lang === 'bn' ? 'কোনো ভিডিও নেই' : 'No Videos Yet'}
              </h3>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{lang === 'bn' ? 'টেলিগ্রাম অটো-সিঙ্ক লাইভ চলছে...' : 'Waiting for Telegram post...'}</span>
            </div>
          </div>
        )}
      </main>

      {/* Clean Minimal Footer (Password completely hidden) */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">TeleStream</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{settings?.channelTitle || 'Exclusive Video Stream'}</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              type="button"
              onClick={() => setIsAdminPanelOpen(true)}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors font-medium"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t.navAdminPanel}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Video Player Modal with Landscape Mode & Adsterra Integration */}
      {selectedVideo && (
        <VideoPlayerModal
          video={selectedVideo}
          lang={lang}
          onClose={() => setSelectedVideo(null)}
          onLikeToggle={handleLikeToggle}
          onCommentAdded={handleCommentAdded}
          adsterra={adsterra}
        />
      )}

      {/* Admin Panel Modal */}
      {isAdminPanelOpen && (
        <AdminPanelModal
          lang={lang}
          onClose={() => setIsAdminPanelOpen(false)}
          videos={videos}
          settings={settings}
          adsterra={adsterra}
          onAdsterraSaved={(updated) => setAdsterra(updated)}
          onVideoDeleted={handleVideoDeleted}
          onAllVideosDeleted={handleAllVideosDeleted}
          onRefreshData={() => {
            fetchVideos();
            fetchSettings();
            fetchAdsterra();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
