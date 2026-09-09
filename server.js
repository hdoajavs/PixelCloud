const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_TOKEN = '8879466084:AAEP3qIWz5ZiMySSdAiPHWeMMyttwp-Rj7g';

// Включаем polling только для получения file_id от вашего бота
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const MODS_FILE = path.join(__dirname, 'mods.json');

// Когда вы отправляете или пересылаете документ вашему боту — он отвечает готовым file_id
bot.on('document', (msg) => {
    const fileId = msg.document.file_id;
    const fileName = msg.document.file_name || 'Файл';
    bot.sendMessage(
        msg.chat.id, 
        `✅ **Файл получен!**\n\nИмя: \`${fileName}\`\n\nВаш **file_id**:\n\`${fileId}\``, 
        { parse_mode: 'Markdown' }
    );
});

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

app.get('/api/mods', (req, res) => {
    res.json(getMods());
});

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

app.get('/api/mods/download/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const fileLink = await bot.getFileLink(fileId);
        return res.redirect(fileLink);
    } catch (err) {
        console.error('Ошибка при скачивании:', err.message);
        res.status(404).send('Файл не найден. Убедитесь, что file_id был получен через вашего бота.');
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        return res.json({ success: true, username, role: 'admin' });
    }
    res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
});

app.delete('/api/mods/:id', (req, res) => {
    let mods = getMods();
    mods = mods.filter(m => m.id !== req.params.id);
    saveMods(mods);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
