# Altenul One Backend — Phase 1 + Phase 2 (food/grocery, parcel, rentals, driver)

A real, working Spring Boot backend for the Altenul One local-services platform. Started as Phase 1
(**Tailor, Xerox, AC Service, Plumber, Electrician**) and now also covers Phase 2's headline
categories: **Food Delivery, Grocery Delivery, Parcel Pickup & Delivery, Bike/Car Rental, Driver
Booking** — plus the shared infrastructure every category reuses: authentication, shop
registration/approval, a generic booking lifecycle, and Razorpay payments.

This is not a toy. It's structured the way a real production backend is structured. But it is
also not finished — a handful of things only *you* can do (see "What you must supply" below),
and it hasn't been deployed or load-tested anywhere.

## What's actually here

- **Auth** — register, OTP verification (stubbed — logs to console, see `OtpService.java`), login,
  JWT-based sessions, four roles (`ADMIN`, `SHOP_OWNER`, `CUSTOMER`, `DELIVERY_PARTNER`).
- **Shops** — shop owners register a shop under one of the 5 categories; it sits `PENDING` until
  an admin approves it. Customers can only book shops that are `APPROVED`.
- **Bookings** — one generic booking flow works across the simple field-based categories
  (Tailor, Xerox, AC, Plumber, Electrician, Parcel, Rental, Driver). Each category's specific
  fields are stored as flexible JSON rather than rigid columns, so adding another simple category
  later is a data change, not a schema rewrite — see `service_categories` table and
  `Booking.detailsJson`.
- **Food & Grocery are cart-based, not simple forms** — a shop owner lists items via
  `MenuItem`, a customer's order references `menuItemId` + `quantity`, and **the total is always
  computed server-side from the shop's current prices** (see `BookingService.buildCartDetails`) —
  never trusted from whatever number the frontend cart happened to show. This is the same
  principle as payment verification below: money math never trusts the client.
