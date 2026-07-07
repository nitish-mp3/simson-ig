"""Simson integration — API client for the addon's local HTTP API."""

from __future__ import annotations

import logging
from urllib.parse import quote, urlsplit, urlunsplit

import aiohttp

logger = logging.getLogger(__name__)


class SimsonApiClient:
    """Client to communicate with the Simson addon's local REST API."""

    def __init__(self, base_url: str) -> None:
        self._base = base_url.rstrip("/")
        self._session: aiohttp.ClientSession | None = None

    def _candidate_bases(self) -> tuple[str, ...]:
        """Return compatible addon base URLs for HAOS/container edge cases.

        In some HAOS installs, `localhost:<port>` resolves to Home Assistant's
        own container or an ingress-protected listener while the addon is
        reachable by its Supervisor/Docker DNS name. Try the configured URL
        first, then safe local alternatives on the same port.
        """
        bases = [self._base]
        parsed = urlsplit(self._base)
        host = (parsed.hostname or "").lower()
        port = f":{parsed.port}" if parsed.port else ""
        if host in ("localhost", "127.0.0.1", "::1"):
            for alt_host in ("127.0.0.1", "localhost", "simson"):
                netloc = f"{alt_host}{port}"
                alt = urlunsplit((parsed.scheme or "http", netloc, parsed.path.rstrip("/"), "", ""))
                if alt not in bases:
                    bases.append(alt)
        return tuple(bases)

    def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=10),
            )
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    async def _get(self, path: str) -> dict:
        session = self._get_session()
        last_err: Exception | None = None
        for base in self._candidate_bases():
            try:
                async with session.get(f"{base}{path}") as resp:
                    resp.raise_for_status()
                    return await resp.json()
            except (aiohttp.ClientResponseError, aiohttp.ClientConnectorError, TimeoutError) as err:
                last_err = err
                if isinstance(err, aiohttp.ClientResponseError) and err.status not in (403, 404):
                    raise
        if last_err:
            raise last_err
        raise RuntimeError("No Simson addon base URL configured")

    async def _post(self, path: str, data: dict | None = None) -> dict:
        session = self._get_session()
        last_err: Exception | None = None
        for base in self._candidate_bases():
            try:
                async with session.post(f"{base}{path}", json=data or {}) as resp:
                    resp.raise_for_status()
                    return await resp.json()
            except (aiohttp.ClientResponseError, aiohttp.ClientConnectorError, TimeoutError) as err:
                last_err = err
                if isinstance(err, aiohttp.ClientResponseError) and err.status not in (403, 404):
                    raise
        if last_err:
            raise last_err
        raise RuntimeError("No Simson addon base URL configured")

    async def _post_first(self, paths: tuple[str, ...], data: dict | None = None) -> dict:
        """POST to the first route that exists.

        This keeps HA service calls working during addon/integration rolling
        updates where one side still exposes an older call endpoint name.
        Non-404 failures are real call failures and are surfaced immediately.
        """
        last_compatible_error: aiohttp.ClientResponseError | None = None
        for path in paths:
            try:
                return await self._post(path, data)
            except aiohttp.ClientResponseError as err:
                if err.status not in (403, 404):
                    raise
                last_compatible_error = err
                logger.warning(
                    "Simson addon endpoint %s returned HTTP %s; trying next compatible route",
                    path,
                    err.status,
                )
        if last_compatible_error:
            health = {}
            try:
                health = await self.health()
            except Exception as health_err:
                health = {"health_error": str(health_err)}
            raise RuntimeError(
                "Simson addon did not accept a POST call API request. "
                f"Tried {', '.join(paths)} on {self._base}. "
                f"Addon health: {health}. Check the integration Addon URL; on HAOS it should point "
                "to the Simson addon's local API port, not the ingress page."
            ) from last_compatible_error
        raise RuntimeError("No Simson endpoint paths supplied")

    async def health(self) -> dict:
        return await self._get("/api/health")

    async def status(self) -> dict:
        return await self._get("/api/status")

    async def calls(self) -> dict:
        return await self._get("/api/calls")

    async def make_call(self, target_node_id: str = "", call_type: str = "voice",
                        target_id: str = "",
                        phone_number: str = "",
                        trunk: str = "",
                        caller_id: str = "",
                        source_extension: str = "",
                        target_extension: str = "",
                        source_auto_mode: str = "speaker",
                        target_auto_mode: str = "speaker",
                        timeout_sec: int = 30,
                        target_user_id: str = "",
                        target_user_name: str = "",
                        caller_user_id: str = "") -> dict:
        data = {"call_type": call_type}
        if target_id:
            data["target_id"] = target_id
        if phone_number:
            data["phone_number"] = phone_number
        if trunk:
            data["trunk"] = trunk
        if caller_id:
            data["caller_id"] = caller_id
        if source_extension:
            data["source_extension"] = source_extension
        if target_extension:
            data["target_extension"] = target_extension
        if source_extension or target_extension:
            data["source_auto_mode"] = source_auto_mode
            data["target_auto_mode"] = target_auto_mode
            data["timeout_sec"] = timeout_sec
        if target_node_id:
            data["target_node_id"] = target_node_id
        if target_user_id:
            data["target_user_id"] = target_user_id
        if target_user_name:
            data["target_user_name"] = target_user_name
        if caller_user_id:
            data["caller_user_id"] = caller_user_id
        return await self._post_first(("/api/call", "/api/make-call", "/api/calls"), data)

    async def call_sip_phone(self, extension: str, caller_id: str = "",
                             target_user_id: str = "",
                             target_user_name: str = "",
                             caller_user_id: str = "") -> dict:
        """Call a SIP extension through the addon's validated central SIP path."""
        ext = str(extension or "").strip().replace("sip:", "")
        data = {
            "target_id": f"asterisk_{ext}",
            "target_node_id": f"sip:{ext}",
            "call_type": "sip",
        }
        if caller_id:
            data["caller_id"] = caller_id
        if target_user_id:
            data["target_user_id"] = target_user_id
        if target_user_name:
            data["target_user_name"] = target_user_name
        if caller_user_id:
            data["caller_user_id"] = caller_user_id
        return await self._post_first(("/api/call", "/api/make-call", "/api/calls"), data)

    async def call_phone_number(self, phone_number: str, trunk: str = "",
                                caller_id: str = "",
                                caller_user_id: str = "") -> dict:
        """Call an outside/PSTN number through the selected or default gateway."""
        data = {"phone_number": str(phone_number or "").strip(), "call_type": "sip"}
        if trunk:
            data["trunk"] = trunk
        if caller_id:
            data["caller_id"] = caller_id
        if caller_user_id:
            data["caller_user_id"] = caller_user_id
        return await self._post_first(("/api/call", "/api/make-call", "/api/calls"), data)

    async def answer_call(self, call_id: str, answered_by_user_id: str = "") -> dict:
        data = {"call_id": call_id}
        if answered_by_user_id:
            data["answered_by_user_id"] = answered_by_user_id
        return await self._post("/api/answer", data)

    async def reject_call(self, call_id: str, reason: str = "rejected") -> dict:
        return await self._post("/api/reject", {"call_id": call_id, "reason": reason})

    async def hangup_call(self, call_id: str) -> dict:
        return await self._post("/api/hangup", {"call_id": call_id, "explicit": True})

    async def transfer_call(self, call_id: str, target_node_id: str,
                            target_user_id: str = "",
                            target_user_name: str = "") -> dict:
        data = {
            "call_id": call_id,
            "target_node_id": target_node_id,
        }
        if target_user_id:
            data["target_user_id"] = target_user_id
        if target_user_name:
            data["target_user_name"] = target_user_name
        return await self._post("/api/transfer", data)

    async def targets(self) -> dict:
        return await self._get("/api/targets")

    async def run_trigger(self, trigger_id: str) -> dict:
        return await self._post(f"/api/automation/trigger/{quote(trigger_id, safe='')}")

    async def connect_sip_phones(
        self,
        source_extension: str,
        target_extension: str,
        source_auto_mode: str = "speaker",
        target_auto_mode: str = "speaker",
        caller_id: str = "",
        timeout_sec: int = 30,
    ) -> dict:
        return await self._post("/api/sip-intercom", {
            "source_extension": source_extension,
            "target_extension": target_extension,
            "source_auto_mode": source_auto_mode,
            "target_auto_mode": target_auto_mode,
            "caller_id": caller_id,
            "timeout_sec": timeout_sec,
        })

    async def webrtc_signal(
        self,
        call_id: str,
        to_node_id: str,
        signal_type: str,
        data: dict,
    ) -> dict:
        return await self._post("/api/webrtc/signal", {
            "call_id": call_id,
            "to_node_id": to_node_id,
            "signal_type": signal_type,
            "data": data,
        })

    async def user_heartbeat(self, user_id: str, user_name: str) -> dict:
        return await self._post("/api/user/heartbeat", {
            "user_id": user_id,
            "user_name": user_name,
        })

    async def user_unregister(self, user_id: str) -> dict:
        return await self._post("/api/user/unregister", {"user_id": user_id})

    async def get_remote_users(self, node_id: str) -> dict:
        return await self._post("/api/remote-users", {"node_id": node_id})

    async def webrtc_config(self) -> dict:
        return await self._get("/api/webrtc-config")

    async def get_call_history(self, limit: int = 50) -> dict:
        return await self._get(f"/api/history?limit={limit}")
