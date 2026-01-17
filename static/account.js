/* ==============================
   Ashyq Qala - Account Page
   Личный кабинет с интерактивной картой
================================= */

// Глобальные переменные
let myIssues = [];
let selectedLocation = null;
let activityChart = null;
let accountMap = null;

// DOM элементы
const userGreeting = document.getElementById('userGreeting');
const statNew = document.getElementById('statNew');
const statWork = document.getElementById('statWork');
const statDone = document.getElementById('statDone');
const statTotal = document.getElementById('statTotal');
const monthCount = document.getElementById('monthCount');
const avgPriority = document.getElementById('avgPriority');
const avgTime = document.getElementById('avgTime');
const userRank = document.getElementById('userRank');
const btnAddIssueAccount = document.getElementById('btnAddIssueAccount');
const btnRefreshIssues = document.getElementById('btnRefreshIssues');
const accountMapContainer = document.getElementById('accountMapContainer');
const selectedAddress = document.getElementById('selectedAddress');
const selectedCoords = document.getElementById('selectedCoords');
const issueCategoryAccount = document.getElementById('issueCategoryAccount');
const issuePriority = document.getElementById('issuePriority');
const issueDescriptionAccount = document.getElementById('issueDescriptionAccount');
const previewAddress = document.getElementById('previewAddress');
const previewCoords = document.getElementById('previewCoords');
const btnChangeLocation = document.getElementById('btnChangeLocation');
const btnCancelIssue = document.getElementById('btnCancelIssue');
const btnSubmitIssue = document.getElementById('btnSubmitIssue');
const filterMyIssues = document.getElementById('filterMyIssues');
const myIssuesList = document.getElementById('myIssuesList');
const topCategories = document.getElementById('topCategories');
const searchInput = document.getElementById('searchInput');
const btnSearch = document.getElementById('btnSearch');
const searchResults = document.getElementById('searchResults');
const btnUseCurrentLocation = document.getElementById('btnUseCurrentLocation');
const btnCopyCoords = document.getElementById('btnCopyCoords');
const btnConfirmLocation = document.getElementById('btnConfirmLocation');

// ========== ПРОВЕРКА АВТОРИЗАЦИИ ==========
// ========== ОБРАБОТЧИК КЛИКА НА КАРТУ ==========

