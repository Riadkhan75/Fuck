import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const ADMIN_PASSWORD = '205090';

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.resolve('/tmp', 'data') : path.resolve(__dirname, 'data');
const VIDEOS_FILE = path.resolve(DATA_DIR, 'videos.json');
const SETTINGS_FILE = path.resolve(DATA_DIR, 'settings.json');
const ADSTERRA_FILE = path.resolve(DATA_DIR, 'adsterra.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Copy default files to /tmp/data if on Vercel
if (isVercel) {
  const localDataDir = path.resolve(__dirname, 'data');
  if (fs.existsSync(localDataDir)) {
    ['videos.json', 'settings.json', 'adsterra.json'].forEach((file) => {
      const src = path.resolve(localDataDir, file);
      const dest = path.resolve(DATA_DIR, file);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        try {
          fs.copyFileSync(src, dest);
        } catch {}
      }
    });
  }
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
  comments?: Array<{
    id: string;
    author: string;
    text: string;
    date: string;
  }>;
}

export interface SyncSettings {
  channelLink: string;
  channelTitle: string;
  botToken: string;
  botUsername?: string;
  channelChatId?: string;
  autoSyncActive: boolean;
  lastSyncTime: string;
  pollingIntervalSeconds: number;
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

const DEFAULT_SETTINGS: SyncSettings = {
  channelLink: 'https://t.me/+c4pWPb0Ip4JmMGE1',
  channelTitle: 'Exclusive Telegram Video Stream',
  botToken: '8814469265:AAFZeX2bY2vo_ldC3WdFkOYOeONY9ul0_Ro',
  botUsername: '',
  channelChatId: '',
  autoSyncActive: true,
  lastSyncTime: new Date().toISOString(),
  pollingIntervalSeconds: 10,
};

const DEFAULT_ADSTERRA: AdsterraConfig = {
  enabled: true,
  directLinkUrl: '',
  directLinkTrigger: 'video_play',
  socialBarScript: '',
  bannerTopCode: '',
  bannerPlayerCode: '',
  nativeBannerCode: '',
  popunderCode: '',
};

function loadVideos(): VideoItem[] {
  try {
    if (!fs.existsSync(VIDEOS_FILE)) {
      fs.writeFileSync(VIDEOS_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(VIDEOS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading videos file:', err);
    return [];
  }
}

function saveVideos(videos: VideoItem[]): void {
  try {
    fs.writeFileSync(VIDEOS_FILE, JSON.stringify(videos, null, 2));
  } catch (err) {
    console.error('Error saving videos file:', err);
  }
}

function loadSettings(): SyncSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
      return DEFAULT_SETTINGS;
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (err) {
    console.error('Error loading settings:', err);
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: SyncSettings): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

function loadAdsterra(): AdsterraConfig {
  try {
    if (!fs.existsSync(ADSTERRA_FILE)) {
      fs.writeFileSync(ADSTERRA_FILE, JSON.stringify(DEFAULT_ADSTERRA, null, 2));
      return DEFAULT_ADSTERRA;
    }
    const data = fs.readFileSync(ADSTERRA_FILE, 'utf-8');
    return { ...DEFAULT_ADSTERRA, ...JSON.parse(data) };
  } catch (err) {
    console.error('Error loading Adsterra config:', err);
    return DEFAULT_ADSTERRA;
  }
}

function saveAdsterra(cfg: AdsterraConfig): void {
  try {
    fs.writeFileSync(ADSTERRA_FILE, JSON.stringify(cfg, null, 2));
  } catch (err) {
    console.error('Error saving Adsterra config:', err);
  }
}

// Automated Real-Time Background Telegram Channel Poller
let lastTelegramUpdateOffset = 0;
let isPollingActive = false;

async function autoSyncTelegramVideos() {
  if (isPollingActive) return;
  const settings = loadSettings();
  if (!settings.botToken || !settings.autoSyncActive) return;

  isPollingActive = true;
  try {
    const url = `https://api.telegram.org/bot${settings.botToken}/getUpdates?offset=${lastTelegramUpdateOffset}&limit=30`;
    const response = await fetch(url);
    const data = await response.json() as any;

    if (!data.ok || !Array.isArray(data.result) || data.result.length === 0) {
      isPollingActive = false;
      return;
    }

    let addedCount = 0;
    const list = loadVideos();

    for (const update of data.result) {
      if (update.update_id >= lastTelegramUpdateOffset) {
        lastTelegramUpdateOffset = update.update_id + 1;
      }

      const post = update.channel_post || update.message || update.edited_channel_post;
      if (!post) continue;

      const videoObj = post.video || post.animation || post.document || post.video_note;
      if (!videoObj) continue;

      if (post.document && !post.video) {
        const mime = post.document.mime_type || '';
        const name = post.document.file_name || '';
        if (!mime.startsWith('video/') && !name.match(/\.(mp4|mkv|mov|webm|avi)$/i)) {
          continue;
        }
      }

      const messageId = post.message_id;
      const alreadyExists = list.some(v => v.telegramMessageId === messageId);
      if (alreadyExists) continue;

      const caption = post.caption || post.text || '';
      let title = '';
      if (caption && caption.trim()) {
        title = caption.split('\n')[0].trim();
      }
      if (!title && videoObj.file_name) {
        title = videoObj.file_name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      }
      if (!title) {
        title = `Telegram Video #${messageId || list.length + 1}`;
      }

      let streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      let thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

      if (videoObj.file_id) {
        try {
          const fileRes = await fetch(`https://api.telegram.org/bot${settings.botToken}/getFile?file_id=${videoObj.file_id}`);
          const fileJson = await fileRes.json() as any;
          if (fileJson.ok && fileJson.result && fileJson.result.file_path) {
            streamUrl = `https://api.telegram.org/file/bot${settings.botToken}/${fileJson.result.file_path}`;
          }
        } catch (e) {
          console.warn('Could not fetch file path:', e);
        }
      }

      if (videoObj.thumbnail && videoObj.thumbnail.file_id) {
        try {
          const thumbRes = await fetch(`https://api.telegram.org/bot${settings.botToken}/getFile?file_id=${videoObj.thumbnail.file_id}`);
          const thumbJson = await thumbRes.json() as any;
          if (thumbJson.ok && thumbJson.result && thumbJson.result.file_path) {
            thumbnailUrl = `https://api.telegram.org/file/bot${settings.botToken}/${thumbJson.result.file_path}`;
          }
        } catch (tErr) {}
      }

      const fileSizeMb = videoObj.file_size ? `${(videoObj.file_size / (1024 * 1024)).toFixed(1)} MB` : undefined;

      const newVideo: VideoItem = {
        id: `tg_${messageId || Date.now()}`,
        telegramMessageId: messageId,
        title,
        caption,
        videoUrl: streamUrl,
        thumbnailUrl,
        duration: videoObj.duration || 60,
        views: 1,
        likes: 0,
        liked: false,
        category: 'Telegram',
        tags: [],
        channelLink: settings.channelLink,
        channelTitle: post.chat?.title || settings.channelTitle,
        date: new Date(post.date ? post.date * 1000 : Date.now()).toISOString(),
        fileSize: fileSizeMb,
        source: 'telegram_sync',
        comments: []
      };

      list.unshift(newVideo);
      addedCount++;
    }

    if (addedCount > 0) {
      saveVideos(list);
      console.log(`[Auto-Sync] Ingested ${addedCount} new video(s) directly from Telegram channel!`);
    }

    settings.lastSyncTime = new Date().toISOString();
    saveSettings(settings);
  } catch (err) {
    console.error('Telegram auto-sync poll error:', err);
  } finally {
    isPollingActive = false;
  }
}

// Background auto poller: checks every 6 seconds!
setInterval(autoSyncTelegramVideos, 6000);
setTimeout(autoSyncTelegramVideos, 1500);

// ========================
// PUBLIC VIDEO API ROUTES
// ========================

// GET all videos in serial order
app.get('/api/videos', (req, res) => {
  autoSyncTelegramVideos().catch(() => {});

  let list = loadVideos();
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({
    videos: list,
    total: list.length,
    channelLink: loadSettings().channelLink
  });
});

// GET single video and increment view
app.get('/api/videos/:id', (req, res) => {
  const list = loadVideos();
  const index = list.findIndex(v => v.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Video not found' });
  }

  list[index].views += 1;
  saveVideos(list);
  res.json(list[index]);
});

// POST toggle like
app.post('/api/videos/:id/like', (req, res) => {
  const list = loadVideos();
  const video = list.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  if (video.liked) {
    video.liked = false;
    video.likes = Math.max(0, video.likes - 1);
  } else {
    video.liked = true;
    video.likes += 1;
  }

  saveVideos(list);
  res.json({ success: true, likes: video.likes, liked: video.liked });
});

// POST add comment
app.post('/api/videos/:id/comments', (req, res) => {
  const { author, text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  const list = loadVideos();
  const video = list.find(v => v.id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  if (!video.comments) {
    video.comments = [];
  }

  const newComment = {
    id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    author: (author && author.trim()) || 'Viewer',
    text: text.trim(),
    date: new Date().toISOString(),
  };

  video.comments.unshift(newComment);
  saveVideos(list);
  res.json({ success: true, comment: newComment });
});

// DELETE video
app.delete('/api/videos/:id', (req, res) => {
  let list = loadVideos();
  const initialLen = list.length;
  list = list.filter(v => v.id !== req.params.id);
  if (list.length === initialLen) {
    return res.status(404).json({ error: 'Video not found' });
  }
  saveVideos(list);
  res.json({ success: true });
});

// ========================
// ADSTERRA CONFIGURATION API
// ========================

// GET Adsterra configuration (public)
app.get('/api/adsterra', (req, res) => {
  res.json(loadAdsterra());
});

// POST Admin update Adsterra configuration
app.post('/api/admin/adsterra', (req, res) => {
  const { password, ...adsterraUpdates } = req.body;
  if (password && password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const current = loadAdsterra();
  const updated: AdsterraConfig = {
    ...current,
    ...adsterraUpdates,
  };
  saveAdsterra(updated);
  res.json({ success: true, adsterra: updated });
});

// ========================
// ADMIN PANEL API (Pass: 205090)
// ========================

// Admin Login Check
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      token: 'admin_auth_' + Date.now(),
      message: 'অ্যাডমিন প্যানেলে সফলভাবে লগইন হয়েছে।'
    });
  }
  res.status(401).json({ success: false, error: 'ভুল অ্যাডমিন পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।' });
});

// Admin Vercel.com Login Check
app.post('/api/admin/vercel-login', async (req, res) => {
  const { vercelToken } = req.body;
  if (!vercelToken || typeof vercelToken !== 'string' || !vercelToken.trim()) {
    return res.status(400).json({ success: false, error: 'Vercel token is required' });
  }

  try {
    const vercelRes = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        Authorization: `Bearer ${vercelToken.trim()}`,
      },
    });

    if (!vercelRes.ok) {
      return res.status(401).json({
        success: false,
        error: 'ভুল Vercel টোকেন! vercel.com/account/tokens থেকে সঠিক টোকেন দিন।',
      });
    }

    const userData = (await vercelRes.json()) as any;
    const user = userData.user;

    return res.json({
      success: true,
      token: 'vercel_auth_' + Date.now(),
      vercelUser: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name || user.username,
        avatar: user.avatar ? `https://vercel.com/api/www/avatar/${user.avatar}` : null,
      },
      message: `স্বাগতম ${user.name || user.username}! Vercel.com দিয়ে সফলভাবে অ্যাডমিন প্যানেলে লগইন হয়েছে।`,
    });
  } catch (err: any) {
    console.error('Vercel API verification error:', err);
    return res.status(500).json({ success: false, error: 'Vercel.com API-র সাথে যোগাযোগ করা যায়নি।' });
  }
});

