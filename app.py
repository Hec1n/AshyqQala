# app.py для Render.com
from flask import Flask, render_template, send_from_directory, jsonify, request
from flask_cors import CORS
import os
from datetime import datetime, timedelta
import jwt
import hashlib
import random

current_dir = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__,
            static_folder=os.path.join(current_dir, 'static'),
            template_folder=os.path.join(current_dir, 'templates'))

# Настройки для Render.com
app.config['SECRET_KEY'] = 'ashyq-qala-secret-key-2026-render-com'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-key-ashyq-qala-render'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

CORS(app, resources={
    r"/*": {
        "origins": ["*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Секретный ключ для JWT
SECRET_KEY = 'ashyq-qala-secret-key-2026-render'

# Хранилище пользователей и заявок (в памяти для демо)
users_store = {}
issues_store = []
next_issue_id = 1

# Демо-пользователь по умолчанию
DEMO_USER = {
    'id': 1,
    'email': 'test@example.com',
    'full_name': 'Тестовый Пользователь',
    'password_hash': hashlib.sha256('test123'.encode()).hexdigest(),
    'created_at': '2024-01-01T00:00:00'
}

# Демо-заявки
DEMO_ISSUES = [
    {
        'id': 1,
        'category': 'roads',
        'status': 'new',
        'description': 'Глубокая яма на дороге возле школы №45',
        'address': 'ул. Кабанбай батыра, 12, Астана',
        'lat': 51.1694,
        'lng': 71.4491,
        'priority': 'high',
        'user_id': 1,
        'user_name': 'Тестовый Пользователь',
        'created_at': '2024-01-15T10:30:00',
        'updated_at': '2024-01-15T10:30:00'
    },
    {
        'id': 2,
        'category': 'trash',
        'status': 'work',
        'description': 'Переполненные мусорные контейнеры',
        'address': 'пр. Туран, 34, Астана',
        'lat': 51.1600,
        'lng': 71.4600,
        'priority': 'medium',
        'user_id': 1,
        'user_name': 'Тестовый Пользователь',
        'created_at': '2024-01-14T14:20:00',
        'updated_at': '2024-01-16T09:15:00'
    },
    {
        'id': 3,
        'category': 'light',
        'status': 'done',
        'description': 'Не работает фонарь на пешеходном переходе',
        'address': 'ул. Кенесары, 45, Астана',
        'lat': 51.1556,
        'lng': 71.4703,
        'priority': 'critical',
        'user_id': 1,
        'user_name': 'Тестовый Пользователь',
        'created_at': '2024-01-10T18:45:00',
        'updated_at': '2024-01-13T11:20:00'
    },
    {
        'id': 4,
        'category': 'eco',
        'status': 'new',
        'description': 'Сломанное дерево на детской площадке',
        'address': 'ул. Абая, 23, Астана',
        'lat': 51.1800,
        'lng': 71.4400,
        'priority': 'medium',
        'user_id': 1,
        'user_name': 'Тестовый Пользователь',
        'created_at': '2024-01-17T09:30:00',
        'updated_at': '2024-01-17T09:30:00'
    },
    {
        'id': 5,
        'category': 'safety',
        'status': 'work',
        'description': 'Отсутствует пешеходный переход у школы',
        'address': 'пр. Республики, 56, Астана',
        'lat': 51.1705,
        'lng': 71.4505,
        'priority': 'high',
        'user_id': 1,
        'user_name': 'Тестовый Пользователь',
        'created_at': '2024-01-16T14:00:00',
        'updated_at': '2024-01-17T10:00:00'
    }
]


# Инициализация хранилищ
def init_data_store():
    global users_store, issues_store, next_issue_id

    users_store.clear()
    issues_store.clear()

    users_store[DEMO_USER['email']] = DEMO_USER
    issues_store.extend(DEMO_ISSUES)
    next_issue_id = len(issues_store) + 1

    print(f"✅ Инициализировано: {len(users_store)} пользователей, {len(issues_store)} заявок")


# Инициализируем данные при запуске
init_data_store()


# ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

def create_token(user_id):
    """Создание JWT токена"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def verify_token(token):
    """Проверка JWT токена"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        print("❌ Токен истек")
        return None
    except jwt.InvalidTokenError:
        print("❌ Неверный токен")
        return None


def hash_password(password):
    """Хеширование пароля"""
    return hashlib.sha256(password.encode()).hexdigest()


def get_user_by_id(user_id):
    """Найти пользователя по ID"""
    if user_id == DEMO_USER['id']:
        return DEMO_USER

    for user in users_store.values():
        if user['id'] == user_id:
            return user
    return None


def generate_demo_address(lat, lng):
    """Генерация демо-адреса по координатам"""
    streets = [
        "ул. Кабанбай батыра",
        "пр. Туран",
        "ул. Кенесары",
        "ул. Абая",
        "пр. Республики",
        "ул. Сарыарка",
        "ул. Бейбитшилик",
        "пр. Мангилик Ел"
    ]

    districts = [
        "Алматы район",
        "Сарыарка район",
        "Есиль район",
        "Центральный район",
        "Левобережный район"
    ]

    street = random.choice(streets)
    district = random.choice(districts)
    number = random.randint(1, 100)

    return f"{street}, {number}, Астана, {district}"


# ========== МАРШРУТЫ ==========

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/account')
def account():
    return render_template('account.html')


@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)


# ========== API МАРШРУТЫ ==========

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ok',
        'time': datetime.now().isoformat(),
        'service': 'Ashyq Qala API',
        'version': '2.0.0',
        'environment': 'Render.com'
    })


@app.route('/api/test')
def test():
    return jsonify({
        'message': 'API работает на Render.com',
        'time': datetime.now().isoformat(),
        'users': len(users_store),
        'issues': len(issues_store)
    })


# API для заявок
@app.route('/api/issues', methods=['GET', 'OPTIONS'])
def get_issues():
    """Получение всех заявок"""
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    user_only = request.args.get('user_only', 'false').lower() == 'true'
    token = request.headers.get('Authorization', '').replace('Bearer ', '')

    print(f"📥 Запрос заявок: user_only={user_only}, has_token={bool(token)}")

    issues = issues_store.copy()  # Создаем копию для безопасности

    if user_only and token:
        user_id = verify_token(token)
        if user_id:
            print(f"🔍 Фильтрация заявок для user_id={user_id}")
            issues = [issue for issue in issues if issue.get('user_id') == user_id]
            print(f"📊 Найдено {len(issues)} заявок пользователя")
        else:
            print("❌ Неверный токен для фильтрации")

    # Добавляем случайные заявки для демонстрации, если их мало
    if len(issues) < 10 and not user_only:
        for i in range(len(issues), 15):
            lat = 51.1694 + (random.random() - 0.5) * 0.1
            lng = 71.4491 + (random.random() - 0.5) * 0.1
            categories = ['roads', 'light', 'trash', 'eco', 'safety', 'other']
            statuses = ['new', 'work', 'done']

            demo_issue = {
                'id': 1000 + i,
                'category': random.choice(categories),
                'status': random.choice(statuses),
                'description': f'Демо-заявка #{i + 1} для тестирования системы',
                'address': generate_demo_address(lat, lng),
                'lat': lat,
                'lng': lng,
                'priority': random.choice(['low', 'medium', 'high']),
                'user_id': random.choice([1, 2, 3]),
                'user_name': random.choice(['Иван Иванов', 'Петр Петров', 'Мария Сидорова']),
                'created_at': (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
                'updated_at': (datetime.now() - timedelta(days=random.randint(0, 15))).isoformat()
            }
            issues.append(demo_issue)

    return jsonify({
        'issues': issues,
        'total': len(issues),
        'success': True,
        'timestamp': datetime.now().isoformat()
    }), 200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    }


@app.route('/api/issues/stats', methods=['GET', 'OPTIONS'])
def get_stats():
    """Статистика по заявкам"""
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    total = len(issues_store)
    new = len([i for i in issues_store if i['status'] == 'new'])
    work = len([i for i in issues_store if i['status'] == 'work'])
    done = len([i for i in issues_store if i['status'] == 'done'])

    categories = {}
    for issue in issues_store:
        cat = issue['category']
        categories[cat] = categories.get(cat, 0) + 1

    # Добавляем демо-статистику для категорий
    if total < 10:
        for cat in ['roads', 'light', 'trash', 'eco', 'safety', 'other']:
            if cat not in categories:
                categories[cat] = random.randint(1, 5)

    return jsonify({
        'total': total,
        'new': new,
        'work': work,
        'done': done,
        'categories': categories,
        'success': True
    }), 200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    }


