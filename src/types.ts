export interface CommentItem {
  id: string;
  author: string;
  text: string;
  date: string;
}

export interface VideoItem {
  id: string;
  telegramMessageId?: number;
  title: string;
  caption: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  views: number;
  likes: number;
  liked?: boolean;
  category: string;
  tags: string[];
  channelLink: string;
  channelTitle: string;
  date: string;
  fileSize?: string;
  source: 'telegram_webhook' | 'telegram_sync' | 'manual' | 'simulated';
  comments?: CommentItem[];
}

export interface SyncSettings {
  channelLink: string;
  channelTitle: string;
  botTokenConfigured: boolean;
  botUsername?: string;
  channelChatId?: string;
  autoSyncActive: boolean;
  lastSyncTime: string;
  totalVideosCount: number;
  telegramSyncedCount: number;
}

export interface AdsterraConfig {
  enabled: boolean;
  directLinkUrl: string;
  directLinkTrigger: 'video_play' | 'first_click' | 'disabled';
  socialBarScript: string;
  bannerTopCode: string;
  bannerPlayerCode: string;
  nativeBannerCode: string;
  popunderCode: string;
}
