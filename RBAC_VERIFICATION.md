# RBAC System Verification Checklist

Use this checklist to verify that the RBAC system is properly implemented and working.

## Database Setup

- [ ] Run migration: `python -m app.migrations.add_role_field`
- [ ] Verify migration succeeds without errors
- [ ] Check database: `users` table has `role` column
- [ ] Verify existing users have `role = 'user'` as default

## Backend API Verification

### 1. Test `/api/admin/roles` endpoint
```bash
curl -X GET http://localhost:8000/api/admin/roles \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected response:
```json
{
  "roles": [
    {"code": "admin", "name": "Admin", "description": "...", "level": 4},
    {"code": "reviewer", "name": "Reviewer", "description": "...", "level": 3},
    {"code": "developer", "name": "Developer", "description": "...", "level": 2},
    {"code": "user", "name": "User", "description": "...", "level": 1}
  ]
}
```

- [ ] Endpoint returns all 4 roles
- [ ] Roles are ordered by level (descending)
- [ ] Descriptions are present

### 2. Test `/api/admin/users` endpoint
```bash
curl -X GET "http://localhost:8000/api/admin/users?offset=0&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected response includes:
```json
{
  "items": [...],
  "total": NUMBER,
  "offset": 0,
  "limit": 10
}
```

- [ ] Endpoint returns paginated user list
- [ ] User objects include `role` field
- [ ] User objects include `current_subscription_status`
- [ ] Pagination metadata is correct

### 3. Test `/api/admin/users/{user_id}/role` endpoint
```bash
curl -X PUT http://localhost:8000/api/admin/users/123/role \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "reviewer"}'
```

Expected response: Updated user with new role

- [ ] Endpoint updates user role successfully
- [ ] Non-existent user returns 404
- [ ] Invalid role returns 400
- [ ] Cannot demote self from admin (returns 400)

### 4. Test `/api/admin/users/{user_id}/active` endpoint
```bash
curl -X PUT http://localhost:8000/api/admin/users/123/active \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

Expected response: Updated user with new active status

- [ ] Endpoint updates is_active field
- [ ] Non-existent user returns 404
- [ ] Valid boolean values accepted

### 5. Test Admin Access Control
```bash
# With non-admin token
curl -X GET http://localhost:8000/api/admin/users \
  -H "Authorization: Bearer YOUR_NON_ADMIN_TOKEN"
```

- [ ] Non-admin users get 403 Forbidden
- [ ] Admin users get 200 OK
- [ ] Legacy ADMIN_EMAIL users can access
- [ ] Legacy ADMIN_AUTH_SUBJECTS users can access

## Frontend Verification

### 1. Test Admin Page Access
- [ ] Log in as non-admin user
- [ ] Navigate to `/admin`
- [ ] Should redirect to home page
- [ ] No error message (just silent redirect)

- [ ] Log in as admin user
- [ ] Navigate to `/admin`
- [ ] Admin page loads successfully
- [ ] User management table displays

### 2. Test Admin Link Visibility
- [ ] Log in as non-admin
- [ ] Check topbar navigation
- [ ] "Admin" link should NOT appear
- [ ] Check mobile drawer
- [ ] "Admin" link should NOT appear in drawer

- [ ] Log in as admin
- [ ] Check topbar navigation
- [ ] "Admin" link should appear
- [ ] Link is clickable and goes to `/admin`

### 3. Test Admin Panel Features
- [ ] User list loads with all users
- [ ] Pagination works (if more than 20 users)
- [ ] Search by email filters users
- [ ] Search by name filters users
- [ ] Role filter buttons work (click each role)
- [ ] Role dropdown selector works
- [ ] Active/Inactive toggle works
- [ ] Confirmation dialog appears before changes
- [ ] Can cancel confirmation
- [ ] Can confirm role change
- [ ] Can confirm active status change
- [ ] Changes are reflected immediately

### 4. Test Role-Related Features
- [ ] Admin role is purple badge
- [ ] Reviewer role is gold badge
- [ ] Developer role is blue badge
- [ ] User role is gray badge
- [ ] Role icons display correctly

### 5. Test Error Handling
- [ ] Trying to demote self from admin shows error
- [ ] Network error shows toast notification
- [ ] Invalid role assignment shows error
- [ ] Disabled state for buttons while updating

## Schema Verification

### User Model
```python
# app/models.py
class User(Base):
    role = Column(String, nullable=False, default="user")
