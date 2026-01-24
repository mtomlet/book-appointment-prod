# MEEVO ADD-ON API - CRITICAL DOCUMENTATION

**Date Discovered**: January 24, 2026
**Status**: CONFIRMED WORKING

## THE PROBLEM WE FACED

When booking appointments with add-ons using `AddOnServiceIds`, we thought it wasn't working because our verification showed no add-ons. We spent hours debugging when the booking was actually working correctly.

## ROOT CAUSE

**Different Meevo API endpoints return different data:**

### Endpoint 1: `/book/client/{clientId}/services`
- Used by our lookup-appointment endpoint
- **DOES NOT return `addOnServiceIds` field**
- Only returns basic service info

### Endpoint 2: `/book/service/{appointmentServiceId}`
- Direct service lookup by ID
- **DOES return `addOnServiceIds` field**
- This is the ONLY way to verify add-ons via API

## PROOF

Same appointment, same add-on (Wash), two different endpoints:

```
GET /book/client/{clientId}/services
Response: { "serviceId": "...", NO addOnServiceIds field }

GET /book/service/{appointmentServiceId}
Response: { "serviceId": "...", "addOnServiceIds": ["67c644bc-..."] }  <-- ADD-ON IS HERE!
```

## HOW TO BOOK WITH ADD-ONS (v2.1.0 - CONFIRMED WORKING)

```javascript
// Use AddOnServiceIds parameter (plural, JSON array)
const bookingData = {
  ServiceId: "f9160450-0b51-4ddc-bcc7-ac150103d5c0",  // Primary service (Haircut)
  StartTime: "2026-01-24T10:00:00.0000000",
  ClientId: "client-uuid",
  ClientGender: "2035",
  EmployeeId: "stylist-uuid",
  AddOnServiceIds: ["67c644bc-237f-4794-8b48-ac150106d5ae"]  // Wash add-on
};

// POST to /book/service with Content-Type: application/json
```

## HOW TO VERIFY ADD-ONS EXIST

**WRONG WAY** (doesn't show add-ons):
```bash
GET /book/client/{clientId}/services?TenantId=...&LocationId=...
```

**CORRECT WAY** (shows add-ons):
```bash
GET /book/service/{appointmentServiceId}?TenantId=...&LocationId=...
# Response will include: "addOnServiceIds": ["uuid", ...]
```

## PRODUCTION SERVICE IDs (Phoenix Encanto)

**Primary Services:**
- Haircut Standard: `f9160450-0b51-4ddc-bcc7-ac150103d5c0`
- Haircut Skin Fade: `14000cb7-a5bb-4a26-9f23-b0f3016cc009`
- Long Locks: `721e907d-fdae-41a5-bec4-ac150104229b`

**Add-On Services:**
- Wash: `67c644bc-237f-4794-8b48-ac150106d5ae`
- Grooming: `65ee2a0d-e995-4d8d-a286-ac150106994b`

## KEY PARAMETERS

| Parameter | Works? | Notes |
|-----------|--------|-------|
| `AddOnServiceIds` (plural, array) | ✅ YES | Use this! JSON array format |
| `AdditionalServiceIds` | ❌ NO | Wrong parameter name |
| `AddOnServiceId` (singular) | ❌ NO | Ignored by API |

## WHAT THE DASHBOARD SHOWS

When booked correctly with `AddOnServiceIds`:
- Shows as ONE appointment with add-on attached
- NOT as separate back-to-back appointments
- Add-on appears under primary service as expected

## LESSONS LEARNED

1. **Don't assume API endpoints return the same data** - different endpoints have different response schemas
2. **Use `/book/service/{id}` to verify add-ons** - it's the only endpoint that returns them
3. **v2.1.0 AddOnServiceIds approach WORKS** - we just couldn't see it with our verification
4. **The dashboard is the source of truth** - if it shows correctly there, the booking worked

---

**Confirmed by testing on January 24, 2026**
**Appointment booked for Mark Tomlet with Wash add-on - verified in Meevo**
