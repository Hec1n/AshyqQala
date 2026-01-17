/* ==============================
   Ashyq Qala - Common Functions
   Общие функции для всех страниц
================================= */

const API_URL = window.location.origin + "/api";
const LS_AUTH_KEY = "ashyq_qala_auth";
const DGIS_API_KEY = "f924e9f7-4fa9-46cf-b3fa-52df227a9834";
const MAPGL_API_KEY = "686c5420-9671-4849-a23b-ee386e34d118";

const EMAILJS_SERVICE_ID = 'service_iz03z8i'; // ID сервиса EmailJS
const EMAILJS_TEMPLATE_ID = 'template_43lvsuw'; // ID шаблона
const EMAILJS_PUBLIC_KEY = 'QenZVc6-l028OE9Dg'; // Публичный ключ

// Глобальные переменные
let currentUser = null;

// ========== ИНТЕРАКТИВНЫЕ КАРТЫ 2GIS MAPGL ==========

function init2GISMap(containerId, lat = 51.1694, lng = 71.4491, zoom = 13, markers = [], onClickCallback = null) {
    console.log(`🗺️ Инициализация карты 2GIS MapGL в контейнере: ${containerId}`);

    const container = document.getElementById(containerId);
    if (!container) {
        console.error('❌ Контейнер не найден:', containerId);
        return null;
    }

    // Очищаем контейнер
    container.innerHTML = '';

    // Создаем div для карты
    const mapDiv = document.createElement('div');
    mapDiv.id = `${containerId}_map`;
    mapDiv.style.width = '100%';
    mapDiv.style.height = '100%';
    mapDiv.style.minHeight = '400px';
    mapDiv.style.borderRadius = '8px';
    container.appendChild(mapDiv);

    // Ждем загрузки API 2GIS MapGL
    if (typeof mapgl === 'undefined') {
        load2GISMapGLAPI().then(() => {
            create2GISMapGLMap(`${containerId}_map`, lat, lng, zoom, markers, onClickCallback);
        }).catch(error => {
            console.error('❌ Ошибка загрузки API 2GIS MapGL:', error);
            show2GISStaticMap(containerId, lat, lng, zoom, markers);
        });
    } else {
        create2GISMapGLMap(`${containerId}_map`, lat, lng, zoom, markers, onClickCallback);
    }

    return mapDiv.id;
}

