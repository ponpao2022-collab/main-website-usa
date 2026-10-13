=== TK Summary for Classic Editor ===
Contributors: tk-studio
Requires at least: 6.4
Requires PHP: 8.0
Stable tag: 2.5.0
License: GPLv2 or later

The original extension's 15 editorial style labels, logos and prompts plus its 30 Free Format presets inside the existing WordPress Classic Editor.

== Install ==
Upload tk-summary-classic-v2-5.zip with Plugins > Add New > Upload Plugin. The ZIP contains exactly one root directory named tk-summary-classic with tk-summary-classic.php directly inside it. If WordPress offers to replace an already installed older copy of this same plugin, choose to replace it. Activate and open Posts > Add New in Classic Editor.

== Workflow ==
Fetch a public article URL. Title and extracted article text appear immediately in the Classic Editor. Images are listed in Image Studio but remain outside the post until explicitly inserted. X and YouTube links can be included as selected embeds. Rewrite with Gemini or Claude (requires a configured key and model), Format Only with one of the 15 editorial styles (uses the same AI key and model, applies the extension's style layout and keeps 100% of the original words, and fills Rank Math/Yoast keyword, description, excerpt, tags and draft slug), or Free Format with the 30 original extension presets — the only mode without an API. Each result replaces the article body in Classic Editor and is ready for review.

Image Studio: select one of the fetched source images or upload a file, crop to a preset ratio, flip in either direction, rotate, apply filters, add a text or logo watermark, set image alt/title/caption and download a WebP, then choose Insert at cursor or Set Featured Image. The browser converts to WebP, which is uploaded to the WordPress Media Library. Place the Classic Editor cursor at the intended position first; images never enter the post automatically on Fetch, Rewrite or Format. Featured Image is saved when the WordPress post is saved or published.

== Popup settings ==
The popup keeps a fixed size across Article, Image Studio, and Settings views. Article Reset clears the fetched article after confirmation; Image Reset clears the current selection and edits without deleting already uploaded Media Library items. All three article modes use a single style selector with its original logo or preset icon. The default launcher shows the original blue extension icon alone; Settings offers text only, Default, animated Fire glow, Blue pulse or Outline. Administrators can save Gemini and Claude keys separately, refresh available models, explicitly choose an exact model, and run an optional small paid test request. Save a new key before loading models; select and save a model before Rewrite. Rewrite uses only the saved model and never automatically switches to another model. API keys stay on the server and are never sent to the editor browser. The original extension uses claude-haiku-4-5-20251001, available if the API lists it for your key. Claude Haiku 3.5 is retired by Anthropic; it cannot be selected as a functioning API model. Other editors may change their launcher and preferred provider but only administrators can configure API models.

== Notes ==
Requires PHP DOM for source extraction. Some sites block remote fetch. Image Studio requires browser canvas/WebP support and WordPress media upload permissions. URLs in X and YouTube embeds necessarily point to those platforms. Verify rights for imported images and check all rewritten facts before publishing. Named style templates are inspired by editorial structure and do not claim affiliation with an outlet.

== 2.4.0 ==
* Fetch: new article extractor (known CMS containers + paragraph scoring), WordPress REST API fallback, AMP fallback, JSON-LD articleBody, Blogger <br> layouts, YouTube (title + description + embed) and X post links. Fixes themes such as HitMag whose <body> class contains "sidebar".
* Sites behind Cloudflare bot protection, and Facebook/Instagram/TikTok posts that need login, show a clear message instead of "No article text found".
* Format Only now uses the AI API with the extension's formatter prompt; Free Format is the only no-API mode.
* Rewrite/Format keep numbered lists, subheads and inline-styled boxes from the style blueprints.
* Image Studio: drag a corner of the preview to resize (aspect locked), or type width/height; the size is used for Insert, Featured Image and Download.
* Extension-style picker (feature card, logo strip, 30 preset cards) and softer card, border and colour styling.

== 2.5.0 ==
* Social/video embeds (X, YouTube, TikTok, Vimeo; Instagram/Facebook as link cards) stay at their original position in the article through Fetch, Format Only, Rewrite and Free Format. YouTube/X/TikTok/Vimeo are inserted as a URL on its own line so WordPress shows the real embed card.
* Image Studio: drag-to-crop like the extension (move the box, 8 handles, ratio pills, Apply/Reset crop); resize applies to the cropped result.
* Settings: the saved API key stays in the field (hidden) with a show/hide eye, a Connect button checks the key and loads models, and a status dot shows the connection. The remove checkbox is gone: clear the field and Save settings to remove a key. Only administrators can see the key.
* Dark mode (warm Claude-style palette) with a header toggle saved per user; light mode keeps its original colours. New gear icon.
