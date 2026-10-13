<?php
/**
 * Plugin Name: TK Summary for Classic Editor
 * Description: TK Summary popup for the existing Classic Editor, with the original extension's styles and Free Format presets.
 * Version: 2.5.0
 * Requires at least: 6.4
 * Requires PHP: 8.0
 * Author: TK Studio
 * Text Domain: tk-summary-classic
 */

defined('ABSPATH') || exit;

final class TK_Summary_Classic {
    const OPTION = 'tk_summary_classic_ai';
    const NONCE = 'tksc_ajax';

    public static function init() {
        add_action('admin_enqueue_scripts', [__CLASS__, 'assets']);
        add_action('wp_ajax_tksc_fetch', [__CLASS__, 'fetch']);
        add_action('wp_ajax_tksc_rewrite', [__CLASS__, 'rewrite']);
        add_action('wp_ajax_tksc_format', [__CLASS__, 'format_api']);
        add_action('wp_ajax_tksc_get_key', [__CLASS__, 'get_key']);
        add_action('wp_ajax_tksc_save_theme', [__CLASS__, 'save_theme']);
        add_action('wp_ajax_tksc_import_image', [__CLASS__, 'import_image']);
        add_action('wp_ajax_tksc_save_settings', [__CLASS__, 'save_settings']);
        add_action('wp_ajax_tksc_list_models', [__CLASS__, 'list_models']);
        add_action('wp_ajax_tksc_test_model', [__CLASS__, 'test_model']);
        add_action('wp_ajax_tksc_image_proxy', [__CLASS__, 'image_proxy']);
        add_action('wp_ajax_tksc_upload_image', [__CLASS__, 'upload_image']);
        add_action('save_post_post', [__CLASS__, 'save_fields'], 20, 2);
    }

    private static function styles() {
        $styles = json_decode((string)file_get_contents(__DIR__ . '/assets/styles.json'), true);
        return is_array($styles) ? $styles : [];
    }

    private static function valid_url($raw) {
        $url = esc_url_raw(trim((string)$raw));
        return in_array(wp_parse_url($url, PHP_URL_SCHEME), ['http', 'https'], true) && wp_http_validate_url($url) ? $url : false;
    }

    private static function authorize($cap = 'edit_posts') {
        if (!current_user_can($cap) || !check_ajax_referer(self::NONCE, 'nonce', false)) {
            wp_send_json_error('Permission denied or session expired.', 403);
        }
    }

    public static function assets($hook) {
        if (!in_array($hook, ['post.php', 'post-new.php'], true)) return;
        $screen = get_current_screen();
        if (!$screen || $screen->post_type !== 'post' || !current_user_can('edit_posts')) return;
        // The regular Classic Editor and the Classic block both expose #content; the popup only boots when TinyMCE or #content exists.
        $version = '2.5.0';
        wp_enqueue_media();
        wp_enqueue_style('tksc-popup', plugins_url('assets/popup.css', __FILE__), [], $version);
        wp_enqueue_script('tksc-free', plugins_url('assets/freeFormat.js', __FILE__), [], $version, true);
        wp_enqueue_script('tksc-popup', plugins_url('assets/popup.js', __FILE__), ['jquery','tksc-free'], $version, true);
        $settings = get_option(self::OPTION, []);
        wp_add_inline_script('tksc-popup', 'window.TKSC=' . wp_json_encode([
            'ajax' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce(self::NONCE),
            'saveNonce' => wp_create_nonce('tksc_save'),
            'styles' => self::styles(),
            'icon' => plugins_url('assets/icon.png', __FILE__),
            'isAdmin' => current_user_can('manage_options'),
            'hasKey' => ['gemini'=>!empty($settings['gemini_key'] ?? $settings['api_key']), 'claude'=>!empty($settings['claude_key'])],
            'provider' => get_user_meta(get_current_user_id(), 'tksc_provider', true) ?: 'gemini',
            'model' => ['gemini'=>$settings['gemini_model'] ?? '', 'claude'=>$settings['claude_model'] ?? ''],
            'styleBase' => plugins_url('assets/styles/', __FILE__),
            'launcher' => get_user_meta(get_current_user_id(), 'tksc_launcher', true) ?: 'icon',
            'iconStyle' => get_user_meta(get_current_user_id(), 'tksc_icon_style', true) ?: 'default',
            'theme' => get_user_meta(get_current_user_id(), 'tksc_theme', true) === 'dark' ? 'dark' : 'light',
            'seo' => self::seo_provider(),
            'categories' => array_map(static function($cat) {
                return ['id' => (int)$cat->term_id, 'name' => $cat->name];
            }, get_categories(['taxonomy'=>'category', 'hide_empty'=>false])),
        ]) . ';', 'before');
        add_action('admin_footer', [__CLASS__, 'popup']);
    }

    private static function seo_provider() {
        if (defined('RANK_MATH_VERSION')) return 'Rank Math';
        if (defined('WPSEO_VERSION')) return 'Yoast SEO';
        return '';
    }

