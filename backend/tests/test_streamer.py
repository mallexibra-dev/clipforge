from clipper import (
    STREAMER_CAM_HEIGHT,
    STREAMER_GAME_HEIGHT,
    streamer_stack_filter,
)


def test_streamer_panels_sum_to_full_height():
    assert STREAMER_CAM_HEIGHT + STREAMER_GAME_HEIGHT == 1920


def test_streamer_stack_filter_structure():
    vf = streamer_stack_filter(1920, 1080, "br")
    # Must split into cam + game, scale each panel, then vstack.
    assert "split=2[cam][game]" in vf
    assert f"scale=1080:{STREAMER_CAM_HEIGHT}" in vf
    assert f"scale=1080:{STREAMER_GAME_HEIGHT}" in vf
    assert "vstack=inputs=2" in vf


def test_streamer_corner_offsets_bottom_right():
    vf = streamer_stack_filter(1920, 1080, "br")
    # Bottom-right webcam crop should offset on both x and y (non-zero origin).
    cam_crop = vf.split("[cam]crop=")[1].split(",")[0]
    w, h, x, y = (int(p) for p in cam_crop.split(":"))
    assert x > 0 and y > 0


def test_streamer_corner_offsets_top_left():
    vf = streamer_stack_filter(1920, 1080, "tl")
    cam_crop = vf.split("[cam]crop=")[1].split(",")[0]
    w, h, x, y = (int(p) for p in cam_crop.split(":"))
    assert x == 0 and y == 0


def test_streamer_crop_within_bounds():
    src_w, src_h = 1920, 1080
    vf = streamer_stack_filter(src_w, src_h, "tr")
    cam_crop = vf.split("[cam]crop=")[1].split(",")[0]
    w, h, x, y = (int(p) for p in cam_crop.split(":"))
    assert x + w <= src_w
    assert y + h <= src_h
