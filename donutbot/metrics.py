import time
from dataclasses import dataclass, field
import json

@dataclass
class CrawlerMetrics:
    pages_crawled: int = 0
    pages_failed: int = 0
    robots_denied: int = 0
    errors: int = 0
    total_bytes: int = 0
    start_time: float = field(default_factory=time.time)
    response_times: list = field(default_factory=list)
    status_codes: dict = field(default_factory=dict)
    domains_crawled: set = field(default_factory=set)

    def record_response(self, status_code, response_time, content_size):
        self.pages_crawled += 1
        self.total_bytes += content_size
        self.response_times.append(response_time)
        self.status_codes[status_code] = self.status_codes.get(status_code, 0) + 1

    def record_error(self, error_type='general'):
        self.errors += 1
        if error_type == 'robots':
            self.robots_denied += 1
        elif error_type == 'fetch':
            self.pages_failed += 1

    def add_domain(self, domain):
        self.domains_crawled.add(domain)

    def get_stats(self):
        elapsed = time.time() - self.start_time
        avg_response = sum(self.response_times) / len(self.response_times) if self.response_times else 0
        crawl_rate = self.pages_crawled / elapsed if elapsed > 0 else 0
        success_rate = (self.pages_crawled / (self.pages_crawled + self.pages_failed) * 100) if self.pages_crawled > 0 else 0
        return {
            'pages_crawled': self.pages_crawled,
            'pages_failed': self.pages_failed,
            'robots_denied': self.robots_denied,
            'total_errors': self.errors,
            'total_bytes': self.total_bytes,
            'domains_crawled': len(self.domains_crawled),
            'elapsed_time': elapsed,
            'crawl_rate': crawl_rate,
            'avg_response_time': avg_response,
            'status_codes': dict(self.status_codes),
            'success_rate': success_rate
        }

    async def export(self, export_type='json'):
        stats = self.get_stats()
        if export_type == 'json':
            return json.dumps(stats)
        if export_type == 'prometheus':
            lines = [
                f'crawler_pages_total{{status="success"}} {self.pages_crawled}',
                f'crawler_pages_total{{status="failed"}} {self.pages_failed}',
                f'crawler_pages_total{{status="robots_denied"}} {self.robots_denied}',
                f'crawler_errors_total {self.errors}',
                f'crawler_bytes_total {self.total_bytes}',
                f'crawler_domains_total {len(self.domains_crawled)}',
                f'crawler_rate_per_second {stats["crawl_rate"]}',
                f'crawler_response_time_avg {stats["avg_response_time"]}'
            ]
            for code, count in self.status_codes.items():
                lines.append(f'crawler_status_codes{{code="{code}"}} {count}')
            return '\n'.join(lines)
        return str(stats)

    def reset(self):
        self.__init__()