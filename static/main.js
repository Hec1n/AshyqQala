/* ==============================
   Ashyq Qala - Main Page
   Главная страница с интерактивной картой
================================= */

// Глобальные переменные
let issues = [];
let categoriesChart = null;
let mainMap = null;

// DOM элементы
const issueList = document.getElementById("issueList");
const statsLine = document.getElementById("statsLine");
const filterCategory = document.getElementById("filterCategory");
const filterStatus = document.getElementById("filterStatus");
const btnAddIssueMain = document.getElementById("btnAddIssueMain");
const liveStats = document.getElementById("liveStats");
const mapContainer = document.getElementById("mainMap");

// Элементы статистики
const totalNew = document.getElementById("totalNew");
const totalWork = document.getElementById("totalWork");
const totalDone = document.getElementById("totalDone");
const totalAll = document.getElementById("totalAll");
const roadStats = document.getElementById("roadStats");
const lightStats = document.getElementById("lightStats");
const trashStats = document.getElementById("trashStats");
const ecoStats = document.getElementById("ecoStats");
const safetyStats = document.getElementById("safetyStats");
const otherStats = document.getElementById("otherStats");
const topDistricts = document.getElementById("topDistricts");

// ========== ИНИЦИАЛИЗАЦИЯ ИНТЕРАКТИВНОЙ КАРТЫ 2GIS MAPGL ==========

function initInteractiveMap() {
    if (!mapContainer) {
        console.error('❌ Element mainMap not found');
        return;
    }

    try {
        console.log('🔄 Инициализация интерактивной карты 2GIS MapGL...');

        // Центр карты - Астана
        const centerLat = 51.1694;
        const centerLng = 71.4491;
        const zoom = 13;

        // Получаем отфильтрованные заявки
        const visibleIssues = getFilteredIssues();
        console.log(`📌 Отображаем ${visibleIssues.length} заявок на карте`);

        // Создаем маркеры для заявок
        const markers = visibleIssues.map((issue, index) => ({
            lat: issue.lat,
            lng: issue.lng,
            status: issue.status,
            title: `${categoryLabel(issue.category)}: ${issue.description.substring(0, 30)}...`
        }));

        // Инициализируем карту (без обработчика клика для главной страницы)
        init2GISMap('mainMap', centerLat, centerLng, zoom, markers);

        console.log('✅ Интерактивная карта 2GIS MapGL успешно загружена');
        showNotification(`Карта загружена с ${markers.length} маркерами`, 'success');

    } catch (error) {
        console.error('❌ Ошибка загрузки интерактивной карты:', error);
        mapContainer.innerHTML = `
            <div class="map-error">
                <p>⚠️ Не удалось загрузить интерактивную карту</p>
                <p>Проверьте подключение к интернету</p>
            </div>
        `;
        showNotification('Ошибка загрузки карты', 'error');
    }
}

function updateMapOnFilterChange() {
    console.log('🔄 Обновление карты при изменении фильтров...');

    // Показываем индикатор загрузки
    if (mapContainer) {
        mapContainer.style.opacity = '0.5';
    }

    setTimeout(() => {
        initInteractiveMap();
        render();
    }, 300);
}

// ========== ЗАГРУЗКА ПРОБЛЕМ ==========

