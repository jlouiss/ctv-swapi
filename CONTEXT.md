# CTV SWAPI Browser

A Connected TV (1920x1080, D-Pad-operable) application for browsing Star Wars data from SWAPI, built using TypeScript and Preact for a 10-foot viewing experience.

## Language

**Category**:
One of SWAPI's six resource types the app lets users browse and search: People, Planets, Films, Species, Vehicles, Starships.
_Avoid_: Resource, Type, Model, Endpoint

**Transportation category**:
The two categories — Vehicles and Starships — that share a required minimum set of display fields (Name, Model, Manufacturer, Cost in credits, Length, Crew, Passengers, Cargo capacity) per the acceptance criteria.
_Avoid_: Transport type, Vehicle group

**Remote**:
The standard TV Remote Control input model the app targets: D-Pad (Up, Down, Left, Right) plus OK/Select. In development this is simulated via a physical keyboard's arrow keys and Enter.
_Avoid_: Controller, Gamepad
