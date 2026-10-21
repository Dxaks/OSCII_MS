# Entity Relation Diagram

This file contains the entity-relationship diagram for the current OSCII_MS database schema.

## ERD

```mermaid
erDiagram
  USERS ||--o{ RESULTS : generates
  STATIONS ||--o{ RESULTS : belongs_to

  USERS {
    text id PK
    text surname
    text firstname
    text username UK
    text role
    text admission_no
    text image
    jsonb password_hash
    timestamptz created_at
    timestamptz updated_at
  }

  STATIONS {
    text id PK
    text name UK
    text description
    jsonb procedure_items
    jsonb questions
    jsonb question_timer
    jsonb procedure_timer
    timestamptz created_at
    timestamptz updated_at
  }

  RESULTS {
    text id PK
    text student_id FK
    text station_id FK
    jsonb procedure_results
    jsonb question_results
    numeric procedure_total
    numeric question_total
    numeric procedure_percentage
    numeric question_percentage
    jsonb status
    jsonb student_answers
    integer current_question_index
    integer time_remaining
    integer procedure_time_remaining
    jsonb procedure_scores
    timestamptz created_at
    timestamptz updated_at
  }
```

## Relationship Summary

| Relationship | Type | Meaning |
| --- | --- | --- |
| `users` -> `results` | One-to-many | `users` is a parent table and `results` is the child table for student assessment records |
| `stations` -> `results` | One-to-many | `stations` is a parent table and `results` is the child table for station assessment records |

## Notes

- `users.id`, `stations.id`, and `results.id` are primary key columns
- `results.student_id` is a foreign key that references `users.id`
- `results.station_id` is a foreign key that references `stations.id`
- The backend enforces `UNIQUE(student_id, station_id)`
- Assessment content remains embedded in `stations` as JSONB arrays
- In write-up terms, `results` is the dependent or child entity because each row depends on one user and one station
