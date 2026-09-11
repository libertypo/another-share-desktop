document.addEventListener('DOMContentLoaded', async () => {
    const listEl = document.getElementById('list');
    const clearBtn = document.getElementById('clear-btn');
    const passphraseInput = document.getElementById('passphrase');
    const unlockBtn = document.getElementById('unlock-btn');
    const lockBtn = document.getElementById('lock-btn');
    const statusEl = document.getElementById('status');

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

        items.forEach((item) => {
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

            li.onclick = (e) => {
                if (e.target !== a && isSafeListUrl(item.url)) {
                    browser.tabs.create({ url: item.url });
                }
            };

            listEl.appendChild(li);
        });
    };

    const setPassphrase = async (passphrase) => {
        const trimmed = typeof passphrase === 'string' ? passphrase.trim() : '';
        if (trimmed) {
            await browser.runtime.sendMessage({ action: 'setReadLaterPassphrase', passphrase: trimmed });
            statusEl.textContent = 'Passphrase set for this session.';
        } else {
            await browser.runtime.sendMessage({ action: 'clearReadLaterPassphrase' });
            statusEl.textContent = 'Passphrase removed.';
        }
    };

    const load = async () => {
        const { readLater = [] } = await browser.storage.local.get('readLater');
        let items = Array.isArray(readLater) ? readLater : [];

        if (readLater && readLater.encrypted === true && readLater.payload) {
            const passphrase = passphraseInput.value.trim();
            if (!passphrase) {
                statusEl.textContent = 'This list is encrypted. Enter the passphrase to unlock it.';
                render([]);
                return;
            }

            const decrypted = await ExtensionUtils.decryptStoredData(readLater, passphrase);
            if (!Array.isArray(decrypted)) {
                statusEl.textContent = 'Incorrect passphrase. Try again.';
                render([]);
                return;
            }

            items = decrypted;
            statusEl.textContent = 'List unlocked.';
        }

        render(items);
    };

    unlockBtn.addEventListener('click', async () => {
        await setPassphrase(passphraseInput.value);
        await load();
    });

    lockBtn.addEventListener('click', async () => {
        passphraseInput.value = '';
        await setPassphrase('');
        await load();
    });

    clearBtn.addEventListener('click', async () => {
        if (confirm("Clear your reading list?")) {
            await browser.runtime.sendMessage({ action: 'clearReadLaterPassphrase' });
            await browser.storage.local.set({ readLater: [] });
            await load();
        }
    });

    await load();
});

