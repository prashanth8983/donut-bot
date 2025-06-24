"""
Kafka service for real-time data streaming.
Handles Kafka producer operations for crawl data output.
"""

import json
import asyncio
from typing import Dict, Any, Optional, List
from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaError as AIOKafkaError

from ..core.logger import get_logger
from ..exceptions import KafkaError

logger = get_logger("kafka_service")


class KafkaService:
    """Service for managing Kafka producer operations."""
    
    def __init__(self, brokers: List[str], topic: str):
        self.brokers = brokers
        self.topic = topic
        self.producer: Optional[AIOKafkaProducer] = None
        self.enabled = bool(brokers and topic)
        
    async def initialize(self):
        """Initialize the Kafka producer."""
        if not self.enabled:
            logger.info("Kafka service disabled - no brokers or topic configured")
            return
            
        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=",".join(self.brokers),
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                retry_backoff_ms=1000
            )
            await self.producer.start()
            logger.info(f"Kafka producer initialized: brokers={self.brokers}, topic={self.topic}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Kafka producer: {e}")
            self.enabled = False
            raise KafkaError(f"Kafka initialization failed: {e}")
    
    async def close(self):
        """Close the Kafka producer."""
        if self.producer:
            try:
                await self.producer.stop()
                logger.info("Kafka producer closed")
            except Exception as e:
                logger.error(f"Error closing Kafka producer: {e}")
            finally:
                self.producer = None
    
    async def send_document(self, document: Dict[str, Any], key: Optional[str] = None) -> bool:
        """
        Send a document to Kafka topic.
        
        Args:
            document: Document data to send
            key: Optional message key
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.enabled or not self.producer:
            logger.warning("Kafka producer not available")
            return False
            
        try:
            # Add metadata to document
            document_with_metadata = {
                "timestamp": document.get("timestamp"),
                "url": document.get("url"),
                "domain": document.get("domain"),
                "depth": document.get("depth", 0),
                "content": document.get("content", {}),
                "metadata": {
                    "crawler_version": "1.0.0",
                    "source": "donut-bot-backend"
                }
            }
            
            # Send to Kafka
            await self.producer.send_and_wait(
                topic=self.topic,
                value=document_with_metadata,
                key=key or document.get("url", "unknown")
            )
            
            logger.debug(f"Sent document to Kafka: {document.get('url', 'unknown')}")
            return True
            
        except AIOKafkaError as e:
            logger.error(f"Kafka error sending document: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending document to Kafka: {e}")
            return False
    
    async def send_batch(self, documents: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Send multiple documents to Kafka topic.
        
        Args:
            documents: List of documents to send
            
        Returns:
            Dictionary with success and failure counts
        """
        if not self.enabled or not self.producer:
            logger.warning("Kafka producer not available")
            return {"success": 0, "failed": len(documents)}
        
        results = {"success": 0, "failed": 0}
        
        for document in documents:
            success = await self.send_document(document)
            if success:
                results["success"] += 1
            else:
                results["failed"] += 1
        
        logger.info(f"Batch send completed: {results['success']} success, {results['failed']} failed")
        return results
    
    async def get_status(self) -> Dict[str, Any]:
        """Get Kafka service status."""
        return {
            "enabled": self.enabled,
            "brokers": self.brokers,
            "topic": self.topic,
            "producer_available": self.producer is not None
        }


# Global Kafka service instance
_kafka_service: Optional[KafkaService] = None


async def get_kafka_service(brokers: Optional[List[str]] = None, topic: Optional[str] = None) -> Optional[KafkaService]:
    """Get the Kafka service instance."""
    global _kafka_service
    
    if _kafka_service is None and brokers and topic:
        _kafka_service = KafkaService(brokers, topic)
        await _kafka_service.initialize()
    
    return _kafka_service


async def close_kafka_service():
    """Close the Kafka service instance."""
    global _kafka_service
    if _kafka_service:
        await _kafka_service.close()
        _kafka_service = None 