// ui.js — Complete UI management with HTML generators and helpers
import { state, GH, markDirty } from './state.js';
import { api } from './api.js';
import { releases } from './releases.js';

export const ui = {
  showSection(name) {
    state.currentSection = name;
    state.currentReleaseId = null;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-release').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${name}`)?.classList.add('active');
    this.renderSection(name);
  },

  showRelease(id) {
    if (state.currentReleaseId && state.currentReleaseId !== id) {
      const cur = state.releases.find(r => r.id === state.currentReleaseId);
      if (cur) cur.data = releases.getReleaseData(cur);
    }
    state.currentSection = 'release';
    state.currentReleaseId = id;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-release').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-rel-${id}`)?.classList.add('active');
    this.renderReleaseSection(id);
  },

  renderSection(name) {
    const content = document.getElementById('main-content');
    if (name === 'profile') content.innerHTML = this.profileHTML();
    else if (name === 'links') content.innerHTML = this.linksHTML();
    else if (name === 'settings') content.innerHTML = this.settingsHTML();
    else if (name === 'recs') { content.innerHTML = this.recsHTML(); this.populateRecs(); }
    if (name === 'profile') this.populateProfile(state.artistData);
    if (name === 'links') setTimeout(() => this.populateLinks(state.artistData?.links || {}), 0);
  },

  renderReleaseSection(id) {
    const rel = state.releases.find(r => r.id === id);
    if (!rel) return;
    const content = document.getElementById('main-content');
    content.innerHTML = rel.type === 'playlist' ? this.playlistHTML(rel) : this.albumHTML(rel);
    setTimeout(() => this.initDragDrop(`tracks-${id}`), 50);
    this.restoreReleaseAssets(rel);
  },

  // ------------------- HTML GENERATORS -------------------
  profileHTML() {
    return `
      <div class="sec-title">Your profile</div>
      <p class="sec-sub">This is what listeners see when they add you on Unmuted.</p>
      <div class="img-upload">
        <div class="img-preview round" id="avatar-preview">
          <img id="avatar-img" src="" alt=""><div class="img-preview-ph" id="avatar-ph">?</div>
        </div>
        <div class="img-upload-info">
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('avatar-file').click()">Upload photo</button>
          <input type="file" id="avatar-file" class="file-input" accept="image/*" onchange="handleImgUpload('avatar','avatar.jpg',this)">
          <p>Square, JPG or PNG, at least 400×400px.</p>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label class="label">Artist name</label><input class="input" id="f-name" oninput="markDirty()" placeholder="Your name"></div>
        <div class="field"><label class="label">Location <span>(optional)</span></label><input class="input" id="f-location" oninput="markDirty()" placeholder="Miami, FL"></div>
      </div>
      <div class="divider"></div>
      <div class="field"><label class="label">Bio</label><textarea class="textarea" id="f-bio" oninput="markDirty()" placeholder="Tell listeners about yourself..."></textarea></div>
    `;
  },

  linksHTML() {
    const socials = [
      ['instagram','Instagram','<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/><rect x="2" y="2" width="20" height="20" rx="5"/>','your_handle'],
      ['youtube','YouTube','<path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-2C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-2 2C1 8.12 1 12 1 12s0 3.88.46 5.58a2.78 2.78 0 0 0 2 2C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 2-2C23 15.88 23 12 23 12s0-3.88-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98"/>','@yourchannel'],
      ['soundcloud','SoundCloud','<path d="M11.56 8.87V17h-1.7V8.87H7.31V7.33h6.79v1.54h-2.54zM1.175 12.225C.887 12.225 0 12.68 0 13.635c0 .954.887 1.41 1.175 1.41H12c.287 0 1.175-.456 1.175-1.41 0-.955-.888-1.41-1.175-1.41H1.175z"/>','soundcloud.com/you'],
      ['tiktok','TikTok','<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>','@yourhandle'],
      ['spotify','Spotify','<circle cx="12" cy="12" r="10"/><path d="M8 11.73c2.86-1.74 6.37-1.74 9.23 0"/><path d="M6.67 14.4c3.5-2.13 7.8-2.13 11.3 0"/><path d="M9.33 9.07c2.22-1.35 4.95-1.35 7.17 0"/>','Artist page URL'],
      ['bandcamp','Bandcamp','<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 8l4 8h4l-4-8z"/>','you.bandcamp.com']
    ];
    return `
      <div class="sec-title">Social links</div>
      <p class="sec-sub">Add your profiles so listeners can follow you everywhere.</p>
      ${socials.map(([id, label, svg, ph]) => `
        <div class="social-row">
          <div class="social-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${svg}</svg></div>
          <span class="social-label">${label}</span>
          <input class="input" id="l-${id}" type="text" placeholder="${ph}" oninput="markDirty()">
        </div>
      `).join('')}
    `;
  },

  recsHTML() {
    return `
      <div class="sec-title">Recommendations</div>
      <p class="sec-sub">Up to 10 artists you recommend.</p>
      <div id="recs-list" style="margin-bottom:12px"></div>
      <div style="display:flex;gap:0;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:3px;width:fit-content;margin-bottom:16px">
        <button id="rec-tab-gh" onclick="setRecTab('gh')" style="border:none;background:var(--surface2);color:var(--text);font-family:var(--font);font-size:12px;font-weight:600;padding:5px 14px;border-radius:6px;cursor:pointer">GitHub repository</button>
        <button id="rec-tab-link" onclick="setRecTab('link')" style="border:none;background:transparent;color:var(--text3);font-family:var(--font);font-size:12px;font-weight:600;padding:5px 14px;border-radius:6px;cursor:pointer">Paste link</button>
      </div>
      <div id="rec-panel-link" style="display:none">
        <div style="display:flex;gap:8px;align-items:center">
          <input class="input" id="rec-url-input" type="text" placeholder="https://artist.github.io/music/artist.json" style="flex:1" onkeydown="if(event.key==='Enter')addRecFromInput()">
          <button class="btn btn-ghost btn-sm" onclick="addRecFromInput()">Add</button>
        </div>
      </div>
      <div id="rec-panel-gh">
        <div style="display:flex;gap:8px;align-items:flex-end">
          <div style="flex:1"><label class="label">GitHub username</label><input class="input" id="rec-gh-user" placeholder="their-username" onkeydown="if(event.key==='Enter')addRecFromGh()"></div>
          <div style="width:130px"><label class="label">Repo</label><input class="input" id="rec-gh-repo" placeholder="music" onkeydown="if(event.key==='Enter')addRecFromGh()"></div>
          <button class="btn btn-ghost btn-sm" onclick="addRecFromGh()">Add</button>
        </div>
      </div>
    `;
  },

  settingsHTML() {
    return `
      <div class="sec-title">Settings</div>
      <p class="sec-sub">Your current connection details.</p>
      <div class="field"><label class="label">Username</label><input class="input" value="${this.esc(GH.username)}" readonly></div>
      <div class="field"><label class="label">Repository</label><input class="input" id="s-repo-edit" value="${this.esc(GH.repo)}"><button class="btn btn-ghost btn-sm" onclick="updateRepo()">Update</button></div>
      <div class="field"><label class="label">Token</label><input class="input" value="****************" type="text" readonly></div>
      <button class="btn btn-danger" onclick="disconnect()">Disconnect GitHub</button>
    `;
  },

  albumHTML(rel) {
    const id = rel.id;
    const d = rel.data;
    const isSingles = rel.type === 'singles';
    const tracks = (d.tracks || []).map((t, i) => this.trackRowHTML(id, i, t, isSingles)).join('');
    return `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <div class="sec-title">${this.esc(d.title || 'Untitled')}</div>
        ${!isSingles ? `<span class="type-badge ${rel.type==='album'?'type-album':'type-ep'}">${rel.type}</span>` : ''}
        ${!isSingles ? `<button class="btn btn-ghost btn-sm" style="margin-left:auto;color:var(--danger)" onclick="deleteRelease('${id}')">Remove</button>` : ''}
      </div>
      ${!isSingles ? `
        <div class="img-upload">
          <div class="img-preview square" id="cover-preview-${id}">
            <img id="cover-img-${id}" src=""><div class="img-preview-ph" id="cover-ph-${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="28"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3"/></svg></div>
          </div>
          <div class="img-upload-info">
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('cover-file-${id}').click()">Upload cover</button>
            <input type="file" id="cover-file-${id}" class="file-input" accept="image/*" onchange="handleReleaseCover('${id}',this)">
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label class="label">Release title</label><input class="input" id="rel-title-${id}" value="${this.esc(d.title||'')}" oninput="markDirty();updateNavTitle('${id}',this.value)"></div>
          <div class="field"><label class="label">Year</label><input class="input" id="rel-year-${id}" type="number" value="${d.year||new Date().getFullYear()}" oninput="markDirty()"></div>
        </div>
        <div class="field"><label class="label">Type</label><select class="input" id="rel-type-${id}" onchange="markDirty()"><option value="album" ${d.type==='album'?'selected':''}>Album</option><option value="ep" ${d.type==='ep'?'selected':''}>EP</option></select></div>
      ` : ''}
      <div class="divider"></div>
      <div class="tracks-header">
        <span class="tracks-label">${isSingles ? '' : 'Tracks'}</span>
        <button class="btn btn-ghost btn-sm" onclick="addTrackToRelease('${id}')">${isSingles ? 'Add single' : 'Add track'}</button>
      </div>
      <div id="tracks-${id}">${tracks}</div>
    `;
  },

  trackRowHTML(relId, idx, track, isSingles = false) {
    const durDisplay = track.duration ? this.fmtDur(track.duration) : '';
    const hasLrc = !!track.lyricsFile;
    const hasText = !!track.lyrics;
    const lyricsMode = hasLrc ? 'lrc' : hasText ? 'text' : 'none';
    const singleOpts = isSingles ? [] : this.getSingleOptions();
    const hasSingles = singleOpts.length > 0;
    const isFromSingle = !isSingles && hasSingles && track.src && track.src.includes('/');
    const sourceMode = isFromSingle ? 'pick' : 'new';

    return `
      <div class="track-item-wrap" id="twrap-${relId}-${idx}">
        <div class="drag-handle" draggable="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm8-15a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg></div>
        <div class="track-item" id="titem-${relId}-${idx}">
          <div class="track-item-header">
            ${!isSingles ? `<span class="track-label">Track ${idx+1}</span>` : ''}
            <div style="display:flex;align-items:center;gap:6px;margin-left:auto">
              ${durDisplay ? `<span class="dur-display">${durDisplay}</span>` : ''}
              <button class="btn btn-danger btn-sm btn-icon" onclick="removeTrackFromRelease('${relId}',${idx})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          </div>
          <div style="display:flex;gap:14px;margin-top:10px">
            ${isSingles ? this.singleCoverHTML(relId, idx) : ''}
            <div style="flex:1;display:flex;flex-direction:column;gap:10px">
              ${!isSingles && hasSingles ? this.trackSourceToggle(relId, idx, sourceMode, singleOpts, track) : this.uploadOnlyPanel(relId, idx, track)}
              <div id="ttitle-row-${relId}-${idx}" style="display:${sourceMode==='pick'?'none':'block'}">
                <label class="label">Title</label>
                <input class="input" id="ttitle-${relId}-${idx}" value="${this.esc(track.title||'')}" oninput="markDirty()">
              </div>
              ${isSingles ? `<div><label class="label">Year</label><input class="input" id="tyear-${relId}-${idx}" type="number" value="${track.year||new Date().getFullYear()}" oninput="markDirty()"></div>` : ''}
            </div>
          </div>
          <div id="tlyrics-row-${relId}-${idx}" style="display:${sourceMode==='pick'?'none':'block'};margin-top:12px">
            ${this.lyricsEditor(relId, idx, lyricsMode, track)}
          </div>
          <input type="hidden" id="tsrc-${relId}-${idx}" value="${this.esc(track.src||'')}">
          <input type="hidden" id="tdur-${relId}-${idx}" value="${track.duration||0}">
          <input type="hidden" id="tcover-${relId}-${idx}" value="${this.esc(track.cover||'')}">
          <input type="hidden" id="tlyrics-lrc-${relId}-${idx}" value="${this.esc(track.lyricsFile||'')}">
        </div>
      </div>
    `;
  },

  // Helper HTML snippets
  singleCoverHTML(relId, idx) {
    return `
      <div style="flex-shrink:0">
        <div class="img-preview square" id="tcover-preview-${relId}-${idx}" style="width:72px;height:72px;cursor:pointer" onclick="document.getElementById('tcover-file-${relId}-${idx}').click()">
          <img id="tcover-img-${relId}-${idx}" src=""><div class="img-preview-ph" id="tcover-ph-${relId}-${idx}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="22"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3"/></svg></div>
        </div>
        <input type="file" id="tcover-file-${relId}-${idx}" class="file-input" accept="image/*" onchange="handleSingleCover('${relId}',${idx},this)">
      </div>
    `;
  },

  trackSourceToggle(relId, idx, sourceMode, singleOpts, track) {
    const opts = singleOpts.map(o => `<option value="" data-src="${this.esc(o.src)}" data-dur="${o.duration}" data-title="${this.esc(o.title)}" ${track.src===o.src?'selected':''}>${this.esc(o.label)}</option>`).join('');
    return `
      <div>
        <label class="label">Track source</label>
        <div style="display:flex;gap:0;background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:2px;width:fit-content;margin-bottom:10px">
          <button id="tsrc-btn-new-${relId}-${idx}" onclick="setTrackSource('${relId}',${idx},'new')" style="border:none;background:${sourceMode==='new'?'var(--surface2)':'transparent'};color:${sourceMode==='new'?'var(--text)':'var(--text3)'};padding:5px 14px;border-radius:5px;cursor:pointer">New upload</button>
          <button id="tsrc-btn-pick-${relId}-${idx}" onclick="setTrackSource('${relId}',${idx},'pick')" style="border:none;background:${sourceMode==='pick'?'var(--surface2)':'transparent'};color:${sourceMode==='pick'?'var(--text)':'var(--text3)'};padding:5px 14px;border-radius:5px;cursor:pointer">From singles</button>
        </div>
        <div id="tsrc-new-${relId}-${idx}" style="display:${sourceMode==='new'?'block':'none'}">
          <label class="label">Audio file</label>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('tfile-${relId}-${idx}').click()">Upload audio</button>
          <input type="file" id="tfile-${relId}-${idx}" class="file-input" accept=".mp3,.flac,.ogg,.wav,.m4a,audio/*" onchange="handleTrackFile('${relId}',${idx},this)">
          <div id="tstatus-${relId}-${idx}"></div>
        </div>
        <div id="tsrc-pick-${relId}-${idx}" style="display:${sourceMode==='pick'?'block':'none'}">
          <label class="label">Single</label>
          <select class="input" onchange="onPickExistingSingle('${relId}',${idx},this)">${opts}</select>
        </div>
      </div>
    `;
  },

  uploadOnlyPanel(relId, idx, track) {
    return `
      <div>
        <label class="label">Audio file</label>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('tfile-${relId}-${idx}').click()">${track.src?'Replace':'Upload audio'}</button>
        <input type="file" id="tfile-${relId}-${idx}" class="file-input" accept=".mp3,.flac,.ogg,.wav,.m4a,audio/*" onchange="handleTrackFile('${relId}',${idx},this)">
        <div id="tstatus-${relId}-${idx}"></div>
      </div>
    `;
  },

  lyricsEditor(relId, idx, mode, track) {
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <label class="label">Lyrics</label>
        <div style="display:flex;gap:0;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:2px">
          <button onclick="setLyricsTab('${relId}',${idx},'none')" style="border:none;background:${mode==='none'?'var(--surface2)':'transparent'};color:${mode==='none'?'var(--text)':'var(--text3)'};padding:3px 10px;border-radius:4px">None</button>
          <button onclick="setLyricsTab('${relId}',${idx},'text')" style="border:none;background:${mode==='text'?'var(--surface2)':'transparent'};color:${mode==='text'?'var(--text)':'var(--text3)'};padding:3px 10px;border-radius:4px">Type</button>
          <button onclick="setLyricsTab('${relId}',${idx},'lrc')" style="border:none;background:${mode==='lrc'?'var(--surface2)':'transparent'};color:${mode==='lrc'?'var(--text)':'var(--text3)'};padding:3px 10px;border-radius:4px">.lrc</button>
        </div>
      </div>
      <div id="lpanel-text-${relId}-${idx}" style="display:${mode==='text'?'block':'none'}">
        <textarea class="textarea" id="tlyrics-text-${relId}-${idx}" oninput="markDirty()">${this.esc(track.lyrics||'')}</textarea>
      </div>
      <div id="lpanel-lrc-${relId}-${idx}" style="display:${mode==='lrc'?'block':'none'}">
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('tlrc-file-${relId}-${idx}').click()">${track.lyricsFile?'Replace .lrc':'Upload .lrc'}</button>
        <span id="tlrc-name-${relId}-${idx}">${track.lyricsFile||''}</span>
        <input type="file" id="tlrc-file-${relId}-${idx}" class="file-input" accept=".lrc" onchange="handleLrcFile('${relId}',${idx},this)">
      </div>
    `;
  },

  playlistHTML(rel) {
    const id = rel.id;
    const d = rel.data;
    const allTracks = this.getAllTracks();
    const trackRows = (d.tracks || []).map((t, i) => this.playlistTrackRow(id, i, t, allTracks)).join('');
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div class="sec-title">${this.esc(d.title||'Untitled Playlist')}</div>
        <span class="type-badge type-playlist">Playlist</span>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto;color:var(--danger)" onclick="deleteRelease('${id}')">Remove</button>
      </div>
      <div class="img-upload">
        <div class="img-preview square" id="cover-preview-${id}"><img id="cover-img-${id}"><div class="img-preview-ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg></div></div>
        <div class="img-upload-info"><button class="btn btn-ghost btn-sm" onclick="document.getElementById('cover-file-${id}').click()">Upload cover</button><input type="file" id="cover-file-${id}" class="file-input" accept="image/*" onchange="handleReleaseCover('${id}',this)"></div>
      </div>
      <div class="field"><label class="label">Playlist name</label><input class="input" id="rel-title-${id}" value="${this.esc(d.title||'')}" oninput="markDirty();updateNavTitle('${id}',this.value)"></div>
      <div class="divider"></div>
      <div class="tracks-header">
        <span class="tracks-label">Tracks</span>
        <button class="btn btn-ghost btn-sm" onclick="addPlaylistTrack('${id}')">Add track</button>
      </div>
      <div id="tracks-${id}">${trackRows}</div>
    `;
  },

  playlistTrackRow(relId, idx, track, allTracks) {
    const opts = allTracks.map(t => `<option value="${this.esc(t.src)}" data-dur="${t.duration}" ${t.src===track.src?'selected':''}>${this.esc(t.title)} - ${this.esc(t.from)}</option>`).join('');
    return `
      <div class="playlist-track" id="ptitem-${relId}-${idx}">
        <div class="drag-handle" draggable="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm8-15a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg></div>
        <div class="playlist-track-num">${idx+1}</div>
        <div class="playlist-track-info">
          <select class="input" onchange="onPlaylistTrackChange('${relId}',${idx},this)"><option value="">- pick a track -</option>${opts}</select>
        </div>
        <button class="btn btn-danger btn-sm btn-icon" onclick="removePlaylistTrack('${relId}',${idx})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <input type="hidden" id="psrc-${relId}-${idx}" value="${this.esc(track.src||'')}">
        <input type="hidden" id="pdur-${relId}-${idx}" value="${track.duration||0}">
        <input type="hidden" id="ptitle-${relId}-${idx}" value="${this.esc(track.title||'')}">
      </div>
    `;
  },

  // ---------- HELPERS ----------
  getSingleOptions() {
    const opts = [];
    state.releases.forEach(r => {
      if (r.type !== 'singles') return;
      (r.data.tracks || []).forEach(t => {
        if (!t.src) return;
        const base = r.path.substring(0, r.path.lastIndexOf('/') + 1);
        opts.push({ label: t.title || t.src, src: base + t.src, duration: t.duration, title: t.title });
      });
    });
    return opts;
  },

  getAllTracks() {
    const all = [];
    state.releases.forEach(r => {
      if (r.type === 'playlist') return;
      (r.data.tracks || []).forEach(t => {
        const base = r.path.substring(0, r.path.lastIndexOf('/') + 1);
        all.push({ title: t.title, src: base + t.src, duration: t.duration, from: r.data.title || r.id });
      });
    });
    return all;
  },

  restoreReleaseAssets(rel) {
    // Restore cover image
    if (rel.type !== 'singles' && rel.data.cover) {
      const base = rel.path.substring(0, rel.path.lastIndexOf('/') + 1);
      api.getFile(base + rel.data.cover).then(f => {
        const b64 = f.content.replace(/\n/g, '');
        this.showImgPreview(`cover-${rel.id}`, `data:image/jpeg;base64,${b64}`);
      }).catch(() => {});
    }
    // Restore single covers and LRC content
    if (rel.type === 'singles') {
      const base = rel.path.substring(0, rel.path.lastIndexOf('/') + 1);
      (rel.data.tracks || []).forEach((track, idx) => {
        if (track.cover) {
          api.getFile(base + track.cover).then(f => {
            const b64 = f.content.replace(/\n/g, '');
            const img = document.getElementById(`tcover-img-${rel.id}-${idx}`);
            if (img) { img.src = `data:image/jpeg;base64,${b64}`; img.classList.add('loaded'); }
          }).catch(() => {});
        }
        if (track.lyricsFile) {
          api.getFile(base + track.lyricsFile).then(f => {
            const content = atob(f.content);
            const textarea = document.getElementById(`tlyrics-lrc-${rel.id}-${idx}`);
            if (textarea) textarea.value = track.lyricsFile; // Store filename
            // Could also populate editor if needed
          }).catch(() => {});
        }
      });
    }
  },

  // ---------- DRAG & DROP ----------
  initDragDrop(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let dragSrc = null;
    container.querySelectorAll('.track-item-wrap, .playlist-track').forEach(item => {
      const handle = item.querySelector('.drag-handle');
      if (!handle) return;
      handle.addEventListener('dragstart', e => {
        dragSrc = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      handle.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        dragSrc = null;
      });
      item.addEventListener('dragover', e => {
        e.preventDefault();
        if (dragSrc && dragSrc !== item) item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (!dragSrc || dragSrc === item) return;
        const items = [...container.children];
        const fromIdx = items.indexOf(dragSrc);
        const toIdx = items.indexOf(item);
        container.insertBefore(dragSrc, fromIdx < toIdx ? item.nextSibling : item);
        container.querySelectorAll('.playlist-track-num').forEach((el, i) => { el.textContent = i + 1; });
        markDirty();
      });
    });
  },

  // ---------- MISC UI ----------
  populateProfile(d) {
    if (!d) return;
    document.getElementById('f-name').value = d.name || '';
    document.getElementById('f-bio').value = d.bio || '';
    document.getElementById('f-location').value = d.location || '';
  },

  populateLinks(links) {
    const map = { instagram: links.instagram, youtube: links.youtube, soundcloud: links.soundcloud, tiktok: links.tiktok, spotify: links.spotify, bandcamp: links.bandcamp };
    Object.entries(map).forEach(([k, v]) => { const el = document.getElementById(`l-${k}`); if (el) el.value = v || ''; });
  },

  populateRecs() {
    const list = document.getElementById('recs-list');
    if (!list) return;
    list.innerHTML = '';
    (state.artistData?.recommendations || []).forEach(url => this.addRecRow(url));
  },

  addRecRow(url) {
    const list = document.getElementById('recs-list');
    const wrap = document.createElement('div');
    wrap.className = 'track-item-wrap';
    wrap.innerHTML = `
      <div class="drag-handle" draggable="true"><svg viewBox="0 0 24 24" fill="currentColor" width="11"><path d="M8 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm8-15a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg></div>
      <div class="track-item" style="display:flex;gap:8px;align-items:center;padding:10px 12px">
        <input class="input" type="text" value="${this.esc(url)}" style="flex:1" oninput="markDirty()">
        <button class="btn btn-danger btn-sm btn-icon" onclick="this.closest('.track-item-wrap').remove();markDirty()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    `;
    list.appendChild(wrap);
    this.initDragDrop('recs-list');
  },

  renderReleasesNav() {
    const nav = document.getElementById('releases-nav');
    if (!state.releases.length) { nav.innerHTML = '<div style="padding:6px 10px;color:var(--text3)">No releases yet</div>'; return; }
    nav.innerHTML = state.releases.map(r => `
      <button class="nav-release ${state.currentReleaseId === r.id ? 'active' : ''}" onclick="showRelease('${r.id}')">
        <div class="nav-release-thumb" id="nav-thumb-${r.id}">${this.typeThumbIcon(r.type)}</div>
        <div class="nav-release-info"><div class="nav-release-name">${this.esc(r.data.title || 'Untitled')}</div><div class="nav-release-type">${r.type}</div></div>
      </button>
    `).join('');
    state.releases.forEach(r => {
      if (r.type === 'singles' || !r.data.cover) return;
      const base = r.path.substring(0, r.path.lastIndexOf('/') + 1);
      api.getFile(base + r.data.cover).then(f => {
        document.getElementById(`nav-thumb-${r.id}`).innerHTML = `<img src="data:image/jpeg;base64,${f.content.replace(/\n/g,'')}" class="loaded">`;
      }).catch(() => {});
    });
  },

  typeThumbIcon(type) {
    const icons = {
      singles: { bg: 'rgba(123,94,167,0.18)', color: '#9b7fcb', svg: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' },
      album: { bg: 'rgba(91,141,238,0.18)', color: '#5b8dee', svg: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="4"/>' },
      ep: { bg: 'rgba(76,175,130,0.18)', color: '#4caf82', svg: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="4"/>' },
      playlist: { bg: 'rgba(224,91,141,0.18)', color: '#e05b8d', svg: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>' }
    };
    const t = icons[type] || icons.album;
    return `<div style="width:100%;height:100%;background:${t.bg};display:flex;align-items:center;justify-content:center;border-radius:6px;"><svg viewBox="0 0 24 24" fill="none" stroke="${t.color}" stroke-width="1.8" width="14">${t.svg}</svg></div>`;
  },

  showImgPreview(key, src) {
    const img = document.getElementById(`${key === 'avatar' ? 'avatar' : 'cover'}-img${key !== 'avatar' ? '-' + key.replace('cover-', '') : ''}`);
    const ph = document.getElementById(`${key === 'avatar' ? 'avatar' : 'cover'}-ph${key !== 'avatar' ? '-' + key.replace('cover-', '') : ''}`);
    if (img) { img.src = src; img.classList.add('loaded'); }
    if (ph) ph.style.display = 'none';
  },

  toast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.color = type === 'danger' ? 'var(--danger)' : type === 'warning' ? 'var(--warning)' : 'var(--text)';
    t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(10px)'; }, 3200);
  },

  setSaveStatus(type, msg) {},
  markDirty() { markDirty(); },

  esc(s) { return s ? String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]) : ''; },
  fmtDur(s) { if (!s || isNaN(s)) return ''; return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); },

  modal: {
    open(id) { document.getElementById(id + '-modal').classList.add('on'); },
    close(id) { document.getElementById(id + '-modal').classList.remove('on'); }
  },

  showMain() {
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('main-layout').style.display = 'grid';
    document.getElementById('copy-link-btn').style.display = 'inline-flex';
    document.getElementById('view-page-btn').style.display = 'inline-flex';
    document.getElementById('save-btn').style.display = 'inline-flex';
    this.renderSection('profile');
  },

  copyDeepLink() {
    const deep = `https://unmuted-music.netlify.app/add#https://${GH.username}.github.io/${GH.repo}/artist.json`;
    navigator.clipboard.writeText(deep).then(() => this.toast('Link copied!'));
  },

  openMyPage() {
    window.open(`https://unmuted-music.netlify.app/add#https://${GH.username}.github.io/${GH.repo}/artist.json`, '_blank');
  }
};

