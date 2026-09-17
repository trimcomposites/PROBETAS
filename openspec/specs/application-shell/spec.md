# Application Shell Specification

## Purpose

Define the client shell that initializes PROBETAS, presents its navigable workspace,
and keeps primary table interactions usable on desktop and narrow screens.

## Requirements

### Requirement: Authenticated application bootstrap
The system SHALL mount the React application only after installing required browser
polyfills and SHALL resolve the current Supabase session before showing protected
workspace data.

#### Scenario: Configured application with an approved session
- **WHEN** the browser loads with a valid session whose profile is approved
- **THEN** the system loads the active database, the attachment metadata index and the workspace.

#### Scenario: Missing Supabase client configuration
- **WHEN** the required public Supabase variables are absent
- **THEN** database and authentication operations SHALL fail with a configuration error rather than silently using fabricated data.

### Requirement: Workspace navigation
The system SHALL expose the configured application sections in a sidebar and SHALL
reset record selection, form state, archive mode and search state when the user
changes section.

#### Scenario: Administrator-only category section
- **WHEN** the current user is not an administrator
- **THEN** `RESIN_PRODUCT_CATEGORY` SHALL not appear in the sidebar or global-search section choices.

#### Scenario: Selecting a regular section
- **WHEN** a user selects an available section
- **THEN** the table view SHALL show that section's active records and prepare an empty draft matching its schema.

### Requirement: Responsive records tables
The system SHALL render record tables in scrollable containers and SHALL provide a
horizontal scrollbar above a populated table that remains synchronized with the
table's own scrollbar.

#### Scenario: Wide table
- **WHEN** a table is wider than its viewport
- **THEN** scrolling from the upper scrollbar SHALL update the table scroll position and scrolling the table SHALL update the upper scrollbar.

### Requirement: Theme and interaction feedback
The system SHALL persist the selected light or dark theme locally and SHALL show
transient feedback for successful or failed user actions.

#### Scenario: Theme switch
- **WHEN** a user changes the visual theme
- **THEN** the document theme data attribute and local preference SHALL be updated.
