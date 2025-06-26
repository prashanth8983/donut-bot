"""
Content extractor for the crawler.
Extracts text content and links from HTML pages.
"""

import re
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup, Tag
from urllib.parse import urljoin, urlparse

from core.logger import get_logger

logger = get_logger("crawler.content_extractor")


class ContentExtractor:
    """Extracts content and links from HTML pages."""
    
    def __init__(self, config):
        self.config = config
        
    async def extract(self, url: str, html_content: str, depth: int) -> Dict[str, Any]:
        """
        Extract content and links from HTML.
        
        Args:
            url: The URL of the page
            html_content: The HTML content
            depth: Current crawl depth
            
        Returns:
            Dictionary containing extracted data
        """
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Extract text content
            text_content = self._extract_text(soup)
            
            # Extract links
            links = self._extract_links(soup, url)
            
            # Extract metadata
            metadata = self._extract_metadata(soup, url)
            
            return {
                'url': url,
                'depth': depth,
                'title': metadata.get('title', ''),
                'text_content': text_content,
                'links': links,
                'metadata': metadata,
                'content_length': len(text_content),
                'links_count': len(links)
            }
            
        except Exception as e:
            logger.error(f"Error extracting content from {url}: {e}")
            return {
                'url': url,
                'depth': depth,
                'title': '',
                'text_content': '',
                'links': [],
                'metadata': {},
                'content_length': 0,
                'links_count': 0,
                'error': str(e)
            }
    
    def _extract_text(self, soup: BeautifulSoup) -> str:
        """Extract clean text content from HTML."""
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Get text and clean it up
        text = soup.get_text()
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        return text
    
    def _extract_links(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """Extract links from HTML."""
        links = []
        
        for link in soup.find_all('a', href=True):
            href = link['href'].strip()
            
            # Skip empty links
            if not href:
                continue
            
            # Resolve relative URLs
            absolute_url = urljoin(base_url, href)
            
            # Normalize URL
            try:
                parsed = urlparse(absolute_url)
                if parsed.scheme and parsed.netloc:
                    links.append(absolute_url)
            except Exception:
                continue
        
        # Remove duplicates while preserving order
        seen = set()
        unique_links = []
        for link in links:
            if link not in seen:
                seen.add(link)
                unique_links.append(link)
        
        return unique_links
    
    def _extract_metadata(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract metadata from HTML."""
        metadata = {
            'url': url,
            'title': '',
            'description': '',
            'keywords': '',
            'author': '',
            'language': '',
            'robots': '',
            'canonical': ''
        }
        
        # Extract title
        title_tag = soup.find('title')
        if title_tag:
            metadata['title'] = title_tag.get_text().strip()
        
        # Extract meta tags
        for meta in soup.find_all('meta'):
            name = meta.get('name', '').lower()
            property_attr = meta.get('property', '').lower()
            content = meta.get('content', '')
            
            if name == 'description' or property_attr == 'og:description':
                metadata['description'] = content
            elif name == 'keywords':
                metadata['keywords'] = content
            elif name == 'author':
                metadata['author'] = content
            elif name == 'robots':
                metadata['robots'] = content
            elif property_attr == 'og:title':
                metadata['title'] = metadata['title'] or content
        
        # Extract language
        html_tag = soup.find('html')
        if html_tag and isinstance(html_tag, Tag):
            metadata['language'] = str(html_tag.get('lang', ''))
        
        # Extract canonical URL
        canonical = soup.find('link', rel='canonical')
        if canonical and isinstance(canonical, Tag):
            metadata['canonical'] = str(canonical.get('href', ''))
        
        return metadata 