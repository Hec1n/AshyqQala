from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token
from database import db_session
from models import User
from datetime import timedelta

auth_bp = Blueprint('auth', __name__)
bcrypt = Bcrypt()


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    # Валидация
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email и пароль обязательны'}), 400

    # Проверка существования пользователя
    existing_user = db_session.query(User).filter_by(email=data['email']).first()
    if existing_user:
        return jsonify({'error': 'Пользователь уже существует'}), 409

    # Создание нового пользователя
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(
        email=data['email'],
        password=hashed_password,
        full_name=data.get('full_name', ''),
        phone=data.get('phone', '')
    )

    db_session.add(new_user)
    db_session.commit()

    # Создание JWT токена
    access_token = create_access_token(
        identity=str(new_user.id),
        expires_delta=timedelta(days=7)
    )

    return jsonify({
        'message': 'Регистрация успешна',
        'user': {
            'id': new_user.id,
            'email': new_user.email,
            'full_name': new_user.full_name
        },
        'access_token': access_token
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    # Валидация
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email и пароль обязательны'}), 400

    # Поиск пользователя
    user = db_session.query(User).filter_by(email=data['email']).first()

    if not user or not bcrypt.check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Неверные учетные данные'}), 401

    # Создание JWT токена
    access_token = create_access_token(
        identity=str(user.id),
        expires_delta=timedelta(days=7)
    )

    return jsonify({
        'message': 'Вход выполнен',
        'user': {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'phone': user.phone
        },
        'access_token': access_token
    }), 200