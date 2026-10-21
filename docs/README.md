# OSCII_MS Documentation

This folder contains a codebase-based documentation set for the current
implementation of OSCII_MS as inspected on 2026-07-20.

## Contents

- [System Design](./system-design.md)
- [Flowchart](./flowchart.md)
- [Database Design](./database-design.md)
- [Database Table Summary](./database-table-summary.md)
- [Use Case Design](./use-case-design.md)
- [Entity Relation Diagram](./entity-relation-diagram.md)

## Diagram Assets

- [System Design SVG](./assets/system-design.svg)
- [System Design PNG](./assets/system-design.png)
- [Flowchart SVG](./assets/flowchart.svg)
- [Flowchart PNG](./assets/flowchart.png)
- [Database Design SVG](./assets/database-design.svg)
- [Database Design PNG](./assets/database-design.png)
- [Use Case Design SVG](./assets/use-case-design.svg)
- [Entity Relation Diagram SVG](./assets/entity-relation-diagram.svg)

## Scope

The documentation is based on the current repository state:

- Frontend: vanilla JavaScript SPA built with Webpack
- Backend: Express API backed by PostgreSQL
- Authentication: bearer token issued by the backend and stored in browser localStorage
- Persistence: backend database is the source of truth

## High-Level Summary

OSCII_MS is a clinical assessment platform for:

- Admin management of users, stations, questions, procedure items, and results
- Student question-based assessment
- Moderator or examiner procedure-based assessment
- CSV import/export for station data and results

## Notes

- Some frontend files still reference legacy helper names that are not fully
  implemented in the current codebase. The design documents in this folder
  describe the behavior that is actually implemented by the active backend and
  UI routes.
- The documents favor the current runtime flow over older in-memory comments
  that remain in a few modules.
