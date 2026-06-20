# BigQuery Release Notes Hub

An interactive, responsive web application that fetches, parses, and displays Google Cloud BigQuery release notes from their official feed. The application allows users to filter, search, and visually theme updates, as well as select specific release notes to customize and share on Twitter / X via a built-in drawer composer.

---

## ✨ Features

- **Live Atom XML Feed Parsing**: Automatically pulls, parses, and normalizes release updates from the official Google Cloud feed.
- **Granular Category Breakdown**: Dissects daily updates into separate cards, categorized dynamically as *Feature*, *Announcement*, *Deprecation*, *Issue*, or *General Update*.
- **Interactive Stats Dashboard**: Displays metrics for each category; clicking on a metric filters the feed instantly.
- **Dynamic Search & Filtering**: Provides real-time, debounced search across dates, categories, titles, and body text.
- **Bottom-Sheet Tweet Composer**: Click to select any update, review it in a slide-up drawer, toggle quick tags (`#BigQuery`, `#GCP`), and open it directly in the Twitter Web Intent editor (fully validating the 280-character limit).
- **Modern Glassmorphic UI**: High-fidelity dark mode by default with a polished light mode toggle. Includes responsive loaders, skeletons, and toast alerts.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.13+, Flask, `requests`, `feedparser` (Atom/RSS parsing), `beautifulsoup4` (HTML extraction).
- **Frontend**: HTML5, Vanilla CSS (Custom properties & grid systems), Vanilla JavaScript (State-driven DOM, Event handling, Twitter integration).
- **Assets**: Google Fonts (Inter & Plus Jakarta Sans), Lucide Icons (translucent SVG icons).

---

## 🚀 Getting Started

### Prerequisites

Ensure you have Python 3.13 or newer installed.

### Installation

1. Clone or download the repository to your local workspace.
2. Open your terminal in the project directory.
3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

1. Start the Flask local development server:
   ```bash
   python app.py
   ```
2. Open your web browser and navigate to:
   ```url
   http://127.0.0.1:5000
   ```

---

## 📂 Project Structure

```text
bq-release-notes/
│
├── app.py                 # Flask server & XML parsing engine
├── requirements.txt       # Python dependencies
├── .gitignore             # Git ignore file configurations
├── README.md              # Project documentation
│
├── templates/
│   └── index.html         # Main page template (responsive markup, stats counters, tweet drawer)
│
└── static/
    ├── app.js             # Client state management, search, filters, and composer logic
    └── style.css          # Theme system stylesheet, animations, and layouts
```

---

## 📝 Details on the Parsing Engine

Google Cloud publishes release notes in an Atom XML format where multiple changes for a single day are grouped within a single entry block. 

Our custom parser inside `app.py` traverses each entry with `BeautifulSoup`, matching category headings (`<h3>` tags) and gathering subsequent sibling nodes until the next heading. This ensures that every individual feature or issue is treated as its own card rather than a wall of text, allowing users to select and share specific updates.
