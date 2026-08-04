# QAssure.ai - New Machine Setup Guide (Windows/Linux/macOS)

This guide provides step-by-step instructions to set up the QAssure.ai backend on a fresh machine.

## 1. Prerequisites

Before starting, ensure you have the following installed:

- **Node.js**: Version 18.x or higher ([Download](https://nodejs.org/))
- **npm**: Included with Node.js
- **Git**: ([Download](https://git-scm.com/))

---

## 2. Docker Installation & Setup

Docker is required to run the infrastructure dependencies (PostgreSQL, Redis, Kafka, etc.) easily.

### For Windows Users:

Since Docker is not built into Windows, you must install **Docker Desktop**.

1.  **Download**: Get the installer from [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop).
2.  **Enable WSL 2**: During installation, ensure the "Use WSL 2 instead of Hyper-V" option is selected (Recommended for performance).
3.  **Restart**: You may need to restart your computer.
4.  **WSL 2 Kernel Update**: If prompted, follow the link in the Docker popup to update the Linux kernel for WSL 2.
5.  **Settings**: Open Docker Desktop, go to **Settings > General**, and ensure "Use the WSL 2 based engine" is checked.

### For Linux Users:

Follow the [official guide](https://docs.docker.com/engine/install/) for your specific distribution (Ubuntu, Debian, etc.).

---

## 3. Verify Docker Availability

After installation, verify that Docker is running correctly:

1.  **Check Tray Icon**: (Windows/macOS) Ensure the Docker whale icon in the system tray is **Green** (Running).
2.  **Check via Terminal**:
    Open Command Prompt, PowerShell, or Bash and run:

    ```bash
    # Check Docker Engine version
    docker --version

    # Check Docker Compose version
    docker-compose --version

    # Check if Docker daemon is responsive
    docker ps
    ```

    _If `docker ps` returns an error like "Cannot connect to the Docker daemon", ensure Docker Desktop is started._

---

## 4. Quick Start: Running the Backend

Follow these steps to get the application up and running.

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd QAssur-backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Configuration

Copy the template environment file:

```bash
# Windows (Command Prompt)
copy .env.example .env

# Linux / macOS / PowerShell
cp .env.example .env
```

### Step 4: Start Infrastructure (Docker)

This command reads `docker-compose.yml` and starts PostgreSQL, Redis, Kafka, and the QAssure API.

```bash
docker-compose up -d
```

_Wait 30-60 seconds for the databases to fully initialize._

### Step 5: Database Migrations & Seeding

You can run these commands either locally (if Node.js is installed) or directly inside the running Docker container.

#### Method A: Running Locally (Standard)

```bash
# Run migrations
npm run migrate

# Seed initial data
npm run seed
```

#### Method B: Running inside Docker (Recommended for Docker Users)

Since the API is running inside a container named `qassure-api`, you can execute the commands there:

```bash
# Run migrations inside container
docker exec -it qassure-api npm run migrate

# Seed initial data inside container
docker exec -it qassure-api npm run seed
```

### Step 6: Start the Server

If you used `docker-compose up -d`, the server is already running! You can view the logs with:

```bash
docker-compose logs -f api
```

---

## 5. Important Note on Hostnames

The QAssure platform is designed to be "Docker-Aware."

- **If you run locally** (e.g., `npm run dev`), the system uses `localhost` for services as defined in your `.env`.
- **If you run via Docker** (e.g., `docker-compose up`), the `docker-compose.yml` automatically overrides the hostnames to use Docker's internal network names (`postgres`, `redis`, `kafka`).

**Conclusion:** You do **not** need to change the hostnames in your `.env` file when switching between Local and Docker development. Just keep the credentials (usernames/passwords) consistent.

---

## 6. Verification

Check if the server is healthy by visiting:
**[http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)**

You should see a response like:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "components": {
      "database": "healthy",
      "redis": "healthy",
      "kafka": "healthy"
    }
  }
}
```

## Troubleshooting

- **Port 5432 or 6379 already in use**: If you have a local PostgreSQL or Redis installed, either stop them or change the ports in `.env`.
- **Docker Memory**: On Windows, if containers crash, ensure Docker Desktop has at least 4GB of RAM allocated in Settings.
