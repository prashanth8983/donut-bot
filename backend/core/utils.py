"""
Common utilities for the donut-bot backend.
Includes helper functions used across the application.
"""

import datetime
from typing import Any, Dict, List, Union


def convert_datetimes(obj: Any) -> Any:
    """
    Recursively convert datetime objects to ISO format strings.
    Used for JSON serialization of response data.
    """
    if isinstance(obj, dict):
        return {k: convert_datetimes(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetimes(i) for i in obj]
    elif isinstance(obj, datetime.datetime):
        return obj.isoformat()
    else:
        return obj


def normalize_url(url: str) -> str:
    """Normalize URL by ensuring it has a scheme."""
    if not url.startswith(('http://', 'https://')):
        return f"https://{url}"
    return url


def extract_domain(url: str) -> str:
    """Extract domain from URL."""
    from urllib.parse import urlparse
    parsed = urlparse(normalize_url(url))
    return parsed.netloc


def validate_url(url: str) -> bool:
    """Validate if a string is a valid URL."""
    from urllib.parse import urlparse
    try:
        result = urlparse(normalize_url(url))
        return all([result.scheme, result.netloc])
    except Exception:
        return False


def chunk_list(lst: List[Any], chunk_size: int) -> List[List[Any]]:
    """Split a list into chunks of specified size."""
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]


def safe_get(dictionary: Dict[str, Any], key: str, default: Any = None) -> Any:
    """Safely get a value from a dictionary with a default."""
    return dictionary.get(key, default)


def format_bytes(bytes_value: int) -> str:
    """Format bytes to human readable format."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_value < 1024.0:
            return f"{bytes_value:.1f} {unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.1f} TB"


def format_duration(seconds: float) -> str:
    """Format duration in seconds to human readable format."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f}m"
    else:
        hours = seconds / 3600
        return f"{hours:.1f}h" 