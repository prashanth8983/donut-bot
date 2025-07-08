"""
Custom exceptions for the donut-bot backend.
Provides specific exception types for different error scenarios.
"""

from typing import Any, Dict, Optional


class DonutBotException(Exception):
    """Base exception for all donut-bot related errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class CrawlError(DonutBotException):
    """Exception raised when crawling operations fail."""
    pass


class ConfigurationError(DonutBotException):
    """Exception raised when configuration is invalid."""
    pass


class DatabaseError(DonutBotException):
    """Exception raised when database operations fail."""
    pass


class JobNotFoundError(DonutBotException):
    """Exception raised when a job is not found."""
    pass


class JobAlreadyExistsError(DonutBotException):
    """Exception raised when trying to create a job that already exists."""
    pass


class InvalidJobStateError(DonutBotException):
    """Exception raised when job state transition is invalid."""
    pass


class URLValidationError(DonutBotException):
    """Exception raised when URL validation fails."""
    pass


class RateLimitError(DonutBotException):
    """Exception raised when rate limiting is exceeded."""
    pass


class RobotsError(DonutBotException):
    """Exception raised when robots.txt operations fail."""
    pass


class RobotsTxtError(DonutBotException):
    """Exception raised when robots.txt parsing fails."""
    pass


class NetworkError(DonutBotException):
    """Exception raised when network operations fail."""
    pass


class SerializationError(DonutBotException):
    """Exception raised when data serialization fails."""
    pass


class ServiceError(Exception):
    """Exception for service-related errors."""
    pass


class KafkaError(DonutBotException):
    """Exception raised when Kafka operations fail."""
    pass 


class RedisError(Exception):
    """Raised when Redis operations fail."""
    pass 