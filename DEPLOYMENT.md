# JARVIS Deployment Guide

This guide provides instructions for deploying JARVIS in a production environment using Docker and Nginx.

## Prerequisites
- Docker and Docker Compose installed.
- Domain name (optional, for SSL).
- API keys for AI providers (OpenAI).

## 1. Environment Configuration
Copy the example environment files and update them with your production secrets.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Key variables to update:
- `SECRET_KEY`: Use a long, random string.
- `DATABASE_URL`: Update if using an external database.
- `OPENAI_API_KEY`: Your AI provider key.
- `CORS_ORIGINS`: Set to your frontend domain in production.

## 2. Deploy with Docker Compose
To build and start all services (Frontend, Backend, Databases):

```bash
docker-compose up --build -d
```

### Services Included:
- **Frontend**: React application served by Nginx on port 80.
- **Backend**: FastAPI application on port 8000.
- **Postgres**: Relational database for users and configurations.
- **MongoDB**: Document store for chat history.
- **ChromaDB**: Vector store for long-term memory.

## 3. Nginx Reverse Proxy (Optional)
If you are deploying on a VPS, it's recommended to use Nginx as a reverse proxy with SSL (Let's Encrypt).

Sample Nginx Config for SSL:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 4. Performance Monitoring
- **Backend Logs**: `docker logs -f jarvis-backend`
- **Database Status**: `docker exec -it jarvis-postgres pg_isready`

## 5. Security Checklist
- [ ] Change all default passwords in `docker-compose.yml`.
- [ ] Ensure `.env` files are NOT committed to version control.
- [ ] Restrict `CORS_ORIGINS` in `backend/app/core/config.py`.
- [ ] Set up a firewall (e.g., UFW) to only allow ports 80 and 443.