function load2GISMapGLAPI() {
    return new Promise((resolve, reject) => {
        if (typeof mapgl !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://mapgl.2gis.com/api/js/v1?key=${MAPGL_API_KEY}`;
        script.onload = () => {
            console.log('✅ API 2GIS MapGL загружен');
            resolve();
        };
        script.onerror = () => {
            console.error('❌ Не удалось загрузить API 2GIS MapGL');
            reject();
        };
        document.head.appendChild(script);
    });
}

function create2GISMapGLMap(containerId, lat, lng, zoom, markers, onClickCallback) {
    try {
        console.log(`🔄 Создание карты 2GIS MapGL в контейнере: ${containerId}`);

        // Создаем карту
        const map = new mapgl.Map(containerId, {
            key: MAPGL_API_KEY,
            center: [lng, lat],
            zoom: zoom,
            style: 'c08e6b2e-6b6b-4b8a-9b3b-4b6b6b6b6b6b',
            fullscreenControl: false
        });

        // Добавляем маркеры
        markers.forEach((marker, index) => {
            const markerLat = parseFloat(marker.lat);
            const markerLng = parseFloat(marker.lng);

            // Цвет маркера в зависимости от статуса
            let color = '#FF0000'; // красный по умолчанию
            if (marker.status === 'new') color = '#FFC107'; // желтый
            else if (marker.status === 'work') color = '#17A2B8'; // голубой
            else if (marker.status === 'done') color = '#28A745'; // зеленый
            else if (marker.status === 'selected') color = '#007BFF'; // синий

            // Создаем SVG маркер
            const svgIcon = getMarkerIconSVG(color);

            const markerInstance = new mapgl.Marker(map, {
                coordinates: [markerLng, markerLat],
                icon: svgIcon,
                label: {
                    text: marker.title || '',
                    offset: [0, -20],
                    fontSize: 12,
                    fontWeight: 'bold',
                    textColor: '#333',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: [4, 8],
                    borderRadius: 4
                }
            });
        });

        // Добавляем обработчик клика на карту
        if (onClickCallback) {
            map.on('click', function(event) {
                const coords = event.lngLat;
                if (coords && coords[0] && coords[1]) {
                    onClickCallback(coords[1], coords[0]); // [lat, lng]
                }
            });
        }

        console.log('✅ Карта 2GIS MapGL создана успешно');
        // Сохраняем ссылку на карту
        window[containerId + '_instance'] = map;

    } catch (error) {
        console.error('❌ Ошибка создания карты 2GIS MapGL:', error);
        show2GISStaticMap(containerId.replace('_map', ''), lat, lng, zoom, markers);
    }
}

function getMarkerIconSVG(color) {
    // Создаем SVG маркер с нужным цветом
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
            <path fill="${color}" d="M15 0C6.7 0 0 6.7 0 15c0 11.5 15 27 15 27s15-15.5 15-27c0-8.3-6.7-15-15-15z"/>
            <circle cx="15" cy="15" r="6" fill="white"/>
        </svg>
    `;

    // Создаем data URL для SVG
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

function show2GISStaticMap(containerId, lat, lng, zoom, markers) {
    console.log('🔄 Используем статическую карту 2GIS как резервный вариант');

    const container = document.getElementById(containerId);
    if (!container) return;

    // Создаем параметры для статической карты
    const width = container.offsetWidth || 800;
    const height = container.offsetHeight || 400;

    let url = `https://static.maps.2gis.com/2.0?`;
    url += `s=${width}x${height}`;
    url += `&z=${zoom}`;
    url += `&pt=${lng},${lat}`;

    // Добавляем маркеры
    if (markers && markers.length > 0) {
        markers.forEach((marker, index) => {
            let color = 'rd'; // красный по умолчанию

            if (marker.status === 'new') color = 'yw'; // желтый
            else if (marker.status === 'work') color = 'db'; // голубой
            else if (marker.status === 'done') color = 'gr'; // зеленый
            else if (marker.status === 'selected') color = 'bl'; // синий

            url += `&pt=${marker.lng},${marker.lat}~k:${color}~n:${index + 1}`;
        });
    }

    url += `&key=${DGIS_API_KEY}`;

    container.innerHTML = `
        <img
            src="${url}"
            style="width: 100%; height: 100%; border-radius: 8px; object-fit: cover;"
            alt="Карта 2GIS"
            loading="lazy"
            onerror="this.src='https://static.maps.2gis.com/2.0?s=${width}x${height}&z=13&pt=71.4491,51.1694&key=${DGIS_API_KEY}'"
        />
        <div class="map-overlay-info">
            <span>Карта предоставлена <a href="https://2gis.ru" target="_blank" style="color: white;">2GIS</a></span>
        </div>
    `;

    // Для статической карты обработчик клика не поддерживается
    console.log('⚠️ Обработчик клика для статической карты не поддерживается');
}
// ========== ПОИСК АДРЕСОВ ==========

async function geocode2GIS(query) {
    try {
        console.log(`🔍 Поиск адреса: "${query}"`);

        // Используем API геокодирования 2GIS
        const response = await fetch(
            `https://catalog.api.2gis.com/3.0/items?q=${encodeURIComponent(query)}&type=street,building&key=${DGIS_API_KEY}&fields=items.point,items.full_name,items.address&locale=ru_RU&page_size=5`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.result && data.result.items) {
            const results = data.result.items.map(item => ({
                name: item.full_name || query,
                address: item.address || '',
                lat: item.point?.lat || 51.1694,
                lng: item.point?.lon || 71.4491,
                type: item.type || ''
            }));

            console.log(`✅ Найдено результатов: ${results.length}`);
            return results;
        }

        return getDemoSearchResults(query);
    } catch (error) {
        console.error('❌ Ошибка поиска адреса:', error);
        return getDemoSearchResults(query);
    }
}

function getDemoSearchResults(query) {
    // Демо-результаты для тестирования
    return [
        {
            name: `${query}, Астана`,
            address: `${query}, Астана, Казахстан`,
            lat: 51.1694 + (Math.random() - 0.5) * 0.01,
            lng: 71.4491 + (Math.random() - 0.5) * 0.01,
            type: 'street'
        },
        {
            name: `${query}, 10`,
            address: `${query}, 10, Астана`,
            lat: 51.1700,
            lng: 71.4500,
            type: 'building'
        }
    ];
}

async function reverseGeocode2GIS(lat, lng) {
    try {
        console.log(`📍 Обратное геокодирование: ${lat}, ${lng}`);

        const response = await fetch(
            `https://catalog.api.2gis.com/3.0/items/geocode?lat=${lat}&lon=${lng}&key=${DGIS_API_KEY}&fields=items.full_name,items.address&locale=ru_RU`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.result && data.result.items && data.result.items.length > 0) {
            const address = data.result.items[0].full_name;
            console.log(`✅ Адрес получен: ${address.substring(0, 50)}...`);
            return address;
        }

        return `Координаты: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
        console.error('❌ Ошибка обратного геокодирования:', error);
        return `ул. Примерная, Астана (координаты: ${lat.toFixed(6)}, ${lng.toFixed(6)})`;
    }
}

async function getAddressDetails(lat, lng) {
    try {
        const address = await reverseGeocode2GIS(lat, lng);

        // Простой парсинг адреса
        let street = 'Не определено';
        let district = 'Не определен';

        if (address.includes('ул.')) {
            const match = address.match(/ул\.\s*([^,]+)/);
            if (match) street = match[1].trim();
        } else if (address.includes('просп.')) {
            const match = address.match(/просп\.\s*([^,]+)/);
            if (match) street = match[1].trim();
        }

        // Определяем район
        if (lat > 51.18) district = 'Алматы район';
        else if (lat > 51.16) district = 'Сарыарка район';
        else if (lat > 51.14) district = 'Есиль район';
        else district = 'Центральный район';

        return {
            fullAddress: address,
            street: street,
            district: district,
            coordinates: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        };
    } catch (error) {
        console.error('❌ Ошибка получения деталей адреса:', error);
        return {
            fullAddress: `Координаты: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            street: 'Ошибка определения',
            district: 'Ошибка определения',
            coordinates: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        };
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function categoryLabel(code) {
    const map = {
        roads: "Дороги",
        light: "Освещение",
        trash: "Мусор",
        eco: "Экология",
        safety: "Безопасность",
        other: "Другое"
    };
    return map[code] || "Другое";
}

function statusLabel(code) {
    const map = {
        new: "Новая",
        work: "В работе",
        done: "Решена"
    };
    return map[code] || "Новая";
}

function statusColor(code) {
    const map = {
        new: "#ffc107",
        work: "#17a2b8",
        done: "#28a745"
    };
    return map[code] || "#ffc107";
}

function statusClass(code) {
    const map = {
        new: "status-new",
        work: "status-work",
        done: "status-done"
    };
    return map[code] || "status-new";
}

// ========== АУТЕНТИФИКАЦИЯ ==========

function saveAuthData(token, user) {
    const authData = { token, user };
    localStorage.setItem(LS_AUTH_KEY, JSON.stringify(authData));
    console.log('✅ Данные авторизации сохранены:', {
        hasToken: !!token,
        user: user?.email,
        name: user?.full_name
    });
}

function getAuthData() {
    try {
        const data = localStorage.getItem(LS_AUTH_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('❌ Ошибка парсинга данных авторизации:', e);
        return null;
    }
}

function clearAuthData() {
    localStorage.removeItem(LS_AUTH_KEY);
    currentUser = null;
    updateAuthMenu();
    console.log('✅ Данные авторизации очищены');
}

async function checkAuth() {
    const authData = getAuthData();
    if (authData && authData.token) {
        try {
            const response = await fetch(`${API_URL}/me`, {
                headers: {
                    'Authorization': `Bearer ${authData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    currentUser = data.user;
                    console.log('✅ Пользователь авторизован:', currentUser.email);
                    updateAuthMenu();
                    return true;
                }
            }

            console.log('❌ Токен недействителен, очищаем данные');
            clearAuthData();
            return false;
        } catch (error) {
            console.error('❌ Ошибка проверки авторизации:', error);
            clearAuthData();
            return false;
        }
    }

    console.log('ℹ️  Пользователь не авторизован');
    updateAuthMenu();
    return false;
}

// ========== ОБНОВЛЕНИЕ МЕНЮ АВТОРИЗАЦИИ ==========

function updateAuthMenu() {
    const authMenuItems = document.getElementById('authMenuItems');
    const authData = getAuthData();
    const isAuthenticated = authData && authData.token;

    if (authMenuItems) {
        if (isAuthenticated) {
            const user = authData.user;
            if (window.location.pathname === '/account' || window.location.pathname.includes('account')) {
                authMenuItems.innerHTML = `
                    <a href="javascript:void(0)" onclick="logout()" class="menu-item">
                        <span style="margin-right: 8px;">🚪</span> Выйти
                    </a>
                `;
            } else {
                authMenuItems.innerHTML = `
                    <a href="/account" class="menu-item">
                        <span style="margin-right: 8px;">👤</span> ${user.full_name || 'Личный кабинет'}
                    </a>
                    <a href="javascript:void(0)" onclick="logout()" class="menu-item">
                        <span style="margin-right: 8px;">🚪</span> Выйти
                    </a>
                `;
            }
        } else {
            authMenuItems.innerHTML = `
                <a href="javascript:void(0)" onclick="showAuthModal('login')" class="menu-item">
                    <span style="margin-right: 8px;">🔑</span> Войти
                </a>
                <a href="javascript:void(0)" onclick="showAuthModal('register')" class="menu-item">
                    <span style="margin-right: 8px;">📝</span> Регистрация
                </a>
            `;
        }
    }
}

// ========== API ФУНКЦИИ ==========

async function apiRequest(endpoint, method = 'GET', data = null, auth = true) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (auth) {
        const authData = getAuthData();
        if (authData && authData.token) {
            headers['Authorization'] = `Bearer ${authData.token}`;
        }
    }

    const config = {
        method,
        headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Ошибка сервера');
        }

        return result;
    } catch (error) {
        console.error('❌ API Error:', error);
        throw error;
    }
}

async function registerUser(userData) {
    try {
        console.log('📝 Регистрация пользователя:', userData.email);
        const result = await apiRequest('/register', 'POST', userData, false);

        if (result.success) {
            saveAuthData(result.access_token, result.user);
            currentUser = result.user;
            updateAuthMenu();
            showNotification('Регистрация успешна!', 'success');
            closeAuthModal();

            setTimeout(() => {
                window.location.href = '/account';
            }, 1000);

            return result;
        } else {
            throw new Error(result.error || 'Ошибка регистрации');
        }
    } catch (error) {
        showNotification(error.message || 'Ошибка регистрации', 'error');
        throw error;
    }
}

async function loginUser(credentials) {
    try {
        console.log('🔑 Вход пользователя:', credentials.email);
        const result = await apiRequest('/login', 'POST', credentials, false);

        if (result.success) {
            saveAuthData(result.access_token, result.user);
            currentUser = result.user;
            updateAuthMenu();
            showNotification('Вход выполнен!', 'success');
            closeAuthModal();

            setTimeout(() => {
                window.location.href = '/account';
            }, 1000);

            return result;
        } else {
            throw new Error(result.error || 'Ошибка входа');
        }
    } catch (error) {
        showNotification(error.message || 'Неверный email или пароль', 'error');
        throw error;
    }
}

async function logout() {
    try {
        await apiRequest('/logout', 'POST');
    } catch (error) {
        console.error('❌ Ошибка выхода:', error);
    } finally {
        clearAuthData();
        showNotification('Вы вышли из системы', 'info');

        if (window.location.pathname === '/account' || window.location.pathname.includes('account')) {
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
    }
}

// ========== УВЕДОМЛЕНИЯ ==========

function showNotification(message, type = 'info') {
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(notification => notification.remove());

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification notification-${type}`;
    notificationDiv.innerHTML = `
        <div class="notification-icon">${icons[type] || icons.info}</div>
        <div class="notification-content">
            <h4>${type === 'success' ? 'Успешно!' : type === 'error' ? 'Ошибка!' : 'Информация'}</h4>
            <p>${message}</p>
        </div>
        <button class="notification-close">✕</button>
    `;

    document.body.appendChild(notificationDiv);

    setTimeout(() => {
        notificationDiv.classList.add('show');
    }, 10);

    notificationDiv.querySelector('.notification-close').addEventListener('click', () => {
        notificationDiv.classList.remove('show');
        setTimeout(() => notificationDiv.remove(), 300);
    });

    setTimeout(() => {
        if (notificationDiv.parentNode) {
            notificationDiv.classList.remove('show');
            setTimeout(() => notificationDiv.remove(), 300);
        }
    }, 5000);
}

// ========== МОДАЛКА АУТЕНТИФИКАЦИИ ==========

function showAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    const title = document.getElementById('authModalTitle');
    const sub = document.getElementById('authModalSub');

    if (tab === 'login') {
        title.textContent = 'Вход';
        sub.textContent = 'Войдите в свой аккаунт';
        document.querySelector('[data-tab="login"]')?.classList.add('active');
        document.querySelector('[data-tab="register"]')?.classList.remove('active');
        document.getElementById('loginForm')?.classList.add('active');
        document.getElementById('registerForm')?.classList.remove('active');
    } else {
        title.textContent = 'Регистрация';
        sub.textContent = 'Создайте новый аккаунт';
        document.querySelector('[data-tab="register"]')?.classList.add('active');
        document.querySelector('[data-tab="login"]')?.classList.remove('active');
        document.getElementById('registerForm')?.classList.add('active');
        document.getElementById('loginForm')?.classList.remove('active');
    }

    modal.classList.add('show');

    setTimeout(() => {
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }, 100);
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('show');
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

async function initCommon() {
    console.log('🚀 Инициализация общих функций...');

    // Проверяем авторизацию
    await checkAuth();

    // Обработчики событий для модалки
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-close="auth"]') ||
            e.target.closest('[data-close="auth"]') ||
            e.target.classList.contains('modal-backdrop')) {
            closeAuthModal();
        }

        if (e.target.matches('.auth-tab')) {
            const tabName = e.target.dataset.tab;
            showAuthModal(tabName);
        }
    });

    // Форма входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;

            if (!email || !password) {
                showNotification('Заполните все поля', 'error');
                return;
            }

            await loginUser({ email, password });
        });
    }

    // Форма регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const full_name = document.getElementById('registerName')?.value;
            const email = document.getElementById('registerEmail')?.value;
            const password = document.getElementById('registerPassword')?.value;

            if (!email || !password || !full_name) {
                showNotification('Заполните обязательные поля', 'error');
                return;
            }

            await registerUser({ email, password, full_name });
        });
    }

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAuthModal();
        }
    });

    console.log('✅ Общие функции инициализированы');
}
// ========== EMAIL ОТПРАВКА ==========

