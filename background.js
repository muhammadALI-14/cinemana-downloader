// background.js - Cinemana Downloader Service Worker

console.log("[Cinemana Downloader] background.js loaded");

// ===== URL patterns =====

const VIDEO_URL_PATTERN = /_video\.mp4\?/i;
const VIDEO_HOST_PATTERN = /^(cdn|cndw\d*)\.shabakaty\.com$/i;

const SUBTITLE_URL_PATTERN = /_(ar|en)_transfile\.vtt\?/i;
const SUBTITLE_HOST_PATTERN = /^(.*\.)?shabakaty\.com$/i;

// ===== Data stores =====

const captured = {};

const lastDownloads = {};

// Clean old entries every 60 seconds
setInterval(() => {
  const cutoff = Date.now() - 60000;
  for (const [url, time] of Object.entries(lastDownloads)) {
    if (time < cutoff) delete lastDownloads[url];
  }
}, 60000);

function getEntry(tabId) {
  if (!captured[tabId]) {
    captured[tabId] = { video: null, subs: {} };
  }
  return captured[tabId];
}

// ===== Utility functions =====

function sanitizeFilename(name) {
  return (name || "download")
    .replace(/[\\/:*?"<>|]/g, "")    // illegal chars
    .replace(/\.\./g, "")             // path traversal
    .replace(/^\.+/, "")              // leading dots
    .replace(/\.+$/, "")              // trailing dots
    .replace(/[\x00-\x1f]/g, "")     // control chars
    .replace(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i, "_$1") // reserved
    .trim()
    .substring(0, 200) || "download";
}

function isValidId(id) {
  return /^\d{1,10}$/.test(String(id));
}

function isAllowedDownloadUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "blob:") return true;
    if (u.protocol !== "https:") return false;
    return /(cdn|cndw\d*)\.shabakaty\.com$/i.test(u.hostname) ||
           u.hostname === "cinemana.shabakaty.com";
  } catch {
    return false;
  }
}

function redactUrl(url) {
  try { const u = new URL(url); return u.origin + u.pathname + "?[REDACTED]"; }
  catch { return "[invalid]"; }
}

// ===== URL validation =====

function isCandidateVideoUrl(url) {
  try {
    const u = new URL(url);
    return VIDEO_HOST_PATTERN.test(u.hostname) && VIDEO_URL_PATTERN.test(url);
  } catch (e) {
    return false;
  }
}

function matchSubtitleUrl(url) {
  try {
    const u = new URL(url);
    if (!SUBTITLE_HOST_PATTERN.test(u.hostname)) return null;
    const m = url.match(SUBTITLE_URL_PATTERN);
    return m ? m[1].toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

// ===== Network monitoring =====

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;

    if (isCandidateVideoUrl(details.url)) {
      const entry = getEntry(details.tabId);
      entry.video = { url: details.url, capturedAt: Date.now() };
      console.log("[Cinemana Downloader] Video captured:", redactUrl(details.url));
      return;
    }

    const lang = matchSubtitleUrl(details.url);
    if (lang) {
      const entry = getEntry(details.tabId);
      entry.subs[lang] = details.url;
      console.log("[Cinemana Downloader] Subtitle captured (" + lang + "):", redactUrl(details.url));
    }
  },
  { urls: ["https://*.shabakaty.com/*"] }
);

// ===== Diagnostics log =====

const LOG_KEY = "cd_diag_log";
const MAX_LOG = 500;

let logQueue = [];
let logTimer = null;

function appendLog(line) {
  logQueue.push(line);
  if (!logTimer) {
    logTimer = setTimeout(flushLog, 1000);
  }
}

function flushLog() {
  logTimer = null;
  if (logQueue.length === 0) return;
  const lines = logQueue.splice(0);
  chrome.storage.local.get(LOG_KEY, (r) => {
    const arr = r[LOG_KEY] || [];
    for (const l of lines) {
      if (arr.length === 0 || arr[arr.length - 1] !== l) {
        arr.push(l);
      }
    }
    // Keep only last MAX_LOG entries
    while (arr.length > MAX_LOG) arr.shift();
    chrome.storage.local.set({ [LOG_KEY]: arr });
  });
}

// ===== fetch with timeout =====

function fetchWithTimeout(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// ===== Cleanup =====

chrome.tabs.onRemoved.addListener((tabId) => {
  delete captured[tabId];
});

const lastKnownUrl = {};
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    const prev = lastKnownUrl[tabId];
    if (prev && prev !== changeInfo.url) {
      delete captured[tabId];
    }
    lastKnownUrl[tabId] = changeInfo.url;
  }
});

