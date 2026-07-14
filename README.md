# LivePerson Enhanced Bot Audit Trail

A beautiful, high-fidelity, and secure React web application designed to parse, cascade-filter, and visually inspect Conversation Builder chatbot change histories and audit trails directly from log sheets (CSV/TXT).

---

## 📸 Application Preview

<p align="center">
  <!-- Replace src/demo_screenshot.png with your actual screenshot! -->
  <img src="src/demo_screenshot.png" alt="LivePerson Enhanced Bot Audit Trail UI Dashboard" width="100%" style="border-radius: 12px; border: 1px solid rgba(255, 90, 0, 0.2); box-shadow: 0 10px 40px rgba(0,0,0,0.3);" />
</p>

> 💡 **Tip:** *To display your custom screenshot above, simply name your image file `demo_screenshot.png` and save it under the `src/` directory, or update the image `src` path above!*

---

## ✨ Features

- **📁 Frictionless Log Uploads:** Drag and drop your raw exported log sheets (CSV or standard console TXT outputs) for instant loading.
- **🤖 Automatic Bot Name Extraction:** The parser dynamically extracts the name of the active bot (`parentObjectName`) from log strings and customizes the workspace headers.
- **🎨 Premium Aurora Glassmorphic UI:** High-contrast floating glass cards featuring dynamic, slow-motion background aurora light-fields and glowing hover indicator shadows.
- **🛡️ Secure Client-Side Execution:** Zero database, OAuth logins, or external cloud requests required. All log parsing occurs 100% locally within your secure web browser.
- **📊 Interactive Timeline & Code Diffing:** Clearly visualizes deleted, updated, or created elements with color-coded tags and side-by-side Before and After diff comparisons.
- **🔍 Cascade Slicing Filters:** Instantly slice the parsed trail by specific authors, interaction objects, activity types, or custom keywords.
- **📋 Raw Paste Utility:** Quickly paste a single or multiple raw `AuditEvent` logs directly into the textbox to inspect modifications immediately.
- **📥 Audit Export:** One-click JSON download of all parsed audit logs for persistent record-keeping.

---

## 🚀 Getting Started

### 1. Installation
Install the project dependencies locally:
```bash
npm install
```

### 2. Launch the Web Application
Start the fast local development server:
```bash
npm run dev
```

### 3. Open in Browser
Open **[http://localhost:3000](http://localhost:3000)** in your browser to experience the application!

---

## 📂 Project Structure

```
├── src/
│   ├── components/
│   │   ├── DiffViewer.jsx   # Side-by-side code diffing render
│   │   └── Timeline.jsx     # Renders the audit timeline cards
│   ├── App.jsx              # Main layout & file parsing state
│   ├── App.css              # Glassmorphic and animated aurora design tokens
│   ├── main.jsx             # React entry mount
│   └── lp-logo.png          # Official LivePerson gear asset
├── index.html               # Main page index
├── package.json             # Core dependency registry
└── vite.config.js           # Vite development server settings
```