```

- [ ] User model has `role` field
- [ ] Default value is "user"
- [ ] Field is nullable=False

### UserRead Schema
```python
# app/schemas.py
class UserRead(BaseModel):
    role: str = "user"
```

- [ ] UserRead includes `role` field
- [ ] Default value is "user"

### Admin Schemas
- [ ] `AdminUserRead` exists
- [ ] `AdminUserRoleUpdateRequest` exists
- [ ] `AdminUserActiveUpdateRequest` exists
- [ ] `AdminRoleDefinition` exists
- [ ] `AdminRolesResponse` exists
- [ ] `AdminUsersListResponse` exists

## Code Structure Verification

### Backend Files
- [ ] `app/migrations/add_role_field.py` exists
- [ ] `app/services/rbac.py` exists
- [ ] `app/models.py` updated with role field
- [ ] `app/schemas.py` updated with admin schemas
- [ ] `app/api/routes.py` updated with admin endpoints

### Frontend Files
- [ ] `frontend/src/app/admin/page.tsx` exists
- [ ] `frontend/src/app/admin/admin-panel.tsx` exists
- [ ] `frontend/src/app/admin/admin-panel.module.css` exists
- [ ] `frontend/src/app/admin/admin.module.css` exists
- [ ] `frontend/src/components/admin-link.tsx` exists
- [ ] `frontend/src/components/mobile-drawer.tsx` updated
- [ ] `frontend/src/app/layout.tsx` updated with AdminLink

## Documentation Verification
- [ ] `RBAC_SETUP.md` exists and is complete
- [ ] `CHANGES_SUMMARY.md` exists and is complete
- [ ] `RBAC_VERIFICATION.md` exists (this file)

## Performance Tests

- [ ] Admin panel loads user list in <1 second
- [ ] Search filters quickly (client-side)
- [ ] Role dropdown changes don't lag
- [ ] Pagination works smoothly
- [ ] No console errors during use
- [ ] No network errors in DevTools

## Security Tests

- [ ] Cannot access `/admin` without authentication
- [ ] Cannot access `/admin` as non-admin user
- [ ] API endpoints reject non-admin tokens with 403
- [ ] Cannot demote self from admin role
- [ ] Role changes are immediate (no caching issues)
- [ ] No sensitive data leaks in error messages

## Backward Compatibility Tests

- [ ] Existing ADMIN_AUTH_SUBJECTS still works
- [ ] Existing ADMIN_EMAILS still works
- [ ] Admins via legacy config can access admin panel
- [ ] API endpoints work with legacy admin users
- [ ] UserRead response includes role field
- [ ] `/me` endpoint returns user with role

## Deployment Checklist

- [ ] All files are committed to git
- [ ] No console errors or warnings
- [ ] No TypeScript compilation errors
- [ ] No Python linting errors
- [ ] Database migration tested on staging
- [ ] All endpoints tested on staging
- [ ] Frontend tested on staging browsers
- [ ] Mobile responsive design verified
- [ ] Ready for production deployment

## Rollback Plan

If issues arise:

1. **Database**: Role column can be safely left in place (optional field)
2. **Backend**: Remove admin endpoint routes and revert `_require_admin()` to old version
3. **Frontend**: Remove `/admin` route and AdminLink component
4. **Config**: Revert to using ADMIN_AUTH_SUBJECTS and ADMIN_EMAILS only

---

**Status**: Ready for deployment once all items are checked