async function handleMapClick(lat, lng) {
    console.log(`📍 Клик на карту: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    // Выбираем это местоположение
    await selectLocation(lat, lng);

    // Показываем уведомление
    showNotification('Местоположение выбрано! Координаты: ' + lat.toFixed(6) + ', ' + lng.toFixed(6), 'success');
}

async function checkAuthBeforeLoad() {
    const authData = getAuthData();
    if (!authData || !authData.token) {
        console.log('❌ Пользователь не авторизован, перенаправление на главную');
        showNotification('Для доступа к личному кабинету требуется авторизация', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/me`, {
            headers: {
                'Authorization': `Bearer ${authData.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            clearAuthData();
            showNotification('Сессия истекла. Пожалуйста, войдите снова', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Ошибка проверки токена:', error);
        return false;
    }
}

// ========== ОБРАБОТЧИК КЛИКА НА КАРТУ ==========

async function handleMapClick(lat, lng) {
    console.log(`📍 Клик на карту: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    // Выбираем это местоположение
    await selectLocation(lat, lng);

    // Показываем уведомление
    showNotification('Местоположение выбрано! Координаты: ' + lat.toFixed(6) + ', ' + lng.toFixed(6), 'success');
}

// ========== ИНИЦИАЛИЗАЦИЯ ИНТЕРАКТИВНОЙ КАРТЫ В ЛИЧНОМ КАБИНЕТЕ ==========

// ========== ИНИЦИАЛИЗАЦИЯ ИНТЕРАКТИВНОЙ КАРТЫ В ЛИЧНОМ КАБИНЕТЕ ==========

// ========== ИНИЦИАЛИЗАЦИЯ ИНТЕРАКТИВНОЙ КАРТЫ В ЛИЧНОМ КАБИНЕТЕ ==========

function initAccountInteractiveMap() {
    if (!accountMapContainer) {
        console.error('❌ Element accountMapContainer not found');
        return;
    }

    try {
        console.log('🔄 Инициализация интерактивной карты 2GIS MapGL в личном кабинете...');

        let centerLat = 51.1694; // Астана по умолчанию
        let centerLng = 71.4491;
        let zoom = 13;

        // Если есть выбранная локация, центрируем на ней
        if (selectedLocation) {
            centerLat = selectedLocation.lat;
            centerLng = selectedLocation.lng;
            zoom = 16;
        }

        // Создаем маркеры
        const markers = [];

        // Добавляем маркер выбранной точки
        if (selectedLocation) {
            markers.push({
                lat: selectedLocation.lat,
                lng: selectedLocation.lng,
                status: 'selected',
                title: 'Выбранное место для заявки'
            });
        }

        // Добавляем маркеры моих заявок
        myIssues.forEach((issue, index) => {
            markers.push({
                lat: issue.lat,
                lng: issue.lng,
                status: issue.status,
                title: `${categoryLabel(issue.category)}: ${issue.description.substring(0, 30)}...`
            });
        });

        // Инициализируем карту с обработчиком клика
        init2GISMap('accountMapContainer', centerLat, centerLng, zoom, markers, handleMapClick);

        console.log('✅ Интерактивная карта 2GIS MapGL в ЛК успешно загружена');

    } catch (error) {
        console.error('❌ Ошибка загрузки интерактивной карты в ЛК:', error);
        accountMapContainer.innerHTML = `
            <div class="map-error">
                <p>⚠️ Не удалось загрузить интерактивную карту</p>
                <p>Используйте поиск для выбора местоположения</p>
            </div>
        `;
    }
}

// ========== ПОИСК АДРЕСОВ ==========

async function searchAddress(query) {
    if (!query.trim()) {
        searchResults.innerHTML = '';
        showNotification('Введите адрес для поиска', 'warning');
        return;
    }

    try {
        showNotification('Ищем адрес...', 'info');
        const results = await geocode2GIS(query);

        console.log(`🔍 Найдено ${results.length} результатов`);

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">Адрес не найден</div>';
            showNotification('Адрес не найден', 'error');
            return;
        }

        searchResults.innerHTML = results.slice(0, 5).map((result, index) => `
            <div class="search-result-item" data-index="${index}">
                <div class="result-name">${result.name}</div>
                <div class="result-coords">${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}</div>
                <button class="btn btn-sm btn-primary select-result" data-lat="${result.lat}" data-lng="${result.lng}">
                    Выбрать
                </button>
            </div>
        `).join('');

        // Добавляем обработчики для кнопок выбора
        document.querySelectorAll('.select-result').forEach((btn, index) => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const lat = parseFloat(btn.dataset.lat);
                const lng = parseFloat(btn.dataset.lng);
                const result = results[index];

                await selectLocation(lat, lng);
                searchInput.value = result.name;
                searchResults.innerHTML = '';
                showNotification('Адрес выбран', 'success');
            });
        });

        // Добавляем обработчики на сами элементы
        document.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', async (e) => {
                if (!e.target.classList.contains('select-result')) {
                    const result = results[index];
                    await selectLocation(result.lat, result.lng);
                    searchInput.value = result.name;
                    searchResults.innerHTML = '';
                    showNotification('Адрес выбран', 'success');
                }
            });
        });

        showNotification(`Найдено ${results.length} результатов`, 'success');
    } catch (error) {
        console.error('❌ Ошибка поиска адреса:', error);
        showNotification('Ошибка поиска адреса', 'error');
        searchResults.innerHTML = '<div class="search-result-item">Ошибка поиска адреса</div>';
    }
}

// ========== ВЫБОР МЕСТОПОЛОЖЕНИЯ ==========

