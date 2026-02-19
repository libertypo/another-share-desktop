const TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'mc_cid', 'mc_eid',
    '_ga', '_gl', 'yclid', 'ref', 'source', 'original_referrer'
];
Object.freeze(TRACKING_PARAMS);

const PLATFORMS = PLATFORMS_DATA;
Object.freeze(PLATFORMS);

const DEFAULT_ORDER = Object.keys(PLATFORMS).filter(id => id !== 'share-custom');
const RESERVED_INTRO = "\n\n\n";

function cleanUrl(urlStr) {
    if (urlStr.startsWith('file://')) {
        return { url: '', cleaned: true, isLocal: true, originalUrl: urlStr };
    }
    try {
        const url = new URL(urlStr);
        let cleaned = false;
        TRACKING_PARAMS.forEach(param => {
            if (url.searchParams.has(param)) {
                url.searchParams.delete(param);
                cleaned = true;
            }
        });
        return { url: url.toString(), cleaned };
    } catch (e) {
        return { url: urlStr, cleaned: false };
    }
}

function isRestrictedUrl(url) {
    if (!url) return true;
    const restricted = ['about:', 'moz-extension:', 'view-source:', 'resource:', 'chrome:', 'jar:', 'data:'];
    if (restricted.some(protocol => url.startsWith(protocol))) return true;
    if (url.includes('addons.mozilla.org')) return true;
    return false;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = 'toast'; }, 2000);
}

async function cropImageData(dataUrl, rect, dpr) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const sx = Math.max(0, Math.floor(rect.x * dpr));
            const sy = Math.max(0, Math.floor(rect.y * dpr));
            const sw = Math.floor(rect.width * dpr);
            const sh = Math.floor(rect.height * dpr);

            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
            resolve(canvas.toDataURL());
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image Load Failed"));
    img.src = url;
});

