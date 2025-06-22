"""
Scheduler for crawl jobs.
Handles job queueing, prioritization, and scheduling logic.
"""

from typing import List, Optional
from ..logger import get_logger

logger = get_logger("crawler.scheduler")

class CrawlerScheduler:
    def __init__(self):
        self.job_queue = []  # TODO: Replace with a proper queue

    def add_job(self, job):
        logger.info(f"Adding job to scheduler: {job}")
        self.job_queue.append(job)
        # TODO: Implement prioritization and scheduling

    def get_next_job(self):
        # TODO: Implement job selection logic
        if self.job_queue:
            return self.job_queue.pop(0)
        return None 