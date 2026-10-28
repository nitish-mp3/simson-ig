import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
import pytest_asyncio


@pytest_asyncio.fixture
async def service_fixture(monkeypatch):
    package = ModuleType("room_services_test")
    package.__path__ = [str(Path(__file__).parents[1] / "custom_components/simson")]
    monkeypatch.setitem(sys.modules, package.__name__, package)
    core = ModuleType("homeassistant.core")
    core.SupportsResponse = SimpleNamespace(OPTIONAL="optional")
    exceptions = ModuleType("homeassistant.exceptions")
    exceptions.HomeAssistantError = RuntimeError
    storage = ModuleType("homeassistant.helpers.storage")
    store = SimpleNamespace(async_load=AsyncMock(return_value=None), async_save=AsyncMock())
    storage.Store = lambda *args: store
    for name, value in {"homeassistant.core": core, "homeassistant.exceptions": exceptions,
        "homeassistant.helpers.storage": storage}.items():
        monkeypatch.setitem(sys.modules, name, value)
    spec = importlib.util.spec_from_file_location("room_services_test.rooms", Path(package.__path__[0]) / "rooms.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    handlers = {}
    schemas = {}
    users = {identity: SimpleNamespace(id=identity, name=identity, is_admin=identity == "admin",
        is_active=True, system_generated=False) for identity in ("admin", "room", "caregiver", "observer")}
    client = SimpleNamespace(calls=AsyncMock(return_value={"calls": []}),
        make_call=AsyncMock(return_value={"call_id": "real-call"}), hangup_call=AsyncMock(),
        room_capabilities=AsyncMock(return_value={'native_sip_rooms':True}),start_room_sip_call=AsyncMock(return_value={'call_id':'sip-call','sip_bridge_id':'bridge-one'}))
    coordinator = SimpleNamespace(data={"node_id": "node", "calls_data": {"calls": []}},
        last_update_success=True, async_add_listener=Mock(return_value=Mock()))

    def register(domain, name, handler, **kwargs):
        handlers[name] = handler
        schemas[name] = kwargs["schema"]

    entry = SimpleNamespace(entry_id="entry", async_on_unload=Mock(), async_create_background_task=Mock())
    hass = SimpleNamespace(data={"simson": {"entry": {"client": client, "coordinator": coordinator}}},
        auth=SimpleNamespace(async_get_user=AsyncMock(side_effect=lambda identity: users.get(identity)), async_get_users=AsyncMock(return_value=list(users.values()))),
        states=SimpleNamespace(get=lambda entity: None), bus=SimpleNamespace(async_fire=Mock(), async_listen=Mock(return_value=Mock())),
        services=SimpleNamespace(has_service=lambda domain, name: name in handlers, async_register=register, async_call=AsyncMock()))
    await module.setup_rooms(hass, entry)

    async def invoke(service, actor="admin", **data):
        call = SimpleNamespace(service=service, data=schemas[service](data if service=="get_room_configuration" else {"node_id": "node", "room_id": "101", **data}),
            context=SimpleNamespace(user_id=actor))
        return await handlers[service](call)

    return SimpleNamespace(invoke=invoke, hass=hass, client=client, store=store,
        manager=hass.data["simson"]["entry"]["rooms"], module=module, entry=entry, users=users)


@pytest.mark.asyncio
async def test_only_room_user_can_claim_source_and_sip_rooms_cannot_open_browser_audio(service_fixture):
    fixture = service_fixture
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver")
    for actor in (None, "admin", "caregiver", "observer"):
        with pytest.raises(RuntimeError, match="Only this room"):
            await fixture.invoke("room_source_lease", actor=actor, operation="claim", client_id="source-one")
    assert (await fixture.invoke("room_source_lease", actor="room", operation="claim", client_id="source-one"))["owned"]
    with pytest.raises(RuntimeError, match="already armed"):
        await fixture.invoke("room_source_lease", actor="room", operation="claim", client_id="source-two")
    fixture.manager.profiles["101"]["audio_mode"] = "sip"
    with pytest.raises(RuntimeError, match="SIP audio"):
        await fixture.invoke("room_source_lease", actor="room", operation="claim", client_id="source-one")


@pytest.mark.asyncio
async def test_native_sip_caregiver_media_requires_exact_answer_and_scoped_identity(service_fixture):
    fixture=service_fixture
    fixture.hass.states.get=lambda entity:SimpleNamespace(attributes={})
    await fixture.invoke('configure_room',room_user_id='room',caregiver_user_id='caregiver',audio_mode='sip',sip_extension='1040',video_mode='ha_camera',camera_entity='camera.room',display_entity='media_player.room')
    session=await fixture.invoke('start_room_call',actor='room')
    actual={'call_id':'sip-call','state':'active','caller_user_id':'room','target_user_id':'caregiver','answered_by_user_id':'caregiver',
        'metadata':{'room_id':'101','room_session_id':session['session_id'],'source_extension':'1040','media_mode':'sip_room'}}
    fixture.client.calls.return_value={'calls':[actual]}
    context=await fixture.invoke('get_room_media',actor='caregiver',call_id='sip-call')
    assert context['camera_entity']=='camera.room' and context['media_role']=='sip_caregiver'
    for actor in ['observer','admin','room']:
        assert not await fixture.invoke('get_room_media',actor=actor,call_id='sip-call')
    await fixture.invoke('report_room_component',actor='caregiver',session_id=session['session_id'],component='audio',state='ready')
    await fixture.invoke('room_display_signal',actor='caregiver',call_id='sip-call',session_id=session['session_id'],operation='publisher_poll',client_id='caregiver-one')
    actual['answered_by_user_id']='observer'
    assert not await fixture.invoke('get_room_media',actor='caregiver',call_id='sip-call')
    with pytest.raises(RuntimeError):
        await fixture.invoke('report_room_component',actor='caregiver',session_id=session['session_id'],component='audio',state='ready')
    actual['answered_by_user_id']='caregiver';actual['metadata']['room_session_id']='old-session'
    assert not await fixture.invoke('get_room_media',actor='caregiver',call_id='sip-call')


@pytest.mark.asyncio
async def test_native_sip_configuration_rejects_unavailable_backend_without_changing_profile(service_fixture):
    fixture=service_fixture;fixture.client.room_capabilities.return_value={}
    with pytest.raises(RuntimeError,match='native SIP'):
        await fixture.invoke('configure_room',room_user_id='room',caregiver_user_id='caregiver',audio_mode='sip',sip_extension='1040')
    assert not fixture.manager.profiles


@pytest.mark.asyncio
async def test_native_sip_early_answer_can_load_only_its_exact_unconfirmed_session(service_fixture):
    fixture=service_fixture
    fixture.hass.states.get=lambda entity:SimpleNamespace(attributes={})
    await fixture.invoke('configure_room',room_user_id='room',caregiver_user_id='caregiver',audio_mode='sip',sip_extension='1040',video_mode='ha_camera',camera_entity='camera.room')
    session=await fixture.invoke('start_room_call',actor='room')
    current=fixture.manager.current('101');current['call_id']='';current['unconfirmed_call']=True
    actual={'call_id':'sip-call','state':'active','caller_user_id':'room','target_user_id':'caregiver','answered_by_user_id':'caregiver',
        'metadata':{'room_id':'101','room_session_id':session['session_id'],'source_extension':'1040','media_mode':'sip_room'}}
    fixture.client.calls.return_value={'calls':[actual]}
    result=await fixture.invoke('get_room_media',actor='caregiver',call_id='sip-call')
    assert result['call_id']=='sip-call' and result['session_id']==session['session_id']
    assert not await fixture.invoke('get_room_media',actor='caregiver',call_id='another-call')


@pytest.mark.asyncio
async def test_only_admin_can_configure_room_and_unknown_device_is_rejected(service_fixture):
    fixture = service_fixture
    for actor in ("room", "observer", None):
        with pytest.raises(RuntimeError):
            await fixture.invoke("configure_room", actor=actor, room_user_id="room", caregiver_user_id="caregiver")
    with pytest.raises(RuntimeError, match="does not exist"):
        await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver", camera_entity="camera.missing")
    assert not fixture.manager.profiles


@pytest.mark.asyncio
async def test_room_and_automation_call_as_room_identity_not_admin_or_observer(service_fixture):
    fixture = service_fixture
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver")
    with pytest.raises(RuntimeError, match="Only the room"):
        await fixture.invoke("start_room_call", actor="observer")
    result = await fixture.invoke("start_room_call", actor=None, request_id="panic")
    assert result["call_id"] == "real-call"
    assert fixture.client.make_call.call_args.kwargs["caller_user_id"] == "room"
    assert fixture.client.make_call.call_args.kwargs["target_user_id"] == "caregiver"
    assert fixture.hass.bus.async_fire.call_args_list[-2].args[0] == "simson_user_call_started"


@pytest.mark.asyncio
async def test_unrelated_call_cannot_be_bound_or_released_and_hangup_is_strict(service_fixture):
    fixture = service_fixture
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver")
    session = await fixture.invoke("start_room_call", actor="room")
    fixture.client.calls.return_value = {"calls": [{"call_id": "other", "state": "active", "caller_user_id": "observer"}]}
    with pytest.raises(RuntimeError, match="owned"):
        await fixture.invoke("bind_room_call", actor="room", session_id=session["session_id"], call_id="other")
    with pytest.raises(RuntimeError, match="Only the room"):
        await fixture.invoke("end_room_call", actor="caregiver", session_id=session["session_id"])
    fixture.client.calls.return_value = {"calls": [{"call_id": "real-call", "state": "active", "caller_user_id": "room"}]}
    await fixture.invoke("end_room_call", actor="room", session_id=session["session_id"])
    fixture.client.hangup_call.assert_awaited_once_with("real-call", strict_call_id=True)


@pytest.mark.asyncio
async def test_active_profile_cannot_be_rebound_and_stale_report_is_rejected(service_fixture):
    fixture = service_fixture
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver")
    await fixture.invoke("start_room_call", actor="room")
    with pytest.raises(RuntimeError, match="End the room"):
        await fixture.invoke("configure_room", remove=True)
    with pytest.raises(RuntimeError, match="stale"):
        await fixture.invoke("report_room_component", actor="room", session_id="old", component="audio", state="ready")


@pytest.mark.asyncio
async def test_room_owner_cannot_report_or_bind_for_another_room(service_fixture):
    fixture = service_fixture
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver")
    session = await fixture.invoke("start_room_call", actor="room")
    with pytest.raises(RuntimeError, match="Only the room"):
        await fixture.invoke("report_room_component", actor="observer", session_id=session["session_id"], component="audio", state="ready")


@pytest.mark.asyncio
async def test_bind_requires_exact_caregiver_not_just_room_caller(service_fixture):
    fixture = service_fixture
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver")
    session = await fixture.invoke("start_room_call", actor="room")
    fixture.client.calls.return_value = {"calls": [{"call_id": "real-call", "state": "active",
        "caller_user_id": "room", "target_user_id": "observer"}]}
    with pytest.raises(RuntimeError, match="selected caregiver"):
        await fixture.invoke("bind_room_call", actor="room", session_id=session["session_id"], call_id="real-call")
    fixture.client.calls.return_value["calls"][0]["target_user_id"] = "caregiver"
    await fixture.invoke("bind_room_call", actor="room", session_id=session["session_id"], call_id="real-call")


@pytest.mark.asyncio
async def test_restart_preserves_profile_and_session_without_reopening_media(service_fixture):
    fixture = service_fixture
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver")
    session = await fixture.invoke("start_room_call", actor="room")
    fixture.store.async_load.return_value = fixture.store.async_save.call_args.args[0]
    await fixture.module.setup_rooms(fixture.hass, fixture.entry)
    recovered = fixture.hass.data["simson"]["entry"]["rooms"]
    assert recovered.current("101")["session_id"] == session["session_id"]
    assert recovered.current("101")["state"] == "attention"
    fixture.client.make_call.assert_awaited_once()
    fixture.hass.services.async_call.assert_not_awaited()


@pytest.mark.asyncio
async def test_graphical_configuration_is_admin_only_and_lists_saved_profiles_and_users(service_fixture):
    fixture = service_fixture
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver")
    for actor in ("room", "observer", None):
        with pytest.raises(RuntimeError):
            await fixture.invoke("get_room_configuration", actor=actor)
    data = await fixture.invoke("get_room_configuration")
    assert data["nodes"][0]["rooms"][0]["revision"] == 1
    assert data["nodes"][0]["rooms"][0]["room_user_id"] == "room"
    assert {user["user_id"] for user in data["users"]} == {"admin","room","caregiver","observer"}


@pytest.mark.asyncio
async def test_stale_workspace_edit_and_delete_do_not_overwrite_another_admin(service_fixture):
    fixture = service_fixture
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver", expected_revision=0)
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver", label="Updated", expected_revision=1)
    for fields in ({"label":"Stale","room_user_id":"room","caregiver_user_id":"caregiver"},{"remove":True}):
        with pytest.raises(RuntimeError, match="another window"):
            await fixture.invoke("configure_room", expected_revision=1, **fields)
    assert fixture.manager.profiles["101"]["label"] == "Updated"
    assert fixture.manager.profiles["101"]["revision"] == 2


@pytest.mark.asyncio
async def test_saving_trigger_rebinds_it_without_dialing_and_rejects_recursive_call_button(service_fixture):
    fixture = service_fixture
    fixture.hass.states.get = lambda entity: SimpleNamespace(attributes={})
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver",
        trigger_entity="input_boolean.panic", trigger_enabled=True)
    fixture.client.make_call.assert_not_awaited()
    fixture.hass.services.async_call.assert_not_awaited()
    fixture.hass.states.get = lambda entity: SimpleNamespace(attributes={"simson_room_button":True})
    with pytest.raises(RuntimeError, match="trigger itself"):
        await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver",
            trigger_entity="button.room_call", trigger_enabled=True)


