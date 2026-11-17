"""Config flow for the Simson integration."""

from __future__ import annotations

from typing import Any

import aiohttp
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant, callback  # noqa: F401

from .const import DOMAIN, CONF_ADDON_URL, DEFAULT_ADDON_URL


class SimsonConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Simson."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Create the options flow."""
        return SimsonOptionsFlow(config_entry)

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Handle the initial step — enter addon URL."""
        errors: dict[str, str] = {}

        if user_input is not None:
            addon_url = user_input[CONF_ADDON_URL].rstrip("/")

            # Test connection to the addon's local API.
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{addon_url}/api/health",
                        timeout=aiohttp.ClientTimeout(total=5),
                    ) as resp:
                        if resp.status != 200:
                            errors["base"] = "cannot_connect"
                        else:
                            data = await resp.json()
                            node_id = data.get("node_id", "simson")

                            # Prevent duplicate entries.
                            await self.async_set_unique_id(node_id)
                            self._abort_if_unique_id_configured()

                            return self.async_create_entry(
                                title=f"Simson ({node_id})",
                                data={CONF_ADDON_URL: addon_url},
                            )
            except (aiohttp.ClientError, TimeoutError):
                errors["base"] = "cannot_connect"

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required(CONF_ADDON_URL, default=DEFAULT_ADDON_URL): str,
            }),
            errors=errors,
        )

    async def async_step_hassio(
        self, discovery_info: Any
    ) -> config_entries.ConfigFlowResult:
        """Handle Supervisor add-on discovery."""
        port = getattr(discovery_info, "port", None) or discovery_info.get("port", 8099)
        addon_url = f"http://localhost:{port}"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{addon_url}/api/health",
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        node_id = data.get("node_id", "simson")
                        await self.async_set_unique_id(node_id)
                        self._abort_if_unique_id_configured()
        except (aiohttp.ClientError, TimeoutError):
            return self.async_abort(reason="addon_not_ready")

        return await self.async_step_user({CONF_ADDON_URL: addon_url})


class SimsonOptionsFlow(config_entries.OptionsFlow):
    """Handle Simson options."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._config_entry = config_entry

    async def async_step_init(self, user_input=None):
        """Keep phone mappings in integration settings, independent of cards."""
        if user_input is not None:
            return await self.async_step_connection(user_input)
        return self.async_show_menu(step_id="init", menu_options=["user_notifications", "connection"])

    async def async_step_user_notifications(self, user_input=None):
        users = {user.id: user.name or "User" for user in await self.hass.auth.async_get_users()
            if user.is_active and not user.system_generated}
        self._notification_entities = {}
        for entity in self.hass.states.async_all("sensor"):
            attrs = entity.attributes
            if attrs.get("entry_id") == self._config_entry.entry_id and attrs.get("simson_contact") and attrs.get("user_id") in users:
                self._notification_entities[attrs["user_id"]] = entity.entity_id
        choices = {key: users[key] for key in self._notification_entities}
        if not choices:
            return self.async_abort(reason="contacts_unavailable")
        if user_input and user_input.get("user_id") in choices:
            self._notification_user_id = user_input["user_id"]
            return await self.async_step_notification_phone()
        return self.async_show_form(step_id="user_notifications", data_schema=vol.Schema({
            vol.Required("user_id"): vol.In(choices)}))

    async def async_step_notification_phone(self, user_input=None):
        owner = self.hass.data.get(DOMAIN, {}).get(self._config_entry.entry_id, {})
        target = owner.get("user_notification_targets", {}).get(self._notification_user_id)
        current = "__automatic" if target is None else target.get("service") or "__disabled"
        choices = {"__automatic": "Automatic: phones registered to this user", "__disabled": "Notifications disabled"}
        services = self.hass.services.async_services().get("notify", {})
        choices.update({f"notify.{name}": name.removeprefix("mobile_app_").replace("_", " ")
            for name in sorted(services) if name.startswith("mobile_app_")})
        if current not in choices:
            choices[current] = f"Unavailable phone: {current}"
        errors = {}
        if user_input:
            phone = user_input["phone"]
            if phone not in ("__automatic", "__disabled") and not self.hass.services.has_service("notify", phone.removeprefix("notify.")):
                errors["base"] = "phone_unavailable"
            else:
                try:
                    await self.hass.services.async_call(DOMAIN, "set_user_notification_target", {
                        "entity_id": self._notification_entities[self._notification_user_id],
                        "notify_service": "" if phone.startswith("__") else phone,
                        "automatic": phone == "__automatic",
                        "dashboard_path": user_input.get("dashboard_path") or "/simson-call",
                    }, blocking=True)
                    if user_input.get("send_test"):
                        await self.hass.services.async_call(DOMAIN, "test_user_notification", {
                            "entity_id": self._notification_entities[self._notification_user_id]}, blocking=True)
                    return self.async_create_entry(title="", data=dict(self._config_entry.options))
                except Exception:
                    errors["base"] = "notification_failed"
        values = user_input or {}
        return self.async_show_form(step_id="notification_phone", errors=errors, data_schema=vol.Schema({
            vol.Required("phone", default=values.get("phone", current)): vol.In(choices),
            vol.Optional("dashboard_path", default=values.get("dashboard_path", (target or {}).get("dashboard_path", "/simson-call"))): str,
            vol.Optional("send_test", default=False): bool,
        }))

    async def async_step_connection(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Edit the addon local API URL."""
        errors: dict[str, str] = {}
        current_url = self._config_entry.options.get(
            CONF_ADDON_URL,
            self._config_entry.data.get(CONF_ADDON_URL, DEFAULT_ADDON_URL),
        )

        if user_input is not None:
            addon_url = user_input[CONF_ADDON_URL].rstrip("/")
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{addon_url}/api/health",
                        timeout=aiohttp.ClientTimeout(total=5),
                    ) as resp:
                        if resp.status != 200:
                            errors["base"] = "cannot_connect"
                        else:
                            return self.async_create_entry(
                                title="",
                                data={CONF_ADDON_URL: addon_url},
                            )
            except (aiohttp.ClientError, TimeoutError):
                errors["base"] = "cannot_connect"

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Required(CONF_ADDON_URL, default=current_url): str,
            }),
            errors=errors,
        )
