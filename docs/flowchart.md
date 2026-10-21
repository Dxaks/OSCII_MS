# Flowchart

```mermaid
flowchart TD
  A[App Starts] --> B[Load frontend bundle]
  B --> C[Fetch GET /api/bootstrap]
  C --> D{Backend data available?}
  D -->|Yes| E[Hydrate users, stations, results]
  D -->|No| F[Use empty in-memory state]
  E --> G[Render home page]
  F --> G

  G --> H{User choice}
  H -->|Admin Dashboard| I[Admin login]
  H -->|Main Menu| J[Show stations]

  I --> K[POST /api/auth/login]
  K --> L{Admin credentials valid?}
  L -->|Yes| M[Render admin dashboard]
  L -->|No| N[Show error dialog]

  J --> O[Select question or procedure station]
  O --> P[Station login]
  P --> Q[POST /api/auth/login]
  Q --> R{Role and station type valid?}
  R -->|Student + Question| S[Show assessment info]
  R -->|Moderator + Procedure| T[Show procedure info]
  R -->|Invalid| U[Show access denied]

  S --> V[Start or resume question assessment]
  V --> W[Save answers and timer state]
  W --> X[PATCH /api/results/:id]
  X --> Y{Submit or timeout?}
  Y -->|Yes| Z[Finalize question result]
  Z --> AA[Render result summary]

  T --> AB[Search and confirm student]
  AB --> AC[Start procedure scoring]
  AC --> AD[Save checklist scores and timer state]
  AD --> AE[PATCH /api/results/:id]
  AE --> AF{Submit or timeout?}
  AF -->|Yes| AG[Finalize procedure result]
  AG --> AH[Return to procedure info]

  M --> AI[Manage users, stations, items, results]
  AI --> AJ[POST/PATCH/DELETE API calls]
  AJ --> AK[Refresh in-memory state]

  O --> AL[Protected login exit]
  AL --> AM[Admin verification dialog]
  AM --> AN{Verified?}
  AN -->|Yes| J
  AN -->|No| O
```

## Reading Guide

- The top half describes app startup and hydration.
- The middle branch shows the three role paths.
- The bottom branch shows the protected return flow from question/procedure
  login screens back to the main menu.

