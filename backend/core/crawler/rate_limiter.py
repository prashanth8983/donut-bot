"""
Rate limiter for the crawler.
Controls crawl speed to be respectful to servers.
"""

import asyncio
import time
from typing import Dict, Optional
from urllib.parse import urlparse

from ..logger import get_logger

logger = get_logger("crawler.rate_limiter")


class RateLimiter:
    """Controls crawl rate to be respectful to servers."""
    
    def __init__(self, config):
        self.config = config
        self.last_request_times: Dict[str, float] = {}
        self.domain_rates: Dict[str, float] = {}
        
        # Initialize domain-specific rates from config
        if hasattr(config, 'rate_limits') and config.rate_limits:
            self.domain_rates.update(config.rate_limits)
    
    async def wait_if_needed(self, domain: str):
        """
        Wait if necessary to respect rate limits for a domain.
        
        Args:
            domain: The domain to check rate limits for
        """
        if not domain:
            return
        
        # Get the rate limit for this domain (default to global rate)
        rate_limit = self.domain_rates.get(domain, self.config.default_delay)
        
        # Check if we need to wait
        current_time = time.time()
        last_request_time = self.last_request_times.get(domain, 0)
        
        time_since_last = current_time - last_request_time
        if time_since_last < rate_limit:
            wait_time = rate_limit - time_since_last
            logger.debug(f"Rate limiting: waiting {wait_time:.2f}s for domain {domain}")
            await asyncio.sleep(wait_time)
        
        # Update last request time
        self.last_request_times[domain] = time.time()
    
    def set_domain_rate(self, domain: str, rate: float):
        """
        Set a custom rate limit for a specific domain.
        
        Args:
            domain: The domain to set rate for
            rate: Rate limit in seconds between requests
        """
        self.domain_rates[domain] = rate
        logger.info(f"Set rate limit for {domain}: {rate}s between requests")
    
    def get_domain_rate(self, domain: str) -> float:
        """
        Get the current rate limit for a domain.
        
        Args:
            domain: The domain to get rate for
            
        Returns:
            Rate limit in seconds
        """
        return self.domain_rates.get(domain, self.config.default_delay)
    
    def reset_domain(self, domain: str):
        """
        Reset rate limiting for a domain.
        
        Args:
            domain: The domain to reset
        """
        if domain in self.last_request_times:
            del self.last_request_times[domain]
        if domain in self.domain_rates:
            del self.domain_rates[domain]
        logger.debug(f"Reset rate limiting for domain {domain}")
    
    def reset_all(self):
        """Reset all rate limiting state."""
        self.last_request_times.clear()
        self.domain_rates.clear()
        logger.info("Reset all rate limiting state") 