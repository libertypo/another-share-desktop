document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const storageKey = params.get('key');
    console.log("Print page loaded, key:", storageKey);

    if (storageKey) {
        try {
            const data = await browser.storage.local.get(storageKey);
            const img = document.getElementById('print-image');

            if (data && data[storageKey]) {
                console.log("Data found in storage, setting image src");
                img.src = data[storageKey];

                const triggerPrint = () => {
                    console.log("Triggering print dialog...");
                    window.focus();
                    window.print();
                };

                if (img.complete) {
                    console.log("Image already complete");
                    setTimeout(triggerPrint, 500);
                } else {
                    console.log("Waiting for image onload");
                    img.onload = () => setTimeout(triggerPrint, 500);
                }

                // Cleanup storage after a delay
                setTimeout(() => {
                    browser.storage.local.remove(storageKey);
                }, 10000);
            } else {
                console.error("No data found for key:", storageKey);
                const h3 = document.createElement('h3');
                h3.textContent = "Error: No image data found.";
                document.body.appendChild(h3);
            }
        } catch (err) {
            console.error("Storage error:", err);
        }
    } else {
        console.error("No storage key provided in URL");
    }
});
