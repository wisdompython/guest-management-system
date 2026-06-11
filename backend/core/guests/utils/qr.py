import io
import logging
import qrcode
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


def build_qr_payload(guest) -> str:
    event_name = guest.event.name if guest.event else ''
    parts = [str(guest.id), guest.full_name]
    if event_name:
        parts.append(event_name)
    if guest.ticket_type:
        parts.append(guest.ticket_type.upper())
    return '|'.join(parts)


def generate_qr_code(guest) -> bool:
    """
    Generate a QR code for the guest and save it.
    Always black-on-white so the standalone file is universally readable
    (email, print, download). Contrast on the pass is handled at composite time.
    Returns True on success, False on failure (logs the error).
    """
    try:
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=12,
            border=4,
        )
        qr.add_data(build_qr_payload(guest))
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white").convert('RGBA')

        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        filename = f"qr_{guest.id}.png"
        guest.qr_code.save(filename, ContentFile(buffer.read()), save=True)
        return True

    except Exception as exc:
        logger.error("QR generation failed for guest %s: %s", guest.id, exc, exc_info=True)
        return False
