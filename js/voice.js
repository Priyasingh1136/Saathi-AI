/**
 * Saathi AI - Voice Controller
 * Integrates Web Speech API (SpeechRecognition) and parses spoken words
 * in English, Hindi (Devnagari), and Hinglish (Hindi in Roman script).
 */

export const VoiceController = {
  recognition: null,
  isListening: false,

  // Initialize Speech Recognition
  init(callbacks = {}) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech API is not supported in this browser.");
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    // Set configuration
    this.recognition.onstart = () => {
      this.isListening = true;
      if (callbacks.onStart) callbacks.onStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (callbacks.onResult) {
        callbacks.onResult({
          final: finalTranscript,
          interim: interimTranscript
        });
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      if (callbacks.onError) {
        let msg = "Microphone error. Please try again.";
        if (event.error === 'not-allowed') {
          msg = "Permission denied. Please allow microphone access in settings.";
        } else if (event.error === 'no-speech') {
          msg = "No speech detected. Speak clearly.";
        }
        callbacks.onError(msg, event);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (callbacks.onEnd) callbacks.onEnd();
    };

    return true;
  },

  start(languageCode = 'en-IN') {
    if (!this.recognition) return;
    try {
      this.recognition.lang = languageCode;
      this.recognition.start();
    } catch (e) {
      console.error("Speech Recognition failed to start:", e);
    }
  },

  stop() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch (e) {
      console.error("Speech Recognition failed to stop:", e);
    }
  },

  /**
   * Intelligently parses a string (English/Hindi/Hinglish) to extract:
   * - Amount (number)
   * - Transaction Type (income/expense)
   * - Category
   * - Date
   */
  parseCommand(text) {
    if (!text) return null;
    const cleanText = text.toLowerCase().trim();

    // 1. Extract Amount
    // Regex matches numbers like 500, 2,500, 10000, etc.
    const amountRegex = /(?:rs\.?|₹|rupees?|rupaye?|rupya|रुपये|रुपया)?\s*(\d+[,.]?\d*)\s*(?:rs\.?|₹|rupees?|rupaye?|rupya|रुपये|रुपया)?/gi;
    let amount = null;
    let match;
    
    // Find the first matching number in the text
    const numbers = [];
    const numRegex = /\b\d+\b/g;
    while ((match = numRegex.exec(cleanText)) !== null) {
      numbers.push(parseInt(match[0], 10));
    }
    
    // We can also check double amounts, e.g. "500 income aur 150 petrol"
    // In standard cases, take the largest or first number. Let's look for currency patterns first.
    if (numbers.length > 0) {
      amount = numbers[0]; // Primary transaction amount
    }

    // 2. Extract Date
    let date = new Date().toISOString().split('T')[0]; // Default: Today
    
    const yesterdayKeywords = ['kal', 'yesterday', 'कल', 'बीता हुआ कल'];
    const todayKeywords = ['aaj', 'today', 'आज', 'अब'];
    const dayBeforeYesterdayKeywords = ['parso', 'parson', 'परसों'];

    if (yesterdayKeywords.some(kw => cleanText.includes(kw))) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      date = d.toISOString().split('T')[0];
    } else if (dayBeforeYesterdayKeywords.some(kw => cleanText.includes(kw))) {
      const d = new Date();
      d.setDate(d.getDate() - 2);
      date = d.toISOString().split('T')[0];
    }

    // 3. Extract Category
    const categoryKeywords = {
      Delivery: ['delivery', 'zomato', 'swiggy', 'zepto', 'blinkit', 'dunzo', 'order', 'पार्सल', 'डिलीवरी', 'सामान'],
      Ride: ['ride', 'passenger', 'cab', 'auto', 'taxi', 'rickshaw', 'fare', 'sawaari', 'kiraya', 'सवारी', 'किराया', 'ऑटो', 'ओला', 'उबर', 'uber', 'ola', 'rapido'],
      Freelancing: ['freelance', 'freelancing', 'contract', 'commission', 'client', 'dihaari', 'mazdoori', 'दिहाड़ी', 'मजदूरी', 'फ्रीलांस'],
      'Shop Sales': ['shop', 'sales', 'customer', 'item', 'sale', 'dukaan', 'dukan', 'दुकान', 'ग्राहक', 'बिक्री', 'गल्ला'],
      Salary: ['salary', 'wages', 'pay', 'payout', 'bank transfer', 'tankha', 'pagaar', 'तनख्वाह', 'पगार', 'सैलरी', 'महीना'],
      Fuel: ['fuel', 'petrol', 'diesel', 'gas', 'cng', 'filling', 'tel', 'तेल', 'पेट्रोल', 'डीजल', 'गैस', 'सीएनजी'],
      Food: ['food', 'lunch', 'dinner', 'breakfast', 'tea', 'chai', 'snacks', 'hotel', 'dhaba', 'khana', 'sabji', 'खाना', 'चाय', 'नाश्ता', 'सब्जी', 'होटल', 'समोसा', 'रोटी'],
      Recharge: ['recharge', 'phone', 'mobile', 'jio', 'airtel', 'net', 'internet', 'data', 'wifi', 'रिचार्ज', 'नेट', 'फोन'],
      Maintenance: ['maintenance', 'repair', 'service', 'puncture', 'oil', 'break', 'servicing', 'mechanic', 'gaadi', 'गाड़ी', 'रिपेयर', 'पंचर', 'सर्विस', 'मशीन'],
      Rent: ['rent', 'room rent', 'shop rent', 'garage', 'kiraya', 'किराया', 'रेंट', 'कमरा', 'मकान'],
      Shopping: ['shopping', 'clothes', 'market', 'mall', 'kapde', 'rashan', 'grocer', 'grocery', 'राशन', 'कपड़े', 'खरीदारी', 'बाजार']
    };

    let category = 'Other';
    for (const [catName, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => cleanText.includes(kw))) {
        category = catName;
        break;
      }
    }

    // 4. Extract Transaction Type (Income vs Expense)
    // Keywords indicating income
    const incomeKeywords = [
      'kamaye', 'income', 'mile', 'aaye', 'prapt', 'deposit', 'earning', 'earned', 'salary', 
      'कमाए', 'आए', 'जमा', 'कमाया', 'मिले', 'प्राप्त'
    ];
    // Keywords indicating expense
    const expenseKeywords = [
      'spent', 'kharch', 'diya', 'paid', 'spend', 'charge', 'cost', 'pay', 'charcha', 
      'खर्च', 'दिया', 'भुगतान', 'पे', 'गए', 'काटा', 'दिए'
    ];

    let type = 'expense'; // Default to expense
    let hasIncomeKeyword = incomeKeywords.some(kw => cleanText.includes(kw));
    let hasExpenseKeyword = expenseKeywords.some(kw => cleanText.includes(kw));

    if (hasIncomeKeyword && !hasExpenseKeyword) {
      type = 'income';
    } else if (hasExpenseKeyword && !hasIncomeKeyword) {
      type = 'expense';
    } else {
      // Inference based on category if no direct match
      const incomeCategories = ['Delivery', 'Ride', 'Freelancing', 'Shop Sales', 'Salary'];
      const expenseCategories = ['Fuel', 'Food', 'Recharge', 'Maintenance', 'Rent', 'Shopping'];
      
      if (incomeCategories.includes(category)) {
        type = 'income';
      } else if (expenseCategories.includes(category)) {
        type = 'expense';
      }
    }

    // If text mentions both "income" and "petrol" (like: "Aaj 500 income aur 150 petrol")
    // Let's optimize parsing: if numbers.length > 1, we can return the first, and perhaps hint to the UI.
    // For single transaction parsing, returning:
    return {
      amount: amount,
      category: category,
      type: type,
      date: date,
      description: text // Save full original transcription as description
    };
  }
};
