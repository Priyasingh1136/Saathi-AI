/**
 * Saathi AI - Settings View
 * Renders user configurations (Theme, Accent Color, Language, Notifications,
 * Voice Synthesis, and Gemini API Key authorization).
 */

import { Storage } from '../storage.js';

export const SettingsView = {
  render() {
    const settings = Storage.getSettings();
    const presets = ['#2563EB', '#10B981', '#8B5CF6', '#F97316', '#F43F5E'];

    const presetsHTML = presets.map(color => {
      const isActive = settings.themeColor === color;
      return `
        <div class="color-preset" data-color="${color}" 
          style="background-color: ${color}; width: 2rem; height: 2rem; border-radius: 50%; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; 
          box-shadow: ${isActive ? '0 0 0 2px var(--bg-card), 0 0 0 4px var(--primary)' : '0 0 0 1px rgba(0,0,0,0.1)'}; 
          transform: ${isActive ? 'scale(1.1)' : 'none'};">
        </div>
      `;
    }).join('');

    return `
      <div class="view-container animate-fade-in">
        <div class="view-header">
          <div class="view-header-title">
            <h1>Settings</h1>
            <p>Adjust language, theme accents, voice feedback, and AI credentials.</p>
          </div>
        </div>

        <div class="card settings-panel animate-slide-up">
          <div class="settings-group">
            <h3 style="font-size:1.1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; margin-bottom:0.5rem; color:var(--primary);">
              Preferences (प्राथमिकताएं)
            </h3>

            <!-- Language -->
            <div class="settings-row">
              <div class="settings-info">
                <span class="settings-label">Language (भाषा)</span>
                <span class="settings-desc">Choose primary voice recognition and UI language.</span>
              </div>
              <div class="settings-control">
                <select id="set-lang" class="form-control">
                  <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
                  <option value="hi" ${settings.language === 'hi' ? 'selected' : ''}>हिन्दी</option>
                  <option value="auto" ${settings.language === 'auto' ? 'selected' : ''}>Auto Detect (ऑटो)</option>
                </select>
              </div>
            </div>

            <!-- Dark Theme Toggle -->
            <div class="settings-row">
              <div class="settings-info">
                <span class="settings-label">Dark Theme (डार्क मोड)</span>
                <span class="settings-desc">Switch application layout colors.</span>
              </div>
              <div class="settings-control" style="text-align: right;">
                <label class="toggle-switch">
                  <input type="checkbox" id="set-theme" ${settings.theme === 'dark' ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <!-- Theme Accent Color Selector -->
            <div class="settings-row" style="flex-direction: column; align-items: flex-start; gap: 0.75rem;">
              <div class="settings-info">
                <span class="settings-label">Theme Accent Color (थीम का रंग)</span>
                <span class="settings-desc">Choose a primary highlight color for buttons, widgets, and streaks.</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; width: 100%; margin-top: 0.25rem;">
                <!-- Preset color circular rings -->
                <div id="presets-container" style="display: flex; gap: 0.75rem;">
                  ${presetsHTML}
                </div>

                <!-- Custom HTML5 Color Input -->
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-left: auto;">
                  <span style="font-size: 0.8rem; color: var(--text-muted);">Custom:</span>
                  <input type="color" id="custom-color-picker" value="${settings.themeColor}" 
                    style="width: 2.2rem; height: 2.2rem; border: none; border-radius: 4px; cursor: pointer; background: transparent;">
                </div>
              </div>
              
              <!-- Hidden input to store chosen hex color -->
              <input type="hidden" id="selected-theme-color" value="${settings.themeColor}">
            </div>

            <!-- Notifications Toggle -->
            <div class="settings-row">
              <div class="settings-info">
                <span class="settings-label">Push Alerts (सूचनाएं)</span>
                <span class="settings-desc">Show confirmation alerts upon speech parsing success.</span>
              </div>
              <div class="settings-control" style="text-align: right;">
                <label class="toggle-switch">
                  <input type="checkbox" id="set-notif" ${settings.notifications ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <!-- Voice Synthesis Response Toggle -->
            <div class="settings-row">
              <div class="settings-info">
                <span class="settings-label">Voice Read-back (आवाज उत्तर)</span>
                <span class="settings-desc">Let Saathi AI read responses aloud using text-to-speech.</span>
              </div>
              <div class="settings-control" style="text-align: right;">
                <label class="toggle-switch">
                  <input type="checkbox" id="set-voice" ${settings.voiceResponses ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="settings-group" style="margin-top: 1.5rem;">
            <h3 style="font-size:1.1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem; margin-bottom:0.5rem; color:var(--primary);">
              AI Configuration (एआई सेटअप)
            </h3>

            <!-- Gemini API Key -->
            <div class="settings-row" style="flex-direction: column; align-items: flex-start; gap: 0.75rem;">
              <div class="settings-info" style="max-width: 100%;">
                <span class="settings-label">Gemini API Key</span>
                <span class="settings-desc">
                  To enable smart financial conversations with live models, enter a Gemini API Key. 
                  Leave blank to continue using offline rules-based analysis.
                </span>
              </div>
              <div class="form-group" style="width: 100%; margin-bottom: 0; position: relative;">
                <input type="password" id="set-gemini-key" class="form-control" placeholder="AIzaSy..." value="${settings.geminiApiKey || ''}" style="padding-right: 40px; font-family: monospace;">
                <button type="button" id="btn-toggle-key-visibility" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background:none; border:none; cursor:pointer; color:var(--text-muted);">
                  <i class="lucide-eye"></i>
                </button>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
            <button id="btn-save-settings" class="btn btn-primary" style="min-width: 140px;">
              <i class="lucide-save"></i> Save Settings
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    this.setupSettingsActions();
  },

  setupSettingsActions() {
    const saveBtn = document.getElementById('btn-save-settings');
    const visibilityBtn = document.getElementById('btn-toggle-key-visibility');
    const keyInput = document.getElementById('set-gemini-key');

    const selectedColorInput = document.getElementById('selected-theme-color');
    const customColorPicker = document.getElementById('custom-color-picker');
    const colorPresets = document.querySelectorAll('.color-preset');

    // Preset color click handler
    colorPresets.forEach(preset => {
      preset.addEventListener('click', () => {
        const color = preset.getAttribute('data-color');
        selectedColorInput.value = color;
        customColorPicker.value = color;

        // Update rings visual
        colorPresets.forEach(p => {
          const isCurrent = p === preset;
          p.style.boxShadow = isCurrent ? '0 0 0 2px var(--bg-card), 0 0 0 4px var(--primary)' : '0 0 0 1px rgba(0,0,0,0.1)';
          p.style.transform = isCurrent ? 'scale(1.1)' : 'none';
        });
      });
    });

    // Custom color picker input listener
    if (customColorPicker) {
      customColorPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        selectedColorInput.value = color;

        // Clear active visual presets
        colorPresets.forEach(p => {
          p.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.1)';
          p.style.transform = 'none';
        });
      });
    }

    // Toggle Key Visibility
    if (visibilityBtn && keyInput) {
      visibilityBtn.addEventListener('click', () => {
        const isPassword = keyInput.type === 'password';
        keyInput.type = isPassword ? 'text' : 'password';
        const iconEl = visibilityBtn.querySelector('i');
        if (iconEl) {
          iconEl.className = isPassword ? 'lucide-eye-off' : 'lucide-eye';
        }
      });
    }

    // Save Action
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const lang = document.getElementById('set-lang').value;
        const themeChecked = document.getElementById('set-theme').checked;
        const notifChecked = document.getElementById('set-notif').checked;
        const voiceChecked = document.getElementById('set-voice').checked;
        const key = document.getElementById('set-gemini-key').value.trim();
        const themeColor = selectedColorInput.value;

        const updatedSettings = {
          language: lang,
          theme: themeChecked ? 'dark' : 'light',
          notifications: notifChecked,
          voiceResponses: voiceChecked,
          geminiApiKey: key,
          themeColor: themeColor
        };

        Storage.saveSettings(updatedSettings);

        // Apply dark class immediately
        if (updatedSettings.theme === 'dark') {
          document.body.classList.add('dark');
        } else {
          document.body.classList.remove('dark');
        }

        // Apply accent color immediately
        if (window.app && window.app.applyThemeColor) {
          window.app.applyThemeColor(themeColor);
        }

        window.app.notify("Success", "Settings updated successfully.", "success");
        await window.app.loadView('settings'); // Re-render settings view
      });
    }
  }
};
