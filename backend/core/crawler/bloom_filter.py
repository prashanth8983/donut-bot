"""
Bloom filter for the crawler.
Provides efficient URL deduplication.
"""

import hashlib
import math
from typing import Optional

from ..logger import get_logger

logger = get_logger("crawler.bloom_filter")


class BloomFilter:
    """Bloom filter for efficient URL deduplication."""
    
    def __init__(self, capacity: int, error_rate: float = 0.001):
        """
        Initialize bloom filter.
        
        Args:
            capacity: Expected number of elements
            error_rate: Desired false positive rate
        """
        self.capacity = capacity
        self.error_rate = error_rate
        self.count = 0
        
        # Calculate optimal parameters
        self.size = self._calculate_size(capacity, error_rate)
        self.hash_count = self._calculate_hash_count(self.size, capacity)
        
        # Initialize bit array
        self.bit_array = [False] * self.size
        
        logger.info(f"Bloom filter initialized: size={self.size}, hash_count={self.hash_count}, capacity={capacity}")
    
    def add(self, item: str) -> bool:
        """
        Add an item to the bloom filter.
        
        Args:
            item: The item to add
            
        Returns:
            True if item was added (not already present), False if already exists
        """
        if self.contains(item):
            return False
        
        # Add item to filter
        for i in range(self.hash_count):
            index = self._get_hash(item, i)
            self.bit_array[index] = True
        
        self.count += 1
        return True
    
    def contains(self, item: str) -> bool:
        """
        Check if an item is in the bloom filter.
        
        Args:
            item: The item to check
            
        Returns:
            True if item might be in the filter (with possibility of false positive)
        """
        for i in range(self.hash_count):
            index = self._get_hash(item, i)
            if not self.bit_array[index]:
                return False
        return True
    
    def clear(self):
        """Clear the bloom filter."""
        self.bit_array = [False] * self.size
        self.count = 0
        logger.info("Bloom filter cleared")
    
    def get_false_positive_rate(self) -> float:
        """
        Calculate current false positive rate.
        
        Returns:
            Current false positive rate
        """
        if self.count == 0:
            return 0.0
        
        # Calculate probability of false positive
        p = 1 - math.exp(-self.hash_count * self.count / self.size)
        return p ** self.hash_count
    
    def _calculate_size(self, capacity: int, error_rate: float) -> int:
        """Calculate optimal size for the bit array."""
        return int(-capacity * math.log(error_rate) / (math.log(2) ** 2))
    
    def _calculate_hash_count(self, size: int, capacity: int) -> int:
        """Calculate optimal number of hash functions."""
        return int(size / capacity * math.log(2))
    
    def _get_hash(self, item: str, seed: int) -> int:
        """Get hash value for an item with a specific seed."""
        # Create a hash using the item and seed
        hash_input = f"{item}:{seed}".encode('utf-8')
        hash_value = hashlib.md5(hash_input).hexdigest()
        
        # Convert to integer and map to bit array size
        return int(hash_value, 16) % self.size 