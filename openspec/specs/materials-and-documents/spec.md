# Materials and Documents Specification

## Purpose

Maintain reusable material catalogues, resin-system product-guide data and their PDF
documentation with review dates and role-aware management.

## Requirements

### Requirement: Material catalogues
The system SHALL manage catalogues for manufacturers, pre-impregnated material types,
reinforcement fibres, finishes, resin systems and resin product categories.

#### Scenario: Pre-impregnated material
- **WHEN** a pre-impregnated material is saved
- **THEN** it MAY reference a manufacturer, material type, resin system and up to two reinforcement fibres.

### Requirement: Resin system product-guide record
The system SHALL store a resin system name, description, manufacturer, required product
category, cure and outlife information, Tg values, toughened and post-cure flags,
standard process, application areas and its supporting PDFs.

#### Scenario: Required classification
- **WHEN** a resin system is submitted through the form
- **THEN** a manufacturer and a product category SHALL be selected.

### Requirement: Product categories
The system SHALL seed the Product Selector Guide categories: tooling prepreg low
temperature cure, adhesive film, component prepreg low-to-medium temperature cure,
component prepreg versatile temperature cure, component prepreg high service
temperature and component prepreg flame retardant.

#### Scenario: Administrator catalogue management
- **WHEN** an administrator opens the product-category section
- **THEN** they SHALL be able to manage the category catalogue subject to database RLS.

#### Scenario: Non-administrator resin edit
- **WHEN** an approved non-administrator edits a resin system with sufficient editing role
- **THEN** the category names SHALL be available as a selector but the standalone category section SHALL remain hidden.

### Requirement: PDF storage and review dates
The system SHALL store MDS and MSDT document paths in the configured Supabase Storage
bucket and SHALL track their independent review dates when the corresponding document
is present.

#### Scenario: Upload
- **WHEN** a PDF is uploaded for a supported document field
- **THEN** the system SHALL create a sanitized storage path composed of table, field, UUID and original filename.

#### Scenario: Missing review date
- **WHEN** a record contains a PDF without its required review date
- **THEN** the form SHALL prevent saving until that date is supplied.
