"""
Configuration API endpoints.
Handles HTTP requests for configuration management operations.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator

from services.config_service import get_config_service, ConfigService
from db.schemas import CrawlerConfigModel
from exceptions import ConfigurationError
from core.logger import get_logger

logger = get_logger("config_api")
router = APIRouter()


class UpdateDomainsRequest(BaseModel):
    """Request model for updating allowed domains."""
    action: str  # 'add', 'remove', or 'replace'
    domains: List[str]
    
    @validator('action')
    def validate_action(cls, v):
        if v not in ['add', 'remove', 'replace']:
            raise ValueError("Invalid action. Must be 'add', 'remove', or 'replace'")
        return v


@router.get("/")
async def get_configuration(
    config_service: ConfigService = Depends(get_config_service)
):
    """Get current configuration."""
    try:
        config = await config_service.get_configuration()
        return config
    except Exception as e:
        logger.error(f"Error getting configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.put("/")
async def update_configuration(
    config: CrawlerConfigModel,
    config_service: ConfigService = Depends(get_config_service)
):
    """Update configuration."""
    try:
        result = await config_service.update_configuration(config)
        logger.info("Configuration updated successfully")
        return result
    except ConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/domains")
async def get_allowed_domains(
    config_service: ConfigService = Depends(get_config_service)
):
    """Get allowed domains configuration."""
    try:
        domains = await config_service.get_allowed_domains()
        return {"allowed_domains": domains}
    except Exception as e:
        logger.error(f"Error getting allowed domains: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.put("/domains")
async def update_allowed_domains(
    request: UpdateDomainsRequest,
    config_service: ConfigService = Depends(get_config_service)
):
    """Update allowed domains configuration."""
    try:
        if request.action not in ['add', 'remove', 'replace']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid action. Must be 'add', 'remove', or 'replace'"
            )
        
        result = await config_service.update_allowed_domains(request.action, request.domains)
        logger.info(f"Updated allowed domains: {result['message']}")
        return result
    except ValueError as e:
        logger.error(f"Validation error updating allowed domains: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ConfigurationError as e:
        logger.error(f"Configuration error updating allowed domains: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating allowed domains: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("", include_in_schema=False)
async def get_configuration_no_slash(config_service: ConfigService = Depends(get_config_service)):
    return await get_configuration(config_service)


@router.get("/domains/", include_in_schema=False)
async def get_allowed_domains_slash(config_service: ConfigService = Depends(get_config_service)):
    return await get_allowed_domains(config_service) 