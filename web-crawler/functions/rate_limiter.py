import asyncio
import time
from collections import defaultdict
from urllib.parse import urlparse

class RateLimiter:
    def __init__(self, config):
        self.config = config
        self.next_access = defaultdict(float)
        self._locks = defaultdict(asyncio.Lock)

    async def wait(self, domain):
        if not domain: return
        async with self._locks[domain]:
            delay = self.config.rate_limits.get(domain, self.config.default_delay)
            now = time.time()
            next_time = self.next_access.get(domain, 0)
            if now < next_time:
                await asyncio.sleep(next_time - now)
            self.next_access[domain] = time.time() + delay

    def update_custom_delay(self, domain, delay):
        if not domain or delay <= 0: return
        self.config.rate_limits[domain] = delay

    def get_current_delay_for_domain(self, domain):
        return self.config.rate_limits.get(domain, self.config.default_delay)

    async def reset_domain(self, domain):
        async with self._locks[domain]:
            if domain in self.next_access:
                del self.next_access[domain]

    def clear_all_states(self):
        self.next_access.clear()
        self._locks.clear()