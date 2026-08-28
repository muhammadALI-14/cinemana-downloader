// content.js - Cinemana Downloader
// يعمل على صفحة الفيديو على cinemana.shabakaty.com
// مسؤول عن: حقن أزرار التحميل وتحديد نوع المحتوى (مسلسل/فيلم)

console.log("[Cinemana Downloader] content.js محمّل");

const CONTAINER_ID = "cinemana-download-container";
const TOAST_ID = "cinemana-download-toast";

// ===== دوال مساعدة =====

// عرض رسالة toast
function showToast(message, duration = 3000) {
  let toast = document.getElementById(TOAST_ID);
  if (!toast) {
    toast = document.createElement("div");
    toast.id = TOAST_ID;
    toast.className = "cinemana-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = (message || "").substring(0, 200);
  toast.classList.add("visible");
  clearTimeout(showToast._timeout);
  showToast._timeout = setTimeout(() => {
    toast.classList.remove("visible");
  }, duration);
}

// تسجيل أحداث التشخيص
function log(...args) {
  const timestamp = new Date().toISOString();
  const message = args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
  console.log(`[Cinemana Downloader] [${timestamp}] ${message}`);
  try {
    chrome.runtime.sendMessage({ type: "CD_LOG", line: `[${timestamp}] ${message}` });
  } catch (e) {}
}

// تنظيف اسم الملف من الأحرف غير المسموحة
function sanitizeFileName(name) {
  return (name || "")
    .replace(/[\\/:*?"<>|]/g, "")    // existing: illegal chars
    .replace(/\.\./g, "")             // path traversal
    .replace(/^\.+/, "")              // leading dots
    .replace(/\.+$/, "")              // trailing dots
    .replace(/[\x00-\x1f\x7f-\x9f]/g, "") // control chars
    .replace(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i, "_$1") // Windows reserved
    .trim()
    .substring(0, 200) || "download";
}

// استخراج اسم العرض من الصفحة
function extractShowName() {
  const h1 = document.querySelector("h1");
  if (h1 && h1.textContent.trim()) {
    return h1.textContent.trim();
  }
  return document.title.replace(/\s*[-–]\s*Cinemana.*$/i, "").trim();
}

// ===== كشف نوع المحتوى (مسلسل أو فيلم) =====

function detectContentType() {
  log("بدء كشف نوع المحتوى...");
  
  // ===== المؤشر 1: البحث عن عناصر الحلقات (أقوى مؤشر - 100% مسلسل) =====
  // نبحث عن عناصر DOM فريدة تظهر فقط في صفحات المسلسلات
  
  // البحث عن أي عنصر يحتوي على class يدل على الحلقة
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    const className = (el.className || "").toString().toLowerCase();
    const idName = (el.id || "").toLowerCase();
    
    // التحقق من class أو id يحتوي على كلمة "episode"
    if (className.includes("episode") || idName.includes("episode")) {
      // تجاهل العناصر الصغيرة جداً (قد تكون أخطاء)
      if (el.children.length > 0 || el.textContent.trim().length > 0) {
        log(`تم العثور على عنصر حلقة: ${el.tagName}.${el.className}`);
        return "series";
      }
    }
  }
  
  // ===== المؤشر 2: البحث عن عناصر الموسم (مؤشر قوي - 100% مسلسل) =====
  // نبحث عن عناصر تفاعلية خاصة بالموسم
  for (const el of allElements) {
    const className = (el.className || "").toString().toLowerCase();
    const idName = (el.id || "").toLowerCase();
    
    // التحقق من class أو id يحتوي على كلمة "season"
    if (className.includes("season") || idName.includes("season")) {
      // تجاهل العناصر غير المرتبطة بالعرض
      if (el.tagName === "SELECT" || el.tagName === "BUTTON" || 
          el.tagName === "A" || el.tagName === "LI" ||
          el.children.length > 0) {
        log(`تم العثور على عنصر موسم: ${el.tagName}.${el.className}`);
        return "series";
      }
    }
  }
  
  // ===== المؤشر 3: البحث عن قائمة حلقات (مؤشر قوي) =====
  // نبحث عن عناصر `<ul>` أو `<ol>` تحتوي على حلقات
  const lists = document.querySelectorAll("ul, ol");
  for (const list of lists) {
    const listClass = (list.className || "").toString().toLowerCase();
    if (listClass.includes("episode") || listClass.includes("season")) {
      log(`تم العثور على قائمة حلقات: ${list.tagName}.${list.className}`);
      return "series";
    }
  }
  
  // ===== المؤشر 4: كشف مدة الفيلم (مؤشر قوي - 100% فيلم) =====
  // الأفلام عادة ت显示 مدة بالساعات والدقائق
  // نبحث في النصوص المحيطة بالفيديو فقط
  const video = document.querySelector("video");
  if (video) {
    // البحث في الأب المباشر والأشقاء
    const parent = video.parentElement;
    if (parent) {
      const nearbyText = parent.innerText || "";
      // نمط مدة الفيلم: "1 ساعة 43 دقيقة" أو "43 دقيقة" فقط
      const durationMatch = nearbyText.match(/(\d+\s*ساعة\s*\d+\s*دقيقة|\d+\s*دقيقة)/);
      if (durationMatch) {
        log(`تم العثور على مدة فيلم: ${durationMatch[0]}`);
        return "movie";
      }
    }
  }
  
  // ===== المؤشر 5: البحث عن نص "الموسم" في منطقة محددة فقط =====
  // نبحث فقط في الحاوية التي تحتوي على الفيديو
  if (video) {
    let container = video.parentElement;
    // نصعد 5 مستويات فقط
    for (let i = 0; i < 5 && container && container !== document.body; i++) {
      const containerText = container.innerText || "";
      // نبحث عن "الموسم" متبوعة برقم
      if (/الموسم\s*\d+|Season\s*\d+/i.test(containerText)) {
        log("تم العثور على 'الموسم' في حاوية الفيديو");
        return "series";
      }
      container = container.parentElement;
    }
  }
  
  // ===== الافتراضي: فيلم (أكثر أماناً) =====
  log("لم يتم العثور على مؤشرات المسلسل → فيلم");
  return "movie";
}

// ===== استخراج معلومات الموسم والحلقة =====

// استخراج رقم الموسم (يبحث في أماكن متعددة حسب بنية DOM الموقع)
function findSeasonNumber() {
  // 1. البحث عن الموسم النشط في محدد الموسم (أقوى مؤشر)
  // الموقع يستخدم: <span class="season-number active">1</span>
  const activeSeasonBtn = document.querySelector('.season-number.active');
  if (activeSeasonBtn) {
    const num = activeSeasonBtn.textContent.trim();
    if (/^\d{1,3}$/.test(num)) {
      log(`الموسم من .season-number.active: ${num}`);
      return num;
    }
  }
  
  // 2. البحث في معلومات الحلقة
  // الموقع يستخدم: <span class="episode-info">الموسم 1 | الحلقة 6</span>
  const episodeInfoEl = document.querySelector('.episode-info');
  if (episodeInfoEl) {
    const text = episodeInfoEl.innerText || episodeInfoEl.textContent || "";
    const seasonMatch = text.match(/الموسم\s*(\d{1,3})|Season\s*(\d{1,3})/i);
    if (seasonMatch) {
      const num = seasonMatch[1] || seasonMatch[2];
      log(`الموسم من .episode-info: ${num}`);
      return num;
    }
  }
  
  // 3. البحث في الحلقة النشطة (iswatching)
  const watchingEpisode = document.querySelector('.episode-item.iswatching');
  if (watchingEpisode) {
    // البحث عن معلومات الحلقة داخل العنصر
    const info = watchingEpisode.querySelector('.episode-info, .type, [class*="info"]');
    if (info) {
      const text = info.innerText || info.textContent || "";
      const seasonMatch = text.match(/الموسم\s*(\d{1,3})|Season\s*(\d{1,3})/i);
      if (seasonMatch) {
        return seasonMatch[1] || seasonMatch[2];
      }
    }
  }
  
  // 4. البحث في العنوان (S{n}E{n})
  const titleText = (document.title || "") + " " + (document.querySelector("h1")?.textContent || "");
  let titleMatch = titleText.match(/S(\d{1,3})/i);
  if (titleMatch) {
    return titleMatch[1];
  }
  
  // 5. البحث في حاوية الفيديو (كملاذ أخير)
  const videoContainer = findVideoContainer();
  if (videoContainer) {
    let searchArea = videoContainer;
    for (let i = 0; i < 5 && searchArea.parentElement; i++) {
      searchArea = searchArea.parentElement;
    }
    const containerText = searchArea.innerText || "";
    const seasonMatch = containerText.match(/الموسم\s*(\d{1,3})|Season\s*(\d{1,3})/i);
    if (seasonMatch) {
      return seasonMatch[1] || seasonMatch[2];
    }
  }
  
  return null;
}

// استخراج رقم الحلقة (يبحث في أماكن متعددة حسب بنية DOM الموقع)
function findEpisodeNumber() {
  // 1. البحث في معلومات الحلقة (أقوى مؤشر)
  // الموقع يستخدم: <span class="episode-info">الموسم 1 | الحلقة 6</span>
  const episodeInfoEl = document.querySelector('.episode-info');
  if (episodeInfoEl) {
    const text = episodeInfoEl.innerText || episodeInfoEl.textContent || "";
    const epMatch = text.match(/الحلقة\s*(\d{1,3})|Episode\s*(\d{1,3})/i);
    if (epMatch) {
      const num = epMatch[1] || epMatch[2];
      log(`الحلقة من .episode-info: ${num}`);
      return num;
    }
  }
  
  // 2. البحث عن الحلقة النشطة (iswatching)
  // الموقع يستخدم: <div class="episode-item iswatching">
  const watchingEpisode = document.querySelector('.episode-item.iswatching');
  if (watchingEpisode) {
    // البحث عن معلومات الحلقة داخل العنصر
    const info = watchingEpisode.querySelector('.episode-info, .type, [class*="info"], [class*="title"]');
    if (info) {
      const text = info.innerText || info.textContent || "";
      const epMatch = text.match(/الحلقة\s*(\d{1,3})|Episode\s*(\d{1,3})/i) || text.match(/(\d{1,3})/);
      if (epMatch) {
        const num = epMatch[1] || epMatch[2];
        log(`الحلقة من iswatching: ${num}`);
        return num;
      }
    }
    // بديل: البحث في النص الكامل للعنصر
    const fullText = watchingEpisode.innerText || "";
    const fullMatch = fullText.match(/الحلقة\s*(\d{1,3})|Episode\s*(\d{1,3})/i);
    if (fullMatch) {
      return fullMatch[1] || fullMatch[2];
    }
  }
  
  // 3. البحث في العنوان (...E{n})
  const titleText = (document.title || "") + " " + (document.querySelector("h1")?.textContent || "");
  let titleMatch = titleText.match(/E(\d{1,3})/i);
  if (titleMatch) {
    return titleMatch[1];
  }
  
  // 4. البحث عن أي عنصر حلقة نشط
  const activeSelectors = [
    ".episode-item.active",
    ".episode-item.is-active",
    ".episode-item.current",
    ".episode-item.selected",
    ".keen-slider__slide.item.active",
    ".keen-slider__slide.item.is-active"
  ];
  
  for (const selector of activeSelectors) {
    const activeEl = document.querySelector(selector);
    if (activeEl) {
      const text = activeEl.innerText || "";
      const epMatch = text.match(/الحلقة\s*(\d{1,3})/) || text.match(/(\d{1,3})/);
      if (epMatch) {
        return epMatch[1];
      }
    }
  }
  
  // 5. البحث في حاوية الفيديو
  const videoContainer = findVideoContainer();
  if (videoContainer) {
    let searchArea = videoContainer;
    for (let i = 0; i < 3 && searchArea.parentElement; i++) {
      searchArea = searchArea.parentElement;
    }
    const containerText = searchArea.innerText || "";
    const epMatch = containerText.match(/الحلقة\s*(\d{1,3})/);
    if (epMatch) {
      return epMatch[1];
    }
  }
  
  return null;
}

// الدالة الرئيسية لاستخراج الموسم والحلقة
function findSeasonEpisode() {
  const season = findSeasonNumber();
  const episode = findEpisodeNumber();
  
  log(`الموسم: ${season || 'غير متوفر'}, الحلقة: ${episode || 'غير متوفر'}`);
  
  if (episode) {
    return { season: season, episode: episode };
  }
  
  return null;
}

// بناء العنوان الكامل
function buildFullTitle() {
  const showName = extractShowName();
  const se = findSeasonEpisode();
  
  if (se && se.season && se.episode) {
    return `${showName} - S${se.season}E${se.episode}`;
  } else if (se && se.episode) {
    return `${showName} - الحلقة ${se.episode}`;
  }
  
  return showName;
}

// ===== إنشاء الأزرار =====

function createDownloadButton(type, text, icon) {
  const btn = document.createElement("button");
  btn.className = "cinemana-download-btn";
  btn.setAttribute("data-type", type);
  
  const iconSpan = document.createElement("span");
  iconSpan.className = "btn-icon";
  iconSpan.textContent = icon;
  
  const textSpan = document.createElement("span");
  textSpan.className = "btn-text";
  textSpan.textContent = text;
  
  btn.appendChild(iconSpan);
  btn.appendChild(textSpan);
  
  btn.addEventListener("click", handleDownload);
  return btn;
}

function createDownloadContainer() {
  const container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.className = "cinemana-download-container";
  
  // كشف نوع المحتوى
  const contentType = detectContentType();
  log(`نوع المحتوى: ${contentType}`);
  
  if (contentType === "series") {
    // للمسلسلات: زر تحميل الحلقة + زر تحميل الترجمة
    // الترتيب معكوس بسبب direction: ltr لظهور الحلقة أقصى اليمين
    container.appendChild(createDownloadButton("subtitle", "تحميل الترجمة", "📝"));
    container.appendChild(createDownloadButton("episode", "تحميل الحلقة", "⬇️"));
  } else {
    // للفيلم: زر تحميل الفيلم + زر تحميل الترجمة
    container.appendChild(createDownloadButton("subtitle", "تحميل الترجمة", "📝"));
    container.appendChild(createDownloadButton("movie", "تحميل الفيلم", "🎥"));
  }
  
  return container;
}

// ===== معالجة التحميل =====

// قراءة الإعدادات من chrome.storage
async function loadSettings() {
  const VALID_QUALITIES = ['2k', '1080FHD', '720HD', '420p', '144p'];
  const VALID_SUB_FORMATS = ['srt', 'vtt', 'none'];
  const VALID_VIDEO_FORMATS = ['mp4', 'webm'];
  
  return new Promise((resolve) => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('settings', (result) => {
        const s = result.settings || { quality: '1080FHD', subtitleFormat: 'srt', videoFormat: 'mp4' };
        resolve({
          quality: VALID_QUALITIES.includes(s.quality) ? s.quality : '1080FHD',
          subtitleFormat: VALID_SUB_FORMATS.includes(s.subtitleFormat) ? s.subtitleFormat : 'srt',
          videoFormat: VALID_VIDEO_FORMATS.includes(s.videoFormat) ? s.videoFormat : 'mp4'
        });
      });
    } else {
      resolve({ quality: '1080FHD', subtitleFormat: 'srt', videoFormat: 'mp4' });
    }
  });
}

