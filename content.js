function randomToken(length = 16) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const CONTENT_EVENT_TOKEN = `extension_intercepted_share_${randomToken(12)}`;
let interceptionEnabled = true;
const INTERCEPT_MIN_INTERVAL_MS = 800;
const USER_GESTURE_WINDOW_MS = 8000;
const EVENT_FUTURE_TOLERANCE_MS = 3000;
const EVENT_PAST_TOLERANCE_MS = 30000;
const NONCE_MAX_AGE_MS = 60000;
const nonceSeenAt = new Map();
let lastInterceptAt = 0;
let lastUserGestureAt = 0;

function markUserGesture() {
    lastUserGestureAt = Date.now();
}

window.addEventListener('pointerdown', markUserGesture, { capture: true, passive: true });
window.addEventListener('keydown', markUserGesture, { capture: true, passive: true });
window.addEventListener('touchstart', markUserGesture, { capture: true, passive: true });

// Inject the navigator.share hijacker
const script = document.createElement('script');
script.src = browser.runtime.getURL('js/inject.js');
script.dataset.asToken = CONTENT_EVENT_TOKEN;
(document.head || document.documentElement).appendChild(script);
script.onload = () => script.remove();

// UI State
let shareSheet = null;

function createShareSheet() {
    if (shareSheet) return shareSheet;

    const container = document.createElement('div');
    container.id = 'as-share-sheet-root';
    const shadow = container.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
        :host {
            position: fixed;
            left: 0;
            width: 100%;
            z-index: 2147483647;
            pointer-events: none;
            bottom: 0;
            display: none;
        }
        .overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }
        .overlay.active { opacity: 1; pointer-events: auto; }
        .sheet {
            position: fixed;
            bottom: -100%;
            left: 0;
            width: 100%;
            height: auto;
            background: #ffffff;
            transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 -4px 15px rgba(0,0,0,0.1);
            border-radius: 20px 20px 0 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1a1a1b;
            padding-bottom: env(safe-area-inset-bottom, 20px);
            pointer-events: auto;
        }
        @media (prefers-color-scheme: dark) {
            .sheet { background: #1c1c1e; color: #ffffff; }
        }
        .sheet.active { bottom: 0; }
        .header {
            padding: 16px;
            text-align: center;
            border-bottom: 1px solid rgba(0,0,0,0.1);
            position: relative;
        }
        .header h3 { margin: 0; font-size: 16px; font-weight: 600; }
        .close-btn {
            position: absolute; right: 16px; top: 12px;
            background: rgba(128,128,128,0.15);
            border: none; border-radius: 50%; width: 28px; height: 28px;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            color: inherit; font-size: 18px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            padding: 20px;
            padding-top: 10px;
            max-height: 40vh;
            overflow-y: auto;
        }
        .tools-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            padding: 20px;
            padding-bottom: 5px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .section-header {
            padding: 12px 20px 0;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #8a8a8e;
            letter-spacing: 0.5px;
        }
        .item {
            display: flex; flex-direction: column; align-items: center;
            text-decoration: none; color: inherit; font-size: 11px;
            gap: 8px; cursor: pointer;
        }
        .icon {
            width: 48px; height: 48px;
            background: rgba(128,128,128,0.1);
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.1s;
        }
        .icon.tool-icon {
            background: rgba(0, 122, 255, 0.1);
            color: #007aff;
        }
        .item:active .icon { transform: scale(0.9); }
        .privacy-badge {
            text-align: center; font-size: 10px; color: #8a8a8e;
            padding: 10px; opacity: 0.7;
        }
    `;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const sheetEl = document.createElement('div');
    sheetEl.className = 'sheet';
    const header = document.createElement('div');
    header.className = 'header';
    const h3 = document.createElement('h3');
    h3.textContent = 'Clean Share';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    header.appendChild(h3);
    header.appendChild(closeBtn);

    const grid = document.createElement('div');
    grid.className = 'grid';

    const privacyBadge = document.createElement('div');
    privacyBadge.className = 'privacy-badge';
    privacyBadge.textContent = 'Privacy First • Trackers Scrubbed';

    sheetEl.appendChild(header);
    sheetEl.appendChild(grid);
    sheetEl.appendChild(privacyBadge);

    shadow.appendChild(style);
    shadow.appendChild(overlay);
    shadow.appendChild(sheetEl);
    (document.body || document.documentElement).appendChild(container);

    const close = () => {
        sheetEl.classList.remove('active');
        overlay.classList.remove('active');
        setTimeout(() => container.style.display = 'none', 300);
    };

    overlay.onclick = close;
    sheetEl.querySelector('.close-btn').onclick = close;

    shareSheet = {
        container,
        overlay,
        sheet: sheetEl,
        grid: sheetEl.querySelector('.grid'),
        close
    };
    return shareSheet;
}

function showShareSheet(title, url, text) {
    const sheetObj = createShareSheet();
    sheetObj.grid.textContent = '';
    const loadingMsg = document.createElement('div');
    loadingMsg.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 20px; opacity: 0.5;';
    loadingMsg.textContent = 'Loading Platforms...';
    sheetObj.grid.appendChild(loadingMsg);
    sheetObj.container.style.display = 'block';

    // 1. Animate Sheet
    if (!sheetObj.container.parentNode) {
        (document.body || document.documentElement).appendChild(sheetObj.container);
    }

    requestAnimationFrame(() => {
        sheetObj.sheet.classList.add('active');
        sheetObj.overlay.classList.add('active');
    });

    // 2. Populate Platforms Grid
    browser.runtime.sendMessage({ action: "getPlatforms" })
        .then(response => {
            if (!response || !response.platforms) {
                Logger.error("Failed to get platforms from background.");
                sheetObj.grid.textContent = '';
                const errorMsg = document.createElement('div');
                errorMsg.style.cssText = 'grid-column: 1/-1; text-align: center; color: red;';
                errorMsg.textContent = 'Error loading platforms.';
                sheetObj.grid.appendChild(errorMsg);
                return;
            }

            const platforms = response.platforms;
            sheetObj.grid.textContent = '';
            const parser = new DOMParser();

            const createPlatformIcon = (iconMarkup, platformTitle) => {
                const iconDiv = document.createElement('div');
                iconDiv.className = 'icon';

                if (typeof iconMarkup === 'string' && iconMarkup.trim()) {
                    const htmlDoc = parser.parseFromString(iconMarkup, 'text/html');
                    const svgFromHtml = htmlDoc.querySelector('svg');
                    if (svgFromHtml) {
                        iconDiv.appendChild(document.importNode(svgFromHtml, true));
                        return iconDiv;
                    }

                    const xmlDoc = parser.parseFromString(iconMarkup, 'image/svg+xml');
                    const svgFromXml = xmlDoc.documentElement;
                    if (svgFromXml && svgFromXml.tagName && svgFromXml.tagName.toLowerCase() === 'svg') {
                        iconDiv.appendChild(document.importNode(svgFromXml, true));
                        return iconDiv;
                    }
                }

                const fallback = document.createElement('span');
                fallback.textContent = (platformTitle || '?').slice(0, 1).toUpperCase();
                fallback.style.fontWeight = '700';
                fallback.style.fontSize = '18px';
                iconDiv.appendChild(fallback);
                return iconDiv;
            };

            Object.keys(platforms).forEach(id => {
                if (id === 'share-copy' || id === 'share-custom' || id === 'share-email') return;

                const item = document.createElement('div');
                item.className = 'item';
                if (platforms[id].tooltip) {
                    item.title = platforms[id].tooltip;
                }

                const iconDiv = createPlatformIcon(platforms[id].icon, platforms[id].title);

                const titleSpan = document.createElement('span');
                titleSpan.textContent = platforms[id].title;

                item.appendChild(iconDiv);
                item.appendChild(titleSpan);
                item.onclick = async (e) => {
                    e.stopPropagation();
                    if ("vibrate" in navigator) navigator.vibrate(30);

                    sheetObj.close();

                    if (id === 'share-markdown') {
                        const mdLink = `[${title}](${url})`;
                        try {
                            await navigator.clipboard.writeText(mdLink);
                            showContentToast("Markdown link copied!");
                        } catch (err) {
                            showContentToast("Clipboard Error");
                        }
                        return;
                    }

                    if (id === 'share-read-later') {
                        browser.runtime.sendMessage({
                            action: "addToReadLater",
                            item: { title, url, timestamp: Date.now() }
                        });
                        showContentToast("Saved to Read Later");
                        return;
                    }

                    browser.runtime.sendMessage({
                        action: "performShare",
                        platformId: id,
                        title: title,
                        url: url,
                        text: text
                    });
                };
                sheetObj.grid.appendChild(item);
            });
        })
        .catch(err => {
            Logger.error("Error in showShareSheet:", err);
            sheetObj.grid.textContent = '';
            const containerDiv = document.createElement('div');
            containerDiv.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 20px;';

            const titleDiv = document.createElement('div');
            titleDiv.style.cssText = 'color: #ff3b30; margin-bottom: 12px;';
            titleDiv.textContent = 'Connection Error';

            const bodyDiv = document.createElement('div');
            bodyDiv.style.cssText = 'font-size: 13px; opacity: 0.7; margin-bottom: 20px;';
            bodyDiv.textContent = 'The background script is not responding. Try refreshing the page.';

            containerDiv.appendChild(titleDiv);
            containerDiv.appendChild(bodyDiv);
            sheetObj.grid.appendChild(containerDiv);
        });
}

// Initial Setup
Logger.info("Another Share Content Script Loaded.");

// Privacy: Skip sensitive domains
const MODERATE_PROTECTION_KEYWORDS = ['bank', 'healthcare'];
const MODERATE_PROTECTION_DOMAINS = ['paypal.com', 'stripe.com', 'gov', 'mil'];
const PRIVACY_PROTECTION_KEYWORDS = [...MODERATE_PROTECTION_KEYWORDS, 'police', 'interpol'];
const PRIVACY_PROTECTION_DOMAINS = [
    ...MODERATE_PROTECTION_DOMAINS,
    'ledger.com',
    'trezor.io',
    'coinbase.com',
    'binance.com',
    'mychart.com',
    'epic.com',
    'proton.me',
    'tutanota.com',
    'bitwarden.com',
    '1password.com',
    'lastpass.com'
];

function matchesDomainOrSuffix(domain, rule) {
    if (!rule) return false;
    return domain === rule || domain.endsWith(`.${rule}`);
}

function isSensitiveSite(level = 'strict') {
    try {
        const domain = window.location.hostname.toLowerCase();
        const labels = domain.split('.').filter(Boolean);
        const keywords = level === 'moderate' ? MODERATE_PROTECTION_KEYWORDS : PRIVACY_PROTECTION_KEYWORDS;
        const domains = level === 'moderate' ? MODERATE_PROTECTION_DOMAINS : PRIVACY_PROTECTION_DOMAINS;
        return keywords.some((keyword) => labels.includes(keyword)) || domains.some((rule) => matchesDomainOrSuffix(domain, rule));
    } catch (e) {
        return true;
    }
}

// Toast Notification
function showContentToast(message) {
    const el = document.createElement('div');
    el.textContent = message;
    Object.assign(el.style, {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '24px',
        fontSize: '14px',
        zIndex: 2147483647,
        opacity: 0,
        transition: 'opacity 0.3s',
        pointerEvents: 'none'
    });

    // Ensure it's on top of everything including shadow roots if possible (appended to body)
    (document.body || document.documentElement).appendChild(el);

    // Animate in
    requestAnimationFrame(() => el.style.opacity = 1);

    // Animate out
    setTimeout(() => {
        el.style.opacity = 0;
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

function sanitizeToastMessage(value, maxLength = 300) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
}

// Extract metadata from the page
function getMetadata() {
    const getMeta = (name) => {
        return document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
            document.querySelector(`meta[name="${name}"]`)?.getAttribute('content');
    };

    return {
        title: getMeta('og:title') || document.title,
        description: getMeta('og:description') || getMeta('description'),
        image: getMeta('og:image'),
        url: window.location.href,
        siteName: getMeta('og:site_name')
    };
}

function sanitizeInterceptedShareDetail(detail) {
    if (!detail || typeof detail !== 'object') return null;

    const title = typeof detail.title === 'string' ? detail.title.trim().slice(0, 400) : '';
    const text = typeof detail.text === 'string' ? detail.text.trim().slice(0, 12000) : '';
    const url = typeof detail.url === 'string' ? detail.url.trim().slice(0, 2048) : '';
    const ts = Number.isFinite(detail.ts) ? detail.ts : 0;
    const nonce = typeof detail.nonce === 'string' ? detail.nonce.trim().slice(0, 64) : '';

    if (url) {
        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        } catch {
            return null;
        }
    }

    return { title, text, url, ts, nonce };
}

function isTrustedInterceptPayload(payload) {
    if (!payload || typeof payload !== 'object') return false;

    const hasMeaningfulContent = Boolean(payload.title || payload.text || payload.url);
    if (!hasMeaningfulContent) return false;

    // Require a URL for intercepted navigator.share payloads to reduce spoof-only text events.
    if (!payload.url) return false;

    if (payload.url) {
        try {
            const shared = new URL(payload.url);
            const current = new URL(window.location.href);
            // Bound intercepted shares to the current page URL shape.
            if (shared.origin !== current.origin) return false;
            if (shared.pathname !== current.pathname) return false;
            if (shared.search !== current.search) return false;
        } catch {
            return false;
        }
    }

    return true;
}

function isAllowedRuntimeSender(sender) {
    return !!sender && sender.id === browser.runtime.id;
}

function hasFreshNonce(nonce, now) {
    if (typeof nonce !== 'string' || nonce.length < 8) return false;

    for (const [knownNonce, seenAt] of nonceSeenAt.entries()) {
        if (now - seenAt > NONCE_MAX_AGE_MS) {
            nonceSeenAt.delete(knownNonce);
        }
    }

    if (nonceSeenAt.has(nonce)) return false;
    nonceSeenAt.set(nonce, now);
    return true;
}

const CONTENT_ALLOWED_ACTIONS = new Set(["getMetadata", "notifyThread", "triggerShareSheet"]);

// Listen for messages from the popup or background
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!isAllowedRuntimeSender(sender) || !request || typeof request !== 'object' || !CONTENT_ALLOWED_ACTIONS.has(request.action)) return false;

    if (request.action === "getMetadata") {
        Logger.info("Content script metadata requested.");
        sendResponse(getMetadata());
    }
    if (request.action === "notifyThread") {
        const safeMessage = sanitizeToastMessage(request.message);
        if (safeMessage) {
            showContentToast("🧵 " + safeMessage);
        }
    }
    if (request.action === "triggerShareSheet") {
        Logger.info("Background requested Share Sheet.");
        showShareSheet(request.title, request.url, request.text);
    }
});

// Listen for intercepted Navigator Share early to avoid race conditions.
window.addEventListener(CONTENT_EVENT_TOKEN, (e) => {
    if (!interceptionEnabled) return;
    const payload = sanitizeInterceptedShareDetail(e.detail);
    if (!payload) return;

    if (!isTrustedInterceptPayload(payload)) {
        Logger.warn('Blocked intercepted share due to untrusted payload.');
        return;
    }

    const now = Date.now();
    const sinceLastIntercept = now - lastInterceptAt;
    if (sinceLastIntercept >= 0 && sinceLastIntercept < INTERCEPT_MIN_INTERVAL_MS) {
        Logger.warn('Blocked intercepted share due to rapid repeat.');
        return;
    }

    if (payload.ts) {
        const skew = now - payload.ts;
        if (skew < -EVENT_FUTURE_TOLERANCE_MS || skew > EVENT_PAST_TOLERANCE_MS) {
            Logger.warn('Blocked intercepted share due to stale/future timestamp.');
            return;
        }
    }

    if (!hasFreshNonce(payload.nonce, now)) {
        Logger.warn('Blocked intercepted share due to missing/replayed nonce.');
        return;
    }

    const sinceGesture = now - lastUserGestureAt;
    if (sinceGesture >= 0 && sinceGesture > USER_GESTURE_WINDOW_MS) {
        Logger.warn('Blocked intercepted share without recent user gesture.');
        return;
    }

    lastInterceptAt = now;
    Logger.info("Intercepted navigator.share call.");
    showShareSheet(payload.title, payload.url, payload.text);
});

async function initialize() {
    const settings = await browser.storage.local.get('securityLevel');
    const level = settings.securityLevel || 'strict';

    if (isSensitiveSite(level)) {
        interceptionEnabled = false;
        Logger.info("Security: Disabling interception on sensitive site (" + level + ").");
        return;
    }

    interceptionEnabled = true;
}

initialize();
