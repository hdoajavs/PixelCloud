const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Ошибка БД:', err.message);
    else console.log('База данных SQLite подключена.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS mods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        platform TEXT NOT NULL,
        version TEXT NOT NULL,
        description TEXT NOT NULL,
        fileName TEXT,
        filePath TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        time TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Раб'
    )`);

    // Дефолтный Главный Администратор
    db.run(`INSERT OR IGNORE INTO admins (username, password, role) VALUES ('GlitchElite', 'nik0990olas', 'Главный Администратор')`);
});

// Авторизация
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM admins WHERE username = ? AND password = ?`, [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json({ success: true, username: row.username, role: row.role });
        } else {
            res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        }
    });
});

// Создание нового администратора
app.post('/api/auth/admins', (req, res) => {
    const { creatorRole, username, password, role } = req.body;

    if (creatorRole === 'Модератор' || creatorRole === 'Раб') {
        return res.status(403).json({ error: 'У вас нет прав создавать администраторов!' });
    }

    if (username === 'GlitchElite') {
        return res.status(403).json({ error: 'Нельзя создать пользователя с именем GlitchElite!' });
    }

    const assignedRole = role || 'Раб';

    db.run(`INSERT INTO admins (username, password, role) VALUES (?, ?, ?)`, [username, password, assignedRole], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Пользователь с таким логином уже существует!' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: this.lastID });
    });
});

// Получение списка всех модов
app.get('/api/mods', (req, res) => {
    db.all(`SELECT * FROM mods ORDER BY updatedAt DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Добавление мода (Доступно всем ролям)
app.post('/api/mods', upload.single('file'), (req, res) => {
    const { title, author, platform, version, description } = req.body;
    const fileName = req.file ? req.file.originalname : null;
    const filePath = req.file ? `/uploads/${req.file.filename}` : null;
    const now = new Date().toISOString();

    const sql = `INSERT INTO mods (title, author, platform, version, description, fileName, filePath, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [title, author, platform, version, description, fileName, filePath, now], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID, fileName, filePath });
    });
});

// Редактирование мода (Доступно всем ролям)
app.put('/api/mods/:id', upload.single('file'), (req, res) => {
    const { id } = req.params;
    const { title, author, platform, version, description } = req.body;
    const now = new Date().toISOString();

    if (req.file) {
        const fileName = req.file.originalname;
        const filePath = `/uploads/${req.file.filename}`;
        const sql = `UPDATE mods SET title = ?, author = ?, platform = ?, version = ?, description = ?, fileName = ?, filePath = ?, updatedAt = ? WHERE id = ?`;
        db.run(sql, [title, author, platform, version, description, fileName, filePath, now, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, updated: this.changes });
        });
    } else {
        const sql = `UPDATE mods SET title = ?, author = ?, platform = ?, version = ?, description = ?, updatedAt = ? WHERE id = ?`;
        db.run(sql, [title, author, platform, version, description, now, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, updated: this.changes });
        });
    }
});

// Удаление мода (Запрещено для роли "Раб")
app.delete('/api/mods/:id', (req, res) => {
    const { userRole } = req.body;
    if (userRole === 'Раб') {
        return res.status(403).json({ error: 'У вас нет прав для удаления модов!' });
    }

    db.run(`DELETE FROM mods WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, deleted: this.changes });
    });
});

// Получение логов
app.get('/api/logs', (req, res) => {
    db.all(`SELECT * FROM logs ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Запись лога
app.post('/api/logs', (req, res) => {
    const { action } = req.body;
    const time = new Date().toLocaleString('ru-RU');
    db.run(`INSERT INTO logs (action, time) VALUES (?, ?)`, [action, time], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Очистка логов (Запрещено для роли "Раб")
app.delete('/api/logs', (req, res) => {
    const { userRole } = req.body;
    if (userRole === 'Раб') {
        return res.status(403).json({ error: 'У вас нет прав для очистки логов!' });
    }

    db.run(`DELETE FROM logs`, [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));

