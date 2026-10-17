# Events — الفعاليات والندوات

Events and workshops listing.

## At a glance

| | |
| :--- | :--- |
| **App label** | `events` |
| **Routes** | `GET /api/events` |
| **Owns** | `EventItem` |
| **Frontend twin** | `frontend/src/features/events/` |

## Purpose

Returns every event/workshop as an `EventItem`. The home feature also uses
event-shaped data (for its curated `HomeEvent` rows); the serializer that maps
both lives here.

## Structure

```text
events/
├── apps.py           AppConfig (label "events")
├── models.py         EventItem
├── serializers.py    event() — works for EventItem and HomeEvent
├── views.py          events_list
├── urls.py           /api/events
├── admin.py          EventItem admin
├── tests.py          models, serializers, and routes
├── migrations/
└── README.md
```

## Related

- Home (curated events): [`../home/README.md`](../home/README.md)
- Backend contract: [`../../../docs/07-backend-contract.md`](../../../docs/07-backend-contract.md)
