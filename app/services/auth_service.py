from functools import lru_cache

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from app.config import AUTHORIZED_PARTIES, CLERK_JWKS_URL, INTERNAL_SERVICE_TOKEN


@lru_cache(maxsize=1)
def _jwk_client() -> PyJWKClient:
    return PyJWKClient(CLERK_JWKS_URL)


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    return token


def verify_clerk_token(token: str) -> dict:
    try:
        signing_key = _jwk_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"require": ["exp", "iat", "nbf", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session token expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid session token: {type(exc).__name__}") from exc
    except Exception as exc:
        hint = ""
        exc_name = type(exc).__name__
        if "JWK" in exc_name or "Connection" in exc_name:
            hint = (
                " Check CLERK_JWKS_URL in the API environment (Clerk Dashboard → API Keys → JWKS URL). "
                "The default https://api.clerk.com/v1/jwks is usually wrong for session tokens."
            )
        raise HTTPException(
            status_code=401,
            detail=f"Token verification failed: {exc_name}.{hint}",
        ) from exc

    authorized_party = claims.get("azp")
    if authorized_party and AUTHORIZED_PARTIES and authorized_party not in AUTHORIZED_PARTIES:
        raise HTTPException(status_code=401, detail="Invalid authorized party")

    if claims.get("sts") == "pending":
        raise HTTPException(status_code=403, detail="Session is pending organization setup")

    return claims


def require_auth(authorization: str | None = Header(default=None)) -> str:
    """Return the auth_subject (``sub`` claim) or raise 401."""
    token = _extract_bearer_token(authorization)
    claims = verify_clerk_token(token)
    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token subject missing")
    return sub


def get_current_auth_claims(authorization: str | None = Header(default=None)) -> dict:
    token = _extract_bearer_token(authorization)
    return verify_clerk_token(token)


def get_current_auth_claims_or_internal(
    authorization: str | None = Header(default=None),
    x_internal_service_token: str | None = Header(default=None),
    x_actor_auth_subject: str | None = Header(default=None),
    x_actor_email: str | None = Header(default=None),
) -> dict:
    if x_internal_service_token == INTERNAL_SERVICE_TOKEN and (x_actor_auth_subject or x_actor_email):
        claims = {
            "sub": x_actor_auth_subject or f"email:{x_actor_email.lower()}",
            "auth_mode": "internal",
        }
        if x_actor_email:
            claims["email"] = x_actor_email.lower()
        return claims

    token = _extract_bearer_token(authorization)
    return verify_clerk_token(token)
