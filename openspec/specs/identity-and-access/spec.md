# Identity and Access Specification

## Purpose

Protect laboratory data through Supabase authentication, an approval gate, ordered
application roles, PostgreSQL RLS policies and administrator-only account operations.

## Requirements

### Requirement: Authentication lifecycle
The system SHALL support email/password sign-in, account registration, sign-out,
password reset and forced password change for users marked with
`must_change_password` metadata.

#### Scenario: New self-registered user
- **WHEN** a user completes registration
- **THEN** the system SHALL create the Auth account and keep application access unavailable until an administrator approves the associated profile.

#### Scenario: Managed temporary account
- **WHEN** an administrator creates an account through the management workflow
- **THEN** the Edge Function SHALL create it with a temporary password, mark it as requiring a password change and request a reset email.

### Requirement: Role model
The system SHALL normalize all roles to one of `lector`, `creador`, `editor`,
`gestor` or `admin`, in ascending order of authority.

#### Scenario: Permission thresholds
- **WHEN** permissions are derived for a role
- **THEN** reading begins at `lector`, creation at `creador`, editing at `editor`, deletion and archival at `gestor`, and user management, archive visibility and restore at `admin`.

### Requirement: Approved profile gate
The system SHALL require an approved profile for protected data access and SHALL
present a pending-approval screen to authenticated users who are not approved.

#### Scenario: Unapproved session
- **WHEN** a signed-in profile has `is_approved = false`
- **THEN** the workspace SHALL be reset and hidden until approval changes.

### Requirement: Administrative user management
The system SHALL permit only approved administrators to list profiles, change roles,
approve or revoke accounts, create users, send recovery emails and delete users.

#### Scenario: Edge Function authorization
- **WHEN** `admin-manage-users` receives a POST request
- **THEN** it SHALL authenticate the caller with the user token and verify an approved `admin` profile before using the service-role client.

#### Scenario: Last approved administrator protection
- **WHEN** a role or approval update would leave no approved administrators
- **THEN** the database trigger SHALL reject the change.
