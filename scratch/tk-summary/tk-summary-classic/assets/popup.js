(function ($) {
  'use strict';
  if (!window.TKSC || !document.getElementById('post') || !document.getElementById('content')) return;
  const cfg = window.TKSC;
  const state = { article:null, free:null, mode:'rewrite', busy:false, sourceImage:null, selectedImage:null, rotation:0, flipped:false, flippedV:false, watermarkLogo:null, autoExcerpt:'', editorBookmark:null, textareaPos:null, modelCache:{},imageAssetsLoaded:false,view:'main',outW:null,cropRect:null,cropApplied:false,studioTab:'crop' };
  const $panel = $('#tksc-panel');
  const esc = value => $('<div>').text(String(value ?? '')).html();
  const status = value => $('#tksc-status').text(value);
  const send = (action, values={}) => new Promise((resolve, reject) => {
    $.post(cfg.ajax, Object.assign({action,nonce:cfg.nonce},values), null,'json')
      .done(r => r.success ? resolve(r.data) : reject(new Error(typeof r.data === 'string' ? r.data : 'Request failed.')))
      .fail(x => reject(new Error(typeof x.responseJSON?.data === 'string' ? x.responseJSON.data : 'Connection failed.')));
  });
  const setBusy = on => { state.busy = on; $('#tksc-run,#tksc-fetch,#tksc-save-settings,#tksc-image-inline,#tksc-image-featured,#tksc-reset-article,#tksc-reset-image').prop('disabled',on); };
  const editor = () => window.tinymce?.get('content');
  function editorHtml() {
    const ed=editor(); return ed && !ed.isHidden() ? ed.getContent() : $('#content').val() || '';
  }
  const plain = html => $('<div>').html(html).text().replace(/\s+/g,' ').trim();
  function writeEditor(html,title) {
    const ed=editor(); if (ed && !ed.isHidden()) { ed.setContent(html); ed.save(); }
    $('#content').val(html).trigger('change');
    if (title) $('#title').val(title).trigger('input');
    if (ed && !ed.isHidden()) ed.nodeChanged();
  }
  function formSet(name,value) {
    let input=$('#post').find('input[name="'+name+'"]');
    if (!input.length) input=$('<input type="hidden">').attr('name',name).appendTo('#post');
    input.val(value);
  }
  function persistArticleFields(html,ai) {
    const article=state.article;
    if (!article) return;
    const text=plain(html);
    const excerpt=(ai?.excerpt||'').trim()||text.slice(0,160);
    const current=$('#excerpt').val()?.trim();
    if (!current||(state.autoExcerpt&&current===state.autoExcerpt)){state.autoExcerpt=excerpt;$('#excerpt').val(excerpt).trigger('change');}
    const category=Number($('#tksc-category').val());
    if (category) $('#categorychecklist input[value="'+category+'"],#in-category-'+category).prop('checked',true).trigger('change');
    formSet('tksc_form_nonce',cfg.saveNonce);formSet('tksc_apply','1');
    const seo=Boolean(cfg.seo && $('#tksc-seo').prop('checked'));
    formSet('tksc_apply_seo',seo?'1':'');
    if (seo) {
      formSet('tksc_seo_title',article.title.slice(0,70));
      formSet('tksc_seo_desc',(ai?.desc||'').trim()||text.slice(0,160));
      formSet('tksc_seo_keyword',(ai?.keyword||'').trim()||article.title.split(/\s+/).slice(0,4).join(' '));
    }
    if (ai) applyAiTaxonomy(ai);
  }
  // AI SEO extras: tags go into the Tags box; slug only for posts that are not published yet.
  function applyAiTaxonomy(ai){
    const tags=(ai.tags||[]).filter(Boolean);
    if(tags.length&&$('#new-tag-post_tag').length){$('#new-tag-post_tag').val(tags.join(', '));$('#post_tag .tagadd, #tagsdiv-post_tag .tagadd').first().trigger('click');}
    if(ai.slug&&$('#original_post_status').val()!=='publish'){
      formSet('post_name',ai.slug);
      $('#editable-post-name').text(ai.slug);$('#editable-post-name-full').text(ai.slug);
    }
  }
  function safeHtml(raw) {
    const doc=new DOMParser().parseFromString('<div>'+String(raw||'')+'</div>','text/html');
    const allowed=new Set(['P','H2','H3','H4','STRONG','B','EM','I','U','MARK','SMALL','SUP','SUB','CODE','CITE','BLOCKQUOTE','UL','OL','LI','BR','HR','DIV','SPAN','TABLE','THEAD','TBODY','TR','TD','TH','FIGURE','FIGCAPTION','A']);
    const out=document.createElement('div');
    const copy=(node,dest)=>node.childNodes.forEach(child=>{
      if(child.nodeType===Node.TEXT_NODE){dest.appendChild(document.createTextNode(child.textContent));return;}
      if(child.nodeType!==Node.ELEMENT_NODE)return;
      if(/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|NOSCRIPT|TEMPLATE|SVG|MATH)$/i.test(child.tagName))return;
      if(!allowed.has(child.tagName)){copy(child,dest);return;}
      const el=document.createElement(child.tagName.toLowerCase());
      const style=child.getAttribute('style')||'';
      if(style&&!/url\s*\(|expression\s*\(|@import|[<>]/i.test(style))el.setAttribute('style',style);
      if(child.tagName==='A'){const href=child.getAttribute('href')||'';if(/^https?:\/\//i.test(href)){el.setAttribute('href',href);el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer');}}
      if((child.tagName==='TD'||child.tagName==='TH')&&/^\d{1,2}$/.test(child.getAttribute('colspan')||''))el.setAttribute('colspan',child.getAttribute('colspan'));
      copy(child,el);dest.appendChild(el);
    });
    copy(doc.body.firstElementChild||doc.body,out);
    return out.innerHTML;
  }
  /* v2.5 embeds: social/video posts stay where the source article placed them.
     YouTube, X, TikTok and Vimeo use a URL on its own line, which WordPress turns into the real embed card (oEmbed). */
  function canonicalEmbed(url){
    const s=String(url||'').trim();let m;
    if((m=s.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?(?:.*&)?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i)))return 'https://www.youtube.com/watch?v='+m[1];
    if((m=s.match(/(?:x|twitter)\.com\/(\w{1,20})\/status(?:es)?\/(\d+)/i)))return 'https://twitter.com/'+m[1]+'/status/'+m[2];
    if((m=s.match(/tiktok\.com\/(@[\w.-]+\/video\/\d+)/i)))return 'https://www.tiktok.com/'+m[1];
    if((m=s.match(/vimeo\.com\/(?:video\/)?(\d{5,})/i)))return 'https://vimeo.com/'+m[1];
    if((m=s.match(/instagram\.com\/((?:p|reel|tv)\/[\w-]+)/i)))return 'https://www.instagram.com/'+m[1]+'/';
    if(/^https:\/\/(?:www\.)?facebook\.com\/\S+\/(?:posts|videos)\/\S+/i.test(s))return s;
    return '';
  }
  function embedKind(url){return /youtube/.test(url)?'YouTube video':/twitter/.test(url)?'X / Twitter post':/tiktok/.test(url)?'TikTok video':/vimeo/.test(url)?'Vimeo video':/instagram/.test(url)?'Instagram post':'Facebook post';}
  function embedHtml(url) {
    const u=canonicalEmbed(url);if(!u)return '';
    if(/instagram|facebook/.test(u))return '<blockquote class="tksc-social" style="margin:18px 0;padding:14px 18px;border-left:4px solid #2563eb;background:#f8fafc;border-radius:8px"><a target="_blank" rel="noopener noreferrer" href="'+esc(u)+'">View this '+embedKind(u)+'</a></blockquote>';
    return '<p>'+esc(u)+'</p>';
  }
  function embedOn(url){const u=canonicalEmbed(url);return $('#tksc-embeds input[data-url]').filter((_,el)=>el.dataset.url===u).prop('checked')!==false;}
  function selectedEmbeds() {
    if(!state.article)return '';
    return $('#tksc-embeds input:checked').map((_,el)=>embedHtml(el.dataset.url)).get().join('\n');
  }
  /** Add checked embeds that are not already in the article (e.g. links found inside paragraphs). */
  function appendMissingEmbeds(html){
    const extra=$('#tksc-embeds input:checked').map((_,el)=>el.dataset.url).get().filter(u=>u&&!html.includes(u)).map(embedHtml).filter(Boolean);
    return extra.length?html+'\n'+extra.join('\n'):html;
  }
  /** Body text for AI / Free Format with [[EMBED_n]] placeholders at the embed positions. */
  function bodyWithEmbeds(blocks){
    const urls=[];
    const text=blocks.map(b=>{if(b.type!=='embed')return b.text;if(!embedOn(b.url))return '';urls.push(canonicalEmbed(b.url));return '[[EMBED_'+urls.length+']]';}).filter(Boolean).join('\n\n');
    return {text,urls};
  }
  function restoreEmbeds(html,urls){
    const embed=n=>embedHtml(urls[Number(n)-1]||'');
    html=String(html||'').replace(/\[(?:<\/?[a-z][^>]*>)*\[\s*EMBED_(\d+)\s*\](?:<\/?[a-z][^>]*>)*\]/gi,'[[EMBED_$1]]');
    // A placeholder sharing a paragraph with text is split out so the embed card stands alone.
    html=html.replace(/(<p\b[^>]*>)([\s\S]*?)<\/p>/gi,(all,open,inner)=>{
      if(!/\[\[EMBED_\d+\]\]/.test(inner))return all;
      return inner.split(/(\[\[EMBED_\d+\]\])/).map(part=>{const m=part.match(/^\[\[EMBED_(\d+)\]\]$/);if(m)return embed(m[1]);return $('<div>').html(part).text().trim()?open+part+'</p>':'';}).join('\n');
    });
    return html.replace(/\[\[EMBED_(\d+)\]\]/g,(_,n)=>embed(n));
  }
  function sourceBlocks() {
    if(!state.article)return [];
    // Edits made in Classic Editor after Fetch become input for Rewrite/Format; embeds keep their position.
    const doc=new DOMParser().parseFromString('<div>'+editorHtml()+'</div>','text/html');
    doc.querySelectorAll('script,style').forEach(el=>el.remove());
    const nodes=Array.from(doc.body.querySelectorAll('h2,h3,h4,p,blockquote,.tksc-video,figure,iframe'));
    const blocks=[];
    nodes.forEach(n=>{
      if(n.closest('.tksc-social,.tksc-video')&&!n.matches('.tksc-social,.tksc-video'))return;
      if(n.matches('.tksc-video,iframe')){const u=canonicalEmbed(n.querySelector('iframe')?.src||n.getAttribute('src')||'');if(u)blocks.push({type:'embed',url:u,text:''});return;}
      if(n.matches('.tksc-social')){const u=canonicalEmbed(n.querySelector('a')?.getAttribute('href')||'');if(u)blocks.push({type:'embed',url:u,text:''});return;}
      if(n.tagName==='FIGURE')return;
      const text=(n.textContent||'').trim();if(!text)return;
      const u=n.tagName==='P'&&/^https?:\/\/\S+$/.test(text)?canonicalEmbed(text):'';
      if(u)blocks.push({type:'embed',url:u,text:''});
      else blocks.push({type:/^H[234]$/.test(n.tagName)?'heading':'paragraph',text});
    });
    return blocks.some(b=>b.type!=='embed')?blocks:state.article.blocks;
  }
  function localFormat(blocks,style) {
    const id=style||'cnn';
    return blocks.map((b,i)=>{
      if(b.type==='embed')return embedOn(b.url)?embedHtml(b.url):'';
      const s=esc(b.text), head=b.type==='heading';
      if(head){if(id==='ap'||id==='tmz')return '<p><strong>'+s+'</strong></p>';
        return '<h2 style="'+(['foxnews','breaking','tabloid'].includes(id)?'font-weight:800;text-transform:uppercase;color:#143e70;':'font-weight:700;')+'">'+s+'</h2>';}
      const face=id==='ap'||id==='broadsheet'?'font-family:Georgia,serif;':'';
      const spacing=['tmz','breaking','axios'].includes(id)?'margin:0 0 9px;':'margin:0 0 16px;';
      let text=s;
      if(i===0&&id==='cnn')text='<em>'+s+'</em>';
      if(i===0&&['foxnews','dailymail','tabloid','breaking','people','usaviral'].includes(id))text='<strong>'+s+'</strong>';
      return '<p style="'+face+spacing+'">'+text+'</p>';
    }).join('\n');
  }
  function applyAppearance() {
    const mode=$('#tksc-launcher-choice').val()||'icon',style=$('#tksc-icon-choice').val()||'default';
    $('#tksc-open').toggleClass('text-only',mode==='text').removeClass('style-default style-fire style-pulse style-outline').addClass('style-'+style);
    $('.tksc-icon-preview').removeClass('style-default style-fire style-pulse style-outline').addClass('style-'+style);
    $('#tksc-icon-choice').prop('disabled',mode==='text');
  }
  /* v2.5 theme: light (original colours) or dark (Claude-style warm dark), saved per WordPress user. */
  function applyTheme(theme){
    const dark=theme==='dark';
    $panel.toggleClass('tksc-dark',dark);$('#tksc-open').toggleClass('tksc-dark',dark);
    $('#tksc-theme-button').attr({'aria-pressed':String(dark),title:dark?'Light mode':'Dark mode'});
  }
  applyTheme(cfg.theme);
  $('#tksc-theme-button').on('click',()=>{cfg.theme=cfg.theme==='dark'?'light':'dark';applyTheme(cfg.theme);send('tksc_save_theme',{theme:cfg.theme}).catch(()=>{});});
  $('#tksc-launcher-choice').val(cfg.launcher);$('#tksc-icon-choice').val(cfg.iconStyle);applyAppearance();
  $('#tksc-launcher-choice,#tksc-icon-choice').on('change',applyAppearance);
  cfg.styles.forEach(s=>$('#tksc-style').append($('<option>').val(s.id).text(s.label+' · '+s.tone)));
  const styleLogo=s=>cfg.styleBase+encodeURIComponent(s.logo?.split('/').pop()||'');
  cfg.styles.forEach(s=>{
    const b=$('<button type="button" class="tksc-thumb" role="option">').attr({'data-style':s.id,title:s.label,'aria-label':s.label});
    b.append($('<img alt="">').attr('src',styleLogo(s)));$('#tksc-style-thumbs').append(b);
  });
  $('#tksc-style-thumbs').on('click','.tksc-thumb',function(){$('#tksc-style').val(this.dataset.style).trigger('change');});
  function stepStyle(dir){const i=cfg.styles.findIndex(r=>r.id===$('#tksc-style').val()),n=cfg.styles.length;$('#tksc-style').val(cfg.styles[(i+dir+n)%n].id).trigger('change');}
  $('#tksc-style-prev').on('click',()=>stepStyle(-1));$('#tksc-style-next').on('click',()=>stepStyle(1));
  $('#tksc-style').on('change',function(){
    const s=cfg.styles.find(r=>r.id===$(this).val());
    if(!s)return;
    $('#tksc-style-description').text(s.tagline+' · '+s.rewriteWords);
    $('#tksc-style-icon').attr('src',styleLogo(s));
    $('#tksc-style-name').text(s.label);$('#tksc-style-tone').text(s.category+' · '+s.tone);
    $('#tksc-style-traits').empty();(s.traits||[]).forEach(t=>$('#tksc-style-traits').append($('<span>').text(t)));
    $('#tksc-style-feature').css('--tksc-accent',/^#[0-9a-f]{3,8}$/i.test(s.accent||'')?s.accent:'#2563eb');
    $('#tksc-style-counter').text((cfg.styles.indexOf(s)+1)+' / '+cfg.styles.length);
    const thumb=$('#tksc-style-thumbs .tksc-thumb').removeClass('on').attr('aria-selected','false').filter('[data-style="'+s.id+'"]').addClass('on').attr('aria-selected','true');
    const track=document.getElementById('tksc-style-thumbs');if(thumb[0]&&track)track.scrollTo({left:thumb[0].offsetLeft-track.clientWidth/2+thumb[0].offsetWidth/2,behavior:'smooth'});
  }).trigger('change');
  state.free=window.TKSC_FREE||null;
  if(state.free){
    state.free.FREE_PRESETS.forEach(p=>$('#tksc-preset').append($('<option>').val(p.id).text(p.label+' · '+(p.group||'classic'))));
    $('#tksc-preset').val('feature').trigger('change');
  } else status('Cannot load Free Format. Refresh the editor.');
  if(state.free){
    const groups=state.free.FREE_GROUPS||[{id:'classic',label:'Classic'}];
    groups.forEach(g=>{
      const items=state.free.FREE_PRESETS.filter(p=>(p.group||'classic')===g.id);if(!items.length)return;
      $('#tksc-preset-grid').append($('<p class="tksc-group-label">').text(g.label));
      const grid=$('<div class="tksc-card-grid">');
      items.forEach(p=>{
        const card=$('<button type="button" class="tksc-preset-card">').attr({'data-preset':p.id,title:p.hint||p.label});
        card.append($('<span class="tksc-pc-icon" aria-hidden="true">').html(state.free.FREE_PRESET_ICON_SVG[p.icon]||state.free.FREE_PRESET_ICON_SVG.FileText||'◇'));
        card.append($('<strong>').text(p.label));card.append($('<small>').text(p.hint||''));grid.append(card);
      });
      $('#tksc-preset-grid').append(grid);
    });
    $('#tksc-preset-grid').on('click','.tksc-preset-card',function(){$('#tksc-preset').val(this.dataset.preset).trigger('change');});
  }
  $('#tksc-preset').on('change',function(){
    const p=state.free?.FREE_PRESETS.find(r=>r.id===$(this).val());
    $('#tksc-preset-description').text(p?.hint||'');
    $('#tksc-preset-icon').html(p&&state.free.FREE_PRESET_ICON_SVG[p.icon]||'◇');
    $('#tksc-preset-grid .tksc-preset-card').removeClass('on').filter('[data-preset="'+(p?.id||'')+'"]').addClass('on');
    if(state.free)$('#tksc-preset-counter').text((state.free.FREE_PRESETS.indexOf(p)+1)+' / '+state.free.FREE_PRESETS.length);
  });
  if(state.free)$('#tksc-preset').trigger('change');
  cfg.categories.forEach(c=>$('#tksc-category').append($('<option>').val(c.id).text(c.name)));
  if(cfg.seo)$('#tksc-seo-wrap').prop('hidden',false).find('#tksc-seo-name').text(cfg.seo);
  function setMode(mode){
    state.mode=mode;
    $('.tksc-mode button').removeClass('active').filter('[data-mode="'+mode+'"]').addClass('active');
    $('#tksc-style-section').prop('hidden',mode==='free');$('#tksc-free-section').prop('hidden',mode!=='free');
    $('#tksc-run').text(mode==='rewrite'?'Rewrite in Classic Editor':mode==='free'?'Apply Free Format to Editor':'Format Only in Editor');
    $('#tksc-mode-description').text(mode==='rewrite'?'AI writes original copy in the selected style. Check facts before publishing.':mode==='free'?'The only no-API mode: 30 extension presets, formatted locally for $0.':'AI applies the selected style layout and keeps 100% of the original words (same as the extension).');
  }
  $('.tksc-mode button').on('click',function(){setMode($(this).data('mode'));});setMode('rewrite');
  function setModelOptions(selector,provider){
    const saved=cfg.model[provider]||'';
    const list=state.modelCache[provider]||[];
    const el=$(selector).empty();
    el.append($('<option>').val('').text(list.length?'Choose a model manually':'Save key, then refresh models'));
    list.forEach(m=>el.append($('<option>').val(m.id).text(m.label||m.id)));
    if(saved && list.length && !list.some(m=>m.id===saved)){
      cfg.model[provider]='';
      status('Previously selected model is unavailable. Choose another model and Save settings; no model was switched automatically.');
    }
    el.val(saved && list.some(m=>m.id===saved)?saved:'');
  }
  /* v2.5 API key field: the saved key stays in the field (hidden as dots), with show/hide and Connect. */
  state.savedKey={};state.conn={};
  const keyVal=()=>($('#tksc-api-key').val()||'').trim();
  const keyDirty=p=>keyVal()!==(state.savedKey[p]||'');
  function setConn(p,mode,text){
    state.conn[p]={mode,text};
    if($('#tksc-provider').val()!==p)return;
    $('#tksc-conn-status').attr('data-state',mode).find('span').text(text);
    $('#tksc-connect').toggleClass('is-connected',mode==='ok').find('span').text(mode==='ok'?'Connected':mode==='busy'?'Connecting…':'Connect');
  }
  function showConn(p){const c=state.conn[p]||(cfg.hasKey[p]?{mode:'saved',text:'Key saved · press Connect to verify'}:{mode:'none',text:'Not connected'});setConn(p,c.mode,c.text);}
  async function fillSavedKey(p){
    if(!cfg.isAdmin||!cfg.hasKey[p]||state.savedKey[p]!==undefined){if(state.savedKey[p]!==undefined&&$('#tksc-provider').val()===p&&!keyVal())$('#tksc-api-key').val(state.savedKey[p]);return;}
    try{const r=await send('tksc_get_key',{provider:p});state.savedKey[p]=r.key||'';if($('#tksc-provider').val()===p)$('#tksc-api-key').val(state.savedKey[p]);}catch(e){}
  }
  $('#tksc-key-eye').on('click',function(){const input=document.getElementById('tksc-api-key'),show=input.type==='password';input.type=show?'text':'password';this.setAttribute('aria-pressed',String(show));this.title=show?'Hide API key':'Show API key';this.setAttribute('aria-label',this.title);$(this).toggleClass('is-on',show);});
  $('#tksc-api-key').on('input',function(){const p=$('#tksc-provider').val();if(keyDirty(p))setConn(p,'none',keyVal()?'New key · press Connect':'Field empty · Save settings removes the saved key');else showConn(p);});
  async function loadModels(provider,announce=false){
    if(keyDirty(provider)){status('Press Connect to save the new key before refreshing models.');return false;}
    if(!cfg.hasKey[provider]){if(announce)status('Save the '+provider+' API key first.');return false;}
    setConn(provider,'busy','Checking key…');
    try{const data=await send('tksc_list_models',{provider});state.modelCache[provider]=data.models||[];
      if($('#tksc-provider').val()===provider)setModelOptions('#tksc-model',provider);
      setConn(provider,'ok','Connected · '+data.models.length+' models available');
      if(announce)status('Loaded '+data.models.length+' '+provider+' models available to this key.');
      return true;
    }catch(e){setConn(provider,'err','Not connected · '+e.message);if(announce)status(e.message);return false;}
  }
  $('#tksc-connect').on('click',async()=>{
    const provider=$('#tksc-provider').val();
    if(!cfg.isAdmin)return;
    if(!keyVal())return status('Paste the '+provider+' API key first.');
    const btn=$('#tksc-connect').prop('disabled',true);
    try{
      if(keyDirty(provider)){
        setConn(provider,'busy','Saving key…');
        const result=await send('tksc_save_settings',{launcher:$('#tksc-launcher-choice').val(),icon_style:$('#tksc-icon-choice').val(),provider,api_key:keyVal(),clear_key:0,model:''});
        cfg.hasKey=result.hasKey;cfg.model=result.model;cfg.provider=provider;state.savedKey[provider]=keyVal();state.modelCache[provider]=[];setModelOptions('#tksc-model',provider);
      }
      if(await loadModels(provider,false))status(cfg.model[provider]?'Connected. Rewrite and Format use '+cfg.model[provider]+'.':'Connected. Choose a model, test it, then Save settings.');
      else status('Could not connect with this key. Check the key and try again.');
    }catch(e){setConn(provider,'err','Not connected · '+e.message);status(e.message);}
    finally{btn.prop('disabled',false);}
  });
  $('#tksc-provider').val(cfg.provider||'gemini');
  setModelOptions('#tksc-model',cfg.provider);
  $('#tksc-provider').on('change',function(){const p=this.value;$('#tksc-api-key').val(state.savedKey[p]||'');showConn(p);fillSavedKey(p);setModelOptions('#tksc-model',p);if(cfg.hasKey[p])loadModels(p);});
  showConn(cfg.provider||'gemini');
  $('#tksc-load-models').on('click',()=>loadModels($('#tksc-provider').val(),true));
  $('#tksc-test-model').on('click',async()=>{
    const provider=$('#tksc-provider').val(),model=$('#tksc-model').val();
    if(keyDirty(provider))return status('Press Connect to save the new key before testing a model.');
    if(!model)return status('Refresh the list, then choose an exact model before testing.');
    $('#tksc-test-model').prop('disabled',true);status('Testing '+model+' with a short API request…');
    try{const result=await send('tksc_test_model',{provider,model});status(result.message+' Save settings to use this model for Rewrite.');}
    catch(e){status('Test failed for '+model+': '+e.message+'. No other model was called.');}
    finally{$('#tksc-test-model').prop('disabled',false);}
  });
  function switchView(view){
    state.view=view;
    $('#tksc-main').prop('hidden',view!=='main');
    $('#tksc-image-studio').prop('hidden',view!=='image');
    $('#tksc-settings').prop('hidden',view!=='settings');
    $('#tksc-editor-button,#tksc-image-button,#tksc-settings-button').each((_,el)=>{
      const selected=el.id===('tksc-'+(view==='main'?'editor':view==='image'?'image':'settings')+'-button');
      el.classList.toggle('is-active',selected);el.setAttribute('aria-pressed',String(selected));
    });
    $('#tksc-panel .tksc-scroll').scrollTop(0);
    if(view==='image'&&state.article&&!state.imageAssetsLoaded)populateAssets(state.article);
    if(view==='settings')fillSavedKey($('#tksc-provider').val());
    if(view==='settings'&&cfg.hasKey[$('#tksc-provider').val()]&&!state.modelCache[$('#tksc-provider').val()])loadModels($('#tksc-provider').val(),true);
  }
  $('#tksc-reset-article').on('click',()=>{
    if(state.busy)return;
    if(editorHtml().trim()&&!window.confirm('Clear the Classic Editor article and TK Summary fetch state?'))return;
    state.article=null;state.imageAssetsLoaded=false;
    writeEditor('','');$('#title,#tksc-url').val('').trigger('change');
    if(state.autoExcerpt&&$('#excerpt').val()===state.autoExcerpt)$('#excerpt').val('').trigger('change');state.autoExcerpt='';
    $('#tksc-embeds').empty();$('#tksc-embeds-wrap').prop('hidden',true);$('#tksc-category').val('');
    $('#post').find('input[name^="tksc_"]').remove();
    $('#tksc-image-list').empty();resetImage(true);
    status('Article and TK Summary fields reset. Already saved post metadata is unchanged until you save this post.');
  });
  function populateAssets(a){
    $('#tksc-image-list').empty();
    (a.images||[]).forEach((image,i)=>{
      const button=$('<button type="button" class="tksc-image-choice">');
      button.append($('<img>').attr({src:image.url,alt:image.alt||'Article image',referrerpolicy:'no-referrer',loading:'lazy'}));
      button.append($('<span>').text(image.alt||'Image '+(i+1)));
      button.on('click',()=>loadRemoteImage(image,button));$('#tksc-image-list').append(button);
    });
    if(!a.images?.length)$('#tksc-image-list').append($('<p class="tksc-tip">').text('No article images found. You can choose a local image below.'));
    state.sourceImage=null;state.selectedImage=null;$('#tksc-image-canvas').prop('hidden',true);$('#tksc-image-placeholder').prop('hidden',false);$('#tksc-img-alt,#tksc-img-title,#tksc-img-caption').val('');
    state.imageAssetsLoaded=true;
  }
  $('#tksc-fetch').on('click',async()=>{
    const url=$('#tksc-url').val().trim();if(!url)return status('Paste an article URL.');
    if(editorHtml().trim()&&!window.confirm('Replace the current Classic Editor article with fetched text?'))return;
    setBusy(true);status('Fetching article…');
    try{
      const a=await send('tksc_fetch',{url});state.article=a;
      state.imageAssetsLoaded=false;
      $('#tksc-image-list').empty();
      const urls=[...new Set((a.embeds||[]).map(canonicalEmbed).filter(Boolean))],inline=new Set((a.blocks||[]).filter(b=>b.type==='embed').map(b=>canonicalEmbed(b.url)));
      const rows=urls.map((url,i)=>'<label class="tksc-media-item"><input type="checkbox" data-index="'+i+'" data-url="'+esc(url)+'" checked> <span class="tksc-embed-kind">'+esc(embedKind(url))+'</span><small>'+(inline.has(url)?'in article position':'added at the end')+'</small></label>');
      $('#tksc-embeds').html(rows.join(''));$('#tksc-embeds-wrap').prop('hidden',!rows.length);
      const html=appendMissingEmbeds(localFormat(a.blocks,'cnn'));
      writeEditor(html,a.title);persistArticleFields(html);
      status((a.note?a.note+' ':'')+'Fetched '+(a.words||a.blocks.length)+' words into Classic Editor. Images remain only in Image Studio until you insert them.');
    }catch(e){status(e.message);}finally{setBusy(false);}
  });
  $('#tksc-run').on('click',async()=>{
    if(!state.article)return status('Fetch an article first.');
    const blocks=sourceBlocks(),prepared=bodyWithEmbeds(blocks),body=prepared.text;
    if(!body.replace(/\[\[EMBED_\d+\]\]/g,'').trim())return status('Classic Editor has no article text to process.');
    const style=$('#tksc-style').val(),finish=raw=>appendMissingEmbeds(restoreEmbeds(safeHtml(raw),prepared.urls));
    if(state.mode==='format'){
      const provider=cfg.provider,model=cfg.model[provider];
      if(!cfg.hasKey[provider])return status('Format Only uses the AI API. Set the '+provider+' API key in settings, or choose Free Format (no API).');
      if(!model)return status('Open settings, refresh available models, choose one and Save before Format Only.');
      setBusy(true);status('Formatting with '+provider+' / '+model+' — keeping 100% of the original words…');
      try{
        const seo=Boolean(cfg.seo&&$('#tksc-seo').prop('checked'));
        const result=await send('tksc_format',{body,title:state.article.title,style,provider,seo:seo?1:0});
        const html=finish(result.html);
        writeEditor(html,state.article.title);persistArticleFields(html,result.seo);
        let note='Format Only applied with '+result.model+'. No images were inserted.';
        if(result.truncated)note='Warning: the model hit its output limit, the end of the article may be missing. Try a shorter article or another model.';
        else if(result.coverage&&result.coverage<0.85)note='Formatted, but the output has about '+Math.round(result.coverage*100)+'% of the source words. Compare with the source before publishing.';
        status(note);
      }catch(e){status(e.message);}finally{setBusy(false);}
      return;
    }
    if(state.mode==='free'){
      if(!state.free)return status('Free Format is still loading.');
      const r=state.free.freeFormatArticle({title:state.article.title,body,preset:$('#tksc-preset').val(),sourceUrl:''});
      const html=finish(r.content_html);
      writeEditor(html,state.article.title);persistArticleFields(html);
      return status('Free Format applied to Classic Editor. No images were inserted.');
    }
    const provider=cfg.provider,model=cfg.model[provider];
    if(!cfg.hasKey[provider])return status('Set the '+provider+' API key in popup settings first.');
    if(!model)return status('Open settings, refresh available models, choose one and Save before Rewrite.');
    setBusy(true);status('Rewriting with '+provider+' / '+model+'…');
    try{
      const result=await send('tksc_rewrite',{body,title:state.article.title,style,provider,model});
      const html=finish(result.html);
      writeEditor(html,state.article.title);persistArticleFields(html);
      status('Rewrite is now in Classic Editor. Review facts and insert only the images you want.');
    }catch(e){status(e.message);}finally{setBusy(false);}
  });
  $('#tksc-save-settings').on('click',async()=>{
    setBusy(true);status('Saving settings…');
    const provider=$('#tksc-provider').val(),admin=Boolean(cfg.isAdmin&&$('#tksc-api-key').length),keyChanged=admin&&keyDirty(provider),clearKey=keyChanged&&!keyVal()&&cfg.hasKey[provider];
    if(clearKey&&!window.confirm('Remove the saved '+provider+' API key from this site?')){setBusy(false);status('Key kept.');return;}
    if(keyChanged){state.modelCache[provider]=[];$('#tksc-model').val('');}
    try{const result=await send('tksc_save_settings',{
      launcher:$('#tksc-launcher-choice').val(),icon_style:$('#tksc-icon-choice').val(),provider,
      api_key:keyChanged?keyVal():'',clear_key:clearKey?1:0,model:$('#tksc-model').val()||''
    });
      cfg.hasKey=result.hasKey;cfg.model=result.model;cfg.provider=provider;
      if(keyChanged){state.savedKey[provider]=clearKey?'':keyVal();state.conn[provider]=null;showConn(provider);}
      setModelOptions('#tksc-model',provider);
      if(cfg.hasKey[provider]&&!cfg.model[provider]){
        switchView('settings');
        status('API key saved. Refreshing available models; choose one, test it, and Save settings again.');
        await loadModels(provider,false);
      }else{
        switchView('main');
        status('Settings saved. '+(cfg.hasKey[provider]?'Rewrite will use '+cfg.model[provider]+'.':'Add an API key to use Rewrite.'));
      }
    }catch(e){status(e.message);}finally{setBusy(false);}
  });
  // Preserve the user's actual caret even when the floating popup takes focus.
  function captureCaret(){const ed=editor();if(ed&&!ed.isHidden()){
    try{state.editorBookmark=ed.selection.getBookmark(2,true);}catch(e){}
  }else state.textareaPos=document.getElementById('content')?.selectionStart||0;}
  $(document).on('mouseup keyup','#content',captureCaret);
  function bindTinyMCE(){const ed=editor();if(ed&&!ed.isHidden()&&!ed._tkscCaretBound){ed._tkscCaretBound=true;ed.on('mouseup keyup',captureCaret);}}
  if(window.tinymce)$(document).on('tinymce-editor-init',bindTinyMCE);
  const caretTimer=window.setInterval(()=>{bindTinyMCE();if(editor()?._tkscCaretBound)window.clearInterval(caretTimer);},500);
  function loadRemoteImage(meta,button){
    const src=cfg.ajax+'?'+new URLSearchParams({action:'tksc_image_proxy',nonce:cfg.nonce,url:meta.url});
    const image=new Image();
    status('Loading selected image for editing…');
    image.onload=()=>{state.sourceImage=image;state.selectedImage=meta;resetImageEdits();
      $('#tksc-image-list button').removeClass('active');button.addClass('active');
      $('#tksc-img-alt,#tksc-img-title').val(meta.alt||state.article?.title||'');drawCanvas();status('Image ready. Edit it, then choose Insert at cursor or Set Featured Image.');};
    image.onerror=()=>status('This source image could not be loaded. Choose a different image or local file.');
    image.src=src;
  }
  $('#tksc-local-file').on('change',function(){const file=this.files?.[0];if(!file)return;
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>8000000)return status('Choose PNG, JPEG or WebP smaller than 8 MB.');
    const url=URL.createObjectURL(file),image=new Image();image.onload=()=>{URL.revokeObjectURL(url);state.sourceImage=image;state.selectedImage={alt:file.name};resetImageEdits();
      $('#tksc-image-list button').removeClass('active');$('#tksc-img-alt,#tksc-img-title').val(file.name.replace(/\.[^.]+$/,''));drawCanvas();status('Local image ready for editing.');};
    image.onerror=()=>{URL.revokeObjectURL(url);status('Could not read this image.');};image.src=url;
  });
  function resetImageEdits(){
    state.rotation=0;state.flipped=false;state.flippedV=false;state.watermarkLogo=null;state.outW=null;state.cropRect=null;state.cropApplied=false;
    $('#tksc-ratio,#tksc-filter-preset').val('original');
    $('#tksc-brightness,#tksc-contrast,#tksc-saturation,#tksc-warmth').val(0).trigger('input');
    $('#tksc-wm-type').val('none').trigger('change');$('#tksc-wm-text,#tksc-wm-logo').val('');$('#tksc-wm-color').val('#ffffff');$('#tksc-wm-pos').val('bottom-right');$('#tksc-wm-opacity').val(85).trigger('input');
  }
  function resetImage(clearSource){
    resetImageEdits();
    if(clearSource){state.sourceImage=null;state.selectedImage=null;$('#tksc-local-file').val('');$('#tksc-image-list button').removeClass('active');$('#tksc-img-alt,#tksc-img-title,#tksc-img-caption').val('');$('#tksc-image-canvas').prop('hidden',true);$('#tksc-image-placeholder').prop('hidden',false);}
    else drawCanvas();
  }
  $('#tksc-reset-image').on('click',()=>{if(state.busy)return;resetImage(true);status('Image selection and edits cleared. Images already uploaded remain in the Media Library.');});
  $('#tksc-reset-edits').on('click',()=>{resetImage(false);status('Image edits returned to original.');});
  $('.tksc-studio-tabs button').on('click',function(){const tab=this.dataset.studio;$('.tksc-studio-tabs button').toggleClass('is-active',false);$(this).addClass('is-active');$('.tksc-studio-pane').each((_,el)=>{el.hidden=el.dataset.pane!==tab;});});
  const filterPresets={original:[0,0,0,0],vibrant:[4,10,22,0],warm:[3,7,5,23],dramatic:[-4,28,-8,0],clean:[5,12,7,0],mono:[0,10,-50,0]};
  $('#tksc-filter-preset').on('change',function(){const vals=filterPresets[this.value]||filterPresets.original;['brightness','contrast','saturation','warmth'].forEach((n,i)=>$('#tksc-'+n).val(vals[i]).trigger('input'));});
  $('#tksc-brightness,#tksc-contrast,#tksc-saturation,#tksc-warmth,#tksc-wm-opacity').on('input',function(){const base=this.id.replace('tksc-','');$('#'+this.id+'-value').text(this.value+'%');drawCanvas();});
  $('#tksc-wm-text,#tksc-wm-pos,#tksc-wm-color').on('input change',drawCanvas);
  $('#tksc-wm-type').on('change',function(){$('#tksc-wm-text-wrap').prop('hidden',this.value!=='text');$('#tksc-wm-logo-wrap').prop('hidden',this.value!=='logo');drawCanvas();});
  $('#tksc-wm-logo').on('change',function(){const file=this.files?.[0];if(!file)return;if(!/^image\/(png|webp)$/.test(file.type)||file.size>2000000)return status('Choose a PNG or WebP logo under 2 MB.');const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(url);state.watermarkLogo=im;drawCanvas();status('Logo badge ready.');};im.onerror=()=>{URL.revokeObjectURL(url);status('Could not load logo.');};im.src=url;});
  $('#tksc-generate-image-seo').on('click',()=>{if(!state.sourceImage)return status('Choose an image first.');const description=state.selectedImage?.alt||state.article?.title||'Image';$('#tksc-img-alt').val(description);$('#tksc-img-title').val(state.article?.title||description);$('#tksc-img-caption').val(description);status('SEO details filled from available source text. Review the description before uploading.');});
  /* v2.5 renderer: interactive crop rectangle (in rotated/flipped image pixels) + output size + watermark. */
  const ratioOf=r=>r==='1:1'?1:r==='4:3'?4/3:r==='facebook'?1200/628:r==='16:9'?16/9:r==='9:16'?9/16:null;
  function baseDims(){const im=state.sourceImage,rot=state.rotation%180!==0;return{w:rot?im.naturalHeight:im.naturalWidth,h:rot?im.naturalWidth:im.naturalHeight};}
  function centeredCrop(d){const r=ratioOf($('#tksc-ratio').val());let w=d.w,h=d.h;if(r){if(w/h>r)w=h*r;else h=w/r;}return{x:(d.w-w)/2,y:(d.h-h)/2,w,h};}
  function ensureCrop(d){
    let c=state.cropRect;
    if(!c||c.bw!==d.w||c.bh!==d.h||c.rot!==state.rotation)c=Object.assign(centeredCrop(d),{fh:state.flipped,fv:state.flippedV});
    // Keep the same picture area selected when the image is flipped.
    if(c.fh!==state.flipped){c.x=d.w-c.x-c.w;c.fh=state.flipped;}
    if(c.fv!==state.flippedV){c.y=d.h-c.y-c.h;c.fv=state.flippedV;}
    c.w=Math.max(20,Math.min(d.w,c.w));c.h=Math.max(20,Math.min(d.h,c.h));c.x=Math.max(0,Math.min(d.w-c.w,c.x));c.y=Math.max(0,Math.min(d.h-c.h,c.y));
    c.bw=d.w;c.bh=d.h;c.rot=state.rotation;state.cropRect=c;return c;
  }
  const cropEditing=()=>state.studioTab==='crop'&&!state.cropApplied;
  function paintImage(canvas,d,crop,scale,withMarks){
    const image=state.sourceImage;
    canvas.width=Math.max(1,Math.round(crop.w*scale));canvas.height=Math.max(1,Math.round(crop.h*scale));
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();
    ctx.translate(-crop.x*scale,-crop.y*scale);
    ctx.translate(d.w*scale/2,d.h*scale/2);ctx.scale(state.flipped?-scale:scale,state.flippedV?-scale:scale);ctx.rotate(state.rotation*Math.PI/180);
    const b=100+Number($('#tksc-brightness').val()),c=100+Number($('#tksc-contrast').val()),sat=100+Number($('#tksc-saturation').val()),warm=Number($('#tksc-warmth').val());
    ctx.filter='brightness('+b+'%) contrast('+c+'%) saturate('+sat+'%)'+(warm>0?' sepia('+Math.min(100,warm*2)+'%)':'')+(warm<0?' hue-rotate('+Math.abs(warm)*3+'deg)':'');
    ctx.drawImage(image,-image.naturalWidth/2,-image.naturalHeight/2);
    ctx.restore();
    if(!withMarks)return;
    const wm=$('#tksc-wm-type').val()==='text'?$('#tksc-wm-text').val()?.trim():'';
    if(wm){const size=Math.max(13,Math.round(canvas.width*.035));ctx.font='700 '+size+'px sans-serif';ctx.lineJoin='round';ctx.lineWidth=Math.max(2,size/6);ctx.strokeStyle='rgba(0,0,0,.72)';ctx.fillStyle=$('#tksc-wm-color').val()||'#ffffff';ctx.globalAlpha=Number($('#tksc-wm-opacity').val())/100;
      const pad=Math.max(12,Math.round(size*.9)),width=ctx.measureText(wm).width,pos=$('#tksc-wm-pos').val();let x=canvas.width-width-pad,y=canvas.height-pad;
      if(pos==='bottom-left'){x=pad;}else if(pos==='top-left'){x=pad;y=pad+size;}else if(pos==='top-right'){y=pad+size;}else if(pos==='center'){x=(canvas.width-width)/2;y=canvas.height/2;}
      ctx.strokeText(wm,x,y);ctx.fillText(wm,x,y);ctx.globalAlpha=1;}
    if($('#tksc-wm-type').val()==='logo'&&state.watermarkLogo){const im=state.watermarkLogo,width=Math.min(canvas.width*.22,im.naturalWidth),height=width*im.naturalHeight/im.naturalWidth,pad=Math.max(10,canvas.width*.025),pos=$('#tksc-wm-pos').val();let x=canvas.width-width-pad,y=canvas.height-height-pad;if(pos==='bottom-left')x=pad;else if(pos==='top-left'){x=pad;y=pad;}else if(pos==='top-right')y=pad;else if(pos==='center'){x=(canvas.width-width)/2;y=(canvas.height-height)/2;}ctx.globalAlpha=Number($('#tksc-wm-opacity').val())/100;ctx.drawImage(im,x,y,width,height);ctx.globalAlpha=1;}
  }
  function outputScale(crop){const maxW=Math.min(Math.round(crop.w),4000);if(state.outW)state.outW=Math.max(80,Math.min(maxW,Math.round(state.outW)));return state.outW?state.outW/crop.w:Math.min(1,1280/crop.w);}
  /** The final image (crop + size + watermark) used by Insert, Featured Image and Download. */
  function outputCanvas(){
    const d=baseDims(),crop=ensureCrop(d),preview=document.getElementById('tksc-image-canvas');
    if(!cropEditing())return preview;
    const off=document.createElement('canvas');paintImage(off,d,crop,outputScale(crop),true);return off;
  }
  function drawCanvas(){const image=state.sourceImage;if(!image)return;
    const d=baseDims(),crop=ensureCrop(d),canvas=document.getElementById('tksc-image-canvas'),editing=cropEditing();
    const scale=outputScale(crop);
    if(editing)paintImage(canvas,d,{x:0,y:0,w:d.w,h:d.h},Math.min(1,1600/d.w),false);
    else paintImage(canvas,d,crop,scale,true);
    canvas.hidden=false;$('#tksc-image-placeholder').prop('hidden',true);
    state.crop={w:crop.w,h:crop.h,maxW:Math.min(Math.round(crop.w),4000),outW:Math.round(crop.w*scale),outH:Math.round(crop.h*scale),editing};
    syncResizeUI();
  }
  function syncCropUI(){
    const box=document.getElementById('tksc-crop-box'),c=state.cropRect,editing=state.sourceImage&&state.crop?.editing;
    $('#tksc-resize-box').toggleClass('is-cropping',Boolean(editing));
    box.hidden=!editing||!c;
    if(!box.hidden){box.style.left=(c.x/c.bw*100)+'%';box.style.top=(c.y/c.bh*100)+'%';box.style.width=(c.w/c.bw*100)+'%';box.style.height=(c.h/c.bh*100)+'%';$('#tksc-crop-dim').text(Math.round(c.w)+' × '+Math.round(c.h)+' px');}
    $('#tksc-apply-crop').text(state.cropApplied?'Edit crop':'Apply crop');
    const full=c&&Math.round(c.w)>=c.bw&&Math.round(c.h)>=c.bh;
    $('#tksc-crop-state').prop('hidden',!state.cropApplied||!c).text(c?(full?'No crop · full image':'Cropped to '+Math.round(c.w)+' × '+Math.round(c.h)+' px'):'');
    $('.tksc-pills [data-ratio]').removeClass('on').filter('[data-ratio="'+$('#tksc-ratio').val()+'"]').addClass('on');
  }
  /* v2.4 drag-to-resize: corner handles change the output pixel size (aspect ratio locked). */
  function resizeRef(){const c=state.crop;return c?Math.min(c.maxW,1280):1;}
  /* v2.5 drag-to-crop (same interaction as the extension): move the box or pull any of its 8 handles. */
  let cropDrag=null,cropFrame=0;
  $('#tksc-crop-box').on('pointerdown',function(e){
    if(!state.cropRect)return;e.preventDefault();
    const handle=e.target.dataset?.h||'move';
    cropDrag={mode:handle,x:e.clientX,y:e.clientY,start:Object.assign({},state.cropRect)};
    this.setPointerCapture?.(e.pointerId);$(this).addClass('is-dragging');
  }).on('pointermove',function(e){
    if(!cropDrag)return;
    const c=state.cropRect,rect=document.getElementById('tksc-image-canvas').getBoundingClientRect();if(!rect.width)return;
    const dx=(e.clientX-cropDrag.x)*c.bw/rect.width,dy=(e.clientY-cropDrag.y)*c.bh/rect.height,m=cropDrag.mode,st=cropDrag.start,min=30;
    let {x,y,w,h}=st;
    if(m==='move'){x=Math.max(0,Math.min(c.bw-w,x+dx));y=Math.max(0,Math.min(c.bh-h,y+dy));}
    else{
      if(m.includes('e'))w=Math.max(min,Math.min(c.bw-x,w+dx));
      if(m.includes('s'))h=Math.max(min,Math.min(c.bh-y,h+dy));
      if(m.includes('w')){const nw=Math.max(min,Math.min(x+w,w-dx));x+=w-nw;w=nw;}
      if(m.includes('n')){const nh=Math.max(min,Math.min(y+h,h-dy));y+=h-nh;h=nh;}
      const r=ratioOf($('#tksc-ratio').val());
      if(r){
        if(m==='n'||m==='s'){w=Math.min(h*r,c.bw);h=w/r;if(x+w>c.bw)x=c.bw-w;}
        else{h=Math.min(w/r,c.bh);w=h*r;if(m.includes('n'))y=st.y+st.h-h;if(y+h>c.bh)y=c.bh-h;if(m.includes('w'))x=st.x+st.w-w;}
        x=Math.max(0,x);y=Math.max(0,y);
      }
    }
    Object.assign(c,{x,y,w,h});state.outW=null;
    if(!cropFrame)cropFrame=requestAnimationFrame(()=>{cropFrame=0;const d=baseDims(),sc=outputScale(c);state.crop=Object.assign(state.crop||{},{w:c.w,h:c.h,maxW:Math.min(Math.round(c.w),4000),outW:Math.round(c.w*sc),outH:Math.round(c.h*sc)});syncResizeUI();});
  }).on('pointerup pointercancel lostpointercapture',function(){
    if(!cropDrag)return;cropDrag=null;$(this).removeClass('is-dragging');drawCanvas();
    status('Crop area '+Math.round(state.cropRect.w)+' × '+Math.round(state.cropRect.h)+' px. Press Apply crop to preview the result.');
  });
  $('.tksc-pills').on('click','[data-ratio]',function(){if(!state.sourceImage)return status('Choose an image first.');$('#tksc-ratio').val(this.dataset.ratio).trigger('change');});
  $('#tksc-apply-crop').on('click',()=>{if(!state.sourceImage)return status('Choose an image first.');state.cropApplied=!state.cropApplied;drawCanvas();status(state.cropApplied?'Crop applied. Drag a corner to resize, or continue with Filters and Watermark.':'Edit the crop box on the preview.');});
  $('#tksc-reset-crop').on('click',()=>{if(!state.sourceImage)return;$('#tksc-ratio').val('original');state.cropRect=null;state.cropApplied=false;state.outW=null;drawCanvas();status('Crop reset to the full image.');});
  $('.tksc-studio-tabs button').on('click',function(){state.studioTab=this.dataset.studio;if(state.sourceImage)drawCanvas();});
  function syncResizeUI(){
    const canvas=document.getElementById('tksc-image-canvas'),frame=document.getElementById('tksc-preview-frame');
    if(!canvas||!frame||!state.crop)return;
    const w=canvas.width,h=canvas.height,aspect=w/h;
    const fitW=Math.max(60,Math.min(frame.clientWidth-26,(frame.clientHeight-26)*aspect));
    const editing=state.crop.editing,shown=editing?fitW:Math.max(48,fitW*Math.min(1,w/resizeRef()));
    canvas.style.width=shown+'px';canvas.style.height=(shown/aspect)+'px';
    state.fitW=fitW;
    $('#tksc-size-badge').text(state.crop.outW+' × '+state.crop.outH+' px');
    if(document.activeElement?.id!=='tksc-out-w')$('#tksc-out-w').val(state.crop.outW);
    if(document.activeElement?.id!=='tksc-out-h')$('#tksc-out-h').val(state.crop.outH);
    syncCropUI();
    $('#tksc-out-w,#tksc-out-h').attr('max',null);$('#tksc-out-w').attr('max',state.crop.maxW);
  }
  let drag=null,dragFrame=0;
  $('#tksc-resize-box').on('pointerdown','.tksc-handle',function(e){
    if(!state.sourceImage||!state.crop)return;
    e.preventDefault();
    const corner=this.dataset.corner,canvas=document.getElementById('tksc-image-canvas');
    drag={x:e.clientX,y:e.clientY,startW:state.crop.outW,aspect:canvas.width/canvas.height,sx:corner.includes('e')?1:-1,sy:corner.includes('s')?1:-1,per:resizeRef()/Math.max(1,state.fitW||canvas.clientWidth)};
    this.setPointerCapture?.(e.pointerId);$('#tksc-resize-box').addClass('is-resizing');
  }).on('pointermove','.tksc-handle',function(e){
    if(!drag)return;
    // Use the larger of the horizontal and vertical drag so any corner direction feels natural.
    const dx=(e.clientX-drag.x)*drag.sx,dy=(e.clientY-drag.y)*drag.sy*drag.aspect,delta=Math.abs(dx)>Math.abs(dy)?dx:dy;
    state.outW=Math.max(80,Math.min(state.crop.maxW,Math.round(drag.startW+delta*2*drag.per)));
    if(!dragFrame)dragFrame=requestAnimationFrame(()=>{dragFrame=0;drawCanvas();});
  }).on('pointerup pointercancel lostpointercapture','.tksc-handle',function(){
    if(!drag)return;drag=null;$('#tksc-resize-box').removeClass('is-resizing');drawCanvas();
    const c=document.getElementById('tksc-image-canvas');status('Image resized to '+c.width+' × '+c.height+' px. Insert, Featured Image and Download use this size.');
  });
  $('#tksc-out-w').on('change',function(){if(!state.crop)return;const v=Number(this.value);if(v>0){state.outW=v;drawCanvas();}});
  $('#tksc-out-h').on('change',function(){if(!state.crop)return;const v=Number(this.value);if(v>0){state.outW=v*state.crop.w/state.crop.h;drawCanvas();}});
  $('.tksc-size-row [data-size]').on('click',function(){if(!state.sourceImage)return status('Choose an image first.');const v=this.dataset.size;state.outW=v==='auto'?null:Number(v);drawCanvas();});
  $(window).on('resize',()=>{if(state.sourceImage&&!$('#tksc-image-canvas').prop('hidden'))syncResizeUI();});
  $('#tksc-image-button').on('click',()=>setTimeout(()=>{if(state.sourceImage)syncResizeUI();},0));
  $('#tksc-rotate').on('click',()=>{state.rotation=(state.rotation+90)%360;drawCanvas();});
  $('#tksc-flip').on('click',()=>{state.flipped=!state.flipped;drawCanvas();});
  $('#tksc-flip-v').on('click',()=>{state.flippedV=!state.flippedV;drawCanvas();});
  $('#tksc-ratio').on('change',()=>{state.cropRect=null;state.cropApplied=false;state.outW=null;drawCanvas();});
  $('#tksc-download-webp').on('click',()=>{if(!state.sourceImage)return status('Choose an image first.');outputCanvas().toBlob(blob=>{if(!blob||blob.type!=='image/webp')return status('This browser cannot export WebP.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tk-summary-image.webp';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Downloaded edited WebP image.');},'image/webp',.85);});
  function saveImage(){return new Promise((resolve,reject)=>{
    if(!state.sourceImage)return reject(new Error('Choose an image in Image Studio first.'));
    outputCanvas().toBlob(blob=>{
      if(!blob||blob.type!=='image/webp')return reject(new Error('WebP conversion is unavailable in this browser.'));
      const fd=new FormData();fd.append('action','tksc_upload_image');fd.append('nonce',cfg.nonce);
      fd.append('alt',$('#tksc-img-alt').val().trim());fd.append('title',$('#tksc-img-title').val().trim());fd.append('caption',$('#tksc-img-caption').val().trim());fd.append('image',blob,'tk-summary-image.webp');
      $.ajax({url:cfg.ajax,type:'POST',data:fd,contentType:false,processData:false,dataType:'json'})
        .done(r=>r.success?resolve(r.data):reject(new Error(r.data||'Media upload failed.')))
        .fail(x=>reject(new Error(x.responseJSON?.data||'Media upload failed.')));
    },'image/webp',.85);
  });}
  $('#tksc-image-inline').on('click',async()=>{
    if(!state.sourceImage)return status('Select and edit an image first.');
    const currentEditor=editor();
    if(currentEditor&&!currentEditor.isHidden()&&!state.editorBookmark)return status('Click the exact place in Classic Editor where the image should go, then click Insert at cursor.');
    if((!currentEditor||currentEditor.isHidden())&&state.textareaPos===null)return status('Place the cursor in the Classic Editor Code field first.');
    setBusy(true);status('Uploading your WebP image…');
    try{const media=await saveImage();const html='<figure><img src="'+esc(media.url)+'" alt="'+esc(media.alt)+'"></figure>';
      const ed=editor();if(ed&&!ed.isHidden()){
        ed.focus();if(state.editorBookmark){try{ed.selection.moveToBookmark(state.editorBookmark);}catch(e){}}
        ed.execCommand('mceInsertContent',false,html);ed.save();
      }else{const field=document.getElementById('content'),pos=Math.min(state.textareaPos,field.value.length);
        field.value=field.value.slice(0,pos)+html+field.value.slice(pos);field.dispatchEvent(new Event('change',{bubbles:true}));}
      formSet('tksc_form_nonce',cfg.saveNonce);formSet('tksc_apply','1');
      status('WebP image inserted at the saved Classic Editor cursor.');
    }catch(e){status(e.message);}finally{setBusy(false);}
  });
  $('#tksc-image-featured').on('click',async()=>{
    if(!state.sourceImage)return status('Select and edit an image first.');
    setBusy(true);status('Uploading Featured Image…');
    try{const media=await saveImage();formSet('tksc_form_nonce',cfg.saveNonce);formSet('tksc_apply','1');formSet('tksc_image_id',media.id);
      if(window.wp?.media?.featuredImage?.set){try{window.wp.media.featuredImage.set(media.id);}catch(e){}}
      status('Featured Image selected. Save Draft or Publish to attach it to this post.');
    }catch(e){status(e.message);}finally{setBusy(false);}
  });
  $('#tksc-open').on('click',function(){$panel.prop('hidden',false);$(this).attr('aria-expanded','true');switchView('main');$('#tksc-url').trigger('focus');});
  $('#tksc-close').on('click',()=>{$panel.prop('hidden',true);$('#tksc-open').attr('aria-expanded','false').trigger('focus');});
  $('#tksc-editor-button').on('click',()=>switchView('main'));
  $('#tksc-image-button').on('click',()=>switchView('image'));
  $('#tksc-settings-button').on('click',()=>switchView('settings'));
  $(document).on('keydown',e=>{if(e.key==='Escape'&&!$panel.prop('hidden'))$('#tksc-close').trigger('click');});
})(jQuery);
