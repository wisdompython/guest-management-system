from PIL import ImageDraw, ImageFont


def _parse_color(hex_color: str):
    """Convert a hex color string like #ffffff or #fff to an (R, G, B) tuple."""
    h = hex_color.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    try:
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
    except ValueError:
        return (255, 255, 255)


def _draw_name_in_zone(draw: ImageDraw.ImageDraw, name: str, zone_px: dict,
                       font_path: str | None, font_color: str, font_size: int):
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

    draw.text((x, y), name, font=pil_font, fill=color)
