"""
Downloader for the crawler.
Handles HTTP requests and response handling.
"""

import aiohttp
from ..logger import get_logger

logger = get_logger("crawler.downloader")

class Downloader:
    def __init__(self, user_agent: str = "DonutBot/1.0"):
        self.user_agent = user_agent

    async def fetch(self, url: str) -> str:
        logger.debug(f"Fetching URL: {url}")
        headers = {"User-Agent": self.user_agent}
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                response.raise_for_status()
                return await response.text() 