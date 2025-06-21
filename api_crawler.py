#!/usr/bin/env python3
"""
API-Driven Web Crawler Service
Main entry point that runs only the API server for complete API-driven functionality
"""

import asyncio
import logging
import os
import sys
import argparse
from typing import Optional

from donutbot.api_server import CrawlerAPIServer
from donutbot.crawler_config import CrawlerConfig


async def main():
    """Main entry point for API-driven crawler service."""
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='API-Driven Web Crawler Service')
    parser.add_argument('--host', default=os.getenv('API_HOST', '0.0.0.0'), 
                       help='Host to bind the API server to')
    parser.add_argument('--port', type=int, default=int(os.getenv('API_PORT', '8089')), 
                       help='Port to bind the API server to')
    parser.add_argument('--log-level', default=os.getenv('LOG_LEVEL', 'INFO'),
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
                       help='Logging level')
    parser.add_argument('--config', default=os.getenv('CRAWLER_CONFIG_FILE'),
                       help='Path to YAML configuration file')
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(
        level=getattr(logging, args.log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('api_crawler.log')
        ]
    )
    
    logger = logging.getLogger('api_crawler')
    logger.info(f"Starting API-driven crawler service on {args.host}:{args.port}")
    
    # Create and start API server
    api_server = CrawlerAPIServer(host=args.host, port=args.port)
    
    try:
        await api_server.start()
        logger.info("API server started successfully")
        logger.info("Available endpoints:")
        logger.info("  POST   /api/v1/crawler/start     - Start crawler")
        logger.info("  POST   /api/v1/crawler/stop      - Stop crawler")
        logger.info("  GET    /api/v1/crawler/status    - Get crawler status")
        logger.info("  POST   /api/v1/crawler/reset     - Reset crawler")
        logger.info("  POST   /api/v1/urls/add          - Add URLs to queue")
        logger.info("  GET    /api/v1/urls/queue        - Get queue status")
        logger.info("  DELETE /api/v1/urls/clear        - Clear URLs")
        logger.info("  GET    /api/v1/config            - Get configuration")
        logger.info("  PUT    /api/v1/config            - Update configuration")
        logger.info("  GET    /api/v1/metrics           - Get metrics")
        logger.info("  GET    /api/v1/stats             - Get statistics")
        logger.info("  GET    /api/v1/health            - Health check")
        
        # Keep the server running
        while True:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Received interrupt signal, shutting down...")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        sys.exit(1)
    finally:
        await api_server.stop()
        logger.info("API server stopped")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutdown complete.")
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1) 