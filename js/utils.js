(function (global) {
    const TRACKING_PARAMS = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'mc_cid', 'mc_eid',
        '_ga', '_gl', 'yclid', 'ref', 'source', 'original_referrer'
    ];

    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    function isObject(value) {
        return typeof value === 'object' && value !== null;
    }

    function sanitizeText(value, maxLength = 4000) {
        if (typeof value !== 'string') return '';
        return value.trim().slice(0, maxLength);
    }

    function sanitizeTitle(value, maxLength = 400) {
        return sanitizeText(value, maxLength);
    }

    function normalizeTrackedUrl(urlStr) {
        if (typeof urlStr !== 'string' || !urlStr.trim()) return '';
        if (urlStr.startsWith('file://')) return '';

        try {
            const url = new URL(urlStr);
            TRACKING_PARAMS.forEach((param) => {
                if (url.searchParams.has(param)) {
                    url.searchParams.delete(param);
                }
            });
            return url.toString();
        } catch (error) {
            return urlStr;
        }
    }

    function isAllowedHttpUrl(url) {
        if (typeof url !== 'string' || !url.trim()) return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (error) {
            return false;
        }
    }

    function isRestrictedUrl(url) {
        if (!url) return true;
        const restricted = ['about:', 'moz-extension:', 'view-source:', 'resource:', 'chrome:', 'jar:', 'data:'];
        if (restricted.some((protocol) => url.startsWith(protocol))) return true;
        if (url.includes('addons.mozilla.org')) return true;
        return false;
    }

    function sanitizeStorageItem(item) {
        if (!isObject(item)) return null;

        const title = sanitizeTitle(item.title, 400);
        const url = sanitizeText(item.url, 2048);
        const timestamp = Number.isFinite(item.timestamp) ? item.timestamp : Date.now();

        if (!isAllowedHttpUrl(url)) return null;

        return { title, url, timestamp };
    }

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let index = 0; index < bytes.length; index += 1) {
            binary += String.fromCharCode(bytes[index]);
        }
        return btoa(binary);
    }

    function base64ToUint8Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
    }

    async function deriveKey(passphrase, salt) {
        const cryptoApi = global.crypto || global.msCrypto;
        if (!cryptoApi || !cryptoApi.subtle) {
            throw new Error('Web Crypto API is unavailable in this environment.');
        }

        const baseKey = await cryptoApi.subtle.importKey(
            'raw',
            textEncoder.encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return cryptoApi.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async function encryptStoredData(payload, passphrase) {
        if (typeof passphrase !== 'string' || !passphrase.trim()) {
            return payload;
        }

        const cryptoApi = global.crypto || global.msCrypto;
        if (!cryptoApi || !cryptoApi.subtle) {
            throw new Error('Web Crypto API is unavailable in this environment.');
        }

        const salt = cryptoApi.getRandomValues(new Uint8Array(16));
        const iv = cryptoApi.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(passphrase, salt);
        const encoded = textEncoder.encode(JSON.stringify(payload));
        const cipher = await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

        return {
            encrypted: true,
            payload: {
                salt: arrayBufferToBase64(salt),
                iv: arrayBufferToBase64(iv),
                data: arrayBufferToBase64(cipher)
            }
        };
    }

    async function decryptStoredData(storedValue, passphrase) {
        if (!storedValue || !storedValue.encrypted || !storedValue.payload) {
            return Array.isArray(storedValue) ? storedValue : null;
        }

        if (typeof passphrase !== 'string' || !passphrase.trim()) {
            return null;
        }

        try {
            const cryptoApi = global.crypto || global.msCrypto;
            if (!cryptoApi || !cryptoApi.subtle) {
                throw new Error('Web Crypto API is unavailable in this environment.');
            }

            const salt = base64ToUint8Array(storedValue.payload.salt || '');
            const iv = base64ToUint8Array(storedValue.payload.iv || '');
            const data = base64ToUint8Array(storedValue.payload.data || '');
            const key = await deriveKey(passphrase, salt);
            const decrypted = await cryptoApi.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
            const parsed = JSON.parse(textDecoder.decode(decrypted));
            return Array.isArray(parsed) ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    const ExtensionUtils = {
        TRACKING_PARAMS,
        sanitizeText,
        sanitizeTitle,
        normalizeTrackedUrl,
        isAllowedHttpUrl,
        isRestrictedUrl,
        sanitizeStorageItem,
        encryptStoredData,
        decryptStoredData
    };

    Object.freeze(ExtensionUtils);
    global.ExtensionUtils = ExtensionUtils;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ExtensionUtils;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
