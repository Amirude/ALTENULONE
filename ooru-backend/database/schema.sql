-- Altenul One Phase 1 database schema (PostgreSQL)
-- This mirrors what Hibernate would generate from the JPA entities. Use this file for a real
-- migration tool (Flyway/Liquibase) once you move off ddl-auto: update in application.yml.

CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(20)  NOT NULL UNIQUE,
    email           VARCHAR(255) UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(30)  NOT NULL CHECK (role IN ('ADMIN','SHOP_OWNER','CUSTOMER','DELIVERY_PARTNER')),
    phone_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    fcm_token       VARCHAR(500),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_categories (
    id            BIGSERIAL PRIMARY KEY,
    code          VARCHAR(50)  NOT NULL UNIQUE,
    display_name  VARCHAR(100) NOT NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS shops (
    id             BIGSERIAL PRIMARY KEY,
    owner_user_id  BIGINT       NOT NULL REFERENCES users(id),
    shop_name      VARCHAR(255) NOT NULL,
    category_code  VARCHAR(50)  NOT NULL,
    address        VARCHAR(500) NOT NULL,
    latitude       DOUBLE PRECISION,
    longitude      DOUBLE PRECISION,
    status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
    id                BIGSERIAL PRIMARY KEY,
    reference         VARCHAR(20)  NOT NULL UNIQUE,
    customer_user_id  BIGINT       NOT NULL REFERENCES users(id),
    shop_id           BIGINT       REFERENCES shops(id),
    slot_id           BIGINT       REFERENCES appointment_slots(id),
    category_code     VARCHAR(50)  NOT NULL,
    details_json      TEXT         NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'REQUESTED'
                       CHECK (status IN ('REQUESTED','ACCEPTED','REJECTED','IN_PROGRESS','COMPLETED','CANCELLED')),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
    id                   BIGSERIAL PRIMARY KEY,
    booking_id           BIGINT      NOT NULL UNIQUE REFERENCES bookings(id),
    amount_paise         BIGINT      NOT NULL,
    currency             VARCHAR(3)  NOT NULL DEFAULT 'INR',
    razorpay_order_id    VARCHAR(100),
    razorpay_payment_id  VARCHAR(100),
    status               VARCHAR(20) NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED','PAID','FAILED','REFUNDED')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
    id           BIGSERIAL PRIMARY KEY,
    shop_id      BIGINT       NOT NULL REFERENCES shops(id),
    name         VARCHAR(255) NOT NULL,
    price_paise  BIGINT       NOT NULL,
    image_url    VARCHAR(1000),
    active       BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_menu_items_shop ON menu_items(shop_id);

CREATE TABLE IF NOT EXISTS appointment_slots (
    id          BIGSERIAL PRIMARY KEY,
    shop_id     BIGINT      NOT NULL REFERENCES shops(id),
    date        DATE        NOT NULL,
    start_time  TIME        NOT NULL,
    end_time    TIME        NOT NULL,
    booked      BOOLEAN     NOT NULL DEFAULT FALSE,
    version     BIGINT      NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_slots_shop ON appointment_slots(shop_id);

CREATE TABLE IF NOT EXISTS reviews (
    id          BIGSERIAL PRIMARY KEY,
    booking_id  BIGINT      NOT NULL UNIQUE REFERENCES bookings(id),
    shop_id     BIGINT      NOT NULL REFERENCES shops(id),
    customer_id BIGINT      NOT NULL REFERENCES users(id),
    rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     VARCHAR(1000),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_shop ON reviews(shop_id);

-- A plain lookup table, not tied to bookings — see BusRoute.java for why.
CREATE TABLE IF NOT EXISTS bus_routes (
    id            BIGSERIAL PRIMARY KEY,
    route_number  VARCHAR(20)   NOT NULL,
    from_stop     VARCHAR(255)  NOT NULL,
    to_stop       VARCHAR(255)  NOT NULL,
    departures    VARCHAR(1000) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_shop ON bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_shops_category_status ON shops(category_code, status);

-- Phase 1 categories.
INSERT INTO service_categories (code, display_name) VALUES
    ('tailor', 'Tailor'),
    ('xerox', 'Xerox / Printout'),
    ('ac', 'AC Service'),
    ('plumber', 'Plumber'),
    ('electrician', 'Electrician')
ON CONFLICT (code) DO NOTHING;

-- Phase 2 categories. "food" and "grocery" are cart-based (see menu_items + BookingService's
-- CART_BASED_CATEGORIES) — every other category here uses the same simple field-based booking
-- as Phase 1.
INSERT INTO service_categories (code, display_name) VALUES
    ('food', 'Food Delivery'),
    ('grocery', 'Grocery Delivery'),
    ('parcel', 'Parcel Pickup & Delivery'),
    ('rental', 'Bike/Car Rental'),
    ('driver', 'Driver Booking')
ON CONFLICT (code) DO NOTHING;

-- Phase 3 categories — House Rent, Hotel, Scrap Collection, and the two donation categories are
-- simple field-based bookings, same pattern as Phase 1. Bus Timings and Petrol Bunks are NOT
-- bookings at all (see bus_routes above, and the "petrol" shop category below) — nobody "books"
-- a bus timing or a petrol pump, they just look one up.
INSERT INTO service_categories (code, display_name) VALUES
    ('houserent', 'House Rent / Lease'),
    ('hotel', 'Hotel Booking'),
    ('scrap', 'Scrap Collection'),
    ('fooddonation', 'Food Donation'),
    ('oldclothes', 'Old Clothes Donation')
ON CONFLICT (code) DO NOTHING;

-- Sample bus routes for the lookup demo. Replace with a live transit data feed for real use.
INSERT INTO bus_routes (route_number, from_stop, to_stop, departures) VALUES
    ('21G', 'Broadway', 'Tambaram', '5:40am, 6:10am, 6:40am, then every 20 min till 10pm'),
    ('M23', 'Anna Nagar', 'Tambaram', '5:50am, 6:20am, 6:55am, then every 25 min till 9:30pm'),
    ('570', 'CMBT', 'Mahabalipuram', '6:00am, 8:00am, 10:00am, 2:00pm, 5:00pm'),
    ('18A', 'Broadway', 'Anna Nagar', 'every 15 min, 5:45am till 11pm'),
    ('55', 'Tambaram', 'Velachery', '6:05am, 6:40am, 7:10am, then every 20 min till 10pm');

-- A demo shop owner + a few approved petrol bunks, purely so the "nearby" lookup has something to
-- return out of the box. Password hash corresponds to "change-me-immediately", same as the admin
-- seed above — change it before this matters.
INSERT INTO users (name, phone, email, password_hash, role, phone_verified)
VALUES ('Demo Fuel Retailer', '9888888888', 'demo-fuel@example.com',
        '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5c4/hnZQ8/n8QG/kQpvT4kZa6SwjO',
        'SHOP_OWNER', TRUE)
ON CONFLICT (phone) DO NOTHING;

INSERT INTO shops (owner_user_id, shop_name, category_code, address, latitude, longitude, status)
SELECT u.id, v.shop_name, 'petrol', v.address, v.lat, v.lng, 'APPROVED'
FROM users u,
     (VALUES
        ('IOC Petrol Bunk, Anna Salai', 'Anna Salai, Chennai', 13.0604, 80.2496),
        ('HP Petrol Pump, T Nagar', 'T Nagar, Chennai', 13.0418, 80.2341),
        ('Bharat Petroleum, Velachery', 'Velachery, Chennai', 12.9789, 80.2201)
     ) AS v(shop_name, address, lat, lng)
WHERE u.phone = '9888888888';

-- Seed the first admin account directly in the database — admins are never created through the
-- public API (see AuthService.register). Replace the password hash below by generating your own
-- bcrypt hash (e.g. via an online bcrypt generator or Spring's BCryptPasswordEncoder) before use.
-- This placeholder hash corresponds to the password "change-me-immediately".
INSERT INTO users (name, phone, email, password_hash, role, phone_verified)
VALUES ('Platform Admin', '9999999999', 'admin@example.com',
        '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5c4/hnZQ8/n8QG/kQpvT4kZa6SwjO',
        'ADMIN', TRUE)
ON CONFLICT (phone) DO NOTHING;
