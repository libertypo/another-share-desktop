document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const storageKey = params.get('key');
    const keyPattern = /^print_capture_\d{13}_[a-z0-9]{6,24}$/;

    const isValidPrintKey = (key) => {
        if (typeof key !== 'string' || !keyPattern.test(key)) return false;
        const parts = key.split('_');
        const ts = Number(parts[2]);
        if (!Number.isFinite(ts)) return false;
        const ageMs = Date.now() - ts;
        return ageMs >= 0 && ageMs <= 300000;
    };

    if (storageKey && isValidPrintKey(storageKey)) {
        try {
            const data = await browser.storage.local.get(storageKey);
            const img = document.getElementById('print-image');

            if (data && data[storageKey]) {
                img.src = data[storageKey];

                const triggerPrint = () => {
                    window.focus();
                    window.print();
                };

                if (img.complete) {
                    setTimeout(triggerPrint, 500);
                } else {
                    img.onload = () => setTimeout(triggerPrint, 500);
                }

                // Cleanup storage after a delay
                setTimeout(() => {
                    browser.storage.local.remove(storageKey);
                }, 10000);
            } else {
                const h3 = document.createElement('h3');
                h3.textContent = "Error: No image data found.";
                document.body.appendChild(h3);
            }
        } catch (err) {
            const h3 = document.createElement('h3');
            h3.textContent = "Error: Could not load print data.";
            document.body.appendChild(h3);
        }
    } else {
        const h3 = document.createElement('h3');
        h3.textContent = "Error: Invalid or expired print key.";
        document.body.appendChild(h3);
    }
});
