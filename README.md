# LivePerson Enhanced Bot Audit Trail

A simple web tool to help you upload and read Conversation Builder bot change history logs in a much cleaner, easier-to-read way. 

---

## 📸 Demo

<!-- Drag and drop your app screenshot here! Name it demo_screenshot.png and place it in the src/ folder -->
![App Screenshot](src/demo_screenshot.png)

---

## Features

- **Upload Logs:** Just drag and drop your exported bot history sheet (CSV or TXT logs) or paste raw log lines directly.
- **Bot Name:** Automatically extracts the bot name from the logs and shows it at the top of your timeline.
- **Visual Diffs:** Shows side-by-side before and after comparisons for modified interaction elements.
- **Quick Filters:** Filter logs easily by author, action (Created, Updated, Deleted), or search by custom keywords.
- **100% Local:** No logins, databases, or credentials required. Everything runs locally inside your browser.

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Run the development server
```bash
npm run dev
```

### 3. Open the app
Go to **[http://localhost:3000](http://localhost:3000)** in your browser!
