# Dart Application Functional Analysis Report

## Application Purpose

Dashboard displaying deployed versions of frontend applications across environments

## Core Features

- Real-time version display across multiple environments
- Package dependency tracking
- Search and filter by package name
- Bookmark frequently used searches
- Toggle between card and table view

## User Workflows

### Search for Package

1. User types in search box
2. Redux action dispatched
3. State filtered by query
4. UI updates to show matching packages

### View Dependencies

1. User clicks on package card
2. Accordion expands
3. Dependencies fetched if not cached
4. Dependency list displayed

## Data Architecture

### Sources

- FEWS API
- Dependencies Service
- Local Storage

### Transformations

- Version parsing
- Dependency resolution
- Filter application

### Destinations

- Card components
- Table view
- Local storage cache

## State Management

- **Pattern**: Redux with middleware
- **Key Actions**: SET_QUERY, FETCH_VERSIONS, ADD_BOOKMARK, TOGGLE_VIEW
- **Selectors**: filteredPackages, appVersionSelector, packagesSelector

## Business Logic

### Rules

- Version comparison using semantic versioning
- Environment-specific version display
- Dependency resolution and filtering

### Validations

- Valid package names
- Version format validation
- Bookmark uniqueness

## Dependency Mapping

- **over_react** → react
- **redux** → @reduxjs/toolkit
- **built_value** → TypeScript interfaces + immer
- **w_transport** → axios
- **unify_ui** → Custom component library or MUI

## Conversion Strategy

Based on this analysis, the TypeScript conversion should:

1. Implement Redux Toolkit for state management
2. Use React functional components with hooks
3. Create TypeScript interfaces for all data models
4. Implement service layer with Axios
5. Maintain existing business logic and validations
