# Bounded, normalized in-memory cache

Fetched entities are cached in memory for the session, normalized by entity ID (one canonical copy per record, shared between list and detail views), with a defensive max-entry cap and simple eviction rather than an unbounded store.

The full swapi.dev dataset across all six categories is small (~260 records, roughly 150–250KB), well within the JS heap budget of even constrained CTV hardware — so the cap isn't solving a real memory-pressure problem with this specific dataset. It's here because CTV sessions are long-lived (a TV app can run for hours/days without reload, unlike a browser tab), so the habits that matter are: no duplicate copies of the same entity, no unbounded growth if the data source changes or grows, and explicit cleanup of in-flight fetches (`AbortController.abort()`) and `norigin-spatial-navigation` focus registrations on unmount — so nothing outlives its screen over a long session.
