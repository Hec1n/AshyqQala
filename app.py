from flask import Flask, render_template, send_from_directory, jsonify, request
from flask_cors import CORS
import os
from datetime import datetime, timedelta
import jwt
import hashlib

current_dir = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__,
            static_folder=os.path.join(current_dir, 'static'),
            template_folder=os.path.join(current_dir, 'templates'))

CORS(app)

# Секретный ключ для JWT
SECRET_KEY = 'ashyq-qala-secret-key-2026'

# Хранилище пользователей и заявок
users_store = {}
issues_store = []
next_issue_id = 1

# Демо-пользователь по умолчанию
DEMO_USER = {
    'id': 1,
    'email': 'test@example.com',
    'full_name': 'Тестовый Пользователь',
    'password_hash': hashlib.sha256('test123'.encode()).hexdigest()
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
    }
]

# Инициализация хранилищ
users_store[DEMO_USER['email']] = DEMO_USER
issues_store.extend(DEMO_ISSUES)
next_issue_id = len(issues_store) + 1

# ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

def create_token(user_id):
    """Создание JWT токена"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_token(token):
    """Проверка JWT токена"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except:
        return None

def hash_password(password):
    """Хеширование пароля"""
    return hashlib.sha256(password.encode()).hexdigest()

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
    return jsonify({'status': 'ok', 'time': datetime.now().isoformat()})

@app.route('/api/test')
def test():
    return jsonify({
        'message': 'API работает',
        'time': datetime.now().isoformat()
    })

# API для заявок
@app.route('/api/issues')
def get_issues():
    """Получение всех заявок"""
    user_only = request.args.get('user_only', 'false').lower() == 'true'
    token = request.headers.get('Authorization', '').replace('Bearer ', '')

    issues = issues_store
    if user_only and token:
        user_id = verify_token(token)
        if user_id:
            issues = [issue for issue in issues_store if issue.get('user_id') == user_id]

    return jsonify({
        'issues': issues,
        'total': len(issues),
        'success': True
    })

@app.route('/api/issues/stats')
def get_stats():
    """Статистика по заявкам"""
    total = len(issues_store)
    new = len([i for i in issues_store if i['status'] == 'new'])
    work = len([i for i in issues_store if i['status'] == 'work'])
    done = len([i for i in issues_store if i['status'] == 'done'])

    categories = {}
    for issue in issues_store:
        cat = issue['category']
        categories[cat] = categories.get(cat, 0) + 1

    return jsonify({
        'total': total,
        'new': new,
        'work': work,
        'done': done,
        'categories': categories,
        'success': True
    })

# API аутентификации
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json

    if not data.get('email') or not data.get('password') or not data.get('full_name'):
        return jsonify({'error': 'Все поля обязательны', 'success': False}), 400

    if data['email'] in users_store:
        return jsonify({'error': 'Пользователь уже существует', 'success': False}), 400

    new_user = {
        'id': len(users_store) + 1,
        'email': data['email'],
        'password_hash': hash_password(data['password']),
        'full_name': data['full_name'],
        'created_at': datetime.now().isoformat()
    }

    users_store[data['email']] = new_user

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
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json

    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email и пароль обязательны', 'success': False}), 400

    # Проверяем демо пользователя
    if data['email'] == DEMO_USER['email']:
        if hashlib.sha256(data['password'].encode()).hexdigest() == DEMO_USER['password_hash']:
            token = create_token(DEMO_USER['id'])
            return jsonify({
                'message': 'Вход выполнен',
                'user': {
                    'id': DEMO_USER['id'],
                    'email': DEMO_USER['email'],
                    'full_name': DEMO_USER['full_name']
                },
                'access_token': token,
                'success': True
            })

    # Проверяем обычных пользователей
    user = users_store.get(data['email'])
    if user and user['password_hash'] == hash_password(data['password']):
        token = create_token(user['id'])
        return jsonify({
            'message': 'Вход выполнен',
            'user': {
                'id': user['id'],
                'email': user['email'],
                'full_name': user['full_name']
            },
            'access_token': token,
            'success': True
        })

    return jsonify({'error': 'Неверный email или пароль', 'success': False}), 401

@app.route('/api/me')
def me():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if user_id:
        if user_id == DEMO_USER['id']:
            return jsonify({
                'user': {
                    'id': DEMO_USER['id'],
                    'email': DEMO_USER['email'],
                    'full_name': DEMO_USER['full_name']
                },
                'success': True
            })

        for user in users_store.values():
            if user['id'] == user_id:
                return jsonify({
                    'user': {
                        'id': user['id'],
                        'email': user['email'],
                        'full_name': user.get('full_name', user['email'])
                    },
                    'success': True
                })

    return jsonify({'error': 'Неверный токен', 'success': False}), 401

@app.route('/api/issues', methods=['POST'])
def create_issue():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Требуется авторизация', 'success': False}), 401

    data = request.json

    user = None
    if user_id == DEMO_USER['id']:
        user = DEMO_USER
    else:
        for u in users_store.values():
            if u['id'] == user_id:
                user = u
                break

    if not user:
        user = DEMO_USER

    global next_issue_id
    new_issue = {
        'id': next_issue_id,
        'category': data.get('category', 'other'),
        'status': 'new',
        'description': data.get('description', ''),
        'address': data.get('address', 'Не указан'),
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

    return jsonify({
        'message': 'Проблема создана',
        'issue': new_issue,
        'success': True
    }), 201

@app.route('/api/issues/<int:issue_id>', methods=['PUT'])
def update_issue(issue_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Требуется авторизация', 'success': False}), 401

    data = request.json

    for issue in issues_store:
        if issue['id'] == issue_id:
            if issue['user_id'] != user_id:
                return jsonify({'error': 'Нет прав для изменения этой заявки', 'success': False}), 403

            if 'status' in data:
                issue['status'] = data['status']
                issue['updated_at'] = datetime.now().isoformat()
            if 'description' in data:
                issue['description'] = data['description']
                issue['updated_at'] = datetime.now().isoformat()

            return jsonify({
                'message': 'Проблема обновлена',
                'issue': issue,
                'success': True
            })

    return jsonify({'error': 'Заявка не найдена', 'success': False}), 404

@app.route('/api/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Выход выполнен', 'success': True})

# ========== ЗАПУСК СЕРВЕРА ==========

if __name__ == '__main__':
    print(f"📁 Папка шаблонов: {app.template_folder}")
    print(f"📁 Папка статики: {app.static_folder}")

    if not os.path.exists(app.template_folder):
        print(f"⚠️  Папка шаблонов не найдена: {app.template_folder}")
        os.makedirs(app.template_folder, exist_ok=True)

    if not os.path.exists(app.static_folder):
        print(f"⚠️  Папка статики не найдена: {app.static_folder}")
        os.makedirs(app.static_folder, exist_ok=True)

    print("\n🌐 СЕРВЕР ЗАПУЩЕН ПО АДРЕСАМ:")
    print("   📍 http://localhost:5000 - Главная страница с интерактивной картой")
    print("   📍 http://localhost:5000/account - Личный кабинет с интерактивной картой")
    print("\n👤 Демо аккаунт:")
    print("   Email: test@example.com")
    print("   Пароль: test123")
    print("\n🚀 Запуск сервера Flask...")

    app.run(debug=True, port=5000, host='0.0.0.0')