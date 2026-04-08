// setup.js — Onboarding and GitHub connection flow
import { GH, state } from './state.js';
import { api } from './api.js';
import { ui } from './ui.js';

const LANG = {
  en: {
    title: 'Get started with Unmuted',
    sub: 'Your music lives on your own free GitHub account. Just paste a token and we handle everything else.',
    stepsTitle: 'Host your music using GitHub',
    step1: 'Follow <a href="https://github.com/settings/tokens/new?description=Unmuted&scopes=repo&default_expires_at=none" target="_blank">this link</a> and create a free account',
    step2: 'Once you\'re in, scroll down and tap <strong>Generate token</strong>',
    step3: 'Copy the token and paste it below',
    tokenLabel: 'Paste your token here',
    connectBtn: 'Create dashboard',
    invalidToken: 'Token is invalid.',
    progVerify: 'Verifying token...',
    progRepo: 'Checking repository...',
    progCreate: 'Creating repository...',
    progInit: 'Initializing artist page...',
    progSingles: 'Setting up singles...',
    progPages: 'Enabling GitHub Pages...',
    progDone: 'All done!',
    doneTitle: 'Almost there...',
    urlLabel: 'Your dashboard URL',
    bookmarkHint: 'Keep this link safe!',
    countdownMsg: 'Setting up GitHub Pages...',
    liveMsg: 'Your page is live!'
  },
  es: {
    title: 'Empieza con Unmuted',
    sub: 'Tu música vive en tu propia cuenta gratuita de GitHub.',
    stepsTitle: 'Aloja tu música en GitHub',
    step1: 'Sigue <a href="https://github.com/settings/tokens/new?description=Unmuted&scopes=repo&default_expires_at=none" target="_blank">este enlace</a> y crea una cuenta gratuita',
    step2: 'Baja y toca <strong>Generate token</strong>',
    step3: 'Copia el token y pégalo abajo',
    tokenLabel: 'Pega tu token aquí',
    connectBtn: 'Crear mi panel',
    invalidToken: 'Token no válido.',
    progVerify: 'Verificando token...',
    progRepo: 'Revisando repositorio...',
    progCreate: 'Creando repositorio...',
    progInit: 'Inicializando página...',
    progSingles: 'Configurando singles...',
    progPages: 'Activando GitHub Pages...',
    progDone: '¡Todo listo!',
    doneTitle: 'Ya casi...',
    urlLabel: 'URL de tu panel',
    bookmarkHint: '¡Guarda este enlace!',
    countdownMsg: 'Configurando GitHub Pages...',
    liveMsg: '¡Tu página está lista!'
  }
};

let currentLang = 'en';
let countdownInterval = null;
let pollInterval = null;

