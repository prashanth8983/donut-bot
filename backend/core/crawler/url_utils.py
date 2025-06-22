"""
URL utilities for the crawler.
Provides URL normalization and validation functions.
"""

from urllib.parse import urljoin, urlparse, urlunparse
from typing import Optional

def normalize_url(url: str) -> Optional[str]:
    """
    Normalize a URL by ensuring it has a scheme and is properly formatted.
    
    Args:
        url: The URL to normalize
        
    Returns:
        Normalized URL or None if invalid
    """
    if not url or not isinstance(url, str):
        return None
    
    url = url.strip()
    if not url:
        return None
    
    # Add scheme if missing
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return None
        
        # Normalize the URL
        normalized = urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path,
            parsed.params,
            parsed.query,
            parsed.fragment
        ))
        
        return normalized
    except Exception:
        return None

def is_valid_url(url: str) -> bool:
    """
    Check if a URL is valid.
    
    Args:
        url: The URL to validate
        
    Returns:
        True if valid, False otherwise
    """
    return normalize_url(url) is not None

def get_domain(url: str) -> Optional[str]:
    """
    Extract domain from URL.
    
    Args:
        url: The URL to extract domain from
        
    Returns:
        Domain name or None if invalid
    """
    normalized = normalize_url(url)
    if not normalized:
        return None
    
    try:
        return urlparse(normalized).netloc
    except Exception:
        return None

def is_same_domain(url1: str, url2: str) -> bool:
    """
    Check if two URLs belong to the same domain.
    
    Args:
        url1: First URL
        url2: Second URL
        
    Returns:
        True if same domain, False otherwise
    """
    domain1 = get_domain(url1)
    domain2 = get_domain(url2)
    
    if not domain1 or not domain2:
        return False
    
    return domain1.lower() == domain2.lower()

def resolve_relative_url(base_url: str, relative_url: str) -> Optional[str]:
    """
    Resolve a relative URL against a base URL.
    
    Args:
        base_url: The base URL
        relative_url: The relative URL to resolve
        
    Returns:
        Resolved absolute URL or None if invalid
    """
    try:
        resolved = urljoin(base_url, relative_url)
        return normalize_url(resolved)
    except Exception:
        return None 