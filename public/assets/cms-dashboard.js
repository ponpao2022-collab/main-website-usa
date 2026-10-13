(() => {
  const $ = id => document.getElementById(id);
  const search = $('cmsArticleSearch'), status = $('cmsStatusFilter'), category = $('cmsCategoryFilter');
  let postsTab = 'active';
  window.toggleDashboardNav = function(open) {
    const expanded = typeof open === 'boolean' ? open : !document.body.classList.contains('nav-open');
    document.body.classList.toggle('nav-open', expanded);
    document.querySelector('.cms-menu').setAttribute('aria-expanded', String(expanded));
  };
  const mainSwitch = window.switchMainTab;
  window.switchMainTab = function(tab) {
    mainSwitch(tab);
    for (const [id, name] of [['mainTabArticlesBtn', 'articles'], ['mainTabTrackingBtn', 'tracking']]) {
      $(id).className = 'cms-nav-item';
      if (name === tab) $(id).setAttribute('aria-current', 'page'); else $(id).removeAttribute('aria-current');
    }
    $('cmsPageName').textContent = tab === 'articles' ? 'Articles' : 'Live audience';
    $('cmsPageHeading').textContent = tab === 'articles' ? 'Manage your stories' : 'Your audience, right now';
    $('cmsPageDescription').textContent = tab === 'articles' ? 'Write, publish and keep your newsroom moving.' : 'Follow active readers, popular stories and visitor locations.';
    window.toggleDashboardNav(false);
  };
  for (const [name, id] of [['openCategoriesModal', 'catModal'], ['openBackupModal', 'backupModal']]) {
    const originalOpen = window[name];
    window[name] = () => {
      window.toggleDashboardNav(false); originalOpen();
      document.getElementById(id).querySelector('input,button')?.focus();
    };
  }
  function filterPosts() {
    const query = search.value.trim().toLocaleLowerCase();
    const container = $(postsTab === 'active' ? 'activePostsView' : 'trashPostsView');
    let visible = 0;
    for (const row of container.querySelectorAll('.cms-post-row')) {
      const match = (!query || row.textContent.toLocaleLowerCase().includes(query)) &&
        (postsTab === 'trash' || status.value === 'all' || row.dataset.status === status.value) &&
        (category.value === 'all' || row.dataset.category === category.value) &&
        (!window.cmsDateRange || (() => { const raw = row.dataset.created; const time = Date.parse(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z'); return time >= window.cmsDateRange.start && time < window.cmsDateRange.end; })());
      row.hidden = !match; if (match) visible++;
      else { const checkbox = row.querySelector('input[type=checkbox]'); if (checkbox) checkbox.checked = false; }
    }
    $('cmsResultCount').textContent = visible + (visible === 1 ? ' article' : ' articles');
    const rows = container.querySelectorAll('.cms-post-row');
    let empty = container.querySelector('.cms-no-results');
    if (!empty) { empty = document.createElement('div'); empty.className = 'cms-no-results'; empty.textContent = 'No matching articles. Try another search or filter.'; container.append(empty); }
    empty.hidden = !rows.length || visible > 0;
    updateBulkBar(postsTab === 'active' ? 'published' : 'trash');
  }
  window.filterDashboardPosts = filterPosts;
  for (const element of [search, status, category]) element.addEventListener(element === search ? 'input' : 'change', filterPosts);
  const postsSwitch = window.switchPostsTab;
  window.switchPostsTab = tab => { postsSwitch(tab); postsTab = tab; status.disabled = tab === 'trash'; filterPosts(); };
  window.toggleSelectAll = (type, checked) => {
    const selector = type === 'published' ? '.post-check-published' : '.post-check-trash';
    document.querySelectorAll(selector).forEach(checkbox => { checkbox.checked = checked && !checkbox.closest('tr').hidden; });
    updateBulkBar(type);
  };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { window.toggleDashboardNav(false); closeCategoriesModal(); closeBackupModal(); }
    if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !$('mainArticlesView').classList.contains('hidden')) { event.preventDefault(); search.focus(); }
  });
  // Replace decorative emoji with the same restrained icon treatment used in navigation.
  const emojis = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\uFE0F?/gu;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const texts = []; while (walker.nextNode()) texts.push(walker.currentNode);
  for (const node of texts) if (!node.parentElement.closest('script,style')) node.textContent = node.textContent.replace(emojis, '').trim();
})();
