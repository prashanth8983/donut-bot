"""
Configuration service for managing crawler configuration.
Provides business logic for configuration operations.
"""

from typing import List, Dict, Any
from ..core.logger import get_logger
from ..exceptions import ConfigurationError
from ..db.schemas import CrawlerConfigModel

logger = get_logger("config_service")


class ConfigService:
    """Service for managing configuration operations."""
    
    def __init__(self, crawler_service):
        self.crawler_service = crawler_service
    
    async def get_configuration(self) -> Dict[str, Any]:
        """Get current configuration."""
        if not self.crawler_service.config:
            raise ConfigurationError("Configuration not initialized")
        
        try:
            config = self.crawler_service.config
            return {
                'workers': config.workers,
                'max_depth': config.max_depth,
                'max_pages': config.max_pages,
                'default_delay': config.default_delay,
                'allowed_domains': config.allowed_domains or [],
                'kafka_brokers': config.kafka_brokers,
                'output_topic': config.output_topic,
                'enable_kafka_output': config.enable_kafka_output,
                'enable_local_save': config.enable_local_save,
                'local_output_dir': config.local_output_dir,
                'redis_host': config.redis_host,
                'redis_port': config.redis_port,
                'respect_robots_txt': config.respect_robots_txt,
                'user_agent': config.user_agent
            }
        except Exception as e:
            logger.error(f"Error getting configuration: {e}")
            raise ConfigurationError(f"Failed to get configuration: {e}")
    
    async def update_configuration(self, new_config: CrawlerConfigModel) -> Dict[str, Any]:
        """Update configuration."""
        if not self.crawler_service.config:
            raise ConfigurationError("Configuration not initialized")
        
        try:
            # Update configuration
            current_config = self.crawler_service.config
            
            # Update fields from new config
            for field, value in new_config.dict(exclude_unset=True).items():
                if hasattr(current_config, field):
                    setattr(current_config, field, value)
            
            # If crawler is running, we might need to restart it with new config
            if self.crawler_service.crawler_engine and self.crawler_service.crawler_engine.running:
                logger.warning("Configuration updated while crawler is running. Some changes may require restart.")
            
            logger.info("Configuration updated successfully")
            return {
                'message': 'Configuration updated successfully',
                'config': await self.get_configuration()
            }
        except Exception as e:
            logger.error(f"Error updating configuration: {e}")
            raise ConfigurationError(f"Failed to update configuration: {e}")
    
    async def get_allowed_domains(self) -> List[str]:
        """Get allowed domains configuration."""
        if not self.crawler_service.config:
            return []
        
        return self.crawler_service.config.allowed_domains or []
    
    async def update_allowed_domains(self, action: str, domains: List[str]) -> Dict[str, Any]:
        """Update allowed domains configuration."""
        if not self.crawler_service.config:
            raise ConfigurationError("Configuration not initialized")
        
        try:
            if self.crawler_service.config.allowed_domains is None:
                self.crawler_service.config.allowed_domains = []
            
            current_domains = set(self.crawler_service.config.allowed_domains)
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
            
            self.crawler_service.config.allowed_domains = sorted(list(current_domains))
            logger.info(f"Updated allowed domains: {action}. New list: {self.crawler_service.config.allowed_domains}")
            
            return {
                'message': message,
                'allowed_domains': self.crawler_service.config.allowed_domains,
                'total_domains': len(self.crawler_service.config.allowed_domains)
            }
        except ValueError as e:
            raise e
        except Exception as e:
            logger.error(f"Error updating allowed domains: {e}")
            raise ConfigurationError(f"Failed to update allowed domains: {e}")


# Dependency injection
async def get_config_service():
    """Get configuration service instance."""
    from .crawler_service import crawler_service
    return ConfigService(crawler_service) 