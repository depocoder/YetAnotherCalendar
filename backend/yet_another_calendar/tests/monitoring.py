import pytest
from fastapi.testclient import TestClient

from yet_another_calendar.web.application import get_app


@pytest.fixture(scope="module")
def client():
    app = get_app()
    return TestClient(app)


def test_health(client):
    response = client.get("api/health/")
    assert response.status_code == 200
