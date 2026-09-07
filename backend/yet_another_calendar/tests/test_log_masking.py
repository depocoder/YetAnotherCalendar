from yet_another_calendar.log import mask_secrets


def test_subscription_secret_is_masked_in_url() -> None:
    vault_id = "a" * 32
    message = f'GET /api/subscription/{vault_id}/SuperSecret-Value_123/calendar.ics HTTP/1.1 200'

    masked = mask_secrets(message)

    assert "SuperSecret-Value_123" not in masked
    assert f"/api/subscription/{vault_id}/***/" in masked
    assert "calendar.ics" in masked


def test_subscription_delete_url_is_masked() -> None:
    vault_id = "0" * 32
    masked = mask_secrets(f"DELETE /api/subscription/{vault_id}/tOp_SeCrEt-42 404")

    assert "tOp_SeCrEt-42" not in masked


def test_vault_cookie_is_masked() -> None:
    masked = mask_secrets('cookie: yac_vault=deadbeef.SecretPart123; other=1')

    assert "SecretPart123" not in masked
    assert "yac_vault=***" in masked
    assert "other=1" in masked


def test_regular_messages_untouched() -> None:
    message = "GET /api/bulk/events/?calendar_id=45526 200 OK"
    assert mask_secrets(message) == message
