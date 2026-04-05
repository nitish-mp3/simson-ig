"""Simson integration — API client for the addon's local HTTP API."""

from __future__ import annotations

import logging

import aiohttp

logger = logging.getLogger(__name__)


class SimsonApiClient:
    """Client to communicate with the Simson addon's local REST API."""

    def __init__(self, base_url: str) -> None:
        self._base = base_url.rstrip("/")
        self._session: aiohttp.ClientSession | None = None

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
        async with session.get(f"{self._base}{path}") as resp:
            resp.raise_for_status()
            return await resp.json()

    async def _post(self, path: str, data: dict | None = None) -> dict:
        session = self._get_session()
        async with session.post(f"{self._base}{path}", json=data or {}) as resp:
            resp.raise_for_status()
            return await resp.json()

    async def health(self) -> dict:
        return await self._get("/api/health")

    async def status(self) -> dict:
        return await self._get("/api/status")

    async def calls(self) -> dict:
        return await self._get("/api/calls")

    async def make_call(self, target_node_id: str = "", call_type: str = "voice",
                        target_id: str = "",
                        target_user_id: str = "",
                        target_user_name: str = "") -> dict:
        data = {"call_type": call_type}
        if target_id:
            data["target_id"] = target_id
        if target_node_id:
            data["target_node_id"] = target_node_id
        if target_user_id:
            data["target_user_id"] = target_user_id
        if target_user_name:
            data["target_user_name"] = target_user_name
        return await self._post("/api/call", data)

    async def answer_call(self, call_id: str) -> dict:
        return await self._post("/api/answer", {"call_id": call_id})

    async def reject_call(self, call_id: str, reason: str = "rejected") -> dict:
        return await self._post("/api/reject", {"call_id": call_id, "reason": reason})

    async def hangup_call(self, call_id: str) -> dict:
        return await self._post("/api/hangup", {"call_id": call_id})

    async def targets(self) -> dict:
        return await self._get("/api/targets")

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
