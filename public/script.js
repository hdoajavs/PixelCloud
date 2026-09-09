document.addEventListener('DOMContentLoaded', () => {
    const modsGrid = document.getElementById('modsGrid');

    async function loadMods() {
        if (!modsGrid) return;
        try {
            const res = await fetch('/api/mods');
            const mods = await res.json();

            if (mods.length === 0) {
                modsGrid.innerHTML = '<p style="text-align: center; color: var(--md-sys-color-outline);">Моды пока не добавлены.</p>';
                return;
            }

            modsGrid.innerHTML = '';
            mods.forEach(mod => {
                const card = document.createElement('div');
                card.className = 'mod-card';
                
                let downloadButtonsHtml = '';
                
                if (mod.mainFileId) {
                    downloadButtonsHtml += `
                        <a href="/api/mods/download/${mod.mainFileId}" class="btn-download" target="_blank">
                            <span class="material-symbols-outlined">download</span> Скачать файл
                        </a>
                    `;
                }

                if (mod.extraFileId) {
                    downloadButtonsHtml += `
                        <a href="/api/mods/download/${mod.extraFileId}" class="btn-download secondary" target="_blank" style="margin-top: 8px;">
                            <span class="material-symbols-outlined">download_for_offline</span> Доп. файл
                        </a>
                    `;
                }

                card.innerHTML = `
                    <div class="mod-header">
                        <h3>${mod.title}</h3>
                        <span class="platform-badge ${mod.platform}">${mod.platform === 'android' ? 'Android' : 'Windows'}</span>
                    </div>
                    <div class="mod-meta">
                        <span>Автор: ${mod.author}</span> • <span>Версия: ${mod.version}</span>
                    </div>
                    <p class="mod-description">${mod.description}</p>
                    <div class="mod-actions">
                        ${downloadButtonsHtml}
                    </div>
                `;
                modsGrid.appendChild(card);
            });
        } catch (err) {
            console.error('Ошибка загрузки модов:', err);
            modsGrid.innerHTML = '<p style="text-align: center; color: red;">Ошибка при загрузке модов.</p>';
        }
    }

    loadMods();
});
