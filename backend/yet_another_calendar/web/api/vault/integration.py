"""Credentials vault: envelope encryption and lazy token refresh.

Storage model:

* Credentials are encrypted once with a random data encryption key (DEK).
* The DEK itself is never stored in plain form. Every "grant" keeps a copy
  of the DEK wrapped with a key derived (HKDF) from a client-held secret
  plus the server-side pepper.
* A browser grant's secret lives in an httpOnly cookie, an ICS grant's
  secret lives in the subscription URL. Revoking a grant deletes only its
  wrapped DEK; other grants keep working.

So neither a redis dump alone nor a leaked secret alone reveals passwords,
and both "remember me" and calendar subscriptions share one stored blob.
"""
import base64
import hashlib
import hmac
import secrets as secrets_module

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from fastapi import HTTPException
from loguru import logger
from redis.asyncio import ConnectionPool, Redis
from starlette import status

from yet_another_calendar.settings import settings
from . import schema
from ..lms import integration as lms_integration
from ..netology import integration as netology_integration

VAULT_KEY = "vault:{vault_id}"
TOKENS_KEY = "vault_tokens:{vault_id}"

_NOT_FOUND = HTTPException(detail="Not found", status_code=status.HTTP_404_NOT_FOUND)


def require_pepper() -> str:
    if not settings.ics_pepper:
        raise HTTPException(
            detail="Credentials vault is not configured on this server",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return settings.ics_pepper


def _derive_kek(secret: str, salt: bytes) -> bytes:
    """Derive the key-encryption-key from a client secret and the pepper."""
    hkdf = HKDF(algorithm=hashes.SHA256(), length=32, salt=salt, info=b"vault-grant")
    return hkdf.derive(f"{secret}:{require_pepper()}".encode())


def hash_secret(secret: str) -> str:
    return hashlib.sha256(f"{secret}:{require_pepper()}".encode()).hexdigest()


def new_secret() -> str:
    return secrets_module.token_urlsafe(32)


def new_vault_id() -> str:
    return secrets_module.token_hex(16)


def encrypt_creds(dek: bytes, creds: schema.EncryptedCreds) -> tuple[str, str]:
    """Encrypt the credentials blob with the DEK, returns (nonce, ciphertext) in base64."""
    nonce = secrets_module.token_bytes(12)
    ciphertext = AESGCM(dek).encrypt(nonce, creds.model_dump_json().encode(), None)
    return base64.b64encode(nonce).decode(), base64.b64encode(ciphertext).decode()


def decrypt_creds(dek: bytes, record: schema.VaultRecord) -> schema.EncryptedCreds:
    try:
        payload = AESGCM(dek).decrypt(
            base64.b64decode(record.creds_nonce), base64.b64decode(record.creds_ciphertext), None,
        )
    except InvalidTag:
        raise _NOT_FOUND from None
    return schema.EncryptedCreds.model_validate_json(payload)


def make_grant(secret: str, dek: bytes, kind: str) -> schema.Grant:
    """Wrap the DEK for a new client-held secret."""
    salt = secrets_module.token_bytes(16)
    nonce = secrets_module.token_bytes(12)
    wrapped = AESGCM(_derive_kek(secret, salt)).encrypt(nonce, dek, None)
    return schema.Grant(
        kind=kind,  # type: ignore[arg-type]
        secret_hash=hash_secret(secret),
        salt=base64.b64encode(salt).decode(),
        wrapped_dek=base64.b64encode(nonce + wrapped).decode(),
    )


def unwrap_dek(secret: str, grant: schema.Grant) -> bytes:
    payload = base64.b64decode(grant.wrapped_dek)
    nonce, wrapped = payload[:12], payload[12:]
    try:
        return AESGCM(_derive_kek(secret, base64.b64decode(grant.salt))).decrypt(nonce, wrapped, None)
    except InvalidTag:
        raise _NOT_FOUND from None


def find_grant(record: schema.VaultRecord, secret: str) -> tuple[str, schema.Grant]:
    """Find the grant matching a client secret (constant-time hash compare)."""
    secret_digest = hash_secret(secret)
    for grant_id, grant in record.grants.items():
        if hmac.compare_digest(grant.secret_hash, secret_digest):
            return grant_id, grant
    raise _NOT_FOUND


async def load_record(redis: Redis, vault_id: str) -> schema.VaultRecord:
    raw_record = await redis.get(VAULT_KEY.format(vault_id=vault_id))
    if not raw_record:
        raise _NOT_FOUND
    return schema.VaultRecord.model_validate_json(raw_record)


async def save_record(redis: Redis, vault_id: str, record: schema.VaultRecord) -> None:
    await redis.set(
        VAULT_KEY.format(vault_id=vault_id), record.model_dump_json(),
        ex=settings.vault_time_live,
    )


async def resolve(
        redis: Redis, vault_id: str, secret: str,
) -> tuple[schema.VaultRecord, schema.Grant, bytes]:
    """Resolve a client secret into the vault record and the unwrapped DEK.

    Also slides the vault expiration forward: a vault lives while it is used.
    """
    record = await load_record(redis, vault_id)
    _, grant = find_grant(record, secret)
    dek = unwrap_dek(secret, grant)
    await redis.expire(VAULT_KEY.format(vault_id=vault_id), settings.vault_time_live)
    return record, grant, dek


async def create_vault(
        redis_pool: ConnectionPool,
        creds: schema.EncryptedCreds,
        *,
        modeus_person_id: str,
        calendar_ids: list[int],
        time_zone: str,
        grant_kind: str,
) -> tuple[str, str]:
    """Create a vault with one grant, returns (vault_id, grant secret)."""
    require_pepper()
    dek = secrets_module.token_bytes(32)
    nonce, ciphertext = encrypt_creds(dek, creds)
    secret = new_secret()
    vault_id = new_vault_id()
    record = schema.VaultRecord(
        creds_ciphertext=ciphertext,
        creds_nonce=nonce,
        modeus_person_id=modeus_person_id,
        calendar_ids=sorted(set(calendar_ids)),
        time_zone=time_zone,
        grants={new_vault_id(): make_grant(secret, dek, grant_kind)},
    )
    async with Redis(connection_pool=redis_pool) as redis:
        await save_record(redis, vault_id, record)
    logger.info(f"Created vault {vault_id} with a {grant_kind} grant")
    return vault_id, secret


async def add_grant(
        redis: Redis, vault_id: str, record: schema.VaultRecord, dek: bytes, grant_kind: str,
) -> str:
    """Attach a new grant to an existing vault, returns the new secret."""
    secret = new_secret()
    record.grants[new_vault_id()] = make_grant(secret, dek, grant_kind)
    await save_record(redis, vault_id, record)
    logger.info(f"Added a {grant_kind} grant to vault {vault_id}")
    return secret


async def delete_grant(redis: Redis, vault_id: str, secret: str) -> None:
    """Remove one grant; the vault dies with its last grant."""
    record = await load_record(redis, vault_id)
    grant_id, _ = find_grant(record, secret)
    del record.grants[grant_id]
    if record.grants:
        await save_record(redis, vault_id, record)
    else:
        await redis.delete(VAULT_KEY.format(vault_id=vault_id), TOKENS_KEY.format(vault_id=vault_id))
    logger.info(f"Deleted a grant from vault {vault_id}")


async def mark_broken(redis: Redis, vault_id: str, record: schema.VaultRecord, broken: bool) -> None:
    if record.broken != broken:
        record.broken = broken
        await save_record(redis, vault_id, record)


async def refresh_tokens(
        redis: Redis, vault_id: str, creds: schema.EncryptedCreds,
) -> schema.CachedTokens:
    """Re-authenticate in upstream services one by one.

    Sequential on purpose: the raised error names the exact service that
    rejected the credentials.
    """
    netology_cookies = await netology_integration.auth_netology(
        creds.netology.username, creds.netology.password,
    )
    lms_user = await lms_integration.auth_lms(creds.lxp)
    tokens = schema.CachedTokens(
        netology_session=netology_cookies.rails_session,
        lms_id=lms_user.id,
        lms_token=lms_user.token,
    )
    await redis.set(
        TOKENS_KEY.format(vault_id=vault_id), tokens.model_dump_json(),
        ex=settings.ics_tokens_time_live,
    )
    return tokens


async def get_cached_tokens(redis: Redis, vault_id: str) -> schema.CachedTokens | None:
    raw_tokens = await redis.get(TOKENS_KEY.format(vault_id=vault_id))
    return schema.CachedTokens.model_validate_json(raw_tokens) if raw_tokens else None


async def drop_cached_tokens(redis: Redis, vault_id: str) -> None:
    await redis.delete(TOKENS_KEY.format(vault_id=vault_id))


def is_auth_error(exception: BaseException) -> bool:
    if isinstance(exception, HTTPException):
        return exception.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    if isinstance(exception, BaseExceptionGroup):
        return any(is_auth_error(sub_exception) for sub_exception in exception.exceptions)
    return False