    public static function popup() {
        $icon = esc_url(plugins_url('assets/icon.png', __FILE__)); ?>
        <button type="button" id="tksc-open" aria-label="Open TK Summary" title="Open TK Summary" aria-controls="tksc-panel" aria-expanded="false"><img src="<?php echo $icon; ?>" alt=""><span class="tksc-launch-label">TK Summary</span></button>
        <section id="tksc-panel" role="dialog" aria-label="TK Summary" hidden>
          <header class="tksc-head"><img src="<?php echo $icon; ?>" alt=""><div><strong>TK Summary</strong><small>Classic Editor assistant</small></div><nav class="tksc-head-nav" aria-label="TK Summary views"><button type="button" id="tksc-editor-button" class="tksc-head-tab is-active" title="Article" aria-label="Article" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5h10l4 4V20H5zM15 3.5V8h4M8 12h8M8 15h8M8 18h5"/></svg></button><button type="button" id="tksc-image-button" class="tksc-head-tab" title="Image Studio" aria-label="Image Studio" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="m4 17 5-5 4 3 3-4 5 6"/></svg></button><button type="button" id="tksc-settings-button" class="tksc-head-tab" title="Settings" aria-label="Settings" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button><button type="button" id="tksc-theme-button" class="tksc-head-tab" title="Dark mode" aria-label="Toggle dark mode" aria-pressed="false"><svg class="tksc-i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.6 6.6 0 0 0 10.7 10.7z"/></svg><svg class="tksc-i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button><button type="button" id="tksc-close" title="Close" aria-label="Close popup"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg></button></nav></header>
          <div class="tksc-scroll">
            <div id="tksc-main" class="tksc-view"><div class="tksc-view-bar"><strong>Article</strong><button type="button" id="tksc-reset-article" class="tksc-reset">Reset article</button></div>
              <label for="tksc-url">ARTICLE URL</label><div class="tksc-row"><input id="tksc-url" type="url" placeholder="https://example.com/article"><button id="tksc-fetch" type="button" class="tksc-primary">Fetch</button></div>
              <div class="tksc-mode" role="group" aria-label="Article preparation mode"><button type="button" data-mode="rewrite" class="active">Rewrite<small class="tksc-badge ai">AI</small></button><button type="button" data-mode="format">Format Only<small class="tksc-badge ai">AI</small></button><button type="button" data-mode="free">Free Format<small class="tksc-badge free">No API</small></button></div>
              <p class="tksc-tip" id="tksc-mode-description">Rewrite uses the selected AI provider. Check facts before publishing.</p>
              <div id="tksc-style-section"><div class="tksc-card-head"><label for="tksc-style">EDITORIAL STYLE · REWRITE / FORMAT ONLY</label><div class="tksc-style-nav"><span class="tksc-counter" id="tksc-style-counter">1 / 15</span><button type="button" id="tksc-style-prev" aria-label="Previous style">‹</button><button type="button" id="tksc-style-next" aria-label="Next style">›</button></div></div><div class="tksc-style-feature" id="tksc-style-feature"><img id="tksc-style-icon" alt=""><div class="tksc-feature-text"><strong id="tksc-style-name"></strong><span id="tksc-style-tone"></span><div class="tksc-traits" id="tksc-style-traits"></div></div></div><div class="tksc-style-thumbs" id="tksc-style-thumbs" role="listbox" aria-label="Editorial styles"></div><div class="tksc-style-choice tksc-sr"><select id="tksc-style"></select></div><p class="tksc-tip" id="tksc-style-description"></p></div>
              <div id="tksc-free-section" hidden><div class="tksc-card-head"><label for="tksc-preset">FREE FORMAT STYLE · 30 PRESETS</label><span class="tksc-counter" id="tksc-preset-counter"></span></div><p class="tksc-free-note">No AI provider is used · $0 · formatting runs in your browser.</p><div class="tksc-style-choice tksc-sr"><span id="tksc-preset-icon" aria-hidden="true"></span><select id="tksc-preset"></select></div><div class="tksc-preset-grid" id="tksc-preset-grid"></div><p class="tksc-tip" id="tksc-preset-description"></p></div>
              <label for="tksc-category">WORDPRESS CATEGORY</label><select id="tksc-category"><option value="">Keep current selection</option></select>
              <div id="tksc-embeds-wrap" hidden><label>SOCIAL POSTS & VIDEO LINKS</label><div id="tksc-embeds"></div></div>
              <label class="tksc-check" id="tksc-seo-wrap" hidden><input type="checkbox" id="tksc-seo" checked> Generate SEO fields for <span id="tksc-seo-name"></span></label>
              <div class="tksc-actions"><button type="button" id="tksc-run" class="tksc-primary">Rewrite in Classic Editor</button></div>
            </div>
            <section id="tksc-image-studio" class="tksc-view" hidden>
              <div class="tksc-view-bar"><strong>Image Studio</strong><button type="button" id="tksc-reset-image" class="tksc-reset">Reset image</button></div>
              <p class="tksc-tip">Choose an article image or a local file. Insert and Featured Image upload a WebP to this site's Media Library.</p>
              <div id="tksc-image-list"></div>
              <label for="tksc-local-file">IMAGE FROM YOUR COMPUTER</label><input id="tksc-local-file" type="file" accept="image/png,image/jpeg,image/webp">
              <div class="tksc-preview-frame" id="tksc-preview-frame"><div class="tksc-resize-box" id="tksc-resize-box"><canvas id="tksc-image-canvas" width="640" height="360" aria-label="Image editing canvas" hidden></canvas><span class="tksc-handle" data-corner="nw" title="Drag to resize"></span><span class="tksc-handle" data-corner="ne" title="Drag to resize"></span><span class="tksc-handle" data-corner="sw" title="Drag to resize"></span><span class="tksc-handle" data-corner="se" title="Drag to resize"></span><span class="tksc-size-badge" id="tksc-size-badge"></span><div class="tksc-crop-box" id="tksc-crop-box" hidden><i class="tksc-grid-v" style="left:33.33%"></i><i class="tksc-grid-v" style="left:66.66%"></i><i class="tksc-grid-h" style="top:33.33%"></i><i class="tksc-grid-h" style="top:66.66%"></i><span class="tksc-crop-dim" id="tksc-crop-dim"></span><b data-h="nw"></b><b data-h="n"></b><b data-h="ne"></b><b data-h="w"></b><b data-h="e"></b><b data-h="sw"></b><b data-h="s"></b><b data-h="se"></b></div></div><p id="tksc-image-placeholder">Choose an image to start editing</p></div>
              <div class="tksc-studio-tabs" role="group" aria-label="Image tools"><button type="button" data-studio="crop" class="is-active">Crop</button><button type="button" data-studio="filters">Filters</button><button type="button" data-studio="watermark">Watermark</button><button type="button" data-studio="seo">SEO</button><button type="button" data-studio="export">Export</button></div>
              <div class="tksc-studio-pane" data-pane="crop"><label for="tksc-ratio">CROP · DRAG THE BOX OR ITS HANDLES ON THE PREVIEW</label><select id="tksc-ratio" class="tksc-sr"><option value="original">Freeform</option><option value="16:9">16:9</option><option value="4:3">4:3</option><option value="1:1">1:1</option><option value="facebook">Facebook · 1200:628</option><option value="9:16">9:16</option></select><div class="tksc-pills" role="group" aria-label="Crop ratio"><button type="button" data-ratio="original" class="on">Freeform</button><button type="button" data-ratio="16:9">16:9</button><button type="button" data-ratio="4:3">4:3</button><button type="button" data-ratio="1:1">1:1</button><button type="button" data-ratio="facebook">Facebook</button><button type="button" data-ratio="9:16">9:16</button></div><div class="tksc-crop-actions"><button type="button" id="tksc-apply-crop" class="tksc-primary">Apply crop</button><button type="button" id="tksc-reset-crop">Reset crop</button></div><p class="tksc-crop-state" id="tksc-crop-state" hidden></p><label for="tksc-out-w">IMAGE SIZE (PX) · DRAG A CORNER OF THE PREVIEW</label><div class="tksc-size-row"><input id="tksc-out-w" type="number" min="80" step="1" inputmode="numeric" aria-label="Width in pixels"><span>×</span><input id="tksc-out-h" type="number" min="45" step="1" inputmode="numeric" aria-label="Height in pixels"><button type="button" data-size="1200">1200</button><button type="button" data-size="800">800</button><button type="button" data-size="auto">Auto</button></div><div class="tksc-control-row"><button type="button" id="tksc-rotate">Rotate 90°</button><button type="button" id="tksc-flip">Flip H</button><button type="button" id="tksc-flip-v">Flip V</button><button type="button" id="tksc-reset-edits">Original</button></div></div>
              <div class="tksc-studio-pane" data-pane="filters" hidden><label for="tksc-filter-preset">FILTER PRESET</label><select id="tksc-filter-preset"><option value="original">Original</option><option value="vibrant">Vibrant</option><option value="warm">Cinema Warm</option><option value="dramatic">Dramatic</option><option value="clean">Studio Crisp</option><option value="mono">Mono</option></select><div class="tksc-slider-grid"><label>Brightness <output id="tksc-brightness-value">0%</output><input id="tksc-brightness" type="range" min="-50" max="50" value="0"></label><label>Contrast <output id="tksc-contrast-value">0%</output><input id="tksc-contrast" type="range" min="-50" max="50" value="0"></label><label>Saturation <output id="tksc-saturation-value">0%</output><input id="tksc-saturation" type="range" min="-50" max="50" value="0"></label><label>Warmth <output id="tksc-warmth-value">0%</output><input id="tksc-warmth" type="range" min="-50" max="50" value="0"></label></div></div>
              <div class="tksc-studio-pane" data-pane="watermark" hidden><label for="tksc-wm-type">WATERMARK TYPE</label><select id="tksc-wm-type"><option value="none">None</option><option value="text">Text overlay</option><option value="logo">Logo badge</option></select><div id="tksc-wm-text-wrap" hidden><label for="tksc-wm-text">TEXT WATERMARK</label><input id="tksc-wm-text" type="text" maxlength="100" placeholder="Optional watermark text"></div><div id="tksc-wm-logo-wrap" hidden><label for="tksc-wm-logo">LOGO BADGE (PNG / WEBP)</label><input id="tksc-wm-logo" type="file" accept="image/png,image/webp"></div><div class="tksc-field-pair"><label for="tksc-wm-pos">POSITION<select id="tksc-wm-pos"><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option><option value="top-right">Top right</option><option value="top-left">Top left</option><option value="center">Center</option></select></label><label for="tksc-wm-color">COLOR<input id="tksc-wm-color" type="color" value="#ffffff"></label></div><label for="tksc-wm-opacity">OPACITY <output id="tksc-wm-opacity-value">85%</output></label><input id="tksc-wm-opacity" type="range" min="10" max="100" value="85"></div>
              <div class="tksc-studio-pane" data-pane="seo" hidden><button type="button" id="tksc-generate-image-seo">Fill from source details</button><p class="tksc-tip">Review image descriptions before saving.</p><label for="tksc-img-alt">ALT TEXT</label><input id="tksc-img-alt" type="text" placeholder="Describe the image"><label for="tksc-img-title">IMAGE TITLE</label><input id="tksc-img-title" type="text" placeholder="Optional media title"><label for="tksc-img-caption">CAPTION</label><input id="tksc-img-caption" type="text" placeholder="Optional image caption"></div>
              <div class="tksc-studio-pane" data-pane="export" hidden><p class="tksc-tip">Download the edited image as a WebP file to your computer.</p><button type="button" id="tksc-download-webp">Download WebP</button></div>
              <div class="tksc-actions"><button type="button" id="tksc-image-inline">Insert at cursor</button><button type="button" id="tksc-image-featured" class="tksc-primary">Set Featured Image</button></div>
            </section>
            <div id="tksc-settings" class="tksc-view" hidden>
              <div class="tksc-view-title">Popup settings</div>
              <label for="tksc-launcher-choice">LAUNCHER DISPLAY</label><select id="tksc-launcher-choice"><option value="icon">Icon only (default)</option><option value="text">Text only · TK Summary</option></select>
              <label for="tksc-icon-choice">ICON STYLE</label><select id="tksc-icon-choice"><option value="default">Default · original icon</option><option value="fire">Fire glow · animated</option><option value="pulse">Blue pulse · animated</option><option value="outline">Outline · minimal</option></select><p class="tksc-tip">Animations apply to the launcher icon. Text mode shows only “TK Summary”.</p>
              <div class="tksc-icon-preview"><img src="<?php echo $icon; ?>" alt="Icon preview"><span>Live icon preview</span></div>
              <label for="tksc-provider">AI PROVIDER</label><select id="tksc-provider"><option value="gemini">Google Gemini</option><option value="claude">Anthropic Claude</option></select>
              <?php if (current_user_can('manage_options')) : ?>
              <label for="tksc-api-key">API KEY FOR SELECTED PROVIDER</label><div class="tksc-key-row"><div class="tksc-key-field"><input id="tksc-api-key" type="password" autocomplete="new-password" spellcheck="false" placeholder="Paste API key, then Connect"><button type="button" id="tksc-key-eye" title="Show API key" aria-label="Show API key" aria-pressed="false"><svg class="tksc-i-eye" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><svg class="tksc-i-eye-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.4-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg></button></div><button type="button" id="tksc-connect" class="tksc-connect" title="Save key and connect"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7V3m6 4V3M7 7h10v4a5 5 0 0 1-10 0zM12 16v5"/></svg><span>Connect</span></button></div><p class="tksc-conn" id="tksc-conn-status" data-state="none"><i></i><span>Not connected</span></p><p class="tksc-tip">To remove the saved key, clear this field and press Save settings.</p>
              <label for="tksc-model">MODEL · MANUAL SELECTION</label><select id="tksc-model"></select><div class="tksc-row"><button type="button" id="tksc-load-models">Refresh available models</button><button type="button" id="tksc-test-model">Test selected model</button></div>
              <p id="tksc-model-note" class="tksc-tip">The original extension uses Claude Haiku 4.5 (claude-haiku-4-5-20251001). Save a key, refresh models and choose the exact model. Test uses a small paid request; no automatic switch to Sonnet or Opus.</p>
              <?php else : ?><p class="tksc-tip">Only WordPress administrators can manage the API key. You can change your launcher appearance here.</p><?php endif; ?>
              <button type="button" id="tksc-save-settings" class="tksc-primary">Save settings</button>
            </div>
            <p id="tksc-status" role="status" aria-live="polite"></p>
          </div>
        </section>
        <?php
    }

    private static function meta($xpath, $name) {
        foreach (['property', 'name'] as $attr) {
            $nodes = $xpath->query('//meta[@' . $attr . '="' . $name . '"]/@content');
            if ($nodes->length) return trim($nodes->item(0)->nodeValue);
        }
        return '';
    }

