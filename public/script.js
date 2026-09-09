// Вспомогательная функция для форматирования даты
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

// Глобальный массив для хранения загруженных с сервера модов
let allMods = [];

// 1. Загрузка модов с бэкенда
async function loadPublicMods() {
    const grid = document.getElementById('modsGrid');
    if (!grid) return;

    try {
        const res = await fetch('/api/mods');
        if (!res.ok) throw new Error('Ошибка сервера при получении модов');

        allMods = await res.json();
        renderMods(allMods);
    } catch (err) {
        console.error('Ошибка загрузки модов:', err);
        grid.innerHTML = '<p style="color: var(--md-sys-color-outline); grid-column: 1/-1; text-align: center;">Не удалось загрузить моды. Проверьте подключение к серверу.</p>';
    }
}

// 2. Отрисовка карточек модов
function renderMods(modsToRender) {
    const grid = document.getElementById('modsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (modsToRender.length === 0) {
        grid.innerHTML = '<p style="color: var(--md-sys-color-outline); grid-column: 1/-1; text-align: center;">Моды не найдены.</p>';
        return;
    }

    modsToRender.forEach(mod => {
        const card = document.createElement('article');
        card.className = 'mod-card';

        const downloadBtnHTML = mod.filePath
            ? `<a href="${mod.filePath}" download class="btn-download" style="text-decoration: none;" title="Скачать .exe">
                    <span class="material-symbols-outlined">download</span>
                    <span>Скачать</span>
               </a>`
            : `<button class="btn-download" disabled style="opacity: 0.5; cursor: not-allowed;" title="Файл отсутствует">
                    <span class="material-symbols-outlined">file_off</span>
                    <span>Нет файла</span>
               </button>`;

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
                ${downloadBtnHTML}
            </div>
        `;
        grid.appendChild(card);
    });
}

// 3. Поиск и Фильтрация модов
const searchInput = document.getElementById('searchInput');
const filterSelect = document.getElementById('platformFilter');

function filterMods() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const platform = filterSelect ? filterSelect.value : 'all';

    const filtered = allMods.filter(mod => {
        const matchesSearch = mod.title.toLowerCase().includes(query) || 
                              mod.author.toLowerCase().includes(query) ||
                              mod.description.toLowerCase().includes(query);

        const matchesPlatform = platform === 'all' || mod.platform === platform;

        return matchesSearch && matchesPlatform;
    });

    renderMods(filtered);
}

if (searchInput) searchInput.addEventListener('input', filterMods);
if (filterSelect) filterSelect.addEventListener('change', filterMods);

// 4. Логика формы входа в Админ-панель (Модальное окно на главной)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById('loginUser').value.trim();
        const passwordInput = document.getElementById('loginPass').value.trim();

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput, password: passwordInput })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Сохраняем имя и роль вошедшего администратора
                localStorage.setItem('current_admin', data.username);
                localStorage.setItem('current_role', data.role);
                window.location.href = 'admin.html';
            } else {
                alert(data.message || 'Неверный логин или пароль!');
            }
        } catch (err) {
            console.error('Ошибка авторизации:', err);
            alert('Ошибка подключения к серверу');
        }
    });
}

// Инициализация загрузки при старте страницы
loadPublicMods();

