const currentAdmin = localStorage.getItem('current_admin') || 'GlitchElite';
const currentRole = localStorage.getItem('current_role') || 'Главный Администратор';

const adminNameEl = document.getElementById('currentAdminName');
if (adminNameEl) {
    adminNameEl.textContent = `${currentAdmin} (${currentRole})`;
}

async function sendServerLog(actionText) {
    try {
        await fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: actionText })
        });
        loadLogs();
    } catch (err) {
        console.error('Ошибка записи лога:', err);
    }
}

async function loadLogs() {
    const logsList = document.getElementById('logsList');
    if (!logsList) return;

    try {
        const res = await fetch('/api/logs');
        const logs = await res.json();

        logsList.innerHTML = '';
        if (logs.length === 0) {
            logsList.innerHTML = '<li class="log-item">Логи отсутствуют</li>';
            return;
        }

        logs.forEach(log => {
            const li = document.createElement('li');
            li.className = 'log-item';
            li.innerHTML = `<span>${log.action}</span><span class="log-time">${log.time}</span>`;
            logsList.appendChild(li);
        });
    } catch (err) {
        console.error('Ошибка загрузки логов:', err);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Дата не указана';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function loadAdminMods() {
    const grid = document.getElementById('adminModsGrid');
    const countBadge = document.getElementById('modsCount');
    if (!grid) return;

    try {
        const res = await fetch('/api/mods');
        const mods = await res.json();

        grid.innerHTML = '';
        if (countBadge) countBadge.textContent = `${mods.length} модов`;

        if (mods.length === 0) {
            grid.innerHTML = '<p style="color: var(--md-sys-color-outline);">Нет опубликованных модов.</p>';
            return;
        }

        mods.forEach(mod => {
            const card = document.createElement('article');
            card.className = 'mod-card';

            const downloadBtnHTML = mod.filePath
                ? `<a href="${mod.filePath}" download class="btn-download" style="text-decoration: none;" title="Скачать">
                        <span class="material-symbols-outlined">download</span>
                   </a>`
                : '';

            const deleteBtnHTML = currentRole !== 'Раб'
                ? `<button type="button" class="btn-danger" onclick="deleteMod(${mod.id}, '${mod.title.replace(/'/g, "\\'")}')" title="Удалить">
                        <span class="material-symbols-outlined">delete</span>
                   </button>`
                : '';

            const fileLabel = mod.fileName ? mod.fileName : 'Файл не прикреплен (.exe)';
            const formattedDate = formatDate(mod.updatedAt);

            card.innerHTML = `
                <div class="mod-header">
                    <div class="mod-icon-wrapper">
                        <span class="material-symbols-outlined">${mod.platform === 'android' ? 'android' : 'desktop_windows'}</span>
                    </div>
                    <div>
                        <h2 class="mod-title">${mod.title}</h2>
                        <span class="mod-author">от ${mod.author}</span>
                    </div>
                </div>
                <p class="mod-description">${mod.description}</p>
                <div style="margin-bottom: 8px; font-size: 0.85rem; color: ${mod.fileName ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)'}; display: flex; align-items: center; gap: 6px;">
                    <span class="material-symbols-outlined" style="font-size: 18px;">${mod.fileName ? 'attach_file' : 'file_off'}</span>
                    <span>${fileLabel}</span>
                </div>
                <div style="margin-bottom: 12px; font-size: 0.8rem; color: var(--md-sys-color-outline); display: flex; align-items: center; gap: 4px;">
                    <span class="material-symbols-outlined" style="font-size: 16px;">schedule</span>
                    <span>Обновлено: ${formattedDate}</span>
                </div>
                <div class="mod-footer">
                    <span class="mod-badge">${mod.version} (${mod.platform.toUpperCase()})</span>
                    <div style="display: flex; gap: 8px;">
                        ${downloadBtnHTML}
                        <button type="button" class="btn-download" onclick="openEditModal(${mod.id})" title="Редактировать">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        ${deleteBtnHTML}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Ошибка загрузки модов:', err);
    }
}

// Создание нового админа
const addAdminForm = document.getElementById('addAdminForm');
if (addAdminForm) {
    if (currentRole === 'Модератор' || currentRole === 'Раб') {
        addAdminForm.style.display = 'none';
    }

    addAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('newAdminUser').value.trim();
        const password = document.getElementById('newAdminPass').value.trim();
        const roleSelect = document.getElementById('newAdminRole');
        const role = roleSelect ? roleSelect.value : 'Раб';

        if (currentRole === 'Администратор' && role === 'Главный Администратор') {
            alert('Вы не можете создавать Главных Администраторов!');
            return;
        }

        try {
            const res = await fetch('/api/auth/admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creatorRole: currentRole, username, password, role })
            });

            const data = await res.json();
            if (res.ok) {
                await sendServerLog(`Админ "${currentAdmin}" (${currentRole}) создал аккаунт "${username}" с ролью "${role}"`);
                alert(`Пользователь ${username} (${role}) создан!`);
                addAdminForm.reset();
            } else {
                alert(data.error || 'Ошибка при создании');
            }
        } catch (err) {
            alert('Ошибка сервера');
        }
    });
}

// Публикация мода
const addModForm = document.getElementById('addModForm');
if (addModForm) {
    addModForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('title', document.getElementById('modTitle').value.trim());
        formData.append('author', document.getElementById('modAuthor').value.trim());
        formData.append('platform', document.getElementById('modPlatform').value);
        formData.append('version', document.getElementById('modVersion').value.trim());
        formData.append('description', document.getElementById('modDesc').value.trim());

        const fileInput = document.getElementById('modFile');
        if (fileInput && fileInput.files[0]) {
            formData.append('file', fileInput.files[0]);
        }

        try {
            const res = await fetch('/api/mods', { method: 'POST', body: formData });
            if (res.ok) {
                const title = document.getElementById('modTitle').value.trim();
                await sendServerLog(`[${currentRole}] "${currentAdmin}" опубликовал мод "${title}"`);
                addModForm.reset();
                loadAdminMods();
            }
        } catch (err) {
            console.error('Ошибка публикации:', err);
        }
    });
}

const editModal = document.getElementById('editModal');
const closeEditBtn = document.getElementById('closeEditBtn');

window.openEditModal = async function(id) {
    try {
        const res = await fetch('/api/mods');
        const mods = await res.json();
        const mod = mods.find(m => m.id === id);

        if (!mod || !editModal) return;

        document.getElementById('editModId').value = mod.id;
        const targetTitleEl = document.getElementById('editModalTargetTitle');
        if (targetTitleEl) targetTitleEl.textContent = mod.title;

        document.getElementById('editModTitle').value = mod.title;
        document.getElementById('editModAuthor').value = mod.author;
        document.getElementById('editModPlatform').value = mod.platform;
        document.getElementById('editModVersion').value = mod.version;
        document.getElementById('editModDesc').value = mod.description;

        editModal.dataset.oldTitle = mod.title;
        editModal.classList.add('active');
    } catch (err) {
        console.error('Ошибка подготовки редактирования:', err);
    }
};

if (closeEditBtn) {
    closeEditBtn.addEventListener('click', () => editModal.classList.remove('active'));
}

const editModForm = document.getElementById('editModForm');
if (editModForm) {
    editModForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editModId').value;
        const newTitle = document.getElementById('editModTitle').value.trim();

        const formData = new FormData();
        formData.append('title', newTitle);
        formData.append('author', document.getElementById('editModAuthor').value.trim());
        formData.append('platform', document.getElementById('editModPlatform').value);
        formData.append('version', document.getElementById('editModVersion').value.trim());
        formData.append('description', document.getElementById('editModDesc').value.trim());

        const fileInput = document.getElementById('editModFile');
        if (fileInput && fileInput.files[0]) {
            formData.append('file', fileInput.files[0]);
        }

        try {
            const res = await fetch(`/api/mods/${id}`, { method: 'PUT', body: formData });
            if (res.ok) {
                await sendServerLog(`[${currentRole}] "${currentAdmin}" обновил мод "${newTitle}"`);
                if (editModal) editModal.classList.remove('active');
                loadAdminMods();
            }
        } catch (err) {
            console.error('Ошибка сохранения:', err);
        }
    });
}

// Удаление мода
window.deleteMod = async function(id, title) {
    if (currentRole === 'Раб') {
        alert('У вас нет прав на удаление модов!');
        return;
    }

    if (!confirm(`Вы действительно хотите удалить мод "${title}"?`)) return;

    try {
        const res = await fetch(`/api/mods/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userRole: currentRole })
        });

        if (res.ok) {
            await sendServerLog(`[${currentRole}] "${currentAdmin}" удалил мод "${title}"`);
            loadAdminMods();
        } else {
            const data = await res.json();
            alert(data.error || 'Ошибка удаления');
        }
    } catch (err) {
        console.error('Ошибка удаления:', err);
    }
};

// Очистка логов
const clearLogsBtn = document.getElementById('clearLogsBtn');
if (clearLogsBtn) {
    if (currentRole === 'Раб') {
        clearLogsBtn.style.display = 'none';
    }

    clearLogsBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/logs', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userRole: currentRole })
            });
            if (res.ok) loadLogs();
        } catch (err) {
            console.error('Ошибка очистки логов:', err);
        }
    });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await sendServerLog(`[${currentRole}] "${currentAdmin}" вышел из системы`);
        localStorage.removeItem('current_admin');
        localStorage.removeItem('current_role');
        window.location.href = 'index.html';
    });
}

loadAdminMods();
loadLogs();

