# API Versioning Strategy

## Current Version: v1

All API endpoints are versioned under `/api/v1/`.

## Versioning Rules

1. **Breaking changes** require a new version (v2, v3)
2. **Additive changes** (new fields, new endpoints) are backward-compatible
3. **Deprecation** requires minimum 3-month notice

## What Constitutes a Breaking Change

- Removing a field from a response
- Changing a field's type
- Changing the meaning of a field
- Removing an endpoint
- Changing authentication requirements

## What Does NOT Constitute a Breaking Change

- Adding new optional fields to a request
- Adding new fields to a response
- Adding new endpoints
- Adding new query parameters
- Relaxing validation constraints

## Deprecation Process

1. Mark endpoint as deprecated in documentation
2. Add `Deprecation` and `Sunset` HTTP headers
3. Log usage of deprecated endpoints
4. Remove after sunset date (minimum 3 months)

## Response Envelope

All API responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [...]
  }
}
```
