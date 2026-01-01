# Beacon - Couples Bible Study

A 52-week Bible study journey application for married couples, built as part of the Grey Stratum Cadencia protocol.

## Overview

Beacon guides married couples through a structured devotional program grounded in Biblical marriage principles. The application features:

- **8-Week Pilot Content** - Foundational themes from God's design for marriage to spiritual leadership
- **Journal System** - Unified entry storage with reflection prompts and free journaling
- **ESV Integration** - Verse lookup and topic search via ESV API
- **Progress Tracking** - Streak counts, completion tracking, and week-by-week progress
- **Export Feature** - Download journal entries as Markdown

## Architecture

This is an ES6 modular application designed for deployment on Azure Static Web Apps.

```
beacon-app/
├── index.html                  # Entry point
├── staticwebapp.config.json    # Azure SWA configuration
├── public/
│   └── assets/
│       └── beacontouchicon.png # PWA icon
├── src/
│   ├── css/
│   │   └── beacon-styles.css   # Glassmorphism design system
│   └── js/
│       ├── beacon-app.js       # Main application orchestrator
│       ├── beacon-storage.js   # localStorage abstraction & CRUD
│       ├── beacon-content.js   # Study content data
│       ├── beacon-journal.js   # Journal system
│       └── beacon-esv.js       # ESV API integration
└── README.md
```

## Module Dependency Graph

```
index.html
    └── beacon-app.js
            ├── beacon-storage.js   (no dependencies)
            ├── beacon-content.js   (no dependencies)
            ├── beacon-esv.js       (no dependencies)
            └── beacon-journal.js   (imports beacon-storage.js)
```

## Development

### Local Development

Serve the files using any static file server. ES6 modules require serving over HTTP (not `file://`).

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve
```

### Deployment

Push to the connected GitHub repository. Azure Static Web Apps will automatically deploy.

## Data Storage

All data is stored in browser localStorage:

- `beacon_entries` - Journal entries (unified format)
- `beacon_progress` - Completion tracking
- `beacon_user` - Partner names and setup data
- `beacon_theme` - Light/dark preference

### Entry Schema

```javascript
{
    id: "uuid",
    type: "reflection" | "free",
    content: "User's text",
    prompt: "Original prompt",
    context: { week, day, promptIndex } | null,
    createdAt: "ISO timestamp",
    updatedAt: "ISO timestamp"
}
```

## Cadencia Integration

Beacon operates as a Cadencia Instrumentum. Update the Cadencia protocol page to point to the Azure SWA URL.

## License

Grey Stratum · Cadencia Protocol · 2025
