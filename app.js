// === НАСТРОЙКИ ===
// ВСТАВЬТЕ СЮДА НОВУЮ ССЫЛКУ ИЗ DEPLOYMENT (v3.0)
const API_URL = "https://script.google.com/macros/s/ВАША_НОВАЯ_ССЫЛКА_ЗДЕСЬ/exec"; 

// === 1. ЗАГРУЗКА ДАННЫХ ===
async function fetchTasks() {
    const habitsList = document.getElementById('habits-list');
    const tasksList = document.getElementById('tasks-list');
    
    try {
        const response = await fetch(API_URL + "?action=read");
        const json = await response.json();
        
        if (json.status === "success") {
            // Очищаем списки
            habitsList.innerHTML = "";
            tasksList.innerHTML = "";

            const data = json.data;

            // Обновляем дашборд
            updateDashboard(data);

            // Фильтруем и сортируем
            // Сначала невыполненные
            data.sort((a, b) => (a.status === b.status) ? 0 : a.status ? 1 : -1);

            let hasHabits = false;
            let hasTasks = false;

            data.forEach(item => {
                const isHabit = item.type === 'habit';
                
                if (isHabit) {
                    renderItem(item, habitsList);
                    hasHabits = true;
                } else {
                    renderItem(item, tasksList);
                    hasTasks = true;
                }
            });

            if (!hasHabits) habitsList.innerHTML = '<div class="loading">Нет привычек</div>';
            if (!hasTasks) tasksList.innerHTML = '<div class="loading">Задач нет 🎉</div>';

        } else {
            console.error(json);
            alert("Ошибка данных: " + json.message);
        }
    } catch (e) {
        console.error(e);
        habitsList.innerHTML = "Ошибка сети";
    }
}

// === 2. ОТРИСОВКА КАРТОЧКИ ===
function renderItem(item, container) {
    const isDone = item.status === true || String(item.status).toLowerCase() === "true";
    const isHabit = item.type === 'habit';

    const card = document.createElement('div');
    card.className = `task-card priority-${item.priority} ${isDone ? 'completed' : ''}`;
    
    // Формируем HTML для Стрика (если это привычка)
    let metaHtml = `<span class="badge">${translatePriority(item.priority)}</span>`;
    
    if (isHabit) {
        metaHtml += `<div class="habit-streak">🔥 ${item.streak || 0}</div>`;
    } else {
        metaHtml += `<span>${item.time}</span>`;
    }

    card.innerHTML = `
        <div class="task-content">
            <span class="task-title">${item.title}</span>
            <div class="task-meta">${metaHtml}</div>
        </div>
        <div class="checkbox-wrapper">
            <input type="checkbox" ${isDone ? 'checked' : ''} 
                   onchange="toggleItem(${item.id}, this)">
            <div class="custom-check"></div>
        </div>
    `;
    container.appendChild(card);
}

// === 3. ДОБАВЛЕНИЕ (CREATE) ===
async function addItem() {
    const typeSelect = document.getElementById('new-item-type');
    const titleInput = document.getElementById('new-task-title');
    const prioritySelect = document.getElementById('new-task-priority');
    const btn = document.querySelector('.add-btn');

    const title = titleInput.value.trim();
    if (!title) return;

    btn.disabled = true;
    btn.innerHTML = "⏳";

    try {
        await fetch(API_URL + "?action=create", {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                title: title,
                priority: prioritySelect.value,
                type: typeSelect.value, // habit или task
                time: "Inbox"
            })
        });
        
        titleInput.value = "";
        fetchTasks(); // Перезагружаем список
    } catch (e) {
        alert("Ошибка создания");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "+";
    }
}

// === 4. ОБНОВЛЕНИЕ СТАТУСА ===
function toggleItem(id, checkbox) {
    const isChecked = checkbox.checked;
    const card = checkbox.closest('.task-card');
    
    // Optimistic UI
    if (isChecked) card.classList.add('completed');
    else card.classList.remove('completed');

    fetch(API_URL + "?action=toggle", {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ id: id, status: isChecked })
    }).then(() => {
        // Если это привычка, перезагружаем список через секунду, чтобы обновить стрик
        const isHabitRow = card.innerHTML.includes('🔥'); // Грязный, но рабочий хак проверки
        if (isHabitRow && isChecked) {
             setTimeout(fetchTasks, 1000); 
        }
    }).catch(() => {
        checkbox.checked = !isChecked;
        alert("Сбой сохранения");
    });
}

// === 5. ДАШБОРД ===
function updateDashboard(data) {
    const total = data.length;
    const done = data.filter(t => t.status === true || String(t.status).toLowerCase() === "true").length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    document.getElementById('percent-text').innerText = `${percent}%`;
    document.getElementById('done-count').innerText = done;
    document.getElementById('total-count').innerText = total;

    const circle = document.querySelector('.progress-ring__circle');
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    const msgs = ["Соберись!", "Хороший старт", "Отличный темп 🔥", "Ты легенда 🏆"];
    let msgIndex = Math.floor(percent / 30);
    if(msgIndex > 3) msgIndex = 3;
    document.getElementById('motivation-msg').innerText = msgs[msgIndex];
}

function translatePriority(p) {
    const map = { "High": "🔥", "Medium": "⭐️", "Low": "☕️" };
    return map[p] || p;
}

// Старт
fetchTasks();
