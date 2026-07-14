/**
 * Saathi AI - Transaction History View
 * Renders list of all transactions with robust searching, filtering by type/category,
 * deletion capability, and CSV/PDF export shortcuts.
 */

import { Storage } from '../storage.js';

export const HistoryView = {
  currentFilter: 'all', // 'all', 'income', 'expense'
  searchQuery: '',
  selectedCategory: 'all',

  render() {
    const txList = Storage.getTransactions();
    
    // Get unique categories for dropdown filter
    const categoriesSet = new Set(txList.map(t => t.category));
    const categoriesArray = Array.from(categoriesSet);
    const categoryOptionsHTML = categoriesArray.map(cat => `
      <option value="${cat}" ${this.selectedCategory === cat ? 'selected' : ''}>${cat}</option>
    `).join('');

    // Filter transactions based on type, search query, and category
    const filteredTxs = txList.filter(tx => {
      // Type filter
      if (this.currentFilter !== 'all' && tx.type !== this.currentFilter) {
        return false;
      }
      
      // Category filter
      if (this.selectedCategory !== 'all' && tx.category !== this.selectedCategory) {
        return false;
      }

      // Search Query filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(query);
        const catMatch = (tx.category || '').toLowerCase().includes(query);
        const amtMatch = tx.amount.toString().includes(query);
        if (!descMatch && !catMatch && !amtMatch) {
          return false;
        }
      }

      return true;
    });

    // Generate list items HTML
    let itemsHTML = '';
    if (filteredTxs.length > 0) {
      itemsHTML = filteredTxs.map(tx => {
        const dateStr = new Date(tx.date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const iconClass = this.getCategoryIconClass(tx.category);
        return `
          <div class="transaction-item ${tx.type}">
            <div class="tx-icon-details">
              <div class="tx-category-icon">
                <i class="${iconClass}"></i>
              </div>
              <div class="tx-info">
                <span class="tx-description">${tx.description || tx.category}</span>
                <div class="tx-meta">
                  <span>${tx.category}</span>
                  <span>•</span>
                  <span>${dateStr}</span>
                </div>
              </div>
            </div>
            <div class="tx-amount-col">
              <span class="tx-amount">${tx.type === 'income' ? '+' : '-'}₹${tx.amount}</span>
              <button class="tx-delete-btn" data-id="${tx.id}"><i class="lucide-trash-2"></i></button>
            </div>
          </div>
        `;
      }).join('');
    } else {
      itemsHTML = `
        <div class="empty-state card" style="margin-top: 1.5rem;">
          <i class="lucide-search-x"></i>
          <p>No transactions match your filters.</p>
        </div>
      `;
    }

    return `
      <div class="view-container animate-fade-in">
        <div class="view-header">
          <div class="view-header-title">
            <h1>Transaction History</h1>
            <p>Review, filter, and export all recorded entries.</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button id="btn-export-csv" class="btn btn-secondary btn-sm" style="padding: 0.5rem 0.8rem; font-size:0.8rem;">
              <i class="lucide-file-spreadsheet"></i> CSV
            </button>
            <button id="btn-export-pdf" class="btn btn-secondary btn-sm" style="padding: 0.5rem 0.8rem; font-size:0.8rem;">
              <i class="lucide-printer"></i> Print/PDF
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="card filter-bar">
          <!-- Search input -->
          <div class="search-input-wrapper">
            <i class="lucide-search"></i>
            <input type="text" id="tx-search" class="form-control" placeholder="Search by name, rupees..." value="${this.searchQuery}">
          </div>

          <!-- Type filter pills -->
          <div class="filter-pills">
            <div class="filter-pill ${this.currentFilter === 'all' ? 'active' : ''}" data-type="all">All</div>
            <div class="filter-pill ${this.currentFilter === 'income' ? 'active' : ''}" data-type="income">Income</div>
            <div class="filter-pill ${this.currentFilter === 'expense' ? 'active' : ''}" data-type="expense">Expense</div>
          </div>

          <!-- Category filter dropdown -->
          <div class="settings-control" style="min-width: 130px;">
            <select id="tx-filter-cat" class="form-control" style="padding: 0.55rem 1rem; font-size:0.8rem; height: 100%;">
              <option value="all" ${this.selectedCategory === 'all' ? 'selected' : ''}>All Categories</option>
              ${categoryOptionsHTML}
            </select>
          </div>
        </div>

        <!-- Transactions Container -->
        <div class="transaction-list">
          ${itemsHTML}
        </div>
      </div>
    `;
  },

  init() {
    this.setupFilters();
    this.setupExports();

    // Attach click listeners to transaction deletes
    document.querySelectorAll('.tx-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm("Are you sure you want to delete this transaction?")) {
          Storage.deleteTransaction(id);
          window.app.notify("Success", "Transaction deleted successfully.", "success");
          window.app.loadView('history'); // Re-render
        }
      });
    });
  },

  setupFilters() {
    // 1. Text Search Input
    const searchInput = document.getElementById('tx-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.refreshList();
      });
    }

    // 2. Type Filters (Pills)
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentFilter = pill.getAttribute('data-type');
        this.refreshList();
      });
    });

    // 3. Category Filter
    const catSelect = document.getElementById('tx-filter-cat');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.selectedCategory = e.target.value;
        this.refreshList();
      });
    }
  },

  setupExports() {
    // CSV Export
    const csvBtn = document.getElementById('btn-export-csv');
    if (csvBtn) {
      csvBtn.addEventListener('click', () => {
        const csvStr = Storage.exportToCSV();
        if (!csvStr) {
          window.app.notify("No Data", "No transactions found to export.", "warning");
          return;
        }

        const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Saathi_AI_Report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.app.notify("Export Complete", "CSV downloaded successfully.", "success");
      });
    }

    // PDF / Print Report
    const pdfBtn = document.getElementById('btn-export-pdf');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', () => {
        window.print();
      });
    }
  },

  refreshList() {
    // We re-render the view shell dynamically to preserve input focus
    // Or we simply loadView. Let's loadView to keep it completely modular and bulletproof.
    window.app.loadView('history');
  },

  getCategoryIconClass(category) {
    const iconMap = {
      Delivery: 'lucide-truck',
      Ride: 'lucide-car',
      Freelancing: 'lucide-briefcase',
      'Shop Sales': 'lucide-store',
      Salary: 'lucide-wallet-cards',
      Fuel: 'lucide-fuel',
      Food: 'lucide-utensils',
      Recharge: 'lucide-smartphone',
      Maintenance: 'lucide-wrench',
      Rent: 'lucide-home',
      Shopping: 'lucide-shopping-bag',
      Other: 'lucide-receipt'
    };
    return iconMap[category] || iconMap.Other;
  }
};
