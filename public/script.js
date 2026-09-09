document.addEventListener('DOMContentLoaded', () => {
    let allMods = [];
    let currentPlatform = 'android';

    const publicModsGrid = document.getElementById('publicModsGrid');
    const authModal = document.getElementById('authModal');
    const openAuthBtn = document.getElementById('openAuthBtn');
    const closeAuthBtn = document.getElementById('closeAuthBtn');
    const loginForm = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');
    const segmentedBtns = document.querySelectorAll('.segmented-btn');

    // 1. Модальное окно
    if (openAuthBtn && authModal) {
        openAuthBtn.addEventListener('click', () => {
            authModal.style.display = 'block';
        });
    }

    if (closeAuthBtn && authModal) {
        closeAuthBtn.addEventListener('click', () => {
            authModal.style.display = 'none';
            if (errorMsg) errorMsg.style.display = 'none';
        });
    }

    // 2. Логин
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
                alert('Ошибка подключения к серверу');
            }
        });
    }

    // 3. Загрузка модов
    async function loadPublicMods() {
        if (!publicModsGrid) return;
        try {
            const res = await fetch('/api/mods');
            allMods = await res.json();
            renderMods();
        } catch (err) {
            publicModsGrid.innerHTML = '<p style="color: var(--md-sys-color-outline); text-align: center;">Не удалось загрузить моды.</p>';
        }
    }

    // 4. Отрисовка карточек
    function renderMods() {
        if (!publicModsGrid) return;
        publicModsGrid.innerHTML = '';

        const filteredMods = allMods.filter(mod => mod.platform === currentPlatform);

        if (filteredMods.length === 0) {
            publicModsGrid.innerHTML = '<p style="color: var(--md-sys-color-outline); text-align: center; grid-column: 1/-1;">Моды для этой платформы не найдены.</p>';
            return;
        }

        filteredMods.forEach(mod => {
            const card = document.createElement('article');
            card.className = 'mod-card';

            let downloadBtnsHTML = '<div style="display: flex; gap: 8px; flex-wrap: wrap; width: 100%; margin-top: 12px;">';

            if (mod.mainFileId) {
                downloadBtnsHTML += `
                    <a href="/api/mods/download/${mod.mainFileId}" class="btn-download" style="text-decoration: none; flex: 1; justify-content: center;">
                        <span class="material-symbols-outlined">download</span> Скачать
                    </a>
                `;
            }

            if (mod.extraFileId) {
                downloadBtnsHTML += `
                    <a href="/api/mods/download/${mod.extraFileId}" class="btn-download" style="text-decoration: none; flex: 1; justify-content: center; background: #334455;">
                        <span class="material-symbols-outlined">extension</span> Доп. файл
                    </a>
                `;
            }

            downloadBtnsHTML += '</div>';

            card.innerHTML = `
                <div class="mod-header">
                    <h3>${mod.title}</h3>
                    <span class="mod-author">от ${mod.author}</span>
                </div>
                <p class="mod-description">${mod.description}</p>
                <div class="mod-footer">
                    <span class="mod-badge">${mod.version}</span>
                    ${downloadBtnsHTML}
                </div>
            `;
            publicModsGrid.appendChild(card);
        });
    }

    // 5. Переключение платформ
    segmentedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            segmentedBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const platform = btn.getAttribute('data-platform');
            currentPlatform = platform === 'pc' ? 'windows' : platform;
            renderMods();
        });
    });

    loadPublicMods();
});
