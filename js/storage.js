/**
 * Saathi AI - Storage Engine
 * Handles all CRUD operations via localStorage for Transactions, Savings Goals, and Settings.
 * Includes a realistic mock data generator for demo purposes.
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'saathi_tx',
  GOALS: 'saathi_goals',
  SETTINGS: 'saathi_settings',
  INITIALIZED: 'saathi_init'
};

const DEFAULT_SETTINGS = {
  language: 'en', // 'en', 'hi', 'auto'
  theme: 'light', // 'light', 'dark'
  notifications: true,
  voiceResponses: true,
  geminiApiKey: ''
};

export const Storage = {
  // Initialize mock data if application is opened for the first time
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      this.saveSettings(DEFAULT_SETTINGS);
      this.populateMockData();
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  },

  // --- SETTINGS ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      console.error("Failed to parse settings", e);
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // --- TRANSACTIONS ---
  getTransactions() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to parse transactions", e);
      return [];
    }
  },

  saveTransaction(tx) {
    const list = this.getTransactions();
    // Add unique ID and timestamp if not present
    const newTx = {
      id: tx.id || 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      amount: parseFloat(tx.amount) || 0,
      category: tx.category || 'Other',
      description: tx.description || '',
      type: tx.type || 'expense', // 'income' or 'expense'
      date: tx.date || new Date().toISOString().split('T')[0]
    };
    list.unshift(newTx); // Insert at the beginning (newest first)
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
    return newTx;
  },

  deleteTransaction(id) {
    let list = this.getTransactions();
    list = list.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
  },

  // --- GOALS ---
  getGoals() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to parse goals", e);
      return [];
    }
  },

  saveGoal(goal) {
    const list = this.getGoals();
    const isEdit = !!goal.id;
    const finalGoal = {
      id: goal.id || 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: goal.name || 'Savings Goal',
      target: parseFloat(goal.target) || 0,
      current: parseFloat(goal.current) || 0,
      targetDate: goal.targetDate || new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0] // 90 days from now default
    };

    if (isEdit) {
      const idx = list.findIndex(item => item.id === goal.id);
      if (idx !== -1) {
        list[idx] = finalGoal;
      } else {
        list.push(finalGoal);
      }
    } else {
      list.push(finalGoal);
    }
    
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(list));
    return finalGoal;
  },

  deleteGoal(id) {
    let list = this.getGoals();
    list = list.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(list));
  },

  // CSV Exporter helper
  exportToCSV() {
    const txList = this.getTransactions();
    if (txList.length === 0) return null;

    const headers = ['ID', 'Date', 'Type', 'Amount (INR)', 'Category', 'Description'];
    const rows = txList.map(tx => [
      tx.id,
      tx.date,
      tx.type.toUpperCase(),
      tx.amount,
      tx.category,
      `"${tx.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    return csvContent;
  },

  // Generates dummy data that behaves cleanly for the demonstration
  populateMockData() {
    const today = new Date();
    const getPastDateStr = (daysAgo) => {
      const d = new Date(today);
      d.setDate(today.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    // Prepopulate 12 transactions detailing a standard delivery partner's or driver's week
    const mockTx = [
      { id: 'tx_1', amount: 850, category: 'Delivery', description: 'Daily payout - Swiggy', type: 'income', date: getPastDateStr(0) },
      { id: 'tx_2', amount: 250, category: 'Fuel', description: 'Petrol for bike', type: 'expense', date: getPastDateStr(0) },
      { id: 'tx_3', amount: 120, category: 'Food', description: 'Lunch at roadside stall', type: 'expense', date: getPastDateStr(0) },
      { id: 'tx_4', amount: 980, category: 'Ride', description: 'Passenger ride fare - Auto cash', type: 'income', date: getPastDateStr(1) },
      { id: 'tx_5', amount: 299, category: 'Recharge', description: 'Jio 1.5GB daily pack', type: 'expense', date: getPastDateStr(1) },
      { id: 'tx_6', amount: 750, category: 'Delivery', description: 'Zomato weekend bonus', type: 'income', date: getPastDateStr(2) },
      { id: 'tx_7', amount: 1500, category: 'Freelancing', description: 'Local market cargo delivery', type: 'income', date: getPastDateStr(3) },
      { id: 'tx_8', amount: 650, category: 'Maintenance', description: 'Engine oil change', type: 'expense', date: getPastDateStr(3) },
      { id: 'tx_9', amount: 1100, category: 'Delivery', description: 'Full day Swiggy orders', type: 'income', date: getPastDateStr(4) },
      { id: 'tx_10', amount: 220, category: 'Food', description: 'Snacks & tea for helper', type: 'expense', date: getPastDateStr(4) },
      { id: 'tx_11', amount: 3500, category: 'Shop Sales', description: 'Sale of spare tires', type: 'income', date: getPastDateStr(5) },
      { id: 'tx_12', amount: 2000, category: 'Rent', description: 'Garage rent payment', type: 'expense', date: getPastDateStr(6) }
    ];

    // Prepopulate 2 goals
    const mockGoals = [
      { id: 'goal_1', name: 'Naya Mobile Phone (New Smartphone)', target: 12000, current: 4800, targetDate: getPastDateStr(-45) }, // 45 days in future
      { id: 'goal_2', name: 'Tyre Replace & Service', target: 5000, current: 3500, targetDate: getPastDateStr(-15) } // 15 days in future
    ];

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(mockTx));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(mockGoals));
  }
};
