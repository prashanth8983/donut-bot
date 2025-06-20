class CrawlError(Exception):
    pass

class RobotsError(CrawlError):
    def __str__(self):
        return "Robots error"

class RateLimitError(CrawlError):
    def __str__(self):
        return "Rate limit"

class FetchError(CrawlError):
    def __str__(self):
        return "Fetch error"

class ConfigurationError(Exception):
    def __str__(self):
        return "Config error"

class QueueError(Exception):
    def __str__(self):
        return "Queue error"