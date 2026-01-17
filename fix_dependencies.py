import subprocess
import sys
import os


def run_command(cmd):
    """Выполнить команду и вывести результат"""
    print(f"▶️  Выполняю: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Успешно: {result.stdout}")
            return True
        else:
            print(f"❌ Ошибка: {result.stderr}")
            return False
    except Exception as e:
        print(f"⚠️  Исключение: {e}")
        return False


def main():
    print("🔧 Исправление зависимостей Ashyq Qala...")

    # Обновление pip
    run_command(f"{sys.executable} -m pip install --upgrade pip")

    # Установка зависимостей
    dependencies = [
        "Flask==2.3.3",
        "Flask-CORS==4.0.0",
        "Flask-Bcrypt==1.0.1",
        "Flask-JWT-Extended==4.5.3",
        "SQLAlchemy==2.0.19",
        "python-dotenv==1.0.0",
        "bcrypt==4.1.2"
    ]

    for dep in dependencies:
        run_command(f"{sys.executable} -m pip install {dep}")

    print("\n📋 Проверка установленных пакетов:")
    run_command(f"{sys.executable} -m pip list")

    print("\n✅ Установка завершена!")
    print("🚀 Запустите: python start.py")


if __name__ == "__main__":
    main()