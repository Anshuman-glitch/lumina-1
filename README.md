# ✨ Lumina • Spatial Notes & Calendar

An ultra-modern, client-side **Spatial Notes & Calendar Application** built with pure **HTML5, CSS3, and JavaScript**. Designed with an elegant **Yellow & White Luminous Spatial UI**, multi-depth glass cards, 3D tilt micro-interactions, rich media attachments (pictures & videos), zero-backend date link sharing, and an immersive distraction-free **Focus Mode**.

---

## 🌟 Key Features

### 1. 🎨 Yellow & White Spatial UI
- **Spatial Aesthetics**: VisionOS-inspired floating glass panels (`backdrop-filter: blur(24px)`), soft golden sunshine lighting (`#F59E0B`, `#FBBF24`, `#FEF08A`, `#FEF9C3`), and clean crystal-white canvas (`#FFFFFF`).
- **3D Card Physics**: Spatial note cards respond dynamically with subtle perspective 3D tilt as the cursor hovers across them.
- **Floating Spatial Docks**: Sleek glass navigation pill bars with responsive controls.

### 2. 📅 Interactive Calendar & Date Association
- **Mini Calendar & Full Calendar**: Integrated month calendar with quick jump to today and previous/next month navigation.
- **Date Filtering**: Click any calendar day to instantly filter notes written on that day.
- **Calendar Note Badges**: Days with notes are marked with glowing amber dots and hover titles.
- **Date Association**: Every note is linked to a date (defaults to today or selected date).

### 3. 🖼️ Pictures Applying Options
- **Computer Upload**: Select multiple image files (`.png`, `.jpg`, `.webp`, `.gif`, `.svg`).
- **Direct Clipboard Paste**: Press `Ctrl+V` anywhere in the note editor to instantly attach screenshots and images!
- **Drag & Drop**: Drag images directly into the editor dropzone.
- **Image URL**: Attach images via web links.
- **Gallery & Lightbox**: Responsive 1/2/3+ image thumbnail grids in note cards and click-to-zoom Lightbox modal.

### 4. 🎬 Videos Applying Options
- **Local Video Files**: Upload `.mp4`, `.webm`, or `.mov` video files.
- **YouTube & Video Links**: Paste YouTube URLs (`watch?v=...` or `youtu.be/...`) or direct MP4 video URLs for instant embedded playback.
- **Responsive Video Player**: Smooth 16:9 player container directly inside the note cards.

### 5. 🔗 Date Sharing as Links (Zero Backend Required)
- **Instant Client-Side Links**: Click **"Share Date Link"** or **"Share Note Link"** to generate a link containing all notes for that date encoded directly into the URL fragment (`#share=...`).
- **No Server / No Database Needed**: Anyone opening the link will instantly see a spatial banner with the shared notes and can click **"Save to My Notes"** with 1 click!
- **Real-time QR Code**: Generates an instant high-resolution QR code on a `<canvas>` for mobile camera scanning.
- **1-Click Copy & Native Web Share**: Copy link to clipboard or open your device's native share menu.

### 6. 🧘 Immersive Focus Mode
- **Empty Background Video Slot**: The `<video id="focus-bg-video">` slot is intentionally left empty as requested. When you're ready, click **⚙️ Video Settings** to upload a local video or paste a video URL, or leave it empty to enjoy the procedural ambient canvas!
- **4 Preset Ambient Scenes**:
  1. 🏙️ **Cyber City**: Futuristic neon skyline with rain, glowing amber/cyan tower windows, and perspective grid.
  2. 🏡 **Village Setting**: Warm golden-hour sunset, rolling hills silhouette, and drifting glowing fireflies.
  3. 🌧️ **Raining Night**: Cozy midnight glass reflections, animated running raindrops, and warm streetlamp glow.
  4. 🏢 **Skyscraper Window**: High-rise penthouse window overlooking twinkling stars and moving city light trails.
- **Transparent Floating Timer Pod**: Completely unobstructed spatial view of your video and ambient scene with a glowing, transparent glass timer pod displaying the running time, live clock, and quick duration presets (25m, 50m, 5m, 15m).
- **Built-in Offline Ambient Sound Synthesizer**: Uses native Web Audio API to generate relaxing rain, wind breeze, and ambient focus hums without needing any external audio files.

---

## 🚀 How to Run

### Method 1: Double-Click Launch (Fastest)
Double-click **`run_notes.bat`** or double-click **`index.html`** in this folder. It will immediately open in Google Chrome, Microsoft Edge, Brave, or Firefox.

### Method 2: Local HTTP Server (Python)
If you prefer running with a local web server:
```bash
python -m http.server 8080
```
Then visit: [http://localhost:8080](http://localhost:8080)

---

## 🔒 100% Client-Side & Private
All notes, pictures, and video attachments are stored inside your browser's persistent **IndexedDB**, guaranteeing zero data leaves your machine unless you share a link.
