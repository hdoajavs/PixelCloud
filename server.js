const express = require('express');
const multer = require('multer');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram Bot настройки
const TELEGRAM_TOKEN = '8879466084:AAEP3qIWz5ZiMySSdAiPHWeMMyttwp-Rj7g';
const CHAT_ID = '-1004466001128';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Временное хранилище перед отправкой в Telegram
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// База данных модов (JSON)
const MODS_FILE = path.join(__dirname, 'mods.json');
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

// 1. Получение всех модов
app.get('/api/mods', (req, res) => {
    res.json(getMods());
});

// 2. Публикация мода (Загрузка в Telegram)
app.post('/api/mods/upload', upload.fields([
    { name: 'modFile', maxCount: 1 },
    { name: 'extraFile', maxCount: 1 }
]), async (req, res) => {
    try {
        const { title, author, platform, version, description } = req.body;
        const files = req.files;

        let mainFileId = null;
        let mainFileName = null;
        let extraFileId = null;
        let extraFileName = null;

        // Основной файл
        if (files && files['modFile'] && files['modFile'][0]) {
            const file = files['modFile'][0];
            const msg = await bot.sendDocument(CHAT_ID, file.path, {}, {
                filename: file.originalname,
                contentType: file.mimetype
            });
            mainFileId = msg.document.file_id;
            mainFileName = file.originalname;
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }

        // Дополнительный файл (драйвер / 32-бит)
        if (files && files['extraFile'] && files['extraFile'][0]) {
            const file = files['extraFile'][0];
            const msg = await bot.sendDocument(CHAT_ID, file.path, {}, {
                filename: file.originalname,
                contentType: file.mimetype
            });
            extraFileId = msg.document.file_id;
            extraFileName = file.originalname;
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }

        const newMod = {
            id: Date.now().toString(),
            title: title || 'Без названия',
            author: author || 'Неизвестен',
            platform: platform || 'android',
            version: version || 'v1.0.0',
            description: description || '',
            mainFileId,
            mainFileName,
            extraFileId,
            extraFileName,
            updatedAt: new Date().toISOString()
        };

        const mods = getMods();
        mods.unshift(newMod);
        saveMods(mods);

        res.json({ success: true, message: 'Мод успешно загружен!', mod: newMod });
    } catch (err) {
        console.error('Ошибка загрузки в Telegram:', err);
        res.status(500).json({ success: false, message: 'Не удалось загрузить файл через Telegram' });
    }
});

// 3. Перенаправление на скачивание свежей ссылки Telegram
app.get('/api/mods/download/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const fileLink = await bot.getFileLink(fileId);
        res.redirect(fileLink);
    } catch (err) {
        console.error('Ошибка скачивания:', err);
        res.status(404).send('Файл не найден или был удален из Telegram');
    }
});

// 4. Логин админа
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        return res.json({ success: true, username, role: 'admin' });
    }
    res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
});

// 5. Удаление мода
app.delete('/api/mods/:id', (req, res) => {
    let mods = getMods();
    mods = mods.filter(m => m.id !== req.params.id);
    saveMods(mods);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
