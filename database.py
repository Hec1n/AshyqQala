from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from models import Base
import os

# Определяем пути
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
data_dir = os.path.join(project_root, 'data')
db_path = os.path.join(data_dir, 'ashyq_qala.db')

# Создаем папку для базы данных
if not os.path.exists(data_dir):
    os.makedirs(data_dir, exist_ok=True)

# Настройка базы данных
engine = create_engine(f'sqlite:///{db_path}', echo=True)
db_session = scoped_session(sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
))


def init_db():
    """Инициализация базы данных"""
    try:
        # Создаем таблицы
        Base.metadata.create_all(bind=engine)
        print("✅ Таблицы базы данных созданы")

        # Проверяем, есть ли пользователи
        from models import User
        import bcrypt

        if db_session.query(User).count() == 0:
            print("📝 База данных пуста, готово к работе")
        else:
            print("✅ База данных уже содержит данные")

        return True

    except Exception as e:
        print(f"⚠️  Ошибка при инициализации БД: {e}")
        return False