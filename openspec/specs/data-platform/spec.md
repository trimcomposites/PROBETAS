# Data Platform Specification

## Purpose

Document the Supabase data contract used by PROBETAS, including logical entities,
relationships, RLS ownership and the migration discipline required to evolve it.

## Requirements

### Requirement: Logical entity model
The client schema SHALL define the following logical entities: `PROBETA`, `CAPA`,
`DIRECCION_CAPA`, `PRE-IMPREGNADO`, `FABRICANTE`, `PRE-IMPREGNADO_TYPE`,
`RESINA_SYSTEM`, `RESIN_PRODUCT_CATEGORY`, `FIBRAS_REFUERZO`, `RESULTS`, `ACABADO`,
`ESPESORES`, `RECETAS`, `RECETA_ESCALONES`, `HORNO`, `PROBETA_CAPA` and
`PROBETA_PRE_IMPREGNADO`.

#### Scenario: Relationship resolution
- **WHEN** a form renders a field with a `<TABLE>.id` reference
- **THEN** it SHALL obtain its options from the referenced table in the loaded database.

### Requirement: Primary data relationships
The data model SHALL preserve the following principal relations:

- `PROBETA` references measurements, results and recipe; its layers are linked through `PROBETA_CAPA`.
- `CAPA` references `DIRECCION_CAPA` and `PRE-IMPREGNADO`.
- `PRE-IMPREGNADO` references type, manufacturer, resin system and reinforcement fibres.
- `RESINA_SYSTEM` references `FABRICANTE` and `RESIN_PRODUCT_CATEGORY`.
- `RESULTS` may reference one or two `ACABADO` records.
- `RECETA_ESCALONES` belongs to `RECETAS`.

#### Scenario: In-use detection
- **WHEN** a managed catalogue record is considered for deletion
- **THEN** the client SHALL inspect these logical relations to decide whether archival is needed.

### Requirement: Supabase table name compatibility
The persistence service SHALL resolve the supported quoted, underscore-normalized and
lowercase names for legacy tables before querying them.

#### Scenario: Optional table absent
- **WHEN** an optional compatibility table such as draft storage is not available
- **THEN** the service SHALL handle its documented missing-table condition rather than treating it as a successful data source.

### Requirement: Row-level security
The database SHALL enforce approval and role rules through RLS on protected tables,
and shall use specific policies for profiles, personal drafts, storage objects and
product-category mutations.

#### Scenario: Category mutation
- **WHEN** a user attempts to create, update or delete a resin product category
- **THEN** the RLS policy SHALL require an approved administrator.

### Requirement: Migration execution
The SQL files SHALL be treated as ordered, manual database migrations. A change is not
considered deployed merely because its SQL file is present in Git.

#### Scenario: New Supabase environment
- **WHEN** a new environment is prepared
- **THEN** its operator SHALL provision the base schema, execute applicable SQL files in chronological order and verify the policies, triggers and PostgREST schema reloads described by the migrations.
