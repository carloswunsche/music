// releases.js — Release management, track handling, and saving
import { state, GH, markDirty, clearDirty } from './state.js';
import { api } from './api.js';
import { ui } from './ui.js';

const GH_MAX_BYTES = 25 * 1024 * 1024;
const GH_WARN_BYTES = 10 * 1024 * 1024;

export const releases = {
  guessType(path, data) {
    if (data.type) return data.type;
    if (path.includes('singles')) return 'singles';
    if (path.includes('playlist')) return 'playlist';
    return 'album';
  },

  async ensureSingles() {
    const hasSingles = state.releases.some(r => r.type === 'singles');
    if (!hasSingles) {
      const singlesPath = 'singles/singles.json';
      const singlesData = { title: 'Singles', type: 'singles', tracks: [] };
      try {
        const json = JSON.stringify(singlesData, null, 2);
        const result = await api.putFile(singlesPath, json, null, 'Initialize singles');
        state.releases.unshift({ id: 'singles-singles', type: 'singles', data: singlesData, path: singlesPath, _sha: result.content.sha });
        if (!state.artistData.releases) state.artistData.releases = [];
        if (!state.artistData.releases.includes(singlesPath)) {
          state.artistData.releases.unshift(singlesPath);
          const aSha = state.artistData._sha || await api.getSha('artist.json');
          const aJson = JSON.stringify({ ...state.artistData, _sha: undefined }, null, 2);
          const aResult = await api.putFile('artist.json', aJson, aSha, 'Add singles to releases');
          state.artistData._sha = aResult.content.sha;
        }
      } catch (e) {
        state.releases.unshift({ id: 'singles-singles', type: 'singles', data: singlesData, path: singlesPath, _sha: null });
        markDirty();
      }
    } else {
      const idx = state.releases.findIndex(r => r.type === 'singles');
      if (idx > 0) state.releases.unshift(state.releases.splice(idx, 1)[0]);
    }
  },

  create(type) {
    ui.modal.close('new-release');
    const ts = Date.now();
    const folder = type === 'playlist' ? `playlists/playlist-${ts}` : `albums/album-${ts}`;
    const path = `${folder}/${type === 'playlist' ? 'playlist' : 'album'}.json`;
    const id = path.replace(/\//g, '-').replace('.json', '');
    const data = {
      title: type === 'playlist' ? 'New Playlist' : 'New Album',
      type: type === 'playlist' ? 'playlist' : 'album',
      year: new Date().getFullYear(),
      cover: 'cover.jpg',
      tracks: []
    };
    state.releases.push({ id, type, data, path, _sha: null });
    ui.renderReleasesNav();
    ui.showRelease(id);
    markDirty();
    ui.toast(`${type === 'playlist' ? 'Playlist' : 'Album'} created - fill in details and Save`);
  },

  async deleteRelease(id) {
    const rel = state.releases.find(r => r.id === id);
    if (!rel) return;
    if (rel.type === 'playlist') {
      state.releases = state.releases.filter(r => r.id !== id);
      state.currentReleaseId = null;
      ui.renderReleasesNav();
      ui.showSection('profile');
      markDirty();
      ui.toast('Playlist removed');
      return;
    }
    state.releases = state.releases.filter(r => r.id !== id);
    state.currentReleaseId = null;
    ui.renderReleasesNav();
    ui.showSection('profile');
    markDirty();
    ui.toast('Removing album...');
    const folder = rel.path.substring(0, rel.path.lastIndexOf('/'));
    if (folder && !folder.startsWith('singles')) {
      const files = await api.listFolder(folder);
      for (const file of files) {
        if (file.type !== 'file') continue;
        await api.deleteFile(file.path, file.sha, `Remove ${rel.data.title}`);
      }
    }
    const jsonSha = rel._sha || await api.getSha(rel.path);
    if (jsonSha) await api.deleteFile(rel.path, jsonSha, `Remove ${rel.data.title}`);
    ui.toast('Album removed');
  },

  getReleaseData(rel) {
    const id = rel.id;
    const isSingles = rel.type === 'singles';
    if (rel.type === 'playlist') {
      const tracks = [];
      document.querySelectorAll(`[id^="ptitem-${id}-"]`).forEach(el => {
        const idx = el.id.replace(`ptitem-${id}-`, '');
        const src = document.getElementById(`psrc-${id}-${idx}`)?.value || '';
        const title = document.getElementById(`ptitle-${id}-${idx}`)?.value || '';
        const dur = parseInt(document.getElementById(`pdur-${id}-${idx}`)?.value || '0');
        if (src) tracks.push({ title, src, duration: dur });
      });
      return { title: document.getElementById(`rel-title-${id}`)?.value || rel.data.title, type: 'playlist', cover: 'cover.jpg', tracks };
    }
    const tracks = [];
    document.querySelectorAll(`[id^="twrap-${id}-"]`).forEach(el => {
      const idx = el.id.replace(`twrap-${id}-`, '');
      const src = document.getElementById(`tsrc-${id}-${idx}`)?.value.trim() || '';
      const dur = parseInt(document.getElementById(`tdur-${id}-${idx}`)?.value || '0');
      const pickPanel = document.getElementById(`tsrc-pick-${id}-${idx}`);
      const isFromSingle = pickPanel && pickPanel.style.display !== 'none';
      if (isFromSingle) {
        const sel = pickPanel.querySelector('select');
        const opt = sel?.options[sel.selectedIndex];
        const pickedSrc = opt?.dataset.src || src;
        const pickedTitle = opt?.dataset.title || '';
        const pickedDur = parseInt(opt?.dataset.dur || '0') || dur;
        if (pickedSrc) tracks.push({ title: pickedTitle, src: pickedSrc, duration: pickedDur, fromSingle: true });
        return;
      }
      const title = document.getElementById(`ttitle-${id}-${idx}`)?.value.trim() || '';
      const lrcFilename = document.getElementById(`tlyrics-lrc-${id}-${idx}`)?.value.trim() || '';
      const lyricsText = document.getElementById(`tlyrics-text-${id}-${idx}`)?.value.trim() || '';
      const cover = document.getElementById(`tcover-${id}-${idx}`)?.value.trim() || '';
      const year = parseInt(document.getElementById(`tyear-${id}-${idx}`)?.value) || new Date().getFullYear();
      if (title || src) {
        const t = { title, src, duration: dur };
        if (lrcFilename) t.lyricsFile = lrcFilename;
        else if (lyricsText) t.lyrics = lyricsText;
        if (isSingles) { t.cover = cover; t.year = year; }
        tracks.push(t);
      }
    });
    if (isSingles) return { title: rel.data.title || 'Singles', type: 'singles', tracks };
    return {
      title: document.getElementById(`rel-title-${id}`)?.value || rel.data.title,
      type: document.getElementById(`rel-type-${id}`)?.value || rel.type,
      year: parseInt(document.getElementById(`rel-year-${id}`)?.value) || new Date().getFullYear(),
      cover: 'cover.jpg',
      tracks
    };
  },

  async saveAll() {
    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spin"></div> Saving...';
    try {
      if (state.currentReleaseId) {
        const rel = state.releases.find(r => r.id === state.currentReleaseId);
        if (rel) rel.data = this.getReleaseData(rel);
      }
      // Upload pending files (images, audio, LRC)
      for (const [key, val] of Object.entries(state.pendingUploads)) {
        if (!val.b64) continue;
        const sha = await api.getSha(val.path);
        await api.putBinary(val.path, val.b64, sha, `Upload ${val.path.split('/').pop()}`);
        state.pendingUploads[key].b64 = null;
      }
      // Save each release JSON
      for (const rel of state.releases) {
        const data = rel.id === state.currentReleaseId ? this.getReleaseData(rel) : rel.data;
        const json = JSON.stringify(data, null, 2);
        const sha = rel._sha || await api.getSha(rel.path);
        const result = await api.putFile(rel.path, json, sha, `Update ${data.title || rel.id}`);
        rel._sha = result.content.sha;
        rel.data = data;
      }
      // Save artist.json
      const profileData = this.getProfileData();
      const aJson = JSON.stringify(profileData, null, 2);
      const aSha = state.artistData?._sha || await api.getSha('artist.json');
      const aResult = await api.putFile('artist.json', aJson, aSha, 'Update artist profile');
      state.artistData = { ...profileData, _sha: aResult.content.sha };
      ui.renderReleasesNav();
      clearDirty();
      ui.toast('All changes saved! Live in ~2 minutes.');
    } catch (e) {
      ui.toast('Save failed: ' + e.message, 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save changes';
    }
  },

  getProfileData() {
    return {
      schema: 'unmuted/v1',
      name: document.getElementById('f-name')?.value || state.artistData?.name || '',
      bio: document.getElementById('f-bio')?.value || state.artistData?.bio || '',
      location: document.getElementById('f-location')?.value || state.artistData?.location || '',
      avatar: 'avatar.jpg',
      links: this.collectLinks(),
      releases: state.releases.map(r => r.path),
      recommendations: this.collectRecommendations()
    };
  },

  collectLinks() {
    const links = {};
    const ig = document.getElementById('l-instagram')?.value;
    if (ig) links.instagram = ig.startsWith('http') ? ig : `https://instagram.com/${ig}`;
    const yt = document.getElementById('l-youtube')?.value;
    if (yt) links.youtube = yt.startsWith('http') ? yt : `https://youtube.com/@${yt.replace('@','')}`;
    return links;
  },

  collectRecommendations() {
    return Array.from(document.querySelectorAll('#recs-list input[type="text"]')).map(i => i.value.trim()).filter(Boolean);
  },

  // HTML generation methods (condensed - full versions would be longer)
  albumHTML(rel) {
    // Return album form HTML
    return `<div>Album editor for ${rel.id}</div>`;
  },

  playlistHTML(rel) {
    return `<div>Playlist editor for ${rel.id}</div>`;
  },

  // File handling stubs (to be implemented fully in a separate module if needed)
  handleTrackFile(relId, idx, input) { /* ... */ },
  handleLrcFile(relId, idx, input) { /* ... */ },
  handleReleaseCover(relId, input) { /* ... */ },
  handleSingleCover(relId, idx, input) { /* ... */ },
  queueTrackFile(relId, idx, file, folder, filename) { /* ... */ },
  convertAndLoad(relId, idx, file) { /* ... */ }
};