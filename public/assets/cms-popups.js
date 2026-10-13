(() => {
  const $ = id => document.getElementById(id);
  let selectedBackup = null, restoring = false, fileVersion = 0;
  const status = (message, error = false) => { $('restoreStatus').textContent = message; $('restoreStatus').dataset.error = String(error); };
  window.handleImportJsonFile = async event => {
    const file = event.target.files?.[0], version = ++fileVersion;
    selectedBackup = null; $('restoreBackupBtn').disabled = true; $('restorePreview').hidden = true;
    if (!file) { status('No file selected.'); return; }
    if (file.size > 50 * 1024 * 1024) { status('Choose a backup under 50 MB.', true); return; }
    status('Checking backup…');
    try {
      const payload = JSON.parse(await file.text());
      if (version !== fileVersion) return;
      const posts = Array.isArray(payload) ? payload : payload.posts;
      if (!Array.isArray(posts) || !posts.length || posts.some(post => !post || typeof post.title !== 'string' || !post.title.trim())) throw Error('This file does not contain a valid article backup.');
      selectedBackup = payload;
      $('restorePreview').textContent = file.name + ' · ' + posts.length + ' articles · ' + (payload.categories?.length || 0) + ' categories · ' + (payload.short_links?.length || 0) + ' TK Links · ' + (payload.media?.length || 0) + ' images';
      $('restorePreview').hidden = false; $('restoreBackupBtn').disabled = false;
      status('Ready. Restore will update matching slugs and add missing articles.');
    } catch (error) { if (version === fileVersion) status(error.message || 'Could not read this JSON backup.', true); }
  };
  window.restoreSelectedBackup = async () => {
    if (!selectedBackup || restoring) return;
    restoring = true; $('restoreBackupBtn').disabled = true; $('importJsonFileInput').disabled = true;
    status('Restoring backup…');
    try {
      const response = await fetch('/api/system/import-posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selectedBackup) });
      const result = await response.json();
      if (!response.ok || !result.success) throw Error(result.error || 'Restore failed.');
      status(result.message); selectedBackup = null;
      setTimeout(() => location.reload(), 1200);
    } catch (error) { status(error.message, true); $('restoreBackupBtn').disabled = false; }
    finally { restoring = false; $('importJsonFileInput').disabled = false; }
  };
  for (const [id, openName, closeName] of [['catModal', 'openCategoriesModal', 'closeCategoriesModal'], ['backupModal', 'openBackupModal', 'closeBackupModal']]) {
    const modal = $(id), originalOpen = window[openName], originalClose = window[closeName]; let returnFocus;
    window[openName] = () => { returnFocus = document.activeElement; originalOpen(); document.body.style.overflow = 'hidden'; modal.querySelector('input:not([type=hidden]),button,a')?.focus(); };
    window[closeName] = () => { if (modal.classList.contains('hidden') || (id === 'backupModal' && restoring)) return; originalClose(); document.body.style.overflow = ''; returnFocus?.focus(); };
    modal.addEventListener('click', event => { if (event.target === modal) window[closeName](); });
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); window[closeName](); }
      if (event.key !== 'Tab') return;
      const nodes = [...modal.querySelectorAll('a,button,input,select,textarea')].filter(node => !node.disabled && node.getClientRects().length);
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes[nodes.length - 1]?.focus(); }
      else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) { event.preventDefault(); nodes[0]?.focus(); }
    });
  }
})();
