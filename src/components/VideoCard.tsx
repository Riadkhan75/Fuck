import React from 'react';
import { Play, Eye, Heart, MessageSquare, Send } from 'lucide-react';
import { VideoItem } from '../types';
import { Language, translations } from '../locales/translations';

interface VideoCardProps {
  video: VideoItem;
  serialNumber: number;
  lang: Language;
  onSelect: (video: VideoItem) => void;
  onLikeToggle?: (videoId: string, e: React.MouseEvent) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  serialNumber,
  lang,
  onSelect,
  onLikeToggle,
}) => {
  const t = translations[lang];

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const formattedSerial = serialNumber < 10 ? `0${serialNumber}` : `${serialNumber}`;

  return (
    <article
      onClick={() => onSelect(video)}
      className="group cursor-pointer rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/50 transition-all duration-200 overflow-hidden flex flex-col hover:shadow-xl hover:shadow-black/50 hover:-translate-y-0.5"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
          }}
        />

        {/* Hover Dark Overlay & Center Play Button */}
        <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/60 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg transform scale-90 opacity-80 group-hover:scale-100 group-hover:opacity-100 group-hover:bg-blue-500 transition-all duration-200">
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          </div>
        </div>

        {/* Serial Badge - High visibility */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600/95 backdrop-blur-md text-[11px] text-white font-mono font-bold tracking-wider shadow-md">
          <span>#{formattedSerial}</span>
        </div>

        {/* Duration badge positioned in bottom corner */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-black/85 text-white tracking-wider tabular-nums">
          {formatDuration(video.duration)}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata line: Serial & Date */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <span className="text-blue-400 font-mono font-medium">Serial #{formattedSerial}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{formatDate(video.date)}</span>
            {video.telegramMessageId && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-sky-400 font-mono text-[11px] flex items-center gap-1">
                  <Send className="w-2.5 h-2.5" />
                  <span>TG Post #{video.telegramMessageId}</span>
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
            {video.title}
          </h3>

          {/* Caption Snippet if exists */}
          {video.caption && (
            <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {video.caption}
            </p>
          )}
        </div>

        {/* Bottom Metrics Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3 tabular-nums">
            <span className="flex items-center gap-1 hover:text-slate-200">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>{video.views}</span>
            </span>

            {video.comments && video.comments.length > 0 && (
              <span className="flex items-center gap-1 hover:text-slate-200">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>{video.comments.length}</span>
              </span>
            )}
          </div>

          {/* Like button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLikeToggle?.(video.id, e);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              video.liked
                ? 'text-rose-400 bg-rose-500/10'
                : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${video.liked ? 'fill-current' : ''}`} />
            <span className="tabular-nums font-mono text-xs">{video.likes}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