# API аутентификации
@app.route('/api/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    try:
        data = request.json
        print(f"📝 Регистрация: {data.get('email')}")

        if not data or not data.get('email') or not data.get('password') or not data.get('full_name'):
            return jsonify({'error': 'Все поля обязательны', 'success': False}), 400

        if data['email'] in users_store:
            return jsonify({'error': 'Пользователь уже существует', 'success': False}), 400

        # Генерируем новый ID
        new_id = max([user['id'] for user in users_store.values()] + [0]) + 1

        new_user = {
            'id': new_id,
            'email': data['email'],
            'password_hash': hash_password(data['password']),
            'full_name': data['full_name'],
            'created_at': datetime.now().isoformat()
        }

        users_store[data['email']] = new_user
        print(f"✅ Зарегистрирован новый пользователь: {new_user['email']} (ID: {new_user['id']})")

        token = create_token(new_user['id'])

        return jsonify({
            'message': 'Регистрация успешна',
            'user': {
                'id': new_user['id'],
                'email': new_user['email'],
                'full_name': new_user['full_name']
            },
            'access_token': token,
            'success': True
        }), 201, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }

    except Exception as e:
        print(f"❌ Ошибка регистрации: {e}")
        return jsonify({'error': 'Ошибка сервера при регистрации', 'success': False}), 500


