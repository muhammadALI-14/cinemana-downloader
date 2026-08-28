<div align="center">

# 🎬 Cinemana Downloader

### Chrome Extension for Downloading Videos & Subtitles from Cinemana

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-yellow)
![Version](https://img.shields.io/badge/Version-1.0-green)

---

</div>

## 📖 Description

**Cinemana Downloader** is a powerful Chrome extension (Manifest V3) that allows you to download videos and subtitles directly from [cinemana.shabakaty.com](https://cinemana.shabakaty.com). It automatically detects whether content is a TV series or movie and provides a seamless downloading experience with customizable quality and format options.

---

## ✨ Features

- 🎥 **Auto-Detection** — Automatically identifies TV series vs. movies
- 📥 **Multiple Video Qualities** — 2K, 1080FHD, 720HD, 420p, 144p
- 📝 **Subtitle Download** — Arabic & English subtitles in SRT or VTT format
- 🔘 **Inline Download Buttons** — Download buttons appear directly below the video player
- ⚙️ **Settings Panel** — Popup-based configuration for quality, subtitle format, and video format
- 📁 **Smart Filenames** — Auto-generates filenames like `ShowName - S01E06.mp4`
- 📊 **Batch Progress** — Progress indicator for downloading multiple episodes
- 📦 **Flexible Downloads** — Download single episode, full season, or entire series
- 🔒 **Secure** — URL validation, filename sanitization, and download deduplication
- 🌐 **Site-Specific** — Works exclusively on cinemana.shabakaty.com

---

## 🛠️ Installation

### Method: Load Unpacked (Developer Mode)

1. **Download** or **clone** this repository to your local machine
2. Open **Google Chrome** and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **"Load unpacked"**
5. Select the `cinemana-downloader` folder
6. The extension icon will appear in your Chrome toolbar

```
📁 cinemana-downloader/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── styles.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 📖 Usage

1. Navigate to a video page on [cinemana.shabakaty.com](https://cinemana.shabakaty.com)
2. **Download buttons** will appear automatically below the video player
3. Click the **Download** button for the desired quality
4. For subtitles, select your preferred language and format
5. Use the **extension popup** to configure default settings

### Batch Downloads

- For TV series, click **"Download Season"** or **"Download Series"**
- A progress indicator will show the status of all downloads
- Files are saved with proper naming conventions automatically

---

## ⚙️ Settings

Access settings through the extension popup (click the extension icon):

| Setting | Options | Description |
|---------|---------|-------------|
| **Video Quality** | 2K, 1080FHD, 720HD, 420p, 144p | Default download quality |
| **Subtitle Language** | Arabic, English, Both | Preferred subtitle language |
| **Subtitle Format** | SRT, VTT | Subtitle file format |
| **Video Format** | MP4, WebM | Video container format |
| **Auto-Download** | On/Off | Automatically start downloads |

---

## 🔧 Technical Details

- **Manifest Version:** V3 (Service Worker based)
- **Permissions:** `activeTab`, `storage`, `downloads`
- **Content Scripts:** Injected on `cinemana.shabakaty.com` pages
- **Background:** Service Worker for handling download logic
- **Security Features:**
  - URL validation ensures extension only operates on the target domain
  - Filename sanitization prevents path traversal and invalid characters
  - Download deduplication prevents duplicate file downloads

### File Structure

```
cinemana-downloader/
├── manifest.json        # Extension manifest (V3)
├── background.js        # Service worker for download management
├── content.js           # Content script for DOM interaction
├── popup.html           # Settings popup UI
├── popup.js             # Popup logic and settings management
├── styles.css           # Content script styling
└── icons/               # Extension icons
```

---

## 📋 Permissions

| Permission | Reason |
|------------|--------|
| `activeTab` | Access the current tab to detect video content |
| `storage` | Save user preferences and settings |
| `downloads` | Initiate and manage file downloads |
| Host Permission | Only `cinemana.shabakaty.com` |

---

## ⚠️ Disclaimer

This extension is provided **as-is** for educational purposes. Users are responsible for complying with all applicable laws and terms of service. The developers are not responsible for misuse of this software.

---

## 📄 License

MIT License — Feel free to modify and distribute.

---

<div align="center">

---

# 🎬 سينمانا داونلودر

### إضافة كروم لتحميل الفيديو والترجمة من سينمانا

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-yellow)
![Version](https://img.shields.io/badge/Version-1.0-green)

---

</div>

## 📖 الوصف

**سينمانا داونلودر** هي إضافة قوية لمتصفح كروم (الإصدار الثالث) تتيح لك تحميل الفيديو والترجمة مباشرة من [cinemana.shabakaty.com](https://cinemana.shabakaty.com). تكشف تلقائيًا عما إذا كان المحتوى مسلسلًا أو فيلمًا وتوفر تجربة تحميل سلسة مع خيارات مخصصة للجودة والصيغة.

---

## ✨ المميزات

- 🎥 **كشف تلقائي** — تحديد تلقائي بين المسلسلات والأفلام
- 📥 **جودات متعددة** — 2K، 1080FHD، 720HD، 420p، 144p
- 📝 **تحميل الترجمة** — ترجمة عربية وإنجليزية بصيغة SRT أو VTT
- 🔘 **أزرار تحميل مباشرة** — تظهر أزرار التحميل أسفل مشغل الفيديو مباشرة
- ⚙️ **لوحة الإعدادات** — تكوين من النافذة المنبثقة للجودة وصيغة الترجمة وصيغة الفيديو
- 📁 **أسماء ملفات ذكية** — توليد تلقائي لأسماء الملفات مثل `ShowName - S01E06.mp4`
- 📊 **تقدم التحميل** — مؤشر التقدم لتحميل عدة حلقات في نفس الوقت
- 📦 **تحميل مرن** — تحميل حلقة واحدة، موسم كامل، أو المسلسل بالكامل
- 🔒 **آمن** — التحقق من الروابط وتطهير أسماء الملفات ومنع التحميل المكرر
- 🌐 **محدد للموقع** — يعمل حصريًا على cinemana.shabakaty.com

---

## 🛠️ طريقة التثبيت

### الطريقة: تحميل غير مُجمّع (وضع المطور)

1. **حمّل** أو **استنسخ** هذا المستودع على جهازك المحلي
2. افتح **Google Chrome** وانتقل إلى `chrome://extensions/`
3. فعّل **وضع المطور** (الزر في الزاوية العلوية اليمنى)
4. اضغط **"Load unpacked"** (تحميل غير مُجمّع)
5. اختر مجلد `cinemana-downloader`
6. سيظهر أيقونة الإضافة في شريط أدوات كروم

```
📁 cinemana-downloader/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── styles.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 📖 طريقة الاستخدام

1. انتقل إلى صفحة فيديو على [cinemana.shabakaty.com](https://cinemana.shabakaty.com)
2. ستظهر **أزرار التحميل** تلقائيًا أسفل مشغل الفيديو
3. اضغط على زر **التحميل** للجودة المطلوبة
4. للترجمة، اختر اللغة والصيغة المفضلة لديك
5. استخدم **النافذة المنبثقة للإضافة** لتكوين الإعدادات الافتراضية

### تحميل مجموعة حلقات

- للمسلسلات، اضغط **"تحميل الموسم"** أو **"تحميل المسلسل"**
- سيظهر مؤشر التقدم لحالة جميع التحميلات
- يتم حفظ الملفات بأسماء مناسبة تلقائيًا

---

## ⚙️ الإعدادات

الوصول للإعدادات من خلال النافذة المنبثقة (اضغط على أيقونة الإضافة):

| الإعداد | الخيارات | الوصف |
|---------|----------|-------|
| **جودة الفيديو** | 2K، 1080FHD، 720HD، 420p، 144p | جودة التحميل الافتراضية |
| **لغة الترجمة** | عربية، إنجليزية، كلاهما | لغة الترجمة المفضلة |
| **صيغة الترجمة** | SRT، VTT | صيغة ملف الترجمة |
| **صيغة الفيديو** | MP4، WebM | حاوية الفيديو |
| **التحميل التلقائي** | تشغيل/إيقاف | بدء التحميل تلقائيًا |

---

## 🔧 التفاصيل التقنية

- **إصدار المُ澄ِّف:** الثالث (مبني على Service Worker)
- **الصلاحيات:** `activeTab`، `storage`، `downloads`
- **سكربتات المحتوى:** تُحقَّن على صفحات `cinemana.shabakaty.com`
- **الخلفية:** Service Worker لإدارة عمليات التحميل
- **مميزات الأمان:**
  - التحقق من الروابط يضمن عمل الإضافة على النطاق المستهدف فقط
  - تطهير أسماء الملفات يمنع تجاوز المسار والأحرف غير الصالحة
  - منع التحميل المكرر لتجنب تنزيل ملفات مكررة

### هيكل الملفات

```
cinemana-downloader/
├── manifest.json        # مُ澄ِّف الإضافة (الإصدار الثالث)
├── background.js        # خدمة الخلفية لإدارة التحميل
├── content.js           # سكربت المحتوى للتفاعل مع DOM
├── popup.html           # واجهة النافذة المنبثقة للإعدادات
├── popup.js             # منطق النافذة وإدارة الإعدادات
├── styles.css           # تنسيق سكربت المحتوى
└── icons/               # أيقونات الإضافة
```

---

## 📋 الصلاحيات

| الصلاحيات | السبب |
|-----------|-------|
| `activeTab` | الوصول للعلامة النشطة لاكتشاف محتوى الفيديو |
| `storage` | حفظ تفضيلات المستخدم والإعدادات |
| `downloads` | بدء وإدارة تحميلات الملفات |
| صلاحية المضيف | `cinemana.shabakaty.com` فقط |

---

## ⚠️ إخلاء مسؤولية

يتم تقديم هذه الإضافة **كما هي** لأغراض تعليمية. يتحمل المستخدمون المسؤولية عن الامتثال لجميع القوانين وشروط الخدمة المعمول بها. لا يتحمل المطورون المسؤولية عن سوء استخدام هذا البرنامج.

---

## 📄 الترخيص

ترخيص MIT — لا تتردد في التعديل والتوزيع.

---

<div align="center">

**⭐ Don't forget to star this repo if you find it useful!**

**⭐ لا تنسَ التقييم إذا وجدت الإضافة مفيدة!**

</div>
