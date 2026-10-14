# 🥛 Smart Doodh Hisaab

Dairy/Doodh ka smart hisaab — Customer, Daily Milk Entry, Bill, Kharcha sab ek jagah!

**100% Offline** | **Mobile-First** | **Android APK Ready** | **WhatsApp Bill** | **Hinglish UI**

---

## 📱 Features

| Feature | Description |
|---|---|
| 🏠 **Dashboard** | Aaj ka Doodh, Mahine ki Bikri, Kharcha, Asli Munafa, Kul Baaki Udhaar |
| 📝 **Aaj ki Entry** | 1-tap daily roznamcha — Gaya/Nagha/+/- buttons, Mark All Delivered |
| 👥 **Grahak Management** | Customer CRUD — Naam, Mobile, Shift, Cow/Buffalo, Rate, Default Litre |
| 💰 **Kharcha Tracker** | Expense categories: Chara, Dawai, Petrol, Helper, Other |
| 📊 **Bill & Hisaab** | Full ledger, WhatsApp Bill, Print/PDF, Payment tracking |
| 📦 **Backup & Restore** | JSON/CSV backup download, Restore from file |

## 🚀 Quick Start (Browser)

```bash
# Koi bhi static server se chalao
npx serve .
# ya
python3 -m http.server 8080
```

Browser mein kholo: `http://localhost:8080`

## 📱 Android APK Build (GitHub Actions)

**Aapke laptop par Android Studio ya Java install karne ki zaroorat NAHI hai!**

### Steps:
1. GitHub par naya repository banao
2. Ye code push karo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Smart Doodh Hisaab"
   git remote add origin https://github.com/YOUR_USERNAME/smart-doodh-hisaab.git
   git branch -M main
   git push -u origin main
   ```
3. GitHub par **Actions** tab mein jaao → Build automatically shuru ho jayega!
4. Build complete hone par **Artifacts** section se `Smart-Doodh-Hisaab-APK` download karo
5. ZIP se APK nikal kar phone mein install karo ✅

### Manual Trigger:
GitHub Actions tab → "Build Android APK" → "Run workflow" → "Run workflow" button

## 🏗️ Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no framework — fast & lightweight)
- **Storage:** IndexedDB (offline, permanent, survives app close)
- **Native:** Capacitor.js 6 (Web → Android bridge)
- **Build:** GitHub Actions + Gradle (cloud build — no local setup needed)
- **UI:** Material Design inspired, Mobile-first, Hinglish labels

## 📂 Project Structure

```
smart-doodh-hisaab/
├── index.html              # Main app shell
├── css/style.css           # Mobile-first Android-like UI
├── js/app.js               # Complete app logic + IndexedDB + Capacitor
├── capacitor.config.json   # Capacitor native config
├── package.json            # NPM deps (Capacitor)
├── manifest.json           # PWA manifest
├── .gitignore
├── .github/
│   └── workflows/
│       └── build-apk.yml   # Cloud APK builder
└── README.md
```

## 📄 License

MIT — Free to use, modify, and distribute.

---

*Made with ❤️ for Indian Dairy Farmers*
