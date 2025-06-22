from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .url_utils import normalize_url

class ContentExtractor:
    def __init__(self):
        pass
    
    def extract(self, html_content, base_url):
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            norm_url = normalize_url(base_url)
            return {
                'title': self._extract_title(soup),
                'meta_description': self._extract_meta_description(soup),
                'links': self._extract_links(soup, norm_url),
                'images': self._extract_images(soup, norm_url),
                'text_preview': self._extract_text_preview(soup),
                'metadata': self._extract_metadata(soup),
                'original_base_url': base_url,
                'normalized_base_url': norm_url
            }
        except:
            return {
                'title': '',
                'meta_description': '',
                'links': [],
                'images': [],
                'text_preview': '',
                'metadata': {}
            }

    def _extract_title(self, soup):
        title = soup.find('title')
        if title and title.string: return title.string.strip()
        og = soup.find('meta', property='og:title')
        if og and og.get('content'): return og['content'].strip()
        h1 = soup.find('h1')
        if h1 and h1.string: return h1.string.strip()
        return ''

    def _extract_meta_description(self, soup):
        meta = soup.find('meta', attrs={'name': 'description'})
        if meta and meta.get('content'): return meta['content'].strip()
        og = soup.find('meta', property='og:description')
        if og and og.get('content'): return og['content'].strip()
        twitter = soup.find('meta', attrs={'name': 'twitter:description'})
        if twitter and twitter.get('content'): return twitter['content'].strip()
        return ''

    def _extract_links(self, soup, norm_url):
        links = set()
        for tag in soup.find_all('a', href=True):
            href = tag['href'].strip()
            if not href or href.startswith(('#', 'javascript:', 'mailto:')):
                continue
            try:
                abs_url = urljoin(norm_url, href)
                norm_link = normalize_url(abs_url)
                from urllib.parse import urlparse
                if urlparse(norm_link).scheme in ['http', 'https']:
                    links.add(norm_link)
            except:
                continue
        return list(links)

    def _extract_images(self, soup, norm_url):
        images = []
        for img in soup.find_all('img'):
            src = img.get('src')
            if not src: continue
            abs_src = normalize_url(urljoin(norm_url, src.strip()))
            img_info = {
                'src': abs_src,
                'alt': img.get('alt', '').strip(),
                'title': img.get('title', '').strip()
            }
            if img.get('width'): img_info['width'] = img['width']
            if img.get('height'): img_info['height'] = img['height']
            images.append(img_info)
        return images

    def _extract_text_preview(self, soup, max_len=500):
        for tag in soup(['script', 'style', 'header', 'footer', 'nav', 'aside']):
            tag.decompose()
        main = soup.find('main') or soup.find('article') or soup.find('div', role='main')
        text = main.get_text(separator=' ', strip=True) if main else (
            soup.find('body').get_text(separator=' ', strip=True) if soup.find('body') else
            soup.get_text(separator=' ', strip=True)
        )
        text = ' '.join(text.split())
        return text[:max_len].rsplit(' ', 1)[0] + '...' if len(text) > max_len else text

    def _extract_metadata(self, soup):
        meta = {}
        for prop in ['og:type', 'og:site_name', 'og:image', 'og:url']:
            tag = soup.find('meta', property=prop)
            if tag and tag.get('content'): meta[prop] = tag['content'].strip()
        canonical = soup.find('link', rel='canonical')
        if canonical and canonical.get('href'):
            meta['canonical_url'] = normalize_url(canonical['href'].strip())
        html = soup.find('html')
        if html and html.get('lang'): meta['language'] = html['lang']
        return meta