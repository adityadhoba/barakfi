"""
Role-Based Access Control (RBAC) service.
Provides dependencies and utilities for role-based authorization.
"""

from typing import Callable, Tuple
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.config import ADMIN_AUTH_SUBJECTS, ADMIN_EMAILS, OWNER_AUTH_SUBJECTS, OWNER_EMAILS
from app.database import get_db
from app.models import User
from app.services.auth_service import get_current_auth_claims


# Role hierarchy and definitions
VALID_ROLES = {"owner", "admin", "reviewer", "developer", "user"}
ROLE_HIERARCHY = {
    "owner": 5,
    "admin": 4,
    "reviewer": 3,
    "developer": 2,
    "user": 1,
}
ROLE_DESCRIPTIONS = {
    "owner": "Full system ownership. Can do everything admins can, including admin role removals.",
    "admin": "Full system access. Can manage users, roles, and all content.",
    "reviewer": "Can review and approve compliance cases and overrides.",
    "developer": "Can manage data sources and technical integrations.",
    "user": "Standard user access to screening, portfolio, and watchlist.",
}


def normalize_user_role(role: object) -> str:
    """
    Canonical role string for RBAC and /me responses.
    Strips whitespace, lowercases, and maps unknown values to ``user``.
    """
    if role is None:
        return "user"
    s = str(role).strip().lower()
    return s if s in VALID_ROLES else "user"


def get_user_by_claims(db: Session, claims: dict) -> User:
    """
    Fetch the current user from the database based on JWT claims.
    Raises HTTPException if user not found or inactive.
    """
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    user = db.query(User).filter(
        User.auth_subject == auth_subject,
        User.is_active.is_(True)
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


def is_admin(db: Session, claims: dict) -> bool:
    """
    Check if the current user is an admin.
    Returns True if:
    - User has role="admin" in database, OR
    - User's auth_subject is in ADMIN_AUTH_SUBJECTS, OR
    - User's email is in ADMIN_EMAILS
    """
    auth_subject = claims.get("sub")
    email = claims.get("email", "").lower()

    # Check legacy auth subject and email lists
    if auth_subject in OWNER_AUTH_SUBJECTS:
        return True

    if email in OWNER_EMAILS:
        return True

    if auth_subject in ADMIN_AUTH_SUBJECTS:
        return True

    if email in ADMIN_EMAILS:
        return True

    # Check database role
    try:
        user = get_user_by_claims(db, claims)
        return normalize_user_role(user.role) in {"owner", "admin"}
    except HTTPException:
        return False


def is_owner(db: Session, claims: dict) -> bool:
    auth_subject = claims.get("sub")
    email = claims.get("email", "").lower()

    if auth_subject in OWNER_AUTH_SUBJECTS:
        return True
    if email in OWNER_EMAILS:
        return True

    try:
        user = get_user_by_claims(db, claims)
        return normalize_user_role(user.role) == "owner"
    except HTTPException:
        return False


def has_role(user: User, required_role: str) -> bool:
    """
    Check if user has the specified role or higher in the hierarchy.
    """
    user_level = ROLE_HIERARCHY.get(normalize_user_role(user.role), 0)
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    return user_level >= required_level


def require_role(*allowed_roles: str) -> Callable:
    """
    FastAPI dependency that ensures the user has one of the allowed roles.
    Usage: @router.get("/admin") def endpoint(user: User = Depends(require_role("admin"))):
    """
    async def dependency(
        db: Session = Depends(get_db),
        claims: dict = Depends(get_current_auth_claims),
    ) -> User:
        # Admin can always access role-protected endpoints
        if is_admin(db, claims):
            return get_user_by_claims(db, claims)

        user = get_user_by_claims(db, claims)

        if normalize_user_role(user.role) not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"This action requires one of these roles: {', '.join(allowed_roles)}"
            )

        return user

    return dependency


async def require_admin(
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_auth_claims),
) -> User:
    """
    FastAPI dependency that ensures the user is an admin.
    """
    if not is_admin(db, claims):
        raise HTTPException(status_code=403, detail="Admin access required")

    return get_user_by_claims(db, claims)


async def require_reviewer_or_above(
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_auth_claims),
) -> User:
    """
    FastAPI dependency that ensures the user is a reviewer or admin.
    """
    if is_admin(db, claims):
        return get_user_by_claims(db, claims)

    user = get_user_by_claims(db, claims)
    if not has_role(user, "reviewer"):
        raise HTTPException(
            status_code=403,
            detail="Reviewer access required"
        )

    return user


async def require_developer_or_above(
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_auth_claims),
) -> User:
    """
    FastAPI dependency that ensures the user is a developer or admin.
    """
    if is_admin(db, claims):
        return get_user_by_claims(db, claims)

    user = get_user_by_claims(db, claims)
    if not has_role(user, "developer"):
        raise HTTPException(
            status_code=403,
            detail="Developer access required"
        )

    return user
