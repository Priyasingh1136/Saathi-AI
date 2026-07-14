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
    const waveEl = document.getElementById('voice-wave-visual');

    if (!overlay || !previewBox) return;

    overlay.classList.add('active');
    previewBox.innerText = 'Speak now... (बोलिए...)';
    statusHint.innerText = 'Listening...';
    waveEl.classList.add('listening');

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
    const waveEl = document.getElementById('voice-wave-visual');
    if (overlay) overlay.classList.remove('active');
    if (waveEl) waveEl.classList.remove('listening');
    VoiceController.stop();
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
}

// Instantiate globally
window.app = new SaathiApp();
document.addEventListener('DOMContentLoaded', () => window.app.init());
export { SaathiApp };