// ===== Message handling =====

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender - reject messages from non-extension contexts
  if (!sender || (!sender.tab && !sender.url?.startsWith('chrome-extension://'))) {
    return false;
  }

  const tabId = sender.tab ? sender.tab.id : message.tabId;

  if (message.type === "CD_LOG" && typeof message.line === "string") {
    appendLog(message.line.substring(0, 500));
    return false;
  }

  if (message.type === "CLEAR_CAPTURED") {
    captured[tabId] = { video: null, subs: {} };
    console.log("[Cinemana Downloader] Cleared capture for tab", tabId);
    return false;
  }

  if (message.type === "GET_VIDEO_URL") {
    // Get tabId from sender only
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId === null) {
      sendResponse({ ok: false, error: "No tab context" });
      return false;
    }
    const entry = captured[tabId];
    const video = entry && entry.video ? entry.video.url : null;
    const subs = entry ? entry.subs : {};
    sendResponse({ ok: !!video, url: video, subs });
    return true;
  }

  if (message.type === "DOWNLOAD_FILE") {
    // Validate URL
    if (!isAllowedDownloadUrl(message.url)) {
      console.error("[Cinemana Downloader] Blocked download from untrusted URL");
      return false;
    }
    
    const filename = sanitizeFilename(message.filename || 'download');
    
    // Dedup check
    const now = Date.now();
    const lastDownload = lastDownloads[message.url];
    if (lastDownload && (now - lastDownload) < 2000) {
      return false;
    }
    lastDownloads[message.url] = now;
    
    console.log("[Cinemana Downloader] Download:", filename);
    chrome.downloads.download({
      url: message.url,
      filename: filename,
      saveAs: false,
      conflictAction: 'uniquify'
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("[Cinemana Downloader] Download error:", chrome.runtime.lastError.message);
      } else {
        console.log("[Cinemana Downloader] Download started, ID:", downloadId);
      }
    });
    return false;
  }

  if (message.type === "GET_LOG") {
    // Only allow from popup (no tab context = extension page)
    if (sender.tab) return false;
    chrome.storage.local.get(LOG_KEY, (r) => {
      sendResponse({ log: r[LOG_KEY] || [] });
    });
    return true;
  }

  // ===== API handlers =====

  if (message.type === "GET_ALL_EPISODES") {
    const episodeId = message.episodeId;
    if (!episodeId || !isValidId(episodeId)) {
      sendResponse({ ok: false, error: "Invalid episodeId" });
      return false;
    }
    
    fetchWithTimeout(`https://cinemana.shabakaty.com/api/android/videoSeason/id/${episodeId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .then(data => {
        console.log("[Cinemana Downloader] Fetched", data.length, "episodes");
        sendResponse({ ok: true, episodes: data });
      })
      .catch(err => {
        const msg = err.name === 'AbortError' ? 'Timeout' : 'Fetch failed';
        console.error("[Cinemana Downloader] Episode fetch error:", msg);
        sendResponse({ ok: false, error: msg });
      });
    
    return true;
  }

  if (message.type === "GET_VIDEO_LINKS") {
    const nb = message.nb;
    if (!nb || !isValidId(nb)) {
      sendResponse({ ok: false, error: "Invalid nb" });
      return false;
    }
    
    fetchWithTimeout(`https://cinemana.shabakaty.com/api/android/transcoddedFiles/id/${nb}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .then(data => {
        console.log("[Cinemana Downloader] Fetched", data.length, "video links for", nb);
        sendResponse({ ok: true, links: data });
      })
      .catch(err => {
        const msg = err.name === 'AbortError' ? 'Timeout' : 'Fetch failed';
        console.error("[Cinemana Downloader] Video links fetch error:", msg);
        sendResponse({ ok: false, error: msg });
      });
    
    return true;
  }

  if (message.type === "GET_SUBTITLE_LINK") {
    const nb = message.nb;
    if (!nb || !isValidId(nb)) {
      sendResponse({ ok: false, error: "Invalid nb" });
      return false;
    }
    
    fetchWithTimeout(`https://cinemana.shabakaty.com/api/android/translationFiles/id/${nb}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .then(data => {
        console.log("[Cinemana Downloader] Fetched", data.length, "translations for", nb);
        sendResponse({ ok: true, translations: data });
      })
      .catch(err => {
        const msg = err.name === 'AbortError' ? 'Timeout' : 'Fetch failed';
        console.error("[Cinemana Downloader] Subtitle fetch error:", msg);
        sendResponse({ ok: false, error: msg });
      });
    
    return true;
  }

  return false;
});

console.log("[Cinemana Downloader] background.js initialized");
