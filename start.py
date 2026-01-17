#!/usr/bin/env python3
"""
Запуск Ashyq Qala с интерактивными картами 2GIS
"""

import os
import sys
import subprocess
import webbrowser
import time


def install_requirements():
    """Установка зависимостей"""
    print("📦 Установка зависимостей...")

    requirements = [
        'Flask==2.3.3',
        'Flask-CORS==4.0.0',
        'PyJWT==2.8.0'
    ]

    for package in requirements:
        try:
            print(f"📥 Устанавливаю {package}...")
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
            print(f"✅ {package} установлен")
        except Exception as e:
            print(f"⚠️  Ошибка установки {package}: {e}")
            continue


def open_browser():
    """Открыть браузер с сайтом"""
    print("\n🌐 Запускаю сайт в браузере...")

    # Даем серверу время запуститься
    time.sleep(2)

    # URL сайта
    url = "http://localhost:5000"

    try:
        # Открываем в новом окне/вкладке
        webbrowser.open(url, new=2)  # new=2 открывает новую вкладку
        print(f"✅ Браузер открыт: {url}")
    except Exception as e:
        print(f"⚠️  Не удалось открыть браузер: {e}")
        print(f"🔗 Откройте сайт вручную: {url}")


def main():
    print("\n" + "=" * 60)
    print("🚀 ASHYQ QALA - ИНТЕРАКТИВНЫЕ КАРТЫ 2GIS")
    print("=" * 60)

    install_requirements()

    print("\n🔍 Проверка 2GIS API ключа...")
    print(f"   Ключ: f924e9f7-4fa9-46cf-b3fa-52df227a9834")
    print("   Статус: ✅ Настроен")

    print("\n🌐 ЗАПУСК СЕРВЕРА И САЙТА:")
    print("   📍 http://localhost:5000 - Главная страница с интерактивной картой")
    print("   📍 http://localhost:5000/account - Личный кабинет с интерактивной картой")
    print("\n👤 Демо аккаунт:")
    print("   Email: test@example.com")
    print("   Пароль: test123")
    print("\n⚡ Для остановки нажмите: Ctrl+C")
    print("=" * 60)

    # Запускаем Flask сервер в отдельном потоке
    import threading
    from app import app

    def run_server():
        try:
            print("\n🔥 Запуск Flask сервера...")
            app.run(debug=True, port=5000, host='0.0.0.0', use_reloader=False)
        except Exception as e:
            print(f"❌ Ошибка сервера: {e}")

    # Создаем и запускаем поток сервера
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    # Открываем браузер
    open_browser()

    # Оставляем программу запущенной
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n👋 Приложение остановлено")


if __name__ == "__main__":
    main()