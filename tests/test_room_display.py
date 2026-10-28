import importlib.util
from pathlib import Path

import pytest


spec = importlib.util.spec_from_file_location("room_display", Path(__file__).parents[1] / "custom_components/simson/room_display.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
VIDEO = "v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=recvonly\r\n"


def test_room_source_lease_is_exclusive_expires_and_rejects_unrelated_release():
    lease = module.SourceLease(now=lambda: 100)
    assert lease.exchange("claim", "source-one")["owned"]
    with pytest.raises(ValueError, match="already armed"):
        lease.exchange("claim", "source-two")
    lease.exchange("release", "source-two")
    assert lease.client_id == "source-one"
    lease.now = lambda: 125
    lease.exchange("claim", "source-one")
    lease.now = lambda: 140
    with pytest.raises(ValueError, match="already armed"):
        lease.exchange("claim", "source-two")
    lease.now = lambda: 156
    assert lease.exchange("claim", "source-two")["owned"]
    lease.exchange("release", "source-one")
    assert lease.client_id == "source-two"
    lease.exchange("release", "source-two")
    assert lease.client_id == ""


def test_room_screens_never_accept_audio_or_data_channel_sdp():
    assert module.video_sdp(VIDEO) == VIDEO
    for value in (VIDEO+"m=audio 9 UDP/TLS/RTP/SAVPF 111\r\n", VIDEO+"m=application 9 DTLS/SCTP 5000\r\n", "not sdp", "v=0"+"x"*100001):
        with pytest.raises(ValueError):
            module.video_sdp(value)


def test_display_signaling_is_targeted_and_rejects_stale_answers():
    channel = module.DisplayChannel(now=lambda: 100)
    channel.exchange("viewer_poll", "viewer-one")
    channel.exchange("viewer_poll", "viewer-two")
    channel.exchange("publisher_poll", "source-one")
    offer = channel.exchange("offer", "source-one", "viewer-one", VIDEO)
    assert channel.exchange("viewer_poll", "viewer-one")["offer"] == VIDEO
    assert not channel.exchange("viewer_poll", "viewer-two")["offer"]
    with pytest.raises(ValueError, match="previous"):
        channel.exchange("answer", "viewer-one", sdp=VIDEO, generation="stale")
    channel.exchange("answer", "viewer-one", sdp=VIDEO, generation=offer["generation"])
    assert channel.exchange("viewer_ready", "viewer-one", generation=offer["generation"])["ready"]
    with pytest.raises(ValueError, match="current answered"):
        channel.exchange("viewer_ready", "viewer-two", generation=offer["generation"])
    assert channel.exchange("publisher_poll", "source-one")["viewers"][0]["answer"] == VIDEO


def test_another_source_browser_cannot_steal_live_video_publishing():
    channel = module.DisplayChannel(now=lambda: 100)
    channel.exchange("publisher_poll", "source-one")
    with pytest.raises(ValueError, match="Another source"):
        channel.exchange("publisher_poll", "source-two")
    channel.now = lambda: 125
    channel.exchange("publisher_poll", "source-two")
    assert channel.publisher == "source-two"


def test_disconnected_viewers_expire_and_count_is_bounded():
    channel = module.DisplayChannel(now=lambda: 100)
    for index in range(4):
        channel.exchange("viewer_poll", f"viewer-{index}")
    with pytest.raises(ValueError, match="four"):
        channel.exchange("viewer_poll", "viewer-extra")
    channel.now = lambda: 130
    channel.exchange("viewer_poll", "viewer-new")
    assert len(channel.viewers) == 1
