/**
 * Saathi AI - Core Application Entry & SPA Controller
 * Manages view routing, global notifications, audio overlays,
 * and AI Assistant interface integrations.
 */

import { Storage } from './storage.js';
import { VoiceController } from './voice.js';
import { AssistantController } from './assistant.js';

import { DashboardView } from './views/dashboard.js';
import { AddTransactionView } from './views/add_tx.js';
import { HistoryView } from './views/history.js';
import { GoalsView } from './views/goals.js';
import { InsightsView } from './views/insights.js';
import { SettingsView } from './views/settings.js';

class SaathiApp {
  constructor() {
    this.routes = {
      'dashboard': DashboardView,
      'add_tx': AddTransactionView,
      'history': HistoryView,
      'goals': GoalsView,
      'insights': InsightsView,
      'settings': SettingsView
    };
    this.activeView = 'dashboard';
  }

  init() {
    // 1. Initialize Storage (loads mock data if first time)
    Storage.init();

    // 2. Load Theme Settings
    const settings = Storage.getSettings();
    if (settings.theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }

    // 3. Register SPA Router
    window.addEventListener('hashchange', () => this.handleRouting());
    this.handleRouting(); // First load

    // 4. Bind Global Components
    this.setupAssistant();
    this.setupGlobalVoiceOverlay();
    this.setupWhatsAppSimulator();
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // SPA Route Resolver
  handleRouting() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.loadView(hash);
  }

  loadView(route) {
    const view = this.routes[route];
    if (!view) {
      console.error(`Route "${route}" not found. Redirecting to dashboard.`);
      window.location.hash = '#dashboard';
      return;
    }

    this.activeView = route;
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.innerHTML = view.render();
      if (window.lucide) {
        window.lucide.createIcons();
      }
      view.init();
    }

