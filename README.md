# Saathi AI – Your Voice-First Financial Companion

Saathi AI is a modern, responsive Single Page Application (SPA) designed to empower India's informal workforce (delivery partners, auto-rickshaw drivers, street vendors, and domestic workers) to manage their finances. Built with a voice-first design philosophy, Saathi AI allows users to log transactions, track goals, and query an intelligent assistant using English, Hindi, and Hinglish.

---

## 🌟 Key Features

1. **Multilingual Voice-First Input**
   - Natural speech parsing in **English**, **Hindi (हिन्दी)**, and **Hinglish** (e.g. *"Aaj delivery se 800 rupaye kamaye"*, *"Spent 250 on fuel"*).
   - Instant transaction form extraction with zero manual typing required.
   - Fallback options for voice-to-text previewing and manual form overrides.

2. **AI Financial Assistant (Saathi AI)**
   - Conversational floating assistant designed to respond to voice queries.
   - Built to support direct **Gemini API** integration or perform local intelligent, context-aware rule-based parsing.

3. **Dynamic Interactive Charts**
   - Clean data visualizations of weekly cash flows (Income vs Expense) and categories (e.g. Fuel, Food, Shopping).
   - Automatic updating as transactions are added or deleted.

4. **Savings Goals & Insights**
   - Create, edit, and track savings goals with visual progress bars.
   - AI-powered financial patterns generated dynamically (e.g. *"Fuel accounts for 28% of this week's spending"*).

5. **100% Offline & Lightweight**
   - Stores all data in `localStorage`.
   - Zero framework dependencies (no React/Node/NPM required). Runs directly in any web browser.

---

## 📁 Project Structure

```text
saathi-ai/
│
├── assets/
│   ├── icons/
│   ├── screenshots/
│   └── logo/
│
├── css/
│   ├── index.css          # Design system & CSS variables
│   ├── components.css     # Buttons, Cards, Assistant dialog styles
│   └── views.css          # Views/Page-specific grid & styles
│
├── js/
│   ├── app.js             # SPA Router & Core lifecycle
│   ├── storage.js         # LocalStorage wrappers & mock data
│   ├── voice.js           # Web Speech API & Hinglish/Hindi command parser
│   ├── assistant.js       # AI Assistant logic (Local Fallback & Gemini API)
│   └── views/
│       ├── dashboard.js   # Dashboard metrics, transactions list, charts
│       ├── add_tx.js      # Add Transaction View (manual + voice speech input)
│       ├── insights.js    # Rule-based dynamic insights panel
│       ├── goals.js       # Savings goals layout & management modal
│       └── history.js     # Transaction lists with searching & filtering
│
├── index.html             # App entry, CDN links
├── README.md
└── LICENSE
```

---

## 🚀 How to Run

1. Clone or download this repository.
2. Open `index.html` directly in any browser (Google Chrome is recommended for standard Web Speech API / microphone access).
3. (Optional) In the Settings tab, enter your **Gemini API Key** to enable rich, live financial advisor conversations.
