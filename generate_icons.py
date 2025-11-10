#!/usr/bin/env python3
"""Generate modern bookmark icons for Chrome extension."""

def create_png(width, height, filename):
    """Create a modern bookmark icon with gradient and shadow."""
    try:
        from PIL import Image, ImageDraw

        # Create image with transparent background
        img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Calculate proportions
        padding = int(width * 0.15)
        bookmark_width = width - 2 * padding
        bookmark_height = height - 2 * padding

        # Shadow layer (optional for depth)
        shadow_offset = max(1, int(width * 0.02))
        shadow_points = [
            (padding + shadow_offset, padding + shadow_offset),
            (padding + bookmark_width + shadow_offset, padding + shadow_offset),
            (padding + bookmark_width + shadow_offset, padding + bookmark_height - int(bookmark_width * 0.2) + shadow_offset),
            (padding + bookmark_width // 2 + shadow_offset, padding + bookmark_height + shadow_offset),
            (padding + shadow_offset, padding + bookmark_height - int(bookmark_width * 0.2) + shadow_offset),
        ]
        draw.polygon(shadow_points, fill=(0, 0, 0, 30))

        # Main bookmark shape
        points = [
            (padding, padding),  # top-left
            (padding + bookmark_width, padding),  # top-right
            (padding + bookmark_width, padding + bookmark_height - int(bookmark_width * 0.2)),  # right before notch
            (padding + bookmark_width // 2, padding + bookmark_height),  # bottom center (V notch)
            (padding, padding + bookmark_height - int(bookmark_width * 0.2)),  # left before notch
        ]

        # Primary color: Google Blue
        primary_color = (66, 133, 244, 255)
        draw.polygon(points, fill=primary_color)

        # Add highlight for depth (lighter blue on top portion)
        if width >= 48:
            highlight_height = int(bookmark_height * 0.3)
            highlight_points = [
                (padding + 2, padding + 2),
                (padding + bookmark_width - 2, padding + 2),
                (padding + bookmark_width - 2, padding + highlight_height),
                (padding + 2, padding + highlight_height),
            ]
            highlight_color = (99, 159, 255, 100)
            draw.polygon(highlight_points, fill=highlight_color)

        # Add small accent dot/circle in center (for visual interest)
        if width >= 48:
            center_x = padding + bookmark_width // 2
            center_y = padding + bookmark_height // 3
            dot_radius = max(2, int(width * 0.08))
            draw.ellipse(
                [center_x - dot_radius, center_y - dot_radius,
                 center_x + dot_radius, center_y + dot_radius],
                fill=(255, 255, 255, 180)
            )

        img.save(filename, 'PNG')
        print(f"✓ Created {filename} ({width}x{height})")
        return True

    except ImportError:
        print(f"PIL not available, creating minimal PNG for {filename}")
        create_minimal_png(width, height, filename)
        return True

def create_minimal_png(width, height, filename):
    """Create a minimal valid PNG without PIL."""
    import zlib
    import struct

    # PNG signature
    png_signature = b'\x89PNG\r\n\x1a\n'

    # Create RGBA pixel data
    pixels = []
    center_x = width // 2
    center_y = height // 2

    for y in range(height):
        row = [0]  # Filter type
        for x in range(width):
            # Bookmark shape boundaries
            padding = width // 6
            bm_width = width - 2 * padding
            bm_height = height - 2 * padding

            # Check if point is inside bookmark shape
            in_rect = (padding <= x < padding + bm_width and
                      padding <= y < padding + bm_height - bm_width // 4)

            # V-notch at bottom
            notch_y = padding + bm_height - bm_width // 4
            if y > notch_y:
                # Calculate if inside V shape
                rel_y = y - notch_y
                max_rel_y = bm_width // 4
                if rel_y <= max_rel_y:
                    left_bound = padding + (rel_y * bm_width // 2) // max_rel_y
                    right_bound = padding + bm_width - (rel_y * bm_width // 2) // max_rel_y
                    in_notch = left_bound <= x < right_bound
                else:
                    in_notch = False
            else:
                in_notch = False

            if in_rect or in_notch:
                # Google Blue
                row.extend([66, 133, 244, 255])
            else:
                # Transparent
                row.extend([0, 0, 0, 0])
        pixels.append(bytes(row))

    pixel_data = b''.join(pixels)
    compressed = zlib.compress(pixel_data, 9)

    # IHDR chunk
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_chunk = create_chunk(b'IHDR', ihdr)

    # IDAT chunk
    idat_chunk = create_chunk(b'IDAT', compressed)

    # IEND chunk
    iend_chunk = create_chunk(b'IEND', b'')

    # Write PNG
    with open(filename, 'wb') as f:
        f.write(png_signature)
        f.write(ihdr_chunk)
        f.write(idat_chunk)
        f.write(iend_chunk)

    print(f"✓ Created {filename} ({width}x{height})")

def create_chunk(chunk_type, data):
    """Create a PNG chunk."""
    import struct
    import zlib

    length = struct.pack('>I', len(data))
    crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
    return length + chunk_type + data + crc

if __name__ == '__main__':
    import os

    print("🎨 Generating modern bookmark icons...")
    print("   Color: Google Blue (#4285f4)")
    print("   Style: Ribbon bookmark with shadow & highlight\n")

    # Generate icons
    create_png(16, 16, 'icons/icon16.png')
    create_png(48, 48, 'icons/icon48.png')
    create_png(128, 128, 'icons/icon128.png')

    print("\n✨ All icons generated successfully!")
    print("   Refresh your extension to see the new icons.")
