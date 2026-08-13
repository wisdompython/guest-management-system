from PIL import ImageDraw, ImageFont, ImageStat


def _parse_color(hex_color: str):
    """Convert a hex color string like #ffffff or #fff to an (R, G, B) tuple."""
    h = hex_color.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    try:
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    except ValueError:
        return (255, 255, 255)


def _relative_luminance(rgb) -> float:
    """Return WCAG relative luminance for an RGB colour."""
    channels = []
    for value in rgb[:3]:
        channel = value / 255
        channels.append(
            channel / 12.92
            if channel <= 0.04045
            else ((channel + 0.055) / 1.055) ** 2.4
        )
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]


def _contrast_ratio(first, second) -> float:
    lighter, darker = sorted(
        (_relative_luminance(first), _relative_luminance(second)),
        reverse=True,
    )
    return (lighter + 0.05) / (darker + 0.05)


def _average_zone_color(image, zone_px: dict):
    """Estimate the background colour beneath a configured text zone."""
    left = max(0, zone_px['x'])
    top = max(0, zone_px['y'])
    right = min(image.width, left + max(1, zone_px['w']))
    bottom = min(image.height, top + max(1, zone_px['h']))
    if right <= left or bottom <= top:
        return None
    mean = ImageStat.Stat(image.crop((left, top, right, bottom)).convert('RGB')).mean
    return tuple(round(value) for value in mean[:3])


def _draw_name_in_zone(draw: ImageDraw.ImageDraw, name: str, zone_px: dict,
                       font_path: str | None, font_color: str, font_size: int,
                       background_color=None):
    """
    Draw `name` centred inside zone_px (keys: x, y, w, h in pixels).
    Shrinks font size until the text fits horizontally.
    """
    color = _parse_color(font_color)
    zone_w = zone_px['w']
    zone_h = zone_px['h']

    # Try loading the custom font; fall back to PIL's built-in bitmap font
    def load_font(size):
        if font_path:
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                pass
        try:
            return ImageFont.load_default(size=size)
        except TypeError:
            return ImageFont.load_default()

    # Shrink until the name fits within zone width
    size = max(font_size, 8)
    pil_font = load_font(size)
    bbox = pil_font.getbbox(name)
    text_w = bbox[2] - bbox[0]
    while text_w > zone_w * 0.95 and size > 8:
        size -= 2
        pil_font = load_font(size)
        bbox = pil_font.getbbox(name)
        text_w = bbox[2] - bbox[0]

    text_h = bbox[3] - bbox[1]

    # Centre the text inside the zone box
    x = zone_px['x'] + (zone_w - text_w) / 2 - bbox[0]
    y = zone_px['y'] + (zone_h - text_h) / 2 - bbox[1]

    text_options = {}
    if background_color and _contrast_ratio(color, background_color) < 3:
        # Preserve the selected colour, but outline it when the uploaded
        # artwork would otherwise make the name effectively invisible.
        text_options = {
            'stroke_width': max(1, min(4, round(size * 0.045))),
            'stroke_fill': (18, 18, 18) if _relative_luminance(color) > 0.45 else (255, 255, 255),
        }
    draw.text((x, y), name, font=pil_font, fill=color, **text_options)
