from functools import lru_cache

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from app.config import AUTHORIZED_PARTIES, CLERK_JWKS_URL, INTERNAL_SERVICE_TOKEN


@lru_cache(maxsize=16)
def _jwk_client_for_url(url: str) -> PyJWKClient:
    """One client per JWKS URL (Clerk instance-specific)."""
    return PyJWKClient(url)


def _jwks_urls_to_try(token: str) -> list[str]:
    """
    Clerk session JWTs include an `iss` (issuer) claim. Keys are published at:
      {iss}/.well-known/jwks.json
    This works without CLERK_JWKS_URL. Env URL is still tried as fallback.
    """
    urls: list[str] = []
    try:
        unverified = jwt.decode(
            token,
            options={"verify_signature": False},
            algorithms=["RS256", "RS384", "RS512", "ES256"],
        )
        iss = (unverified.get("iss") or "").strip()
        if iss:
            urls.append(f"{iss.rstrip('/')}/.well-known/jwks.json")
    except Exception:
        pass
    env = (CLERK_JWKS_URL or "").strip()
    if env and env not in urls:
        urls.append(env)
    return urls


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    return token


def verify_clerk_token(token: str) -> dict:
    jwks_urls = _jwks_urls_to_try(token)
    if not jwks_urls:
        raise HTTPException(
            status_code=401,
            detail="Could not determine JWKS URL: token missing iss and CLERK_JWKS_URL is not set.",
        )

    last_error: Exception | None = None
    claims: dict | None = None
    for jwks_url in jwks_urls:
        try:
            signing_key = _jwk_client_for_url(jwks_url).get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                options={"require": ["exp", "iat", "nbf", "sub"]},
            )
            break
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Session token expired") from None
        except jwt.InvalidTokenError:
            last_error = None
            continue
        except Exception as exc:
            last_error = exc
            continue

    if claims is None:
        exc_name = type(last_error).__name__ if last_error else "InvalidTokenError"
        hint = ""
        if last_error and ("JWK" in exc_name or "Connection" in exc_name):
            hint = (
                " Tried issuer JWKS and CLERK_JWKS_URL. Ensure the API can reach "
                "your Clerk domain (egress/DNS), or set CLERK_JWKS_URL from Clerk Dashboard "
                "(the default https://api.clerk.com/v1/jwks is usually wrong for session tokens)."
            )
        raise HTTPException(
            status_code=401,
            detail=f"Token verification failed: {exc_name}.{hint}",
        ) from last_error

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
    # Internal actor forwarding is only allowed when a non-empty service token is configured.
    if (
        INTERNAL_SERVICE_TOKEN
        and x_internal_service_token == INTERNAL_SERVICE_TOKEN
        and x_actor_auth_subject
    ):
        claims = {
            "sub": x_actor_auth_subject,
            "auth_mode": "internal",
        }
        if x_actor_email:
            claims["email"] = x_actor_email.lower()
        return claims

    token = _extract_bearer_token(authorization)
    return verify_clerk_token(token)