@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    try:
        data = request.json
        print(f"🔑 Попытка входа: {data.get('email')}")

        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email и пароль обязательны', 'success': False}), 400

        # Проверяем демо пользователя
        if data['email'] == DEMO_USER['email']:
            if hashlib.sha256(data['password'].encode()).hexdigest() == DEMO_USER['password_hash']:
                token = create_token(DEMO_USER['id'])
                print(f"✅ Вход выполнен (демо): {DEMO_USER['email']}")
                return jsonify({
                    'message': 'Вход выполнен',
                    'user': {
                        'id': DEMO_USER['id'],
                        'email': DEMO_USER['email'],
                        'full_name': DEMO_USER['full_name']
                    },
                    'access_token': token,
                    'success': True
                }), 200

        # Проверяем обычных пользователей
        user = users_store.get(data['email'])
        if user and user['password_hash'] == hash_password(data['password']):
            token = create_token(user['id'])
            print(f"✅ Вход выполнен: {user['email']}")
            return jsonify({
                'message': 'Вход выполнен',
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'full_name': user['full_name']
                },
                'access_token': token,
                'success': True
            }), 200

        print(f"❌ Неверные учетные данные для: {data['email']}")
        return jsonify({'error': 'Неверный email или пароль', 'success': False}), 401

    except Exception as e:
        print(f"❌ Ошибка входа: {e}")
        return jsonify({'error': 'Ошибка сервера при входе', 'success': False}), 500


@app.route('/api/me', methods=['GET', 'OPTIONS'])
def me():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    print(f"👤 Проверка токена: {token[:20]}...")

    user_id = verify_token(token)

    if user_id:
        user = get_user_by_id(user_id)
        if user:
            print(f"✅ Токен действителен для пользователя: {user['email']}")
            return jsonify({
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'full_name': user.get('full_name', user['email'])
                },
                'success': True
            }), 200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            }

    print("❌ Неверный или отсутствующий токен")
    return jsonify({'error': 'Неверный токен', 'success': False}), 401


@app.route('/api/issues', methods=['POST', 'OPTIONS'])
def create_issue():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Требуется авторизация', 'success': False}), 401

    try:
        data = request.json
        print(f"📝 Создание заявки пользователем {user_id}: {data.get('description', '')[:50]}...")

        user = get_user_by_id(user_id)
        if not user:
            user = DEMO_USER

        global next_issue_id
        new_issue = {
            'id': next_issue_id,
            'category': data.get('category', 'other'),
            'status': 'new',
            'description': data.get('description', ''),
            'address': data.get('address', generate_demo_address(data.get('lat', 51.1694), data.get('lng', 71.4491))),
            'lat': data.get('lat', 51.1694),
            'lng': data.get('lng', 71.4491),
            'priority': data.get('priority', 'medium'),
            'user_id': user_id,
            'user_name': user.get('full_name', user['email']),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }

        issues_store.append(new_issue)
        next_issue_id += 1

        print(f"✅ Заявка создана: ID {new_issue['id']}, категория {new_issue['category']}")

        return jsonify({
            'message': 'Проблема создана',
            'issue': new_issue,
            'success': True
        }), 201, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }

    except Exception as e:
        print(f"❌ Ошибка создания заявки: {e}")
        return jsonify({'error': 'Ошибка создания заявки', 'success': False}), 500