async function loadIssues() {
    try {
        showLoading(true);

        const response = await fetch(`${API_URL}/issues`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            issues = data.issues || [];
            console.log(`📥 Загружено ${issues.length} заявок`);

            render();
            loadStats();
            updateGlobalStats();
            initCategoriesChart();
            initInteractiveMap();

            // Обновляем live статистику
            if (liveStats) {
                liveStats.innerHTML = `
                    <span class="stat-icon">📊</span>
                    <span>${issues.length} заявок • ${new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}</span>
                `;
            }

            showNotification(`Загружено ${issues.length} заявок`, 'success');
        } else {
            console.error('Failed to load issues');
            issues = [];
            render();
            showNotification('Ошибка загрузки заявок', 'error');
        }
    } catch (error) {
        console.error('Error loading issues:', error);
        issues = [];
        render();
        showNotification('Ошибка соединения с сервером', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/issues/stats`);
        if (response.ok) {
            const data = await response.json();
            if (statsLine) {
                statsLine.textContent = `Всего проблем: ${data.total} (Новых: ${data.new}, В работе: ${data.work}, Решено: ${data.done})`;
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        if (statsLine) {
            statsLine.textContent = 'Загружено заявок: ' + issues.length;
        }
    }
}

// ========== ОБНОВЛЕНИЕ ГЛОБАЛЬНОЙ СТАТИСТИКИ ==========

function updateGlobalStats() {
    if (!issues.length) return;

    const newCount = issues.filter(issue => issue.status === 'new').length;
    const workCount = issues.filter(issue => issue.status === 'work').length;
    const doneCount = issues.filter(issue => issue.status === 'done').length;

    if (totalNew) {
        totalNew.textContent = newCount;
        const today = new Date().toLocaleDateString('ru-RU');
        const todayIssues = issues.filter(issue => {
            const issueDate = new Date(issue.created_at).toLocaleDateString('ru-RU');
            return issueDate === today && issue.status === 'new';
        }).length;
        const changeEl = totalNew.parentElement.querySelector('.stat-change');
        if (changeEl) changeEl.textContent = `+${todayIssues} за сегодня`;
    }

    if (totalWork) totalWork.textContent = workCount;
    if (totalDone) {
        totalDone.textContent = doneCount;
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekIssues = issues.filter(issue => {
            const issueDate = new Date(issue.created_at);
            return issueDate >= weekAgo && issue.status === 'done';
        }).length;
        const changeEl = totalDone.parentElement.querySelector('.stat-change');
        if (changeEl) changeEl.textContent = `+${weekIssues} за неделю`;
    }
    if (totalAll) totalAll.textContent = issues.length;

    const roadCount = issues.filter(issue => issue.category === 'roads').length;
    const lightCount = issues.filter(issue => issue.category === 'light').length;
    const trashCount = issues.filter(issue => issue.category === 'trash').length;
    const ecoCount = issues.filter(issue => issue.category === 'eco').length;
    const safetyCount = issues.filter(issue => issue.category === 'safety').length;
    const otherCount = issues.filter(issue => issue.category === 'other').length;

    if (roadStats) roadStats.textContent = `${roadCount} заявок`;
    if (lightStats) lightStats.textContent = `${lightCount} заявок`;
    if (trashStats) trashStats.textContent = `${trashCount} заявок`;
    if (ecoStats) ecoStats.textContent = `${ecoCount} заявок`;
    if (safetyStats) safetyStats.textContent = `${safetyCount} заявок`;
    if (otherStats) otherStats.textContent = `${otherCount} заявок`;

    updateTopDistricts();
}

function updateTopDistricts() {
    if (!topDistricts || !issues.length) return;

    const districtMap = {};
    issues.forEach(issue => {
        if (issue.address) {
            let district = 'Другой район';
            const address = issue.address.toLowerCase();

            if (address.includes('алматы') || address.includes('алматинск')) district = 'Алматы район';
            else if (address.includes('сарыарка')) district = 'Сарыарка район';
            else if (address.includes('есиль')) district = 'Есиль район';
            else if (address.includes('центр') || address.includes('центральн')) district = 'Центральный район';
            else if (address.includes('левобереж')) district = 'Левобережный район';

            districtMap[district] = (districtMap[district] || 0) + 1;
        }
    });

    const sortedDistricts = Object.entries(districtMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    if (sortedDistricts.length === 0) {
        topDistricts.innerHTML = '<div class="category-item"><span class="category-name">Нет данных</span><span class="category-count">-</span></div>';
        return;
    }

    topDistricts.innerHTML = sortedDistricts
        .map(item => `
            <div class="category-item">
                <span class="category-name">${item.name}</span>
                <span class="category-count">${item.count}</span>
            </div>
        `)
        .join('');
}

// ========== КРУГОВАЯ ДИАГРАММА КАТЕГОРИЙ ==========

function initCategoriesChart() {
    const ctx = document.getElementById('categoriesChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const categoryCounts = {
        'Дороги': issues.filter(i => i.category === 'roads').length,
        'Освещение': issues.filter(i => i.category === 'light').length,
        'Мусор': issues.filter(i => i.category === 'trash').length,
        'Экология': issues.filter(i => i.category === 'eco').length,
        'Безопасность': issues.filter(i => i.category === 'safety').length,
        'Другое': issues.filter(i => i.category === 'other').length
    };

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);

    const backgroundColors = [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF',
        '#FF9F40'
    ];

    const chartData = {
        labels: labels,
        datasets: [{
            data: data,
            backgroundColor: backgroundColors,
            borderColor: 'white',
            borderWidth: 2,
            hoverOffset: 15
        }]
    };

    const config = {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    };

    if (categoriesChart) {
        categoriesChart.data = chartData;
        categoriesChart.update();
    } else {
        categoriesChart = new Chart(ctx, config);
    }
}

// ========== ФИЛЬТРАЦИЯ ==========

function getFilteredIssues() {
    const catF = filterCategory?.value || "all";
    const statF = filterStatus?.value || "all";

    return issues.filter(it => {
        return (catF === "all" || it.category === catF) &&
               (statF === "all" || it.status === statF);
    });
}

// ========== ОТРИСОВКА СПИСКА ==========

function render() {
    if (!issueList) return;

    const visible = getFilteredIssues();
    visible.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (visible.length === 0) {
        issueList.innerHTML = `
            <div class="issue-placeholder">
                <p>Заявки не найдены</p>
                <small>Попробуйте изменить фильтры</small>
            </div>
        `;
        return;
    }

    issueList.innerHTML = '';

    visible.forEach((it, index) => {
        const item = document.createElement("div");
        item.className = "issue";

        const date = new Date(it.created_at);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const time = date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });

        item.innerHTML = `
            <div class="issue-top">
                <div class="issue-category">${categoryLabel(it.category)} <span class="marker-number">#${index + 1}</span></div>
                <div class="issue-status ${statusClass(it.status)}">${statusLabel(it.status)}</div>
            </div>
            <div class="issue-desc">${it.description}</div>
            ${it.address ? `<div class="issue-address">📍 ${it.address}</div>` : ''}
            <div class="issue-meta">
                <small>${formattedDate} ${time}</small>
                ${it.user_name ? `<small>От: ${it.user_name}</small>` : ''}
            </div>
        `;

        item.onclick = () => {
            // Прокручиваем к карте
            document.querySelector('#mapBlock').scrollIntoView({
                behavior: 'smooth'
            });

            // Показываем уведомление
            showNotification(`Заявка #${index + 1} выбрана. Смотрите на карте.`, 'info');
        };

        issueList.appendChild(item);
    });

    if (statsLine && issues.length > 0) {
        statsLine.textContent = `Показано: ${visible.length} из ${issues.length} заявок`;
    }
}

