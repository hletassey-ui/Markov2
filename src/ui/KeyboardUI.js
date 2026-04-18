/**
 * KeyboardUI.js
 * Interface style iPhone iMessage — réécrit avec Ramda.
 */

import * as R from 'ramda';

// ── Helpers purs ──────────────────────────────────────────────────────────────

const escapeHTML = R.pipe(
  R.replace(/&/g, '&amp;'),
  R.replace(/</g, '&lt;'),
  R.replace(/>/g, '&gt;'),
);

const $ = id => document.getElementById(id);

const currentTime = () => {
  const now = new Date();
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// Reconstruit la valeur de l'input après insertion d'une suggestion
const buildNewValue = R.curry((endsWithSpace, words, word) => {
  if (!endsWithSpace && !R.isEmpty(words)) {
    return R.join(' ', R.adjust(-1, R.always(word), words)) + ' ';
  }
  return R.join('', [R.join(' ', words), word, ' ']);
});

// ── Classe ────────────────────────────────────────────────────────────────────

export class KeyboardUI {
  constructor(container) {
    this.container           = container;
    this._onInput            = null;
    this._onSuggestionClick  = null;
    this._onSubmit           = null;
    this._currentSuggestions = [];

    this._render();
    this._bindEvents();
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────

  _render() {
    this.container.innerHTML = `
      <div class="iphone-shell">
        <div class="iphone-status-bar">
          <span class="status-time" id="status-time">${currentTime()}</span>
          <div class="status-icons">
            <svg width="17" height="12" viewBox="0 0 17 12"><rect x="0" y="3" width="3" height="9" rx="1" fill="currentColor" opacity="0.4"/><rect x="4.5" y="2" width="3" height="10" rx="1" fill="currentColor" opacity="0.6"/><rect x="9" y="0" width="3" height="12" rx="1" fill="currentColor" opacity="0.8"/><rect x="13.5" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>
            <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.4C5.6 2.4 3.4 3.4 1.9 5L0 3C2 1.1 4.9 0 8 0s6 1.1 8 3l-1.9 2C12.6 3.4 10.4 2.4 8 2.4z" fill="currentColor" opacity="0.4"/><path d="M8 5.6c-1.6 0-3 .7-4 1.7L2 5.2C3.5 3.8 5.6 3 8 3s4.5.8 6 2.2L12 7.3C11 6.3 9.6 5.6 8 5.6z" fill="currentColor" opacity="0.7"/><path d="M8 8.8c-.8 0-1.5.3-2 .8L4 7.6C5 6.6 6.4 6 8 6s3 .6 4 1.6l-2 2c-.5-.5-1.2-.8-2-.8z" fill="currentColor" opacity="0.9"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/></svg>
            <div class="battery-icon"><div class="battery-body"><div class="battery-level"></div></div><div class="battery-tip"></div></div>
          </div>
        </div>

        <div class="iphone-header">
          <button class="back-btn">
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none"><path d="M9 1L1 8.5L9 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="back-count">1</span>
          </button>
          <div class="contact-info">
            <div class="contact-avatar">M</div>
            <div class="contact-meta">
              <span class="contact-name">MarkovBot</span>
              <span class="contact-status" id="contact-status">En train d'écrire…</span>
            </div>
          </div>
          <div class="header-actions">
            <button class="icon-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.32 9.72a19.79 19.79 0 01-3.07-8.63A2 2 0 012.24 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.16 6.16l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            <button class="icon-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>

        <div class="messages-area" id="messages-area">
          <div class="date-label">Aujourd'hui</div>
          <div class="message-row received">
            <div class="bubble received">Salut ! Tape quelque chose, le modèle Markov va prédire tes prochains mots 🤖</div>
          </div>
        </div>

        <div class="suggestions-bar" id="suggestions-bar">
          <button class="suggestion-btn" id="sug-0" data-i="0"></button>
          <div class="suggestion-divider"></div>
          <button class="suggestion-btn active" id="sug-1" data-i="1"></button>
          <div class="suggestion-divider"></div>
          <button class="suggestion-btn" id="sug-2" data-i="2"></button>
        </div>

        <div class="input-row">
          <button class="circle-btn app-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          <div class="text-input-wrap">
            <textarea id="main-input" class="main-input" placeholder="iMessage" rows="1" autocomplete="off" spellcheck="false"></textarea>
          </div>
          <button class="circle-btn send-btn" id="btn-send">
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </button>
        </div>

        <div class="loading-overlay" id="loading-overlay">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p class="loading-text" id="loading-text">Chargement du modèle…</p>
            <div class="loading-bar-track"><div class="loading-bar-fill" id="loading-bar"></div></div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Événements ───────────────────────────────────────────────────────────────

  _bindEvents() {
    const input   = $('main-input');
    const btnSend = $('btn-send');

    input.addEventListener('input', () => {
      this._autoResize(input);
      this._updateSendBtn(input.value);
      if (this._onInput) this._onInput(input.value);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._triggerSubmit();
      }
    });

    btnSend.addEventListener('click', () => this._triggerSubmit());

    // Bind des 3 boutons de suggestion avec R.forEach
    R.forEach(i => {
      $(`sug-${i}`).addEventListener('click', () => {
        const s = this._currentSuggestions[i];
        if (s && this._onSuggestionClick) this._onSuggestionClick(s);
      });
    }, R.range(0, 3));

    // Horloge
    this._updateClock();
    setInterval(() => this._updateClock(), 30000);
  }

  _updateClock() {
    const el = $('status-time');
    if (el) el.textContent = currentTime();
  }

  _triggerSubmit() {
    const input = $('main-input');
    const text  = R.trim(input.value);
    if (R.isEmpty(text)) return;
    if (this._onSubmit) this._onSubmit(text);
  }

  _autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
  }

  _updateSendBtn(value) {
    $('btn-send').classList.toggle('has-text', !R.isEmpty(R.trim(value)));
  }

  // ── API callbacks ─────────────────────────────────────────────────────────────

  onInput(fn)           { this._onInput           = fn; }
  onSuggestionClick(fn) { this._onSuggestionClick = fn; }
  onSubmit(fn)          { this._onSubmit          = fn; }

  // ── Affichage suggestions ────────────────────────────────────────────────────

  showSuggestions({ suggestions }) {
    this._currentSuggestions = suggestions;

    R.forEach(i => {
      const btn = $(`sug-${i}`);
      const s   = suggestions[i];
      if (s) {
        btn.textContent = s.word;
        btn.classList.toggle('active', i === 1);
        btn.classList.remove('empty');
      } else {
        btn.textContent = '';
        btn.classList.add('empty');
      }
    }, R.range(0, 3));
  }

  insertSuggestion(suggestion) {
    const input         = $('main-input');
    const value         = input.value;
    const endsWithSpace = R.endsWith(' ', value);
    const words         = R.reject(R.isEmpty, R.split(/\s+/, R.trimCharsStart(' ', value)));
    const newValue      = buildNewValue(endsWithSpace, words, suggestion.word);

    input.value = newValue;
    input.focus();
    input.setSelectionRange(newValue.length, newValue.length);
    this._autoResize(input);
    this._updateSendBtn(newValue);
    if (this._onInput) this._onInput(newValue);
  }

  clearInput() {
    const input    = $('main-input');
    input.value    = '';
    input.style.height = 'auto';
    this._updateSendBtn('');
    this.showSuggestions({ suggestions: [] });
  }

  addMessage(text) {
    const area = $('messages-area');
    const row  = document.createElement('div');
    row.className   = 'message-row sent';
    row.innerHTML   = `<div class="bubble sent">${escapeHTML(text)}</div>`;
    area.appendChild(row);
    area.scrollTop = area.scrollHeight;
  }

  addReceivedMessage(text) {
    const area = $('messages-area');
    const row  = document.createElement('div');
    row.className = 'message-row received';
    row.innerHTML = `<div class="bubble received">${escapeHTML(text)}</div>`;
    area.appendChild(row);
    area.scrollTop = area.scrollHeight;
  }

  setStatus(_, text) {
    const el = $('contact-status');
    if (el) el.textContent = text;
  }

  setLoadingProgress(done, total, filename) {
    const bar = $('loading-bar');
    const txt = $('loading-text');
    if (bar) bar.style.width = `${Math.round((done / total) * 100)}%`;
    if (txt) txt.textContent = `Chargement ${done}/${total} : ${filename}`;
  }

  hideLoading() {
    const overlay = $('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  showLoading(text = 'Chargement du modèle…') {
    const overlay = $('loading-overlay');
    const txt     = $('loading-text');
    if (overlay) overlay.classList.remove('hidden');
    if (txt)     txt.textContent = text;
  }
}