// ===== دوال جلب بيانات الحلقات من API =====

// استخراج معرف الحلقة الحالية (طرق متعددة)
function extractCurrentEpisodeId() {
  // 1. من URL الصفحة
  const urlMatch = window.location.href.match(/\/(?:video|show|watch|series)\/(?:tv|mv|episode)?\/?(\d+)/i);
  if (urlMatch) {
    log(`معرف الحلقة من URL: ${urlMatch[1]}`);
    return urlMatch[1];
  }
  
  // 2. من data attributes في الصفحة
  const dataEl = document.querySelector('[data-episode-id], [data-id], [data-nb]');
  if (dataEl) {
    const id = dataEl.dataset.episodeId || dataEl.dataset.id || dataEl.dataset.nb;
    if (id) {
      log(`معرف الحلقة من data attribute: ${id}`);
      return id;
    }
  }
  
  // 3. من عناصر Angular/React
  const ngEl = document.querySelector('[_ngcontent-c0], [ng-version]');
  if (ngEl) {
    // البحث في جميع الروابط في الصفحة
    const links = document.querySelectorAll('a[href*="/video/"]');
    for (const link of links) {
      const m = link.href.match(/\/(\d+)(?:\?|$)/);
      if (m) {
        log(`معرف الحلقة من رابط صفحة: ${m[1]}`);
        return m[1];
      }
    }
  }
  
  // 4. من حلقة المشاهدة الحالية
  const watchingEl = document.querySelector('.episode-item.iswatching, .episode-item.active, [class*="watching"]');
  if (watchingEl) {
    const linkEl = watchingEl.querySelector('a[href]');
    if (linkEl) {
      const m = linkEl.href.match(/\/(\d+)/);
      if (m) {
        log(`معرف الحلقة من الحلقة النشطة: ${m[1]}`);
        return m[1];
      }
    }
    // من data attribute
    const nb = watchingEl.dataset.nb || watchingEl.dataset.id || watchingEl.dataset.episodeId;
    if (nb) {
      log(`معرف الحلقة من data attribute للحلقة النشطة: ${nb}`);
      return nb;
    }
  }
  
  // 5. من جميع روابط الحلقات في الشريط الجانبي
  const allEpLinks = document.querySelectorAll('.episode-item a[href], .episodes-list a[href]');
  for (const link of allEpLinks) {
    const m = link.href.match(/\/(\d+)(?:\?|$)/);
    if (m) {
      // تأكد أن هذا ليس رابط فيديو CDN
      if (!link.href.includes('cdn') && !link.href.includes('shabakaty.com/video')) {
        log(`معرف الحلقة من روابط الحلقات: ${m[1]}`);
        return m[1];
      }
    }
  }
  
  // 6. من title الصفحة
  const titleMatch = document.title.match(/\/(\d+)/);
  if (titleMatch) {
    log(`معرف الحلقة من عنوان الصفحة: ${titleMatch[1]}`);
    return titleMatch[1];
  }
  
  // 7. من معرف الحلقة في body class أو id
  const bodyMatch = document.body.className.match(/episode[_-]?(\d+)/i) || document.body.id.match(/episode[_-]?(\d+)/i);
  if (bodyMatch) {
    log(`معرف الحلقة من body: ${bodyMatch[1]}`);
    return bodyMatch[1];
  }
  
  log("لم يتم العثور على معرف الحلقة بأي طريقة");
  return null;
}

