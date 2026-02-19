document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('list');
    const clearBtn = document.getElementById('clear-btn');

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
            a.href = item.url;
            a.textContent = item.title || item.url;
            a.target = "_blank";

            const meta = document.createElement('div');
            meta.className = 'item-meta';
            const date = new Date(item.timestamp).toLocaleString();
            meta.textContent = `Added: ${date}`;

            li.appendChild(a);
            li.appendChild(meta);

            // Swipe to remove (simple tap-hold simulation)
            li.onclick = (e) => {
                if (e.target !== a) {
                    window.open(item.url, '_blank');
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
