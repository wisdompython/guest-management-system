# TWS E-GuestPass

A private-event guest operations platform built for WhatsApp-first markets. Covers the full workflow from guest import → branded pass generation → WhatsApp delivery → QR check-in.

Built for event agencies, wedding planners, churches, and corporate brand events where WhatsApp is the primary communication channel.

---

## Features

### Event Management
- Create and manage events with name, date, venue, and ticket categories
- Mark events as **Ended** / Reopen with a toggle — ended events are visually flagged
- Per-event pass design configuration (template, zones, typography, QR styling)
- Schedule WhatsApp reminder messages per event with configurable lead times

### Guest Management
- Add guests individually or via **CSV bulk upload**
- Event-scoped guest list — select an event first, then view its guests
- Filter and search by name, phone, ticket type, check-in status, WhatsApp status
- Paginated list (50 per page) with first/prev/next/last controls
- Delete guests with confirmation

### Branded Pass Design
- Upload a design template (PNG/JPG) per event
- **Dual-zone canvas** — drag to position the QR code zone and guest name zone independently
- Live **pass preview** tab showing the guest name rendered on the design with the actual selected font
- Configure name font (from uploaded fonts), color, and size (slider + numeric px input)
- Set QR background color with a color picker — for contrast on dark templates
- Passes are generated server-side by compositing QR code and name onto the template using Pillow

### Font Library
- Upload custom fonts (TTF/OTF/WOFF) for use in pass designs
- Fonts are loaded dynamically in the browser for live pass preview using the `FontFace` API

### WhatsApp Delivery
- Passes automatically sent via WhatsApp Business API on guest registration
- **WhatsApp page** — grouped by event (event picker → guest list)
  - Per-guest: Send Pass, Resend (with confirmation), Send custom message (modal)
  - Bulk: **Send to unsent** (queued), **Resend all** (queued)
- Custom message modal with 24-hour session window warning
- WhatsApp send status tracked per guest (Sent / Not sent)
- Webhook integration for delivery status updates
- **Registered template management** — register approved Meta templates with parameter mapping via the Templates admin

### Asset Downloads
- Bulk download of guest assets per event as a ZIP file
- Three modes: **Passes + QR Codes**, **Passes only**, **QR Codes only**
- Files sorted by guest name inside `passes/` and `qr_codes/` folders

### QR Check-in
- Scanner stations page — scan any guest QR code for instant check-in
- Supports full URL, plain UUID, and legacy pipe-delimited QR formats
- Check-in status and timestamp recorded per guest
- Conflict detection — already checked-in guests return 409

### Reminders
- Schedule automated WhatsApp reminder messages per event
- Configurable lead time (hours before event)
- Uses registered Meta templates with per-template parameter mapping
- Reminder log tracks send status per guest per reminder

### CSV Export
- Export guest list filtered by event and/or status
- Streaming CSV response — handles large lists without memory issues

### Team Management (Super Admin)
- Create, edit, and delete user accounts
- Assign roles: Super Admin, Event Manager, Check-In Staff, Viewer
- Login supports username or email

### Role-Based Access Control
| Role | Permissions |
|------|------------|
| `super_admin` | Full access — users, events, guests, settings, templates |
| `event_manager` | Events and guests — create, edit, delete, bulk upload |
| `check_in_staff` | Check in guests, view guest lists |
| `viewer` | Read-only access |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 6, Django REST Framework |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Database | PostgreSQL (production) / SQLite (dev) |
| Task queue | Celery 5 + Redis 7 |
| WhatsApp | Meta Cloud API via PyWA |
| Image processing | Pillow, qrcode |

---

## Project Structure

```
guest_management/
├── backend/
│   └── core/
│       ├── accounts/        # Custom user model, roles, JWT-free session auth
│       ├── guests/          # Events, guests, passes, WhatsApp, reminders
│       │   ├── models.py    # Event, Guest, Font, WhatsAppTemplate, Reminder
│       │   ├── views/       # Split by resource (events, guests, fonts, templates)
│       │   ├── serializers/ # Split by model
│       │   ├── utils/       # QR generation, pass compositing, color helpers
│       │   ├── tasks.py     # Celery tasks (asset generation, WA sends, reminders)
│       │   ├── whatsapp.py  # PyWA client — send_pass, send_message, send_reminder
│       │   └── webhook.py   # Meta webhook handler (delivery status updates)
│       └── core/
│           └── settings/    # Split settings (base, db, celery, whatsapp, cors)
├── frontend/
│   ├── app/
│   │   ├── admin/           # Dashboard, events, guests, WhatsApp, check-in, fonts,
│   │   │                    # reminders, users, templates, profile
│   │   ├── login/
│   │   └── scan/[id]/       # Public QR scan landing page
│   ├── components/
│   │   ├── admin/           # NavSidebar, MobileNav
│   │   ├── events/          # PassDesignSection, QrBgColorPicker, DualZoneCanvas
│   │   ├── guests/          # GuestTable, GuestFilterBar, DownloadAssetsButton
│   │   ├── landing/         # LandingNav, LandingFooter
│   │   └── users/           # UserTable, UserRow, UserFormModal
│   └── lib/
│       └── api/             # Typed API client split by domain (auth, guests, events, …)
├── docker-compose.yml       # Local dev (Redis only)
└── docker-compose.prod.yml  # Production (backend, frontend, celery, redis, postgres)
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker (for Redis in dev, or full stack in prod)

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows
# source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt

cp .env.example .env
# Edit .env with your values

cd core
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install

cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000/api

npm run dev
```

### Start Redis (required for background tasks)

