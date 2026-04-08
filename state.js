// state.js — Global state and localStorage persistence
export const GH = {
  token: localStorage.getItem('un_dash_token') || '',
  username: localStorage.getItem('un_dash_user') || '',
  repo: localStorage.getItem('un_dash_repo') || 'music'
};

export const state = {
  artistData: null,
  releases: [],
  pendingUploads: {},
  currentSection: 'profile',
  currentReleaseId: null,
  dirty: false
};

export const DASHBOARD_VERSION = '1.0.0';

export function markDirty() {
  state.dirty = true;
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) saveBtn.disabled = false;
}

export function clearDirty() {
  state.dirty = false;
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) saveBtn.disabled = true;
}

export function loadState() {
  // Load from localStorage if needed (currently only GH credentials)
}

export function saveState() {
  localStorage.setItem('un_dash_token', GH.token);
  localStorage.setItem('un_dash_user', GH.username);
  localStorage.setItem('un_dash_repo', GH.repo);
}