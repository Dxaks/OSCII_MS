# Database Table Summary

This is a compact, write-up-ready summary of the PostgreSQL tables used by OSCII_MS.

## Tabular Overview

| Table | Purpose | Primary Key | Main Data Stored | Key Constraints / Relations |
| --- | --- | --- | --- | --- |
| `users` | Stores application accounts for admins, moderators, and students | `id` | Identity details, role, admission number, profile image, password hash | `username` is unique; password is stored as a PBKDF2 hash record |
| `stations` | Stores assessment stations and their configuration | `id` | Station name, description, questions, procedure items, timers | `name` is unique; nested assessment content is stored in JSONB |
| `results` | Stores assessment attempts and scores for each student-station pair | `id` | Scores, completion status, saved answers, timer state, totals, percentages | `student_id` references `users.id`; `station_id` references `stations.id`; `(student_id, station_id)` is unique |

## `users`

| Column | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | text | Yes | Unique identifier for the user record |
| `surname` | text | Yes | User surname |
| `firstname` | text | Yes | User first name |
| `username` | text | Yes | Login username |
| `role` | text | Yes | User role such as `admin`, `moderator`, or `student` |
| `admission_no` | text | No | Student admission number |
| `image` | text | No | Profile image path or data URI |
| `password_hash` | jsonb | Yes | PBKDF2 password record |
| `created_at` | timestamptz | Yes | Record creation timestamp |
| `updated_at` | timestamptz | Yes | Record update timestamp |

Password hash structure:

| Field | Type | Description |
| --- | --- | --- |
| `salt` | text | Random salt used to derive the hash |
| `hash` | text | PBKDF2-derived password hash |
| `iterations` | integer | Number of PBKDF2 iterations |
| `digest` | text | Hash digest algorithm, currently `sha256` |

## `stations`

| Column | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | text | Yes | Unique identifier for the station |
| `name` | text | Yes | Station title |
| `description` | text | No | Station description |
| `procedure_items` | jsonb | Yes | Array of procedure checklist items |
| `questions` | jsonb | Yes | Array of multiple-choice questions |
| `question_timer` | jsonb | Yes | Question timer configuration |
| `procedure_timer` | jsonb | Yes | Procedure timer configuration |
| `created_at` | timestamptz | Yes | Record creation timestamp |
| `updated_at` | timestamptz | Yes | Record update timestamp |

Expected nested shapes:

| Nested Object | Fields |
| --- | --- |
| Procedure item | `id`, `description`, `scoreOptions` |
| Question | `id`, `description`, `options`, `answer`, `mark` |
| Timer | `enabled`, `duration` |

## `results`

| Column | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | text | Yes | Unique identifier for the result record |
| `student_id` | text | Yes | References the student user record |
| `station_id` | text | Yes | References the station record |
| `procedure_results` | jsonb | Yes | Stored procedure scoring entries |
| `question_results` | jsonb | Yes | Stored question scoring entries |
| `procedure_total` | numeric | Yes | Sum of procedure scores |
| `question_total` | numeric | Yes | Sum of question scores |
| `procedure_percentage` | numeric | Yes | Procedure percentage score |
| `question_percentage` | numeric | Yes | Question percentage score |
| `status` | jsonb | Yes | Completion status for procedure and question flows |
| `student_answers` | jsonb | Yes | Selected answers keyed by question id |
| `current_question_index` | integer | Yes | Current question position during assessment |
| `time_remaining` | integer | No | Countdown value for question assessment |
| `procedure_time_remaining` | integer | No | Countdown value for procedure assessment |
| `procedure_scores` | jsonb | Yes | Selected rubric scores keyed by procedure item id |
| `created_at` | timestamptz | Yes | Record creation timestamp |
| `updated_at` | timestamptz | Yes | Record update timestamp |

## Constraints

| Constraint | Applies To | Description |
| --- | --- | --- |
| Unique username | `users.username` | Prevents duplicate logins |
| Unique station name | `stations.name` | Prevents duplicate station titles |
| Unique student/station pair | `results(student_id, station_id)` | Prevents duplicate result rows for the same attempt target |
| Foreign key cascade | `results.student_id`, `results.station_id` | Deleting a user or station removes related results |

