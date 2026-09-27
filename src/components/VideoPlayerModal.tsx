import React, { useState, useRef, useEffect } from 'react';
import {
  X, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Heart, Share2, Send, ExternalLink, Download, MessageSquare,
  Sparkles, Check, Smartphone, RotateCw
} from 'lucide-react';
import { VideoItem, AdsterraConfig } from '../types';
import { Language, translations } from '../locales/translations';
import { AdsterraAdBanner } from './AdsterraAdBanner';

interface VideoPlayerModalProps {
  video: VideoItem | null;
  lang: Language;
  onClose: () => void;
  onLikeToggle: (videoId: string) => void;
  onCommentAdded: (videoId: string, newComment: any) => void;
  adsterra?: AdsterraConfig | null;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  lang,
  onClose,
  onLikeToggle,
  onCommentAdded,
  adsterra,
}) => {
  if (!video) return null;

  const t = translations[lang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscapeForced, setIsLandscapeForced] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hasTriggeredDirectLink, setHasTriggeredDirectLink] = useState(false);

  // Comments state
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Handle Adsterra Direct Link on play
  const triggerAdsterraDirectLink = () => {
    if (
      !hasTriggeredDirectLink &&
      adsterra?.enabled &&
      adsterra?.directLinkUrl &&
      adsterra?.directLinkTrigger === 'video_play'
    ) {
      setHasTriggeredDirectLink(true);
      window.open(adsterra.directLinkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLandscapeForced) {
          setIsLandscapeForced(false);
        } else {
          onClose();
        }
      }
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLandscapeForced]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      triggerAdsterraDirectLink();
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // Landscape Mode Handler with Orientation API and CSS Fallback
  const toggleLandscapeMode = async () => {
    const newLandscapeState = !isLandscapeForced;
    setIsLandscapeForced(newLandscapeState);

    if (newLandscapeState) {
      try {
        if (containerRef.current && !document.fullscreenElement) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (err) {
        console.warn(err);
      }

      try {
        if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
          await (screen.orientation as any).lock('landscape');
        }
      } catch (err) {
        console.info('Orientation lock note:', err);
      }
    } else {
      try {
        if (screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
          (screen.orientation as any).unlock();
        }
      } catch (err) {}
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      } catch (err) {}
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
        if (screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
          (screen.orientation as any).unlock();
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/videos/${video.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: commentAuthor.trim() || (lang === 'bn' ? 'দর্শক' : 'Channel Viewer'),
          text: commentText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.comment) {
        onCommentAdded(video.id, data.comment);
        setCommentText('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatTime = (timeInSec: number) => {
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md flex items-center justify-center ${
        isLandscapeForced ? 'p-0' : 'p-2 sm:p-4 md:p-6'
      }`}
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className={`relative bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isLandscapeForced
            ? 'w-full h-full max-w-none rounded-none border-none justify-center bg-black'
            : 'w-full max-w-5xl rounded-2xl my-auto'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        {!isLandscapeForced && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-medium text-sky-400">
                <Send className="w-3.5 h-3.5" />
                <span>{video.channelTitle}</span>
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">{t.syncedFromTelegram}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Landscape Mode Button in Header */}
              <button
                type="button"
                onClick={toggleLandscapeMode}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 transition-colors"
                title="Landscape Mode"
              >
                <Smartphone className="w-3.5 h-3.5 rotate-90" />
                <span>{t.landscapeMode}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Video Canvas & Custom Player Controls */}
        <div
          className={`relative w-full bg-black group select-none flex items-center justify-center ${
            isLandscapeForced ? 'h-full flex-1' : 'aspect-video'
          }`}
        >
          <video
            ref={videoRef}
            src={video.videoUrl}
            poster={video.thumbnailUrl}
            autoPlay
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Floating Landscape Mode Exit button when in full landscape mode */}
          {isLandscapeForced && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLandscapeMode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-medium backdrop-blur-md border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{t.landscapeExit}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-900/90 text-white backdrop-blur-md border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Player Bottom Control Bar Overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 sm:p-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            {/* Scrubber Progress Bar */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 mb-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />

            <div className="flex items-center justify-between text-xs text-slate-200">
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1 text-white hover:text-blue-400 transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1 text-slate-300 hover:text-white"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-slate-700 rounded cursor-pointer accent-blue-500 hidden sm:block"
                  />
                </div>

                {/* Time Display (Tabular nums) */}
                <div className="font-mono text-[11px] text-slate-300 tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Right Controls: Speed selector, Landscape Mode & Fullscreen */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Speed selector */}
                <div className="flex items-center gap-1 bg-slate-800/80 rounded px-1.5 py-0.5">
                  {[1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleRateChange(rate)}
                      className={`text-[11px] px-1 py-0.5 rounded font-mono ${
                        playbackRate === rate
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {/* Dedicated Landscape Mode Toggle Button */}
                <button
                  type="button"
                  onClick={toggleLandscapeMode}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    isLandscapeForced
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/80 text-blue-400 hover:bg-slate-700 hover:text-white'
                  }`}
                  title="Landscape Mode"
                >
                  <Smartphone className="w-3.5 h-3.5 rotate-90" />
                  <span className="hidden sm:inline">Landscape</span>
                </button>

                {/* Fullscreen */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1 text-slate-300 hover:text-white"
                  title="Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Adsterra Player Banner (Inside Player Modal) */}
        {!isLandscapeForced && adsterra?.enabled && adsterra?.bannerPlayerCode && (
          <div className="px-4 sm:px-6 pt-3">
            <AdsterraAdBanner adCode={adsterra.bannerPlayerCode} format="300x250" />
          </div>
        )}

        {/* Video Info & Interaction Section */}
        {!isLandscapeForced && (
          <div className="p-4 sm:p-6 space-y-6 max-h-[45vh] overflow-y-auto">
            {/* Title & Actions Row */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="tabular-nums">{video.views} {t.views}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>{new Date(video.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  {video.fileSize && (
                    <>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="font-mono text-slate-400">{video.fileSize}</span>
                    </>
                  )}
                </div>

                <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
                  {video.title}
                </h2>
              </div>

              {/* Actions Bar */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Like Button */}
                <button
                  type="button"
                  onClick={() => onLikeToggle(video.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    video.liked
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${video.liked ? 'fill-current' : ''}`} />
                  <span className="tabular-nums">{video.likes}</span>
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">{t.copyLink}</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>{t.share}</span>
                    </>
                  )}
                </button>

                {/* Direct Telegram Link Button */}
                <a
                  href={video.channelLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t.openInTelegram}</span>
                  <ExternalLink className="w-3 h-3 text-sky-400/70" />
                </a>

                {/* Download Video */}
                <a
                  href={video.videoUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-800 border border-slate-700 transition-colors"
                  title={t.download}
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Description */}
            {video.caption && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {video.caption}
              </div>
            )}

            {/* Comments Section */}
            <div className="pt-4 border-t border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span>{t.commentsTitle}</span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    ({video.comments?.length || 0})
                  </span>
                </h3>
              </div>

              {/* Comment Form */}
              <form onSubmit={handleCommentSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={lang === 'bn' ? 'আপনার নাম (ঐচ্ছিক)' : 'Your Name (optional)'}
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    className="w-1/3 px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder={t.writeComment}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    required
                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !commentText.trim()}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {t.postComment}
                  </button>
                </div>
              </form>

              {/* Comment List */}
              <div className="space-y-2.5">
                {video.comments && video.comments.length > 0 ? (
                  video.comments.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300">{c.author}</span>
                        <span>
                          {new Date(c.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{c.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic py-2">{t.noCommentsYet}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