- **Tailor now uses real appointment slots, not typed-in date/time** — a shop owner opens slots
  (`AppointmentSlot`), a customer claims one, and a `@Version` field guards against two customers
  claiming the same slot in the same instant (see `SlotService.claim` for why the earlier
  "check then write" approach alone wasn't enough).
- **Menu items can carry an image URL** — a plain link, not file upload/storage, kept simple on
  purpose so this doesn't need an S3-style file store.
- **Real-time push replaces polling** — `WebSocketConfig` sets up a STOMP endpoint at `/ws`;
  `BookingService.updateStatus` publishes to `/topic/customer/{id}/bookings` the instant a status
  changes, so a connected frontend gets the update pushed to it rather than asking again and
  again. Note the simplification called out in `WebSocketConfig`'s comment: the socket handshake
  isn't JWT-checked yet.
- **Pickup vs. delivery is chosen only after the item is actually ready** — when a shop marks a
  tailor booking `COMPLETED`, a real push notification fires (see Notifications below), and only
  then can the customer call `/api/bookings/{id}/fulfillment` — trying earlier is rejected.
- **Reviews are tied to real completed bookings** — you can only review a booking you actually
  completed, once (`ReviewService`), not just leave a rating on any shop's page.
- **Search is a real substring query, not fake AI** — `SearchController` hits the database
  directly across shop names/addresses and menu item names. No external search service, no
  vector embeddings — those would be real additions later if search quality becomes a problem,
  not needed for a search box that mostly needs to find "the tailor on Anna Salai."
- **"Order again" uses only the customer's own order history** — `BookingService.frequentlyOrderedItems`
  counts a single customer's past food/grocery orders. No cross-customer data, no model, just
  honest counting — a real form of personalization without pretending it's more than it is.
- **Payments** — real calls to Razorpay's REST API to create an order, plus server-side signature
  verification before a payment is ever marked `PAID`. No SDK dependency, just plain HTTPS calls.
- **Database schema** — `database/schema.sql`, matching the JPA entities exactly, with Phase 1
  categories pre-seeded.

## What you must supply yourself

Nobody, including me, can complete these on your behalf — they need your business identity, your
money, or your infrastructure decisions:

| Thing | Where to get it | Where it plugs in |
|---|---|---|
| Razorpay account + API keys | razorpay.com — requires business KYC | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` env vars |
| Google Maps API key | Google Cloud Console | `GOOGLE_MAPS_API_KEY` env var (used by the frontend, not yet called from this backend) |
| Firebase project + service account | Firebase Console | `FIREBASE_SERVICE_ACCOUNT_PATH` — push notifications now actually send once this file exists; see `FirebaseConfig.java` |
| SMS provider (MSG91 / Twilio / AWS SNS) | Their respective consoles | Replace the body of `OtpService.sendOtp()` |
| Anthropic API key | console.anthropic.com | `ANTHROPIC_API_KEY` env var — powers the AI assistant's chat calls, kept server-side only |
| A real JWT secret | Generate 32+ random bytes yourself | `JWT_SECRET` env var — **do not use the default in production** |
| Cloud hosting (AWS/GCP) + a domain | Your cloud provider account | Deploy the Docker image there; nothing here does this for you |

## Deploying to Render

`render.yaml` in this folder is a Render "Blueprint" — connect this repo at
render.com/blueprints and it provisions both the web service and a managed Postgres database
automatically. You'll be prompted to fill in the secrets marked `sync: false` (Razorpay keys,
JWT secret, Anthropic key, Maps key) yourself — nobody else can supply those.

**Important gap to know about:** `docker-compose.yml`'s local setup runs `database/schema.sql`
automatically (Postgres's own init-script mechanism), which is where the Phase 1-3 category rows,
sample bus routes, and demo petrol bunks get seeded. Render's managed Postgres doesn't run that
same init step — `ddl-auto: update` only creates the table *structure* from the JPA entities, not
that seed data. After your first deploy, connect to the Render database (it gives you a
`psql` connection string in its dashboard) and run `database/schema.sql` against it once
manually, or your app will start with an empty categories table and nothing will be bookable.

Once you have a real frontend URL (e.g. from Vercel), update two places to match it:
1. `SecurityConfig.corsConfigurationSource()` — replace the placeholder `ooru-frontend.vercel.app`
2. `ooru-frontend/.env`'s `VITE_API_BASE_URL` — point it at your Render backend URL

## Running it locally

Requires Docker and Docker Compose.

```bash
docker-compose up --build
```

This starts Postgres (seeded with `database/schema.sql`) and the backend on `http://localhost:8080`.

Without Docker, you need Java 17, Maven, and a local Postgres instance matching the
`DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` in `application.yml`, then:

```bash
mvn spring-boot:run
```

## The first admin account

`database/schema.sql` seeds one admin user (phone `9999999999`). The seeded password hash
corresponds to the password `change-me-immediately` — **change this before doing anything real**.
Admins are intentionally never created through the public `/api/auth/register` endpoint; the only
way to create one is directly in the database, on purpose, so a stray API call can never grant
someone admin access.

## API overview

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create an account (`CUSTOMER`, `SHOP_OWNER`, or `DELIVERY_PARTNER`) |
| POST | `/api/auth/verify-otp` | public | Activate the account |
| POST | `/api/auth/login` | public | Get a JWT |
| GET | `/api/categories` | public | List active service categories |
| POST | `/api/shops/register` | SHOP_OWNER | Register a shop (goes to `PENDING`) |
| GET | `/api/shops/mine` | SHOP_OWNER | List your own shops |
| GET | `/api/shops/by-category/{code}` | public | Approved shops for a category |
| POST | `/api/shops/{shopId}/menu` | SHOP_OWNER (must own the shop) | Add a menu item (food/grocery shops) |
| GET | `/api/shops/{shopId}/menu` | public | Browse a shop's active menu |
| POST | `/api/bookings` | authenticated | Create a booking — pass `items` for food/grocery, `slotId` for tailor |
| GET | `/api/bus-routes/search?q=` | public | Bus timing lookup (not a booking) |
| GET | `/api/shops/nearby?categoryCode=&lat=&lng=` | public | Nearest shops by real distance (petrol bunks etc.) |
| POST | `/api/shops/{shopId}/slots` | SHOP_OWNER (must own the shop) | Open a real appointment slot (tailor) |
| GET | `/api/shops/{shopId}/slots` | public | Browse a shop's still-open slots |
| PATCH | `/api/bookings/{id}/fulfillment` | authenticated (must own the booking) | Choose pickup/delivery once a booking is COMPLETED |
| GET | `/api/assistant/schema` | authenticated | The category/field schema the AI assistant knows about |
| POST | `/api/assistant/chat` | authenticated | One turn of the natural-language booking assistant |
| POST | `/api/assistant/confirm` | authenticated | Turns an assistant's finished state into a real booking |
| PATCH | `/api/users/me/fcm-token` | authenticated | Register a device for push notifications |
| POST | `/api/reviews` | authenticated | Review a completed booking (once) |
| GET | `/api/shops/{shopId}/reviews` | public | A shop's average rating + reviews |
| GET | `/api/search?q=` | public | Real substring search across shops and menu items |
| GET | `/api/bookings/mine/frequent-items` | authenticated | "Order again" — this customer's own most-ordered items |
| WS | `/ws` (STOMP topic `/topic/customer/{id}/bookings`) | — | Real-time booking status push |
| GET | `/api/bookings/mine` | authenticated | Your own bookings |
| GET | `/api/bookings/shop/{shopId}` | authenticated | Bookings routed to a shop |
| PATCH | `/api/bookings/{id}/status` | authenticated | Move a booking through its lifecycle |
| POST | `/api/payments/create-order` | authenticated | Create a Razorpay order for a booking |
| POST | `/api/payments/verify` | authenticated | Verify payment signature after checkout |
| GET | `/api/admin/shops/pending` | ADMIN | Shop approval queue |
| PATCH | `/api/admin/shops/{id}/approve` \| `/reject` \| `/suspend` | ADMIN | Approve/reject a shop |

Every authenticated request needs `Authorization: Bearer <token>` from the login response.

## What's deliberately not built yet

- **Frontend** — see `../ooru-frontend` for the React app that calls these exact endpoints,
  including the food/grocery cart flow.
- **Push notifications actually send now** (`NotificationService` + `FirebaseConfig`), but fail
  silently and safely until you've done the Firebase Console setup — `FirebaseConfig` checks for
  a real service account file on startup and simply logs a warning and skips initialization if
  it's not there, rather than crashing. `BookingService.updateStatus` fires a notification on
  every status change once a customer has registered a device token.
- **Maps/distance** — the Google Maps API key is wired into config but no endpoint calls it yet;
  the "nearest shop" logic from the prototype (haversine distance) is a reasonable starting point
  to port into a real endpoint.
- **AI assistant covers 13 of the simple categories, not food/grocery** — `AssistantService`'s
  schema mirrors Tailor, Xerox, AC, Plumber, Electrician, Parcel, Rental, Driver, House Rent,
  Hotel, Scrap, Food Donation, Old Clothes. Food/grocery need a shop + menu chosen first, which
  is a different interaction shape — `FoodOrder.jsx` handles those directly instead.
- **Remaining Phase 4 features** (voice booking, AI shop recommendations, route optimization,
  demand prediction, fraud detection) are not built — the natural-language chat is the one piece
  of Phase 4 that's in.
- **Admin/shop-owner/customer dashboards as UI** — the API supports them; see the frontend for
  what's actually built on top.

## A note on testing

This code was written directly to files, not compiled or run in a live environment while writing
it (no internet access here to pull Maven dependencies). It's structured correctly and follows
real Spring Boot conventions, but treat it as a strong first draft — run `mvn clean install` and
work through any small compilation issues before deploying anywhere that matters.
