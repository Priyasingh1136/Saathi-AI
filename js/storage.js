/**
 * Saathi AI - Storage Engine (IndexedDB Migration)
 * Manages asynchronous CRUD operations for Transactions and Savings Goals using IndexedDB.
 * Settings preferences continue using synchronous localStorage to prevent theme startup flickers.
 */

const STORAGE_KEYS = {
  SETTINGS: 'saathi_settings',
  INITIALIZED: 'saathi_init'
};

const DEFAULT_SETTINGS = {
  language: 'en', // 'en', 'hi', 'auto'
  theme: 'light', // 'light', 'dark'
  notifications: true,
  voiceResponses: true,
  geminiApiKey: '',
  themeColor: '#2563EB'
};

const DB_NAME = 'SaathiAIDB';
const DB_VERSION = 1;

export const Storage = {
  db: null,

  // Initialize DB and populate mock data if application is opened for the first time
  async init() {
    await this.initDB();
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      this.saveSettings(DEFAULT_SETTINGS);
      await this.populateMockData();
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  },

  // Initialize IndexedDB schema
  initDB() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        return resolve(this.db);
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (e) => {
        console.error("IndexedDB failed to open:", e.target.error);
        reject(e.target.error);
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        // Create transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions', { keyPath: 'id' });
        }
        // Create goals store
        if (!db.objectStoreNames.contains('goals')) {
          db.createObjectStore('goals', { keyPath: 'id' });
        }
      };
    });
  },

  // --- SETTINGS (localStorage - Synchronous) ---
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

  // --- TRANSACTIONS (IndexedDB - Asynchronous) ---
  async getTransactions() {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['transactions'], 'readonly');
      const store = transaction.objectStore('transactions');
      const request = store.getAll();

      request.onerror = (e) => reject(e.target.error);
      request.onsuccess = () => {
        const list = request.result || [];
        // Sort descending: Newest transactions first (by date, fallback to ID)
        list.sort((a, b) => {
          const dateCompare = new Date(b.date) - new Date(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.id.localeCompare(a.id);
        });
        resolve(list);
      };
    });
  },

  async saveTransaction(tx) {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['transactions'], 'readwrite');
      const store = transaction.objectStore('transactions');

      const newTx = {
        id: tx.id || 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        amount: parseFloat(tx.amount) || 0,
        category: tx.category || 'Other',
        description: tx.description || '',
        type: tx.type || 'expense', // 'income' or 'expense'
        date: tx.date || new Date().toISOString().split('T')[0]
      };

      const request = store.put(newTx);
      
      transaction.oncomplete = () => resolve(newTx);
      transaction.onerror = (e) => reject(e.target.error);
    });
  },

  async deleteTransaction(id) {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['transactions'], 'readwrite');
      const store = transaction.objectStore('transactions');
      const request = store.delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
    });
  },

  async getEarningStreak() {
    const list = await this.getTransactions();
    const incomeDates = list
      .filter(tx => tx.type === 'income')
      .map(tx => tx.date);

    if (incomeDates.length === 0) return 0;

    const uniqueDates = new Set(incomeDates);
    const todayStr = new Date().toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let startDate = null;
    if (uniqueDates.has(todayStr)) {
      startDate = new Date();
    } else if (uniqueDates.has(yesterdayStr)) {
      startDate = yesterday;
    } else {
      return 0; // Streak broken
    }

    let streak = 0;
    let checkDate = new Date(startDate.getTime());

    while (true) {
      const checkStr = checkDate.toISOString().split('T')[0];
      if (uniqueDates.has(checkStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  },

  // --- GOALS (IndexedDB - Asynchronous) ---
  async getGoals() {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['goals'], 'readonly');
      const store = transaction.objectStore('goals');
      const request = store.getAll();

      request.onerror = (e) => reject(e.target.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  },

  async saveGoal(goal) {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['goals'], 'readwrite');
      const store = transaction.objectStore('goals');

      const finalGoal = {
        id: goal.id || 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: goal.name || 'Savings Goal',
        target: parseFloat(goal.target) || 0,
        current: parseFloat(goal.current) || 0,
        targetDate: goal.targetDate || new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0]
      };

      const request = store.put(finalGoal);

      transaction.oncomplete = () => resolve(finalGoal);
      transaction.onerror = (e) => reject(e.target.error);
    });
  },

  async deleteGoal(id) {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['goals'], 'readwrite');
      const store = transaction.objectStore('goals');
      const request = store.delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
    });
  },

  async exportToCSV() {
    const txList = await this.getTransactions();
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

    return [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  },

  // Populate dynamic mock values inside IndexedDB on first load
  async populateMockData() {
    const today = new Date();
    const getPastDateStr = (daysAgo) => {
      const d = new Date(today);
      d.setDate(today.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

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

    const mockGoals = [
      { id: 'goal_1', name: 'Naya Mobile Phone (New Smartphone)', target: 12000, current: 4800, targetDate: getPastDateStr(-45) },
      { id: 'goal_2', name: 'Tyre Replace & Service', target: 5000, current: 3500, targetDate: getPastDateStr(-15) }
    ];

    // Write mocks async
    await this.initDB();
    
    // Transactions
    const txTransaction = this.db.transaction(['transactions'], 'readwrite');
    const txStore = txTransaction.objectStore('transactions');
    mockTx.forEach(t => txStore.put(t));

    // Goals
    const goalTransaction = this.db.transaction(['goals'], 'readwrite');
    const goalStore = goalTransaction.objectStore('goals');
    mockGoals.forEach(g => goalStore.put(g));

    return new Promise((resolve) => {
      // Resolve once transactions commit
      let count = 0;
      const done = () => {
        count++;
        if (count === 2) resolve();
      };
      txTransaction.oncomplete = done;
      goalTransaction.oncomplete = done;
    });
  }
};