    this.updateNavigationVisuals(route);
  }

  updateNavigationVisuals(route) {
    // Update both Sidebar (desktop) and Bottom Nav (mobile) active indicators
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${route}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // --- GLOBAL TOAST NOTIFICATIONS ---
  notify(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Type mappings
    const icons = {
      success: 'lucide-check-circle-2',
      warning: 'lucide-alert-triangle',
      error: 'lucide-x-circle',
      info: 'lucide-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
      <i class="${icons[type] || icons.info}"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close"><i class="lucide-x"></i></button>
      <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    // Dismiss button click
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => toast.remove());

    // Progress bar animation & automatic removal
    const progressEl = toast.querySelector('.toast-progress');
    let width = 100;
    const interval = 30; // Milliseconds
    const duration = 4000; // 4 Seconds
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      width -= step;
      if (width <= 0) {
        clearInterval(timer);
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(15px)';
        setTimeout(() => toast.remove(), 300);
      } else {
        progressEl.style.width = `${width}%`;
      }
    }, interval);
  }

  // --- SPEECH INPUT GLOBAL OVERLAY MANAGER ---
  startVoiceInput(onSuccess, languageCode = 'en-IN') {
    const overlay = document.getElementById('voice-overlay');
    const previewBox = document.getElementById('voice-preview-text');
    const statusHint = document.getElementById('voice-status-title');

    if (!overlay || !previewBox) return;

    overlay.classList.add('active');
    previewBox.innerText = 'Speak now... (बोलिए...)';
    statusHint.innerText = 'Listening...';
    
    // Start canvas wave loops
    this.startWaveAnimation();

    let transcriptResult = '';

    // Initialize SpeechRecognition from voice.js
    const isSupported = VoiceController.init({
      onStart: () => {
        statusHint.innerText = 'Listening (सुन रहा हूँ...)';
      },
      onResult: (res) => {
        transcriptResult = res.final || res.interim;
        previewBox.innerText = transcriptResult;
      },
      onError: (msg) => {
        this.notify("Voice Input Error", msg, "error");
        this.closeVoiceOverlay();
      },
      onEnd: () => {
        this.closeVoiceOverlay();
        if (transcriptResult) {
          onSuccess(transcriptResult);
        }
      }
    });

    if (!isSupported) {
      this.notify("Speech Not Supported", "Speech recognition is not available in this browser. Please type manually.", "warning");
      overlay.classList.remove('active');
      return;
    }

    VoiceController.start(languageCode);
  }

  closeVoiceOverlay() {
    const overlay = document.getElementById('voice-overlay');
    if (overlay) overlay.classList.remove('active');
    this.stopWaveAnimation();
    VoiceController.stop();
  }

  startWaveAnimation() {
    const canvas = document.getElementById('voice-wave-canvas');
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    let phase = 0;
    this.waveAnimating = true;

    const draw = () => {
      if (!this.waveAnimating) return;
      ctx.clearRect(0, 0, width, height);

      // Draw 3 layers of overlapping sinus waves with varied HSL opacities
      const waves = [
        { color: 'rgba(37, 99, 235, 0.45)', amplitude: 18, frequency: 0.025, speed: 0.08 },  // Primary Blue
        { color: 'rgba(16, 185, 129, 0.45)', amplitude: 12, frequency: 0.04, speed: -0.06 },  // Secondary Green
        { color: 'rgba(245, 158, 11, 0.35)', amplitude: 8, frequency: 0.015, speed: 0.1 }     // Accent Gold
      ];

      waves.forEach(w => {
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 2;
        
        for (let x = 0; x < width; x++) {
          // Envelope calculation to taper wave edges
          const envelope = Math.sin((x / width) * Math.PI);
          const y = Math.sin(x * w.frequency + phase) * w.amplitude * envelope + (height / 2);
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      phase += 0.12;
      this.waveAnimationId = requestAnimationFrame(draw);
    };

    draw();
  }

  stopWaveAnimation() {
    this.waveAnimating = false;
    if (this.waveAnimationId) {
      cancelAnimationFrame(this.waveAnimationId);
    }
  }

  setupGlobalVoiceOverlay() {
    const overlayClose = document.getElementById('voice-overlay-close');
    if (overlayClose) {
      overlayClose.addEventListener('click', () => this.closeVoiceOverlay());
    }
  }

  // --- FLOATING AI ASSISTANT (CHAT) ---
  setupAssistant() {
    const assistantBtn = document.getElementById('assistant-btn');
    const assistantDialog = document.getElementById('assistant-dialog');
    const assistantClose = document.getElementById('assistant-close');
    const sendBtn = document.getElementById('assistant-send-btn');
    const msgInput = document.getElementById('assistant-msg-input');
    const chatMicBtn = document.getElementById('assistant-chat-mic-btn');
    const messagesContainer = document.getElementById('assistant-messages-container');
    const badgeEl = document.getElementById('assistant-model-badge');

    if (!assistantBtn || !assistantDialog) return;

    // Toggle dialog visibility
    assistantBtn.addEventListener('click', () => {
      const isActive = assistantDialog.classList.toggle('active');
      if (isActive) {
        msgInput.focus();
        this.updateAssistantHeaderBadge();
        // Add initial greeting if empty
        if (messagesContainer && messagesContainer.children.length === 0) {
          this.appendAssistantMessage('bot', "Namaste! Main Saathi AI hu. Main aapki financial help kaise kar sakta hu?");
        }
      }
    });

    if (assistantClose) {
      assistantClose.addEventListener('click', () => assistantDialog.classList.remove('active'));
    }

    // Send Message on click or Enter key
    const triggerSendMessage = () => {
      const text = msgInput.value.trim();
      if (!text) return;
      msgInput.value = '';
      this.handleAssistantConversation(text);
    };

    if (sendBtn) {
      sendBtn.addEventListener('click', triggerSendMessage);
    }
    if (msgInput) {
      msgInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          triggerSendMessage();
        }
      });
    }

    // Microphone in Chat input
    if (chatMicBtn) {
      chatMicBtn.addEventListener('click', () => {
        const settings = Storage.getSettings();
        const lang = settings.language === 'hi' ? 'hi-IN' : 'en-IN';
        
        chatMicBtn.classList.add('listening');
        
        this.startVoiceInput((transcript) => {
          chatMicBtn.classList.remove('listening');
          if (transcript) {
            msgInput.value = transcript;
            triggerSendMessage(); // auto send transcribed text
          }
        }, lang);
      });
    }

    // API Key click warning
    if (badgeEl) {
      badgeEl.addEventListener('click', () => {
        window.location.hash = '#settings';
        assistantDialog.classList.remove('active');
        this.notify("API Config", "Enter a Gemini API key in settings to enable live model reasoning.", "info");
      });
    }
  }

  updateAssistantHeaderBadge() {
    const badgeEl = document.getElementById('assistant-model-badge');
    if (!badgeEl) return;

    const isGemini = AssistantController.isGeminiEnabled();
    if (isGemini) {
      badgeEl.className = 'assistant-model-badge gemini-live';
      badgeEl.innerHTML = `<i class="lucide-sparkles"></i> Gemini Live`;
    } else {
      badgeEl.className = 'assistant-model-badge';
      badgeEl.innerHTML = `<i class="lucide-cpu"></i> Local Fallback`;
    }
  }

  async handleAssistantConversation(userText) {
    // 1. Render User Message
    this.appendAssistantMessage('user', userText);

    // 2. Render Typing Placeholder
    const typingBubble = this.appendAssistantMessage('bot', `<i class="lucide-loader-2" style="animation: spin 1s infinite linear; margin-right: 0.25rem;"></i> Saathi AI is processing...`);

    // 3. Process AI Response
    try {
      const response = await AssistantController.sendMessage(userText);
      
      // Remove typing bubble and append actual bot response
      typingBubble.remove();
      this.appendAssistantMessage('bot', response);

      // 4. Voice Readback if configured
      const settings = Storage.getSettings();
      if (settings.voiceResponses && window.speechSynthesis) {
        // Cancel ongoing readback
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(response);
        // Identify Hindi/English voice matches
        const voices = window.speechSynthesis.getVoices();
        const hiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
        if (hiVoice) utterance.voice = hiVoice;
        
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      typingBubble.remove();
      this.appendAssistantMessage('bot', "Sorry, I encountered an issue responding. Please try again.");
    }
  }

  appendAssistantMessage(sender, htmlText) {
    const container = document.getElementById('assistant-messages-container');
    if (!container) return null;

    const bubble = document.createElement('div');
    bubble.className = `assistant-msg ${sender}`;
    bubble.innerHTML = htmlText;

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight; // Scroll to bottom
    return bubble;
  }

  // --- WHATSAPP SIMULATOR INTEGRATION ---
  setupWhatsAppSimulator() {
    const waBtn = document.getElementById('whatsapp-btn');
    const waDialog = document.getElementById('whatsapp-dialog');
    const waClose = document.getElementById('whatsapp-close');
    const sendBtn = document.getElementById('whatsapp-send-btn');
    const msgInput = document.getElementById('whatsapp-msg-input');
    const messagesContainer = document.getElementById('whatsapp-messages-container');

    if (!waBtn || !waDialog) return;

    waBtn.addEventListener('click', () => {
      const isActive = waDialog.classList.toggle('active');
      if (isActive) {
        msgInput.focus();
        if (messagesContainer && messagesContainer.children.length === 0) {
          this.appendWhatsAppMessage('bot', "Ram Ram partner! Main Saathi Bot hu. WhatsApp par transaction record karne ke liye yahan message karein. <br><br>Jaise: <b>'spent 250 on fuel'</b> ya <b>'850 earning Swiggy'</b>. Try kijiye!");
        }
      }
    });

    if (waClose) {
      waClose.addEventListener('click', () => waDialog.classList.remove('active'));
    }

    const triggerSendMessage = () => {
      const text = msgInput.value.trim();
      if (!text) return;
      msgInput.value = '';
      this.handleWhatsAppConversation(text);
    };

    if (sendBtn) {
      sendBtn.addEventListener('click', triggerSendMessage);
    }
    if (msgInput) {
      msgInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          triggerSendMessage();
        }
      });
    }
  }

  handleWhatsAppConversation(text) {
    // 1. Append user message
    this.appendWhatsAppMessage('user', text);

    // 2. Parse message command after short simulated typing latency
    setTimeout(() => {
      const parsed = VoiceController.parseCommand(text);
      let reply = '';
      
      if (parsed && parsed.amount) {
        // Save
        Storage.saveTransaction(parsed);
        
        const typeHindi = parsed.type === 'income' ? 'कमाई (Income)' : 'खर्च (Expense)';
        reply = `Theek hai partner! Main aapki <b>₹${parsed.amount}</b> ki ${parsed.category} ${typeHindi} entry record kar li hai. 👍<br><br><i>Tariq: ${parsed.date}</i>`;
        
        this.notify("WhatsApp Logged", `Recorded ₹${parsed.amount} ${parsed.category} successfully.`, "success");
        
        // Refresh current active view if it's dashboard or history
        if (this.activeView === 'dashboard' || this.activeView === 'history') {
          this.loadView(this.activeView);
        }
      } else {
        reply = "Maaf kijiyega partner, mujhe details samajh nahi aayi. Kripya is tarah likhein: <br>• <i>'850 kamaye delivery se'</i><br>• <i>'Spent 200 on petrol'</i>";
        this.notify("Parse Warning", "Failed to extract amount or category.", "warning");
      }

      this.appendWhatsAppMessage('bot', reply);
    }, 800);
  }

  appendWhatsAppMessage(sender, htmlText) {
    const container = document.getElementById('whatsapp-messages-container');
    if (!container) return null;

    const bubble = document.createElement('div');
    bubble.className = `wa-msg ${sender}`;
    
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // Add blue double checkmarks tick indicator for user message
    const ticks = sender === 'user' ? ' <i class="lucide-check-check" style="font-size:0.75rem; color:#53bdeb; display:inline-block; vertical-align:middle; margin-left: 2px;"></i>' : '';
    
    bubble.innerHTML = `
      <span>${htmlText}</span>
      <span class="wa-msg-meta">${timeStr}${ticks}</span>
    `;

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    
    // Trigger Lucide updates for check-check checkmark icons
    if (window.lucide) window.lucide.createIcons();
    
    return bubble;
  }
}

// Instantiate globally
window.app = new SaathiApp();
document.addEventListener('DOMContentLoaded', () => window.app.init());
export { SaathiApp };
