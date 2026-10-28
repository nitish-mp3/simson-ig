import asyncio
import importlib.util
from pathlib import Path
from unittest.mock import AsyncMock, Mock

import pytest


spec = importlib.util.spec_from_file_location("rooms", Path(__file__).parents[1] / "custom_components/simson/rooms.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def profile(**extra):
    return module.room_profile({"room_id": "room-101", "room_user_id": "room-user",
        "caregiver_user_id": "caregiver", **extra})[1]


@pytest.fixture
def manager():
    return module.RoomSessions({"room-101": profile()}, {}, AsyncMock(), Mock(),
        AsyncMock(return_value={"call_id": "call-one"}), AsyncMock(), AsyncMock(), now=lambda: 100)


@pytest.mark.asyncio
async def test_active_native_sip_is_not_hung_up_when_browser_telemetry_is_missing(manager):
    manager.profiles['room-101']=profile(audio_mode='sip',sip_extension='1040',setup_timeout_sec=90)
    manager.start_sip_call=AsyncMock(return_value={'call_id':'sip-one'})
    await manager.start('room-101','press','caregiver',None)
    manager.now=lambda:195
    await manager.reconcile([{'call_id':'sip-one','state':'active'}])
    manager.hangup.assert_not_awaited()
    assert manager.current('room-101')['state']=='degraded'


@pytest.mark.parametrize("extra", [
    {"room_id": "../room"}, {"caregiver_user_id": "room-user"}, {"audio_mode": "unknown"},
    {"audio_mode": "sip", "sip_extension": "1024/evil"}, {"camera_entity": "rtsp://user:secret@camera"},
    {"display_entity": "media_player.tv", "display_mode": "adapter"}, {"start_script": "shell_command.exec"},
    {"setup_timeout_sec": 2}, {"max_duration_sec": 999999},
    {"audio_mode": "sip", "sip_extension": "1024", "video_mode": "browser",
        "start_script": "script.start", "stop_script": "script.stop"},
])
def test_profiles_fail_closed(extra):
    with pytest.raises(ValueError):
        profile(**extra)


def test_split_profile_is_explicit_and_contains_no_stream_credentials():
    actual = profile(audio_mode="sip", sip_extension="1024", video_mode="adapter",
        camera_entity="camera.room", display_entity="media_player.room",
        start_script="script.start", stop_script="script.stop")
    assert actual["audio_mode"] == "sip"
    assert "password" not in actual


def test_native_camera_and_cast_do_not_require_custom_scripts():
    actual = profile(video_mode="ha_camera", camera_entity="camera.room", display_entity="media_player.room")
    assert actual["display_mode"] == "cast"
    assert not actual["start_script"]
    assert profile(video_mode="adapter", camera_entity="camera.room")["video_mode"] == "ha_camera"


@pytest.mark.asyncio
async def test_native_sip_room_uses_exact_session_and_keeps_browser_start_off(manager):
    manager.profiles['room-101']=profile(audio_mode='sip',sip_extension='1040',video_mode='ha_camera',camera_entity='camera.room')
    manager.start_sip_call=AsyncMock(return_value={'call_id':'sip-one','sip_bridge_id':'bridge-one'})
    result=await manager.start('room-101','press-one','caregiver',None)
    manager.start_call.assert_not_awaited()
    args=manager.start_sip_call.call_args.args
    assert args[1]['session_id']==result['session_id'] and args[1]['request_id']=='press-one'
    assert result['call_id']=='sip-one' and result['state']=='ringing'
    await manager.end('room-101',result['session_id'],None)
    manager.hangup.assert_awaited_once_with('sip-one')


@pytest.mark.asyncio
async def test_start_is_idempotent_and_busy_room_does_not_dial_twice(manager):
    first, second = await asyncio.gather(manager.start("room-101", "panic-one", "caregiver", None),
        manager.start("room-101", "panic-one", "caregiver", None))
    assert first["session_id"] == second["session_id"]
    manager.start_call.assert_awaited_once()
    with pytest.raises(ValueError, match="already has"):
        await manager.start("room-101", "panic-two", "caregiver", None)
    assert first["state"] == "ringing"
    with pytest.raises(ValueError, match="different caregiver"):
        await manager.start("room-101", "panic-one", "someone-else", None)


@pytest.mark.asyncio
async def test_display_or_camera_readiness_alone_never_marks_call_active(manager):
    manager.profiles["room-101"] = profile(video_mode="browser")
    session = await manager.start("room-101", "one", "caregiver", None)
    await manager.report("room-101", session["session_id"], "audio", "ready")
    await manager.report("room-101", session["session_id"], "video", "ready")
    assert manager.current("room-101")["state"] == "ringing"
    await manager.reconcile([{"call_id": "call-one", "state": "active"}])
    assert manager.current("room-101")["state"] == "active"


@pytest.mark.asyncio
async def test_video_failure_degrades_but_does_not_end_healthy_audio(manager):
    manager.profiles["room-101"] = profile(video_mode="browser")
    session = await manager.start("room-101", "one", "caregiver", None)
    await manager.report("room-101", session["session_id"], "audio", "ready")
    await manager.report("room-101", session["session_id"], "video", "failed")
    await manager.reconcile([{"call_id": "call-one", "state": "active"}])
    assert manager.current("room-101")["state"] == "degraded"
    manager.hangup.assert_not_awaited()


@pytest.mark.asyncio
async def test_peer_hangup_releases_exact_owned_call_only(manager):
    session = await manager.start("room-101", "one", "caregiver", None)
    await manager.reconcile([{"call_id": "call-one", "state": "ended"}, {"call_id": "unrelated", "state": "active"}])
    manager.hangup.assert_awaited_once_with("call-one")
    assert manager.current("room-101")["state"] == "ended"
    await manager.end("room-101", session["session_id"], None)
    manager.hangup.assert_awaited_once()


@pytest.mark.asyncio
async def test_stale_commands_cannot_end_or_acknowledge_replacement_session(manager):
    old = await manager.start("room-101", "one", "caregiver", None)
    await manager.end("room-101", old["session_id"], None)
    await manager.start("room-101", "two", "caregiver", None)
    with pytest.raises(ValueError, match="current session"):
        await manager.end("room-101", old["session_id"], None)
    with pytest.raises(ValueError, match="stale"):
        await manager.report("room-101", old["session_id"], "audio", "ready")


@pytest.mark.asyncio
async def test_hangup_failure_blocks_reuse_until_cleanup_succeeds(manager):
    session = await manager.start("room-101", "one", "caregiver", None)
    manager.hangup.side_effect = TimeoutError
    result = await manager.end("room-101", session["session_id"], None)
    assert result["state"] == "attention"
    manager.hangup.side_effect = None
    assert (await manager.end("room-101", session["session_id"], None))["state"] == "ended"


@pytest.mark.asyncio
async def test_split_adapter_must_acknowledge_stop_and_cannot_add_browser_audio(manager):
    manager.profiles["room-101"] = profile(audio_mode="sip", sip_extension="1024",
        start_script="script.start", stop_script="script.stop")
    session = await manager.start("room-101", "one", "caregiver", None)
    manager.start_call.assert_not_awaited()
    assert manager.run_script.call_args.args[1]["audio_policy"] == "sip_only"
    assert (await manager.end("room-101", session["session_id"], None))["state"] == "attention"

    async def stop(script, variables, context):
        await manager.report("room-101", variables["session_id"], "audio", "stopped")

    manager.run_script.side_effect = stop
    assert (await manager.end("room-101", session["session_id"], None))["state"] == "ended"


@pytest.mark.asyncio
async def test_shared_handset_identity_cannot_be_reused_by_another_room(manager):
    manager.profiles["room-102"] = profile()
    await manager.start("room-101", "one", "caregiver", None)
    with pytest.raises(ValueError, match="shares"):
        await manager.start("room-102", "two", "caregiver", None)


@pytest.mark.asyncio
async def test_end_racing_start_waits_then_releases_the_returned_call(manager):
    started = asyncio.Event()
    complete = asyncio.Event()

    async def create(*args):
        started.set()
        await complete.wait()
        return {"call_id": "late-call"}

    manager.start_call.side_effect = create
    task = asyncio.create_task(manager.start("room-101", "one", "caregiver", None))
    await started.wait()
    ending = asyncio.create_task(manager.end("room-101", manager.current("room-101")["session_id"], None))
    complete.set()
    await asyncio.gather(task, ending)
    manager.hangup.assert_awaited_once_with("late-call")
    assert manager.current("room-101")["state"] == "ended"


@pytest.mark.asyncio
async def test_ambiguous_create_is_not_retried_or_silently_declared_released(manager):
    manager.start_call.side_effect = TimeoutError
    with pytest.raises(TimeoutError):
        await manager.start("room-101", "one", "caregiver", None)
    session = manager.current("room-101")
    assert (await manager.end("room-101", session["session_id"], None))["state"] == "attention"
    manager.now = lambda: 140
    await manager.reconcile([])
    assert session["unconfirmed_call"]
    await manager.reconcile([])
    assert not session["unconfirmed_call"]
    assert (await manager.end("room-101", session["session_id"], None))["state"] == "ended"


@pytest.mark.asyncio
async def test_setup_timeout_cleans_up_and_offline_missing_call_has_grace(manager):
    await manager.start("room-101", "one", "caregiver", None)
    manager.now = lambda: 110
    await manager.reconcile([])
    manager.hangup.assert_not_awaited()
    manager.now = lambda: 170
    await manager.reconcile([])
    assert manager.current("room-101")["state"] == "ended"


@pytest.mark.asyncio
async def test_optional_video_deadline_preserves_connected_audio(manager):
    manager.profiles["room-101"] = profile(video_mode="browser")
    session = await manager.start("room-101", "one", "caregiver", None)
    await manager.report("room-101", session["session_id"], "audio", "ready")
    manager.now = lambda: 170
    await manager.reconcile([{"call_id": "call-one", "state": "active"}])
    assert manager.current("room-101")["state"] == "degraded"
    assert manager.current("room-101")["components"]["video"] == "failed"
    manager.hangup.assert_not_awaited()


@pytest.mark.asyncio
async def test_cleanup_failure_automatically_retries_after_backoff_even_if_call_stays_active(manager):
    session = await manager.start("room-101", "one", "caregiver", None)
    manager.hangup.side_effect = TimeoutError
    await manager.end("room-101", session["session_id"], None)
    await manager.reconcile([{"call_id": "call-one", "state": "active"}])
    assert manager.hangup.await_count == 1
    manager.hangup.side_effect = None
    manager.now = lambda: 115
    await manager.reconcile([{"call_id": "call-one", "state": "active"}])
    assert manager.hangup.await_count == 2
    assert manager.current("room-101")["state"] == "ended"


@pytest.mark.asyncio
async def test_early_video_error_does_not_disable_audio_setup_deadline(manager):
    manager.profiles["room-101"] = profile(video_mode="browser")
    session = await manager.start("room-101", "one", "caregiver", None)
    await manager.report("room-101", session["session_id"], "video", "failed")
    manager.now = lambda: 170
    await manager.reconcile([{"call_id": "call-one", "state": "active"}])
    assert manager.current("room-101")["state"] == "ended"


@pytest.mark.asyncio
async def test_delayed_duplicate_after_newer_activation_does_not_redial(manager):
    first = await manager.start("room-101", "one", "caregiver", None)
    await manager.end("room-101", first["session_id"], None)
    second = await manager.start("room-101", "two", "caregiver", None)
    await manager.end("room-101", second["session_id"], None)
    replay = await manager.start("room-101", "one", "caregiver", None)
    assert replay["session_id"] == first["session_id"]
    assert replay["state"] == "ended"
    assert manager.start_call.await_count == 2
    assert "recent_requests" not in second
