"""
File storage service for local document persistence.
Handles saving crawl data to local file system.
"""

import json
import os
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
import hashlib
from urllib.parse import urlparse

from core.logger import get_logger
from exceptions import ServiceError

logger = get_logger("file_storage_service")


class FileStorageService:
    """Service for managing local file storage operations."""
    
    def __init__(self, output_dir: str = "output", max_file_size: int = 100 * 1024 * 1024):  # 100MB default
        self.output_dir = Path(output_dir)
        self.max_file_size = max_file_size
        self.enabled = True
        self.current_file: Optional[Path] = None
        self.current_file_size = 0
        self.file_counter = 0
        
    async def initialize(self):
        """Initialize the file storage service."""
        try:
            # Create output directory if it doesn't exist
            self.output_dir.mkdir(parents=True, exist_ok=True)
            
            # Create subdirectories for different data types
            (self.output_dir / "documents").mkdir(exist_ok=True)
            (self.output_dir / "metadata").mkdir(exist_ok=True)
            (self.output_dir / "logs").mkdir(exist_ok=True)
            
            logger.info(f"File storage service initialized: output_dir={self.output_dir}")
            
        except Exception as e:
            logger.error(f"Failed to initialize file storage service: {e}")
            self.enabled = False
            raise ServiceError(f"File storage initialization failed: {e}")
    
    def _get_safe_filename(self, url: str) -> str:
        """Generate a safe filename from URL."""
        parsed = urlparse(url)
        domain = parsed.netloc.replace(".", "_")
        path = parsed.path.replace("/", "_").replace(".", "_")
        if not path or path == "_":
            path = "index"
        
        # Create a hash of the full URL for uniqueness
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        
        return f"{domain}_{path}_{url_hash}.json"
    
    def _sanitize_folder_name(self, name: str) -> str:
        """Sanitize folder name for filesystem safety."""
        return ''.join(c if c.isalnum() or c in ('-', '_') else '_' for c in name)[:64]

    def _get_document_path(self, url: str, job_name: str = 'unknown_job') -> Path:
        """Get the file path for a document, using a job-specific subfolder."""
        filename = self._get_safe_filename(url)
        safe_job = self._sanitize_folder_name(job_name)
        return self.output_dir / "documents" / safe_job / filename
    
    async def save_document(self, document: Dict[str, Any]) -> bool:
        """
        Save a single document to local file system.
        
        Args:
            document: Document data to save
            
        Returns:
            True if saved successfully, False otherwise
        """
        if not self.enabled:
            logger.warning("File storage service not available")
            return False
        
        try:
            url = document.get("url", "unknown")
            job_name = document.get("job_name") or document.get("job") or "unknown_job"
            file_path = self._get_document_path(url, job_name)
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Add metadata
            document_with_metadata = {
                "timestamp": document.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                "url": url,
                "domain": document.get("domain"),
                "depth": document.get("depth", 0),
                "content": document.get("content", {}),
                "metadata": {
                    "crawler_version": "1.0.0",
                    "source": "donut-bot-backend",
                    "file_path": str(file_path),
                    "saved_at": datetime.now(timezone.utc).isoformat()
                }
            }
            
            # Save to file
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(document_with_metadata, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"Saved document to file: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving document to file: {e}")
            return False
    
    async def save_batch(self, documents: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Save multiple documents to local file system.
        
        Args:
            documents: List of documents to save
            
        Returns:
            Dictionary with success and failure counts
        """
        if not self.enabled:
            logger.warning("File storage service not available")
            return {"success": 0, "failed": len(documents)}
        
        results = {"success": 0, "failed": 0}
        
        for document in documents:
            success = await self.save_document(document)
            if success:
                results["success"] += 1
            else:
                results["failed"] += 1
        
        logger.info(f"Batch save completed: {results['success']} success, {results['failed']} failed")
        return results
    
    async def save_metadata(self, metadata: Dict[str, Any], filename: str) -> bool:
        """
        Save metadata to a separate file.
        
        Args:
            metadata: Metadata to save
            filename: Name of the metadata file
            
        Returns:
            True if saved successfully, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            file_path = self.output_dir / "metadata" / f"{filename}.json"
            
            metadata_with_timestamp = {
                **metadata,
                "saved_at": datetime.now(timezone.utc).isoformat()
            }
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(metadata_with_timestamp, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"Saved metadata to file: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving metadata to file: {e}")
            return False
    
    async def get_storage_stats(self) -> Dict[str, Any]:
        """Get file storage statistics."""
        if not self.enabled:
            return {"enabled": False}
        
        try:
            documents_dir = self.output_dir / "documents"
            metadata_dir = self.output_dir / "metadata"
            
            doc_count = len(list(documents_dir.glob("*.json"))) if documents_dir.exists() else 0
            metadata_count = len(list(metadata_dir.glob("*.json"))) if metadata_dir.exists() else 0
            
            # Calculate total size
            total_size = 0
            if documents_dir.exists():
                for file_path in documents_dir.glob("*.json"):
                    total_size += file_path.stat().st_size
            
            return {
                "enabled": self.enabled,
                "output_dir": str(self.output_dir),
                "document_count": doc_count,
                "metadata_count": metadata_count,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting storage stats: {e}")
            return {"enabled": self.enabled, "error": str(e)}
    
    async def cleanup_old_files(self, max_age_days: int = 30) -> Dict[str, int]:
        """
        Clean up old files based on age.
        
        Args:
            max_age_days: Maximum age of files in days
            
        Returns:
            Dictionary with cleanup results
        """
        if not self.enabled:
            return {"deleted": 0, "failed": 0}
        
        try:
            cutoff_time = datetime.now(timezone.utc).timestamp() - (max_age_days * 24 * 3600)
            deleted_count = 0
            failed_count = 0
            
            for subdir in ["documents", "metadata"]:
                dir_path = self.output_dir / subdir
                if not dir_path.exists():
                    continue
                
                for file_path in dir_path.glob("*.json"):
                    try:
                        if file_path.stat().st_mtime < cutoff_time:
                            file_path.unlink()
                            deleted_count += 1
                            logger.debug(f"Deleted old file: {file_path}")
                    except Exception as e:
                        logger.error(f"Failed to delete file {file_path}: {e}")
                        failed_count += 1
            
            logger.info(f"Cleanup completed: {deleted_count} deleted, {failed_count} failed")
            return {"deleted": deleted_count, "failed": failed_count}
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            return {"deleted": 0, "failed": 1}


# Global file storage service instance
_file_storage_service: Optional[FileStorageService] = None


async def get_file_storage_service(output_dir: str = "output") -> FileStorageService:
    """Get the file storage service instance."""
    global _file_storage_service
    
    if _file_storage_service is None:
        _file_storage_service = FileStorageService(output_dir)
        await _file_storage_service.initialize()
    
    return _file_storage_service


async def close_file_storage_service():
    """Close the file storage service instance."""
    global _file_storage_service
    if _file_storage_service:
        _file_storage_service = None 