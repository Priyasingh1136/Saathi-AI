/**
 * Saathi AI - Add Transaction View
 * Provides entry for transactions both manually and through high-priority voice processing.
 */

import { Storage } from '../storage.js';
import { VoiceController } from '../voice.js';

export const AddTransactionView = {
  currentType: 'expense', // Default view tab: expense
  selectedCategory: 'Fuel', // Default category: Fuel (matches default expense)

  render() {
    const todayStr = new Date().toISOString().split('T')[0];

    const incomeCategories = ['Delivery', 'Ride', 'Freelancing', 'Shop Sales', 'Salary', 'Other'];
    const expenseCategories = ['Fuel', 'Food', 'Recharge', 'Maintenance', 'Rent', 'Shopping', 'Other'];
    const activeCategories = this.currentType === 'income' ? incomeCategories : expenseCategories;

    // Generate pills for categories
    const categoryPillsHTML = activeCategories.map(cat => `
      <div class="category-pill ${cat === this.selectedCategory ? 'selected' : ''}" data-cat="${cat}">
        ${cat}
      </div>
    `).join('');

    return `
      <div class="view-container animate-fade-in">
        <div class="view-header">
          <div class="view-header-title">
            <h1>New Entry</h1>
            <p>Speak or type to add income and expenses.</p>
          </div>
        </div>

        <div class="add-tx-layout">
          <!-- Voice Quick Entry Panel -->
          <div class="card voice-entry-panel animate-slide-up">
            <h3 class="card-title" style="margin-bottom: 0.5rem;"><i class="lucide-mic"></i> Voice Recorder</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.5rem;">Click mic and speak in Hinglish, Hindi, or English</p>
            
            <button id="add-tx-voice-btn" class="voice-mic-main">
              <i class="lucide-mic"></i>
            </button>
            <span id="voice-status-hint" style="font-size:0.85rem; font-weight: 600; color: var(--primary);">Tap to Speak</span>

            <div class="voice-tips">
              <h4>Try saying:</h4>
              <ul>
                <li><i class="lucide-info"></i> "Aaj 850 rupaye kamaye Swiggy se"</li>
                <li><i class="lucide-info"></i> "Spent 250 on petrol"</li>
                <li><i class="lucide-info"></i> "Kal recharge pe 299 kharch kiye"</li>
                <li><i class="lucide-info"></i> "Chai aur nashte pe 60 kharch hue"</li>
              </ul>
            </div>
          </div>

          <!-- Manual Form Panel -->
          <div class="card animate-slide-up" style="animation-delay: 0.1s;">
            <!-- Income/Expense Tabs -->
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; padding: 4px; background-color: var(--bg-base); border-radius: var(--radius-md);">
              <button id="tab-expense" class="btn ${this.currentType === 'expense' ? 'btn-primary' : 'btn-secondary'}" style="flex-grow: 1; padding: 0.5rem 1rem; font-size: 0.85rem;">
                <i class="lucide-trending-down"></i> Expense (खर्च)
              </button>
              <button id="tab-income" class="btn ${this.currentType === 'income' ? 'btn-primary' : 'btn-secondary'}" style="flex-grow: 1; padding: 0.5rem 1rem; font-size: 0.85rem;">
                <i class="lucide-trending-up"></i> Income (कमाई)
              </button>
            </div>

            <form id="tx-manual-form" onsubmit="return false;">
              <!-- Amount -->
              <div class="form-group">
                <label class="form-label" for="tx-amount">Amount (रुपये) *</label>
                <div style="position: relative;">
                  <span style="position: absolute; left: 12px; top:50%; transform:translateY(-50%); font-weight:700; color: var(--text-muted);">₹</span>
                  <input type="number" id="tx-amount" class="form-control" placeholder="0.00" min="0" step="any" required style="padding-left: 28px; font-size:1.25rem; font-weight:700; font-family: var(--font-family-display);">
                </div>
              </div>

              <!-- Categories -->
              <div class="form-group">
                <label class="form-label">Category (श्रेणी) *</label>
                <div class="category-pills" id="category-pills-container">
                  ${categoryPillsHTML}
                </div>
              </div>

              <!-- Description -->
              <div class="form-group">
                <label class="form-label" for="tx-desc">Description (विवरण)</label>
                <input type="text" id="tx-desc" class="form-control" placeholder="e.g. Petrol for bike, Swiggy bonus">
              </div>

              <!-- Date -->
              <div class="form-group">
                <label class="form-label" for="tx-date">Date (तारीख) *</label>
                <input type="date" id="tx-date" class="form-control" value="${todayStr}" required>
              </div>

              <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                <button type="button" id="btn-cancel" class="btn btn-secondary" style="flex: 1;">Clear</button>
                <button type="submit" class="btn btn-primary" style="flex: 1.5;"><i class="lucide-check"></i> Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  init() {
    this.setupTabListeners();
    this.setupCategoryListeners();
    this.setupVoiceListeners();
    this.setupFormSubmit();

    // Clear form button
    document.getElementById('btn-cancel').addEventListener('click', () => {
      document.getElementById('tx-manual-form').reset();
      this.selectedCategory = this.currentType === 'income' ? 'Delivery' : 'Fuel';
      this.refreshCategories();
    });
  },

  setupTabListeners() {
    const tabExpense = document.getElementById('tab-expense');
    const tabIncome = document.getElementById('tab-income');

    tabExpense.addEventListener('click', () => {
      if (this.currentType === 'expense') return;
      this.currentType = 'expense';
      this.selectedCategory = 'Fuel'; // Reset category to Fuel
      this.refreshCategories();
      tabExpense.className = 'btn btn-primary';
      tabIncome.className = 'btn btn-secondary';
      tabExpense.style.flexGrow = '1';
      tabIncome.style.flexGrow = '1';
    });

    tabIncome.addEventListener('click', () => {
      if (this.currentType === 'income') return;
      this.currentType = 'income';
      this.selectedCategory = 'Delivery'; // Reset category to Delivery
      this.refreshCategories();
      tabIncome.className = 'btn btn-primary';
      tabExpense.className = 'btn btn-secondary';
      tabIncome.style.flexGrow = '1';
      tabExpense.style.flexGrow = '1';
    });
  },

  refreshCategories() {
    const container = document.getElementById('category-pills-container');
    if (!container) return;

    const incomeCategories = ['Delivery', 'Ride', 'Freelancing', 'Shop Sales', 'Salary', 'Other'];
    const expenseCategories = ['Fuel', 'Food', 'Recharge', 'Maintenance', 'Rent', 'Shopping', 'Other'];
    const activeCategories = this.currentType === 'income' ? incomeCategories : expenseCategories;

    container.innerHTML = activeCategories.map(cat => `
      <div class="category-pill ${cat === this.selectedCategory ? 'selected' : ''}" data-cat="${cat}">
        ${cat}
      </div>
    `).join('');

    this.setupCategoryListeners();
  },

  setupCategoryListeners() {
    document.querySelectorAll('.category-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        this.selectedCategory = pill.getAttribute('data-cat');
      });
    });
  },

  setupVoiceListeners() {
    const voiceBtn = document.getElementById('add-tx-voice-btn');
    if (!voiceBtn) return;

    voiceBtn.addEventListener('click', () => {
      const settings = Storage.getSettings();
      let languageCode = 'en-IN'; // Default

      if (settings.language === 'hi') languageCode = 'hi-IN';
      else if (settings.language === 'en') languageCode = 'en-IN';
      else {
        // Auto detect fallback, default to hi-IN which does excellent hinglish parsing in Chrome
        languageCode = 'hi-IN';
      }

      window.app.startVoiceInput((result) => {
        // Callback on success transcription
        const parsed = VoiceController.parseCommand(result);
        if (parsed && parsed.amount) {
          // Pre-fill manual form
          this.currentType = parsed.type;
          this.selectedCategory = parsed.category;
          
          this.refreshCategories();

          // Select tabs visually
          const tabExpense = document.getElementById('tab-expense');
          const tabIncome = document.getElementById('tab-income');
          if (parsed.type === 'income') {
            tabIncome.className = 'btn btn-primary';
            tabExpense.className = 'btn btn-secondary';
          } else {
            tabExpense.className = 'btn btn-primary';
            tabIncome.className = 'btn btn-secondary';
          }
          tabExpense.style.flexGrow = '1';
          tabIncome.style.flexGrow = '1';

          // Set fields
          document.getElementById('tx-amount').value = parsed.amount;
          document.getElementById('tx-desc').value = parsed.description;
          document.getElementById('tx-date').value = parsed.date;

          window.app.notify(
            "Speech Extracted",
            `Parsed amount ₹${parsed.amount} as ${parsed.category} ${parsed.type}.`,
            "success"
          );
        } else {
          window.app.notify(
            "Incomplete Command",
            "Could not extract amount or category from your speech. Please write or say again clearly.",
            "warning"
          );
        }
      }, languageCode);
    });
  },

  setupFormSubmit() {
    const form = document.getElementById('tx-manual-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const amount = parseFloat(document.getElementById('tx-amount').value);
      const desc = document.getElementById('tx-desc').value;
      const date = document.getElementById('tx-date').value;

      if (isNaN(amount) || amount <= 0) {
        window.app.notify("Error", "Please enter a valid amount.", "error");
        return;
      }

      const tx = {
        amount,
        category: this.selectedCategory,
        description: desc || this.selectedCategory,
        type: this.currentType,
        date
      };

      await Storage.saveTransaction(tx);
      window.app.notify("Success", "Transaction recorded successfully.", "success");

      // Redirect back to Dashboard
      window.location.hash = '#dashboard';
    });
  }
};
