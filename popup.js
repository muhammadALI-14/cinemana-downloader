// ===== Cinemana Downloader Popup =====

// الإعدادات الافتراضية
const DEFAULT_SETTINGS = {
  quality: '1080FHD',
  subtitleFormat: 'srt',
  videoFormat: 'mp4'
};

// تحميل الإعدادات المحفوظة
document.addEventListener('DOMContentLoaded', async () => {
  const settings = await loadSettings();
  applySettings(settings);
  setupEventListeners();
});

// تحميل الإعدادات من chrome.storage
async function loadSettings() {
  return new Promise((resolve) => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('settings', (result) => {
        resolve(result.settings || DEFAULT_SETTINGS);
      });
    } else {
      resolve(DEFAULT_SETTINGS);
    }
  });
}

function validateSettings(settings) {
  const VALID_QUALITIES = ['360P', '480P', '720P', '1080FHD'];
  const VALID_SUB_FORMATS = ['srt', 'none'];
  const VALID_VIDEO_FORMATS = ['mp4', 'webm'];
  return {
    quality: VALID_QUALITIES.includes(settings.quality) ? settings.quality : '1080FHD',
    subtitleFormat: VALID_SUB_FORMATS.includes(settings.subtitleFormat) ? settings.subtitleFormat : 'srt',
    videoFormat: VALID_VIDEO_FORMATS.includes(settings.videoFormat) ? settings.videoFormat : 'mp4'
  };
}

// حفظ الإعدادات في chrome.storage
async function saveSettings(settings) {
  settings = validateSettings(settings);
  return new Promise((resolve) => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ settings }, resolve);
    } else {
      resolve();
    }
  });
}

// تطبيق الإعدادات على الواجهة
function applySettings(settings) {
  // تطبيق الجودة
  document.querySelectorAll('.quality-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.quality === settings.quality) {
      btn.classList.add('active');
    }
  });

  // تطبيق صيغة الترجمة
  const srtBtn = document.getElementById('srtBtn');
  if (srtBtn) {
    srtBtn.classList.toggle('active', settings.subtitleFormat === 'srt');
  }

  // تطبيق صيغة الفيديو
  const mp4Btn = document.getElementById('mp4Btn');
  if (mp4Btn) {
    mp4Btn.classList.toggle('active', settings.videoFormat === 'mp4');
  }
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
  // أزرار الجودة
  document.querySelectorAll('.quality-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const settings = await loadSettings();
      settings.quality = this.dataset.quality;
      await saveSettings(settings);
      
      // إرسال رسالة لتحديث الإعدادات في content script
      sendMessageToContentScript({
        type: 'UPDATE_SETTINGS',
        settings: settings
      });
    });
  });

  // أزرار التبديل
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      this.classList.toggle('active');
      
      const settings = await loadSettings();
      
      if (this.id === 'srtBtn') {
        settings.subtitleFormat = this.classList.contains('active') ? 'srt' : 'none';
      } else if (this.id === 'mp4Btn') {
        settings.videoFormat = this.classList.contains('active') ? 'mp4' : 'webm';
      }
      
      await saveSettings(settings);
      
      // إرسال رسالة لتحديث الإعدادات في content script
      sendMessageToContentScript({
        type: 'UPDATE_SETTINGS',
        settings: settings
      });
    });
  });
}

// إرسال رسالة إلى content script
async function sendMessageToContentScript(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('cinemana.shabakaty.com')) {
      chrome.tabs.sendMessage(tab.id, message);
    }
  } catch (error) {
    console.warn('Cinemana: Failed to relay settings to content script.');
  }
}