async function selectLocation(lat, lng) {
    selectedLocation = { lat, lng };

    // Обновляем информацию о выбранном месте
    selectedCoords.textContent = `Координаты: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    previewCoords.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    // Получаем детали адреса
    const addressDetails = await getAddressDetails(lat, lng);

    selectedAddress.textContent = addressDetails.fullAddress;
    previewAddress.textContent = addressDetails.fullAddress;

    if (document.getElementById('previewStreet')) {
        document.getElementById('previewStreet').textContent = `Улица: ${addressDetails.street}`;
    }
    if (document.getElementById('previewDistrict')) {
        document.getElementById('previewDistrict').textContent = `Район: ${addressDetails.district}`;
    }
    if (document.getElementById('selectedStreet')) {
        document.getElementById('selectedStreet').textContent = `Улица: ${addressDetails.street}`;
    }
    if (document.getElementById('selectedDistrict')) {
        document.getElementById('selectedDistrict').textContent = `Район: ${addressDetails.district}`;
    }

    // Активируем кнопку отправки
    if (btnSubmitIssue) {
        btnSubmitIssue.disabled = !issueDescriptionAccount?.value.trim();
    }

    // Обновляем карту с выбранной точкой
    initAccountInteractiveMap();

    return addressDetails;
}

// ========== ЗАГРУЗКА МОИХ ПРОБЛЕМ ==========

async function loadMyIssues() {
    try {
        showLoading(true);

        const response = await fetch(`${API_URL}/issues?user_only=true`, {
            headers: {
                'Authorization': `Bearer ${getAuthData().token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            myIssues = data.issues || [];
            console.log(`📥 Загружено ${myIssues.length} моих заявок`);

            updateStats();
            updateActivityData();
            renderMyIssues();
            updateTopCategories();
            updateAdditionalStats();

            // Инициализируем карту с моими заявками
            initAccountInteractiveMap();

            if (activityChart) {
                updateActivityChart();
            }

            showNotification(`Загружено ${myIssues.length} ваших заявок`, 'success');
        } else {
            console.error('❌ Failed to load issues');
            myIssues = [];
            renderMyIssues();
            showNotification('Ошибка загрузки заявок', 'error');
        }
    } catch (error) {
        console.error('❌ Error loading issues:', error);
        myIssues = [];
        renderMyIssues();
        showNotification('Ошибка соединения с сервером', 'error');
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    const loadingElement = document.getElementById('issuesLoading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}

// ========== ОБНОВЛЕНИЕ СТАТИСТИКИ ==========

function updateStats() {
    const newCount = myIssues.filter(issue => issue.status === 'new').length;
    const workCount = myIssues.filter(issue => issue.status === 'work').length;
    const doneCount = myIssues.filter(issue => issue.status === 'done').length;
    const totalCount = myIssues.length;

    if (statNew) statNew.textContent = newCount;
    if (statWork) statWork.textContent = workCount;
    if (statDone) statDone.textContent = doneCount;
    if (statTotal) statTotal.textContent = totalCount;
}

// ========== ОБНОВЛЕНИЕ ДАННЫХ ДЛЯ ГРАФИКА ==========

function updateActivityData() {
    const monthlyActivityData = [0, 0, 0, 0, 0, 0];
    const now = new Date();
    const currentMonth = now.getMonth();

    myIssues.forEach(issue => {
        const issueDate = new Date(issue.created_at);
        const issueMonth = issueDate.getMonth();
        const monthDiff = (currentMonth - issueMonth + 12) % 12;

        if (monthDiff < 6) {
            monthlyActivityData[5 - monthDiff] += 1;
        }
    });

    window.monthlyActivityData = monthlyActivityData;
}

// ========== ОБНОВЛЕНИЕ ДОПОЛНИТЕЛЬНОЙ СТАТИСТИКИ ==========

function updateAdditionalStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthIssues = myIssues.filter(issue => {
        const issueDate = new Date(issue.created_at);
        return issueDate.getMonth() === currentMonth &&
               issueDate.getFullYear() === currentYear;
    });

    if (monthCount) monthCount.textContent = monthIssues.length;

    const priorityMap = { low: 1, medium: 2, high: 3, critical: 4 };
    const priorities = myIssues.map(issue => priorityMap[issue.priority] || 2);
    const avgPriorityValue = priorities.length > 0 ?
        (priorities.reduce((a, b) => a + b, 0) / priorities.length).toFixed(1) : '-';

    if (avgPriority) avgPriority.textContent = avgPriorityValue;

    const solvedIssues = myIssues.filter(issue => issue.status === 'done');
    let avgTimeValue = '-';

    if (solvedIssues.length > 0) {
        const totalDays = solvedIssues.reduce((sum, issue) => {
            const created = new Date(issue.created_at);
            const updated = new Date(issue.updated_at);
            const days = Math.round((updated - created) / (1000 * 60 * 60 * 24));
            return sum + (days > 0 ? days : 1);
        }, 0);

        avgTimeValue = Math.round(totalDays / solvedIssues.length) + ' дн.';
    }

    if (avgTime) avgTime.textContent = avgTimeValue;

    if (userRank) {
        const totalIssues = myIssues.length;
        if (totalIssues === 0) {
            userRank.textContent = '#-';
        } else if (totalIssues < 3) {
            userRank.textContent = '#Новичок';
        } else if (totalIssues < 10) {
            userRank.textContent = '#Активный';
        } else if (totalIssues < 25) {
            userRank.textContent = '#Эксперт';
        } else {
            userRank.textContent = '#Лидер';
        }
    }
}

// ========== ОТРИСОВКА МОИХ ПРОБЛЕМ ==========

function renderMyIssues() {
    if (!myIssuesList) return;

    const filterValue = filterMyIssues?.value || 'all';

    let filteredIssues = myIssues;
    if (filterValue !== 'all') {
        filteredIssues = myIssues.filter(issue => issue.status === filterValue);
    }

    filteredIssues.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (filteredIssues.length === 0) {
        myIssuesList.innerHTML = `
            <div class="issue-placeholder">
                <p>У вас пока нет заявок</p>
                <button class="btn btn-primary btn-pulse" id="btnAddFirstIssue">Добавить первую заявку</button>
            </div>
        `;

        const btnAddFirstIssue = document.getElementById('btnAddFirstIssue');
        if (btnAddFirstIssue) {
            btnAddFirstIssue.addEventListener('click', () => {
                document.querySelector('#addIssueForm').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            });
        }

        return;
    }

    myIssuesList.innerHTML = '';

    filteredIssues.forEach(issue => {
        const issueCard = document.createElement('div');
        issueCard.className = 'issue-card';
        issueCard.dataset.id = issue.id;

        const date = new Date(issue.created_at);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        issueCard.innerHTML = `
            <div class="issue-card-header">
                <div class="issue-card-title">${categoryLabel(issue.category)}</div>
                <div class="issue-status ${statusClass(issue.status)}">${statusLabel(issue.status)}</div>
            </div>
            <div class="issue-card-body">
                <div class="issue-card-desc">${issue.description}</div>
                ${issue.address ? `
                <div class="issue-card-address">
                    <span>📍</span>
                    <span>${issue.address}</span>
                </div>
                ` : ''}
            </div>
            <div class="issue-card-footer">
                <div class="issue-card-date">${formattedDate}</div>
                <div class="issue-card-actions">
                    <button class="btn btn-primary" onclick="changeIssueStatus('${issue.id}')">
                        Изменить статус
                    </button>
                </div>
            </div>
        `;

        issueCard.addEventListener('click', (e) => {
            if (!e.target.closest('.issue-card-actions')) {
                // Прокручиваем к форме для редактирования
                document.querySelector('#addIssueForm').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Заполняем форму данными заявки
                showNotification('Редактирование заявки', 'info');
            }
        });

        myIssuesList.appendChild(issueCard);
    });
}

// ========== ДОБАВЛЕНИЕ НОВОЙ ПРОБЛЕМЫ ==========

async function addNewIssue() {
    if (!selectedLocation) {
        showNotification('Сначала выберите место на карте', 'error');
        return;
    }

    const category = issueCategoryAccount.value;
    const priority = issuePriority.value;
    const description = issueDescriptionAccount.value.trim();

    if (!description) {
        showNotification('Введите описание проблемы', 'error');
        issueDescriptionAccount.focus();
        return;
    }

    try {
        // Получаем адрес по координатам
        const address = await reverseGeocode2GIS(selectedLocation.lat, selectedLocation.lng);

        const issueData = {
            category: category,
            description: description,
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            address: address,
            priority: priority
        };

        const response = await fetch(`${API_URL}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthData().token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(issueData)
        });

        if (response.ok) {
            const data = await response.json();
            showNotification('Проблема успешно добавлена!', 'success');

            // 🔥 ОТПРАВКА EMAIL УВЕДОМЛЕНИЯ
            try {
                await sendNewIssueEmail(issueData);
            } catch (emailError) {
                console.error('❌ Ошибка отправки email, но заявка создана:', emailError);
                // Не показываем ошибку пользователю, чтобы не смущать
            }

            resetIssueForm();
            await loadMyIssues();

            updateActivityData();
            if (activityChart) {
                updateActivityChart();
            }

            // Прокручиваем к списку заявок
            document.querySelector('#myIssues').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            const error = await response.json();
            showNotification(error.error || 'Ошибка при добавлении проблемы', 'error');
        }
    } catch (error) {
        console.error('❌ Error adding issue:', error);
        showNotification('Ошибка при добавлении проблемы', 'error');
    }
}

function resetIssueForm() {
    if (issueDescriptionAccount) {
        issueDescriptionAccount.value = '';
    }
    selectedLocation = null;

    if (selectedAddress) selectedAddress.textContent = 'Не выбрано';
    if (selectedCoords) selectedCoords.textContent = 'Координаты: не выбраны';
    if (previewAddress) previewAddress.textContent = 'Место не выбрано';
    if (previewCoords) previewCoords.textContent = '';
    if (btnSubmitIssue) btnSubmitIssue.disabled = true;

    // Восстанавливаем карту без выбранной точки
    initAccountInteractiveMap();
}

// ========== УПРАВЛЕНИЕ ЗАЯВКАМИ ==========

async function changeIssueStatus(issueId) {
    const issue = myIssues.find(i => i.id == issueId);
    if (!issue) return;

    const order = ["new", "work", "done"];
    const currentIndex = order.indexOf(issue.status);
    const newStatus = order[(currentIndex + 1) % order.length];

    try {
        const response = await fetch(`${API_URL}/issues/${issueId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getAuthData().token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            showNotification('Статус обновлен!', 'success');
            await loadMyIssues();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Ошибка обновления статуса', 'error');
        }
    } catch (error) {
        console.error('❌ Error updating status:', error);
        showNotification('Ошибка обновления статуса', 'error');
    }
}

// ========== СТАТИСТИКА И ГРАФИКИ ==========

function updateTopCategories() {
    if (!topCategories) return;

    const categoryCounts = {};
    myIssues.forEach(issue => {
        categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
    });

    const sortedCategories = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    if (sortedCategories.length === 0) {
        topCategories.innerHTML = '<div class="category-item"><span class="category-name">Нет данных</span><span class="category-count">0</span></div>';
        return;
    }

    topCategories.innerHTML = sortedCategories
        .map(item => `
            <div class="category-item">
                <span class="category-name">${categoryLabel(item.category)}</span>
                <span class="category-count">${item.count}</span>
            </div>
        `)
        .join('');
}

// ========== ГРАФИК АКТИВНОСТИ ==========

function initActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const now = new Date();
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const labels = [];

    for (let i = 5; i >= 0; i--) {
        const monthIndex = (now.getMonth() - i + 12) % 12;
        labels.push(monthNames[monthIndex]);
    }

    const data = {
        labels: labels,
        datasets: [{
            label: 'Количество заявок',
            data: window.monthlyActivityData || [0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            borderColor: '#007bff',
            borderWidth: 2,
            tension: 0.4,
            fill: true
        }]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Заявок: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    };

    activityChart = new Chart(ctx, config);
}

function updateActivityChart() {
    if (!activityChart) return;

    activityChart.data.datasets[0].data = window.monthlyActivityData || [0, 0, 0, 0, 0, 0];
    activityChart.update();
}

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

function setupAccountEventListeners() {
    if (btnAddIssueAccount) {
        btnAddIssueAccount.addEventListener('click', () => {
            document.querySelector('#addIssueForm').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    }

    if (btnRefreshIssues) {
        btnRefreshIssues.addEventListener('click', async () => {
            await loadMyIssues();
            showNotification('Список заявок обновлен', 'success');
        });
    }

    if (btnChangeLocation) {
        btnChangeLocation.addEventListener('click', () => {
            document.querySelector('#mapAccount').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    }

    if (btnCancelIssue) {
        btnCancelIssue.addEventListener('click', () => {
            resetIssueForm();
            showNotification('Форма очищена', 'info');
        });
    }

    if (btnSubmitIssue) {
        btnSubmitIssue.addEventListener('click', async (e) => {
            e.preventDefault();
            await addNewIssue();
        });
    }

    if (filterMyIssues) {
        filterMyIssues.addEventListener('change', renderMyIssues);
    }

    if (issueDescriptionAccount) {
        issueDescriptionAccount.addEventListener('input', () => {
            if (btnSubmitIssue) {
                btnSubmitIssue.disabled = !issueDescriptionAccount.value.trim() || !selectedLocation;
            }
        });
    }

    if (btnSearch) {
        btnSearch.addEventListener('click', async () => {
            await searchAddress(searchInput.value);
        });
    }

    let searchDebounceTimer;
    if (searchInput) {
        // Дебаунс для поиска при вводе
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                if (searchInput.value.trim().length >= 3) {
                    searchAddress(searchInput.value);
                } else {
                    searchResults.innerHTML = '';
                }
            }, 500);
        });

        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await searchAddress(searchInput.value);
            }
        });
    }

    if (btnUseCurrentLocation) {
        btnUseCurrentLocation.addEventListener('click', async () => {
            try {
                if (!navigator.geolocation) {
                    showNotification('Геолокация не поддерживается вашим браузером', 'error');
                    return;
                }

                showNotification('Определяем ваше местоположение...', 'info');

                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        await selectLocation(lat, lng);
                        showNotification('Ваше местоположение определено', 'success');
                    },
                    (error) => {
                        showNotification('Не удалось определить местоположение. Проверьте настройки браузера.', 'error');
                        console.error('Geolocation error:', error);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            } catch (error) {
                console.error('❌ Current location error:', error);
                showNotification('Ошибка определения местоположения', 'error');
            }
        });
    }

    if (btnCopyCoords) {
        btnCopyCoords.addEventListener('click', async () => {
            if (!selectedLocation) {
                showNotification('Сначала выберите местоположение', 'warning');
                return;
            }

            try {
                const text = `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`;
                await navigator.clipboard.writeText(text);
                showNotification('Координаты скопированы в буфер обмена', 'success');
            } catch (error) {
                console.error('❌ Copy coordinates error:', error);
                showNotification('Не удалось скопировать координаты', 'error');
            }
        });
    }

    if (btnConfirmLocation) {
        btnConfirmLocation.addEventListener('click', () => {
            if (!selectedLocation) {
                showNotification('Сначала выберите местоположение', 'warning');
                return;
            }

            document.querySelector('#addIssueForm').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            showNotification('Местоположение подтверждено', 'success');
        });
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ЛИЧНОГО КАБИНЕТА ==========

async function initAccountPage() {
    console.log('🚀 Инициализация личного кабинета с интерактивной картой 2GIS...');

    const isAuthenticated = await checkAuthBeforeLoad();
    if (!isAuthenticated) {
        return;
    }

    const authData = getAuthData();
    if (userGreeting && authData && authData.user) {
        userGreeting.textContent = `Добро пожаловать, ${authData.user.full_name || authData.user.email}!`;
    }

    await loadMyIssues();
    initActivityChart();
    setupAccountEventListeners();

    // Инициализируем интерактивную карту
    initAccountInteractiveMap();

    document.body.classList.add('loaded');

    console.log('✅ Личный кабинет с интерактивной картой 2GIS успешно инициализирован');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccountPage);
} else {
    initAccountPage();
}