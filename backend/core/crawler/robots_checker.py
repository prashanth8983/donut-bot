"""
Robots.txt checker for the crawler.
Checks robots.txt files to determine if URLs can be crawled.
"""

import asyncio
import aiohttp
from typing import Dict, Set, Optional
from urllib.parse import urljoin, urlparse
import time

from ..logger import get_logger

logger = get_logger("crawler.robots_checker")


class RobotsChecker:
    """Checks robots.txt files for crawl permissions."""
    
    def __init__(self, config):
        self.config = config
        self.cache: Dict[str, Dict] = {}
        self.cache_times: Dict[str, float] = {}
        
    async def can_fetch(self, url: str) -> bool:
        """
        Check if a URL can be fetched according to robots.txt.
        
        Args:
            url: The URL to check
            
        Returns:
            True if the URL can be fetched, False otherwise
        """
        try:
            domain = self._get_domain(url)
            if not domain:
                return True
            
            # Check cache
            if self._is_cache_valid(domain):
                return self._check_cached_rules(domain, url)
            
            # Fetch and parse robots.txt
            robots_url = f"https://{domain}/robots.txt"
            rules = await self._fetch_robots_txt(robots_url)
            
            # Cache the rules
            self.cache[domain] = rules
            self.cache_times[domain] = time.time()
            
            return self._check_rules(rules, url)
            
        except Exception as e:
            logger.error(f"Error checking robots.txt for {url}: {e}")
            return True  # Allow crawling if robots.txt check fails
    
    def _get_domain(self, url: str) -> Optional[str]:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            return parsed.netloc
        except Exception:
            return None
    
    def _is_cache_valid(self, domain: str) -> bool:
        """Check if cached robots.txt is still valid."""
        if domain not in self.cache_times:
            return False
        
        cache_age = time.time() - self.cache_times[domain]
        return cache_age < self.config.robots_cache_time
    
    def _check_cached_rules(self, domain: str, url: str) -> bool:
        """Check rules using cached robots.txt."""
        if domain not in self.cache:
            return True
        
        return self._check_rules(self.cache[domain], url)
    
    async def _fetch_robots_txt(self, robots_url: str) -> Dict:
        """Fetch and parse robots.txt file."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(robots_url, timeout=10) as response:
                    if response.status != 200:
                        return {'user_agents': {}, 'sitemaps': []}
                    
                    content = await response.text()
                    return self._parse_robots_txt(content)
                    
        except Exception as e:
            logger.warning(f"Failed to fetch robots.txt from {robots_url}: {e}")
            return {'user_agents': {}, 'sitemaps': []}
    
    def _parse_robots_txt(self, content: str) -> Dict:
        """Parse robots.txt content."""
        rules = {
            'user_agents': {},
            'sitemaps': []
        }
        
        current_user_agent = None
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            if ':' not in line:
                continue
            
            key, value = line.split(':', 1)
            key = key.strip().lower()
            value = value.strip()
            
            if key == 'user-agent':
                current_user_agent = value
                if current_user_agent not in rules['user_agents']:
                    rules['user_agents'][current_user_agent] = {'allow': [], 'disallow': []}
            
            elif key == 'disallow' and current_user_agent:
                if current_user_agent in rules['user_agents']:
                    rules['user_agents'][current_user_agent]['disallow'].append(value)
            
            elif key == 'allow' and current_user_agent:
                if current_user_agent in rules['user_agents']:
                    rules['user_agents'][current_user_agent]['allow'].append(value)
            
            elif key == 'sitemap':
                rules['sitemaps'].append(value)
        
        return rules
    
    def _check_rules(self, rules: Dict, url: str) -> bool:
        """Check if URL is allowed by robots.txt rules."""
        user_agent = self.config.user_agent
        
        # Check specific user agent rules first
        if user_agent in rules['user_agents']:
            return self._check_user_agent_rules(rules['user_agents'][user_agent], url)
        
        # Check wildcard rules
        if '*' in rules['user_agents']:
            return self._check_user_agent_rules(rules['user_agents']['*'], url)
        
        # If no rules found, allow crawling
        return True
    
    def _check_user_agent_rules(self, user_agent_rules: Dict, url: str) -> bool:
        """Check rules for a specific user agent."""
        disallow_patterns = user_agent_rules.get('disallow', [])
        allow_patterns = user_agent_rules.get('allow', [])
        
        # Check allow patterns first (more specific)
        for pattern in allow_patterns:
            if self._matches_pattern(url, pattern):
                return True
        
        # Check disallow patterns
        for pattern in disallow_patterns:
            if self._matches_pattern(url, pattern):
                return False
        
        return True
    
    def _matches_pattern(self, url: str, pattern: str) -> bool:
        """Check if URL matches a robots.txt pattern."""
        if not pattern:
            return False
        
        # Remove scheme and domain from URL for pattern matching
        parsed = urlparse(url)
        path = parsed.path
        
        # Handle wildcards
        if '*' in pattern:
            # Convert pattern to regex
            regex_pattern = pattern.replace('*', '.*')
            import re
            return re.search(regex_pattern, path) is not None
        else:
            # Simple prefix matching
            return path.startswith(pattern) 