import hashlib
import math
from bitarray import bitarray
from typing import List
import logging

class BloomFilter:
    def __init__(self, capacity: int = 1000000, error_rate: float = 0.001):
        self.logger = logging.getLogger('bloom_filter')
        self.capacity = capacity
        self.error_rate = error_rate

        self.size = self._optimal_size(capacity, error_rate)
        if self.size == 0:
            self.logger.warning(f"Invalid size. Setting size to 1.")
            self.size = 1

        self.hash_count = self._optimal_hash_count(self.size, capacity)
        if self.hash_count == 0:
            self.logger.warning(f"Invalid hash count. Setting hash_count to 1.")
            self.hash_count = 1

        self.bit_array = bitarray(self.size)
        self.bit_array.setall(0)

        self.items_added_count = 0
        self.logger.info(f"BloomFilter initialized: Capacity={self.capacity}, ErrorRate={self.error_rate}, SizeBits={self.size}, Hashes={self.hash_count}")

    def add(self, item: str):
        """Add an item to the filter"""
        if not isinstance(item, str):
            self.logger.warning(f"Non-string item.")
            return
        for i in range(self.hash_count):
            index = self._hash(item, i) % self.size
            self.bit_array[index] = 1
        self.items_added_count += 1
        self.logger.debug(f"Added to BloomFilter: {item}. Current count: {self.items_added_count}")

    def contains(self, item: str) -> bool:
        """Check if item might be in the filter"""
        if not isinstance(item, str):
            self.logger.warning(f"Non-string item.")
            return False
        for i in range(self.hash_count):
            index = self._hash(item, i) % self.size
            if self.bit_array[index] == 0:
                return False
        return True

    def _hash(self, item: str, seed: int) -> int:
        """Generate hash for item with given seed"""
        hash_input = f"{item}{seed}".encode('utf-8')
        return int(hashlib.md5(hash_input).hexdigest(), 16)

    def _optimal_size(self, capacity: int, error_rate: float) -> int:
        """Calculate optimal bit array size"""
        if capacity <= 0:
            self.logger.warning("Invalid capacity.")
            capacity = 1
        if not (0 < error_rate < 1):
            self.logger.warning("Invalid range.")
            error_rate = 0.001

        size = -(capacity * math.log(error_rate)) / (math.log(2) ** 2)
        return int(math.ceil(size))

    def _optimal_hash_count(self, size: int, capacity: int) -> int:
        """Calculate optimal number of hash functions"""
        if capacity <= 0:
            self.logger.warning("Invalid capacity.")
            capacity = 1
        if size <= 0:
            self.logger.warning("Invalid size.")
            size = 1
        hash_count = (size / capacity) * math.log(2)
        return int(math.ceil(hash_count))

    @property
    def count(self) -> int:
        """Returns the number of items added to the filter."""
        return self.items_added_count

    def get_stats(self) -> dict:
        """Get filter statistics"""
        filled_bits = self.bit_array.count(1)
        fill_ratio = filled_bits / self.size if self.size > 0 else 0
        return {
            'configured_capacity': self.capacity,
            'configured_error_rate': self.error_rate,
            'optimal_size_bits': self.size,
            'optimal_hash_functions': self.hash_count,
            'items_added': self.items_added_count,
            'bits_set': filled_bits,
            'current_fill_ratio': round(fill_ratio, 4)
        }

    def clear(self):
        """Clear the filter by resetting the bit array and item count."""
        self.bit_array.setall(0)
        self.items_added_count = 0
        self.logger.info("Bloom filter cleared.")