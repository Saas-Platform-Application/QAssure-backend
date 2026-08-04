"""
QAssure Platform Python SDK
"""

from .client import QAssureClient
from .exceptions import (
    QAssureError,
    AuthenticationError,
    NotFoundError,
    ValidationError,
    RateLimitError
)

__version__ = "1.0.0"
__all__ = [
    "QAssureClient",
    "QAssureError",
    "AuthenticationError",
    "NotFoundError",
    "ValidationError",
    "RateLimitError"
]
