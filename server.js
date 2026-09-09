const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Ваш токен Telegram-бота
const TELEGRAM_TOKEN = '8879466084:AAEP3qIWz5ZiMySSdAiPHWeMMyttwp-Rj7g';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const MODS_FILE = path.join(__dirname, 'mods.json');

// Вспомогательные функции для работы с базой данных (mods.json)
function getMods() {
    if (!fs.existsSync(MODS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(MODS_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

function saveMods(mods) {
    fs.writeFileSync(MODS_FILE, JSON.stringify(mods, null, 2));
}

// Получить список всех модов
app.get('/api/mods', (req, res) => {
    res.json(getMods());
});

// Добавить мод по file_id
app.post('/api/mods/upload', (req, res) => {
    try {
        const { title, author, platform, version, description, mainFileId, extraFileId } = req.body;

        if (!mainFileId) {
            return res.status(400).json({ success: false, message: 'Укажите file_id основного файла' });
        }

        const newMod = {
            id: Date.now().toString(),
            title: title || 'Без названия',
            author: author || 'Неизвестен',
            platform: platform || 'android',
            version: version || 'v1.0.0',
            description: description || '',
            mainFileId: mainFileId.trim(),
            extraFileId: extraFileId ? extraFileId.trim() : null,
            updatedAt: new Date().toISOString()
        };

        const mods = getMods();
        mods.unshift(newMod);
        saveMods(mods);

        res.json({ success: true, message: 'Мод успешно добавлен!', mod: newMod });
    } catch (err) {
        console.error('Ошибка сохранения мода:', err);
        res.status(500).json({ success: false, message: 'Не удалось сохранить данные мода' });
    }
});

// Скачивание файла: генерация прямой ссылки через Telegram API
app.get('/api/mods/download/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const fileLink = await bot.getFileLink(fileId);
        res.redirect(fileLink);
    } catch (err) {
        console.error('Ошибка при получении ссылки на файл:', err);
        res.status(404).send('Файл не найден или удалён из Telegram');
    }
});

// Авторизация администратора
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        return res.json({ success: true, username, role: 'admin' });
    }
    res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
});

// Удаление мода
app.delete('/api/mods/:id', (req, res) => {
    let mods = getMods();
    mods = mods.filter(m => m.id !== req.params.id);
    saveMods(mods);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
