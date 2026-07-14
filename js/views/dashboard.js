/**
 * Saathi AI - Dashboard View
 * Renders main financial indicators, dynamic charts, recent transactions,
 * and quick-add actions. Fully updates whenever storage changes.
 */

import { Storage } from '../storage.js';

export const DashboardView = {
  async render() {
    // 1. Get calculations from storage
    const txList = await Storage.getTransactions();
    const goals = await Storage.getGoals();
    const streak = await Storage.getEarningStreak();

    const todayStr = new Date().toISOString().split('T')[0];
    let todayIncome = 0;
    let todayExpense = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    txList.forEach(tx => {
      const amount = parseFloat(tx.amount) || 0;
      const txDate = new Date(tx.date);

      // Today
      if (tx.date === todayStr) {
        if (tx.type === 'income') todayIncome += amount;
        else todayExpense += amount;
      }

      // This Month
      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        if (tx.type === 'income') monthlyIncome += amount;
        else monthlyExpense += amount;
      }
    });

    const todaySavings = todayIncome - todayExpense;
    const monthlySavings = monthlyIncome - monthlyExpense;

    // Get primary active goal progress
    let goalProgressHTML = '';
    if (goals.length > 0) {
      const mainGoal = goals[0];
      const percent = Math.min(100, Math.round((mainGoal.current / mainGoal.target) * 100)) || 0;
      goalProgressHTML = `
        <div class="card card-glass animate-slide-up" style="animation-delay: 0.1s;">
          <div class="card-header-row">
            <h3 class="card-title"><i class="lucide-target"></i> Saving Goal Progress</h3>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Goal 1 of ${goals.length}</span>
          </div>
          <p style="font-weight: 600; margin-bottom: 0.25rem;">${mainGoal.name}</p>
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">
            <span>Saved: ₹${mainGoal.current}</span>
            <span>Target: ₹${mainGoal.target}</span>
          </div>
          <div class="progress-container">
            <div class="progress-bar" style="width: ${percent}%;"></div>
          </div>
          <p style="font-size: 0.75rem; margin-top: 0.25rem; font-weight:600; color:var(--secondary); text-align:right;">${percent}% Saved</p>
        </div>
      `;
    } else {
      goalProgressHTML = `
        <div class="card card-glass animate-slide-up" style="animation-delay: 0.1s; display: flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding: 1.5rem;">
          <i class="lucide-target" style="font-size: 2.25rem; color: var(--border-color); margin-bottom: 0.5rem;"></i>
          <p style="font-size: 0.85rem; color: var(--text-muted);">No goals created yet.</p>
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#goals'" style="margin-top: 0.5rem; padding: 0.4rem 0.8rem; font-size: 0.8rem;">Create Goal</button>
        </div>
      `;
    }

    // Dynamic AI Insight Card Preview
    let insightPreview = "Record more expenses to view smart insights.";
    if (txList.length > 0) {
      // Find top spending categories or general savings insight
      const expenseList = txList.filter(t => t.type === 'expense');
      const fuelTotal = expenseList.filter(t => t.category === 'Fuel').reduce((sum, item) => sum + item.amount, 0);
      const totalExpense = expenseList.reduce((sum, item) => sum + item.amount, 0);

      if (totalExpense > 0 && fuelTotal > 0 && (fuelTotal / totalExpense) > 0.15) {
        const percent = Math.round((fuelTotal / totalExpense) * 100);
        insightPreview = `Fuel (Petrol/CNG) accounts for **${percent}%** of your total spending. Service your vehicle to save money!`;
      } else if (txList.length > 5) {
        // High earning day estimation
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayEarnings = [0, 0, 0, 0, 0, 0, 0];
        txList.forEach(t => {
          if (t.type === 'income') {
            const dayIdx = new Date(t.date).getDay();
            dayEarnings[dayIdx] += t.amount;
          }
        });
        let bestDayIdx = 0;
        let maxEarn = 0;
        dayEarnings.forEach((earn, idx) => {
          if (earn > maxEarn) {
            maxEarn = earn;
            bestDayIdx = idx;
          }
        });
        if (maxEarn > 0) {
          insightPreview = `**${days[bestDayIdx]}** is your highest earning day this week. Plan more shifts on this day!`;
        } else {
          insightPreview = "You saved money this week! Add details to calculate goals completion dates.";
        }
      } else {
        insightPreview = "You're on track to reach your savings goal! Keep logging transactions to unlock detailed charts.";
      }
    }

    // Recent Transactions HTML
    const recentTx = txList.slice(0, 4);
    let recentTxHTML = '';
    if (recentTx.length > 0) {
      recentTxHTML = recentTx.map(tx => {
        const dateStr = new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
      recentTxHTML = `
        <div class="empty-state">
          <i class="lucide-receipt"></i>
          <p>No transactions added yet. Record your first sale or fuel fill!</p>
        </div>
      `;
    }

    // Assemble the complete Dashboard HTML
    return `
      <div class="view-container animate-fade-in">
        <!-- Dashboard Welcome Row -->
        <div class="view-header">
          <div class="view-header-title">
            <h1 id="welcome-greeting">Ram Ram, Partner!</h1>
            <p>Here is your financial status today.</p>
          </div>
          <button class="btn btn-primary" onclick="window.location.hash='#add_tx'">
            <i class="lucide-plus"></i> Add Entry
          </button>
        </div>

        <!-- Metric Stat Cards -->
        <div class="stats-grid">
          <div class="card stat-card income animate-slide-up">
            <div class="stat-card-icon">
              <i class="lucide-trending-up"></i>
            </div>
            <div class="stat-card-details">
              <span class="stat-card-label">Today's Income</span>
              <span class="stat-card-value">₹${todayIncome}</span>
            </div>
          </div>

          <div class="card stat-card expense animate-slide-up" style="animation-delay: 0.05s;">
            <div class="stat-card-icon">
              <i class="lucide-trending-down"></i>
            </div>
            <div class="stat-card-details">
              <span class="stat-card-label">Today's Expense</span>
              <span class="stat-card-value">₹${todayExpense}</span>
            </div>
          </div>

          <div class="card stat-card savings animate-slide-up" style="animation-delay: 0.1s;">
            <div class="stat-card-icon">
              <i class="lucide-wallet"></i>
            </div>
            <div class="stat-card-details">
              <span class="stat-card-label">Today's Savings</span>
              <span class="stat-card-value" style="color: ${todaySavings >= 0 ? 'var(--secondary)' : 'var(--danger)'};">
                ₹${todaySavings}
              </span>
            </div>
          </div>

          <div class="card stat-card streak animate-slide-up" style="animation-delay: 0.12s; border-color: rgba(245, 158, 11, 0.25);">
            <div class="stat-card-icon" style="background-color: rgba(245, 158, 11, 0.12); color: var(--accent);">
              <i class="lucide-flame"></i>
            </div>
            <div class="stat-card-details">
              <span class="stat-card-label">Earning Streak</span>
              <span class="stat-card-value" style="color: var(--accent); font-family: var(--font-family-display); font-weight:700;">
                ${streak} Days 🔥
              </span>
            </div>
          </div>
        </div>

        <!-- AI Insight Card Preview -->
        <div class="card insight-card-preview animate-slide-up" style="animation-delay: 0.15s;">
          <i class="lucide-sparkles icon-badge"></i>
          <h4 style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.4rem; display:flex; align-items:center; gap: 0.4rem;">
             Saathi AI Insight
          </h4>
          <p>${insightPreview.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
        </div>

        <!-- Charts Section -->
        <div class="charts-grid">
          <div class="card animate-slide-up" style="animation-delay: 0.2s;">
            <h3 class="card-title" style="margin-bottom: 1.25rem;"><i class="lucide-bar-chart-2"></i> Weekly Income vs Expenses</h3>
            <div class="chart-wrapper">
              <canvas id="weekly-flow-chart"></canvas>
            </div>
          </div>

          <div class="card animate-slide-up" style="animation-delay: 0.25s;">
            <h3 class="card-title" style="margin-bottom: 1.25rem;"><i class="lucide-pie-chart"></i> Spending Category</h3>
            <div class="chart-wrapper">
              <canvas id="category-donut-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Bottom Grid (Goal progress & Recent Transactions) -->
        <div class="dashboard-bottom-grid">
          ${goalProgressHTML}

          <div class="card animate-slide-up" style="animation-delay: 0.3s;">
            <div class="card-header-row">
              <h3 class="card-title"><i class="lucide-history"></i> Recent Transactions</h3>
              <a href="#history" style="font-size: 0.8rem; color: var(--primary); font-weight:600;">View All</a>
            </div>
            <div class="transaction-list">
              ${recentTxHTML}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // Initialize event listeners and Chart.js instances after DOM render
  async init() {
    this.updateGreeting();
    const txList = await Storage.getTransactions();
    this.renderCharts(txList);

    // Attach click listeners to transaction deletes
    document.querySelectorAll('.tx-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm("Are you sure you want to delete this transaction?")) {
          await Storage.deleteTransaction(id);
          window.app.notify("Success", "Transaction deleted successfully.", "success");
          await window.app.loadView('dashboard'); // Re-render
        }
      });
    });
  },

  updateGreeting() {
    const greetingEl = document.getElementById('welcome-greeting');
    if (!greetingEl) return;

    const hour = new Date().getHours();
    let text = "Namaste!";
    if (hour < 12) text = "Subah ki Ram Ram, Partner!";
    else if (hour < 17) text = "Namaste, Partner!";
    else text = "Ram Ram, Partner!";

    greetingEl.innerText = text;
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
  },

  renderCharts(txList) {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
      console.warn("Chart.js is not loaded.");
      return;
    }

    const isDark = document.body.classList.contains('dark');
    const textMainColor = isDark ? '#F8FAFC' : '#0F172A';
    const gridColor = isDark ? '#334155' : '#E2E8F0';

    // 1. Prepare Data for Weekly Chart (last 7 days including today)
    const daysLabel = [];
    const incomeData = [];
    const expenseData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      daysLabel.push(dayLabel);

      let dayInc = 0;
      let dayExp = 0;
      txList.forEach(t => {
        if (t.date === dateStr) {
          if (t.type === 'income') dayInc += parseFloat(t.amount);
          else dayExp += parseFloat(t.amount);
        }
      });
      incomeData.push(dayInc);
      expenseData.push(dayExp);
    }

    const weeklyCtx = document.getElementById('weekly-flow-chart');
    if (weeklyCtx) {
      new Chart(weeklyCtx, {
        type: 'bar',
        data: {
          labels: daysLabel,
          datasets: [
            {
              label: 'Income (₹)',
              data: incomeData,
              backgroundColor: '#10B981', // Secondary Green
              borderRadius: 6,
              borderSkipped: false
            },
            {
              label: 'Expenses (₹)',
              data: expenseData,
              backgroundColor: '#EF4444', // Danger Red
              borderRadius: 6,
              borderSkipped: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: textMainColor,
                font: { family: 'Outfit', weight: 500 }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: textMainColor, font: { family: 'Inter' } }
            },
            y: {
              grid: { color: gridColor },
              ticks: { color: textMainColor, font: { family: 'Inter' } }
            }
          }
        }
      });
    }

    // 2. Prepare Data for Doughnut Category Chart
    const categoriesMap = {};
    txList.filter(t => t.type === 'expense').forEach(t => {
      categoriesMap[t.category] = (categoriesMap[t.category] || 0) + parseFloat(t.amount);
    });

    const doughnutLabels = Object.keys(categoriesMap);
    const doughnutValues = Object.values(categoriesMap);
    const donutCtx = document.getElementById('category-donut-chart');

    if (donutCtx) {
      if (doughnutValues.length === 0) {
        // Render a dummy grey circle if no expenses
        new Chart(donutCtx, {
          type: 'doughnut',
          data: {
            labels: ['No Expenses'],
            datasets: [{
              data: [100],
              backgroundColor: [isDark ? '#334155' : '#E2E8F0']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: textMainColor, font: { family: 'Outfit' } }
              }
            }
          }
        });
      } else {
        const themeColors = [
          '#EF4444', // Red
          '#F59E0B', // Amber
          '#3B82F6', // Blue
          '#10B981', // Emerald
          '#8B5CF6', // Purple
          '#EC4899', // Pink
          '#64748B'  // Slate
        ];

        new Chart(donutCtx, {
          type: 'doughnut',
          data: {
            labels: doughnutLabels,
            datasets: [{
              data: doughnutValues,
              backgroundColor: themeColors.slice(0, doughnutLabels.length),
              borderWidth: isDark ? 2 : 1,
              borderColor: isDark ? '#1E293B' : '#FFFFFF'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: textMainColor,
                  font: { family: 'Outfit', size: 11 }
                }
              }
            },
            cutout: '65%'
          }
        });
      }
    }
  }
};