// التحقق من صحة معرف الحلقة
function validateEpisodeId(id) {
  return id && /^\d{1,10}$/.test(String(id)) ? id : null;
}

// جلب جميع حلقات المسلسل من API
async function fetchAllEpisodes() {
  try {
    const episodeId = validateEpisodeId(extractCurrentEpisodeId());
    if (!episodeId) {
      log("لم يتم العثور على معرف الحلقة");
      return null;
    }
    
    log(`جلب الحلقات بمعرف: ${episodeId}`);
    
    const response = await chrome.runtime.sendMessage({
      type: "GET_ALL_EPISODES",
      episodeId: episodeId
    });
    
    if (!response || !response.ok) {
      log("خطأ في جلب الحلقات:", response?.error);
      return null;
    }
    
    const data = response.episodes;
    if (!Array.isArray(data)) {
      log("استجابة غير متوقعة من API");
      return [];
    }
    
    const allEpisodes = data;
    log(`تم جلب ${allEpisodes.length} حلقة من API`);
    
    // تصفية الحلقات - نقبل جميع الحلقات التي لها nb (معرف الحلقة)
    // بدون فلتر kind لأن API قد يستخدم أسماء مختلفة
    const episodes = allEpisodes.filter(ep => ep.nb && String(ep.nb).trim() !== '');
    log(`بعد التصفية: ${episodes.length} حلقة`);
    
    return episodes;
  } catch (error) {
    log(`خطأ في جلب الحلقات: ${error.message}`);
    return null;
  }
}

