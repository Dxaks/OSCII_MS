# Use Case Design

## Actors

- Admin
- Student
- Moderator or Examiner
- Backend API
- PostgreSQL Database

## Primary Use Cases

| Use case | Actor | Preconditions | Main outcome |
| --- | --- | --- | --- |
| Log in as admin | Admin | Admin account exists | Admin token is issued and dashboard opens |
| Log in as student | Student | Student account exists and station is available | Student assessment info is displayed |
| Log in as moderator | Moderator | Moderator account exists and station is available | Procedure info screen is displayed |
| Create station | Admin | Admin is authenticated | New station is stored in PostgreSQL |
| Edit station | Admin | Admin is authenticated | Station name, description, or timers are updated |
| Delete station | Admin | Admin is authenticated | Station and related results are removed |
| Add question | Admin | Station exists | Question is appended to station |
| Edit question | Admin | Station exists | Question fields are updated |
| Delete question | Admin | Station exists | Question is removed from station |
| Add procedure item | Admin | Station exists | Checklist item is appended to station |
| Edit procedure item | Admin | Station exists | Checklist item is updated |
| Delete procedure item | Admin | Station exists | Checklist item is removed |
| Create user | Admin | Admin is authenticated | User row is created with hashed password |
| Edit user | Admin | Admin is authenticated | User details and password can be updated |
| Delete user | Admin | Admin is authenticated | User and student results are removed |
| Import CSV users | Admin | CSV is valid | Multiple user accounts are created |
| Import CSV questions | Admin | Station exists and CSV is valid | Questions are added to a station |
| Import CSV procedure items | Admin | Station exists and CSV is valid | Procedure items are added to a station |
| Take question assessment | Student | Station has questions | Student answers questions and submits result |
| Resume question assessment | Student | In-progress result exists | Previously saved progress is reopened |
| Run procedure assessment | Moderator | Station has procedure items | Moderator scores student checklist items |
| Export station results | Admin | Station has stored results | CSV file is downloaded |

## Detailed Use Cases

### 1. Admin Login

- Actor: Admin
- Trigger: User selects the admin dashboard path from the home screen
- Precondition: Valid admin credentials exist
- Main flow:
  1. User enters username and password
  2. Frontend calls `POST /api/auth/login`
  3. Backend verifies password and role
  4. Token is stored in browser storage
  5. Admin dashboard is rendered
- Postcondition: Admin can manage the system

### 2. Student Question Assessment

- Actor: Student
- Trigger: User selects a question station and logs in
- Precondition: Station has at least one question
- Main flow:
  1. Student sees assessment information
  2. Student starts or resumes the assessment
  3. Student answers questions one by one
  4. Frontend stores answers and syncs the result
  5. Student submits the assessment or timer expires
  6. Score is calculated and saved
- Postcondition: Final question result is available in the backend

### 3. Moderator Procedure Assessment

- Actor: Moderator
- Trigger: Moderator logs into a procedure station
- Precondition: Station has procedure items and a valid student exists
- Main flow:
  1. Moderator enters the student admission number
  2. Frontend confirms the student identity
  3. Procedure scoring screen opens
  4. Moderator selects checklist scores
  5. Frontend syncs the result as scoring progresses
  6. Moderator submits or timer expires
- Postcondition: Final procedure result is available in the backend

### 4. Admin Station Management

- Actor: Admin
- Trigger: Admin opens a station from the dashboard
- Precondition: Admin is authenticated
- Main flow:
  1. Admin creates or edits a station
  2. Admin manages questions and procedure items
  3. Admin configures timers
  4. Admin reviews station results and downloads CSV
- Postcondition: Station configuration is saved and visible to assessors

## Access Rules

- Admin-only actions require admin authentication.
- Question and procedure assessment screens are protected login flows.
- Students cannot access procedure assessment screens.
- Moderators cannot access question assessment screens.