@app.route('/api/issues/<int:issue_id>', methods=['PUT', 'OPTIONS'])
def update_issue(issue_id):
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Требуется авторизация', 'success': False}), 401

    try:
        data = request.json
        print(f"✏️  Обновление заявки {issue_id} пользователем {user_id}")

        for issue in issues_store:
            if issue['id'] == issue_id:
                if issue['user_id'] != user_id:
                    return jsonify({'error': 'Нет прав для изменения этой заявки', 'success': False}), 403

                if 'status' in data:
                    issue['status'] = data['status']
                    issue['updated_at'] = datetime.now().isoformat()
                    print(f"✅ Статус заявки {issue_id} изменен на {data['status']}")

                if 'description' in data:
                    issue['description'] = data['description']
                    issue['updated_at'] = datetime.now().isoformat()
                    print(f"✅ Описание заявки {issue_id} обновлено")

                return jsonify({
                    'message': 'Проблема обновлена',
                    'issue': issue,
                    'success': True
                }), 200, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Allow-Methods': 'PUT, OPTIONS'
                }

        return jsonify({'error': 'Заявка не найдена', 'success': False}), 404

    except Exception as e:
        print(f"❌ Ошибка обновления заявки: {e}")
        return jsonify({'error': 'Ошибка обновления заявки', 'success': False}), 500


@app.route('/api/logout', methods=['POST', 'OPTIONS'])
def logout():
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    print("👋 Выход пользователя")
    return jsonify({'message': 'Выход выполнен', 'success': True}), 200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }


# Специальный маршрут для тестирования CORS
@app.route('/api/cors-test', methods=['GET', 'POST', 'OPTIONS'])
def cors_test():
    return jsonify({
        'message': 'CORS работает корректно',
        'method': request.method,
        'origin': request.headers.get('Origin', 'не указан'),
        'success': True
    }), 200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    }


# Маршрут для сброса данных (только для разработки)
@app.route('/api/reset', methods=['POST'])
def reset_data():
    init_data_store()
    return jsonify({
        'message': 'Данные сброшены к начальному состоянию',
        'users': len(users_store),
        'issues': len(issues_store),
        'success': True
    }), 200


# ========== ОБРАБОТКА ОШИБОК ==========

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Маршрут не найден', 'success': False}), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Внутренняя ошибка сервера', 'success': False}), 500


# ========== ЗАПУСК СЕРВЕРА ==========

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("🚀 ASHYQ QALA - ЗАПУСК НА RENDER.COM")
    print("=" * 60)

    print(f"📁 Папка шаблонов: {app.template_folder}")
    print(f"📁 Папка статики: {app.static_folder}")

    if not os.path.exists(app.template_folder):
        print(f"⚠️  Папка шаблонов не найдена: {app.template_folder}")
        os.makedirs(app.template_folder, exist_ok=True)
        print(f"✅ Папка шаблонов создана")

    if not os.path.exists(app.static_folder):
        print(f"⚠️  Папка статики не найдена: {app.static_folder}")
        os.makedirs(app.static_folder, exist_ok=True)
        print(f"✅ Папка статики создана")

    print("\n📊 ИНИЦИАЛИЗАЦИЯ ДАННЫХ:")
    print(f"   👤 Пользователей: {len(users_store)}")
    print(f"   📝 Заявок: {len(issues_store)}")

    print("\n🔑 ДЕМО АККАУНТ:")
    print(f"   Email: {DEMO_USER['email']}")
    print(f"   Пароль: test123")

    print("\n🌐 СЕРВЕР ЗАПУЩЕН:")
    print("   📍 Главная страница: /")
    print("   📍 Личный кабинет: /account")
    print("   📍 API статус: /api/health")
    print("   📍 API тест: /api/test")

    print("\n⚙️  НАСТРОЙКИ CORS:")
    print("   ✅ Разрешены все домены (*)")
    print("   ✅ Поддержка всех методов HTTP")
    print("   ✅ Поддержка заголовков Authorization")

    print("\n🔥 ЗАПУСК СЕРВЕРА FLASK...")

    # Получаем порт из переменной окружения Render.com
    port = int(os.environ.get('PORT', 5000))

    app.run(
        debug=False,  # False для продакшена
        host='0.0.0.0',  # Обязательно для Render.com
        port=port,
        threaded=True
    )