// تجميع الحلقات حسب الموسم
function groupEpisodesBySeason(episodes) {
  const seasons = {};
  episodes.forEach(ep => {
    const s = ep.season || 0;
    if (!seasons[s]) seasons[s] = [];
    seasons[s].push(ep);
  });
  
  // ترتيب الحلقات في كل موسم حسب رقم الحلقة
  for (const s in seasons) {
    seasons[s].sort((a, b) => (a.episodeNummer || 0) - (b.episodeNummer || 0));
  }
  
  return seasons;
}

// جلب روابط فيديو حلقة محددة
async function fetchVideoLinks(nb) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_VIDEO_LINKS",
      nb: nb
    });
    
    if (!response || !response.ok) {
      log(`خطأ في جلب روابط الفيديو لـ ${nb}:`, response?.error);
      return null;
    }
    
    return response.links;
  } catch (error) {
    log(`خطأ في جلب روابط الفيديو لـ ${nb}: ${error.message}`);
    return null;
  }
}

// اختيار أفضل جودة فيديو
function selectBestQuality(links, preferredQuality) {
  if (!links || links.length === 0) return null;
  
  log(`بحث عن الجودة: ${preferredQuality} من ${links.length} خيارات`);
  
  // طباعة جميع الخيارات المتاحة للتشخيص
  links.forEach((l, i) => {
    log(`  ${i}: name=${l.name}, quality=${l.quality}, videoUrl=${l.videoUrl ? 'yes' : 'no'}, url=${l.url ? 'yes' : 'no'}`);
  });
  
  // محاولة العثور على الجودة المفضلة
  const preferred = links.find(l => {
    const name = (l.name || l.quality || '').toLowerCase();
    return name.includes(preferredQuality.toLowerCase());
  });
  
  if (preferred) {
    log(`تم العثور على الجودة المفضلة: ${preferred.name || preferred.quality}`);
    return preferred;
  }
  
  // العثور على أعلى جودة متاحة
  const qualityOrder = ['mp4-1080', 'mp4-720', 'mp4-480', 'mp4-360', '1080', '720', '480', '360'];
  for (const q of qualityOrder) {
    const found = links.find(l => {
      const name = (l.name || l.quality || '').toLowerCase();
      return name.includes(q);
    });
    if (found) {
      log(`تم العثور على جودة بديلة: ${found.name || found.quality}`);
      return found;
    }
  }
  
  // إرجاع أول رابط كخيار أخير
  log(`استخدام أول رابط متاح: ${links[0].name || links[0].quality}`);
  return links[0];
}

