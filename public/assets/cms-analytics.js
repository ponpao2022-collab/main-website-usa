(() => {
  const $ = id => document.getElementById(id), offset = 7 * 3600000;
  const localValue = timestamp => new Date(timestamp + offset).toISOString().slice(0, 16);
  const utcValue = value => Date.parse(value + '+07:00');
  const format = timestamp => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Phnom_Penh', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
  let chartRequest = 0, reportRequest = 0, currentChartData = null;
  function presetRange(value) {
    const now = Date.now(), midnight = Math.floor((now + offset) / 86400000) * 86400000 - offset;
    if (value === 'today') return [midnight, now];
    if (value === 'yesterday') return [midnight - 86400000, midnight];
    const durations = { '1h': 3600000, '24h': 86400000, '7d': 7 * 86400000, '30d': 30 * 86400000 };
    return [now - (durations[value] || 3600000), now];
  }
  function setInputs(prefix, preset) {
    const [start, end] = presetRange(preset);
    $(prefix + 'Start').value = preset === 'all' ? '' : localValue(start); $(prefix + 'End').value = preset === 'all' ? '' : localValue(end);
    $(prefix + 'Start').disabled = preset === 'all'; $(prefix + 'End').disabled = preset === 'all';
  }
  async function query(prefix, lifetime = false) {
    let start = utcValue($(prefix + 'Start').value), end = utcValue($(prefix + 'End').value);
    if (!lifetime && $(prefix + 'Preset').value !== 'custom') [start, end] = presetRange($(prefix + 'Preset').value);
    if (!lifetime && (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)) throw Error('Choose a valid start and end time.');
    const response = await fetch('/api/analytics' + (lifetime ? '' : '?start=' + start + '&end=' + end));
    const result = await response.json(); if (!response.ok || !result.success) throw Error(result.error || 'Could not load report.');
    return result;
  }
  async function report() {
    const request = ++reportRequest, lifetime = $('cmsReportPreset').value === 'all';
    $('cmsReportStatus').textContent = 'Loading report…';
    try {
      const data = await query('cmsReport', lifetime); if (request !== reportRequest) return;
      const totals = data.totals;
      $('cmsPublishedMetric').textContent = totals.published.toLocaleString();
      $('cmsViewsMetric').textContent = totals.pageviews.toLocaleString();
      $('cmsBreakingMetric').textContent = totals.breaking.toLocaleString();
      $('cmsArticleCountMetric').textContent = totals.drafts + ' drafts · ' + totals.articles + ' total articles';
      window.cmsDateRange = lifetime ? null : { start: data.start, end: data.end }; window.filterDashboardPosts();
      $('cmsReportStatus').textContent = lifetime ? 'All-time pageviews. Article counts follow creation dates.' : format(data.start) + ' → ' + format(data.end) + '. Article counts follow creation dates. Timestamped pageviews recorded from ' + format(data.recordedSince) + '.';
    } catch (error) { if (request === reportRequest) $('cmsReportStatus').textContent = error.message; }
  }
  function graph(data) {
    currentChartData = data;
    const root = $('cmsAudienceGraph'); root.replaceChildren();
    const namespace = 'http://www.w3.org/2000/svg';
    const node = (tag, attributes = {}, text) => { const element = document.createElementNS(namespace, tag); for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value); if (text != null) element.textContent = text; return element; };
    const width = Math.max(360, root.clientWidth || 960), height = 240, left = 42, right = 18, top = 18, bottom = 38;
    const points = data.audience, peak = Math.max(0, ...points.map(point => point.readers)), max = Math.max(4, Math.ceil(peak / 4) * 4);
    const x = time => left + (Math.max(data.start, Math.min(data.end, time)) - data.start) / (data.end - data.start) * (width - left - right);
    const y = readers => height - bottom - readers / max * (height - top - bottom);
    const svg = node('svg', { viewBox: '0 0 ' + width + ' ' + height, role: 'img', 'aria-label': 'Peak concurrent readers, ' + format(data.start) + ' to ' + format(data.end) });
    for (let index = 0; index <= 4; index++) {
      const value = max * index / 4, lineY = y(value);
      svg.append(node('line', { x1: left, x2: width - right, y1: lineY, y2: lineY, stroke: '#e9edf3', 'stroke-dasharray': '4 4' }));
      svg.append(node('text', { x: left - 9, y: lineY + 4, 'text-anchor': 'end', fill: '#96a4b6', 'font-size': '11' }, String(Math.round(value))));
    }
    const timeTicks = width < 600 ? 2 : 4;
    for (let index = 0; index <= timeTicks; index++) {
      const time = data.start + (data.end - data.start) * index / timeTicks;
      svg.append(node('text', { x: x(time), y: height - 10, 'text-anchor': index === 0 ? 'start' : index === timeTicks ? 'end' : 'middle', fill: '#96a4b6', 'font-size': '10' }, format(time)));
    }
    let segment = [];
    const draw = () => { if (segment.length) svg.append(node('polyline', { points: segment.join(' '), fill: 'none', stroke: '#4d9b82', 'stroke-width': '2.5', 'stroke-linejoin': 'round' })); segment = []; };
    points.forEach((point, index) => { if (index && point.time - points[index - 1].time > data.bucketMs * 1.5) draw(); segment.push(x(point.time) + ',' + y(point.readers)); }); draw();
    for (const point of points) { const dot = node('circle', { cx: x(point.time), cy: y(point.readers), r: '3.5', fill: '#4d9b82', tabindex: '0' }); dot.append(node('title', {}, format(point.time) + ' · ' + point.readers + ' peak readers')); svg.append(dot); }
    if (!points.length) svg.append(node('text', { x: width / 2, y: height / 2, 'text-anchor': 'middle', fill: '#9aa8b9', 'font-size': '13' }, 'No recorded reader samples in this period.'));
    root.append(svg);
    $('cmsChartSummary').textContent = 'Peak ' + peak + ' · ' + Math.round(data.bucketMs / 60000) + '-minute buckets';
    $('cmsChartStatus').textContent = format(data.start) + ' → ' + format(data.end) + ' · History begins ' + format(data.recordedSince) + '. Gaps indicate periods without recorded samples.';
  }
  async function chart() {
    const request = ++chartRequest;
    if ($('cmsChartPreset').value !== 'custom') setInputs('cmsChart', $('cmsChartPreset').value);
    try { const data = await query('cmsChart'); if (request === chartRequest) graph(data); }
    catch (error) { if (request === chartRequest) $('cmsChartStatus').textContent = error.message; }
  }
  $('cmsReportPreset').addEventListener('change', () => { if ($('cmsReportPreset').value !== 'custom') setInputs('cmsReport', $('cmsReportPreset').value); else { if (!$('cmsReportStart').value || !$('cmsReportEnd').value) setInputs('cmsReport', 'today'); $('cmsReportStart').disabled = false; $('cmsReportEnd').disabled = false; } });
  $('cmsReportApply').addEventListener('click', report);
  $('cmsChartPreset').addEventListener('change', () => { if ($('cmsChartPreset').value !== 'custom') setInputs('cmsChart', $('cmsChartPreset').value); chart(); });
  $('cmsChartApply').addEventListener('click', chart);
  for (const prefix of ['cmsReport', 'cmsChart']) for (const suffix of ['Start', 'End']) $(prefix + suffix).addEventListener('change', () => $(prefix + 'Preset').value = 'custom');
  const switchTab = window.switchMainTab;
  window.switchMainTab = tab => { switchTab(tab); if (tab === 'tracking') chart(); };
  setInputs('cmsReport', 'all'); setInputs('cmsChart', '1h');
  window.addEventListener('resize', () => { if (currentChartData) graph(currentChartData); });
  chart(); setInterval(() => { if (!$('mainTrackingView').classList.contains('hidden')) chart(); }, 15000);
})();
