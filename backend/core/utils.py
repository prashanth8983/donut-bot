"""Utility functions for the backend."""

from datetime import datetime, timezone
from typing import Any, Dict, Union


def convert_datetimes(obj: Any) -> Any:
    """Convert datetime objects to ISO format strings."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: convert_datetimes(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetimes(item) for item in obj]
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


def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format."""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f} {size_names[i]}"


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