// جلب ترجمة حلقة محددة
async function fetchSubtitleLink(nb) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_SUBTITLE_LINK",
      nb: nb
    });
    
    if (!response || !response.ok) {
      log(`خطأ في جلب الترجمة لـ ${nb}:`, response?.error);
      return null;
    }
    
    const translations = response.translations;
    log(`تم جلب ${translations?.length || 0} ترجمة لـ ${nb}`);
    
    if (!translations || translations.length === 0) {
      return null;
    }
    
    // طباعة جميع الترجمات المتاحة للتشخيص
    translations.forEach((t, i) => {
      log(`  ترجمة ${i}: type=${t.type}, name=${t.name}, file=${t.file ? 'yes' : 'no'}`);
    });
    
    // البحث عن الترجمة العربية أولاً، ثم الإنجليزية
    const arabic = translations.find(t => 
      t.type === 'ar' || 
      (t.name && t.name.includes('Arabic')) ||
      (t.name && t.name.includes('عربي'))
    );
    if (arabic) {
      log(`تم العثور على ترجمة عربية: ${arabic.file}`);
      return arabic.file;
    }
    
    const english = translations.find(t => 
      t.type === 'en' || 
      (t.name && t.name.includes('English'))
    );
    if (english) {
      log(`تم العثور على ترجمة إنجليزية: ${english.file}`);
      return english.file;
    }
    
    // إرجاع أول ترجمة متاحة
    log(`استخدام أول ترجمة متاحة: ${translations[0].file}`);
    return translations[0].file;
  } catch (error) {
    log(`خطأ في جلب الترجمة لـ ${nb}: ${error.message}`);
    return null;
  }
}

// تأخير التنفيذ
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== دوال Progress Indicator =====

// إنشاء شريط التقدم
function createProgressBar() {
  // إزالة شريط التقدم القديم إن وُجد
  const oldProgress = document.getElementById('cinemana-progress');
  if (oldProgress) oldProgress.remove();
  
  const container = document.createElement('div');
  container.id = 'cinemana-progress';
  container.className = 'cinemana-progress-container';
  container.innerHTML = `
    <div class="cinemana-progress-header">
      <span class="cinemana-progress-title">جارِ التحميل...</span>
      <button class="cinemana-progress-close" id="cinemana-progress-close">✕</button>
    </div>
    <div class="cinemana-progress-bar">
      <div class="cinemana-progress-fill" style="width: 0%"></div>
    </div>
    <div class="cinemana-progress-text">0/0</div>
    <div class="cinemana-progress-episode"></div>
  `;
  
  // زر الإغلاق
  container.querySelector('#cinemana-progress-close').addEventListener('click', () => {
    container.remove();
  });
  
  return container;
}