@pytest.mark.asyncio
async def test_room_media_is_scoped_to_the_exact_source_user_and_active_session(service_fixture):
    fixture = service_fixture
    fixture.hass.states.get = lambda entity: SimpleNamespace(attributes={})
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver", video_mode="ha_camera", camera_entity="camera.room")
    session = await fixture.invoke("start_room_call", actor="room")
    fixture.client.calls.return_value = {"calls": [{"call_id":"real-call","state":"active","caller_user_id":"room","target_user_id":"caregiver"}]}
    context = await fixture.invoke("get_room_media", actor="room", call_id=session["call_id"])
    assert context["camera_entity"] == "camera.room"
    for actor in ("observer", "caregiver", "admin"):
        assert not await fixture.invoke("get_room_media", actor=actor, call_id=session["call_id"])
    await fixture.invoke("end_room_call", actor="room", session_id=session["session_id"])
    assert not await fixture.invoke("get_room_media", actor="room", call_id=session["call_id"])


@pytest.mark.asyncio
async def test_cast_identity_is_view_only_and_cannot_publish_or_read_camera_binding(service_fixture):
    fixture = service_fixture
    fixture.hass.states.get = lambda entity: SimpleNamespace(attributes={})
    fixture.hass.config_entries = SimpleNamespace(async_entries=lambda domain: [SimpleNamespace(data={"user_id":"cast-system"})])
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver", video_mode="ha_camera",
        camera_entity="camera.room", display_entity="media_player.room", display_mode="cast")
    session = await fixture.invoke("start_room_call", actor="room")
    fixture.client.calls.return_value = {"calls":[{"call_id":"real-call","state":"active","caller_user_id":"room","target_user_id":"caregiver"}]}
    context = await fixture.invoke("get_room_media", actor="cast-system", call_id=session["call_id"])
    assert context["call_id"] == session["call_id"]
    assert not context["camera_entity"]
    assert not context["camera_fallback_entity"]
    result = await fixture.invoke("room_display_signal", actor="cast-system", operation="viewer_poll", client_id="cast-viewer")
    assert not result["offer"]
    with pytest.raises(RuntimeError, match="Publishing|publishing"):
        await fixture.invoke("room_display_signal", actor="cast-system", operation="publisher_poll", client_id="cast-viewer")
    with pytest.raises(RuntimeError):
        await fixture.invoke("room_display_signal", actor="observer", operation="viewer_poll", client_id="cast-viewer")
    assert not await fixture.invoke("get_room_media", actor="cast-system", room_id="another-room")


@pytest.mark.asyncio
async def test_room_camera_cannot_be_bound_to_another_room_camera(service_fixture):
    fixture = service_fixture
    fixture.hass.states.get = lambda entity: SimpleNamespace(attributes={"simson_room_camera":True})
    with pytest.raises(RuntimeError, match="original camera"):
        await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver",
            video_mode="ha_camera", camera_entity="camera.other_room")


@pytest.mark.asyncio
async def test_non_admin_room_user_can_only_cast_the_administrator_configured_display(service_fixture):
    fixture = service_fixture
    fixture.hass.states.get = lambda entity: SimpleNamespace(attributes={})
    await fixture.invoke("configure_room", room_user_id="room", caregiver_user_id="caregiver",
        display_entity="media_player.room", display_mode="cast")
    await fixture.invoke("start_room_call", actor="room")
    invoked = fixture.hass.services.async_call.call_args
    assert invoked.args[:2] == ("cast", "show_lovelace_view")
    assert invoked.args[2]["entity_id"] == "media_player.room"
    assert "context" not in invoked.kwargs
    with pytest.raises(RuntimeError, match="Only the room"):
        await fixture.invoke("start_room_call", actor="observer")
