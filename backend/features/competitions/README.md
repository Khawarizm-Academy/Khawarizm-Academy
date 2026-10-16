# Competitions — المسابقات والتحديات

Competitions and challenges listing.

## At a glance

| | |
| :--- | :--- |
| **App label** | `competitions` |
| **Routes** | `GET /api/competitions` |
| **Owns** | `Competition` |
| **Frontend twin** | `frontend/src/features/competitions/` |

## Purpose

Returns every competition. The home feature reuses the same `competition()`
serializer for its curated `HomeCompetition` rows.

## Structure

```text
competitions/
├── apps.py           AppConfig (label "competitions")
├── models.py         Competition
├── serializers.py    competition() — works for Competition and HomeCompetition
├── views.py          competitions_list
├── urls.py           /api/competitions
├── admin.py          Competition admin
├── migrations/
└── README.md
```

## Related

- Home (curated competition): [`../home/README.md`](../home/README.md)
- Dashboard (competitions): [`../dashboard/README.md`](../dashboard/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
