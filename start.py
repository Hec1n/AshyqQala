#!/usr/bin/env python3
"""
Ashyq Qala - Запуск на Render.com
"""

import os
import sys
import subprocess
import signal
import atexit
from threading import Thread
import time

# Конфигурация для Render
PORT = int(os.environ.get('PORT', 10000))
HOST = '0.0.0.0'
DEBUG = os.environ.get('DEBUG', 'false').lower() == 'true'

# Глобальные переменные для управления процессами
gunicorn_process = None
static_server = None


def cleanup():
    """Очистка процессов при завершении"""
    print("\n🧹 Очистка процессов...")

    if gunicorn_process:
        print("Останавливаю Gunicorn...")
        gunicorn_process.terminate()
        gunicorn_process.wait(timeout=5)

    if static_server:
        print("Останавливаю статический сервер...")
        static_server.terminate()
        static_server.wait(timeout=5)


def signal_handler(sig, frame):
    """Обработчик сигналов"""
    print(f"\n📴 Получен сигнал {sig}, завершаю работу...")
    cleanup()
    sys.exit(0)


def check_dependencies():
    """Проверка и установка зависимостей"""
    print("🔍 Проверка зависимостей...")

    # Базовые зависимости для Flask приложения
    dependencies = [
        'Flask==2.3.3',
        'Flask-CORS==4.0.0',
        'PyJWT==2.8.0',
        'requests==2.31.0'
    ]

    for dep in dependencies:
        try:
            # Проверяем, установлен ли пакет
            __import__(dep.split('==')[0].lower().replace('-', '_'))
            print(f"✅ {dep.split('==')[0]} уже установлен")
        except ImportError:
            print(f"📦 Устанавливаю {dep}...")
            try:
                subprocess.check_call([sys.executable, '-m', 'pip', 'install', dep, '--quiet'])
                print(f"✅ {dep} установлен")
            except Exception as e:
                print(f"⚠️  Ошибка установки {dep}: {e}")


def create_render_config():
    """Создание конфигурационных файлов для Render"""

    # Проверяем существование необходимых папок
    folders = ['static', 'templates']
    for folder in folders:
        if not os.path.exists(folder):
            print(f"📁 Создаю папку {folder}...")
            os.makedirs(folder, exist_ok=True)

    # Создаем минимальный requirements.txt если его нет
    if not os.path.exists('requirements.txt'):
        print("📝 Создаю requirements.txt...")
        with open('requirements.txt', 'w', encoding='utf-8') as f:
            f.write("""Flask==2.3.3
Flask-CORS==4.0.0
PyJWT==2.8.0
requests==2.31.0
gunicorn==21.2.0
""")

    # Создаем runtime.txt если нужна конкретная версия Python
    if not os.path.exists('runtime.txt'):
        print("📝 Создаю runtime.txt...")
        with open('runtime.txt', 'w', encoding='utf-8') as f:
            f.write("python-3.11.0\n")

    # Создаем .env файл если его нет
    if not os.path.exists('.env'):
        print("📝 Создаю .env файл...")
        with open('.env', 'w', encoding='utf-8') as f:
            f.write(f"""SECRET_KEY=ashyq-qala-secret-key-{int(time.time())}
DEBUG=false
PORT={PORT}
API_URL=https://{os.environ.get('RENDER_SERVICE_NAME', 'ashyq-qala')}.onrender.com/api
""")

    # Копируем необходимые файлы если их нет
    files_to_check = [
        ('app.py', '''from flask import Flask, render_template, send_from_directory, jsonify, request
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
SECRET_KEY = os.environ.get('SECRET_KEY', 'ashyq-qala-secret-key-2026')

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
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
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
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
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
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
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

if __name__ == '__main__':
    print("🚀 Запуск Ashyq Qala на Render.com")
    print(f"📍 Порт: {PORT}")
    print(f"📍 Хост: {HOST}")
    print(f"📍 Режим отладки: {DEBUG}")

    app.run(debug=DEBUG, port=PORT, host=HOST)
'''),
        ('index.html', '''<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ashyq Qala - Главная</title>
  <link rel="stylesheet" href="/static/styles.css" />
</head>
<body>
  <header class="header" id="home">
    <nav class="menu-box">
      <a class="menu-name" href="#home" aria-label="Ashyq Qala">
        <img src="/static/logo.png" alt="Ashyq Qala" width="78" />
      </a>
      <ul class="menu">
        <li class="menu-item"><a href="#home">Главная</a></li>
        <li class="menu-item"><a href="#mapBlock">Карта</a></li>
        <li class="menu-item"><a href="#services">Возможности</a></li>
        <li class="menu-item"><a href="#stats">Статистика</a></li>
        <li class="menu-item"><a href="#faq">FAQ</a></li>
        <li class="menu-item" id="authMenuItems"></li>
      </ul>
    </nav>

    <div class="hero">
      <div class="hero-content">
        <strong class="name">Ashyq Qala</strong>
        <p class="slogan">Отмечай проблемы. Следи за решением. Улучшай город.</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-pulse" href="#mapBlock">Посмотреть проблемы</a>
        </div>
      </div>
    </div>
  </header>

  <main class="main">
    <section class="section" id="mapBlock">
      <div class="container">
        <h1 class="section-title">Карта проблем города</h1>
        <p class="section-subtitle">Все заявки граждан на одной карте</p>
        <div id="mainMap" class="map-canvas"></div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="footer-container">
      <div class="footer-brand">
        <div class="footer-logo">
          <img src="/static/aqlogo.png" alt="aqlogo">
          <span class="logo-text">Ashyq Qala</span>
        </div>
        <p class="footer-desc">Платформа коллективного решения городских проблем</p>
      </div>
      <div class="footer-bottom">© 2026 Ashyq Qala. Все права защищены.</div>
    </div>
  </footer>

  <script src="/static/common.js"></script>
  <script src="/static/main.js"></script>
</body>
</html>'''),
        ('account.html', '''<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ashyq Qala - Личный кабинет</title>
  <link rel="stylesheet" href="/static/styles.css" />
</head>
<body class="account-page">
  <header class="header">
    <nav class="menu-box">
      <a class="menu-name" href="/" aria-label="Ashyq Qala">
        <img src="/static/logo.png" alt="Ashyq Qala" width="78" />
      </a>
      <ul class="menu">
        <li class="menu-item"><a href="/">Главная</a></li>
        <li class="menu-item" id="authMenuItems"></li>
      </ul>
    </nav>

    <div class="account-hero">
      <div class="container">
        <div class="account-welcome">
          <h1>Личный кабинет</h1>
          <p id="userGreeting">Добро пожаловать!</p>
        </div>
      </div>
    </div>
  </header>

  <main class="main">
    <section class="section" id="dashboard">
      <div class="container">
        <h1 class="section-title">Панель управления</h1>
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-content">
              <h3>Всего заявок</h3>
              <p class="stat-count" id="statTotal">0</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="/static/common.js"></script>
  <script src="/static/account.js"></script>
</body>
</html>'''),
    ]

    for filename, content in files_to_check:
        if not os.path.exists(filename):
            print(f"📝 Создаю {filename}...")
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)


