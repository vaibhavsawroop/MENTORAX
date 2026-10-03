"""Renders the MentoraX email header lockup (logo tile + Syne wordmark + tagline).

Why an image instead of live text
---------------------------------
The header used to be HTML: the logo in a rounded tile, the "MENTORAX" wordmark
in Syne loaded from Google Fonts, and the tagline as text. Mail clients either
block the webfont request (so the wordmark silently fell back to a system face)
or download it after first paint, which is exactly the "loading" flash the user
wanted gone. One small PNG carries the exact letterforms, renders instantly and
identically in every client, and removes the render-blocking font request.

The canvas is painted on the card colour (#0c0b16) rather than transparency so
dark-mode clients that ignore our background cannot show a white halo behind
the tile.

Layout is measured, never guessed: text is advanced character by character
(Pillow has no letter-spacing) and the canvas width is computed from the widest
line, so nothing can clip at the right edge again.

`scripts/assets/syne-800-subset.ttf` is a tiny subset of Syne ExtraBold (SIL
Open Font License) containing only the glyphs used here, so the generator stays
reproducible without shipping the full family. Re-subset it with:

  py -m fontTools.subset <full-syne-800.ttf> \
     --text="MENTORAX SCIENCE OF A CLEAR PATH" --output-file=scripts/assets/syne-800-subset.ttf

Run from anywhere:  py scripts/render-email-wordmark.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_PATH = ROOT / "scripts" / "assets" / "syne-800-subset.ttf"
LOGO_PATH = ROOT / "public" / "logo.png"
OUT_DIR = ROOT / "public" / "assets" / "email"

SCALE = 2                      # rendered at 2x, displayed at half size
CARD = (12, 11, 22)            # #0c0b16 — the email card colour
TEXT = (244, 241, 236)         # --ink
LILAC = (155, 138, 255)        # --lilac
MUTED = (168, 163, 187)        # --ink-soft

# Display values the email previously used, kept so the baked lockup matches
# the hand-built header it replaces (tile 46px, wordmark 25px, tagline 10px).
TILE = 46 * SCALE
TILE_Y = 8
TEXT_X = TILE + 14 * SCALE
WORD_SIZE = 25 * SCALE
WORD_TRACKING_EM = -0.03       # matches the CSS wordmark
WORD_CAP_TOP = 20
TAG_SIZE = 10 * SCALE
TAG_TRACKING_EM = 0.16         # slightly tighter than 0.18em to stay compact
TAG_CAP_TOP = 72
TAG_TEXT = "SCIENCE OF A CLEAR PATH"

out = OUT_DIR
out.mkdir(parents=True, exist_ok=True)

word_font = ImageFont.truetype(str(FONT_PATH), WORD_SIZE)
tag_font = ImageFont.truetype(str(FONT_PATH), TAG_SIZE)


def cap_height(font: ImageFont.FreeTypeFont, sample: str = "M") -> float:
    """Pixels from the baseline up to the cap top — lets us position by eye."""
    ascent, _descent = font.getmetrics()
    bbox = font.getbbox(sample)          # default anchor: left/ascender
    return ascent - bbox[1]


def tracked_width(font: ImageFont.FreeTypeFont, text: str, tracking: float) -> float:
    return sum(font.getlength(c) for c in text) + tracking * (len(text) - 1)


def draw_tracked(draw: ImageDraw.ImageDraw, xy, text, font, fills, tracking):
    """Pillow has no letter-spacing; advance manually. `fills` may be per char."""
    x, y = xy
    for ch, fill in zip(text, fills):
        draw.text((x, y), ch, font=font, fill=fill, anchor="ls")
        x += font.getlength(ch) + tracking


word_tracking = WORD_TRACKING_EM * WORD_SIZE
tag_tracking = TAG_TRACKING_EM * TAG_SIZE
word_w = tracked_width(word_font, "MENTORAX", word_tracking)
tag_w = tracked_width(tag_font, TAG_TEXT, tag_tracking)

# Height stays fixed (the tile dominates); width follows the widest line.
H = TILE + TILE_Y * 2                                        # 108 → 54 display
W = int(TEXT_X + max(word_w, tag_w) + 8 * SCALE) + 1         # + margin, odd→even
W += W % 2

canvas = Image.new("RGB", (W, H), CARD)
draw = ImageDraw.Draw(canvas)

# ── logo tile ────────────────────────────────────────────────────────────
logo = Image.open(LOGO_PATH).convert("RGB").resize((TILE, TILE), Image.LANCZOS)
mask = Image.new("L", (TILE, TILE), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, TILE - 1, TILE - 1), radius=12 * SCALE, fill=255)
canvas.paste(logo, (0, TILE_Y), mask)

# ── wordmark: MENTORA in ink, X in lilac ─────────────────────────────────
word_baseline = WORD_CAP_TOP + cap_height(word_font)
draw_tracked(
    draw,
    (TEXT_X, word_baseline),
    "MENTORAX",
    word_font,
    [TEXT] * 7 + [LILAC],
    word_tracking,
)

# ── tagline ──────────────────────────────────────────────────────────────
tag_baseline = TAG_CAP_TOP + cap_height(tag_font, "S")
draw_tracked(draw, (TEXT_X, tag_baseline), TAG_TEXT, tag_font, [MUTED] * len(TAG_TEXT), tag_tracking)

path = out / "wordmark.png"
canvas.save(path, "PNG", optimize=True)
print(f"wrote {path}")
print(f"  canvas {W}x{H}  display {W // SCALE}x{H // SCALE}  ({path.stat().st_size / 1024:.1f} KB)")
print(f"  wordmark {word_w:.1f}px  tagline {tag_w:.1f}px  right margin {W - TEXT_X - max(word_w, tag_w):.1f}px")
