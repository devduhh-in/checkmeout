import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


@pytest.fixture
def make_client(monkeypatch):
    """Build a fresh app with the given environment, e.g. make_client("production")."""

    def _make(environment: str = "test") -> TestClient:
        monkeypatch.setenv("ENVIRONMENT", environment)
        get_settings.cache_clear()
        return TestClient(create_app(), raise_server_exceptions=False)

    yield _make
    get_settings.cache_clear()


@pytest.fixture
def client(make_client) -> TestClient:
    return make_client("test")
