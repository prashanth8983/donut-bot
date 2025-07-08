"""
Crawler service for managing the crawler engine.
Provides business logic for crawler operations.
"""

import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from core.crawler.engine import CrawlerEngine
from core.crawler.config import CrawlerConfig
from core.logger import get_logger
from exceptions import CrawlError, ConfigurationError
from services.kafka_service import get_kafka_service
from services.file_storage_service import get_file_storage_service
from services.job_service import JobService
from db.database import database
from db.schemas import JobUpdate

logger = get_logger("crawler_service")


class CrawlerService:
    """Service for managing the crawler engine."""
    
    def __init__(self):
        self.crawler_engine: Optional[CrawlerEngine] = None
        self.config: Optional[CrawlerConfig] = None
        self.crawler_task: Optional[asyncio.Task] = None
        self.progress_task: Optional[asyncio.Task] = None
        self.kafka_service = None
        self.file_storage_service = None
        self.job_service: Optional[JobService] = None
        self.current_job_id: Optional[str] = None
        
    async def initialize(self, config: CrawlerConfig, mongodb_client):
        """Initialize the crawler service with configuration."""
        try:
            logger.info("Initializing crawler service...")
            self.config = config
            self.crawler_engine = CrawlerEngine(config, mongodb_client)
            await self.crawler_engine.initialize()
            
            # Initialize job service for progress tracking
            self.job_service = JobService(database)
            
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
    
    async def start_crawler(self, job_id: Optional[str] = None) -> bool:
        """Start the crawler engine."""
        try:
            if not self.crawler_engine:
                raise CrawlError("Crawler engine not initialized")
            
            if self.crawler_engine.running:
                logger.warning("Crawler is already running")
                return True
            
            logger.info("Starting crawler...")
            self.current_job_id = job_id
            
            # Mark job as running if job_id is provided
            if job_id and self.job_service:
                try:
                    # Update job status to running
                    await self.job_service.start_job(job_id)
                    logger.info(f"Marked job {job_id} as running")
                except Exception as e:
                    logger.error(f"Failed to mark job {job_id} as running: {e}")
            
            self.crawler_task = asyncio.create_task(self.crawler_engine.run())
            
            # Start progress tracking if job_id is provided
            if job_id and self.job_service:
                self.progress_task = asyncio.create_task(self._track_progress(job_id))
                logger.info(f"Started progress tracking for job: {job_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to start crawler: {e}")
            return False
    
    async def stop_crawler(self) -> bool:
        """Stop the crawler engine."""
        try:
            if not self.crawler_engine:
                logger.warning("Crawler engine not initialized")
                return True
            
            if not self.crawler_engine.running:
                logger.info("Crawler is not running")
                return True
            
            logger.info("Stopping crawler...")
            
            # Stop the crawler engine
            await self.crawler_engine.stop()
            
            # Cancel progress tracking task
            if self.progress_task and not self.progress_task.done():
                self.progress_task.cancel()
                try:
                    await self.progress_task
                except asyncio.CancelledError:
                    pass
            
            # Mark job as completed if it was running
            if self.current_job_id and self.job_service:
                try:
                    # Get final stats from crawler
                    status = await self.crawler_engine.get_status()
                    pages_crawled = status.get('pages_crawled_total', 0)
                    
                    final_stats = {
                        'pages_found': pages_crawled,
                        'errors': status.get('total_errors_count', 0),
                        'data_size': f"{pages_crawled * 0.1:.1f} MB",
                        'avg_response_time': f"{status.get('avg_pages_per_second', 0):.1f}s",
                        'success_rate': 100.0 if pages_crawled == 0 else max(0, 100 - (status.get('total_errors_count', 0) / pages_crawled * 100))
                    }
                    
                    await self.job_service.complete_job(self.current_job_id, final_stats)
                    logger.info(f"Marked job {self.current_job_id} as completed after manual stop")
                except Exception as e:
                    logger.error(f"Failed to mark job {self.current_job_id} as completed: {e}")
            
            self.current_job_id = None
            self.crawler_task = None
            self.progress_task = None
            
            logger.info("Crawler stopped successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop crawler: {e}")
            return False

    async def pause_crawler(self) -> bool:
        """Pause the crawler engine while preserving state."""
        try:
            if not self.crawler_engine:
                logger.warning("Crawler engine not initialized")
                return True
            
            if not self.crawler_engine.running:
                logger.info("Crawler is not running")
                return True
            
            logger.info("Pausing crawler...")
            
            # Stop the crawler engine but preserve state
            await self.crawler_engine.stop()
            
            # Cancel progress tracking task
            if self.progress_task and not self.progress_task.done():
                self.progress_task.cancel()
                try:
                    await self.progress_task
                except asyncio.CancelledError:
                    pass
            
            # Mark job as paused if it was running
            if self.current_job_id and self.job_service:
                try:
                    await self.job_service.pause_job(self.current_job_id)
                    logger.info(f"Marked job {self.current_job_id} as paused")
                except Exception as e:
                    logger.error(f"Failed to mark job {self.current_job_id} as paused: {e}")
            
            # Don't clear current_job_id - keep it for resume
            self.crawler_task = None
            self.progress_task = None
            
            logger.info("Crawler paused successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to pause crawler: {e}")
            return False

    async def resume_crawler(self, job_id: Optional[str] = None) -> bool:
        """Resume the crawler engine."""
        try:
            if not self.crawler_engine:
                raise CrawlError("Crawler engine not initialized")
            
            if self.crawler_engine.running:
                logger.warning("Crawler is already running")
                return True
            
            # Use provided job_id or current_job_id
            resume_job_id = job_id or self.current_job_id
            if not resume_job_id:
                raise CrawlError("No job ID provided for resume")
            
            logger.info(f"Resuming crawler for job: {resume_job_id}")
            
            # Mark job as running
            if self.job_service:
                try:
                    await self.job_service.resume_job(resume_job_id)
                    logger.info(f"Marked job {resume_job_id} as running")
                except Exception as e:
                    logger.error(f"Failed to mark job {resume_job_id} as running: {e}")
            
            # Update current job ID
            self.current_job_id = resume_job_id
            
            # Start the crawler engine
            self.crawler_task = asyncio.create_task(self.crawler_engine.run())
            
            # Start progress tracking
            if self.job_service:
                self.progress_task = asyncio.create_task(self._track_progress(resume_job_id))
                logger.info(f"Started progress tracking for job: {resume_job_id}")
            
            logger.info("Crawler resumed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to resume crawler: {e}")
            return False

    async def pause_job(self, job_id: str) -> bool:
        """Pause a specific job and its associated crawler."""
        try:
            if not self.job_service:
                raise CrawlError("Job service not initialized")
            
            # Check if this is the current job
            if self.current_job_id != job_id:
                # If it's not the current job, just update the job status
                await self.job_service.pause_job(job_id)
                logger.info(f"Paused job {job_id} (not currently running)")
                return True
            
            # If it's the current job, pause the crawler too
            logger.info(f"Pausing current job and crawler: {job_id}")
            return await self.pause_crawler()
            
        except Exception as e:
            logger.error(f"Failed to pause job {job_id}: {e}")
            return False

    async def resume_job(self, job_id: str) -> bool:
        """Resume a specific job and its associated crawler."""
        try:
            if not self.job_service:
                raise CrawlError("Job service not initialized")
            
            # Check if crawler is already running
            if self.crawler_engine and self.crawler_engine.running:
                logger.warning("Crawler is already running")
                return False
            
            logger.info(f"Resuming job and crawler: {job_id}")
            return await self.resume_crawler(job_id)
            
        except Exception as e:
            logger.error(f"Failed to resume job {job_id}: {e}")
            return False
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current crawler status."""
        if not self.crawler_engine:
            return {
                'crawler_running': False,
                'error': 'Crawler not initialized'
            }
        
        try:
            status = await self.crawler_engine.get_status()
            
            # Add Redis connection status
            if self.crawler_engine.url_frontier:
                status['redis_connected'] = await self.crawler_engine.url_frontier.is_connected()
            else:
                status['redis_connected'] = False
                
            return status
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

            # Add job_name for file storage
            if self.current_job_id and self.job_service:
                job = await self.job_service.get_job_by_id(self.current_job_id)
                if job:
                    document["job_name"] = job.name
                else:
                    document["job_name"] = self.current_job_id
            else:
                document["job_name"] = "unknown_job"

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

    async def _track_progress(self, job_id: str):
        """Track and update job progress periodically."""
        try:
            while self.crawler_engine and self.crawler_engine.running:
                try:
                    # Get current crawler status
                    status = await self.crawler_engine.get_status()
                    
                    # Calculate progress based on pages crawled vs max pages
                    pages_crawled = status.get('pages_crawled_total', 0)
                    max_pages = status.get('max_pages_configured', 0)
                    queue_size = status.get('frontier_queue_size', 0)
                    completed = status.get('urls_completed_redis', 0)
                    
                    # Calculate progress
                    if max_pages and max_pages != "Unlimited":
                        progress = min(100.0, (pages_crawled / max_pages) * 100)
                    else:
                        # If no max pages limit, calculate based on queue size and completed
                        total = queue_size + completed
                        if total > 0:
                            progress = min(100.0, (completed / total) * 100)
                        else:
                            progress = 0.0
                    
                    # Check if crawler is done (queue empty and no pages in processing)
                    urls_in_processing = status.get('urls_in_processing', 0)
                    if queue_size == 0 and urls_in_processing == 0 and pages_crawled > 0:
                        # Crawler is done, mark job as completed
                        if self.job_service:
                            final_stats = {
                                'pages_found': pages_crawled,
                                'errors': status.get('total_errors_count', 0),
                                'data_size': f"{pages_crawled * 0.1:.1f} MB",
                                'avg_response_time': f"{status.get('avg_pages_per_second', 0):.1f}s",
                                'success_rate': 100.0 if pages_crawled == 0 else max(0, 100 - (status.get('total_errors_count', 0) / pages_crawled * 100))
                            }
                            await self.job_service.complete_job(job_id, final_stats)
                            logger.info(f"Marked job {job_id} as completed with {pages_crawled} pages")
                            break
                    
                    # Prepare stats for job update
                    stats = {
                        'pages_found': pages_crawled,
                        'errors': status.get('total_errors_count', 0),
                        'data_size': f"{pages_crawled * 0.1:.1f} MB",  # Rough estimate
                        'avg_response_time': f"{status.get('avg_pages_per_second', 0):.1f}s",
                        'success_rate': 100.0 if pages_crawled == 0 else max(0, 100 - (status.get('total_errors_count', 0) / pages_crawled * 100))
                    }
                    
                    # Update job progress
                    if self.job_service:
                        await self.job_service.update_job_progress(job_id, progress, stats)
                        logger.debug(f"Updated job {job_id} progress: {progress:.1f}% ({pages_crawled} pages)")
                    
                    # Wait before next update
                    await asyncio.sleep(5)  # Update every 5 seconds
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error tracking progress for job {job_id}: {e}")
                    await asyncio.sleep(5)
                    
        except asyncio.CancelledError:
            logger.info(f"Progress tracking cancelled for job {job_id}")
        except Exception as e:
            logger.error(f"Progress tracking failed for job {job_id}: {e}")


# Global crawler service instance
crawler_service = CrawlerService() 