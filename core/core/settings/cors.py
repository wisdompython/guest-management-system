import os

# ---------------------------------------------------------------------------
# CORS — allow Next.js dev server (ports 3000 and 3001)
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,'
    'http://localhost:3001,http://127.0.0.1:3001,'
    'http://localhost:3003,http://127.0.0.1:3003'
).split(',')

CORS_ALLOW_CREDENTIALS = True

# Trusted origins for CSRF (needed for POST/PUT/DELETE from browser)
CSRF_TRUSTED_ORIGINS = os.environ.get(
    'CSRF_TRUSTED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,'
    'http://localhost:3001,http://127.0.0.1:3001,'
    'http://localhost:3003,http://127.0.0.1:3003'
).split(',')
