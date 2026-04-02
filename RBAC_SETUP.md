# Role-Based Access Control (RBAC) System Setup

This document describes the RBAC system that has been implemented for the Barakfi application.

## Quick Start

### 1. Run the Migration (One-time)

To add the `role` column to the `users` table:

```bash
cd /path/to/halal-invest-app
python -m app.migrations.add_role_field
```

This script is idempotent — it's safe to run multiple times.

### 2. Access the Admin Panel

Once logged in as an admin user, navigate to `/admin` to manage users and roles.

## Backend Changes

### User Model Update (`app/models.py`)

- Added `role` field to the User model with default value "user"
- Valid roles: `admin`, `reviewer`, `developer`, `user`

### RBAC Service (`app/services/rbac.py`)

New utilities for role-based authorization:

- `is_admin(db, claims)` — Check if user is admin (checks role field, legacy ADMIN_AUTH_SUBJECTS, or ADMIN_EMAILS)
- `require_role(*allowed_roles)` — FastAPI dependency for role-based access
- `require_admin` — FastAPI dependency requiring admin role
- `require_reviewer_or_above` — Allows admin + reviewer
- `require_developer_or_above` — Allows admin + developer
- `get_user_by_claims(db, claims)` — Fetch current user from claims
- `has_role(user, required_role)` — Check if user has role or higher

### Admin API Endpoints

#### `GET /api/admin/roles`
List available roles with descriptions and hierarchy levels.

**Response:**
```json
{
  "roles": [
    {
      "code": "admin",
      "name": "Admin",
      "description": "Full system access...",
      "level": 4
    },
    ...
  ]
}
```

#### `GET /api/admin/users`
List all users with pagination.

**Query Parameters:**
- `offset` (default: 0) — Pagination offset
- `limit` (default: 20, max: 100) — Number of users per page

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "email": "user@example.com",
      "display_name": "John Doe",
      "role": "admin",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00",
      "current_subscription_status": "trial"
    }
  ],
  "total": 100,
  "offset": 0,
  "limit": 20
}
```

#### `PUT /api/admin/users/{user_id}/role`
Update a user's role.

**Request Body:**
```json
{
  "role": "reviewer"  // admin | reviewer | developer | user
}
```

**Notes:**
- Cannot demote your own admin role
- Changes are immediately applied

#### `PUT /api/admin/users/{user_id}/active`
Enable or disable a user account.

**Request Body:**
```json
{
  "is_active": false  // true to enable, false to disable
}
```

## Frontend Changes

### Admin Page (`frontend/src/app/admin/page.tsx`)

- Server component that checks if the current user is an admin
- Redirects to home if user is not admin
- Shows admin panel with user management interface

### Admin Panel Client Component (`frontend/src/app/admin/admin-panel.tsx`)

Interactive dashboard with:

- **User List Table** with sortable columns:
  - Name, Email, Role, Status, Subscription Plan, Join Date
  - Role dropdown for quick assignment
  - Active/Inactive toggle
  - Enable/Disable action button

- **Filters & Search:**
  - Search by email or name
  - Filter by role (Admin, Reviewer, Developer, User)

- **Pagination:**
  - 20 users per page
  - Previous/Next navigation

- **Confirmation Dialogs:**
  - Confirm before role changes
  - Confirm before status changes
  - Prevents accidental admin role demotion

### Admin Link Component (`frontend/src/components/admin-link.tsx`)

- Conditionally shows "Admin" link in topbar navigation
- Only visible to users with role="admin"
- Loads admin status on mount

### Mobile Drawer Updates

- Added admin link to mobile navigation
- Conditionally shown only for admin users
- Uses admin-only flag to hide from non-admins

## Role Hierarchy

```
admin (level 4)      — Full system access
  ↓
reviewer (level 3)   — Can approve compliance cases
  ↓
developer (level 2)  — Can manage data integrations
  ↓
user (level 1)       — Standard user access
```

Admins can access all endpoints that require lower roles.

## Backward Compatibility

The system maintains backward compatibility with the existing authentication approach:

1. **Legacy ADMIN_AUTH_SUBJECTS** — Users listed here are treated as admins
2. **Legacy ADMIN_EMAILS** — Users listed here are treated as admins
3. **New Role Field** — Preferred approach going forward

All three methods are checked; a user is admin if ANY of these is true:
- User has `role="admin"` in database
- User's auth_subject is in `ADMIN_AUTH_SUBJECTS` (config)
- User's email is in `ADMIN_EMAILS` (config)

## Migration Path

### For Existing Admins

Existing admins (via legacy config) can be promoted to the admin role:

1. Log in to the admin panel at `/admin`
2. Find the user in the user list
3. Change their role to "Admin"
4. Their access is maintained while using the new system

### Environment Variables (Unchanged)

The following env vars are still supported:

```env
ADMIN_AUTH_SUBJECTS=google-oauth2|aditya-seed,user2|auth0
ADMIN_EMAILS=admin@example.com,super-user@example.com
```

## Database Schema

The `users` table now has:

```sql
ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user' NOT NULL;
```

This was applied via `app/migrations/add_role_field.py` which:
- Checks if column exists (idempotent)
- Adds column with default value if not present
- Works with SQLite, PostgreSQL, and MySQL

## Usage Examples

### Checking Admin Access in Code

```python
from app.services.rbac import is_admin, require_admin

@router.get("/admin/dashboard")
def admin_dashboard(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_auth_claims)
):
    # User is guaranteed to be admin here
    pass
```

### Checking Reviewer Access

```python
from app.services.rbac import require_reviewer_or_above

@router.post("/compliance/approve")
def approve_compliance(
    user: User = Depends(require_reviewer_or_above),
    ...
):
    # Only reviewers and admins can approve
    pass
```

### Checking Role in Frontend

```typescript
const { getToken } = useAuth();

const fetchUserRole = async () => {
  const token = await getToken();
  const response = await fetch("/api/me", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const user = await response.json();
  const isAdmin = user.role === "admin";
};
```

## Security Considerations

1. **Role Checks on Backend** — All sensitive operations check role on the server
2. **Frontend-Only Checks** — Navigation links are hidden based on role, but backend always validates
3. **Self-Demotion Prevention** — Admins cannot demote themselves via API
4. **Audit Trail** — Role changes are logged (to be implemented if needed)

## Future Enhancements

- [ ] Audit log for role changes and admin actions
- [ ] Role change notifications/emails
- [ ] Time-limited elevated roles
- [ ] Role delegation (admin delegates to another admin temporarily)
- [ ] Per-resource role assignments
