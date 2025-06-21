#!/usr/bin/env python3
"""
API Client Example for the Web Crawler
Demonstrates how to use all API endpoints to control the crawler
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, Any, List


class CrawlerAPIClient:
    """Client for interacting with the crawler API."""
    
    def __init__(self, base_url: str = "http://localhost:8089"):
        self.base_url = base_url.rstrip('/')
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Dict[str, Any]:
        """Make HTTP request to API endpoint."""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        async with self.session.request(method, url, json=data, headers=headers) as response:
            result = await response.json()
            if response.status >= 400:
                raise Exception(f"API Error {response.status}: {result.get('error', 'Unknown error')}")
            return result
    
    async def start_crawler(self, config: Dict = None) -> Dict[str, Any]:
        """Start the crawler with optional configuration."""
        data = {'config': config} if config else {}
        return await self._make_request('POST', '/api/v1/crawler/start', data)
    
    async def stop_crawler(self) -> Dict[str, Any]:
        """Stop the crawler."""
        return await self._make_request('POST', '/api/v1/crawler/stop')
    
    async def get_crawler_status(self) -> Dict[str, Any]:
        """Get crawler status."""
        return await self._make_request('GET', '/api/v1/crawler/status')
    
    async def reset_crawler(self, options: Dict = None) -> Dict[str, Any]:
        """Reset crawler state."""
        data = options or {}
        return await self._make_request('POST', '/api/v1/crawler/reset', data)
    
    async def add_urls(self, urls: List[str], priority: float = 0.5, depth: int = 0) -> Dict[str, Any]:
        """Add URLs to the crawler queue."""
        data = {
            'urls': urls,
            'priority': priority,
            'depth': depth
        }
        return await self._make_request('POST', '/api/v1/urls/add', data)
    
    async def get_queue_status(self) -> Dict[str, Any]:
        """Get URL queue status."""
        return await self._make_request('GET', '/api/v1/urls/queue')
    
    async def clear_urls(self, options: Dict = None) -> Dict[str, Any]:
        """Clear URL queue and data."""
        data = options or {}
        return await self._make_request('DELETE', '/api/v1/urls/clear', data)
    
    async def get_config(self) -> Dict[str, Any]:
        """Get current configuration."""
        return await self._make_request('GET', '/api/v1/config')
    
    async def update_config(self, config_updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update configuration."""
        return await self._make_request('PUT', '/api/v1/config', config_updates)
    
    async def get_allowed_domains(self) -> Dict[str, Any]:
        """Get allowed domains."""
        return await self._make_request('GET', '/api/v1/config/domains')
    
    async def update_allowed_domains(self, action: str, domains: List[str]) -> Dict[str, Any]:
        """Update allowed domains."""
        data = {
            'action': action,  # 'add', 'remove', or 'replace'
            'domains': domains
        }
        return await self._make_request('PUT', '/api/v1/config/domains', data)
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get crawler metrics."""
        return await self._make_request('GET', '/api/v1/metrics')
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive statistics."""
        return await self._make_request('GET', '/api/v1/stats')
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check."""
        return await self._make_request('GET', '/api/v1/health')


async def example_usage():
    """Example usage of the crawler API client."""
    
    print("🚀 Web Crawler API Client Example")
    print("=" * 50)
    
    async with CrawlerAPIClient() as client:
        try:
            # 1. Health check
            print("\n1. Checking API health...")
            health = await client.health_check()
            print(f"   Health: {health}")
            
            # 2. Get current configuration
            print("\n2. Getting current configuration...")
            config = await client.get_config()
            print(f"   Current workers: {config.get('workers')}")
            print(f"   Max pages: {config.get('max_pages')}")
            
            # 3. Update configuration
            print("\n3. Updating configuration...")
            config_update = {
                'workers': 2,
                'max_pages': 100,
                'max_depth': 2,
                'default_delay': 1.0
            }
            updated_config = await client.update_config(config_update)
            print(f"   Configuration updated: {updated_config.get('message')}")
            
            # 4. Update allowed domains
            print("\n4. Setting allowed domains...")
            domains_result = await client.update_allowed_domains('replace', [
                'example.com',
                'test.com',
                'demo.org'
            ])
            print(f"   Domains updated: {domains_result.get('message')}")
            
            # 5. Start the crawler
            print("\n5. Starting crawler...")
            start_result = await client.start_crawler()
            print(f"   Crawler started: {start_result.get('message')}")
            
            # 6. Add URLs to crawl
            print("\n6. Adding URLs to crawl...")
            urls_to_crawl = [
                'https://example.com',
                'https://test.com',
                'https://demo.org'
            ]
            add_result = await client.add_urls(urls_to_crawl, priority=1.0, depth=0)
            print(f"   URLs added: {add_result.get('message')}")
            
            # 7. Monitor progress
            print("\n7. Monitoring crawler progress...")
            for i in range(5):
                status = await client.get_crawler_status()
                metrics = await client.get_metrics()
                
                print(f"   Iteration {i+1}:")
                print(f"     Running: {status.get('crawler_running')}")
                print(f"     Pages crawled: {metrics.get('pages_crawled', 0)}")
                print(f"     Queue size: {status.get('frontier_queue_size', 0)}")
                print(f"     Errors: {metrics.get('total_errors_count', 0)}")
                
                if i < 4:  # Don't sleep after last iteration
                    await asyncio.sleep(2)
            
            # 8. Get comprehensive statistics
            print("\n8. Getting comprehensive statistics...")
            stats = await client.get_stats()
            print(f"   Crawler stats: {stats.get('crawler', {})}")
            print(f"   Frontier stats: {stats.get('frontier', {})}")
            
            # 9. Get queue status
            print("\n9. Getting queue status...")
            queue_status = await client.get_queue_status()
            print(f"   Queue status: {queue_status}")
            
            # 10. Stop the crawler
            print("\n10. Stopping crawler...")
            stop_result = await client.stop_crawler()
            print(f"   Crawler stopped: {stop_result.get('message')}")
            
            print("\n✅ Example completed successfully!")
            
        except Exception as e:
            print(f"\n❌ Error during example: {e}")
            raise


async def advanced_example():
    """Advanced example showing more complex usage patterns."""
    
    print("\n🔧 Advanced API Usage Example")
    print("=" * 50)
    
    async with CrawlerAPIClient() as client:
        try:
            # 1. Start with custom configuration
            print("\n1. Starting crawler with custom configuration...")
            custom_config = {
                'workers': 3,
                'max_depth': 3,
                'max_pages': 50,
                'default_delay': 0.5,
                'respect_robots_txt': False,
                'allow_redirects': True
            }
            await client.start_crawler(custom_config)
            
            # 2. Add URLs with different priorities
            print("\n2. Adding URLs with different priorities...")
            high_priority_urls = ['https://example.com/important']
            medium_priority_urls = ['https://example.com/medium1', 'https://example.com/medium2']
            low_priority_urls = ['https://example.com/low1', 'https://example.com/low2', 'https://example.com/low3']
            
            await client.add_urls(high_priority_urls, priority=1.0, depth=0)
            await client.add_urls(medium_priority_urls, priority=0.5, depth=1)
            await client.add_urls(low_priority_urls, priority=0.1, depth=2)
            
            # 3. Monitor and control in real-time
            print("\n3. Real-time monitoring and control...")
            for i in range(10):
                status = await client.get_crawler_status()
                metrics = await client.get_metrics()
                
                print(f"   Time {i*2}s: {metrics.get('pages_crawled', 0)} pages, "
                      f"{status.get('frontier_queue_size', 0)} in queue, "
                      f"{metrics.get('total_errors_count', 0)} errors")
                
                # Stop if we've crawled enough pages
                if metrics.get('pages_crawled', 0) >= 20:
                    print("   Reached target page count, stopping...")
                    break
                
                await asyncio.sleep(2)
            
            # 4. Reset specific components
            print("\n4. Resetting specific components...")
            reset_options = {
                'redis_completed': True,
                'redis_seen': False,
                'redis_processing': True,
                'redis_queue': False,
                'bloom_filter': True
            }
            reset_result = await client.reset_crawler(reset_options)
            print(f"   Reset result: {reset_result.get('message')}")
            
            # 5. Clear specific URL data
            print("\n5. Clearing specific URL data...")
            clear_options = {
                'completed': True,
                'seen': False,
                'processing': True,
                'queue': False
            }
            clear_result = await client.clear_urls(clear_options)
            print(f"   Clear result: {clear_result.get('message')}")
            
            # 6. Stop crawler
            await client.stop_crawler()
            
            print("\n✅ Advanced example completed successfully!")
            
        except Exception as e:
            print(f"\n❌ Error during advanced example: {e}")
            raise


if __name__ == "__main__":
    print("Web Crawler API Client Examples")
    print("Make sure the API server is running on localhost:8089")
    print("Run: python api_crawler.py")
    print()
    
    # Run examples
    asyncio.run(example_usage())
    asyncio.run(advanced_example()) 