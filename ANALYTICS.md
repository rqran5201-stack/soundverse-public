# Private visitor statistics

Provider: official Vercel Web Analytics, @vercel/analytics 2.0.1 (MIT).

Dashboard (requires the project account): https://vercel.com/wangyiran-s-projects/soundverse/analytics

The project owner must enable Web Analytics in the Vercel dashboard before the next production deployment. No Analytics Plus upgrade, public dashboard sharing, new admin passwords or public stats API is introduced.

The production client counts site page views only on https://soundverse-ivory.vercel.app. Localhost, offline HTML, preview deployments, Do Not Track and Global Privacy Control are excluded. Custom events are rejected. Every recorded page URL is reduced to the fixed site root; no query string, hash, private path or work ID is retained by our beforeSend policy. The SDK does not receive songs, lyrics, audio fingerprints, wish text, story text, work names or stored creations from the application. Vercel also derives aggregate device/browser/location/referrer statistics according to its own Web Analytics policy. This is not a personal identity/IP browsing log.

The statistics are read in Vercel's authenticated project dashboard, subject to project/team permissions. They are not exposed in the public app or source repository. Do not enable public sharing or grant extra project membership if you want the dashboard to remain private. No secret is put in the frontend.

Counts start after Analytics is enabled and the integration is deployed; historical visitors cannot be reconstructed from this client integration. Users who block telemetry or cannot reach the website may not be counted. Visitor estimates are not guaranteed unique human counts.

The site uses in-app React state for internal world switching rather than URL routes. This minimal integration measures site visits/page loads; it does not pretend to measure individual world clicks, music uploads or saves. No paid custom event plan was enabled.

Reference: https://vercel.com/docs/analytics/quickstart and https://vercel.com/docs/analytics/privacy-policy
