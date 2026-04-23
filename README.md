# Nexus-Stream: High-Performance Logistics Analytics

Nexus-Stream is a multi-service data pipeline designed to track and visualize real-time events. It features a C++ high-speed processing engine, a FastAPI backend, and a Next.js analytics dashboard, all orchestrated via Docker.

## 🚀 System Architecture


* **API (Python/FastAPI):** Ingests tracking events and validates authentication.
* **Queue (Redis):** Acts as a high-speed buffer between the API and the processor.
* **Cruncher (C++):** A high-performance worker that bridges Redis data to PostgreSQL using batch processing.
* **Dashboard (Next.js/Tailwind):** Provides real-time visualization of tenant activity.

## 🛠️ Tech Stack
* **Backend:** Python 3.10, FastAPI, SQLAlchemy
* **Processing:** C++ (GCC), Redis-plus-plus, libpqxx
* **Database:** PostgreSQL 15, Redis (Alpine)
* **Frontend:** Next.js 14, TypeScript, Recharts
* **DevOps:** Docker, Docker Compose

## 📦 Setup & Installation

### 1. Prerequisites
* Docker Desktop installed and running.
* Ensure local ports `8000`, `3000`, `5432`, and `6379` are not in use by other applications.

### 2. Environment Configuration
Create a `.env` file in the root directory and add your credentials:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=postgres
REDIS_HOST=redis
API_KEY=nexus_secret_123
```
### 3. Launch the Stack
Bash
`docker-compose up -d --build`
### 4. Database Initialization (Required)
Because the database starts empty, you must initialize the analytics table:
Bash
```
docker exec -it nexus-stream-db-1 psql -U postgres -d postgres -c "CREATE TABLE IF NOT EXISTS tenant_analytics (tenant_id INTEGER PRIMARY KEY, total_events INTEGER DEFAULT 0, last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"
```
📈 Usage
Putting Load (Stress Test)
You can use the provided Python script to flood the system with events and watch the C++ cruncher handle the load:
Bash
```
python tests/load_test.py
```
Accessing the Dashboard
Open your browser and navigate to:
```
Dashboard: http://localhost:3000
```
API Documentation (Swagger):
```
http://localhost:8000/docs
```
---

## 🔗 Connect & LinksPlatformLinkGitHubgithub.com/Shaimo-CoreGamesDocker Hubhub.docker.com/u/shaimocoregamesLinkedInShah Meer - Professional Profile