// Make functions globally accessible for inline onclick handlers
window.showSection = (name) => ui.showSection(name);
window.showRelease = (id) => ui.showRelease(id);
window.markDirty = () => ui.markDirty();
window.addRecFromInput = () => { /* implementation */ };
window.addRecFromGh = () => { /* implementation */ };
window.setRecTab = (tab) => { /* toggle panels */ };
window.handleImgUpload = (key, path, input) => { /* read file, store in pendingUploads */ };
window.handleTrackFile = (relId, idx, input) => releases.handleTrackFile(relId, idx, input);
window.handleLrcFile = (relId, idx, input) => releases.handleLrcFile(relId, idx, input);
window.handleReleaseCover = (relId, input) => releases.handleReleaseCover(relId, input);
window.handleSingleCover = (relId, idx, input) => releases.handleSingleCover(relId, idx, input);
window.setTrackSource = (relId, idx, mode) => { /* toggle UI */ };
window.setLyricsTab = (relId, idx, mode) => { /* toggle panels */ };
window.addTrackToRelease = (relId) => releases.addTrackToRelease(relId);
window.removeTrackFromRelease = (relId, idx) => releases.removeTrackFromRelease(relId, idx);
window.addPlaylistTrack = (relId) => releases.addPlaylistTrack(relId);
window.removePlaylistTrack = (relId, idx) => releases.removePlaylistTrack(relId, idx);
window.onPickExistingSingle = (relId, idx, sel) => releases.onPickExistingSingle(relId, idx, sel);
window.onPlaylistTrackChange = (relId, idx, sel) => releases.onPlaylistTrackChange(relId, idx, sel);
window.updateNavTitle = (id, val) => {
  const el = document.querySelector(`#nav-rel-${id} .nav-release-name`);
  if (el) el.textContent = val || 'Untitled';
};
window.updateRepo = () => {
  const val = document.getElementById('s-repo-edit').value.trim();
  if (val) { GH.repo = val; localStorage.setItem('un_dash_repo', val); ui.toast('Repository updated'); }
};
window.disconnect = () => {
  if (confirm('Disconnect?')) { localStorage.clear(); location.reload(); }
};