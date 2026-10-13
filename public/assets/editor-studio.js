(() => {
  const $ = id => document.getElementById(id);
  let savedRange = null, savedTextSelection = null, sourceImage = null, editingImage = null;
  let loadingVersion = 0, busy = false, toastTimer, returnFocus;
  function activeEditor() {
    return currentViewMode === 'both' ? $('splitPostEditor') : $('postVisualEditor');
  }
  function syncVisualEditors() {
    const editor = activeEditor(), html = editor.innerHTML;
    $('htmlCodeEditor').value = html; $('splitHtmlEditor').value = html;
    for (const id of ['postVisualEditor', 'splitPostEditor']) if ($(id) !== editor) $(id).innerHTML = html;
    updateWordCount();
  }
  function rememberCursor() {
    if ($('imageStudio').open) return;
    if (currentViewMode === 'html') {
      const editor = $('htmlCodeEditor');
      savedTextSelection = { start: editor.selectionStart, end: editor.selectionEnd };
      return;
    }
    const selection = window.getSelection();
    if (selection.rangeCount && activeEditor().contains(selection.anchorNode)) savedRange = selection.getRangeAt(0).cloneRange();
  }
  document.addEventListener('selectionchange', rememberCursor);
  for (const id of ['htmlCodeEditor', 'splitHtmlEditor']) {
    $(id).addEventListener('keyup', rememberCursor);
    $(id).addEventListener('mouseup', rememberCursor);
  }
  function toast(message) {
    $('editorToast').textContent = message; $('editorToast').style.display = 'block';
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('editorToast').style.display = 'none', 4500);
  }
  window.editorToast = toast;
  function status(message) { $('studioStatus').textContent = message; }
  function gallery() {
    $('studioGallery').replaceChildren();
    const urls = new Set(fetchedArticleData?.images || []);
    if (fetchedArticleData?.image) urls.add(fetchedArticleData.image);
    for (const image of activeEditor().querySelectorAll('img')) urls.add(image.src);
    for (const url of urls) {
      const button = document.createElement('button'); button.type = 'button'; button.title = 'Edit imported image';
      const image = document.createElement('img'); image.src = url; image.alt = 'Imported article image';
      button.append(image); button.onclick = () => { $('studioUrl').value = url; window.loadStudioUrl(); };
      $('studioGallery').append(button);
    }
  }
  window.openImageStudio = function(image = null) {
    rememberCursor(); returnFocus = document.activeElement;
    editingImage = image instanceof HTMLImageElement ? image : null;
    sourceImage = null; loadingVersion++;
    $('studioCanvas').width = 0; $('studioEmpty').hidden = false;
    $('studioZoom').value = 1; $('studioX').value = 50; $('studioY').value = 50;
    $('studioRatio').value = 'original'; $('studioAlt').value = editingImage?.alt || '';
    $('studioCaption').value = editingImage?.closest('figure')?.querySelector('figcaption')?.textContent || '';
    status('Edited images are saved on this site, without links to the source post.');
    closeAiModal(); gallery(); $('imageStudio').showModal(); document.body.style.overflow = 'hidden';
    const url = editingImage?.src || $('imageInput').value || fetchedArticleData?.image;
    $('studioUrl').value = url || '';
    if (url) window.loadStudioUrl();
  };
  window.closeImageStudio = function() {
    if (busy) return;
    loadingVersion++; $('imageStudio').close(); document.body.style.overflow = ''; returnFocus?.focus();
  };
  $('imageStudio').addEventListener('click', event => {
    if (event.target !== $('imageStudio')) return;
    const rect = $('imageStudio').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) window.closeImageStudio();
  });
  $('imageStudio').addEventListener('cancel', event => { event.preventDefault(); window.closeImageStudio(); });
  async function loadBlob(blob, version) {
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (version !== loadingVersion) return;
      sourceImage = image; $('studioEmpty').hidden = true;
      $('studioWidth').value = Math.min(image.naturalWidth, 1200);
      window.renderStudioImage(); status('Ready to edit. The source image URL stays intact until you save your own copy.');
    } finally { URL.revokeObjectURL(url); }
  }
  window.loadStudioFile = async function(file) {
    if (!file || busy) return;
    const version = ++loadingVersion; sourceImage = null;
    if (file.size > 12 * 1024 * 1024) { status('Choose an image under 12 MB.'); return; }
    status('Loading image…');
    try { await loadBlob(file, version); } catch { status('Could not read this image. Try a JPEG, PNG or WebP file.'); }
  };
  window.loadStudioUrl = async function() {
    if (busy) return;
    const input = $('studioUrl').value.trim(); if (!input) return;
    const version = ++loadingVersion; sourceImage = null; status('Loading image…');
    try {
      const url = new URL(input, location.origin);
      const local = url.origin === location.origin || url.protocol === 'data:';
      const response = await fetch(local ? url.href : '/api/media/import?url=' + encodeURIComponent(url.href));
      if (!response.ok) {
        const data = await response.json().catch(() => ({})); throw Error(data.error || 'Image could not be loaded. Upload it from your computer.');
      }
      await loadBlob(await response.blob(), version);
    } catch (error) { if (version === loadingVersion) status(error.message); }
  };
  window.renderStudioImage = function() {
    if (!sourceImage) return;
    const sw = sourceImage.naturalWidth, sh = sourceImage.naturalHeight;
    const ratio = $('studioRatio').value === 'original' ? sw / sh : Number($('studioRatio').value);
    let cropWidth = Math.min(sw, sh * ratio), cropHeight = cropWidth / ratio;
    const zoom = Number($('studioZoom').value) || 1; cropWidth /= zoom; cropHeight /= zoom;
    const x = (sw - cropWidth) * Number($('studioX').value) / 100;
    const y = (sh - cropHeight) * Number($('studioY').value) / 100;
    const canvas = $('studioCanvas'); canvas.width = Math.min(2400, Math.max(120, Number($('studioWidth').value) || 1200));
    canvas.height = Math.round(canvas.width / ratio);
    canvas.getContext('2d').drawImage(sourceImage, x, y, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  };
  function inlineFigure(url) {
    const figure = document.createElement('figure');
    const image = document.createElement('img'); image.src = url; image.alt = $('studioAlt').value.trim(); image.loading = 'lazy';
    figure.append(image);
    const caption = $('studioCaption').value.trim();
    if (caption) { const node = document.createElement('figcaption'); node.textContent = caption; figure.append(node); }
    return figure;
  }
  function insertImage(url) {
    const figure = inlineFigure(url);
    if (editingImage?.isConnected) {
      const link = editingImage.closest('a');
      const existingFigure = editingImage.closest('figure');
      (existingFigure || link || editingImage).replaceWith(figure);
    } else if (currentViewMode === 'html') {
      const editor = $('htmlCodeEditor'); const selection = savedTextSelection || { start: editor.value.length, end: editor.value.length };
      editor.setRangeText(figure.outerHTML, selection.start, selection.end, 'end');
      setAllEditorContent(editor.value);
      return;
    } else {
      const editor = activeEditor(); editor.focus();
      const range = savedRange && editor.contains(savedRange.commonAncestorContainer) ? savedRange : document.createRange();
      if (range !== savedRange) { range.selectNodeContents(editor); range.collapse(false); }
      range.deleteContents();
      // A figure is a block: split the paragraph at the caret instead of nesting it in a paragraph.
      const anchor = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
      const block = anchor?.closest('p,h2,h3,h4');
      if (block && editor.contains(block)) {
        const tail = document.createRange(); tail.selectNodeContents(block); tail.setStart(range.startContainer, range.startOffset);
        const following = document.createElement('p'); following.append(tail.extractContents());
        if (!following.textContent && !following.querySelector('img')) following.append(document.createElement('br'));
        block.after(figure, following); range.selectNodeContents(following); range.collapse(true);
      } else { range.insertNode(figure); range.setStartAfter(figure); range.collapse(true); }
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); savedRange = range.cloneRange();
    }
    syncVisualEditors();
  }
  window.injectStudioImage = async function(target) {
    if (busy || !sourceImage) { status('Choose and load an image first.'); return; }
    busy = true; $('imageStudio').querySelectorAll('button').forEach(button => button.disabled = true);
    status('Saving independent image to this site…');
    try {
      const preview = $('studioCanvas');
      const output = document.createElement('canvas'); output.width = preview.width; output.height = preview.height;
      output.getContext('2d').drawImage(preview, 0, 0);
      const targetBytes = Math.max(20, Math.min(49, Number($('studioFileSize').value) || 49)) * 1024;
      const encode = quality => new Promise(resolve => output.toBlob(resolve, 'image/webp', quality));
      let quality = 0.8, blob = await encode(quality);
      if (!blob || blob.type !== 'image/webp') throw Error('This browser cannot export WebP.');
      while (blob.size > targetBytes && quality > 0.65) { quality -= 0.05; blob = await encode(quality); }
      while (blob && blob.size > targetBytes && output.width > 160) {
        const scaled = document.createElement('canvas'); scaled.width = Math.round(output.width * 0.8); scaled.height = Math.round(output.height * 0.8);
        scaled.getContext('2d').drawImage(output, 0, 0, scaled.width, scaled.height);
        output.width = scaled.width; output.height = scaled.height; output.getContext('2d').drawImage(scaled, 0, 0);
        blob = await encode(quality);
      }
      if (!blob || blob.size >= 50 * 1024) throw Error('Could not reach 50 KB. Choose a smaller crop and try again.');
      const exportedSize = Math.round(blob.size / 1024);
      const form = new FormData(); form.append('image', blob, 'edited-image.webp');
      const response = await fetch('/api/media/upload', { method: 'POST', body: form });
      const data = await response.json(); if (!response.ok || !data.success) throw Error(data.error || 'Image could not be saved.');
      if (target === 'thumbnail' || target === 'both') setImagePreview(data.url);
      if (target === 'inline' || target === 'both') insertImage(data.url);
      busy = false; window.closeImageStudio(); toast('WebP saved · ' + exportedSize + ' KB · ' + output.width + ' × ' + output.height + '. Save your draft to keep the post changes.');
    } catch (error) { status(error.message); }
    finally { busy = false; $('imageStudio').querySelectorAll('button').forEach(button => button.disabled = false); }
  };
  for (const id of ['postVisualEditor', 'splitPostEditor']) {
    $(id).addEventListener('dblclick', event => {
      if (event.target instanceof HTMLImageElement) { event.preventDefault(); window.openImageStudio(event.target); }
    });
    $(id).addEventListener('click', event => { if (event.target.closest('a')) event.preventDefault(); });
  }
  window.unlinkAndCleanImage = () => window.openImageStudio();
  window.processImageFileToWebp = file => { window.openImageStudio(); window.loadStudioFile(file); };
  // A single quiet notification surface replaces success alerts; errors remain explicit.
  const originalAlert = window.alert.bind(window);
  window.alert = message => { if (/^(✓|🇰🇭)/.test(message)) toast(message); else originalAlert(message); };
  // Format the currently active visual editor, including split mode.
  window.execFormat = (command, value = null) => {
    if (currentViewMode === 'html') { toast('Switch to Post or Split view to use text formatting.'); return; }
    activeEditor().focus(); document.execCommand(command, false, value); syncVisualEditors();
  };
  window.execFormatBlock = tag => window.execFormat('formatBlock', tag);
  const originalSelectStyle = window.selectStyle;
  window.selectStyle = style => {
    originalSelectStyle(style);
    document.querySelectorAll('.style-card').forEach(card => card.setAttribute('aria-pressed', String(card.getAttribute('data-style') === style)));
  };
  document.querySelectorAll('.style-card').forEach(card => {
    card.tabIndex = 0; card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', String(card.classList.contains('selected')));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.selectStyle(card.getAttribute('data-style')); }
    });
  });
  const originalOpenAi = window.openAiModal, originalCloseAi = window.closeAiModal;
  let aiReturnFocus;
  window.openAiModal = () => { aiReturnFocus = document.activeElement; originalOpenAi(); $('fetchUrlInput').focus(); };
  window.closeAiModal = () => { originalCloseAi(); if (aiReturnFocus?.isConnected) aiReturnFocus.focus(); };
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || $('aiModal').style.display === 'none') return;
    const focusable = [...$('aiModal').querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"],summary')].filter(node => !node.disabled && node.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
})();