function chunkText(quote, platformId, title, url) {
    const config = PLATFORMS[platformId];
    if (!config || !config.limit) return [];

    const chunks = [];
    let remaining = quote.trim();
    const urlLen = url ? (config.urlWeight || url.length) : 0;
    let partNum = 1;

    while (remaining.length > 0) {
        const introPart = (partNum === 1) ? RESERVED_INTRO : "";
        const reserved = title.length + introPart.length + (partNum === 1 ? urlLen + 18 : 16);
        const maxChunkLen = config.limit - reserved;

        if (remaining.length <= maxChunkLen) {
            chunks.push(remaining);
            break;
        }

        let cutIdx = maxChunkLen;
        const lastSpace = remaining.lastIndexOf(' ', maxChunkLen);
        if (lastSpace > maxChunkLen * 0.7) cutIdx = lastSpace;

        chunks.push(remaining.substring(0, cutIdx).trim());
        remaining = remaining.substring(cutIdx).trim();
        partNum++;
    }

    return chunks.map((q, i) => {
        const meta = `${title} (${i + 1}/${chunks.length})`;
        return i === 0 ? { type: 'intent', text: q, meta } : { type: 'copy', text: `"${q}" — ${meta}` };
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('share-grid');
    const titleEl = document.getElementById('article-title');
    const urlEl = document.getElementById('article-url');
    const charCounter = document.getElementById('char-counter');
    const readerToggle = document.getElementById('reader-mode-toggle');
    const captureOverlay = document.getElementById('capture-overlay');
    const previewImg = document.getElementById('capture-preview');
    const threadTool = document.getElementById('thread-tool');
    const threadMsg = document.getElementById('thread-msg');
    const btnSplitStart = document.getElementById('btn-split-start');
    const btnThreadCancel = document.getElementById('btn-thread-cancel');

    let currentCaptureData = null;
    let currentCaptureName = "";
    let selectedText = '';
    let articleTitle = '';
    let articleUrl = '';
    let currentThreadChunks = [];
    let currentThreadIdx = 0;
    let threadPlatform = '';

    Logger.info("====================================");
    Logger.info("STARTING ANOTHER SHARE v0.1.7.7");
    Logger.info("Environment: Desktop");
    Logger.info("====================================");

    function showCaptureProposal(dataUrl, filename) {
        if (!dataUrl) {
            Logger.error("showCaptureProposal: dataUrl is empty!");
            return;
        }
        currentCaptureData = dataUrl;
        currentCaptureName = filename;
        previewImg.src = dataUrl;
        captureOverlay.classList.add('active');
        Logger.info(`Proposal shown: ${filename} (${Math.round(dataUrl.length / 1024)} KB)`);
    }

    const data = await browser.storage.local.get(['readerMode', 'platformOrder', 'hiddenPlatforms', 'customTemplate', 'screenshotFormat', 'screenshotQuality', 'lastThread', 'currentThreadIdx', 'debugLogging', 'pendingExtraction']);
    if (readerToggle && data.readerMode !== undefined) readerToggle.checked = data.readerMode;

    Logger.info("Popup opened. Initializing UI.");

    if (readerToggle) {
        readerToggle.addEventListener('change', async () => {
            const isChecked = readerToggle.checked;
            await browser.storage.local.set({ readerMode: isChecked });
            updateCounter();
            Logger.info(`Reader mode toggled: ${isChecked}`);
        });
    }

    const order = data.platformOrder || DEFAULT_ORDER;
    const hidden = data.hiddenPlatforms || [];
    if (data.customTemplate && !order.includes('share-custom')) order.push('share-custom');

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        Logger.error("Could not find active tab.");
        return;
    }
    Logger.info("Context tab identified.", { tabId: tab.id });
    const cleanInfo = cleanUrl(tab.url || '');
    articleUrl = cleanInfo.url;

    articleTitle = tab.title || 'Unknown';
    // Remove characters that are illegal in file names when downloading, but keep the title meaningful
    const fileSafeTitle = articleTitle.replace(/[\\/:*?"<>|]/g, '_');

    titleEl.textContent = articleTitle;
    urlEl.textContent = articleUrl || (cleanInfo.isLocal ? "Local File (Path Hidden)" : "Unknown Source");

    if (data.lastThread && data.lastThread.parts) {
        currentThreadChunks = data.lastThread.parts.map(t => {
            if (typeof t === 'string' && data.lastThread.isFromContext) return { type: 'copy', text: t };
            return t;
        });
        currentThreadIdx = data.currentThreadIdx || 0;
        threadPlatform = data.lastThread.platformId || '';

        threadTool.classList.add('active');
        const isFromContextMenu = !!data.lastThread.isFromContext;
        const currentHumanNum = isFromContextMenu ? currentThreadIdx + 2 : currentThreadIdx + 1;

        if (currentThreadIdx >= currentThreadChunks.length) {
            threadMsg.textContent = "Thread Complete!";
            threadMsg.style.fontWeight = "bold";
            btnSplitStart.style.display = 'none';
        } else {
            threadMsg.textContent = "";
            const b = document.createElement('b');
            b.textContent = "Thread Tool";
            const br = document.createElement('br');
            const span = document.createElement('span');
            span.textContent = `Part 1 shared. Total: ${data.lastThread.total}.`;
            threadMsg.appendChild(b);
            threadMsg.appendChild(br);
            threadMsg.appendChild(span);
            btnSplitStart.textContent = `Copy Part ${currentHumanNum}`;
            if (currentThreadIdx === 0 && !isFromContextMenu) btnSplitStart.textContent = "Start (Part 1)";
        }
    }

    try {
        if (!isRestrictedUrl(tab.url)) {
            const scriptRes = await browser.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.getSelection().toString().trim()
            });
            selectedText = scriptRes[0]?.result || '';
            if (selectedText) Logger.info("Initial selection captured.");
        }
    } catch (e) {
        Logger.warn('Content script not ready for selection capture', e);
    }

    if (selectedText) {
        updateUIWithText(selectedText);
    } else if (data.pendingExtraction) {
        Logger.info("Restoring pending extraction from storage.");
        updateUIWithText(data.pendingExtraction);
    }

    async function updateUIWithText(text) {
        Logger.info("UI metadata updated with new text content.");
        selectedText = text;
        const infoSection = document.querySelector('.article-info');
        const oldBox = infoSection.querySelector('.quote-box');
        if (oldBox) oldBox.remove();

        const quoteBox = document.createElement('div');
        quoteBox.className = 'quote-box';
        const p = document.createElement('p');
        p.textContent = `"${selectedText.substring(0, 300)}${selectedText.length > 300 ? '...' : ''}"`;
        quoteBox.appendChild(p);
        infoSection.appendChild(quoteBox);
        updateCounter();

        // Persist extraction
        await browser.storage.local.set({ pendingExtraction: text });
    };

    const updateCounter = (platformId = 'share-x') => {
        const platform = PLATFORMS[platformId] || PLATFORMS['share-x'];
        const limit = platform.limit || 10000;

        let displayUrl = articleUrl;
        if (readerToggle && readerToggle.checked && articleUrl) {
            displayUrl = `about:reader?url=${encodeURIComponent(articleUrl)}`;
        }

        const total = (selectedText ? `"${selectedText}" — `.length : 0) +
            articleTitle.length +
            (platformId === 'share-copy' || platformId === 'share-email' ? 0 : (displayUrl ? (platform.urlWeight || displayUrl.length) : 0)) +
            RESERVED_INTRO.length;

        charCounter.textContent = total;
        charCounter.className = 'char-counter' + (total > limit ? ' overflow' : (total > limit * 0.9 ? ' warning' : ''));
    };
    updateCounter();

    const getShareUrl = (id, t, u, q) => {
        if (!id) return "";

        // Internal about: URLs (like Reader Mode) are often rejected in the dedicated 'url' parameter.
        // We embed them in the text body instead for platforms that support it.
        const isInternal = u.startsWith('about:');
        const textOnlyUrl = isInternal ? u : "";
        const publicUrl = isInternal ? "" : u;

        if (id === 'share-custom' && data.customTemplate) return data.customTemplate.replace('{url}', encodeURIComponent(u)).replace('{title}', encodeURIComponent(q ? `${RESERVED_INTRO}"${q}" — ${t}` : `${RESERVED_INTRO}${t}`));

        const templates = {
            'share-x': `https://x.com/intent/post?text=${encodeURIComponent(q ? `${RESERVED_INTRO}"${q}" — ${t}${textOnlyUrl ? ` ${textOnlyUrl}` : ""}` : `${RESERVED_INTRO}${t}${textOnlyUrl ? ` ${textOnlyUrl}` : ""}`)}${publicUrl ? `&url=${encodeURIComponent(publicUrl)}` : ""}`,
            'share-bluesky': `https://bsky.app/intent/compose?text=${encodeURIComponent(q ? `${RESERVED_INTRO}"${q}" — ${t}${u ? ` ${u}` : ""}` : `${RESERVED_INTRO}${t}${u ? ` ${u}` : ""}`)}`,
            'share-mastodon': `https://mastodonshare.com/?text=${encodeURIComponent(q ? `${RESERVED_INTRO}"${q}" — ${t}${u ? ` ${u}` : ""}` : `${RESERVED_INTRO}${t}${u ? ` ${u}` : ""}`)}${publicUrl ? `&url=${encodeURIComponent(publicUrl)}` : ""}`,
            'share-whatsapp': `https://wa.me/?text=${encodeURIComponent(q ? `${RESERVED_INTRO}"${q}"\n\n${t}${u ? ` ${u}` : ""}` : `${RESERVED_INTRO}${t}${u ? ` ${u}` : ""}`)}`,
            'share-telegram': `https://t.me/share/url?text=${encodeURIComponent(q ? `${RESERVED_INTRO}"${q}"\n\n${t}${textOnlyUrl ? `\n\n${textOnlyUrl}` : ""}` : `${RESERVED_INTRO}${t}${textOnlyUrl ? `\n\n${textOnlyUrl}` : ""}`)}${publicUrl ? `&url=${encodeURIComponent(publicUrl)}` : ""}`,
            'share-linkedin': u ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` : "",
            'share-facebook': u ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` : "",
            'share-reddit': `https://www.reddit.com/submit?${publicUrl ? `url=${encodeURIComponent(publicUrl)}&` : ""}title=${encodeURIComponent(q ? `${RESERVED_INTRO}"${q}" — ${t}${textOnlyUrl ? ` ${textOnlyUrl}` : ""}` : `${RESERVED_INTRO}${t}${textOnlyUrl ? ` ${textOnlyUrl}` : ""}`)}`,
            'share-email': `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(q ? `${RESERVED_INTRO}"${q}"\n\n${t}${u ? `\n${u}` : ""}` : `${RESERVED_INTRO}${t}${u ? `\n${u}` : ""}`)}`
        };
        return templates[id];
    };

    btnSplitStart.addEventListener('click', async () => {
        const isFromContextMenu = !!(data.lastThread && data.lastThread.isFromContext);

        // If we haven't calculated chunks yet (Direct from Thread Full), do it now
        if (currentThreadChunks.length === 0 && selectedText) {
            threadPlatform = 'share-x';
            currentThreadChunks = chunkText(selectedText, threadPlatform, articleTitle, articleUrl);
            currentThreadIdx = 0;
            await browser.storage.local.set({
                lastThread: { parts: currentThreadChunks, total: currentThreadChunks.length, isFromContext: false, platformId: threadPlatform },
                currentThreadIdx: 0
            });
        }

        const chunk = currentThreadChunks[currentThreadIdx];
        const currentHumanNum = isFromContextMenu ? currentThreadIdx + 2 : currentThreadIdx + 1;

        if (chunk.type === 'intent') {
            const shareUrl = getShareUrl(threadPlatform, chunk.meta, articleUrl, chunk.text);
            browser.tabs.create({ url: shareUrl });
            currentThreadIdx++;
            await browser.storage.local.set({ currentThreadIdx });
            btnSplitStart.textContent = `Copy Part ${currentThreadIdx + 1}`;

            threadMsg.textContent = "";
            const b = document.createElement('b');
            b.textContent = "Part 1 Opened!";
            const br = document.createElement('br');
            const span = document.createElement('span');
            span.textContent = "Post it, reply to it, then click here for Part 2.";
            threadMsg.appendChild(b);
            threadMsg.appendChild(br);
            threadMsg.appendChild(span);
        } else {
            await navigator.clipboard.writeText(chunk.text);
            showToast(`Part ${currentHumanNum} Copied!`, "success");
            currentThreadIdx++;
            await browser.storage.local.set({ currentThreadIdx });

            if (currentThreadIdx >= currentThreadChunks.length) {
                threadMsg.textContent = "Thread Done!";
                threadMsg.style.fontWeight = "bold";
                btnSplitStart.style.display = 'none';
                await browser.storage.local.remove(['lastThread', 'currentThreadIdx']);
            } else {
                const nextHumanNum = isFromContextMenu ? currentThreadIdx + 2 : currentThreadIdx + 1;
                btnSplitStart.textContent = `Copy Part ${nextHumanNum}`;

                threadMsg.textContent = "";
                const b = document.createElement('b');
                b.textContent = `Part ${currentHumanNum} Copied!`;
                const br = document.createElement('br');
                const span = document.createElement('span');
                span.textContent = "Paste your reply, then click for next part.";
                threadMsg.appendChild(b);
                threadMsg.appendChild(br);
                threadMsg.appendChild(span);
            }
        }
    });

    const btnThreadSave = document.getElementById('btn-thread-save');
    btnThreadSave.addEventListener('click', async () => {
        Logger.info("Thread Tool: Saving text to file.");
        const blob = new Blob([selectedText || ""], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `thread-${articleTitle.substring(0, 20)}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        showToast("Text saved as backup!", "success");
    });

    btnThreadCancel.addEventListener('click', async () => {
        threadTool.classList.remove('active');
        await browser.storage.local.remove(['lastThread', 'currentThreadIdx', 'pendingExtraction']);
    });

    order.forEach(id => {
        if (hidden.includes(id) || !PLATFORMS[id]) return;
        const btn = document.createElement('button');
        btn.className = 'share-btn'; btn.id = id; btn.title = PLATFORMS[id].title;

        const wrapper = document.createElement('div');
        wrapper.className = 'icon-wrapper';
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(PLATFORMS[id].icon, 'text/html');
            const svgElement = doc.body.firstChild;
            if (svgElement) {
                wrapper.appendChild(document.importNode(svgElement, true));
            }
        } catch (e) { console.error("SVG Parse failed", e); }
        btn.appendChild(wrapper);
        btn.addEventListener('mouseenter', () => updateCounter(id));
        btn.addEventListener('click', async () => {
            const finalUrl = readerToggle.checked ? (articleUrl ? `about:reader?url=${encodeURIComponent(articleUrl)}` : "") : articleUrl;

            if (id === 'share-copy') {
                Logger.info("Action: Copy to clipboard.");
                const copyText = selectedText ? (finalUrl ? `${RESERVED_INTRO}"${selectedText}"\n${finalUrl}` : `${RESERVED_INTRO}"${selectedText}"`) : `${RESERVED_INTRO}${finalUrl}`;
                await navigator.clipboard.writeText(copyText);
                showToast("Copied!", "success"); setTimeout(() => window.close(), 800);
                return;
            }

            if (id === 'share-markdown') {
                Logger.info("Action: Copy Markdown.");
                const mdLink = `[${articleTitle}](${finalUrl})`;
                await navigator.clipboard.writeText(mdLink);
                showToast("Markdown Copied!", "success");
                setTimeout(() => window.close(), 800);
                return;
            }

            if (id === 'share-read-later') {
                Logger.info("Action: Save to Read Later.");
                const item = { title: articleTitle, url: finalUrl, timestamp: Date.now() };

                // Send to background to handle storage logic (dedup/limit)
                browser.runtime.sendMessage({
                    action: "addToReadLater",
                    item: item
                });

                showToast("Saved to Read Later!", "success");
                setTimeout(() => window.close(), 800);
                return;
            }

            if (PLATFORMS[id].limit && selectedText) {
                const chunks = chunkText(selectedText, id, articleTitle, finalUrl);
                if (chunks.length > 1) {
                    Logger.info(`Action: Split thread for ${id}.`, { parts: chunks.length });
                    currentThreadChunks = chunks;
                    currentThreadIdx = 0;
                    threadPlatform = id;
                    await browser.storage.local.set({
                        lastThread: { parts: chunks, total: chunks.length, isFromContext: false, platformId: id },
                        currentThreadIdx: 0
                    });
                    threadTool.classList.add('active');

                    threadMsg.textContent = "";
                    const b = document.createElement('b');
                    b.textContent = "Thread Tool";
                    const br = document.createElement('br');
                    const span = document.createElement('span');
                    span.textContent = `${chunks.length} parts required.`;
                    threadMsg.appendChild(b);
                    threadMsg.appendChild(br);
                    threadMsg.appendChild(span);

                    btnSplitStart.textContent = "Start (Part 1)";
                    btnSplitStart.style.display = 'block';
                    return;
                }
            }
            const url = getShareUrl(id, articleTitle, finalUrl, selectedText);
            if (!url) {
                Logger.warn(`Local file share attempted on incompatible platform: ${id}`);
                showToast("Local files not shareable here", "error");
                return;
            }
            Logger.info(`Action: Intent share started. Platform: ${id}`);
            if (url.startsWith('mailto:')) { window.location.href = url; setTimeout(() => window.close(), 1000); }
            else { browser.tabs.create({ url }); window.close(); }
        });
        grid.appendChild(btn);
    });

    document.getElementById('share-full-thread').addEventListener('click', async () => {
        Logger.info("Tool called: Full Thread Extraction.");
        if (isRestrictedUrl(tab.url)) {
            showToast("Cannot access restricted page", "error");
            return;
        }
        showToast("Extracting Full Content...", "info");
        try {
            Logger.info("Starting Full Thread Diagnostic Extraction...");
            const res = await browser.scripting.executeScript({
                target: { tabId: tab.id }, func: () => {
                    console.log("[Diagnostic] Content Script Started");
                    const selector = 'article, main, [role="main"], #content, .post, .article';
                    const target = document.querySelector(selector) || document.body;
                    const validTags = ['H1', 'H2', 'H3', 'P', 'LI'];
                    const skipSelectors = 'nav, footer, header, aside, script, style, iframe, form, .ads, .ad, .social, .comments, #sidebar';

                    const els = Array.from(target.querySelectorAll('h1, h2, h3, p, li'));
                    const filtered = els.filter(el => {
                        if (!validTags.includes(el.tagName)) return false;
                        if (el.closest(skipSelectors)) return false;
                        return el.innerText.trim().length > 0;
                    });
                    const text = filtered.map(el => el.innerText.trim()).join('\n\n');

                    console.log(`[Diagnostic] Capture done. Length: ${text.length}`);
                    return {
                        text: text.slice(0, 100000),
                        originalLength: text.length,
                        title: document.title
                    };
                }
            });

            if (res[0].result && res[0].result.text) {
                const diag = res[0].result;
                Logger.info(`Extraction Complete. Length: ${diag.text.length} (Raw: ${diag.originalLength})`);
                updateUIWithText(diag.text);
                showToast("Full article loaded!", "success");

                if (diag.text.length > 250) {
                    threadTool.classList.add('active');
                    threadMsg.textContent = '';
                    const bold = document.createElement('b');
                    bold.textContent = 'Content Extracted';
                    const br = document.createElement('br');
                    const span = document.createElement('span');
                    span.textContent = `${diag.text.length} chars. Save draft or start thread?`;
                    threadMsg.appendChild(bold);
                    threadMsg.appendChild(br);
                    threadMsg.appendChild(span);
                    btnSplitStart.textContent = "Start Thread";
                    btnSplitStart.style.display = 'block';
                }
            } else {
                Logger.warn("Full Thread: Extraction returned empty or failed.");
                showToast("No content found.", "error");
            }
        } catch (e) {
            Logger.error("Full Thread Crash Intercepted:", e);
            showToast("Extraction failed: " + e.message, "error");
        }
    });

    document.getElementById('share-screenshot').addEventListener('click', async () => {
        Logger.info("Tool called: Viewport Screenshot.");
        if (isRestrictedUrl(tab.url)) {
            showToast("Cannot capture restricted page", "error");
            return;
        }
        try {
            const format = data.screenshotFormat || 'image/png';
            Logger.info("Starting Viewport Diagnostic Capture...");
            const dataUrl = await browser.tabs.captureVisibleTab(null, {
                format: format === 'image/png' ? 'png' : 'jpeg',
                quality: data.screenshotQuality || 90
            });

            // Normalize via canvas to ensure full-width presentation on all devices
            const img = await loadImage(dataUrl);
            Logger.info(`Viewport Captured. Frame size: ${img.width}x${img.height}. Window Width: ${window.innerWidth}`);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const normalizedUrl = canvas.toDataURL(format === 'image/jpeg' ? 'image/jpeg' : 'image/png');
            Logger.info(`Normalized Viewport size: ${canvas.width}x${canvas.height}`);
            showCaptureProposal(normalizedUrl, `screenshot-${Date.now()}.${format === 'image/png' ? 'png' : 'jpg'}`);
        } catch (e) {
            Logger.error("Viewport Screenshot failed", e);
            showToast(`Capture failed: ${e.message}`, "error");
        }
    });

    document.getElementById('share-text').addEventListener('click', async () => {
        Logger.info("Tool called: Clean Text Download.");
        if (isRestrictedUrl(tab.url)) {
            showToast("Cannot access restricted page", "error");
            return;
        }
        showToast("Cleaning Text...", "info");
        try {
            Logger.info("Executing diagnostic text extraction script...");
            const res = await browser.scripting.executeScript({
                target: { tabId: tab.id }, func: () => {
                    try {
                        const target = document.querySelector('article, main, [role="main"], #content, .post, .article') || document.body;
                        const validTags = ['H1', 'H2', 'H3', 'P', 'LI'];
                        const skipSelectors = 'nav, footer, header, aside, script, style, iframe, form, .ads, .ad, .social, .comments, #sidebar';

                        const text = Array.from(target.querySelectorAll('h1, h2, h3, p, li'))
                            .filter(el => {
                                if (!validTags.includes(el.tagName)) return false;
                                if (el.closest(skipSelectors)) return false;
                                return el.innerText.trim().length > 0;
                            })
                            .map(el => el.innerText.trim())
                            .join('\n\n');

                        return { text: text.slice(0, 90000), len: text.length };
                    } catch (innerErr) {
                        return { error: innerErr.message };
                    }
                }
            });

            if (!res || !res[0] || !res[0].result) throw new Error("No response from script.");
            const result = res[0].result;
            if (result.error) throw new Error(result.error);

            const content = result.text || "";
            Logger.info(`Text Cleaned. Size: ${content.length} chars. (Original: ${result.len})`);

            const blob = new Blob([content || "No content found."], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const safeTitle = (articleTitle || "article").replace(/[\\/:*?"<>|]/g, '').substring(0, 30);
            link.download = `${safeTitle}.txt`;
            link.click();
            URL.revokeObjectURL(url);
            showToast("Clean text saved!", "success");
        } catch (e) {
            Logger.error("Clean Text Crash Intercepted:", e);
            showToast("Extraction failed: " + e.message, "error");
        }
    });

    document.getElementById('share-print').addEventListener('click', () => {
        browser.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.print() });
    });

    document.getElementById('share-full-screenshot').addEventListener('click', async () => {
        Logger.info("Tool called: Full Page Scrolling Capture.");
        if (isRestrictedUrl(tab.url)) {
            showToast("Cannot capture restricted page", "error");
            return;
        }
        showToast("Processing Full Page...", "info");
        try {
            const format = data.screenshotFormat || 'image/png';

            const metaRes = await browser.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const el = document.documentElement;
                    return {
                        totalHeight: Math.max(el.scrollHeight, el.offsetHeight, document.body.scrollHeight),
                        viewHeight: window.innerHeight,
                        viewWidth: window.innerWidth
                    };
                }
            });

            const meta = metaRes[0].result;
            if (!meta || !meta.totalHeight) throw new Error("Could not measure page.");
            Logger.info("SCROLLING CAPTURE - PAGE META:", meta);

            const finalHeight = Math.min(meta.totalHeight, 15000);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');



            let framesCaptured = 0;
            const originalScroll = (await browser.scripting.executeScript({
                target: { tabId: tab.id }, func: () => window.scrollY
            }))[0].result;

            for (let cur = 0; cur < finalHeight; cur += meta.viewHeight) {
                const scrollPos = Math.min(cur, meta.totalHeight - meta.viewHeight);
                Logger.info(`-- Frame ${framesCaptured} -- Start Scroll: ${scrollPos}`);

                await browser.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (s) => window.scrollTo(0, s),
                    args: [scrollPos]
                });
                await new Promise(r => setTimeout(r, 1000)); // Buffer for stability

                const frameUrl = await browser.tabs.captureVisibleTab(null, {
                    format: format === 'image/jpeg' ? 'jpeg' : 'png',
                    quality: data.screenshotQuality || 90
                });
                const img = await loadImage(frameUrl);
                Logger.info(`Frame ${framesCaptured} Snapped: ${img.width}x${img.height}`);

                if (framesCaptured === 0) {
                    canvas.width = img.width;
                    // Ratio of high-res image pixels to CSS pixels
                    const ratio = img.width / meta.viewWidth;
                    const maxHeightLimit = 25000;
                    canvas.height = Math.min(finalHeight * ratio, maxHeightLimit * ratio);

                    ctx.fillStyle = "white";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    Logger.info(`CANVAS CREATED: ${canvas.width}x${canvas.height} (Ratio: ${ratio.toFixed(2)})`);
                }

                // Calculate where to draw this frame
                const ratio = canvas.width / meta.viewWidth;
                const destY = scrollPos * ratio;

                // Draw it. We FORCE it to match canvas.width to prevent sidebars.
                ctx.drawImage(img, 0, 0, img.width, img.height, 0, Math.floor(destY), canvas.width, Math.floor(img.height * (canvas.width / img.width)));

                framesCaptured++;
                if (cur >= meta.totalHeight - meta.viewHeight || (destY + (img.height * (canvas.width / img.width))) >= (canvas.height - 5)) break;
            }

            // Restore scroll
            await browser.scripting.executeScript({
                target: { tabId: tab.id },
                func: (s) => window.scrollTo(0, s),
                args: [originalScroll]
            });

            Logger.info(`Full Page Capture complete. ${framesCaptured} frames stitched.`);
            showCaptureProposal(canvas.toDataURL(format === 'image/jpeg' ? 'image/jpeg' : 'image/png'), `full-capture-${Date.now()}.png`);
        } catch (e) {
            Logger.error("Full Page Scrolling Capture failed", e);
            showToast(`Capture Error: ${e.message}`, "error");
        }
    });

    document.getElementById('open-settings').addEventListener('click', () => browser.runtime.openOptionsPage());
    document.getElementById('btn-save').addEventListener('click', () => {
        Logger.info("Capture Preview: User clicked Save.");
        const link = document.createElement('a'); link.href = currentCaptureData; link.download = currentCaptureName; link.click();
        captureOverlay.classList.remove('active'); showToast("Saved!", "success"); setTimeout(() => window.close(), 500);
    });
    document.getElementById('btn-cancel').addEventListener('click', () => {
        Logger.info("Capture Preview: User clicked Cancel.");
        captureOverlay.classList.remove('active');
    });
    document.getElementById('open-read-later').addEventListener('click', () => {
        browser.tabs.create({ url: browser.runtime.getURL("popup/read_later.html") });
        window.close();
    });

    document.getElementById('btn-print').addEventListener('click', () => {
        Logger.info("Capture Preview: User clicked Print.");
        const printWin = window.open('print.html');
        printWin.onload = () => {
            printWin.document.getElementById('print-image').src = currentCaptureData;
            printWin.print();
        };
    });
});
