# GuestOps

A private-event guest operations platform for WhatsApp-first teams. Covers the full workflow from guest import → branded pass generation → WhatsApp delivery → QR check-in.

Built for event agencies, wedding planners, churches, and corporate brand events in markets where WhatsApp is the primary communication channel.

---

## Features

- **Event management** — create events with ticket categories, required fields, and per-event configuration
- **Guest management** — add guests individually or via CSV bulk upload
- **Branded pass generation** — composite guest QR codes onto custom design templates with configurable zones and typography
- **WhatsApp delivery** — automatically send personalised passes via WhatsApp Business API on guest registration; bulk send and resend flows included
- **QR check-in** — scan QR codes at the door; instant check-in with status tracking
- **Role-based access** — Super Admin, Event Manager, Check-In Staff, Viewer
- **Background workers** — Celery + Redis handles asset generation and WhatsApp sends asynchronously
- **CSV export** — export guest lists filtered by event and status

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 6, Django REST Framework |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Database | SQLite (dev) / PostgreSQL (production) |
| Task queue | Celery 5 + Redis 7 |
| WhatsApp | Meta Cloud API via PyWA |
| Image processing | Pillow, qrcode |

---

## Project Structure

```
guest_management/
├── backend/
│   └── core/
│       ├── accounts/        # Custom user model, roles, permissions
│       ├── guests/          # Events, guests, passes, WhatsApp, tasks
│       │   ├── models.py
│       │   ├── views/       # Split by resource (events, guests, fonts)
│       │   ├── serializers/ # Split by model
│       │   ├── utils/       # QR generation, pass compositing, color helpers
│       │   ├── tasks.py     # Celery tasks
│       │   ├── whatsapp.py  # PyWA client, send_pass, send_message
│       │   └── webhook.py   # Meta webhook handler
│       └── core/
│           └── settings/    # Split settings (base, db, celery, whatsapp, cors)
├── frontend/
│   ├── app/
│   │   ├── admin/           # Dashboard, events, guests, WhatsApp, check-in, users
│   │   └── login/
│   ├── components/          # Shared UI components
│   └── lib/
│       └── api/             # Typed API client split by domain
└── docker-compose.yml       # Redis service
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker (for Redis)

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your values

cd core

# Run migrations
python manage.py migrate

# Create a superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install

# Configure environment
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000/api

npm run dev
```

### Start Redis (required for background tasks)

```bash
# From project root
docker compose up -d
```

### Start Celery Worker

```bash
cd backend/core
celery -A core worker --loglevel=info
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | — |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `DATABASE_ENGINE` | `sqlite` or `postgresql` | `sqlite` |
| `DB_NAME` | PostgreSQL database name | `guest_management` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | — |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000` |
| `CELERY_BROKER_URL` | Redis broker URL | `redis://localhost:6379/0` |
| `WHATSAPP_PHONE_ID` | Meta phone number ID | — |
| `WHATSAPP_TOKEN` | Meta permanent access token | — |
| `WHATSAPP_APP_ID` | Meta app ID | — |
| `WHATSAPP_APP_SECRET` | Meta app secret | — |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token | `guest_management_verify` |
| `WHATSAPP_PASS_TEMPLATE` | Approved Meta template name | `event_pass_delivery` |
| `WHATSAPP_MEDIA_BASE_URL` | Public base URL for pass images | — |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Login |
| POST | `/api/auth/logout/` | Logout |
| GET | `/api/auth/me/` | Current user |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/` | List events |
| POST | `/api/events/` | Create event |
| GET | `/api/events/{id}/` | Get event |
| PATCH | `/api/events/{id}/` | Update event |
| DELETE | `/api/events/{id}/` | Delete event |

### Guests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guests/` | List guests (supports `search`, `status`, `ticket_type`) |
| POST | `/api/guests/` | Create guest (triggers asset generation + WhatsApp send) |
| GET | `/api/guests/{id}/` | Get guest |
| DELETE | `/api/guests/{id}/` | Delete guest |
| POST | `/api/guests/{id}/check_in/` | Check in guest |
| POST | `/api/guests/{id}/regenerate_assets/` | Regenerate QR + pass (queued) |
| POST | `/api/guests/{id}/send_whatsapp/` | Send pass via WhatsApp (queued) |
| POST | `/api/guests/{id}/send_message/` | Send free-form WhatsApp message |
| POST | `/api/guests/bulk-upload/` | CSV bulk upload |
| POST | `/api/guests/bulk_send_whatsapp/` | Bulk send passes (queued) |
| GET | `/api/guests/scan/?token=` | Scan QR token |
| GET | `/api/guests/export/` | Export CSV |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/webhooks/whatsapp/` | Meta WhatsApp webhook |

---

## User Roles

| Role | Permissions |
|------|------------|
| `super_admin` | Full access — users, events, guests, settings |
| `event_manager` | Events and guests — create, edit, delete |
| `check_in_staff` | Check in guests, view lists |
| `viewer` | Read-only access |

---

## WhatsApp Setup

1. Create a Meta Business Account and app at [developers.facebook.com](https://developers.facebook.com)
2. Add the WhatsApp product to your app
3. Register and verify your business phone number
4. Create a message template (category: **Utility**) with:
   - Header: Image
   - Body: `Hi {{1}}, your pass for *{{2}}* is attached. Please show this at the entrance on the day of the event.`
5. Add your credentials to `.env`
6. Register your webhook URL: `https://yourdomain.com/api/webhooks/whatsapp/`
7. Set `WHATSAPP_MEDIA_BASE_URL` to your public domain so Meta can fetch pass images

> **Note:** Pass images must be served from a publicly accessible URL. Use ngrok for local testing.

---

## Pass Design

Each event can have a custom design template (PNG/JPG). The pass designer allows you to:

- Upload a design template
- Draw QR code zone (drag on canvas)
- Draw guest name zone (drag on canvas)
- Configure name font, color, and size
- Set QR background color for contrast on dark templates

Passes are generated by compositing the guest's QR code and name onto the template using Pillow.

---

## Deployment (VPS)

### Stack
- **Nginx** installed on the server — reverse proxy + SSL
- **Docker Compose** for all app containers (backend, frontend, celery, redis, postgres)

### First-time setup

```bash
# 1. Install Docker on the VPS
curl -fsSL https://get.docker.com | sh

# 2. Install Nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# 3. Clone the repo
git clone <repo-url> /opt/guestops
cd /opt/guestops

# 4. Configure environment
cp .env.prod.example .env.prod
# Edit .env.prod — fill in all values, especially SECRET_KEY and DB_PASSWORD

# 5. Configure Nginx
sudo cp nginx/guestops.conf /etc/nginx/sites-available/guestops
sudo ln -s /etc/nginx/sites-available/guestops /etc/nginx/sites-enabled/
# Edit /etc/nginx/sites-available/guestops — replace yourdomain.com with your actual domain
sudo nginx -t && sudo systemctl reload nginx

# 6. Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 7. Build and start containers
docker compose -f docker-compose.prod.yml up -d --build

# 8. Create superuser
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### Updating

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Useful commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f celery

# Run Django management commands
docker compose -f docker-compose.prod.yml exec backend python manage.py <command>

# Restart a single service
docker compose -f docker-compose.prod.yml restart backend
```

### Notes

- `GUNICORN_WORKERS` — set to `(2 × CPU cores) + 1`. For a 2-core VPS use `5`
- Media files (passes, QR codes) are stored in a Docker volume — back this up regularly
- `WHATSAPP_MEDIA_BASE_URL` must match your domain so Meta can fetch pass images

---

## License

Private — all rights reserved.