def run_gunicorn():
    """Запуск Gunicorn сервера"""
    global gunicorn_process

    print(f"🚀 Запуск Gunicorn на порту {PORT}...")

    # Команда для запуска Gunicorn
    cmd = [
        'gunicorn',
        '--bind', f'{HOST}:{PORT}',
        '--workers', '2',
        '--threads', '4',
        '--timeout', '120',
        '--access-logfile', '-',
        '--error-logfile', '-',
        'app:app'
    ]

    if DEBUG:
        cmd.extend(['--reload', '--log-level', 'debug'])

    try:
        gunicorn_process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        # Вывод логов в реальном времени
        def log_output():
            for line in iter(gunicorn_process.stdout.readline, ''):
                print(f"🌐 {line.strip()}")

        log_thread = Thread(target=log_output, daemon=True)
        log_thread.start()

        return True

    except Exception as e:
        print(f"❌ Ошибка запуска Gunicorn: {e}")
        return False


def run_dev_server():
    """Запуск Flask сервера для разработки"""
    print(f"🚀 Запуск Flask сервера на порту {PORT}...")

    from app import app

    try:
        app.run(
            host=HOST,
            port=PORT,
            debug=DEBUG,
            use_reloader=False
        )
        return True
    except Exception as e:
        print(f"❌ Ошибка запуска Flask: {e}")
        return False


def main():
    """Основная функция запуска"""
    print("\n" + "=" * 60)
    print("🚀 ASHYQ QALA - ЗАПУСК НА RENDER.COM")
    print("=" * 60)

    # Регистрируем обработчики сигналов
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    atexit.register(cleanup)

    # Проверяем переменные окружения
    print("\n🔧 Конфигурация:")
    print(f"   📍 PORT: {PORT}")
    print(f"   📍 HOST: {HOST}")
    print(f"   📍 DEBUG: {DEBUG}")
    print(f"   📍 Python: {sys.version}")

    # Создаем конфигурацию
    create_render_config()

    # Проверяем зависимости
    check_dependencies()

    # Запускаем сервер
    print("\n🌐 ЗАПУСК СЕРВЕРА...")

    # Проверяем наличие Gunicorn
    try:
        import gunicorn
        print("✅ Gunicorn найден, запускаю через Gunicorn...")
        success = run_gunicorn()
    except ImportError:
        print("⚠️  Gunicorn не найден, запускаю через Flask...")
        success = run_dev_server()

    if success:
        print(f"\n✅ СЕРВЕР ЗАПУЩЕН УСПЕШНО!")
        print(f"📍 URL: http://{HOST}:{PORT}")
        print(f"📍 API: http://{HOST}:{PORT}/api/health")
        print(f"📍 Демо аккаунт: test@example.com / test123")
        print("\n⚡ Для остановки нажмите Ctrl+C")
        print("=" * 60)

        # Бесконечный цикл для поддержания работы
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n👋 Приложение остановлено")
    else:
        print("❌ Не удалось запустить сервер")
        sys.exit(1)


if __name__ == "__main__":
    main()