// ========== ПОКАЗ/СКРЫТИЕ ЗАГРУЗКИ ==========

function showLoading(show) {
    const loadingElement = document.getElementById('issuesLoading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

function setupEventListeners() {
    if (btnAddIssueMain) {
        btnAddIssueMain.addEventListener('click', () => {
            console.log('Add issue button clicked');
            const authData = getAuthData();
            if (authData && authData.token) {
                window.location.href = '/account';
            } else {
                showAuthModal('login');
            }
        });
    }

    // Обновляем карту при изменении фильтров
    if (filterCategory) {
        filterCategory.addEventListener("change", updateMapOnFilterChange);
    }

    if (filterStatus) {
        filterStatus.addEventListener("change", updateMapOnFilterChange);
    }

    // Автообновление каждые 30 секунд
    setInterval(() => {
        loadIssues();
    }, 30000);

    document.querySelectorAll(".faq-question").forEach(q => {
        q.addEventListener("click", () => {
            const item = q.closest('.faq-item');
            if (item) item.classList.toggle("open");
        });
    });

    const btnRegisterCTA = document.getElementById('btnRegisterCTA');
    const btnLoginCTA = document.getElementById('btnLoginCTA');

    if (btnRegisterCTA) {
        btnRegisterCTA.addEventListener('click', () => {
            showAuthModal('register');
        });
    }

    if (btnLoginCTA) {
        btnLoginCTA.addEventListener('click', () => {
            showAuthModal('login');
        });
    }

    document.querySelector('.hero-actions .btn-primary')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('#mapBlock').scrollIntoView({
            behavior: 'smooth'
        });
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

async function initMainPage() {
    console.log('🚀 Инициализация главной страницы с интерактивной картой 2GIS...');

    await loadIssues();
    setupEventListeners();

    console.log('✅ Главная страница с интерактивной картой 2GIS инициализирована');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMainPage);
} else {
    initMainPage();
}