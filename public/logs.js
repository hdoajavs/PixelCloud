// Работа с логами
const LOGS_KEY = 'system_logs';

function getLogs() {
    return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
}

function addLog(action) {
    const logs = getLogs();
    logs.unshift({
        action: action,
        time: new Date().toLocaleString('ru-RU')
    });
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

function clearLogs() {
    localStorage.setItem(LOGS_KEY, JSON.stringify([]));
}

function renderLogsUI() {
    const logsList = document.getElementById('logsList');
    if (!logsList) return;

    const logs = getLogs();
    logsList.innerHTML = '';

    if (logs.length === 0) {
        logsList.innerHTML = '<li class="log-item">Логи отсутствуют</li>';
        return;
    }

    logs.forEach(log => {
        const li = document.createElement('li');
        li.className = 'log-item';
        li.innerHTML = `
            <span>${log.action}</span>
            <span class="log-time">${log.time}</span>
        `;
        logsList.appendChild(li);
    });
}