```bash
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
| POST | `/api/auth/login/` | Login (username or email) |
| POST | `/api/auth/logout/` | Logout |
| GET | `/api/auth/me/` | Current user |
| GET | `/api/auth/users/` | List users (super admin) |
| POST | `/api/auth/users/` | Create user |
| PATCH | `/api/auth/users/{id}/` | Update user |
| DELETE | `/api/auth/users/{id}/` | Delete user |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/` | List events |
| POST | `/api/events/` | Create event |
| GET | `/api/events/{id}/` | Get event |
| PATCH | `/api/events/{id}/` | Update event (incl. `is_ended`) |
| DELETE | `/api/events/{id}/` | Delete event |

### Guests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guests/` | List guests (`event`, `search`, `status`, `ticket_type`, `page`) |
| POST | `/api/guests/` | Create guest (triggers asset generation + WhatsApp send) |
| GET | `/api/guests/{id}/` | Get guest |
| PATCH | `/api/guests/{id}/` | Update guest |
| DELETE | `/api/guests/{id}/` | Delete guest |
| POST | `/api/guests/{id}/check_in/` | Check in guest |
| POST | `/api/guests/{id}/regenerate_assets/` | Regenerate QR + pass (queued) |
| POST | `/api/guests/{id}/send_whatsapp/` | Send pass via WhatsApp (queued) |
| POST | `/api/guests/{id}/send_message/` | Send free-form WhatsApp message |
| POST | `/api/guests/bulk-upload/` | CSV bulk upload |
| POST | `/api/guests/bulk_send_whatsapp/` | Bulk send passes for an event (queued) |
| GET | `/api/guests/scan/?token=` | Scan QR token for check-in |
| GET | `/api/guests/export/` | Export CSV |
| GET | `/api/guests/download-assets/` | Download ZIP of passes and/or QR codes |

### Fonts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fonts/` | List uploaded fonts |
| POST | `/api/fonts/` | Upload font file |
| DELETE | `/api/fonts/{id}/` | Delete font |

### Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reminders/` | List reminders for an event |
| POST | `/api/reminders/` | Create reminder |
| PATCH | `/api/reminders/{id}/` | Update reminder |
| DELETE | `/api/reminders/{id}/` | Delete reminder |

### WhatsApp Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/whatsapp-templates/` | List registered templates |
| POST | `/api/whatsapp-templates/` | Register a template |
| PATCH | `/api/whatsapp-templates/{id}/` | Update template |
| DELETE | `/api/whatsapp-templates/{id}/` | Delete template |
| GET | `/api/whatsapp-templates/available-vars/` | List available parameter variables |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/webhooks/whatsapp/` | Meta WhatsApp webhook (verification + delivery status) |

---

## WhatsApp Setup

1. Create a Meta Business Account and app at [developers.facebook.com](https://developers.facebook.com)
2. Add the WhatsApp product to your app
3. Register and verify your business phone number
4. Create a message template (category: **Utility**) with:
   - Header: Image
   - Body: `Hi {{1}}, your guest pass for *{{2}}* is ready. Please present this at the entrance on the day of the event. We look forward to welcoming you!`
5. Wait for Meta approval, then register the template in **Admin → Templates** with its parameter mapping
6. Add your credentials to `.env`
7. Register your webhook URL: `https://yourdomain.com/api/webhooks/whatsapp/`
8. Set `WHATSAPP_MEDIA_BASE_URL` to your public domain so Meta can fetch pass images

> **Note:** Free-form text messages (`send_message`) only work within 24 hours of the guest messaging your business number first (Meta policy). Pass delivery uses approved templates and has no session requirement.

---

## Pass Design

Each event can have a custom pass template. The designer lets you:

- Upload a background design (PNG/JPG)
- **Draw QR zone** — drag on the canvas to position and size the QR code
- **Draw name zone** — drag on the canvas to position the guest name text
- **Preview tab** — live render of name text on the actual design with the selected font, color, and size
- Configure font (from the font library), color (hex picker), and size (slider + px input)
- Set QR background color — useful for dark templates where QR codes need a white backing

Passes are generated server-side by compositing the QR code and guest name onto the template using Pillow.

---

## Deployment (VPS)

### Stack
- **Nginx** on the host — reverse proxy + SSL termination
- **Docker Compose** for all app services (backend, frontend, celery, redis, postgres)

### First-time setup

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Install Nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# 3. Clone the repo
git clone <repo-url> ~/guest-management-system
cd ~/guest-management-system

# 4. Configure environment
cp .env.prod.example .env.prod
# Fill in all values — SECRET_KEY, DB_PASSWORD, WHATSAPP_*, WHATSAPP_MEDIA_BASE_URL

# 5. Configure Nginx
sudo cp nginx/guestops.conf /etc/nginx/sites-available/guestops
sudo ln -s /etc/nginx/sites-available/guestops /etc/nginx/sites-enabled/
# Replace yourdomain.com in the config file
sudo nginx -t && sudo systemctl reload nginx

# 6. Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# 7. Build and start
docker compose -f docker-compose.prod.yml up -d --build

# 8. Run migrations
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 9. Create superuser
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### Updating

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

### Useful commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f celery

# Run a Django management command
docker compose -f docker-compose.prod.yml exec backend python manage.py <command>

# Open a database shell
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d guest_management

# Restart a single service
docker compose -f docker-compose.prod.yml restart backend
```

### Notes

- `GUNICORN_WORKERS` — set to `(2 × CPU cores) + 1`. For a 2-core VPS use `5`
- Media files (passes, QR codes) are stored in a Docker volume — back this up regularly
- `WHATSAPP_MEDIA_BASE_URL` must be your public domain so Meta can fetch pass images for delivery

---

## License

Private — all rights reserved.
