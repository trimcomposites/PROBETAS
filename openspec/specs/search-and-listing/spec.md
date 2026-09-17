# Search and Listing Specification

## Purpose

Provide a deliberate, section-scoped search experience for laboratory records while
preserving correct access to the original record and its actions.

## Requirements

### Requirement: Global search entry point
The system SHALL expose a global search control that lets a user choose an available
section, write a free-text query and configure field-specific filters.

#### Scenario: Access-aware choices
- **WHEN** the search control lists searchable sections
- **THEN** it SHALL use the same role-filtered section order as the navigation sidebar.

### Requirement: Searchable fields
The system SHALL derive search options from the logical schema, exclude internal
identifier and archive fields, and add defined derived fields for probeta rows.

#### Scenario: Probeta search
- **WHEN** a user searches probetas
- **THEN** they SHALL be able to search derived recipe, layer, material and result values in addition to stored fields.

### Requirement: Applied search results
The system SHALL apply search only after submission and SHALL preserve each result's
source index so opening, editing, archiving or deleting a filtered row affects the
underlying record rather than its filtered position.

#### Scenario: Clear search
- **WHEN** a user clears an applied search or changes section normally
- **THEN** the full active list SHALL be restored and the search draft reset.

### Requirement: Record list presentation
The system SHALL render simple catalogues, recipes and probetas through their
specialized table components, including contextual actions, status badges and PDF
review cells where relevant.

#### Scenario: PDF table cell
- **WHEN** a table field contains a PDF path
- **THEN** the UI SHALL show the file identity, review state and actions to preview or download it.
