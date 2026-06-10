# ─────────────────────────────────────────────────────────────────────────────
#  JARVIS — Just A Rather Very Intelligent System
#  Enterprise-Grade Desktop AI Assistant & Automation Engine
# ─────────────────────────────────────────────────────────────────────────────

JARVIS is a production-ready, multi-agent AI framework designed for high-performance desktop orchestration, personal memory management, and IoT control.

## 🚀 Key Features
- **Nexus-6 Multi-Agent Framework**: Solve complex goals using specialized AI agents (Automation, Research, Coding).
- **Home Assistant & ESP32 Integration**: Control your smart home (Lights, Fans, TV, AC, Locks) with natural language.
- **Multimodal Perception**: Integrated Computer Vision, OCR, and Real-time Voice Cloning.
- **Cognitive Memory**: Persistent vector-based memory for long-term personal context retrieval.
- **Production Optimized**:
  - **Latency**: Reduced via code splitting and efficient async database pooling.
  - **Visuals**: Liquid transitions and responsive loading skeletons using Framer Motion.
  - **Reliability**: Structured logging and global error handling with automatic retry logic.
  - **Security**: Rate limiting (SlowAPI) and secure JWT authentication.

## 🛠️ Tech Stack
- **Frontend**: React (Vite, TypeScript, TailwindCSS, Framer Motion)
- **Backend**: FastAPI (Python 3.12, SQLAlchemy Async, Motor, SlowAPI)
- **Databases**: PostgreSQL 15, MongoDB 7, ChromaDB
- **Deployment**: Docker, Nginx, Multi-stage builds

## ⚡ Quick Start

### 1. Configure Environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

### 2. Run with Docker (Recommended)
```bash
docker-compose up --build
```
Access the application at: `http://localhost`

### 3. Local Development
**Backend:**
```bash
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
**Frontend:**
```bash
cd frontend && npm install
npm run dev
```

## 📖 Documentation
- [Deployment Guide](./DEPLOYMENT.md) - Full production deployment instructions.
- [ESP32 Setup](./hardware/esp32_mqtt.ino) - Hardware integration source code.

## 🗺️ Architecture
```
Project-J/
├── frontend/              # Optimized React + Vite SPA
├── backend/               # FastAPI + Nexus-6 Agent Framework
├── hardware/              # Arduino (ESP32) MQTT bridges
└── docker-compose.yml     # Full-stack orchestration
```

---
© 2024 Stark Industries — INTEGRATED SYSTEM OPERATIONAL
