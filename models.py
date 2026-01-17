from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(200), nullable=False)
    full_name = Column(String(100))
    phone = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Связь с проблемами
    issues = relationship('Issue', backref='user', lazy=True)


class Issue(Base):
    __tablename__ = 'issues'

    id = Column(Integer, primary_key=True)
    category = Column(String(50), nullable=False)  # roads, light, trash, eco, safety, other
    status = Column(String(20), default='new')  # new, work, done
    description = Column(Text, nullable=False)
    address = Column(Text)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Внешний ключ на пользователя
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)