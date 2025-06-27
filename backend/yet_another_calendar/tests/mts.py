import uuid

import pytest
from httpx import AsyncClient
from redis.asyncio import ConnectionPool, Redis
from starlette import status

from yet_another_calendar.settings import settings
from yet_another_calendar.web.api.mts import integration


#
# @pytest.fixture
# def app(redis_pool: ConnectionPool) -> FastAPI:
#     """
#     Fixture to create a FastAPI application instance for testing.
#     It includes the MTS router and overrides the Redis dependency.
#     """
#     test_app = FastAPI()
#     test_app.include_router(mts_router, prefix="/mts")
#
#     # Override the dependency to use the fake redis pool from our fixture
#     test_app.dependency_overrides[get_redis_pool] = lambda: redis_pool
#     return test_app
#
#
# @pytest.fixture
# async def client(app: FastAPI) -> AsyncClient:
#     """
#     Fixture to create an async test client for the FastAPI application.
#     """
#     async with AsyncClient(app=app, base_url="http://test") as c:
#         yield c


@pytest.mark.asyncio
class TestMtsIntegration:
    """Tests for the Redis integration logic in `integration.py`."""

    async def test_save_and_get_link(self, fake_redis_pool: ConnectionPool) -> None:
        """
        Tests that a link can be successfully saved and retrieved.
        """
        lesson_id = uuid.uuid4()
        url = "https://my.webinar.com/room/test"

        # 1. Save the link using the integration function
        await integration.save_link(fake_redis_pool, lesson_id, url)

        # 2. Verify it was saved correctly in the fake redis
        async with Redis(connection_pool=fake_redis_pool) as redis:
            key = integration._key(lesson_id)
            saved_value = await redis.get(key)
            ttl = await redis.ttl(key)

            assert saved_value is not None
            assert saved_value.decode() == url
            assert ttl > 0
            assert ttl <= settings.redis_events_time_live

        # 3. Retrieve the link using the integration function
        retrieved_url = await integration.get_link(fake_redis_pool, lesson_id)
        assert retrieved_url == url

    async def test_get_link_not_found(self, fake_redis_pool: ConnectionPool) -> None:
        """
        Tests that getting a non-existent link raises a 404 HTTPException.
        """
        non_existent_lesson_id = uuid.uuid4()

        with pytest.raises(integration.HTTPException) as exc_info:
            await integration.get_link(fake_redis_pool, non_existent_lesson_id)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "URL for this lesson is not found" in exc_info.value.detail


@pytest.mark.asyncio
class TestMtsViews:
    """Tests for the API endpoints in `views.py`."""

    async def test_add_link_success(self, client: AsyncClient, fake_redis_pool: ConnectionPool) -> None:
        """
        Tests the successful creation of a webinar link via the POST /link endpoint.
        """
        lesson_id = uuid.uuid4()
        url = "https://my.webinar.com/room/12345"
        payload = {"lessonId": str(lesson_id), "url": url}

        response = await client.post("/api/mts/link", json=payload)

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"status": "ok"}

        # Verify the link was saved in Redis
        async with Redis(connection_pool=fake_redis_pool) as redis:
            saved_url = await redis.get(integration._key(lesson_id))
            assert saved_url is not None
            assert saved_url.decode() == url

    @pytest.mark.parametrize(
        "payload, error_loc, error_msg",
        [
            ({"url": "https://example.com"}, ("body", "lessonId"), "Field required"),
            ({"lessonId": "not-a-uuid", "url": "https://example.com"}, ("body", "lessonId"),
             "Input should be a valid UUID"),
            ({"lessonId": str(uuid.uuid4())}, ("body", "url"), "Field required"),
            (
                    {"lessonId": str(uuid.uuid4()), "url": "not-a-valid-url"},
                    ("body", "url"),
                    "Input should be a valid URL"),
        ],
    )
    async def test_add_link_validation_error(self, client: AsyncClient, payload: dict[str, str],
                                             error_loc: tuple[str, str], error_msg: str) -> None:
        """
        Tests that the POST /link endpoint returns 422 for invalid payloads.
        """
        response = await client.post("/api/mts/link", json=payload)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_details = response.json()["detail"]
        assert len(error_details) == 1
        assert error_details[0]["loc"] == list(error_loc)
        assert error_msg in error_details[0]["msg"]

    async def test_redirect_success(self, client: AsyncClient, fake_redis_pool: ConnectionPool) -> None:
        """
        Tests that the GET /{lesson_id} endpoint successfully redirects to the correct URL.
        """
        lesson_id = uuid.uuid4()
        url = f"https://my.webinar.com/room/{uuid.uuid4()}"

        # First, save the link directly to redis for the test
        async with Redis(connection_pool=fake_redis_pool) as redis:
            await redis.set(integration._key(lesson_id), url)

        # Test the redirect endpoint
        response = await client.get(f"/api/mts/{lesson_id}", follow_redirects=False)

        assert response.status_code == status.HTTP_307_TEMPORARY_REDIRECT
        assert response.headers["location"] == url

    async def test_redirect_not_found(self, client: AsyncClient) -> None:
        """
        Tests that the redirect endpoint returns 404 if the lesson_id is not found.
        """
        non_existent_lesson_id = uuid.uuid4()
        response = await client.get(f"/api/mts/{non_existent_lesson_id}", follow_redirects=False)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()

    async def test_redirect_invalid_uuid(self, client: AsyncClient) -> None:
        """
        Tests that the redirect endpoint returns 422 for an invalid UUID format.
        """
        response = await client.get("/api/mts/this-is-not-a-uuid", follow_redirects=False)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_details = response.json()["detail"]
        assert error_details[0]["loc"] == ["path", "lesson_id"]
        assert "Input should be a valid UUID, invalid character" in error_details[0]["msg"]
