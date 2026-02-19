// Patterns for hardcoded social share links
const SOCIAL_PATTERNS = [
    { name: 'X', pattern: /x\.com\/intent\/post|twitter\.com\/intent\/tweet/i, id: 'share-x' },
    { name: 'WhatsApp', pattern: /wa\.me|api\.whatsapp\.com\/send/i, id: 'share-whatsapp' },
    { name: 'Telegram', pattern: /t\.me\/share\/url/i, id: 'share-telegram' },
    { name: 'Bluesky', pattern: /bsky\.app\/intent\/compose/i, id: 'share-bluesky' },
    { name: 'Mastodon', pattern: /mastodonshare\.com/i, id: 'share-mastodon' },
    { name: 'LinkedIn', pattern: /linkedin\.com\/sharing\/share-offsite/i, id: 'share-linkedin' },
    { name: 'Facebook', pattern: /facebook\.com\/sharer/i, id: 'share-facebook' },
    { name: 'Reddit', pattern: /reddit\.com\/submit/i, id: 'share-reddit' }
];

// Inject the navigator.share hijacker
const script = document.createElement('script');
script.src = browser.runtime.getURL('js/inject.js');
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
            Object.keys(platforms).forEach(id => {
                if (id === 'share-copy' || id === 'share-custom' || id === 'share-email') return;

                const item = document.createElement('div');
                item.className = 'item';
                if (platforms[id].tooltip) {
                    item.title = platforms[id].tooltip;
                }

                const iconDiv = document.createElement('div');
                iconDiv.className = 'icon';
                const svgDoc = parser.parseFromString(platforms[id].icon, 'image/svg+xml');
                const svgElement = svgDoc.documentElement;
                if (svgElement && svgElement.tagName.toLowerCase() === 'svg') {
                    iconDiv.appendChild(svgElement);
                }

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
const MODERATE_PROTECTION_LIST = ['bank', 'paypal', 'stripe', 'gov', 'mil', 'healthcare'];
const PRIVACY_PROTECTION_LIST = [...MODERATE_PROTECTION_LIST, 'ledger', 'trezor', 'coinbase', 'binance', 'mychart', 'epic', 'police', 'interpol', 'proton.me', 'tutanota', 'bitwarden', '1password', 'lastpass'];

function isSensitiveSite(level = 'strict') {
    try {
        const domain = window.location.hostname.toLowerCase();
        const list = level === 'moderate' ? MODERATE_PROTECTION_LIST : PRIVACY_PROTECTION_LIST;
        return list.some(p => domain.includes(p));
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

// Listen for messages from the popup or background
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getMetadata") {
        Logger.info("Content script metadata requested.");
        sendResponse(getMetadata());
    }
    if (request.action === "notifyThread") {
        showContentToast("🧵 " + request.message);
    }
    if (request.action === "triggerShareSheet") {
        Logger.info("Background requested Share Sheet.");
        showShareSheet(request.title, request.url, request.text);
    }
});

async function initialize() {
    const settings = await browser.storage.local.get('securityLevel');
    const level = settings.securityLevel || 'strict';

    if (isSensitiveSite(level)) {
        Logger.info("Security: Disabling interception on sensitive site (" + level + ").");
        return;
    }

    // Listen for intercepted Navigator Share
    window.addEventListener('extension_intercepted_share', (e) => {
        Logger.info("Intercepted navigator.share call.");
        showShareSheet(e.detail.title, e.detail.url, e.detail.text);
    });
}

initialize();
