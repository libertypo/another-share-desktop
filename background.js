// Verified Background Script Start
console.log("[Another Share] Background script initializing...");

const PLATFORMS_DATA = {
    'share-x': { title: 'X', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z" /></svg>', limit: 280, urlWeight: 23 },
    'share-bluesky': { title: 'Bluesky', icon: '<svg width="20" height="20" viewBox="0 0 54 54" fill="currentColor"><path d="M13.851 6.54c-7.352 5.09-10.42 16.58-1.571 25.6 5.864 5.96 11.83 5.02 14.72 1.34 2.89 3.68 8.856 4.62 14.72-1.34 8.847-9.02 5.782-20.51-1.572-25.6C34.225 2.37 28.52 7.14 27 10.61c-1.52-3.47-7.225-8.24-13.149-4.07z" /></svg>', limit: 300 },
    'share-mastodon': { title: 'Mastodon', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127c-.64 2.863-.51 5.821-.51 8.656 0 1.09.025 2.189.071 3.291.086 1.903.163 3.81.487 5.704.211 1.281 1.31 2.393 2.602 2.496 2.819.227 5.545.29 8.183.193 2.636.092 5.372.031 8.193-.193 1.292-.103 2.391-1.215 2.602-2.496.423-2.553.483-5.182.483-7.727 0-3.45.05-6.864-.571-9.942zm-2.366 9.292c0 .882 0 1.76-.016 2.646-.014.215-.014.43-.03.645-.071.867-.103 1.734-.21 2.6-.014.065-.014.13-.015.196-.029.13-.014.26-.062.39-.105.56-.618.995-1.18.995-.347 0-.693-.014-1.04-.014l-2.482.042c-2.422.055-4.845.07-7.265.053l-1.477-.042c-.56-.03-.99-.54-.99-1.1v-8.4c0-.56.45-1.01 1.01-1.01h2.52c.56 0 1.01.45 1.01 1.01v4.98c0 .285.2Shell.31.5.31.185 0 .3-.025.5-.31v-4.98c0-.56.45-1.01 1.01-1.01h2.52c.56 0 1.01.45 1.01 1.01z" /></svg>', limit: 500 },
    'share-whatsapp': { title: 'WhatsApp', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>' },
    'share-linkedin': { title: 'LinkedIn', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>' },
    'share-facebook': { title: 'Facebook', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>' },
    'share-reddit': { title: 'Reddit', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 11.779c0-1.459-1.192-2.645-2.657-2.645-.715 0-1.363.285-1.84.746-2.091-1.464-4.947-2.396-8.118-2.503l1.728-5.419 4.743 1.015c.026.834.71 1.503 1.547 1.503 1.459 0 2.644-1.183 2.644-2.641 0-1.458-1.185-2.642-2.644-2.642-.904 0-1.701.458-2.174 1.155l-5.263-1.127c-.201-.043-.404.07-.478.261l-2.037 6.386c-3.211.084-6.11.1-8.239 2.56-.475-.447-1.121-.722-1.832-.722-1.465 0-2.657 1.185-2.657 2.644 0 .973.53 1.821 1.314 2.278-.042.247-.064.498-.064.753 0 3.868 4.256 7.014 9.488 7.014 5.232 0 9.488-3.146 9.488-7.014 0-.248-.021-.493-.061-.734.81-.452 1.36-1.309 1.36-2.302zm-18.73 1.579c0-1.019.829-1.847 1.847-1.847 1.018 0 1.847.828 1.847 1.847 0 1.018-.829 1.847-1.847 1.847-1.018 0-1.847-.829-1.847-1.847zm9.645 4.872c-1.325 1.325-3.832 1.417-4.915 1.417-1.083 0-3.59-.092-4.915-1.417-.168-.168-.168-.442 0-.61.168-.168.442-.168.61 0 1.002 1.002 3.067 1.156 4.305 1.156 1.238 0 3.303-.154 4.305-1.156.168-.168.442-.168.61 0 .167.168.167.442 0 .61zm-.284-3.025c-1.018 0-1.847-.829-1.847-1.847s.829-1.847 1.847-1.847c1.018 0 1.847.828 1.847 1.847s-.829 1.847-1.847 1.847z" /></svg>' }
};

const TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'mc_cid', 'mc_eid',
    '_ga', '_gl', 'yclid', 'ref', 'source', 'original_referrer'
];

function cleanUrl(urlStr) {
    if (!urlStr || urlStr.startsWith('file://')) return '';
    try {
        const url = new URL(urlStr);
        TRACKING_PARAMS.forEach(param => {
            if (url.searchParams.has(param)) url.searchParams.delete(param);
        });
        return url.toString();
    } catch (e) { return urlStr; }
}

const platforms = {
    x: (title, url, quote) => {
        const text = quote ? `"${quote}" — ${title}` : title;
        const urlPart = url ? `&url=${encodeURIComponent(url)}` : "";
        return `https://x.com/intent/post?text=${encodeURIComponent(text)}${urlPart}`;
    },
    bluesky: (title, url, quote) => {
        const body = quote ? `"${quote}" — ${title}` : title;
        const text = url ? `${body} ${url}` : body;
        return `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`;
    },
    mastodon: (title, url, quote) => {
        const body = quote ? `"${quote}" — ${title}` : title;
        const text = url ? `${body} ${url}` : body;
        const urlPart = url ? `&url=${encodeURIComponent(url)}` : "";
        return `https://mastodonshare.com/?text=${encodeURIComponent(text)}${urlPart}`;
    },
    whatsapp: (title, url, quote) => {
        const body = quote ? `"${quote}"\n\n${title}` : title;
        const text = url ? `${body} ${url}` : body;
        return `https://wa.me/?text=${encodeURIComponent(text)}`;
    },
    telegram: (title, url, quote) => {
        const body = quote ? `"${quote}"\n\n${title}` : title;
        const urlPart = url ? `&url=${encodeURIComponent(url)}` : "";
        return `https://t.me/share/url?text=${encodeURIComponent(body)}${urlPart}`;
    },
    linkedin: (title, url) => url ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` : "",
    facebook: (title, url) => url ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` : "",
    reddit: (title, url, quote) => {
        const titleText = quote ? `"${quote}" — ${title}` : title;
        const urlPart = url ? `&url=${encodeURIComponent(url)}` : "";
        return `https://www.reddit.com/submit?title=${encodeURIComponent(titleText)}${urlPart}`;
    }
};
// Message listeners for Content Script Interception
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[Another Share] Message received in background:", message.action);

    if (message.action === "getPlatforms") {
        sendResponse({ platforms: PLATFORMS_DATA });
        return false;
    }

    if (message.action === "addToReadLater") {
        const { item } = message;
        if (!item) return false;

        browser.storage.local.get('readLater').then(data => {
            let readLater = data.readLater || [];

            // Deduplicate: Remove existing entry with same URL if present, so we can bump it to top
            readLater = readLater.filter(i => i.url !== item.url);

            // Add to front
            readLater.unshift(item);

            // Enforce limit of 50, removing oldest (from end)
            while (readLater.length > 50) {
                readLater.pop();
            }

            browser.storage.local.set({ readLater });
        });
        return false;
    }

    if (message.action === "captureVisible") {
        const windowId = sender.tab ? sender.tab.windowId : null;
        browser.tabs.captureVisibleTab(windowId, { format: "png" }).then(dataUrl => {
            browser.tabs.create({ url: dataUrl });
        }).catch(err => {
            console.error("[Another Share] Capture failed:", err);
        });
        return false;
    }
    if (message.action === "performShare") {
        const { platformId, title, url, text } = message;

        if (platformId === 'share-markdown') {
            // Handled client side basically, but if needed here
            return false;
        }

        const pureId = platformId.replace("share-", "");
        const cleanedUrl = cleanUrl(url);
        const config = PLATFORMS_DATA[platformId];

        if (platforms[pureId]) {
            if (config && config.limit && text && text.length > config.limit - 50) {
                // Threading needed
                const chunks = chunkText(text, platformId, title, cleanedUrl);
                if (chunks.length > 1) {
                    browser.tabs.create({ url: platforms[pureId](title, cleanedUrl, chunks[0].text) });
                    // Notify user via content script
                    browser.tabs.sendMessage(sender.tab.id, {
                        action: "notifyThread",
                        message: `Thread Started! ${chunks.length} parts created. Part 1 opened. Part 2 copied to clipboard.`
                    });
                    // Actually copy part 2
                    browser.scripting.executeScript({
                        target: { tabId: sender.tab.id },
                        func: (t) => navigator.clipboard.writeText(t),
                        args: [chunks[1].text]
                    });
                    return false;
                }
            }
            const shareUrl = platforms[pureId](title, cleanedUrl, text);
            browser.tabs.create({ url: shareUrl });
        }
        return false;
    }
});

function chunkText(quote, platformId, title, url) {
    const config = PLATFORMS_DATA[platformId];
    if (!config || !config.limit) return [{ text: quote }];

    const chunks = [];
    let remaining = quote.trim();
    const urlLen = url ? (config.urlWeight || url.length) : 0;
    let partNum = 1;

    while (remaining.length > 0) {
        const reserved = title.length + (partNum === 1 ? urlLen + 18 : 16);
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
        return i === 0 ? { text: q, meta } : { text: `"${q}" — ${meta}` };
    });
}


// Context Menus
browser.runtime.onInstalled.addListener(() => {
    console.log("[Another Share] Extension installed.");
    try {
        browser.menus.create({ id: "action-copy-quote", title: "Copy selection with link", contexts: ["selection"] });
        browser.menus.create({ id: "action-copy-page", title: "Copy page link", contexts: ["page"] });
        browser.menus.create({ id: "action-share-page", title: "Share...", contexts: ["page", "selection"], icons: { "16": "icons/icon-48.png" } });
    } catch (e) { console.warn("[Another Share] Menu init failed."); }
});

// Menu Clicks
browser.menus.onClicked.addListener(async (info, tab) => {
    const title = tab.title || "Article";
    const url = cleanUrl(tab.url || "");
    const text = info.selectionText || "";

    if (info.menuItemId === "action-copy-quote") {
        const finalText = `"${text.trim()}" — ${title}\n${url}`;
        browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: (t) => navigator.clipboard.writeText(t),
            args: [finalText]
        });
    } else if (info.menuItemId === "action-copy-page") {
        const finalText = `${title}\n${url}`;
        browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: (t) => navigator.clipboard.writeText(t),
            args: [finalText]
        });
    } else if (info.menuItemId === "action-share-page") {
        browser.tabs.sendMessage(tab.id, {
            action: "triggerShareSheet",
            title: title,
            url: url,
            text: text
        });
    }
});
