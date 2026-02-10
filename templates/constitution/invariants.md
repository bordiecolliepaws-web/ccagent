# Invariants

> Things that must NEVER be violated. These are the load-bearing walls of the codebase.

## Structural Invariants

- {e.g., "All API responses follow the envelope format: { data, error, meta }"}
- {e.g., "Database migrations are append-only, never modify existing migrations"}

## Behavioral Invariants

- {e.g., "User data is never logged in plaintext"}
- {e.g., "All public endpoints require authentication"}

## Performance Invariants

- {e.g., "No N+1 queries in list endpoints"}
- {e.g., "Page load under 2 seconds on 3G"}

---

If you need to violate an invariant, you MUST propose an amendment first. No exceptions.
