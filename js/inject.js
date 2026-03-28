/**
 * This script runs in the actual page execution context (Main World).
 * This is necessary because Content Scripts run in an "Isolated World"
 * and cannot directly override native APIs like navigator.share.
 */
(function () {
    const createNonce = () => {
        const bytes = new Uint8Array(12);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    };

    const injectedScript = document.currentScript;
    const token = injectedScript && injectedScript.dataset
        ? injectedScript.dataset.asToken
        : '';

    if (navigator.share) {
        const nativeShare = navigator.share.bind(navigator);

        navigator.share = async (data) => {
            if (!token) {
                // Token not available; fall back to page native share behavior.
                return nativeShare(data);
            }

            // Dispatch a custom event for the content script to pick up
            const event = new CustomEvent(token, {
                detail: {
                    title: data.title,
                    text: data.text,
                    url: data.url,
                    ts: Date.now(),
                    nonce: createNonce()
                }
            });

            window.dispatchEvent(event);

            // We return a promise that resolves immediately to prevent the 
            // website from waiting for a system share response.
            return Promise.resolve();
        };

    }
})();
