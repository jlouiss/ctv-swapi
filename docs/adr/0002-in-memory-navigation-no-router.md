# In-memory view state instead of a router

Screen navigation (category picker → list → detail) is handled with a simple in-memory view-state stack rather than a router library (`preact-router` is not installed). TV apps typically don't need shareable/bookmarkable URLs, and explicit state gives precise control over what the remote's "back" action does — behavior that's harder to get right when overloading browser history semantics for a non-browsing-first surface. A future reader might expect routing as the default for a Preact app; this is a deliberate choice against it.
