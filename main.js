// main.js — Unmuted Dashboard Entry Point
import { GH, state, loadState, saveState } from './state.js';
import { api } from './api.js';
import { ui } from './ui.js';
import { setup } from './setup.js';
import { releases } from './releases.js';

// Bootstrap
async function boot() {
  // Check URL hash for cross-domain setup
  const hash = location.hash;
  if (hash.startsWith('#unmuted-setup=')) {
    try {
      const creds = JSON.parse(atob(hash.slice('#unmuted-setup='.length)));
      if (creds.t && creds.u) {
        localStorage.setItem('un_dash_token', creds.t);
        localStorage.setItem('un_dash_user', creds.u);
        localStorage.setItem('un_dash_repo', creds.r || 'music');
        GH.token = creds.t;
        GH.username = creds.u;
        GH.repo = creds.r || 'music';
        history.replaceState(null, '', location.pathname);
      }
    } catch (e) {}
  }

  if (GH.token && GH.username) {
    ui.showMain();
    await loadData();
  } else {
    setup.show();
  }
}

async function loadData() {
  ui.setSaveStatus('loading', 'Loading...');
  try {
    // Load artist.json
    const af = await api.getFile('artist.json');
    state.artistData = { ...JSON.parse(atob(af.content.replace(/\n/g, ''))), _sha: af.sha };

    // Load releases from paths
    const albumPaths = state.artistData.releases || [];
    state.releases = [];
    for (const p of albumPaths) {
      try {
        const rf = await api.getFile(p);
        const rd = JSON.parse(atob(rf.content.replace(/\n/g, '')));
        const id = p.replace(/\//g, '-').replace('.json', '');
        state.releases.push({ id, type: rd.type || releases.guessType(p, rd), data: rd, path: p, _sha: rf.sha });
      } catch (e) { console.warn('Could not load', p, e); }
    }

    // Load avatar
    try {
      const img = await api.getFile('avatar.jpg');
      const b64 = img.content.replace(/\n/g, '');
      state.pendingUploads['avatar'] = { sha: img.sha, _b64cache: b64 };
      ui.showImgPreview('avatar', `data:image/jpeg;base64,${b64}`);
    } catch (e) {}

    // Ensure singles release exists
    await releases.ensureSingles();

    ui.populateProfile(state.artistData);
    ui.renderReleasesNav();
    ui.setSaveStatus('', '');
  } catch (e) {
    ui.setSaveStatus('', '');
    ui.toast('Error loading: ' + e.message, 'danger');
  }
}

// Global functions (called from HTML)
window.showSection = ui.showSection;
window.showRelease = ui.showRelease;
window.openNewReleaseModal = () => ui.modal.open('new-release');
window.closeNewReleaseModal = () => ui.modal.close('new-release');
window.createRelease = (type) => releases.create(type);
window.deleteRelease = (id) => releases.deleteRelease(id);
window.saveAll = () => releases.saveAll();
window.markDirty = () => ui.markDirty();
window.copyDeepLink = ui.copyDeepLink;
window.openMyPage = ui.openMyPage;
window.connectGitHub = setup.connect;
window.setLang = setup.setLang;

// Start
boot();