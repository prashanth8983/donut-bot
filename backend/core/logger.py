"""
Logging configuration for the donut-bot backend.
Provides structured logging with different levels and formats.
"""

import logging
import sys
from typing import Any, Dict

from config import settings


def setup_logger(name: str = "donut-bot") -> logging.Logger:
    """Setup and configure logger for the application."""
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, settings.log_level.upper()))
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, settings.log_level.upper()))
    
    # Create formatter
    if settings.debug:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # Set propagation to False to avoid duplicate logs
    logger.propagate = False
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name."""
    return logging.getLogger(f"donut-bot.{name}")


# Create default logger
logger = setup_logger() 