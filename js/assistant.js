/**
 * Saathi AI - Assistant Controller
 * Orchestrates AI chat assistant behavior.
 * Integrates Gemini 1.5 Flash API directly using browser fetch when an API key is present.
 * Implements a smart, context-aware local NLP fallback when offline or no API key is set.
 */

import { Storage } from './storage.js';

export const AssistantController = {
  // Check if Gemini API key is available
  isGeminiEnabled() {
    const settings = Storage.getSettings();
    return !!settings.geminiApiKey;
  },

  // Generates current context summary for the AI assistant
  async getFinancialContext() {
    const txs = await Storage.getTransactions();
    const goals = await Storage.getGoals();
    
    // Calculate basic aggregates
    const todayStr = new Date().toISOString().split('T')[0];
    let todayIncome = 0;
    let todayExpense = 0;
    
    // Last 7 days aggregates
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    let weekIncome = 0;
    let weekExpense = 0;
    
    const categoryTotals = {};

    txs.forEach(tx => {
      const amount = parseFloat(tx.amount) || 0;
      
      // Category aggregation
      if (tx.type === 'expense') {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amount;
      }

      // Today
      if (tx.date === todayStr) {
        if (tx.type === 'income') todayIncome += amount;
        else todayExpense += amount;
      }
      
      // Week
      const txDate = new Date(tx.date);
      if (txDate >= oneWeekAgo) {
        if (tx.type === 'income') weekIncome += amount;
        else weekExpense += amount;
      }
    });

    // Find top spending category
    let topCategory = 'None';
    let topAmt = 0;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
      if (amt > topAmt) {
        topAmt = amt;
        topCategory = cat;
      }
    }

    const goalsSummary = goals.map(g => 
      `- ${g.name}: Target ₹${g.target}, Saved ₹${g.current} (${Math.round((g.current/g.target)*100)}%)`
    ).join('\n');

    return {
      today: { income: todayIncome, expense: todayExpense, savings: todayIncome - todayExpense },
      week: { income: weekIncome, expense: weekExpense, savings: weekIncome - weekExpense },
      topCategory: { name: topCategory, amount: topAmt },
      goals: goalsSummary || "No goals created yet."
    };
  },

  // Process user message and return response
  async sendMessage(messageText) {
    if (this.isGeminiEnabled()) {
      return await this.callGeminiAPI(messageText);
    } else {
      return await this.getLocalResponse(messageText);
    }
  },

  // Calls Gemini API 1.5 Flash directly
  async callGeminiAPI(prompt) {
    const settings = Storage.getSettings();
    const apiKey = settings.geminiApiKey;
    const context = await this.getFinancialContext();
    
    const systemPrompt = `You are Saathi AI, a warm, supportive voice-first financial companion for India's informal workforce (delivery partners, auto-rickshaw drivers, street vendors, and daily wage workers).
Respond in a clear, friendly manner. You can use English, Hindi, or Hinglish (Hindi written in Roman characters) matching the user's query language.
Keep answers extremely concise, direct, and practical (usually 1-3 sentences max). Use Rupees (₹) for currency.
Here is the user's live financial data for reference:
- Today's Income: ₹${context.today.income}
- Today's Expenses: ₹${context.today.expense}
- Today's Savings: ₹${context.today.savings}
- Past 7 Days: Earned ₹${context.week.income}, Spent ₹${context.week.expense}, Saved ₹${context.week.savings}
- Top Spending Area: ${context.topCategory.name} (₹${context.topCategory.amount})
- Active Savings Goals:
${context.goals}

Answer the user's question directly based on this data. If they ask about saving money, give them a simple tip suited for low-income gig workers in India.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            maxOutputTokens: 150,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API Error details:", errorData);
        throw new Error(errorData.error?.message || 'Gemini API connection failed');
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (e) {
      console.error("Failed to query Gemini API", e);
      return `[Gemini API Error: ${e.message}]. Falling back to local offline helper:\n\n${await this.getLocalResponse(prompt)}`;
    }
  },

  // Generates offline, rule-based responses matching common questions
  async getLocalResponse(prompt) {
    const text = prompt.toLowerCase();
    const context = await this.getFinancialContext();

    // 1. Check earnings / today's income
    if (text.includes('earn') || text.includes('kamaya') || text.includes('kamaye') || text.includes('kamai') || text.includes('earning') || text.includes('कमाया') || text.includes('कमाए') || text.includes('कमाई')) {
      return `Aaj aapne ₹${context.today.income} kamaye hain. Keep it up! Bahut badhiya kaam kiya.`;
    }

    // 2. Check weekly savings
    if (text.includes('save') || text.includes('savings') || text.includes('bachaya') || text.includes('bachat') || text.includes('बचत') || text.includes('बचाया')) {
      if (context.week.savings > 0) {
        return `Iss hafte aapne ₹${context.week.savings} ki bachat ki hai (Earning ₹${context.week.income} - Expense ₹${context.week.expense}). Naye mobile/repair goals ke liye ye acchi shuruat hai!`;
      } else {
        return `Iss hafte aapki bachat negative (₹${context.week.savings}) hai, yaani kharche zyada hue. Thoda control karein, aage bachat badhegi!`;
      }
    }

    // 3. Check top spend / where spending the most
    if (text.includes('spending the most') || text.includes('spend most') || text.includes('sabse zyada kharch') || text.includes('sabse bada kharch') || text.includes('zyada kharcha') || text.includes('ज़्यादा खर्च')) {
      if (context.topCategory.amount > 0) {
        return `Aapka sabse zyada kharch "${context.topCategory.name}" par hua hai, jo ki ₹${context.topCategory.amount} hai.`;
      } else {
        return `Abhi tak aapka koi bada kharch record nahi hua hai. Sab control mein hai!`;
      }
    }

    // 4. Check category specific expenses (e.g. Fuel, Food)
    const categoryKeywords = {
      Fuel: ['fuel', 'petrol', 'diesel', 'cng', 'petrol', 'diesel', 'गैस'],
      Food: ['food', 'lunch', 'chai', 'tea', 'khana', 'nasta', 'खाना', 'चाय'],
      Recharge: ['recharge', 'net', 'mobile data', 'रिचार्ज'],
      Rent: ['rent', 'kiraya', 'room', 'किराया', 'रेंट']
    };

    for (const [catName, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        // Calculate category total
        const txs = await Storage.getTransactions();
        let catTotal = 0;
        txs.forEach(tx => {
          if (tx.type === 'expense' && tx.category === catName) {
            catTotal += parseFloat(tx.amount) || 0;
          }
        });
        return `${catName} par abhi tak aapne kul ₹${catTotal} kharch kiye hain.`;
      }
    }

    // 5. Monthly summary
    if (text.includes('month') || text.includes('mahine') || text.includes('summary') || text.includes('महीना') || text.includes('विवरण')) {
      const txs = await Storage.getTransactions();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      let mIncome = 0;
      let mExpense = 0;

      txs.forEach(tx => {
        const txDate = new Date(tx.date);
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
          if (tx.type === 'income') mIncome += parseFloat(tx.amount);
          else mExpense += parseFloat(tx.amount);
        }
      });

      return `Iss mahine ka status: Income: ₹${mIncome}, Expense: ₹${mExpense}. Total Savings: ₹${mIncome - mExpense}.`;
    }

    // 6. Savings tips
    if (text.includes('save more') || text.includes('tip') || text.includes('bachega kaise') || text.includes('सलाह') || text.includes('सुझाव')) {
      const tips = [
        "Apne daily expense jaise tea/snacks par ₹20-30 roz bachayein. Ek mahine mein ₹900 tak bachat ho sakti hai!",
        "Har week ke shuruat mein ek target set karein. Jaise ₹500 bank mein alag rakhna aur bache paise se kharch chalana.",
        "Delivery/Ride payouts se direct 10% bachat goal mein transfer karein. Choti saving aage badi banti hai!",
        "Maintenance cost se bachne ke liye gaadi ka engine oil time par change karein. Isse mileage accha milega."
      ];
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      return `Bachat badhane ki tips:\n${randomTip}`;
    }

    // General fallback greeting
    return `Namaste! Main hu Saathi AI. Aap mujhse pooch sakte hain: "Aaj kitna kamaya?", "Where did I spend the most this week?", ya "Give me saving tips". Aap setting mein jaakar Gemini API key dalenge to aur behtar jawab milenge.`;
  }
};
