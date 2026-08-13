import os

# ---------------------------------------------------------------------------
# WhatsApp — Meta Cloud API via PyWA (populated via .env)
# ---------------------------------------------------------------------------
WHATSAPP_PHONE_ID      = os.environ.get('WHATSAPP_PHONE_ID', '')
WHATSAPP_TOKEN         = os.environ.get('WHATSAPP_TOKEN', '')
WHATSAPP_APP_ID        = os.environ.get('WHATSAPP_APP_ID', '')
WHATSAPP_APP_SECRET    = os.environ.get('WHATSAPP_APP_SECRET', '')
WHATSAPP_VERIFY_TOKEN  = os.environ.get('WHATSAPP_VERIFY_TOKEN', 'guest_management_verify')
# Name of the approved Meta message template to use for pass delivery
WHATSAPP_PASS_TEMPLATE  = os.environ.get('WHATSAPP_PASS_TEMPLATE', 'event_pass_delivery')
# Public base URL for media files — must be accessible by Meta (no trailing slash)
WHATSAPP_MEDIA_BASE_URL = os.environ.get('WHATSAPP_MEDIA_BASE_URL', '')
# Meta messaging tier: unique users this number may open business-initiated
# conversations with per rolling 24h window. Dispatchers stop queueing new
# template sends at this count and resume automatically as the window rolls
# over. Set this to your WhatsApp Business account's current tier.
WHATSAPP_DAILY_SEND_LIMIT = int(os.environ.get('WHATSAPP_DAILY_SEND_LIMIT', '2000'))