async function sendIssueEmail(issueData, userData) {
    try {
        console.log('📧 Отправка email уведомления...', {
            issue: issueData,
            user: userData
        });

        // Проверяем, загружен ли EmailJS
        if (typeof emailjs === 'undefined') {
            console.error('❌ EmailJS не загружен');
            return { success: false, error: 'EmailJS не загружен' };
        }

        // Формируем данные для шаблона
        const templateParams = {
            to_email: 'unityhesin@gmail.com', // Твой email
            reply_to: userData.email, // Email отправителя для ответа
            category: categoryLabel(issueData.category) || 'Другое',
            description: issueData.description || 'Без описания',
            address: issueData.address || 'Адрес не указан',
            priority: getPriorityLabel(issueData.priority) || 'Средний',
            user_name: userData.full_name || userData.email || 'Пользователь',
            user_email: userData.email || 'Не указан',
            date: new Date().toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }),
            time: new Date().toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            coordinates: issueData.lat && issueData.lng
                ? `${issueData.lat.toFixed(6)}, ${issueData.lng.toFixed(6)}`
                : 'Не указаны'
        };

        console.log('📤 Параметры для EmailJS:', templateParams);

        // Отправляем email через EmailJS
        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams,
            EMAILJS_PUBLIC_KEY
        );

        console.log('✅ Email успешно отправлен:', response);
        return { success: true, response: response };

    } catch (error) {
        console.error('❌ Ошибка отправки email:', error);
        return {
            success: false,
            error: error.text || error.message || 'Неизвестная ошибка'
        };
    }
}

// Вспомогательная функция для приоритета
function getPriorityLabel(priority) {
    const priorityMap = {
        'low': 'Низкий',
        'medium': 'Средний',
        'high': 'Высокий',
        'critical': 'Критический'
    };
    return priorityMap[priority] || 'Средний';
}

// Функция для отправки email при создании заявки
async function sendNewIssueEmail(issueData) {
    const authData = getAuthData();
    if (!authData || !authData.user) {
        console.error('❌ Пользователь не авторизован для отправки email');
        return { success: false, error: 'Не авторизован' };
    }

    // Показываем уведомление
    showNotification('Отправляем уведомление на email...', 'info');

    // Отправляем email
    const result = await sendIssueEmail(issueData, authData.user);

    if (result.success) {
        showNotification('Email уведомление отправлено на unityhesin@gmail.com!', 'success');
    } else {
        console.error('❌ Ошибка отправки email:', result.error);
        showNotification('Email не отправлен: ' + result.error, 'warning');
    }

    return result;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommon);
} else {
    initCommon();
}