export const setup = {
  show() {
    document.getElementById('setup-screen').style.display = 'flex';
    document.getElementById('main-layout').style.display = 'none';
    this.renderStep1();
  },

  setLang(lang) {
    currentLang = lang;
    const L = LANG[lang];
    document.getElementById('setup-title').textContent = L.title;
    document.getElementById('setup-sub').textContent = L.sub;
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.id === `lang-${lang}`);
    });
    this.renderStep1();
  },

  renderStep1() {
    const L = LANG[currentLang];
    const container = document.getElementById('setup-step-1');
    container.innerHTML = `
      <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:16px;margin-bottom:20px;text-align:left">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px">${L.stepsTitle}</div>
        <div class="setup-steps">
          <div class="setup-step"><div class="setup-step-num">1</div><div>${L.step1}</div></div>
          <div class="setup-step"><div class="setup-step-num">2</div><div>${L.step2}</div></div>
          <div class="setup-step"><div class="setup-step-num">3</div><div>${L.step3}</div></div>
        </div>
      </div>
      <div class="field">
        <label class="label">${L.tokenLabel}</label>
        <input class="input" id="token-input" type="text" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" style="-webkit-text-security:disc;font-family:monospace">
      </div>
      <div class="alert alert-danger" id="setup-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span id="setup-error-msg"></span></div>
      <button class="btn btn-primary" id="setup-connect-btn" style="width:100%;justify-content:center">${L.connectBtn}</button>
    `;
    document.getElementById('setup-connect-btn').onclick = () => this.connect();
    document.getElementById('token-input').onkeydown = e => { if (e.key === 'Enter') this.connect(); };
    document.getElementById('setup-step-2').style.display = 'none';
    document.getElementById('setup-step-3').style.display = 'none';
  },

  renderStep2() {
    const L = LANG[currentLang];
    const container = document.getElementById('setup-step-2');
    container.innerHTML = `
      <div style="margin-bottom:20px">
        <div class="spin" style="width:32px;height:32px;border-width:3px;margin:0 auto 16px"></div>
        <div id="setup-progress-msg" style="font-size:14px;font-weight:600">${L.progVerify}</div>
        <div id="setup-progress-sub" style="font-size:12px;color:var(--text3);margin-top:6px"></div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:4px;margin-bottom:8px">
        <div id="setup-progress-bar" style="height:6px;background:var(--accent);border-radius:4px;width:0%;transition:width .4s"></div>
      </div>
    `;
  },

  renderStep3(username) {
    const L = LANG[currentLang];
    const container = document.getElementById('setup-step-3');
    const dashboardUrl = `https://${username}.github.io/${GH.repo}/`;
    container.innerHTML = `
      <div style="width:60px;height:60px;background:var(--green-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;border:1px solid var(--green-border)">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div style="font-size:18px;font-weight:700;margin-bottom:6px">${L.doneTitle}</div>
      <div id="setup-done-msg" style="font-size:13px;color:var(--text2);margin-bottom:16px">${currentLang === 'es' ? 'Tu panel estará listo en menos de 2 minutos.' : 'Your dashboard will be ready in less than 2 minutes.'}</div>
      <div id="setup-url-box" style="background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-xs);padding:10px 12px;margin-bottom:16px;text-align:left">
        <div style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.07em;text-transform:uppercase;margin-bottom:6px">${L.urlLabel}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span id="setup-url-text" style="font-size:12px;color:var(--accent2);font-family:monospace;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${dashboardUrl}</span>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="navigator.clipboard.writeText('${dashboardUrl}')">📋</button>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:6px">${L.bookmarkHint}</div>
      </div>
      <div id="setup-countdown-box">
        <div style="font-size:12px;color:var(--text3);margin-bottom:8px">${L.countdownMsg}</div>
        <div style="background:var(--bg3);border-radius:4px;height:6px;overflow:hidden">
          <div id="setup-countdown-bar" style="height:100%;background:var(--accent);border-radius:4px;width:0%;transition:width 1s linear"></div>
        </div>
        <div id="setup-countdown-timer" style="font-size:11px;color:var(--text3);margin-top:6px"></div>
      </div>
    `;
    this.startRedirectCountdown(dashboardUrl);
  },

  async connect() {
    const token = document.getElementById('token-input').value.trim();
    const errEl = document.getElementById('setup-error');
    const errMsg = document.getElementById('setup-error-msg');
    errEl.classList.remove('on');
    if (!token) { errMsg.textContent = 'Please paste your token.'; errEl.classList.add('on'); return; }

    const btn = document.getElementById('setup-connect-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spin"></div> Verifying...';
    const L = LANG[currentLang];

    try {
      // Verify token
      this.setProgress(10, L.progVerify, '');
      const userR = await fetch('https://api.github.com/user', { headers: { Authorization: 'token ' + token } });
      if (userR.status === 401) throw new Error(L.invalidToken);
      if (!userR.ok) throw new Error('GitHub error ' + userR.status);
      const userData = await userR.json();
      const username = userData.login;
      const repo = 'music';

      document.getElementById('setup-step-1').style.display = 'none';
      document.getElementById('setup-step-2').style.display = 'block';
      this.renderStep2();

      this.setProgress(20, L.progRepo, '@' + username);
      const repoR = await fetch(`https://api.github.com/repos/${username}/${repo}`, { headers: { Authorization: 'token ' + token } });
      let isNewRepo = false;

      if (repoR.status === 404) {
        this.setProgress(35, L.progCreate, username + '/' + repo);
        const createR = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: repo, description: 'My Unmuted music page', private: false, auto_init: true })
        });
        if (!createR.ok) throw new Error('Could not create repo');
        isNewRepo = true;
        await new Promise(r => setTimeout(r, 1500));
      } else if (!repoR.ok) throw new Error('Cannot access repository.');

      GH.token = token;
      GH.username = username;
      GH.repo = repo;
      localStorage.setItem('un_dash_token', token);
      localStorage.setItem('un_dash_user', username);
      localStorage.setItem('un_dash_repo', repo);

      if (isNewRepo) {
        this.setProgress(55, L.progInit, '');
        const artistJson = JSON.stringify({ schema: 'unmuted/v1', name: '', bio: '', location: '', avatar: 'avatar.jpg', links: {}, releases: ['singles/singles.json'], recommendations: [] }, null, 2);
        await api.putFile('artist.json', artistJson, null, 'Init Unmuted');

        this.setProgress(65, L.progSingles, '');
        const singlesJson = JSON.stringify({ title: 'Singles', type: 'singles', tracks: [] }, null, 2);
        await api.putFile('singles/singles.json', singlesJson, null, 'Init singles');

        this.setProgress(75, 'Uploading dashboard...', '');
        const dashboardHtml = '<!DOCTYPE html>' + document.documentElement.outerHTML;
        await api.putFile('index.html', dashboardHtml, null, 'Add dashboard');

        this.setProgress(88, L.progPages, '');
        try {
          await fetch(`https://api.github.com/repos/${username}/${repo}/pages`, {
            method: 'POST',
            headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: { branch: 'main', path: '/' } })
          });
        } catch (e) {}
      }

      this.setProgress(100, L.progDone, '');
      document.getElementById('setup-step-2').style.display = 'none';
      document.getElementById('setup-step-3').style.display = 'block';
      this.renderStep3(username);

    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = L.connectBtn;
      document.getElementById('setup-step-1').style.display = 'block';
      document.getElementById('setup-step-2').style.display = 'none';
      errMsg.textContent = e.message;
      errEl.classList.add('on');
    }
  },

  setProgress(pct, msg, sub) {
    const bar = document.getElementById('setup-progress-bar');
    const msgEl = document.getElementById('setup-progress-msg');
    const subEl = document.getElementById('setup-progress-sub');
    if (bar) bar.style.width = pct + '%';
    if (msgEl) msgEl.textContent = msg;
    if (subEl) subEl.textContent = sub || '';
  },

  startRedirectCountdown(url) {
    const TOTAL = 120;
    let elapsed = 0;
    countdownInterval = setInterval(() => {
      elapsed++;
      const pct = Math.min((elapsed / TOTAL) * 100, 99);
      const bar = document.getElementById('setup-countdown-bar');
      if (bar) bar.style.width = pct + '%';
      const remaining = TOTAL - elapsed;
      const timer = document.getElementById('setup-countdown-timer');
      if (timer) timer.textContent = `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
      if (elapsed >= TOTAL) {
        clearInterval(countdownInterval);
        this.redirect(url);
      }
    }, 1000);

    pollInterval = setInterval(async () => {
      try {
        const r = await fetch(url, { method: 'HEAD' });
        if (r.ok) {
          clearInterval(pollInterval);
          clearInterval(countdownInterval);
          this.redirect(url);
        }
      } catch (e) {}
    }, 10000);
  },

  redirect(url) {
    const creds = btoa(JSON.stringify({ t: GH.token, u: GH.username, r: GH.repo }));
    window.location.href = url + '#unmuted-setup=' + creds;
  }
};

window.setLang = (lang) => setup.setLang(lang);