    /* ---------- v2.4 article fetch: works with WordPress, Blogger, news CMS, AMP, JSON-LD, YouTube and X links ---------- */

    const UA_LIST = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    ];

    /** GET a URL like a normal browser. Returns [body, code, content-type, final url]. */
    private static function http_get($url, $accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', $ua_index = 0) {
        $response = wp_safe_remote_get($url, [
            'timeout' => 20,
            'redirection' => 5,
            'limit_response_size' => 4000000,
            'user-agent' => self::UA_LIST[$ua_index % count(self::UA_LIST)],
            'headers' => ['Accept' => $accept, 'Accept-Language' => 'en-US,en;q=0.9', 'Cache-Control' => 'no-cache'],
        ]);
        if (is_wp_error($response)) return ['', 0, '', $url, $response->get_error_message()];
        $final = $url;
        $raw = $response['http_response'] ?? null;
        if ($raw && method_exists($raw, 'get_response_object')) {
            $obj = $raw->get_response_object();
            if (!empty($obj->url)) $final = (string)$obj->url;
        }
        return [(string)wp_remote_retrieve_body($response), (int)wp_remote_retrieve_response_code($response), (string)wp_remote_retrieve_header($response, 'content-type'), $final, ''];
    }

    private static function load_dom($html, $content_type = '') {
        if (!class_exists('DOMDocument')) return null;
        $charset = '';
        if (preg_match('~charset=["\']?([\w-]+)~i', $content_type, $m)) $charset = $m[1];
        elseif (preg_match('~<meta[^>]+charset=["\']?([\w-]+)~i', substr($html, 0, 4000), $m)) $charset = $m[1];
        if ($charset && strcasecmp($charset, 'utf-8') && strcasecmp($charset, 'utf8') && function_exists('mb_convert_encoding')) {
            $converted = @mb_convert_encoding($html, 'UTF-8', $charset);
            if ($converted) $html = $converted;
        }
        $dom = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $ok = $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors(); libxml_use_internal_errors($previous);
        return $ok ? $dom : null;
    }

    private static function clean_text($text) {
        $text = html_entity_decode((string)$text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return trim(preg_replace('/[\s\x{00A0}\x{200B}]+/u', ' ', $text));
    }

    private static function is_boilerplate($text) {
        return (bool)preg_match('~^(?:advertisement|sponsored|share (?:this|on)|follow us|read more|read also|also read|related:|see also|click here|subscribe|sign up|join our|download our app|copyright|©|all rights reserved|tags?:|filed under|posted in|photo:|image:|source:|continue reading|leave a (?:comment|reply)|you may also like|recommended for you|related (?:posts|articles|news|stories)|more from|latest (?:news|posts)|trending now|don.t miss)~iu', $text);
    }

    /** Extract JSON-LD Article data (headline, articleBody, image) before scripts are removed. */
    private static function json_ld($xp) {
        $out = ['title' => '', 'body' => '', 'image' => ''];
        foreach ($xp->query('//script[@type="application/ld+json"]') as $node) {
            $data = json_decode(trim($node->textContent), true);
            if (!is_array($data)) continue;
            $queue = isset($data['@graph']) && is_array($data['@graph']) ? $data['@graph'] : ((isset($data[0]) ? $data : [$data]));
            foreach ($queue as $item) {
                if (!is_array($item)) continue;
                $type = implode(' ', (array)($item['@type'] ?? ''));
                if (!preg_match('~Article|Posting|Report|NewsArticle|WebPage~i', $type)) continue;
                if (!$out['title'] && !empty($item['headline']) && is_string($item['headline'])) $out['title'] = $item['headline'];
                if (!empty($item['articleBody']) && is_string($item['articleBody']) && strlen($item['articleBody']) > strlen($out['body'])) $out['body'] = $item['articleBody'];
                if (!$out['image'] && !empty($item['image'])) {
                    $img = $item['image'];
                    if (is_array($img)) $img = $img['url'] ?? ($img[0]['url'] ?? ($img[0] ?? ''));
                    if (is_string($img)) $out['image'] = $img;
                }
            }
        }
        return $out;
    }

    private static function class_id($node) {
        return $node instanceof DOMElement ? strtolower($node->getAttribute('class') . ' ' . $node->getAttribute('id')) : '';
    }

    /** Pick the element that holds the article body: known containers first, then paragraph density scoring. */
    private static function article_root($xp, $dom) {
        $scores = [];
        foreach ($xp->query('//p') as $p) {
            $len = mb_strlen(self::clean_text($p->textContent));
            if ($len < 25) continue;
            $parent = $p->parentNode;
            for ($depth = 0; $parent instanceof DOMElement && $depth < 3; $depth++, $parent = $parent->parentNode) {
                $key = spl_object_id($parent);
                if (!isset($scores[$key])) $scores[$key] = [$parent, 0];
                $scores[$key][1] += $depth === 0 ? $len : ($depth === 1 ? $len * 0.5 : $len * 0.2);
            }
        }
        $best = null; $best_score = 0;
        foreach ($scores as [$node, $score]) {
            $tag = strtolower($node->nodeName);
            if (in_array($tag, ['body', 'html'], true)) $score *= 0.6;
            if (preg_match('~comment|sidebar|widget|footer|related|menu~', self::class_id($node))) $score *= 0.2;
            if ($score > $best_score) { $best = $node; $best_score = $score; }
        }
        $selectors = [
            '//*[@itemprop="articleBody"]',
            '//*[contains(concat(" ",normalize-space(@class)," ")," entry-content ")]',
            '//*[contains(concat(" ",normalize-space(@class)," ")," post-content ")]',
            '//*[contains(concat(" ",normalize-space(@class)," ")," post-body ")]',
            '//*[contains(concat(" ",normalize-space(@class)," ")," article-content ")]',
            '//*[contains(concat(" ",normalize-space(@class)," ")," article-body ")]',
            '//*[contains(concat(" ",normalize-space(@class)," ")," td-post-content ")]',
            '//*[contains(concat(" ",normalize-space(@class)," ")," story-body ")]',
            '//*[contains(concat(" ",normalize-space(@class)," ")," single-content ")]',
            '//*[contains(concat(" ",normalize-space(@class)," ")," content-inner ")]',
            '//article',
            '//main',
        ];
        foreach ($selectors as $query) {
            foreach ($xp->query($query) as $node) {
                $len = 0;
                foreach ($xp->query('.//p', $node) as $p) $len += mb_strlen(self::clean_text($p->textContent));
                // Use the known container when it carries most of the page's paragraph text.
                if ($len >= 200 && $len >= $best_score * 0.55) return $node;
            }
        }
        return $best ?: $dom->getElementsByTagName('body')->item(0);
    }

    /** Remove share bars, related posts, ads etc. inside the article only (never the article or its parents). */
    private static function strip_noise($xp, $root) {
        $total = max(1, mb_strlen($root->textContent));
        $noise = '~(?:^|[\s_-])(?:related|sidebar|widget|share|sharing|sharedaddy|social|newsletter|subscribe|advert|advertisement|ads?|adsbygoogle|sponsor(?:ed)?|promo|comments?|respond|breadcrumbs?|author-?box|about-?author|jp-relatedposts|yarpp|cookie|popup|modal|recommended|trending|read-?more|also-?read|post-tags|tag-?links|entry-footer|post-navigation|nav-links|pagination|toc|table-of-contents|wp-block-buttons)(?:$|[\s_-])~';
        $remove = [];
        foreach ($xp->query('.//script|.//style|.//noscript|.//template|.//svg|.//form|.//button|.//nav|.//aside|.//footer|.//select|.//input|.//*[@class or @id]', $root) as $node) {
            $tag = strtolower($node->nodeName);
            if (in_array($tag, ['script','style','noscript','template','svg','form','button','nav','aside','footer','select','input'], true)) { $remove[] = $node; continue; }
            if (in_array($tag, ['p','h2','h3','h4','blockquote','figure','img','iframe','li'], true)) continue;
            if (preg_match($noise, self::class_id($node)) && mb_strlen($node->textContent) < $total * 0.5 && !$xp->query('.//*[@data-tksc-embed]', $node)->length) $remove[] = $node;
        }
        foreach ($remove as $node) if ($node->parentNode) $node->parentNode->removeChild($node);
    }

    /** Turn raw HTML into the fetch payload. Returns null if no readable body. */
    private static function extract_article($html, $url, $content_type = '') {
        $dom = self::load_dom($html, $content_type);
        if (!$dom) return null;
        $xp = new DOMXPath($dom);
        $ld = self::json_ld($xp);
        $title = self::meta($xp, 'og:title') ?: ($ld['title'] ?: self::meta($xp, 'twitter:title'));
        if (!$title) {
            $h1 = $xp->query('//h1')->item(0);
            $title = $h1 ? $h1->textContent : ($dom->getElementsByTagName('title')->item(0)->textContent ?? '');
        }
        $image = self::meta($xp, 'og:image:secure_url') ?: (self::meta($xp, 'og:image') ?: (self::meta($xp, 'twitter:image') ?: $ld['image']));
        $description = self::meta($xp, 'og:description') ?: self::meta($xp, 'description');
        $amp = '';
        $amp_node = $xp->query('//link[@rel="amphtml"]/@href')->item(0);
        if ($amp_node) $amp = self::absolute_url($amp_node->nodeValue, $url);
        $rest = '';
        $rest_node = $xp->query('//link[@rel="alternate" and @type="application/json" and contains(@href,"/wp/v2/")]/@href')->item(0);
        if ($rest_node) $rest = self::absolute_url($rest_node->nodeValue, $url);
        $api_node = $xp->query('//link[@rel="https://api.w.org/"]/@href')->item(0);
        $api_root = $api_node ? self::absolute_url($api_node->nodeValue, $url) : '';

        foreach ($xp->query('//script[not(@type="application/ld+json")]|//style|//noscript|//template') as $node) {
            if ($node->parentNode) $node->parentNode->removeChild($node);
        }
        $root = self::article_root($xp, $dom);
        $blocks = []; $images = []; $embeds = []; $seen = [];
        if ($root) {
            // Social/video embeds are replaced by position markers before noise removal, so they stay exactly where the source placed them.
            $embed_query = './/iframe|.//blockquote[contains(@class,"twitter-tweet") or contains(@class,"twitter-video") or contains(@class,"tiktok-embed") or contains(@class,"instagram-media")]|.//div[contains(@class,"fb-post") or contains(@class,"fb-video")]|.//p[count(*)<=1]';
            $targets = [];
            foreach ($xp->query($embed_query, $root) as $node) $targets[] = $node;
            foreach ($targets as $node) {
                if (!$node->parentNode || $xp->query('ancestor::*[@data-tksc-embed]', $node)->length) continue;
                $src = self::embed_url($node, $url, $xp);
                if (!$src) continue;
                if (!isset($embeds[$src]) && count($embeds) < 12) $embeds[$src] = $src;
                if (!isset($embeds[$src])) continue;
                $marker = $dom->createElement('p');
                $marker->setAttribute('data-tksc-embed', $src);
                // Replace the whole WordPress embed figure/wrapper when the embed is its only content.
                $holder = $node;
                while ($holder->parentNode instanceof DOMElement && $holder->parentNode !== $root && preg_match('~wp-block-embed|embed|twitter|tweet|video-container|responsive|iframe~i', self::class_id($holder->parentNode)) && mb_strlen(self::clean_text($holder->parentNode->textContent)) <= mb_strlen(self::clean_text($holder->textContent)) + 200) $holder = $holder->parentNode;
                $holder->parentNode->replaceChild($marker, $holder);
            }
            // Inline links to videos/posts inside normal paragraphs remain optional extras (added at the end, as before).
            foreach ($xp->query('.//p//a|.//li//a', $root) as $node) {
                $src = self::embed_link(self::absolute_url($node->getAttribute('href'), $url));
                if ($src && !isset($embeds[$src]) && count($embeds) < 12) $embeds[$src] = $src;
            }
            self::strip_noise($xp, $root);
            foreach ($xp->query('.//img', $root) as $node) {
                $raw = $node->getAttribute('data-src') ?: ($node->getAttribute('data-lazy-src') ?: ($node->getAttribute('data-original') ?: $node->getAttribute('src')));
                if ((!$raw || str_starts_with($raw, 'data:')) && ($set = $node->getAttribute('data-srcset') ?: $node->getAttribute('srcset'))) $raw = preg_split('/\s+/', trim(explode(',', $set)[0]))[0];
                if (!$raw || str_starts_with($raw, 'data:') || preg_match('~logo|avatar|icon|1x1|pixel|gravatar|emoji|spinner|blank\.gif|placeholder~i', $raw)) continue;
                $w = (int)$node->getAttribute('width');
                if ($w && $w < 120) continue;
                $src = self::absolute_url($raw, $url);
                if ($src && !isset($images[$src]) && count($images) < 12) $images[$src] = ['url'=>$src, 'alt'=>sanitize_text_field($node->getAttribute('alt'))];
            }
            foreach ($xp->query('.//h2|.//h3|.//h4|.//p|.//blockquote[not(ancestor::blockquote) and not(contains(@class,"twitter-tweet") or contains(@class,"instagram-media") or contains(@class,"tiktok-embed") or contains(@class,"twitter-video"))]|.//ul/li|.//ol/li', $root) as $node) {
                $tag = strtolower($node->nodeName);
                if ($tag === 'p' && $node->hasAttribute('data-tksc-embed')) { $blocks[] = ['type'=>'embed', 'url'=>$node->getAttribute('data-tksc-embed'), 'text'=>'']; continue; }
                // Skip paragraphs inside a quote (the quote itself is kept) and list items made only of a link.
                if ($tag === 'p' && $xp->query('ancestor::blockquote|ancestor::li', $node)->length) continue;
                if ($tag === 'li' && $xp->query('.//a', $node)->length && self::clean_text($xp->query('.//a', $node)->item(0)->textContent) === self::clean_text($node->textContent)) continue;
                $plain = self::clean_text($node->textContent);
                $is_head = in_array($tag, ['h2','h3','h4'], true);
                if ($plain === '' || isset($seen[$plain]) || self::is_boilerplate($plain)) continue;
                if ($is_head ? mb_strlen($plain) < 4 || mb_strlen($plain) > 180 : mb_strlen($plain) < 20) continue;
                $seen[$plain] = true;
                $blocks[] = ['type'=>$is_head ? 'heading' : 'paragraph', 'text'=>$tag === 'li' ? '• ' . $plain : $plain];
                if (count($blocks) >= 160) break;
            }
            // Blogger and older CMS themes separate paragraphs with <br> inside one <div>.
            if (count($blocks) < 3) {
                $text_html = $dom->saveHTML($root);
                $text_html = preg_replace('~<br\s*/?>|</(?:div|p|h\d|li)>~i', "\n", $text_html);
                foreach (preg_split('/\n+/', wp_strip_all_tags($text_html)) as $line) {
                    $line = self::clean_text($line);
                    if (mb_strlen($line) >= 40 && !isset($seen[$line]) && !self::is_boilerplate($line)) { $seen[$line] = true; $blocks[] = ['type'=>'paragraph','text'=>$line]; }
                }
            }
        }
        $words = self::word_count(implode(' ', array_column($blocks, 'text')));
        if ($words < 60 && !array_filter($blocks, static function($b) { return $b['type'] === 'embed'; }) && mb_strlen($ld['body']) > 200) {
            $blocks = [];
            foreach (preg_split('/\n\s*\n|\r\n\s*\r\n|(?:(?<=[.!?])|(?<=[.!?]["”’]))\s{2,}/u', $ld['body']) as $para) {
                $para = self::clean_text($para);
                if (mb_strlen($para) >= 20) $blocks[] = ['type'=>'paragraph','text'=>$para];
            }
            if (count($blocks) === 1) $blocks = self::split_sentences($blocks[0]['text']);
            $words = self::word_count(implode(' ', array_column($blocks, 'text')));
        }
        return ['title'=>self::clean_text($title), 'image'=>$image, 'description'=>self::clean_text($description), 'blocks'=>$blocks, 'images'=>$images, 'embeds'=>$embeds, 'words'=>$words, 'amp'=>$amp, 'rest'=>$rest, 'api_root'=>$api_root];
    }

    /** Normalise a link to a supported embed URL (YouTube, X, TikTok, Vimeo, Instagram, Facebook), or ''. */
    private static function embed_link($src) {
        if (!$src) return '';
        if (preg_match('~(?:youtube(?:-nocookie)?\.com/(?:embed/|watch\?(?:.*&)?v=|shorts/|live/)|youtu\.be/)([\w-]{11})~i', $src, $m)) return 'https://www.youtube.com/watch?v=' . $m[1];
        if (preg_match('~(?:x|twitter)\.com/(\w{1,20})/status(?:es)?/(\d+)~i', $src, $m)) return 'https://twitter.com/' . $m[1] . '/status/' . $m[2];
        if (preg_match('~platform\.twitter\.com/embed/.*[?&]id=(\d+)~i', $src, $m)) return 'https://twitter.com/i/status/' . $m[1];
        if (preg_match('~tiktok\.com/@[\w.-]+/video/\d+~i', $src, $m)) return 'https://www.' . preg_replace('~^(?:https?://)?(?:www\.)?~i', '', $m[0]);
        if (preg_match('~(?:player\.)?vimeo\.com/(?:video/)?(\d{5,})~i', $src, $m)) return 'https://vimeo.com/' . $m[1];
        if (preg_match('~instagram\.com/(?:p|reel|tv)/[\w-]+~i', $src, $m)) return 'https://www.' . preg_replace('~^(?:https?://)?(?:www\.)?~i', '', $m[0]) . '/';
        if (preg_match('~facebook\.com/plugins/(?:post|video)\.php\?(?:.*&)?href=([^&]+)~i', $src, $m)) { $inner = urldecode($m[1]); return preg_match('~^https://(?:www\.)?facebook\.com/~i', $inner) ? $inner : ''; }
        return '';
    }

    /** Resolve the embed URL behind an iframe, social blockquote, Facebook div or a paragraph that is only a URL. */
    private static function embed_url($node, $base, $xp) {
        $tag = strtolower($node->nodeName);
        if ($tag === 'iframe') return self::embed_link(self::absolute_url($node->getAttribute('src') ?: $node->getAttribute('data-src') ?: $node->getAttribute('data-lazy-src'), $base));
        if ($tag === 'blockquote') {
            foreach (['cite', 'data-instgrm-permalink'] as $attr) if ($node->getAttribute($attr) && ($u = self::embed_link(self::absolute_url($node->getAttribute($attr), $base)))) return $u;
            $links = $xp->query('.//a[@href]', $node);
            for ($i = $links->length - 1; $i >= 0; $i--) if ($u = self::embed_link(self::absolute_url($links->item($i)->getAttribute('href'), $base))) return $u;
            return '';
        }
        if ($tag === 'div') return self::embed_link('https://www.facebook.com/plugins/post.php?href=' . rawurlencode((string)$node->getAttribute('data-href')));
        // <p>https://youtu.be/…</p> or <p><a href="…">…</a></p> with no other text: WordPress auto-embed style.
        $text = self::clean_text($node->textContent);
        $a = $xp->query('./a[@href]', $node)->item(0);
        if ($a && self::clean_text($a->textContent) === $text) return self::embed_link(self::absolute_url($a->getAttribute('href'), $base));
        if (preg_match('~^https?://\S+$~', $text)) return self::embed_link($text);
        return '';
    }

    /** Word count that also works for scripts without spaces (Khmer, Thai). */
    private static function word_count($text) {
        $text = trim((string)$text);
        if ($text === '') return 0;
        return max(count(preg_split('/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY)), (int)(mb_strlen($text) / 7));
    }

    /** Group a long single paragraph into readable 3-sentence paragraphs. */
    private static function split_sentences($text) {
        $sentences = preg_split('/(?:(?<=[.!?])|(?<=[.!?]["”’]))\s+(?=[A-Z“"])/u', $text);
        $blocks = [];
        foreach (array_chunk($sentences, 3) as $chunk) $blocks[] = ['type'=>'paragraph', 'text'=>trim(implode(' ', $chunk))];
        return $blocks;
    }

    private static function wp_post_id($url) {
        $parts = wp_parse_url($url);
        parse_str($parts['query'] ?? '', $query);
        foreach (['p', 'page_id'] as $k) if (!empty($query[$k]) && ctype_digit((string)$query[$k])) return (int)$query[$k];
        $path = rtrim($parts['path'] ?? '', '/');
        if (preg_match('~/(?:p|posts?|archives|ar)/(\d{1,9})$~i', $path, $m)) return (int)$m[1];
        if (preg_match('~/[^/]*[a-z][^/]*/(\d{3,9})$~i', $path, $m)) return (int)$m[1];
        return 0;
    }

    /** WordPress REST fallback: works even when the theme markup is unusual or the HTML page is blocked. */
    private static function fetch_wp_rest($url, $rest = '', $api_root = '') {
        $parts = wp_parse_url($url);
        $origin = ($parts['scheme'] ?? 'https') . '://' . ($parts['host'] ?? '');
        $root = $api_root ?: $origin . '/wp-json/';
        $candidates = [];
        if ($rest) $candidates[] = add_query_arg('_embed', '1', $rest);
        if ($id = self::wp_post_id($url)) $candidates[] = trailingslashit($root) . 'wp/v2/posts/' . $id . '?_embed=1';
        $segments = array_values(array_filter(explode('/', trim($parts['path'] ?? '', '/'))));
        $slug = sanitize_title(preg_replace('~\.html?$~i', '', (string)end($segments)));
        if ($slug && !ctype_digit($slug) && $slug !== 'amp') {
            $candidates[] = trailingslashit($root) . 'wp/v2/posts?slug=' . rawurlencode($slug) . '&_embed=1';
            $candidates[] = $origin . '/?rest_route=/wp/v2/posts&slug=' . rawurlencode($slug) . '&_embed=1';
        } elseif ($slug === 'amp' && count($segments) > 1) {
            $slug = sanitize_title($segments[count($segments) - 2]);
            $candidates[] = trailingslashit($root) . 'wp/v2/posts?slug=' . rawurlencode($slug) . '&_embed=1';
        }
        foreach (array_unique($candidates) as $endpoint) {
            if (!self::valid_url($endpoint)) continue;
            [$body, $code] = self::http_get($endpoint, 'application/json');
            if ($code !== 200 || !$body) continue;
            $post = json_decode($body, true);
            if (is_array($post) && isset($post[0])) $post = $post[0];
            if (!is_array($post) || empty($post['content']['rendered'])) continue;
            $html = '<!doctype html><html><head><meta charset="utf-8"></head><body><article><div class="entry-content">' . $post['content']['rendered'] . '</div></article></body></html>';
            $data = self::extract_article($html, $url);
            if (!$data || !$data['blocks']) continue;
            $data['title'] = self::clean_text($post['title']['rendered'] ?? '');
            $data['image'] = $post['_embedded']['wp:featuredmedia'][0]['source_url'] ?? '';
            return $data;
        }
        return null;
    }

    /** YouTube and X links are posts, not articles: use their public oEmbed/page data. */
    private static function fetch_social($url) {
        $host = strtolower((string)wp_parse_url($url, PHP_URL_HOST));
        if (preg_match('~(^|\.)(youtube\.com|youtu\.be)$~', $host)) {
            $video = '';
            if (preg_match('~(?:v=|youtu\.be/|shorts/|embed/|live/)([\w-]{11})~', $url, $m)) $video = $m[1];
            if (!$video) return null;
            $watch = 'https://www.youtube.com/watch?v=' . $video;
            [$body, $code] = self::http_get($watch);
            $title = ''; $desc = '';
            if ($code === 200 && preg_match('~"shortDescription":"((?:[^"\\\\]|\\\\.)*)"~', $body, $m)) $desc = (string)json_decode('"' . $m[1] . '"');
            if ($code === 200 && preg_match('~<meta\s+name="title"\s+content="([^"]*)"~i', $body, $m)) $title = html_entity_decode($m[1], ENT_QUOTES, 'UTF-8');
            if (!$title) {
                [$oe, $oc] = self::http_get('https://www.youtube.com/oembed?format=json&url=' . rawurlencode($watch), 'application/json');
                $o = $oc === 200 ? json_decode($oe, true) : null;
                $title = $o['title'] ?? '';
            }
            if (!$title && !$desc) return null;
            $blocks = [];
            foreach (preg_split('/\n\s*\n|\n/', $desc) as $line) {
                $line = self::clean_text($line);
                if (mb_strlen($line) >= 20 && !preg_match('~^(?:https?://|#\w+(\s+#\w+)*$|subscribe|follow)~i', $line)) $blocks[] = ['type'=>'paragraph','text'=>$line];
            }
            if (!$blocks && $title) $blocks[] = ['type'=>'paragraph','text'=>$title];
            return ['title'=>$title, 'image'=>'https://i.ytimg.com/vi/' . $video . '/hqdefault.jpg', 'description'=>'', 'blocks'=>array_merge([['type'=>'embed','url'=>$watch,'text'=>'']], $blocks), 'images'=>[], 'embeds'=>[$watch=>$watch], 'words'=>self::word_count($desc), 'note'=>'YouTube video: title and description imported, video added as embed.'];
        }
        if (preg_match('~(^|\.)(x\.com|twitter\.com)$~', $host) && preg_match('~/status/\d+~', $url)) {
            [$body, $code] = self::http_get('https://publish.twitter.com/oembed?omit_script=1&url=' . rawurlencode($url), 'application/json');
            $o = $code === 200 ? json_decode($body, true) : null;
            if (empty($o['html'])) return null;
            $text = '';
            if (preg_match('~<p[^>]*>(.*?)</p>~s', $o['html'], $m)) $text = self::clean_text(wp_strip_all_tags(preg_replace('~<br\s*/?>~i', ' ', $m[1])));
            $author = self::clean_text($o['author_name'] ?? 'X user');
            return ['title'=>$author . ' on X', 'image'=>'', 'description'=>'', 'blocks'=>[['type'=>'paragraph','text'=>$text ?: 'Post by ' . $author], ['type'=>'embed','url'=>self::embed_link($url) ?: $url,'text'=>'']], 'images'=>[], 'embeds'=>[$url=>$url], 'words'=>self::word_count($text), 'note'=>'X post: text imported and the post added as embed.'];
        }
        return null;
    }

    public static function fetch() {
        self::authorize();
        @set_time_limit(90);
        $url = self::valid_url(wp_unslash($_POST['url'] ?? ''));
        if (!$url) wp_send_json_error('Invalid or unsafe URL.', 400);
        // Tracking parameters sometimes break caching plugins or produce a different page.
        $url = remove_query_arg(['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','igshid','mc_cid','mc_eid'], $url);
        if (!class_exists('DOMDocument')) wp_send_json_error('The server needs PHP DOM for article extraction.', 500);

        if ($social = self::fetch_social($url)) self::send_article($social, $url);

        [$body, $code, $mime, $final, $err] = self::http_get($url);
        if ($code === 0 || in_array($code, [403, 406, 429, 503], true)) {
            [$body2, $code2, $mime2, $final2] = self::http_get($url, 'text/html,application/xhtml+xml,*/*;q=0.8', 1);
            if ($code2 === 200) { [$body, $code, $mime, $final] = [$body2, $code2, $mime2, $final2]; }
        }
        $blocked = $code !== 200 || preg_match('~cf-browser-verification|cf_chl_|challenge-platform|Just a moment\.\.\.|Attention Required! \| Cloudflare~i', substr($body, 0, 20000));
        $data = null;
        if (!$blocked && $body && (!$mime || preg_match('~html|xml~i', $mime))) $data = self::extract_article($body, $final ?: $url, $mime);

        // Weak or failed result: try the WordPress REST API, then the AMP copy of the page.
        if (!$data || $data['words'] < 120) {
            $rest = self::fetch_wp_rest($final ?: $url, $data['rest'] ?? '', $data['api_root'] ?? '');
            if ($rest && $rest['words'] > ($data['words'] ?? 0)) {
                if ($data) { $rest['title'] = $rest['title'] ?: $data['title']; $rest['image'] = $rest['image'] ?: $data['image']; $rest['embeds'] += $data['embeds']; }
                $data = $rest;
            }
        }
        if ((!$data || $data['words'] < 120) && !empty($data['amp'])) {
            [$amp_body, $amp_code, $amp_mime] = self::http_get($data['amp']);
            $amp = $amp_code === 200 ? self::extract_article($amp_body, $data['amp'], $amp_mime) : null;
            if ($amp && $amp['words'] > $data['words']) { $amp['title'] = $data['title'] ?: $amp['title']; $amp['image'] = $data['image'] ?: $amp['image']; $data = $amp; }
        }
        // Last resort: at least return the page summary so the editor is not empty.
        if ($data && !$data['blocks'] && mb_strlen($data['description']) >= 60) {
            $data['blocks'] = [['type'=>'paragraph','text'=>$data['description']]];
            $data['note'] = 'Only the page summary was available (the full text is hidden behind login or JavaScript).';
        }
        if (!$data || !$data['blocks']) {
            if ($blocked) wp_send_json_error($code === 200 ? 'This site shows a bot-protection (Cloudflare) page to servers. Copy the article text manually or try another source.' : 'The site refused the request (HTTP ' . ($code ?: 'no response' . ($err ? ': ' . $err : '')) . '). Try another source URL.', 502);
            wp_send_json_error('No article text found on this page. If it is a Facebook/Instagram/TikTok post, it requires login and cannot be fetched.', 422);
        }
        self::send_article($data, $url);
    }

    private static function send_article($data, $url) {
        $images = $data['images'] ?? [];
        $hero = self::absolute_url($data['image'] ?? '', $url);
        if ($hero && !isset($images[$hero])) $images = [$hero=>['url'=>$hero,'alt'=>sanitize_text_field($data['title'] ?? '')]] + $images;
        $blocks = array_values(array_filter(array_map(static function($b) { return $b['type'] === 'embed' ? (($u = self::valid_url($b['url'] ?? '')) ? ['type'=>'embed', 'url'=>$u, 'text'=>''] : null) : ['type'=>$b['type'], 'text'=>sanitize_textarea_field($b['text'])]; }, $data['blocks'])));
        wp_send_json_success([
            'title'=>sanitize_text_field($data['title'] ?? ''), 'blocks'=>$blocks, 'body'=>implode("\n\n", array_filter(array_column($blocks,'text'))),
            'images'=>array_values($images), 'embeds'=>array_values($data['embeds'] ?? []), 'source'=>$url,
            'words'=>(int)($data['words'] ?? 0), 'note'=>$data['note'] ?? '',
        ]);
    }

    private static function absolute_url($raw, $base) {
        $raw = trim((string)$raw);
        if (str_starts_with($raw, '//')) $raw = 'https:' . $raw;
        if ($raw === '' || preg_match('~^(?:data|javascript|mailto|tel):~i', $raw)) return '';
        if (!preg_match('~^https?://~i', $raw)) {
            if (str_starts_with($raw, '/')) {
                $parts = wp_parse_url($base);
                $raw = ($parts['scheme'] ?? 'https') . '://' . ($parts['host'] ?? '') . $raw;
            } elseif (class_exists('WP_Http')) {
                $raw = WP_Http::make_absolute_url($raw, $base);
            }
        }
        return self::valid_url(str_replace(' ', '%20', $raw)) ?: '';
    }

    /** Admin only: return the saved key so the settings field can show it (masked, with show/hide). */
    public static function get_key() {
        self::authorize('manage_options');
        $provider = sanitize_key(wp_unslash($_POST['provider'] ?? 'gemini'));
        if (!in_array($provider, ['gemini','claude'], true)) wp_send_json_error('Invalid provider.', 400);
        $options = get_option(self::OPTION, []);
        $key = $provider === 'gemini' ? ($options['gemini_key'] ?? $options['api_key'] ?? '') : ($options['claude_key'] ?? '');
        nocache_headers();
        wp_send_json_success(['key'=>(string)$key]);
    }

    public static function save_theme() {
        self::authorize();
        $theme = sanitize_key(wp_unslash($_POST['theme'] ?? 'light'));
        update_user_meta(get_current_user_id(), 'tksc_theme', $theme === 'dark' ? 'dark' : 'light');
        wp_send_json_success(['theme'=>$theme === 'dark' ? 'dark' : 'light']);
    }

    public static function save_settings() {
        self::authorize();
        $launcher = sanitize_key(wp_unslash($_POST['launcher'] ?? 'icon'));
        $style = sanitize_key(wp_unslash($_POST['icon_style'] ?? 'default'));
        $provider = sanitize_key(wp_unslash($_POST['provider'] ?? 'gemini'));
        if (!in_array($launcher, ['icon','text'], true) || !in_array($style, ['default','fire','pulse','outline'],true)) wp_send_json_error('Unknown appearance option.',400);
        if (!in_array($provider, ['gemini','claude'],true)) wp_send_json_error('Unknown AI provider.',400);
        update_user_meta(get_current_user_id(), 'tksc_launcher', $launcher);
        update_user_meta(get_current_user_id(), 'tksc_icon_style', $style);
        update_user_meta(get_current_user_id(), 'tksc_provider', $provider);
        if (current_user_can('manage_options')) {
            $options = get_option(self::OPTION, []);
            $key_field = $provider . '_key';
            if ($provider === 'gemini' && empty($options['gemini_key']) && !empty($options['api_key'])) $options['gemini_key'] = $options['api_key'];
            if (!empty($_POST['clear_key'])) {
                $options[$key_field] = '';
                $options[$provider . '_model'] = '';
                if ($provider === 'gemini') $options['api_key'] = '';
            }
            elseif (!empty($_POST['api_key'])) {
                $new_key = sanitize_text_field(wp_unslash($_POST['api_key']));
                if ($new_key !== ($options[$key_field] ?? '')) $options[$provider . '_model'] = '';
                $options[$key_field] = $new_key;
            }
            $model = sanitize_text_field(wp_unslash($_POST['model'] ?? ''));
            if ($model !== '' && !preg_match('/^[a-zA-Z0-9._-]{2,100}$/', $model)) wp_send_json_error('Invalid model ID.',400);
            if ($model !== '') {
                $available = get_transient('tksc_models_' . md5($options[$key_field] ?? ''));
                if (!is_array($available) || !in_array($model,$available,true)) wp_send_json_error('Refresh the model list for this saved API key before selecting a model.',400);
                $options[$provider . '_model'] = $model;
            } else $options[$provider . '_model'] = '';
            update_option(self::OPTION, $options, false);
        }
        $options = get_option(self::OPTION, []);
        wp_send_json_success(['hasKey'=>['gemini'=>!empty($options['gemini_key'] ?? $options['api_key']), 'claude'=>!empty($options['claude_key'])], 'model'=>['gemini'=>$options['gemini_model'] ?? '','claude'=>$options['claude_model'] ?? ''], 'launcher'=>$launcher, 'iconStyle'=>$style,'provider'=>$provider]);
    }

    public static function list_models() {
        self::authorize();
        $provider = sanitize_key(wp_unslash($_POST['provider'] ?? 'gemini'));
        if (!in_array($provider,['gemini','claude'],true)) wp_send_json_error('Invalid provider.',400);
        $options = get_option(self::OPTION, []);
        $key = $provider === 'gemini' ? ($options['gemini_key'] ?? $options['api_key'] ?? '') : ($options['claude_key'] ?? '');
        if (!$key) wp_send_json_error('Save an API key for this provider first.',400);
        $url = $provider === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100' : 'https://api.anthropic.com/v1/models?limit=100';
        $headers = $provider === 'gemini' ? ['x-goog-api-key'=>$key] : ['x-api-key'=>$key,'anthropic-version'=>'2023-06-01'];
        $response = wp_safe_remote_get($url,['timeout'=>18,'headers'=>$headers]);
        if (is_wp_error($response)) wp_send_json_error('Model list failed: ' . $response->get_error_message(),502);
        $data = json_decode(wp_remote_retrieve_body($response),true);
        if (wp_remote_retrieve_response_code($response) !== 200) wp_send_json_error(sanitize_text_field($data['error']['message'] ?? 'Provider rejected the model list request.'),502);
        $models = [];
        foreach (($provider === 'gemini' ? ($data['models'] ?? []) : ($data['data'] ?? [])) as $item) {
            if ($provider === 'gemini' && !in_array('generateContent',$item['supportedGenerationMethods'] ?? $item['supportedActions'] ?? [],true)) continue;
            $id = $provider === 'gemini' ? preg_replace('~^models/~','',$item['name'] ?? '') : ($item['id'] ?? '');
            if ($id === 'claude-3-5-haiku-20241022') continue;
            if (preg_match('/^[a-zA-Z0-9._-]{2,100}$/',$id)) {
                $name = sanitize_text_field($item['displayName'] ?? $item['display_name'] ?? $id);
                $models[] = ['id'=>$id,'label'=>$name === $id ? $id : $name . ' · ' . $id];
            }
        }
        usort($models, static function($a,$b) use($provider) {
            $rank = static function($id) use($provider) {
                if ($provider === 'claude') return str_contains($id,'haiku') ? 0 : (str_contains($id,'sonnet') ? 1 : (str_contains($id,'opus') ? 2 : 3));
                return str_contains($id,'flash-lite') ? 0 : (str_contains($id,'flash') ? 1 : (str_contains($id,'pro') ? 2 : 3));
            };
            return ($rank($a['id']) <=> $rank($b['id'])) ?: strcmp($a['id'],$b['id']);
        });
        set_transient('tksc_models_' . md5($key),array_column($models,'id'),10 * MINUTE_IN_SECONDS);
        wp_send_json_success(['models'=>$models]);
    }

    public static function test_model() {
        self::authorize('manage_options');
        $provider = sanitize_key(wp_unslash($_POST['provider'] ?? ''));
        $model = sanitize_text_field(wp_unslash($_POST['model'] ?? ''));
        if (!in_array($provider,['gemini','claude'],true) || !preg_match('/^[a-zA-Z0-9._-]{2,100}$/',$model)) wp_send_json_error('Choose a provider and model.',400);
        $options = get_option(self::OPTION,[]);
        $key = $provider === 'gemini' ? ($options['gemini_key'] ?? $options['api_key'] ?? '') : ($options['claude_key'] ?? '');
        $available = $key ? get_transient('tksc_models_' . md5($key)) : false;
        if (!is_array($available) || !in_array($model,$available,true)) wp_send_json_error('Refresh models before testing this selection.',400);
        $response = $provider === 'gemini'
            ? wp_safe_remote_post('https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent',[
                'timeout'=>25,'headers'=>['Content-Type'=>'application/json','x-goog-api-key'=>$key],
                'body'=>wp_json_encode(['contents'=>[['parts'=>[['text'=>'Reply with OK only.']]]],'generationConfig'=>['maxOutputTokens'=>256]])
            ])
            : wp_safe_remote_post('https://api.anthropic.com/v1/messages',[
                'timeout'=>25,'headers'=>['Content-Type'=>'application/json','x-api-key'=>$key,'anthropic-version'=>'2023-06-01'],
                'body'=>wp_json_encode(['model'=>$model,'max_tokens'=>32,'messages'=>[['role'=>'user','content'=>'Reply with OK only.']]])
            ]);
        if (is_wp_error($response)) wp_send_json_error('Connection failed: ' . $response->get_error_message(),502);
        $data = json_decode(wp_remote_retrieve_body($response),true);
        if (wp_remote_retrieve_response_code($response) !== 200) wp_send_json_error(sanitize_text_field($data['error']['message'] ?? 'The provider rejected this model.'),502);
        $text = $provider === 'gemini' ? implode('',array_column($data['candidates'][0]['content']['parts'] ?? [],'text')) : implode('',array_column($data['content'] ?? [],'text'));
        if (trim($text) === '') wp_send_json_error('Provider returned no text. Try another model.',502);
        wp_send_json_success(['model'=>$model,'provider'=>$provider,'message'=>'Connected. The selected model answered successfully.']);
    }

    public static function rewrite() {
        self::authorize();
        $options = get_option(self::OPTION, []);
        $provider = sanitize_key(wp_unslash($_POST['provider'] ?? 'gemini'));
        if (!in_array($provider,['gemini','claude'],true)) wp_send_json_error('Invalid AI provider.',400);
        $key = $provider === 'gemini' ? ($options['gemini_key'] ?? $options['api_key'] ?? '') : ($options['claude_key'] ?? '');
        if (!$key) wp_send_json_error('Save an API key for ' . $provider . ' in popup settings first.',400);
        $model = $options[$provider . '_model'] ?? '';
        if (!preg_match('/^[a-zA-Z0-9._-]{2,100}$/', $model)) wp_send_json_error('Choose and save a model in popup settings first.',400);
        $style = sanitize_key(wp_unslash($_POST['style'] ?? 'cnn'));
        $styles = json_decode((string)file_get_contents(__DIR__ . '/assets/style-prompts.json'), true);
        if (!is_array($styles) || !isset($styles[$style])) wp_send_json_error('Unknown editorial style.',400);
        $body = trim((string)wp_unslash($_POST['body'] ?? ''));
        $title = sanitize_text_field(wp_unslash($_POST['title'] ?? ''));
        if (strlen($body) < 70 || strlen($body) > 50000) wp_send_json_error('Article must be 70–50,000 characters.',400);
        $prompt = $styles[$style] . "\n\nSOURCE TITLE (preserve verbatim in the WordPress title field):\n" . $title . "\nSOURCE ARTICLE:\n" . $body . "\n\nRewrite in original wording with the specified structure. Preserve verified names, dates, numbers, and quotations. Do not invent quotes, anonymous sources, reporting access, events, or facts. Do not claim you work for the named publication or that it reported this article. Use the style structure as an editorial template only. Keep every [[EMBED_n]] placeholder exactly once, alone in its own <p>, at the matching position in the story. Output article HTML only, using p, h2, h3, h4, strong, em, blockquote, ul, ol, li (inline style attributes allowed for boxes). Do not output markdown, a title, source links or credits.";
        if ($provider === 'claude') {
            $response = wp_safe_remote_post('https://api.anthropic.com/v1/messages',[
                'timeout'=>85,'headers'=>['Content-Type'=>'application/json','x-api-key'=>$key,'anthropic-version'=>'2023-06-01'],
                'body'=>wp_json_encode(['model'=>$model,'max_tokens'=>8192,'messages'=>[['role'=>'user','content'=>$prompt]]])
            ]);
        } else {
            $response = wp_safe_remote_post('https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent', [
                'timeout'=>85, 'headers'=>['Content-Type'=>'application/json','x-goog-api-key'=>$key],
                'body'=>wp_json_encode(['contents'=>[['parts'=>[['text'=>$prompt]]]],'generationConfig'=>['temperature'=>0.35,'maxOutputTokens'=>8192]])
            ]);
        }
        if (is_wp_error($response)) wp_send_json_error('AI request failed: ' . $response->get_error_message(),502);
        $json = json_decode(wp_remote_retrieve_body($response),true);
        if (wp_remote_retrieve_response_code($response) !== 200) wp_send_json_error(sanitize_text_field($json['error']['message'] ?? 'AI request failed.'),502);
        $text = trim(implode("\n",array_column($provider === 'claude' ? ($json['content'] ?? []) : ($json['candidates'][0]['content']['parts'] ?? []),'text')));
        $text = preg_replace('/^```(?:html)?\s*|\s*```$/i','',$text);
        $html = wp_kses(preg_replace('~<h1\b[^>]*>[\s\S]*?</h1>~i', '', $text), self::styled_html_rules());
        if (strlen(wp_strip_all_tags($html)) < 65) wp_send_json_error('The AI response was incomplete. Try again.',502);
        wp_send_json_success(['html'=>$html]);
    }

    /* ---------- v2.4 Format Only with API (same prompt contract as the TK Summary extension) ---------- */

    private static function styled_html_rules() {
        $attrs = ['style' => true];
        $rules = [];
        foreach (['p','h2','h3','h4','strong','b','em','i','u','mark','small','sup','sub','code','blockquote','ul','ol','li','br','hr','div','span','table','thead','tbody','tr','th','td','figure','figcaption','cite'] as $tag) $rules[$tag] = $attrs;
        $rules['a'] = ['href' => true, 'target' => true, 'rel' => true, 'style' => true];
        $rules['td']['colspan'] = true; $rules['th']['colspan'] = true;
        return $rules;
    }

    private static function output_contract($seo_name) {
        return "OUTPUT FORMAT (required):\nDo NOT wrap the article HTML inside a JSON string. Use these delimiters exactly:\n\n[SEO_JSON_START]\n{\"seo_title\":\"\",\"focus_keyword\":\"\",\"permalink_slug\":\"\",\"meta_description\":\"\",\"excerpt\":\"\",\"tags\":[\"\"]}\n[SEO_JSON_END]\n[HTML_START]\n(full WordPress HTML article here — unescaped)\n[HTML_END]\n\nSEO JSON must stay tiny. Put EVERY body paragraph between HTML_START and HTML_END.\nseo_title must be the source title copied exactly (including emoji). Do not write a new headline.";
    }

    private static function parse_article_output($text) {
        $raw = trim((string)$text);
        if (preg_match('~```(?:html|json)?\s*([\s\S]*?)```~i', $raw, $m) && !str_contains($raw, '[HTML_START]')) $raw = trim($m[1]);
        $seo = [];
        if (preg_match('~\[SEO_JSON_START\]([\s\S]*?)(?:\[SEO_JSON_END\]|\[HTML_START\]|$)~i', $raw, $m)) {
            $json = trim(preg_replace('~^```(?:json)?|```$~i', '', trim($m[1])));
            $seo = json_decode($json, true) ?: (json_decode(preg_replace('/,\s*([}\]])/', '$1', $json), true) ?: []);
        }
        if (preg_match('~\[HTML_START\]([\s\S]*?)(?:\[HTML_END\]|$)~i', $raw, $m)) $html = trim($m[1]);
        elseif (preg_match('~\{[\s\S]*"content_html"[\s\S]*\}~', $raw, $m) && ($obj = json_decode($m[0], true)) && !empty($obj['content_html'])) { $html = $obj['content_html']; $seo = $obj + $seo; }
        else $html = $raw;
        $html = preg_replace('~^```(?:html)?\s*|\s*```$~i', '', trim($html));
        return [$html, is_array($seo) ? $seo : []];
    }

    /** One API call; returns [text, truncated]. */
    private static function ai_call($provider, $key, $model, $system, $prompt, $max_tokens, $temperature) {
        if ($provider === 'claude') {
            $limit = preg_match('~claude-3-(?:haiku|opus|sonnet)~', $model) ? 4096 : (str_contains($model, 'claude-3-5') ? 8192 : $max_tokens);
            $response = wp_safe_remote_post('https://api.anthropic.com/v1/messages', [
                'timeout'=>150, 'headers'=>['Content-Type'=>'application/json','x-api-key'=>$key,'anthropic-version'=>'2023-06-01'],
                'body'=>wp_json_encode(['model'=>$model,'max_tokens'=>min($max_tokens, $limit),'system'=>$system,'messages'=>[['role'=>'user','content'=>$prompt]]]),
            ]);
        } else {
            $config = ['temperature'=>$temperature, 'maxOutputTokens'=>preg_match('~gemini-(?:2\.5|3)~', $model) ? $max_tokens : min($max_tokens, 8192)];
            if (str_starts_with($model, 'gemini-3')) $config['thinkingConfig'] = ['thinkingLevel'=>'low'];
            elseif (str_contains($model, '2.5-pro')) $config['thinkingConfig'] = ['thinkingBudget'=>128];
            elseif (str_contains($model, '2.5-flash')) $config['thinkingConfig'] = ['thinkingBudget'=>0];
            $response = wp_safe_remote_post('https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent', [
                'timeout'=>150, 'headers'=>['Content-Type'=>'application/json','x-goog-api-key'=>$key],
                'body'=>wp_json_encode(['systemInstruction'=>['parts'=>[['text'=>$system]]], 'contents'=>[['role'=>'user','parts'=>[['text'=>$prompt]]]], 'generationConfig'=>$config]),
            ]);
        }
        if (is_wp_error($response)) throw new RuntimeException('AI request failed: ' . $response->get_error_message());
        $json = json_decode(wp_remote_retrieve_body($response), true);
        if (wp_remote_retrieve_response_code($response) !== 200) throw new RuntimeException(sanitize_text_field($json['error']['message'] ?? 'AI request failed.') . ' (model ' . $model . ' — no fallback)');
        if ($provider === 'claude') return [implode("\n", array_column($json['content'] ?? [], 'text')), ($json['stop_reason'] ?? '') === 'max_tokens'];
        $parts = array_filter($json['candidates'][0]['content']['parts'] ?? [], static function($p) { return empty($p['thought']); });
        return [implode('', array_column($parts, 'text')), ($json['candidates'][0]['finishReason'] ?? '') === 'MAX_TOKENS'];
    }

    public static function format_api() {
        self::authorize();
        @set_time_limit(180);
        $options = get_option(self::OPTION, []);
        $provider = sanitize_key(wp_unslash($_POST['provider'] ?? 'gemini'));
        if (!in_array($provider, ['gemini','claude'], true)) wp_send_json_error('Invalid AI provider.', 400);
        $key = $provider === 'gemini' ? ($options['gemini_key'] ?? $options['api_key'] ?? '') : ($options['claude_key'] ?? '');
        if (!$key) wp_send_json_error('Format Only uses the AI API. Save an API key for ' . $provider . ' in popup settings, or use Free Format (no API).', 400);
        $model = $options[$provider . '_model'] ?? '';
        if (!preg_match('/^[a-zA-Z0-9._-]{2,100}$/', $model)) wp_send_json_error('Choose and save a model in popup settings first.', 400);
        $style = sanitize_key(wp_unslash($_POST['style'] ?? 'cnn'));
        $prompts = json_decode((string)file_get_contents(__DIR__ . '/assets/style-prompts.json'), true);
        if (!is_array($prompts) || !isset($prompts[$style])) wp_send_json_error('Unknown editorial style.', 400);
        $label = 'CNN Digital';
        foreach (self::styles() as $s) if (($s['id'] ?? '') === $style) $label = $s['label'];
        $body = trim((string)wp_unslash($_POST['body'] ?? ''));
        $title = sanitize_text_field(wp_unslash($_POST['title'] ?? ''));
        if (strlen($body) < 70 || strlen($body) > 60000) wp_send_json_error('Article must be 70–60,000 characters.', 400);
        $seo_name = self::seo_provider() ?: 'SEO';
        $want_seo = !empty($_POST['seo']);
        $upper = strtoupper($label);

        $system = "You are a high-precision WordPress HTML Formatter for {$upper}.\n"
            . "CRITICAL: DO NOT rewrite, paraphrase, summarize, or shorten. Keep 100% of original words.\n"
            . "Your job is to wrap paragraphs in <p>, inject {$label} layout, and bold key names.\n"
            . "The LENGTH target in the blueprint does not apply: the output length equals the source length.\n"
            . "You may add the blueprint's structural elements (subheadings, boxes, bullet summaries, bold labels) using words already present in the source; do not invent facts, quotes, datelines or sources.\n"
            . "Keep every [[EMBED_n]] placeholder exactly once, alone in its own <p>, at the same position as in the source.\n"
            . "Do not output an <h1> or repeat the title in the HTML. Allowed tags: p, h2, h3, h4, strong, em, blockquote, ul, ol, li, hr, div, span, table, figure, figcaption, a. Inline style attributes are allowed for boxes and accents.\n"
            . "Style blueprint:\n" . $prompts[$style] . "\n" . self::output_contract($seo_name);
        $prompt = "Format this source article into {$upper} HTML layout. Keep 100% of original words. Keep the source TITLE unchanged as seo_title (including emoji).\n"
            . "Source Title: {$title}\nSource Content:\n{$body}\n"
            . ($want_seo ? "Generate {$seo_name} SEO fields (focus keyword, slug, meta, tags, excerpt). seo_title must equal the source title exactly. meta_description max 160 characters." : "Leave {$seo_name} fields empty.");
        try {
            [$text, $truncated] = self::ai_call($provider, $key, $model, $system, $prompt, 16000, 0.2);
        } catch (RuntimeException $e) { wp_send_json_error($e->getMessage(), 502); }
        [$html, $seo] = self::parse_article_output($text);
        $html = preg_replace('~<h1\b[^>]*>[\s\S]*?</h1>~i', '', $html);
        $html = wp_kses($html, self::styled_html_rules());
        $out_words = self::word_count(wp_strip_all_tags($html));
        if ($out_words < 30) wp_send_json_error('The AI response was incomplete. Try again or choose another model.', 502);
        $in_words = max(1, self::word_count($body));
        $clean = static function($v, $len) { return mb_substr(sanitize_text_field(is_string($v) ? $v : ''), 0, $len); };
        $tags = array_values(array_filter(array_map(static function($t) { return mb_substr(sanitize_text_field((string)$t), 0, 40); }, is_array($seo['tags'] ?? null) ? $seo['tags'] : explode(',', (string)($seo['tags'] ?? ''))), 'strlen'));
        wp_send_json_success([
            'html'=>$html, 'truncated'=>$truncated, 'coverage'=>round($out_words / $in_words, 2), 'model'=>$model,
            'seo'=>$want_seo ? ['title'=>$title, 'keyword'=>$clean($seo['focus_keyword'] ?? '', 80), 'desc'=>$clean($seo['meta_description'] ?? '', 170), 'excerpt'=>$clean($seo['excerpt'] ?? '', 400), 'slug'=>sanitize_title($seo['permalink_slug'] ?? ''), 'tags'=>array_slice($tags, 0, 10)] : null,
        ]);
    }

    public static function image_proxy() {
        self::authorize('upload_files');
        $url = self::valid_url(wp_unslash($_REQUEST['url'] ?? ''));
        if (!$url) wp_die('Invalid image URL.', '', ['response'=>400]);
        $response = wp_safe_remote_get($url,['timeout'=>20,'redirection'=>2,'limit_response_size'=>8000001]);
        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) wp_die('Cannot load image.', '', ['response'=>502]);
        $bytes = wp_remote_retrieve_body($response);
        $info = @getimagesizefromstring($bytes);
        if (!$info || strlen($bytes) > 8000000 || !in_array($info['mime'],['image/jpeg','image/png','image/webp'],true)) wp_die('Unsupported image.', '', ['response'=>415]);
        nocache_headers();
        header('Content-Type: ' . $info['mime']);
        header('X-Content-Type-Options: nosniff');
        echo $bytes;
        exit;
    }

    public static function upload_image() {
        self::authorize('upload_files');
        if (empty($_FILES['image']) || !is_uploaded_file($_FILES['image']['tmp_name']) || (int)$_FILES['image']['size'] > 8000000) wp_send_json_error('Choose an image smaller than 8 MB.',400);
        $info = @getimagesize($_FILES['image']['tmp_name']);
        if (!$info || $info['mime'] !== 'image/webp') wp_send_json_error('The edited image must be WebP.',415);
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        $_FILES['image']['name'] = 'tk-summary-' . wp_generate_password(12,false) . image_type_to_extension($info[2]);
        $id = media_handle_upload('image',0,[],['test_form'=>false]);
        if (is_wp_error($id)) wp_send_json_error('Could not save image: ' . $id->get_error_message(),500);
        $alt = sanitize_text_field(wp_unslash($_POST['alt'] ?? ''));
        if ($alt !== '') update_post_meta($id,'_wp_attachment_image_alt',$alt);
        $title = sanitize_text_field(wp_unslash($_POST['title'] ?? ''));
        $caption = sanitize_text_field(wp_unslash($_POST['caption'] ?? ''));
        if ($title !== '' || $caption !== '') wp_update_post(['ID'=>$id,'post_title'=>$title ?: get_the_title($id),'post_excerpt'=>$caption]);
        wp_send_json_success(['id'=>$id,'url'=>wp_get_attachment_url($id),'alt'=>$alt]);
    }

    public static function import_image() {
        self::authorize('upload_files');
        $url = self::valid_url(wp_unslash($_POST['url'] ?? ''));
        if (!$url) wp_send_json_error('Invalid or unsafe image URL.',400);
        $head = wp_safe_remote_head($url, ['timeout'=>10, 'redirection'=>2]);
        if (!is_wp_error($head) && (int)wp_remote_retrieve_header($head, 'content-length') > 8000000) wp_send_json_error('Image exceeds 8 MB.',413);
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        $temp = download_url($url, 17);
        if (is_wp_error($temp)) wp_send_json_error('Image download failed.',502);
        $info = @getimagesize($temp);
        if (!$info || !in_array($info['mime'],['image/jpeg','image/png','image/webp'],true) || filesize($temp) > 8000000) { @unlink($temp); wp_send_json_error('Unsupported image or image too large.',415); }
        $editor = wp_get_image_editor($temp); $webp = false;
        if (!is_wp_error($editor) && $editor->supports_mime_type('image/webp')) {
            $editor->resize(1600,1600,false);
            $newfile = $temp . '.webp';
            $saved = $editor->save($newfile,'image/webp');
            if (!is_wp_error($saved)) { @unlink($temp); $temp = $newfile; $webp = true; }
        }
        $ext = $webp ? '.webp' : image_type_to_extension($info[2]);
        $name = 'tk-summary-' . wp_generate_password(12,false) . $ext;
        $id = media_handle_sideload(['name'=>$name,'tmp_name'=>$temp],0);
        if (is_wp_error($id)) { @unlink($temp); wp_send_json_error('Could not save image to Media Library.',500); }
        wp_send_json_success(['id'=>$id,'url'=>wp_get_attachment_url($id),'webp'=>$webp]);
    }

    public static function save_fields($id,$post) {
        if (wp_is_post_revision($id) || !isset($_POST['tksc_form_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['tksc_form_nonce'])),'tksc_save') || !current_user_can('edit_post',$id) || empty($_POST['tksc_apply'])) return;
        if (!empty($_POST['tksc_apply_seo'])) {
            $provider = self::seo_provider();
            $names = $provider === 'Rank Math' ? ['title'=>'rank_math_title','desc'=>'rank_math_description','keyword'=>'rank_math_focus_keyword'] : ($provider === 'Yoast SEO' ? ['title'=>'_yoast_wpseo_title','desc'=>'_yoast_wpseo_metadesc','keyword'=>'_yoast_wpseo_focuskw'] : []);
            foreach ($names as $input=>$meta) if (isset($_POST['tksc_seo_' . $input])) update_post_meta($id,$meta,sanitize_text_field(wp_unslash($_POST['tksc_seo_' . $input])));
        }
        if (!empty($_POST['tksc_image_id']) && current_user_can('upload_files')) {
            $media = absint($_POST['tksc_image_id']);
            if (get_post_type($media) === 'attachment' && wp_attachment_is_image($media)) set_post_thumbnail($id,$media);
        }
    }
}
TK_Summary_Classic::init();
