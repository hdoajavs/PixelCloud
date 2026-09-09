function formatDate(dateString) {
    if (!dateString) return 'Дата не указана';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

let allMods = [];
let currentPlatform = 'android';

// 1. Загрузка списка модов
async function loadPublicMods() {
    const grid = document.getElementById('publicModsGrid');
    if (!grid) return;

    try {
        const res = await fetch('/api/mods');
        if (!res.ok) throw new Error('Ошибка сервера');

        allMods = await res.json();
        renderMods();
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        grid.innerHTML = '<p style="color: var(--md-sys-color-outline); grid-column: 1/-1; text-align: center;">Не удалось загрузить моды.</p>';
    }
}

// 2. Отрисовка модов на главной
function renderMods() {
    const grid = document.getElementById('publicModsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const filteredMods = allMods.filter(mod => mod.platform === currentPlatform);

    if (filteredMods.length === 0) {
        grid.innerHTML = '<p style="color: var(--md-sys-color-outline); grid-column: 1/-1; text-align: center;">Моды для этой платформы не найдены.</p>';
        return;
    }

    filteredMods.forEach(mod => {
        const card = document.createElement('article');
        card.className = 'mod-card';

        // Генерация кнопок скачивания (Основной + Дополнительный)
        let downloadBtnsHTML = '<div style="display: flex; gap: 8px; flex-wrap: wrap; width: 100%; margin-top: 8px;">';

        if (mod.mainFileId) {
            downloadBtnsHTML += `
                <a href="/api/mods/download/${mod.mainFileId}" class="btn-download" style="text-decoration: none; flex: 1; justify-content: center;" title="${mod.mainFileName || 'Основной файл'}">
                    <span class="material-symbols-outlined">download</span>
                    <span>${mod.extraFileId ? 'Основной' : 'Скачать'}</span>
                </a>
            `;
        }

        if (mod.extraFileId) {
            downloadBtnsHTML += `
                <a href="/api/mods/download/${mod.extraFileId}" class="btn-download" style="text-decoration: none; flex: 1; justify-content: center; background: var(--md-sys-color-secondary-container, #334455);" title="${mod.extraFileName || 'Доп. файл'}">
                    <span class="material-symbols-outlined">extension</span>
                    <span>Доп. файл</span>
                </a>
            `;
        }

        if (!mod.mainFileId && !mod.extraFileId) {
            downloadBtnsHTML += `
                <button class="btn-download" disabled style="opacity: 0.5; cursor: not-allowed; width: 100%; justify-content: center;">
                    <span class="material-symbols-outlined">file_off</span>
                    <span>Нет файлов</span>
                </button>
            `;
        }
        downloadBtnsHTML += '</div>';

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
            <div style="margin-bottom: 8px; font-size: 0.8rem; color: var(--md-sys-color-outline); display: flex; align-items: center; gap: 4px;">
                <span class="material-symbols-outlined" style="font-size: 16px;">schedule</span>
                <span>Обновлено: ${formattedDate}</span>
            </div>
            <div class="mod-footer" style="flex-direction: column; align-items: flex-start;">
                <span class="mod-badge">${mod.version} (${mod.platform.toUpperCase()})</span>
                ${downloadBtnsHTML}
            </div>
        `;
        grid.appendChild(card);
    });
}

// 3. Переключатель платформ
const segmentedBtns = document.querySelectorAll('.segmented-btn');
segmentedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        segmentedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const platform = btn.getAttribute('data-platform');
        currentPlatform = platform === 'pc' ? 'windows' : platform;
        renderMods();
    });
});

// 4. Модалка входа
const authModal = document.getElementById('authModal');
const openAuthBtn = document.getElementById('openAuthBtn');
const closeAuthBtn = document.getElementById('closeAuthBtn');
const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

if (openAuthBtn && authModal) {
    openAuthBtn.addEventListener('click', () => authModal.classList.add('active'));
}

if (closeAuthBtn && authModal) {
    closeAuthBtn.addEventListener('click', () => {
        authModal.classList.remove('active');
        if (errorMsg) errorMsg.style.display = 'none';
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value.trim();

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput, password: passwordInput })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                localStorage.setItem('current_admin', data.username);
                localStorage.setItem('current_role', data.role);
                window.location.href = 'admin.html';
            } else {
                if (errorMsg) {
                    errorMsg.textContent = data.message || 'Неверный логин или пароль';
                    errorMsg.style.display = 'block';
                }
            }
        } catch (err) {
            console.error('Ошибка авторизации:', err);
            alert('Ошибка подключения к серверу');
        }
    });
}

loadPublicMods();
