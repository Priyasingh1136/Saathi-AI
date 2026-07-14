/**
 * Saathi AI - AI Insights View
 * Dynamically computes and displays financial insights, optimization metrics,
 * and saving advice based on live user data.
 */

import { Storage } from '../storage.js';

export const InsightsView = {
  async render() {
    const txList = await Storage.getTransactions();
    const goals = await Storage.getGoals();

    // 1. Calculations setup
    const today = new Date();
    
    // Dates boundary
    const getPastDateObj = (daysAgo) => {
      const d = new Date(today);
      d.setDate(today.getDate() - daysAgo);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const week1Start = getPastDateObj(7);
    const week2Start = getPastDateObj(14);

    let week1Expense = 0;
    let week1Income = 0;
    let week1Fuel = 0;
    let week1Food = 0;

    let week2Food = 0;

    // Weekday income compilation
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayIncomeMap = [0, 0, 0, 0, 0, 0, 0];

    txList.forEach(t => {
      const tDate = new Date(t.date);
      const amount = parseFloat(t.amount) || 0;

      // Last 7 days
      if (tDate >= week1Start) {
        if (t.type === 'income') {
          week1Income += amount;
          const dayIdx = tDate.getDay();
          weekdayIncomeMap[dayIdx] += amount;
        } else {
          week1Expense += amount;
          if (t.category === 'Fuel') week1Fuel += amount;
          if (t.category === 'Food') week1Food += amount;
        }
      } 
      // 8 to 14 days ago
      else if (tDate >= week2Start) {
        if (t.type === 'expense' && t.category === 'Food') {
          week2Food += amount;
        }
      }
    });

    const weeklySavings = week1Income - week1Expense;

    // Build the insights list dynamically
    const insights = [];

    // INSIGHT 1: Weekly Savings
    if (txList.length > 0) {
      if (weeklySavings > 0) {
        insights.push({
          type: 'success',
          icon: 'lucide-wallet',
          label: `Saved ₹${weeklySavings} this week`,
          desc: `Great job! Aapne is hafte apne kharche se ₹${weeklySavings} zyada kamaye hain. This money will help fund your active savings goals.`
        });
      } else if (weeklySavings < 0) {
        insights.push({
          type: 'warning',
          icon: 'lucide-alert-triangle',
          label: `Negative savings: -₹${Math.abs(weeklySavings)} this week`,
          desc: `Is hafte aapke kharche (₹${week1Expense}) kamai (₹${week1Income}) se zyada the. Try postponing non-essential shopping to balance next week.`
        });
      } else {
        insights.push({
          type: 'info',
          icon: 'lucide-wallet',
          label: 'Earning equal to spending',
          desc: 'Aapki kamai aur kharch is hafte bilkul barabar the. Try setting aside ₹50 daily at the beginning of the week.'
        });
      }
    }

    // INSIGHT 2: Fuel Percentage
    if (week1Expense > 0 && week1Fuel > 0) {
      const fuelPercent = Math.round((week1Fuel / week1Expense) * 100);
      let descText = `Fuel (Petrol/CNG) accounts for **${fuelPercent}%** of your weekly expenses (₹${week1Fuel} out of ₹${week1Expense}).`;
      
      if (fuelPercent > 20) {
        descText += ` This is relatively high. Try optimizing routes or maintaining tire pressure to save up to 10% on fuel.`;
      } else {
        descText += ` Your fuel expenses are within a healthy range.`;
      }

      insights.push({
        type: fuelPercent > 25 ? 'warning' : 'info',
        icon: 'lucide-fuel',
        label: `Fuel accounts for ${fuelPercent}% of spending`,
        desc: descText
      });
    }

    // INSIGHT 3: Highest Earning Day
    let bestDayIdx = -1;
    let maxEarning = 0;
    weekdayIncomeMap.forEach((val, idx) => {
      if (val > maxEarning) {
        maxEarning = val;
        bestDayIdx = idx;
      }
    });

    if (bestDayIdx !== -1 && maxEarning > 0) {
      insights.push({
        type: 'success',
        icon: 'lucide-calendar-check',
        label: `${daysOfWeek[bestDayIdx]} is your highest earning day`,
        desc: `You earned ₹${maxEarning} on ${daysOfWeek[bestDayIdx]}s. Try picking up extra delivery shifts or driving more hours on this day to maximize payouts.`
      });
    }

    // INSIGHT 4: Food Expense Changes
    if (week1Food > 0 || week2Food > 0) {
      const foodDiff = week1Food - week2Food;
      if (foodDiff > 0) {
        insights.push({
          type: 'warning',
          icon: 'lucide-utensils',
          label: `Food expenses increased by ₹${foodDiff}`,
          desc: `Aapne is hafte khane par pichle hafte se ₹${foodDiff} zyada kharch kiye (Week 1: ₹${week1Food}, Week 2: ₹${week2Food}). Carry a home-cooked lunch box to save up to ₹1,500 monthly.`
        });
      } else if (foodDiff < 0) {
        insights.push({
          type: 'success',
          icon: 'lucide-utensils',
          label: `Saved ₹${Math.abs(foodDiff)} on food`,
          desc: `Well done! Khane par aapka kharcha pichle hafte ke mukable ₹${Math.abs(foodDiff)} kam hua hai. Keep it up!`
        });
      }
    }

    // INSIGHT 5: Savings Goals Tracker
    if (goals.length > 0) {
      const mainGoal = goals[0];
      const gap = mainGoal.target - mainGoal.current;
      
      if (gap > 0) {
        // Calculate average daily savings based on 30 day history
        const thirtyDaysAgo = getPastDateObj(30);
        let monthlyInc = 0;
        let monthlyExp = 0;
        txList.forEach(t => {
          const tDate = new Date(t.date);
          if (tDate >= thirtyDaysAgo) {
            if (t.type === 'income') monthlyInc += parseFloat(t.amount);
            else monthlyExp += parseFloat(t.amount);
          }
        });
        const mSavings = monthlyInc - monthlyExp;
        const dailySavings = mSavings / 30;

        if (dailySavings > 0) {
          const daysToTarget = Math.ceil(gap / dailySavings);
          insights.push({
            type: 'success',
            icon: 'lucide-target',
            label: `On track for "${mainGoal.name}"`,
            desc: `Current savings rate: ₹${Math.round(dailySavings)} daily. You are on track to complete your goal of ₹${mainGoal.target} in about **${daysToTarget} days**.`
          });
        } else {
          const dailyRequired = Math.round(gap / 60); // Target 2 months
          insights.push({
            type: 'warning',
            icon: 'lucide-target',
            label: `"${mainGoal.name}" savings target delayed`,
            desc: `Apni bachat badhayein! Aim to save at least **₹${dailyRequired} daily** to reach your savings target of ₹${mainGoal.target} within the next 2 months.`
          });
        }
      }
    }

    // If no insights generated (e.g. no data)
    if (insights.length === 0) {
      insights.push({
        type: 'info',
        icon: 'lucide-sparkles',
        label: 'Generating Insights...',
        desc: 'Log a few more transactions (e.g. Fuel, Delivery sales, food expenses) to see automatically calculated financial patterns.'
      });
    }

    // Render insights list
    const insightsHTML = insights.map(ins => `
      <div class="card insight-card ${ins.type} animate-slide-up">
        <div class="insight-icon">
          <i class="${ins.icon}"></i>
        </div>
        <div class="insight-details">
          <span class="insight-label">${ins.label}</span>
          <p class="insight-desc">${ins.desc.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
        </div>
      </div>
    `).join('');

    return `
      <div class="view-container animate-fade-in">
        <div class="view-header">
          <div class="view-header-title">
            <h1>AI Insights</h1>
            <p>Smart, real-time calculations based on your earning and spending habits.</p>
          </div>
        </div>

        <div class="insights-list">
          ${insightsHTML}
        </div>
      </div>
    `;
  },

  init() {
    // No specific listener setup required, view is fully declarative
  }
};
