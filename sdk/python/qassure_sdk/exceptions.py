"""
QAssure SDK Exceptions
"""


class QAssureError(Exception):
    """Base exception for QAssure SDK"""
    
    def __init__(self, message, status_code=None, response=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response = response


class AuthenticationError(QAssureError):
    """Raised when authentication fails"""
    pass


class NotFoundError(QAssureError):
    """Raised when a resource is not found"""
    pass


class ValidationError(QAssureError):
    """Raised when request validation fails"""
    pass


class RateLimitError(QAssureError):
    """Raised when rate limit is exceeded"""
    pass


class ServerError(QAssureError):
    """Raised when server returns 5xx error"""
    pass


class InvalidStateTransitionError(QAssureError):
    """Raised when an invalid module state transition is attempted"""
    pass
