# Specimen and Curing Specification

## Purpose

Capture composite test specimens, their layers and materials, curing recipes, physical
results, drafts and archive lifecycle without losing related data.

## Requirements

### Requirement: Probeta composition and results
The system SHALL model a `PROBETA` with a recipe, one or more ordered layers and a
result record containing dimensions, thickness measurements, weight, density, finish
and annotations.

#### Scenario: Calculated properties
- **WHEN** a user changes thickness measurements or weight in a probeta draft
- **THEN** the UI SHALL derive the applicable mean thickness and density from the available measurements.

#### Scenario: Layer composition
- **WHEN** a user creates or edits a layer
- **THEN** the layer SHALL reference a material and may reference a normalized fibre direction.

### Requirement: Recipe steps
The system SHALL store recipe headers and ordered `RECETA_ESCALONES` with separate
temperature, pressure and vacuum transitions, ramps, final values, dwell flags and
control modes.

#### Scenario: Recipe display unit
- **WHEN** a user switches the table temperature unit
- **THEN** displayed temperatures SHALL be formatted in Celsius or Fahrenheit without changing stored values.

#### Scenario: Ramp equivalence
- **WHEN** a ramp is rendered in recipe UI
- **THEN** the interface SHALL expose its equivalent hourly rate where applicable.

### Requirement: Personal probeta drafts
The system SHALL allow an approved user to save, resume and discard only their own
JSONB probeta drafts.

#### Scenario: Draft visibility
- **WHEN** a user loads the workspace
- **THEN** RLS SHALL return only `PROBETA_BORRADORES` rows whose `owner_id` is that user.

### Requirement: Logical archival
The system SHALL archive supported records instead of deleting them when they are in
use, and SHALL restrict viewing and restoring archived records to administrators.

#### Scenario: Referenced record
- **WHEN** a user tries to remove a referenced archivabile catalogue record
- **THEN** the available action SHALL be archival rather than destructive deletion.

#### Scenario: Archive transition
- **WHEN** archival state changes in the database
- **THEN** the archive trigger SHALL enforce the permitted role and set or clear archive metadata consistently.
