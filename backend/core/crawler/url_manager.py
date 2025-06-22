"""
URL manager for the crawler.
Handles the URL frontier, deduplication, and visited tracking.
"""

from typing import Set, List
from ..logger import get_logger

logger = get_logger("crawler.url_manager")

class URLManager:
    def __init__(self):
        self.frontier: List[str] = []
        self.visited: Set[str] = set()

    def add_url(self, url: str):
        if url not in self.visited and url not in self.frontier:
            self.frontier.append(url)
            logger.debug(f"Added URL to frontier: {url}")

    def get_next_url(self) -> str:
        if self.frontier:
            url = self.frontier.pop(0)
            self.visited.add(url)
            logger.debug(f"Processing URL: {url}")
            return url
        return None

    def has_pending(self) -> bool:
        return bool(self.frontier) 