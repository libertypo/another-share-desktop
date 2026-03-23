/**
 * This script runs in the actual page execution context (Main World).
 * This is necessary because Content Scripts run in an "Isolated World"
 * and cannot directly override native APIs like navigator.share.
 */
(function () {
    if (navigator.share) {
        const nativeShare = navigator.share.bind(navigator);

        navigator.share = async (data) => {
            // Retrieve the token from window to prevent spoofing by hostile scripts
            const token = window.__ANOTHER_SHARE_TOKEN__;
            if (!token) {
                // Token not set by content script; reject the intercept
                console.warn("Another Share Extension: Token validation failed. Rejecting share intercept.");
                return Promise.resolve();
            }

            // Dispatch a custom event for the content script to pick up
            const event = new CustomEvent(token, {
                detail: {
                    title: data.title,
                    text: data.text,
                    url: data.url
                }
            });

            window.dispatchEvent(event);

            // We return a promise that resolves immediately to prevent the 
            // website from waiting for a system share response.
            return Promise.resolve();
        };

        console.log("Another Share Extension: navigator.share intercepted.");
    }
})();
