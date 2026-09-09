const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_TOKEN = '8879466084:AAEP3qIWz5ZiMySSdAiPHWeMMyttwp-Rj7g';

// Запускаем бота без постоянного polling, чтобы Render его не «убивал»
const bot = new TelegramBot(TELEGRAM_TOKEN);

// Включаем прием сообщений от Telegram через Webhook/polling локально
bot.startPolling().catch(err => console.log('Polling error:', err.message));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const MODS_FILE = path.join(__dirname, 'mods.json');

// Обработка отправки файла боту в ЛС
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    
    // Если прислали документ/файл или APK
    if (msg.document) {
        const fileId = msg.document.file_id;
        const fileName = msg.document.file_name || 'Файл';
        
        bot.sendMessage(chatId, `✅ **Файл получен!**\n\nИмя: \`${fileName}\`\n\nСкопируйте ваш **file_id**:\n\`${fileId}\``, {
            parse_mode: 'Markdown'
        });
    } else if (msg.text && msg.text.startsWith('/start')) {
        bot.sendMessage(chatId, 'Привет! Отправь мне любым файлом (.apk, .zip и т.д.), и я пришлю тебе его file_id для сайта.');
    }
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

// Роут скачивания по file_id
app.get('/api/mods/download/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const fileLink = await bot.getFileLink(fileId);
        return res.redirect(fileLink);
    } catch (err) {
        console.error('Ошибка Telegram API:', err.message);
        res.status(404).send('Ошибка: Файл не найден или file_id указан неверно.');
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
