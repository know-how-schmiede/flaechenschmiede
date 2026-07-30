FROM python:3.12-slim
WORKDIR /app
COPY backend/pyproject.toml backend/pyproject.toml
COPY backend/app backend/app
COPY backend/migrations backend/migrations
COPY backend/alembic.ini backend/alembic.ini
COPY plugins plugins
COPY version.py version.py
RUN pip install --no-cache-dir ./backend
EXPOSE 8000
