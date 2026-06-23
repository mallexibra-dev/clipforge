from clipper import (
    AVAILABLE_FONTS,
    CaptionStyle,
    _hex_to_ass_color,
    build_subtitle_style,
)


def test_hex_to_ass_color_basic():
    # ASS uses &HAABBGGRR. White stays white, alpha 00.
    assert _hex_to_ass_color("#FFFFFF") == "&H00FFFFFF"
    # Pure red -> BGR puts red last.
    assert _hex_to_ass_color("#FF0000") == "&H000000FF"
    # Pure blue -> blue first.
    assert _hex_to_ass_color("#0000FF") == "&H00FF0000"


def test_hex_to_ass_color_shorthand():
    assert _hex_to_ass_color("#FFF") == "&H00FFFFFF"


def test_hex_to_ass_color_invalid_falls_back():
    assert _hex_to_ass_color("nonsense") == "&H00FFFFFF"


def test_build_subtitle_style_center_default():
    style = build_subtitle_style(CaptionStyle())
    assert "Alignment=5" in style  # middle-center
    assert "FontName=DejaVu Sans" in style
    assert "FontSize=30" in style


def test_build_subtitle_style_bottom():
    style = build_subtitle_style(CaptionStyle(position="bottom"))
    assert "Alignment=2" in style
    assert "MarginV=90" in style


def test_build_subtitle_style_font_whitelist():
    style = build_subtitle_style(CaptionStyle(font_family="Liberation Serif"))
    assert "FontName=Liberation Serif" in style
    # Unknown font falls back to default.
    bad = build_subtitle_style(CaptionStyle(font_family="Comic Sans; rm -rf"))
    assert "FontName=DejaVu Sans" in bad


def test_build_subtitle_style_outline_clamped():
    style = build_subtitle_style(CaptionStyle(outline_width=999))
    assert "Outline=8" in style
    style_zero = build_subtitle_style(CaptionStyle(outline_width=-5))
    assert "Outline=0" in style_zero


def test_build_subtitle_style_font_size_clamped():
    assert "FontSize=6" in build_subtitle_style(CaptionStyle(font_size=2))
    assert "FontSize=120" in build_subtitle_style(CaptionStyle(font_size=500))


def test_available_fonts_has_defaults():
    assert "DejaVu Sans" in AVAILABLE_FONTS
    assert "Noto Sans" in AVAILABLE_FONTS
