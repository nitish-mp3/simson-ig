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

    async def async_step_init(
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
