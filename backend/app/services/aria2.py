import httpx
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class Aria2Client:
    def __init__(self, rpc_url: str = "http://127.0.0.1:6800/jsonrpc", secret: str = ""):
        self.rpc_url = rpc_url
        self.secret = secret
        self.client = httpx.AsyncClient(timeout=5.0)

    async def close(self):
        await self.client.aclose()

    async def _call(self, method: str, params: Optional[List[Any]] = None) -> Any:
        if params is None:
            params = []
        
        rpc_params = []
        if self.secret:
            rpc_params.append(f"token:{self.secret}")
        rpc_params.extend(params)

        payload = {
            "jsonrpc": "2.0",
            "id": "downloadhub",
            "method": method,
            "params": rpc_params
        }

        try:
            response = await self.client.post(self.rpc_url, json=payload)
            response.raise_for_status()
            res_json = response.json()
            if "error" in res_json:
                error_msg = res_json["error"].get("message", "Unknown RPC error")
                logger.error(f"aria2 RPC error: {error_msg} (code: {res_json['error'].get('code')})")
                raise Exception(error_msg)
            return res_json.get("result")
        except Exception as e:
            logger.error(f"aria2 RPC request failed for method {method}: {e}")
            raise

    async def ping(self) -> bool:
        try:
            result = await self._call("aria2.getVersion")
            return "version" in result
        except Exception:
            return False

    async def add_uri(self, uris: List[str], options: Optional[Dict[str, Any]] = None) -> str:
        return await self._call("aria2.addUri", [uris, options or {}])

    async def tell_status(self, gid: str, keys: Optional[List[str]] = None) -> Dict[str, Any]:
        return await self._call("aria2.tellStatus", [gid] + ([keys] if keys else []))

    async def pause(self, gid: str) -> str:
        return await self._call("aria2.pause", [gid])

    async def unpause(self, gid: str) -> str:
        return await self._call("aria2.unpause", [gid])

    async def remove(self, gid: str) -> str:
        return await self._call("aria2.remove", [gid])

    async def force_remove(self, gid: str) -> str:
        return await self._call("aria2.forceRemove", [gid])

    async def remove_download_result(self, gid: str) -> str:
        return await self._call("aria2.removeDownloadResult", [gid])

    async def change_global_option(self, options: Dict[str, Any]) -> str:
        return await self._call("aria2.changeGlobalOption", [options])

    async def get_global_option(self) -> Dict[str, Any]:
        return await self._call("aria2.getGlobalOption")

    async def get_global_stat(self) -> Dict[str, Any]:
        return await self._call("aria2.getGlobalStat")
