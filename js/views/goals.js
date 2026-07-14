/**
 * Saathi AI - Savings Goals View
 * Manages savings goal targets, contribution progress, and dynamic completion
 * projections based on transaction history.
 */

import { Storage } from '../storage.js';

export const GoalsView = {
  activeGoalToEdit: null, // Holds goal object when editing

  async render() {
    const goals = await Storage.getGoals();
    const txList = await Storage.getTransactions();

    // Calculate average daily savings from transaction history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    txList.forEach(t => {
      const tDate = new Date(t.date);
      if (tDate >= thirtyDaysAgo) {
        if (t.type === 'income') totalIncome += parseFloat(t.amount);
        else totalExpense += parseFloat(t.amount);
      }
    });

    const netSavings = totalIncome - totalExpense;
    const dailySavings = Math.max(0, netSavings / 30); // Prevent negative savings rate estimation

    // Generate goal cards HTML
    let goalsHTML = '';
    
    if (goals.length > 0) {
      goalsHTML = goals.map(goal => {
        const percent = Math.min(100, Math.round((goal.current / goal.target) * 100)) || 0;
        
        // Completion projection
        let completionText = 'Save ₹50 daily to reach this soon.';
        const gap = goal.target - goal.current;
        
        if (gap <= 0) {
          completionText = 'Goal completed! Excellent work! 🎉';
        } else if (dailySavings > 0) {
          const daysLeft = Math.ceil(gap / dailySavings);
          if (daysLeft < 365) {
            completionText = `Estimated completion in **${daysLeft} days** (approx. ${new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}).`;
          } else {
            completionText = `Estimated completion in over a year. Try increasing savings by ₹${Math.round(gap / 90)} daily to finish in 3 months.`;
          }
        } else {
          // Fallback tip if negative/zero savings rate
          const dailyRequired = Math.round(gap / 60); // Aim for 2 months
          completionText = `Set aside **₹${dailyRequired} daily** to complete this goal in 2 months.`;
        }

        return `
          <div class="card animate-slide-up">
            <div class="goal-card-header">
              <div class="goal-meta">
                <span class="goal-title">${goal.name}</span>
                <span class="goal-target">Target: ₹${goal.target}</span>
              </div>
              <div class="goal-actions">
                <button class="edit-goal-btn" data-id="${goal.id}" title="Edit"><i class="lucide-edit-2"></i></button>
                <button class="delete-goal-btn delete" data-id="${goal.id}" title="Delete"><i class="lucide-trash-2"></i></button>
              </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; margin-bottom:0.25rem;">
              <span>Saved: ₹${goal.current}</span>
              <span>${percent}%</span>
            </div>

            <div class="progress-container">
              <div class="progress-bar" style="width: ${percent}%;"></div>
            </div>

            <div class="goal-completion-est">
              <i class="lucide-calendar-days" style="color: var(--primary);"></i>
              <span>${completionText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    return `
      <div class="view-container animate-fade-in">
        <div class="view-header">
          <div class="view-header-title">
            <h1>Savings Goals</h1>
            <p>Define targets to buy gadgets, repair vehicles, or set aside emergencies.</p>
          </div>
          <button id="btn-create-goal" class="btn btn-primary">
            <i class="lucide-plus"></i> Create Goal
          </button>
        </div>

        <div class="goals-grid">
          ${goalsHTML}
          
          <div id="btn-create-goal-card" class="card create-goal-btn-card animate-slide-up">
            <i class="lucide-plus-circle"></i>
            <span>Add New Goal</span>
          </div>
        </div>

        <!-- Create/Edit Goal Modal -->
        <div id="goal-modal" class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3 id="modal-title" style="font-family: var(--font-family-display); font-weight:700;"><i class="lucide-target"></i> Create Savings Goal</h3>
              <button id="modal-close-btn" style="background:transparent; border:none; cursor:pointer; font-size:1.5rem; color:var(--text-muted);"><i class="lucide-x"></i></button>
            </div>
            <form id="goal-form">
              <div class="modal-body">
                <input type="hidden" id="goal-id">
                
                <div class="form-group">
                  <label class="form-label" for="goal-name">Goal Name (लक्ष्य) *</label>
                  <input type="text" id="goal-name" class="form-control" placeholder="e.g. New Auto Rickshaw Battery, Mobile Phone" required>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label" for="goal-target">Target Amount (₹) *</label>
                    <input type="number" id="goal-target" class="form-control" min="1" placeholder="e.g. 10000" required style="font-weight:600;">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="goal-current">Already Saved (₹)</label>
                    <input type="number" id="goal-current" class="form-control" min="0" placeholder="0" style="font-weight:600;">
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="goal-target-date">Expected Completion Date</label>
                  <input type="date" id="goal-target-date" class="form-control">
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" id="btn-modal-cancel" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Goal</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    this.setupModalListeners();
    this.setupGoalActions();
  },

  setupModalListeners() {
    const modal = document.getElementById('goal-modal');
    const openBtn = document.getElementById('btn-create-goal');
    const openCardBtn = document.getElementById('btn-create-goal-card');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('btn-modal-cancel');
    const form = document.getElementById('goal-form');

    const showModal = (goal = null) => {
      this.activeGoalToEdit = goal;
      const titleEl = document.getElementById('modal-title');
      
      if (goal) {
        titleEl.innerHTML = `<i class="lucide-edit"></i> Edit Savings Goal`;
        document.getElementById('goal-id').value = goal.id;
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.target;
        document.getElementById('goal-current').value = goal.current;
        document.getElementById('goal-target-date').value = goal.targetDate || '';
      } else {
        titleEl.innerHTML = `<i class="lucide-target"></i> Create Savings Goal`;
        form.reset();
        document.getElementById('goal-id').value = '';
        // Set default expected date (90 days from now)
        const defDate = new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0];
        document.getElementById('goal-target-date').value = defDate;
      }
      modal.classList.add('active');
    };

    const hideModal = () => {
      modal.classList.remove('active');
      this.activeGoalToEdit = null;
    };

    if (openBtn) openBtn.addEventListener('click', () => showModal(null));
    if (openCardBtn) openCardBtn.addEventListener('click', () => showModal(null));
    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideModal);

    // Save Goal handler
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('goal-id').value;
        const name = document.getElementById('goal-name').value;
        const target = parseFloat(document.getElementById('goal-target').value);
        const current = parseFloat(document.getElementById('goal-current').value) || 0;
        const targetDate = document.getElementById('goal-target-date').value;

        if (current > target) {
          window.app.notify("Warning", "Already saved amount cannot exceed target.", "warning");
          return;
        }

        const goalObj = {
          name,
          target,
          current,
          targetDate
        };
        if (id) goalObj.id = id;

        await Storage.saveGoal(goalObj);
        window.app.notify("Success", id ? "Goal updated successfully." : "Goal created successfully.", "success");
        hideModal();
        await window.app.loadView('goals'); // Re-render
      });
    }
  },

  setupGoalActions() {
    // Edit goals triggers
    document.querySelectorAll('.edit-goal-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const goals = await Storage.getGoals();
        const found = goals.find(g => g.id === id);
        if (found) {
          // Open modal with pre-populated values
          const modal = document.getElementById('goal-modal');
          this.activeGoalToEdit = found;
          document.getElementById('modal-title').innerHTML = `<i class="lucide-edit"></i> Edit Savings Goal`;
          document.getElementById('goal-id').value = found.id;
          document.getElementById('goal-name').value = found.name;
          document.getElementById('goal-target').value = found.target;
          document.getElementById('goal-current').value = found.current;
          document.getElementById('goal-target-date').value = found.targetDate || '';
          modal.classList.add('active');
        }
      });
    });

    // Delete goals triggers
    document.querySelectorAll('.delete-goal-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm("Are you sure you want to delete this savings goal?")) {
          await Storage.deleteGoal(id);
          window.app.notify("Success", "Savings goal deleted.", "success");
          await window.app.loadView('goals');
        }
      });
    });
  }
};
