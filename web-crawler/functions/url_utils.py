from urllib.parse import urlparse, urlunparse, unquote, quote, parse_qs, urlencode
import re

PARENT_DIR_REGEX = re.compile(r'/[^/]+/\.\.(?:/|$)')
CURRENT_DIR_REGEX = re.compile(r'/\./')
MULTI_SLASH_REGEX = re.compile(r'//+')

def normalize_path(path):
    if not path or path == '/':
        return '/'
    if not path.startswith('/'):
        path = '/' + path
    segments = path.split('/')
    norm_segments = []
    for s in segments:
        if s == '..':
            if norm_segments and norm_segments[-1]:
                norm_segments.pop()
        elif s != '.':
            norm_segments.append(s)
    if not norm_segments or (len(norm_segments) == 1 and not norm_segments[0]):
        return '/'
    if len(norm_segments) > 1 and not norm_segments[0] and all(s == '' for s in norm_segments[1:]):
        return '/'
    path = "/".join(norm_segments)
    if path.startswith('//'):
        path = '/' + path.lstrip('/')
    if not path.startswith('/'):
        path = '/' + path
    if path.endswith('/') and len(path) > 1 and not path.endswith('/'):
        path += '/'
    path = MULTI_SLASH_REGEX.sub('/', path)
    return path or '/'

def normalize_url(url):
    try:
        parsed = urlparse(unquote(url))
        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()
        path = parsed.path or '/'
        query = parsed.query
        if not scheme or not netloc:
            return url
        if scheme == 'http' and netloc.endswith(':80') or scheme == 'https' and netloc.endswith(':443'):
            netloc = netloc.rsplit(':', 1)[0]
        path = normalize_path(path)
        if query:
            params = parse_qs(query, keep_blank_values=True)
            sorted_params = sorted((k, sorted(v) if isinstance(v, list) else [v]) for k, v in params.items())
            query = urlencode(sorted_params, doseq=True, quote_via=lambda x, _, __, ___: quote(x, safe=''))
        path = quote(path, safe='/')
        return urlunparse((scheme, netloc, path, parsed.params, query, ''))
    except:
        return url