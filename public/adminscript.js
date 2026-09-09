document.addEventListener('DOMContentLoaded', () => {
    const adminName = document.getElementById('adminName');
    const logoutBtn = document.getElementById('logoutBtn');
    const uploadForm = document.getElementById('uploadForm');
    const adminModsGrid = document.getElementById('adminModsGrid');

    const currentAdmin = localStorage.getItem('current_admin');
    if (!currentAdmin) {
        window.location.href = 'index.html';
        return;
    }
    if (adminName) adminName.textContent = currentAdmin;

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('current_admin');
            localStorage.removeItem('current_role');
            window.location.href = 'index.html';
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                title: document.getElementById('title').value,
                author: document.getElementById('author').value,
                platform: document.getElementById('platform').value,
                version: document.getElementById('version').value,
                description: document.getElementById('description').value,
                mainFileId: document.getElementById('mainFileId').value.trim(),
                extraFileId: document.getElementById('extraFileId').value.trim() || null
            };

            try {
                const res = await fetch('/api/mods/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    alert('Мод успешно добавлен!');
                    uploadForm.reset();
                    loadAdminMods();
                } else {
                    alert(data.message || 'Ошибка сохранения');
                }
            } catch (err) {
                alert('Ошибка соединения с сервером');
            }
        });
    }

    async function loadAdminMods() {
        if (!adminModsGrid) return;
        try {
            const res = await fetch('/api/mods');
            const mods = await res.json();

            if (mods.length === 0) {
                adminModsGrid.innerHTML = '<p style="color: var(--md-sys-color-outline);">Нет опубликованных модов.</p>';
                return;
            }

            adminModsGrid.innerHTML = '';
            mods.forEach(mod => {
                const item = document.createElement('div');
                item.style.cssText = 'background: var(--md-sys-color-surface); padding: 12px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--md-sys-color-outline);';
                
                item.innerHTML = `
                    <div>
                        <strong>${mod.title}</strong> (${mod.version}) — <em>${mod.platform}</em>
                        <div style="font-size: 0.8rem; color: var(--md-sys-color-outline);">
                            file_id: ${mod.mainFileId ? 'Основной ✅' : 'Нет'} ${mod.extraFileId ? '| Доп. ✅' : ''}
                        </div>
                    </div>
                    <button onclick="deleteMod('${mod.id}')" style="background: none; border: none; color: #ffb4ab; cursor: pointer;">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                `;
                adminModsGrid.appendChild(item);
            });
        } catch (err) {
            adminModsGrid.innerHTML = '<p style="color: red;">Ошибка загрузки списка модов.</p>';
        }
    }

    window.deleteMod = async (id) => {
        if (!confirm('Вы уверены, что хотите удалить этот мод?')) return;
        try {
            await fetch(`/api/mods/${id}`, { method: 'DELETE' });
            loadAdminMods();
        } catch (err) {
            alert('Ошибка при удалении мода');
        }
    };

    loadAdminMods();
});
