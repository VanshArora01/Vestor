class SetuError(Exception):
    """Base exception for Setu integration"""
    pass

class SetuAuthenticationError(SetuError):
    """Raised when Setu authentication fails"""
    pass

class SetuAPIError(SetuError):
    """Raised when Setu API returns an error response"""
    def __init__(self, message: str, status_code: int = None, error_code: str = None, provider_message: str = None):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.provider_message = provider_message
