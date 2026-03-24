"""Config flow for the Simson integration."""

from __future__ import annotations

import aiohttp
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult

from .const import DOMAIN, CONF_ADDON_URL, DEFAULT_ADDON_URL


class SimsonConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Simson."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict | None = None
    ) -> FlowResult:
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

    async def async_step_hassio(self, discovery_info: dict) -> FlowResult:
        """Handle Supervisor add-on discovery."""
        addon_url = f"http://localhost:{discovery_info.get('port', 8099)}"

        # Check if already configured.
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
