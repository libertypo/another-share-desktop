document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('list');
    const clearBtn = document.getElementById('clear-btn');

    const isSafeListUrl = (url) => {
        if (typeof url !== 'string' || !url) return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const render = (items = []) => {
        listEl.textContent = '';
        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No articles in your list.';
            listEl.appendChild(empty);
            return;
        }

        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'list-item';

            const a = document.createElement('a');
            a.className = 'item-title';
            a.textContent = item.title || item.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            
            if (isSafeListUrl(item.url)) {
                a.href = item.url;
            } else {
                a.style.pointerEvents = 'none';
                a.style.opacity = '0.5';
            }

            const meta = document.createElement('div');
            meta.className = 'item-meta';
            const date = new Date(item.timestamp).toLocaleString();
            meta.textContent = `Added: ${date}`;

            li.appendChild(a);
            li.appendChild(meta);

            // Swipe to remove (simple tap-hold simulation)
            li.onclick = (e) => {
                if (e.target !== a) {
                    if (isSafeListUrl(item.url)) {
                        browser.tabs.create({ url: item.url });
                    }
                }
            };

            listEl.appendChild(li);
        });
    };

    const load = async () => {
        const { readLater = [] } = await browser.storage.local.get('readLater');
        render(readLater);
    };

    clearBtn.addEventListener('click', async () => {
        if (confirm("Clear your reading list?")) {
            await browser.storage.local.set({ readLater: [] });
            load();
        }
    });

    load();
});
