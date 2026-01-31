"""Utility functions for AgentAuth SDK"""

import asyncio
import random
from typing import TypeVar, Callable, Awaitable
from httpx import HTTPStatusError, RequestError

T = TypeVar("T")


class AgentAuthError(Exception):
    """Base exception for AgentAuth SDK"""

    def __init__(self, message: str, status_code: int = 0, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


def is_retryable_error(error: Exception) -> bool:
    """
    Check if an error should trigger a retry

    Args:
        error: The exception to check

    Returns:
        True if the error is retryable (5xx, 429, network errors)
    """
    if isinstance(error, RequestError):
        # Network errors (connection failures, timeouts)
        return True

    if isinstance(error, HTTPStatusError):
        status_code = error.response.status_code
        # Retry on 5xx server errors and 429 rate limit
        return status_code >= 500 or status_code == 429

    return False


async def retry_with_backoff(
    func: Callable[[], Awaitable[T]],
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 10.0,
) -> T:
    """
    Retry an async function with exponential backoff

    Args:
        func: Async function to retry
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds
        max_delay: Maximum delay in seconds

    Returns:
        Result from successful function call

    Raises:
        The last exception if all retries fail
    """
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            return await func()
        except Exception as e:
            last_exception = e

            # Don't retry if not retryable or last attempt
            if not is_retryable_error(e) or attempt >= max_retries:
                raise

            # Calculate exponential backoff with jitter
            delay = min(base_delay * (2**attempt), max_delay)
            jitter = random.uniform(0, 0.3 * delay)
            total_delay = delay + jitter

            await asyncio.sleep(total_delay)

    # Should never reach here, but just in case
    if last_exception:
        raise last_exception
    raise AgentAuthError("Retry failed with no exception")


def validate_base_url(url: str) -> None:
    """
    Validate base URL format

    Args:
        url: The base URL to validate

    Raises:
        ValueError: If URL is invalid
    """
    if not url or not isinstance(url, str):
        raise ValueError("base_url must be a non-empty string")

    if not url.startswith(("http://", "https://")):
        raise ValueError(
            f"Invalid base_url: {url}. Must start with http:// or https://"
        )

    if url.endswith("/"):
        raise ValueError(
            f"base_url should not end with a trailing slash: {url}"
        )