// تحديث شريط التقدم
function updateProgress(current, total, episodeName) {
  const fill = document.querySelector('.cinemana-progress-fill');
  const text = document.querySelector('.cinemana-progress-text');
  const episode = document.querySelector('.cinemana-progress-episode');
  
  if (fill) {
    fill.style.width = `${(current / total) * 100}%`;
  }
  if (text) {
    text.textContent = `${current}/${total}`;
  }
  if (episode) {
    episode.textContent = episodeName || '';
  }
}

// تحويل VTT إلى SRT
function vttToSrt(vttContent) {
  let srtContent = vttContent
    .replace(/^WEBVTT.*\n\n/m, '')
    .replace(/^WEBVTT.*\n/m, '');
  
  srtContent = srtContent.replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, '$1,$2');
  srtContent = srtContent.replace(/<[^>]+>/g, '');
  srtContent = srtContent.replace(/\n{3,}/g, '\n\n');
  
  return srtContent.trim();
}

// تحميل مباشر للفيديو باستخدام chrome.downloads (بدون filename لـ IDM)
function downloadVideo(url, filename) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: "DOWNLOAD_FILE",
      url: url,
      filename: filename
    }, (response) => {
      resolve(response);
    });
  });
}

// تحميل الترجمة مع التحويل
async function downloadSubtitle(subUrl, title, format) {
  try {
    try {
      const subHost = new URL(subUrl).hostname;
      if (!subHost.endsWith('shabakaty.com')) {
        showToast("رابط ترجمة غير صالح");
        return false;
      }
    } catch {
      showToast("رابط ترجمة غير صالح");
      return false;
    }
    
    const subResponse = await fetch(subUrl);
    
    const contentLength = parseInt(subResponse.headers.get('content-length'));
    if (contentLength && contentLength > 10 * 1024 * 1024) {
      showToast("ملف الترجمة كبير جداً");
      return false;
    }
    
    const subContent = await subResponse.text();
    
    let finalContent;
    let fileExtension;
    let mimeType;
    
    if (format === 'srt') {
      finalContent = vttToSrt(subContent);
      fileExtension = 'srt';
      mimeType = 'application/x-subrip';
    } else {
      finalContent = subContent;
      fileExtension = 'vtt';
      mimeType = 'text/vtt';
    }
    
    // إنشاء ملف وتحميله
    const blob = new Blob([finalContent], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    
    chrome.runtime.sendMessage({
      type: "DOWNLOAD_FILE",
      url: blobUrl,
      filename: `${sanitizeFileName(title)}.${fileExtension}`
    });
    
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    
    return true;
  } catch (error) {
    log(`خطأ في تحميل الترجمة: ${error.message}`);
    return false;
  }
}

async function handleDownload(type) {
  log(`بدء التحميل: ${type}`);
  
  const settings = await loadSettings();
  log(`الإعدادات: ${JSON.stringify(settings)}`);
  
  switch (type) {
    case "episode":
    case "movie":
      await downloadSingleEpisode(type, settings);
      break;
      
    case "season":
      await downloadSeason(settings);
      break;
      
    case "full":
    case "series":
      await downloadFullSeries(settings);
      break;
      
    case "subtitle":
      await downloadSubtitleOnly(settings);
      break;
      
    default:
      showToast("نوع تحميل غير معروف");
  }
}

// تحميل حلقة واحدة (الحلقة الحالية أو الفيلم)
async function downloadSingleEpisode(type, settings) {
  const title = buildFullTitle();
  log(`العنوان: ${title}`);
  
  showToast(`جارِ تحميل ${type === "movie" ? "الفيلم" : "الحلقة"}: ${title}`);
  
  try {
    // استخدام الروابط الملتقطة من background.js
    const response = await chrome.runtime.sendMessage({
      type: "GET_VIDEO_URL"
    });
    
    if (!response || !response.url) {
      showToast("شغّل الفيديو أولاً ثم اضغط الزر");
      return;
    }
    
    if (!response.url.startsWith('blob:') && !response.url.startsWith('https://')) {
      showToast("رابط فيديو غير صالح");
      return;
    }
    
    const videoUrl = response.url;
    log(`رابط الفيديو: ${videoUrl.substring(0, 60)}...`);
    
    // تحميل الفيديو مع العنوان الكامل
    const videoFilename = `${sanitizeFileName(title)}.mp4`;
    await downloadVideo(videoUrl, videoFilename);
    
    // تحميل الترجمة إذا وُجدت
    const subUrl = response.subs?.ar || response.subs?.en || null;
    if (subUrl && settings.subtitleFormat !== 'none') {
      const subFormat = settings.subtitleFormat || 'srt';
      await downloadSubtitle(subUrl, title, subFormat);
      showToast(`جارِ تحميل الفيديو والترجمة (${subFormat.toUpperCase()}): ${title}`);
    } else {
      showToast(`جارِ تحميل الفيديو: ${title}`);
    }
    
  } catch (error) {
    log(`خطأ في التحميل: ${error.message}`);
    showToast("حدث خطأ أثناء التحميل");
  }
}

// تحميل الترجمة فقط
async function downloadSubtitleOnly(settings) {
  const title = buildFullTitle();
  log(`تحميل الترجمة فقط: ${title}`);
  
  showToast("جارِ جلب الترجمة...");
  
  try {
    // استخدام الروابط الملتقطة من background.js
    const response = await chrome.runtime.sendMessage({
      type: "GET_VIDEO_URL"
    });
    
    const subUrl = response?.subs?.ar || response?.subs?.en || null;
    if (!subUrl) {
      showToast("لم يتم العثور على ترجمة لهذه الحلقة");
      return;
    }
    
    const subFormat = settings.subtitleFormat || 'srt';
    const success = await downloadSubtitle(subUrl, title, subFormat);
    
    if (success) {
      showToast(`تم تحميل الترجمة (${subFormat.toUpperCase()}): ${title}`);
    } else {
      showToast("فشل تحميل الترجمة");
    }
    
  } catch (error) {
    log(`خطأ في تحميل الترجمة: ${error.message}`);
    showToast("حدث خطأ أثناء تحميل الترجمة");
  }
}

// تحميل جميع حلقات الموسم الحالي
async function downloadSeason(settings) {
  showToast("جارِ جلب قائمة الحلقات...");
  
  try {
    // جلب جميع الحلقات
    const episodes = await fetchAllEpisodes();
    if (!episodes || episodes.length === 0) {
      showToast("لم يتم العثور على حلقات");
      return;
    }
    
    // استخراج رقم الموسم الحالي
    const currentSeason = findSeasonNumber();
    if (!currentSeason) {
      showToast("لم يتم التعرف على الموسم الحالي");
      return;
    }
    
    // تصفية حلقات الموسم الحالي
    const seasonEpisodes = episodes.filter(ep => 
      String(ep.season) === String(currentSeason)
    );
    
    if (seasonEpisodes.length === 0) {
      showToast(`لم يتم العثور على حلقات للموسم ${currentSeason}`);
      return;
    }
    
    log(`تحميل ${seasonEpisodes.length} حلقة من الموسم ${currentSeason}`);
    
    // إنشاء شريط التقدم
    const showName = extractShowName();
    const progress = createProgressBar();
    document.body.appendChild(progress);
    
    // تحميل الحلقات واحداً تلو الآخر
    let downloaded = 0;
    for (const episode of seasonEpisodes) {
      const episodeTitle = `${showName} - S${String(currentSeason).padStart(2, '0')}E${String(episode.episodeNummer).padStart(2, '0')}`;
      
      updateProgress(downloaded, seasonEpisodes.length, episodeTitle);
      log(`تحميل الحلقة ${downloaded + 1}/${seasonEpisodes.length}: ${episodeTitle}`);
      
      await downloadEpisode(episode, showName, currentSeason, settings);
      
      downloaded++;
      updateProgress(downloaded, seasonEpisodes.length, "اكتمل");
      
      // تأخير بين التحميلات لتجنب حظر المتصفح
      if (downloaded < seasonEpisodes.length) {
        await delay(1000);
      }
    }
    
    // إزالة شريط التقدم بعد 3 ثوانٍ
    setTimeout(() => {
      progress.remove();
    }, 3000);
    
    showToast(`تم تحميل ${downloaded} حلقة من الموسم ${currentSeason} بنجاح!`);
    
  } catch (error) {
    log(`خطأ في تحميل الموسم: ${error.message}`);
    showToast("حدث خطأ أثناء تحميل الموسم");
  }
}

// تحميل جميع حلقات المسلسل كامل
async function downloadFullSeries(settings) {
  showToast("جارِ جلب قائمة الحلقات...");
  
  try {
    // جلب جميع الحلقات
    const episodes = await fetchAllEpisodes();
    if (!episodes || episodes.length === 0) {
      showToast("لم يتم العثور على حلقات");
      return;
    }
    
    // تجميع الحلقات حسب الموسم
    const seasons = groupEpisodesBySeason(episodes);
    const seasonNumbers = Object.keys(seasons).sort((a, b) => a - b);
    
    log(`تم العثور على ${seasonNumbers.length} موسم بمجموع ${episodes.length} حلقة`);
    
    // إنشاء شريط التقدم
    const showName = extractShowName();
    const progress = createProgressBar();
    document.body.appendChild(progress);
    
    // تحميل الحلقات واحداً تلو الآخر
    let downloaded = 0;
    for (const seasonNum of seasonNumbers) {
      const seasonEpisodes = seasons[seasonNum];
      
      for (const episode of seasonEpisodes) {
        const episodeTitle = `${showName} - S${String(seasonNum).padStart(2, '0')}E${String(episode.episodeNummer).padStart(2, '0')}`;
        
        updateProgress(downloaded, episodes.length, episodeTitle);
        log(`تحميل الحلقة ${downloaded + 1}/${episodes.length}: ${episodeTitle}`);
        
        await downloadEpisode(episode, showName, seasonNum, settings);
        
        downloaded++;
        updateProgress(downloaded, episodes.length, "اكتمل");
        
        // تأخير بين التحميلات
        await delay(1000);
      }
    }
    
    // إزالة شريط التقدم بعد 3 ثوانٍ
    setTimeout(() => {
      progress.remove();
    }, 3000);
    
    showToast(`تم تحميل ${downloaded} حلقة بنجاح!`);
    
  } catch (error) {
    log(`خطأ في تحميل المسلسل: ${error.message}`);
    showToast("حدث خطأ أثناء تحميل المسلسل");
  }
}

// تحميل حلقة واحدة من API
async function downloadEpisode(episode, showName, seasonNum, settings) {
  try {
    // جلب روابط الفيديو
    const videoLinks = await fetchVideoLinks(episode.nb);
    if (!videoLinks || videoLinks.length === 0) {
      log(`لا توجد روابط فيديو للحلقة ${episode.nb}`);
      return;
    }
    
    // اختيار الجودة المفضلة
    const bestLink = selectBestQuality(videoLinks, settings.quality);
    if (!bestLink) {
      log(`لم يتم العثور على جودة مناسبة للحلقة ${episode.nb}`);
      return;
    }
    
    if (!bestLink.videoUrl || (!bestLink.videoUrl.startsWith('blob:') && !bestLink.videoUrl.startsWith('https://'))) {
      log(`رابط فيديو غير صالح للحلقة ${episode.nb}`);
      return;
    }
    
    // بناء اسم الملف
    const episodeTitle = `${showName} - S${String(seasonNum).padStart(2, '0')}E${String(episode.episodeNummer).padStart(2, '0')}`;
    const videoFilename = `${sanitizeFileName(episodeTitle)}.mp4`;
    
    // تحميل الفيديو
    await downloadVideo(bestLink.videoUrl, videoFilename);
    
    // جلب وتحميل الترجمة
    if (settings.subtitleFormat !== 'none') {
      const subUrl = await fetchSubtitleLink(episode.nb);
      if (subUrl) {
        const subFormat = settings.subtitleFormat || 'srt';
        await downloadSubtitle(subUrl, episodeTitle, subFormat);
      }
    }
    
    log(`تم تحميل: ${episodeTitle}`);
    
  } catch (error) {
    log(`خطأ في تحميل الحلقة ${episode.nb}: ${error.message}`);
  }
}

// ===== حقن الأزرار في الصفحة =====

function findVideoContainer() {
  const video = document.querySelector("video");
  if (!video) return null;
  
  // البحث عن حاوية المشغل
  let el = video.parentElement;
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    if (style.position === "relative" || style.position === "absolute") {
      return el;
    }
    el = el.parentElement;
  }
  
  return video.parentElement;
}

