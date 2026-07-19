# Altenul One — Full project (Phases 1-3, AI Assistant, Notifications, Maps, Reviews, Live Updates, Search)

Two real, working projects that talk to each other:

- **ooru-backend/** — Spring Boot + PostgreSQL API
- **ooru-frontend/** — React app that consumes that API

A note on the rename: the visible brand — nav bar, page title, Razorpay checkout name, docs — is
now "Altenul One" throughout. The folder names (`ooru-backend`, `ooru-frontend`), the Java package
(`com.ooru`), and the main class (`OoruApplication`) were deliberately left as-is — these are
internal plumbing nobody using the app ever sees, and renaming a Java package across every file is
a much bigger, riskier mechanical change for zero user-facing benefit. Say the word if you want
that done too.

## What's new in this update

- **Ratings & reviews** — only for bookings you actually completed, one review each.
- **Live order tracking** — a real WebSocket push (STOMP) replaces polling in My Bookings.
- **Search** — real substring search across shops and menu items, debounced, in the nav bar.
- **"Order again"** — your own most-ordered items, built from real order history, not a fake ML model.
- **Deployment config** — `ooru-backend/render.yaml` for a one-click Render blueprint deploy, and
  CORS updated for a real deployed frontend origin (see `ooru-backend/README.md`'s Render section
  for the one manual step Render doesn't automate: seeding the database the first time).
- **Rebrand** — "Ooru" → "Altenul One" everywhere a user actually sees it.

## Being honest about "AI/ML" here

Real recommendation engines, demand forecasting, and dynamic pricing need real historical usage
data to be genuine rather than theater. This project doesn't have real users yet, so "Order again"
and search are built as honest, real features with real logic — not dressed up as machine learning
they aren't. Worth reconsidering once there's real traffic to learn from.

## What's in overall

**Phase 1**: Xerox, AC Service, Plumber, Electrician (simple form-based booking); Tailor uses
real appointment slots with optimistic-locking to prevent double-booking

**Phase 2**: Food & Grocery Delivery (cart-based, server-computed totals, photos, "order again"),
Parcel Pickup & Delivery, Bike/Car Rental, Driver Booking

**Phase 3**: House Rent/Lease, Hotel Booking, Scrap Collection, Food Donation, Old Clothes
Donation, plus Bus Timings and Nearby Shops as real lookups (not bookings)

**AI Assistant**: natural-language booking for the simple form-based categories, calling Claude
from the backend

**Push notifications**: real Firebase Cloud Messaging on booking status changes

**Maps**: a real Google Map on Nearby Shops

**Reviews, live updates, search**: see "What's new" above

## Quick start

```bash
cd ooru-backend
docker-compose up --build
# in another terminal
cd ../ooru-frontend
cp .env.example .env
npm install
npm run dev
```

## What you must still supply yourself (see each README for detail)

- A Razorpay account with completed business KYC, and its API keys
- An Anthropic API key — powers the AI assistant, stays server-side only
- A Firebase project (web config + VAPID key + service account) — powers push notifications
- A Google Maps API key — powers the visual map on Nearby Shops
- A real SMS provider for OTPs (currently logs to the backend console)
- A real JWT secret for any environment beyond your own laptop
- Your actual deployed frontend URL, added to `SecurityConfig`'s CORS list

## What's left from the original ~80-category vision

Voice booking, AI shop recommendations, route optimization, demand prediction, and fraud
detection need real usage data to be more than a fake demo. Everything outside Phases 1-3
(agriculture, financial services, government services, healthcare, education, etc.) was flagged
early in this project as either needing real regulatory/compliance work, or being a genuinely
separate product.