// Admin Delete ALL Videos
app.delete('/api/admin/videos/all', (req, res) => {
  const { password } = req.body;
  if (password && password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  saveVideos([]);
  res.json({ success: true, message: 'সব ভিডিও সফলভাবে মুছে ফেলা হয়েছে।' });
});

// ========================
// SETTINGS & WEBHOOK
// ========================

// GET current settings
app.get('/api/settings', (req, res) => {
  const settings = loadSettings();
  const videos = loadVideos();
  res.json({
    channelLink: settings.channelLink,
    channelTitle: settings.channelTitle,
    botTokenConfigured: Boolean(settings.botToken && settings.botToken.length > 5),
    botUsername: settings.botUsername || '',
    channelChatId: settings.channelChatId || '',
    autoSyncActive: settings.autoSyncActive,
    lastSyncTime: settings.lastSyncTime,
    totalVideosCount: videos.length,
    telegramSyncedCount: videos.filter(v => v.source === 'telegram_webhook' || v.source === 'telegram_sync' || v.source === 'simulated').length,
  });
});

// POST update settings
app.post('/api/settings', (req, res) => {
  const current = loadSettings();
  const { channelLink, channelTitle, botToken, botUsername, channelChatId, autoSyncActive } = req.body;

  if (channelLink !== undefined) current.channelLink = channelLink;
  if (channelTitle !== undefined) current.channelTitle = channelTitle;
  if (botToken !== undefined) current.botToken = botToken;
  if (botUsername !== undefined) current.botUsername = botUsername;
  if (channelChatId !== undefined) current.channelChatId = channelChatId;
  if (autoSyncActive !== undefined) current.autoSyncActive = Boolean(autoSyncActive);

  saveSettings(current);
  res.json({ success: true, settings: current });
});

// POST Telegram Webhook endpoint
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('Received Telegram Webhook Update:', JSON.stringify(update));

    const post = update.channel_post || update.message || update.edited_channel_post;
    if (!post) {
      return res.json({ ok: true, status: 'No channel post or message in update' });
    }

    const videoObj = post.video || post.animation || post.document || post.video_note;
    if (!videoObj) {
      return res.json({ ok: true, status: 'Post does not contain video media' });
    }

    const settings = loadSettings();
    const caption = post.caption || post.text || '';

    let title = '';
    if (caption && caption.trim()) {
      title = caption.split('\n')[0].trim();
    }
    if (!title && videoObj.file_name) {
      title = videoObj.file_name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    }
    if (!title) {
      title = `Telegram Video #${post.message_id || Date.now()}`;
    }

    let streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    let thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

    if (settings.botToken && videoObj.file_id) {
      try {
        const fileRes = await fetch(`https://api.telegram.org/bot${settings.botToken}/getFile?file_id=${videoObj.file_id}`);
        const fileJson = await fileRes.json() as any;
        if (fileJson.ok && fileJson.result && fileJson.result.file_path) {
          streamUrl = `https://api.telegram.org/file/bot${settings.botToken}/${fileJson.result.file_path}`;
        }
      } catch (tgErr) {
        console.warn('Could not fetch file path from Telegram Bot API:', tgErr);
      }
    }

    if (settings.botToken && videoObj.thumbnail && videoObj.thumbnail.file_id) {
      try {
        const thumbRes = await fetch(`https://api.telegram.org/bot${settings.botToken}/getFile?file_id=${videoObj.thumbnail.file_id}`);
        const thumbJson = await thumbRes.json() as any;
        if (thumbJson.ok && thumbJson.result && thumbJson.result.file_path) {
          thumbnailUrl = `https://api.telegram.org/file/bot${settings.botToken}/${thumbJson.result.file_path}`;
        }
      } catch (tErr) {}
    }

    const fileSizeMb = videoObj.file_size ? `${(videoObj.file_size / (1024 * 1024)).toFixed(1)} MB` : undefined;

    const newVideo: VideoItem = {
      id: `tg_${post.message_id || Date.now()}`,
      telegramMessageId: post.message_id,
      title,
      caption,
      videoUrl: streamUrl,
      thumbnailUrl,
      duration: videoObj.duration || 60,
      views: 1,
      likes: 0,
      liked: false,
      category: 'Telegram',
      tags: [],
      channelLink: settings.channelLink,
      channelTitle: post.chat?.title || settings.channelTitle,
      date: new Date(post.date ? post.date * 1000 : Date.now()).toISOString(),
      fileSize: fileSizeMb,
      source: 'telegram_webhook',
      comments: []
    };

    const list = loadVideos();
    const exists = list.some(v => v.telegramMessageId && v.telegramMessageId === post.message_id);
    if (!exists) {
      list.unshift(newVideo);
      saveVideos(list);
    }

    settings.lastSyncTime = new Date().toISOString();
    saveSettings(settings);

    return res.json({ ok: true, video: newVideo });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: error.message || 'Internal webhook error' });
  }
});

// Configure Vite or Static Serve
async function setupServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`TeleStream Full-Stack Server running on port ${PORT}`);
  });
}

if (!isVercel) {
  setupServer();
}

export default app;
export { app };
