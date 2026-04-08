// api.js — GitHub API wrapper
import { GH } from './state.js';

export const api = {
  async getFile(path) {
    const r = await fetch(`https://api.github.com/repos/${GH.username}/${GH.repo}/contents/${path}`, {
      headers: { Authorization: `token ${GH.token}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (!r.ok) throw new Error(`GitHub ${r.status}`);
    return r.json();
  },

  async putFile(path, content, sha, msg) {
    const body = { message: msg, content: btoa(unescape(encodeURIComponent(content))) };
    if (sha) body.sha = sha;
    const r = await fetch(`https://api.github.com/repos/${GH.username}/${GH.repo}/contents/${path}`, {
      method: 'PUT',
      headers: { Authorization: `token ${GH.token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${await r.text()}`);
    return r.json();
  },

  async putBinary(path, b64, sha, msg) {
    const body = { message: msg, content: b64 };
    if (sha) body.sha = sha;
    const r = await fetch(`https://api.github.com/repos/${GH.username}/${GH.repo}/contents/${path}`, {
      method: 'PUT',
      headers: { Authorization: `token ${GH.token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${await r.text()}`);
    return r.json();
  },

  async getSha(path) {
    try { return (await this.getFile(path)).sha; } catch { return null; }
  },

  async deleteFile(path, sha, msg) {
    if (!sha) sha = await this.getSha(path);
    if (!sha) return;
    const r = await fetch(`https://api.github.com/repos/${GH.username}/${GH.repo}/contents/${path}`, {
      method: 'DELETE',
      headers: { Authorization: `token ${GH.token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg || `Remove ${path}`, sha })
    });
    if (!r.ok && r.status !== 404) console.warn('Delete failed for', path, r.status);
  },

  async listFolder(folder) {
    try {
      const items = await this.getFile(folder);
      return Array.isArray(items) ? items : [];
    } catch { return []; }
  }
};