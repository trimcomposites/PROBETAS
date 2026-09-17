# Repository Operations Specification

## Purpose

Keep the PROBETAS repository reproducible, testable and understandable as changes are
integrated through focused feature branches and documented migrations.

## Requirements

### Requirement: Toolchain
The repository SHALL use ES modules with React, Vite, Supabase JavaScript client,
Vitest, Testing Library and ESLint as declared in `package.json`.

#### Scenario: Local verification
- **WHEN** a change is prepared for delivery
- **THEN** the maintainer SHALL run `npm test` and `npm run build`, and run lint in a workspace that excludes generated caches and vendored bundles.

### Requirement: Source organization
The repository SHALL keep user-interface components in `src/components`, user-visible
field configuration in `src/config`, logical data schema in `src/data`, remote access
in `src/services` and reusable domain behavior in `src/utils`.

#### Scenario: New database feature
- **WHEN** a feature adds a persisted field or table
- **THEN** it SHALL update the SQL migration, logical schema, form configuration and any required tests together.

### Requirement: Migration history
The repository SHALL store one manually executable SQL migration per dated database
change under `sql/`, with comments that state execution and verification constraints.

#### Scenario: Destructive or conversion migration
- **WHEN** a migration transforms existing values
- **THEN** it SHALL include the protections or backups needed to avoid accidental repeat conversion.

### Requirement: Branch integration record
The integration branch `feature/client-requests-2026-09-08` SHALL retain the merged
work from the small client-request branches for PDF review dates, global search,
initial-temperature correction, hourly ramps and resin-system categories.

#### Scenario: Retained feature branch
- **WHEN** a merged small branch remains in the remote
- **THEN** it SHALL be considered historical unless it contains commits not reachable from the integration branch.

### Requirement: Living documentation
The repository SHALL maintain current-state specifications under `openspec/specs/` and
shall distinguish them from historical plans in `docs/superpowers/`.

#### Scenario: Behavioral change
- **WHEN** a feature changes an externally observable workflow, schema contract or role rule
- **THEN** its relevant OpenSpec specification SHALL be reviewed and updated with the implementation.
