"""
Crawler service for managing the crawler engine.
Provides business logic for crawler operations.
"""

import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from ..core.crawler.engine import CrawlerEngine
from ..core.crawler.config import CrawlerConfig
from ..core.logger import get_logger
from ..exceptions import CrawlError, ConfigurationError
from .kafka_service import get_kafka_service
from .file_storage_service import get_file_storage_service

logger = get_logger("crawler_service")


class CrawlerService:
    """Service for managing the crawler engine."""
    
    def __init__(self):
        self.crawler_engine: Optional[CrawlerEngine] = None
        self.config: Optional[CrawlerConfig] = None
        self.crawler_task: Optional[asyncio.Task] = None
        self.kafka_service = None
        self.file_storage_service = None
        
    async def initialize(self, config: CrawlerConfig):
        """Initialize the crawler service with configuration."""
        try:
            logger.info("Initializing crawler service...")
            self.config = config
            self.crawler_engine = CrawlerEngine(config)
            await self.crawler_engine.initialize()
            
            # Initialize Kafka service if configured
            if config.enable_kafka_output and config.kafka_brokers and config.output_topic:
                brokers_list = config.kafka_brokers.split(",")
                self.kafka_service = await get_kafka_service(brokers_list, config.output_topic)
                logger.info("Kafka service initialized for crawler")
            
            # Initialize file storage service if enabled
            if config.enable_local_save:
                self.file_storage_service = await get_file_storage_service(config.local_output_dir)
                logger.info("File storage service initialized for crawler")
            
            logger.info("Crawler service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize crawler service: {e}")
            raise ConfigurationError(f"Crawler service initialization failed: {e}")
    
    async def start_crawler(self) -> bool:
        """Start the crawler engine."""
        try:
            if not self.crawler_engine:
                raise CrawlError("Crawler engine not initialized")
            
            if self.crawler_engine.running:
                logger.warning("Crawler is already running")
                return True
            
            logger.info("Starting crawler...")
            self.crawler_task = asyncio.create_task(self.crawler_engine.run())
            return True
            
        except Exception as e:
            logger.error(f"Failed to start crawler: {e}")
            return False
    
    async def stop_crawler(self) -> bool:
        """Stop the crawler engine."""
        try:
            if not self.crawler_engine:
                return True
            
            if not self.crawler_engine.running:
                logger.warning("Crawler is not running")
                return True
            
            logger.info("Stopping crawler...")
            await self.crawler_engine.stop()
            
            if self.crawler_task and not self.crawler_task.done():
                self.crawler_task.cancel()
                try:
                    await self.crawler_task
                except asyncio.CancelledError:
                    pass
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop crawler: {e}")
            return False
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current crawler status."""
        if not self.crawler_engine:
            return {
                'crawler_running': False,
                'error': 'Crawler not initialized'
            }
        
        try:
            return await self.crawler_engine.get_status()
        except Exception as e:
            logger.error(f"Error getting crawler status: {e}")
            return {
                'crawler_running': False,
                'error': str(e)
            }
    
    async def add_urls(self, urls: List[str]) -> Dict[str, Any]:
        """Add URLs to the crawler frontier."""
        if not self.crawler_engine or not self.crawler_engine.url_frontier:
            raise CrawlError("Crawler not initialized")
        
        if not self.crawler_engine.running:
            raise CrawlError("Crawler is not running")
        
        added_count = 0
        skipped_count = 0
        invalid_count = 0
        
        for url in urls:
            try:
                if await self.crawler_engine.url_frontier.add_url(url, priority=1.0, depth=0):
                    added_count += 1
                    logger.info(f"Added URL to frontier: {url}")
                else:
                    skipped_count += 1
                    logger.debug(f"Skipped URL (already seen): {url}")
            except Exception as e:
                invalid_count += 1
                logger.error(f"Error adding URL {url}: {e}")
        
        return {
            'added_count': added_count,
            'skipped_count': skipped_count,
            'invalid_count': invalid_count,
            'total_processed': len(urls)
        }
    
    async def update_allowed_domains(self, action: str, domains: List[str]) -> Dict[str, Any]:
        """Update allowed domains configuration."""
        if not self.crawler_engine or not self.config:
            raise CrawlError("Crawler not initialized")
        
        if self.config.allowed_domains is None:
            self.config.allowed_domains = []
        
        current_domains = set(self.config.allowed_domains)
        domains_to_process = set(d.lower().strip() for d in domains if d.strip())
        original_count = len(current_domains)
        
        if action == 'add':
            current_domains.update(domains_to_process)
            added_count = len(current_domains) - original_count
            message = f"Added {added_count} unique domains"
        elif action == 'remove':
            current_domains.difference_update(domains_to_process)
            removed_count = original_count - len(current_domains)
            message = f"Removed {removed_count} domains"
        elif action == 'replace':
            current_domains = domains_to_process
            message = f"Replaced allowed domains list with {len(current_domains)} domains"
        else:
            raise ValueError("Invalid action. Must be 'add', 'remove', or 'replace'")
        
        self.config.allowed_domains = sorted(list(current_domains))
        logger.info(f"Updated allowed domains: {action}. New list: {self.config.allowed_domains}")
        
        return {
            'message': message,
            'allowed_domains': self.config.allowed_domains,
            'total_domains': len(self.config.allowed_domains)
        }
    
    async def get_allowed_domains(self) -> List[str]:
        """Get current allowed domains."""
        if not self.config:
            return []
        return self.config.allowed_domains or []
    
    async def reset_crawl_status(self, clear_completed: bool = True, clear_seen: bool = True,
                                clear_processing: bool = False, clear_queue: bool = False) -> Dict[str, Any]:
        """Reset crawler status and clear data."""
        if not self.crawler_engine or not self.crawler_engine.url_frontier:
            raise CrawlError("Crawler not initialized")
        
        try:
            result = await self.crawler_engine.url_frontier.clear_specific_data(
                clear_completed=clear_completed,
                clear_seen=clear_seen,
                clear_processing=clear_processing,
                clear_queue=clear_queue
            )
            
            # Reset metrics
            if self.crawler_engine.metrics:
                self.crawler_engine.metrics.reset()
            
            # Clear bloom filter
            if self.crawler_engine.bloom_filter:
                self.crawler_engine.bloom_filter.clear()
            
            logger.info("Crawler status reset successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error resetting crawler status: {e}")
            raise CrawlError(f"Failed to reset crawler status: {e}")
    
    async def close(self):
        """Close the crawler service and cleanup resources."""
        try:
            await self.stop_crawler()
            if self.crawler_engine:
                await self.crawler_engine.close()
            logger.info("Crawler service closed successfully")
        except Exception as e:
            logger.error(f"Error closing crawler service: {e}")
    
    async def process_document(self, document: Dict[str, Any]) -> bool:
        """
        Process a crawled document through Kafka and/or file storage.
        
        Args:
            document: The crawled document data
            
        Returns:
            True if processed successfully, False otherwise
        """
        try:
            # Add timestamp if not present
            if "timestamp" not in document:
                document["timestamp"] = datetime.now(timezone.utc).isoformat()
            
            success = True
            
            # Send to Kafka if enabled
            if self.kafka_service:
                kafka_success = await self.kafka_service.send_document(document)
                if not kafka_success:
                    logger.warning(f"Failed to send document to Kafka: {document.get('url', 'unknown')}")
                    success = False
            
            # Save to file if enabled
            if self.file_storage_service:
                file_success = await self.file_storage_service.save_document(document)
                if not file_success:
                    logger.warning(f"Failed to save document to file: {document.get('url', 'unknown')}")
                    success = False
            
            return success
            
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            return False
    
    async def process_documents_batch(self, documents: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Process multiple documents in batch.
        
        Args:
            documents: List of documents to process
            
        Returns:
            Dictionary with processing results
        """
        results = {"kafka_success": 0, "kafka_failed": 0, "file_success": 0, "file_failed": 0}
        
        try:
            # Process Kafka batch if enabled
            if self.kafka_service:
                kafka_results = await self.kafka_service.send_batch(documents)
                results["kafka_success"] = kafka_results["success"]
                results["kafka_failed"] = kafka_results["failed"]
            
            # Process file storage batch if enabled
            if self.file_storage_service:
                file_results = await self.file_storage_service.save_batch(documents)
                results["file_success"] = file_results["success"]
                results["file_failed"] = file_results["failed"]
            
            logger.info(f"Batch processing completed: Kafka={results['kafka_success']}/{results['kafka_failed']}, "
                       f"File={results['file_success']}/{results['file_failed']}")
            
        except Exception as e:
            logger.error(f"Error in batch processing: {e}")
        
        return results


# Global crawler service instance
crawler_service = CrawlerService() 