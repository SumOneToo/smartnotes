# SmartNotes Architecture (Bootstrap)

Milestone **032.1** initializes a modular Next.js 14 app-router scaffold with
clear separation between UI, features, integrations, and shared libraries.

## Initial boundaries

- `src/app`: routing + composition layer
- `src/components`: reusable presentational components
- `src/features`: product/domain feature modules
- `src/integrations`: external dependencies and third-party APIs
- `src/lib`: cross-feature helpers + app configuration
- `src/types`: shared type primitives
