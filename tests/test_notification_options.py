"""Exercise the real options flow without starting Home Assistant."""
import ast
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest


class FlowBase:
    def async_show_menu(self, **kwargs): return {"type": "menu", **kwargs}
    def async_show_form(self, **kwargs): return {"type": "form", **kwargs}
    def async_abort(self, **kwargs): return {"type": "abort", **kwargs}
    def async_create_entry(self, **kwargs): return {"type": "create_entry", **kwargs}


def make_flow():
    path=Path(__file__).parents[1]/"custom_components/simson/config_flow.py"
    declaration=next(item for item in ast.parse(path.read_text()).body if isinstance(item, ast.ClassDef) and item.name=="SimsonOptionsFlow")
    namespace={"config_entries":SimpleNamespace(OptionsFlow=FlowBase, ConfigEntry=object),"DOMAIN":"simson",
        "CONF_ADDON_URL":"addon_url","DEFAULT_ADDON_URL":"http://localhost:8799",
        "vol":SimpleNamespace(Schema=lambda value:value,In=lambda value:value,
            Required=lambda key,**kwargs:key,Optional=lambda key,**kwargs:key)}
    future=ast.ImportFrom(module="__future__",names=[ast.alias(name="annotations")],level=0)
    exec(compile(ast.fix_missing_locations(ast.Module(body=[future,declaration],type_ignores=[])),str(path),"exec"),namespace)
    flow=namespace["SimsonOptionsFlow"](SimpleNamespace(entry_id="one",options={"addon_url":"http://saved:8799"}))
    flow.hass=SimpleNamespace(data={"simson":{"one":{"user_notification_targets":{}}}},
        auth=SimpleNamespace(async_get_users=AsyncMock(return_value=[SimpleNamespace(id="user",name="Recipient",is_active=True,system_generated=False)])),
        states=SimpleNamespace(async_all=lambda domain:[SimpleNamespace(entity_id="sensor.renamed_contact",attributes={
            "entry_id":"one","simson_contact":True,"user_id":"user"}),SimpleNamespace(entity_id="sensor.other_site",attributes={
            "entry_id":"two","simson_contact":True,"user_id":"other"})]),
        services=SimpleNamespace(async_services=lambda:{"notify":{"mobile_app_named_phone":{},"email":{}}},
            has_service=lambda domain,service:service=="mobile_app_named_phone",async_call=AsyncMock()))
    return flow


@pytest.mark.asyncio
async def test_mapping_is_accessible_without_any_card_and_saves_through_the_central_service():
    flow=make_flow()
    menu=await flow.async_step_init()
    assert menu["menu_options"]==["user_notifications","connection"]
    users=await flow.async_step_user_notifications()
    assert users["data_schema"]["user_id"]=={"user":"Recipient"}
    await flow.async_step_user_notifications({"user_id":"user"})
    saved=await flow.async_step_notification_phone({"phone":"notify.mobile_app_named_phone","send_test":True})
    calls=flow.hass.services.async_call.await_args_list
    assert calls[0].args==("simson","set_user_notification_target",{
        "entity_id":"sensor.renamed_contact","notify_service":"notify.mobile_app_named_phone",
        "automatic":False,"dashboard_path":"/simson-call"})
    assert calls[1].args==("simson","test_user_notification",{"entity_id":"sensor.renamed_contact"})
    assert saved["data"]=={"addon_url":"http://saved:8799"}


@pytest.mark.asyncio
async def test_automatic_disabled_and_missing_phones_are_explicit_and_editable():
    for phone in ("__automatic","__disabled"):
        flow=make_flow();await flow.async_step_user_notifications({"user_id":"user"})
        await flow.async_step_notification_phone({"phone":phone})
        data=flow.hass.services.async_call.await_args.args[2]
        assert data["notify_service"]==""
        assert data["automatic"]==(phone=="__automatic")
    flow=make_flow();await flow.async_step_user_notifications({"user_id":"user"})
    result=await flow.async_step_notification_phone({"phone":"notify.mobile_app_removed"})
    assert result["errors"]=={"base":"phone_unavailable"}
    flow.hass.services.async_call.assert_not_awaited()


@pytest.mark.asyncio
async def test_failed_save_keeps_the_editor_open_and_unloaded_contacts_have_a_clear_error():
    flow=make_flow();await flow.async_step_user_notifications({"user_id":"user"})
    flow.hass.services.async_call.side_effect=RuntimeError("save failed")
    result=await flow.async_step_notification_phone({"phone":"__disabled"})
    assert result["type"]=="form"
    assert result["errors"]["base"]=="notification_failed"
    flow.hass.states.async_all=lambda domain:[]
    assert (await flow.async_step_user_notifications())["reason"]=="contacts_unavailable"
