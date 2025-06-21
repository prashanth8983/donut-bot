#!/usr/bin/env python3
"""
Basic test script to verify the web crawler functionality.
"""

import asyncio
import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_basic_functionality():
    """Test basic functionality of the web crawler components."""
    try:
        from web_crawler import WebCrawler, APIServer
        from donutbot.crawler_config import CrawlerConfig
        from donutbot.url_frontier import URLFrontier
        from donutbot.rate_limiter import RateLimiter
        from donutbot.metrics import CrawlerMetrics
        from donutbot.bloom_filter import BloomFilter
        from donutbot.content_extractor import ContentExtractor
        from donutbot.robots_checker import RobotsChecker
        from donutbot.url_utils import normalize_url
        
        print("✓ All imports successful")
        
        # Test configuration
        config = CrawlerConfig()
        config.validate()
        print("✓ Configuration validation successful")
        
        # Test URL normalization
        test_url = "https://example.com/path?param=value#fragment"
        normalized = normalize_url(test_url)
        assert normalized == "https://example.com/path?param=value"
        print("✓ URL normalization working")
        
        # Test metrics
        metrics = CrawlerMetrics()
        metrics.record_response(200, 1.5, 1024)
        stats = metrics.get_stats()
        assert stats['pages_crawled'] == 1
        print("✓ Metrics recording working")
        
        # Test rate limiter
        rate_limiter = RateLimiter(config)
        rate_stats = rate_limiter.get_stats()
        assert 'domains_tracked' in rate_stats
        print("✓ Rate limiter stats working")
        
        # Test content extractor
        extractor = ContentExtractor()
        test_html = "<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>"
        result = extractor.extract(test_html, "https://example.com")
        assert result['title'] == "Test"
        print("✓ Content extraction working")
        
        # Test bloom filter
        bloom = BloomFilter(capacity=1000, error_rate=0.01)
        bloom.add("test_url")
        assert bloom.contains("test_url")
        print("✓ Bloom filter working")
        
        print("\n🎉 All basic functionality tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_basic_functionality())
    sys.exit(0 if success else 1) 