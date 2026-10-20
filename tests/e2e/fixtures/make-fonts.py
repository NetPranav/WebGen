"""Makes the fonts the Phase 38 browser tests measure text with (run: python3 make-fonts.py).
Every glyph is a solid box. In Probe.ttf the letter A is one em wide and every other character half an em; in
Remote.ttf A is two ems wide and every other character a quarter, so which font drew a piece of text can be read off
its width: at 40 px, "AAAA" is 160 px in Probe and 320 px in Remote, and an ordinary fallback font is neither."""
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

def make(path, family, a_width, other_width):
    chars = [chr(c) for c in range(32, 127)]
    names = {c: ("space" if c == " " else "glyph%d" % ord(c)) for c in chars}
    order = [".notdef"] + [names[c] for c in chars]
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({ord(c): names[c] for c in chars})
    glyphs, metrics = {}, {}
    def box(width):
        pen = TTGlyphPen(None)
        pen.moveTo((0, 0)); pen.lineTo((0, 700)); pen.lineTo((width, 700)); pen.lineTo((width, 0)); pen.closePath()
        return pen.glyph()
    glyphs[".notdef"] = box(500); metrics[".notdef"] = (500, 0)
    for c in chars:
        w = a_width if c == "A" else other_width
        if c == " ":
            glyphs[names[c]] = TTGlyphPen(None).glyph(); metrics[names[c]] = (other_width, 0)
        else:
            glyphs[names[c]] = box(w - 100 if w > 100 else w); metrics[names[c]] = (w, 0)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({"familyName": family, "styleName": "Regular"})
    fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    fb.setupPost()
    fb.save(path)

make("Probe.ttf", "Probe", 1000, 500)
make("Remote.ttf", "Remote", 2000, 250)