function injectDownloadButtons() {
  // التحقق من عدم وجود الحاوية مسبقاً
  if (document.getElementById(CONTAINER_ID)) {
    return;
  }
  
  // التحقق من وجود فيديو فعلي playing أو ready
  const video = document.querySelector("video");
  if (!video) {
    log("لا يوجد عنصر فيديو");
    return;
  }
  
  // التحقق من أن الفيديو محمّل وفعال
  if (!video.src && !video.currentSrc) {
    log("الفيديو غير محمّل بعد");
    return;
  }
  
  // التحقق من أن الفيديو له مدة (يحتوي على محتوى)
  if (!video.duration || isNaN(video.duration) || video.duration === 0) {
    log("الفيديو ليس له مدة بعد");
    return;
  }
  
  const videoContainer = findVideoContainer();
  if (!videoContainer) {
    log("لم يتم العثور على مشغّل الفيديو");
    return;
  }
  
  // التحقق من حجم المشغّل (يجب أن يكون كبيراً بما يكفي)
  const rect = videoContainer.getBoundingClientRect();
  if (rect.width < 300 || rect.height < 200) {
    log("المشغل صغير جداً - على الأرجح ليس صفحة تشغيل كاملة");
    return;
  }
  
  // إنشاء الحاوية وإضافتها بعد المشغّل
  const container = createDownloadContainer();
  
  // البحث عن العنصر الأب المناسب
  let parentContainer = videoContainer.parentElement;
  if (parentContainer) {
    parentContainer.insertBefore(container, videoContainer.nextSibling);
    log("تم حقن أزرار التحميل بنجاح");
  } else {
    videoContainer.appendChild(container);
    log("تم حقن أزرار التحميل داخل المشغّل");
  }
}

// ===== مراقبة تغييرات الصفحة =====

const observer = new MutationObserver(() => {
  injectDownloadButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// محاولة أولى فورية
injectDownloadButtons();

log("تم تهيئة content.js بنجاح");
