# Ticketeer Project Memory

## Purpose

Ticketeer is a ticket sales and event operations system. It combines a Node.js/Express API, a Vue 3 frontend, Auth0 authentication, Prisma/PostgreSQL persistence, public buyer confirmation flows, QR-based check-in, accessory pickup, and checkout webhook processing.

This file replaces the previous root-level Markdown notes and the old `docs/` folder. Keep stable project knowledge here and prefer source code/tests over separate instruction files.

## Tech Stack

- Runtime/API: Node.js, Express 4, `server.js`
- Frontend: Vue 3, Vite, Vue Router, Bootstrap 5, Tailwind config present
- Authentication: Auth0 with JWT bearer middleware
- Database: Prisma with PostgreSQL via `DATABASE_URL`
- Generated Prisma client: `generated/prisma`
- Email: AWS SES through `services/emailService.js`
- QR scanning: `html5-qrcode`
- Tables: `vue3-easy-data-table`
- Tests: Jest

## Core Commands

```bash
yarn install
yarn dev
yarn dev:client
yarn build
yarn test
yarn db:generate
yarn db:migrate
yarn db:migrate:deploy
yarn db:studio
```

`yarn dev` and `yarn start` run `node server.js` on `PORT` or `3000`. `yarn dev:client` starts Vite for the Vue app. `yarn test` sets `ORDER_HASH_SECRET=test-order-hash-secret` and runs Jest.

## Important Paths

- `server.js`: main Express app and route registration
- `src/`: Vue application
- `src/router/routes.js`: client routes
- `src/views/EventDetail.vue`: ticket table, bulk operations, ticket actions
- `src/views/BuyerConfirmation.vue`: Vue buyer confirmation flow
- `src/views/TicketCheckin.vue`: public ticket check-in page
- `src/views/QRCodeCheckin.vue`: camera QR scanner for check-in
- `src/views/TicketAccessoryPickup.vue`: public accessory pickup page
- `src/views/QRCodeAccessoryPickup.vue`: camera QR scanner for accessory pickup
- `services/`: business logic modules
- `utils/orderHash.js`: order confirmation hash helper
- `utils/cpfValidator.js`: Brazilian CPF validation
- `utils/qrCodeHash.js`: ticket QR/check-in hash helper
- `prisma/schema.prisma`: database schema
- `tests/`: Jest coverage for confirmation, public search, and webhook behavior
- `public/`: buyer-facing static confirmation assets that must be deployed
- `config/prisma.js`: shared Prisma client; services and routes should import this instead of creating new clients.

## Environment And Secrets

Never commit `.env`, `.env.production`, `.env.local`, or any `.env.*` secret file.

Common required variables:

```bash
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_AUDIENCE=
DATABASE_URL=
BASE_URL=
ORDER_HASH_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
FROM_EMAIL=no-reply@nova.money
NODE_ENV=
PORT=3000
```

Use only `DATABASE_URL` for the app database. Avoid introducing competing connection variables such as `POSTGRES_URL` or `PRISMA_DATABASE_URL` unless the application is explicitly changed to support them.

Production confirmation links should use `BASE_URL` first, then `VERCEL_URL`, then the fallback `https://ticketeer.vercel.app`.

If a secret is committed, rotate it immediately, remove it from history with BFG or `git filter-branch`, update deployments, and notify anyone with repository access.

## Database Model Notes

Use the shared Prisma client from `config/prisma.js`. Do not instantiate `new PrismaClient()` in route handlers or services; repeated clients can exhaust database connections, especially under serverless concurrency.

Prisma currently has these main models:

- `Event`: event metadata, owner Auth0 id in `created_by`, images, venue, checkout page fields, ticket numbering, status.
- `Ticket`: belongs to an event, has identification number, description, location/table/price, `order`, buyer fields, sales end time, check-in fields, and accessory pickup fields.
- `UserProfile`: stores Nova Money API key and tenant by user id.

Important ticket behavior:

- `@@unique([eventId, identificationNumber])`
- `qrCodeHash` is stored on each ticket and unique; public check-in/accessory lookup uses this indexed field.
- Event deletion cascades to tickets.
- Check-in fields are `checkedIn` and `checkedInAt`.
- Accessory pickup fields are `accessoryCollected`, `accessoryCollectedAt`, and `accessoryCollectedNotes`.

## Public API Surface

Health and test:

- `GET /api/health`
- `GET /api/test/simple`
- `GET /api/test/protected`

Public event and ticket search:

- `GET /api/public/events/:id`
- `GET /api/public/tickets/search?userId=&eventId=&available=`

Buyer confirmation:

- `GET /api/public/orders/:hash`
- `POST /api/public/orders/:hash/buyers`
- `GET /api/orders/:orderId/confirmation-hash` requires auth

Check-in:

- `GET /api/public/checkin/:hash`
- `POST /api/public/checkin/:hash`
- `GET /api/events/:eventId/checkin/stats` requires auth
- `GET /api/tickets/:ticketId/checkin-hash` requires auth

Accessory pickup:

- `GET /api/public/accessory-pickup/:hash`
- `POST /api/public/accessory-pickup/:hash`
- `GET /api/events/:eventId/accessory-pickup/stats` requires auth
- `GET /api/tickets/:ticketId/accessory-pickup-hash` requires auth

Webhook:

- `POST /api/webhooks/checkout/:userId`

Protected app routes include event CRUD, ticket CRUD, ticket batch creation, ticket batch delete, ticket bulk edit/delete, dashboard stats, recent purchases, Nova checkout pages, and Nova Money profile routes.

## Buyer Confirmation

The buyer confirmation flow lets a customer fill buyer details for all tickets in an order through a public hash URL. Public links must not expose raw order IDs.

Key files:

- `services/orderService.js`
- `utils/orderHash.js`
- `utils/cpfValidator.js`
- `src/views/BuyerConfirmation.vue`
- Legacy/static assets in `public/confirmation.*`
- `tests/buyerConfirmation.test.js`

Behavior:

- Hashes use HMAC-SHA256 with `ORDER_HASH_SECRET`.
- Buyer form requires name, CPF, and email for each ticket.
- CPF validation uses the Brazilian CPF verification algorithm.
- CPF and email must be unique within the same order.
- Saves are atomic: all buyers are saved or none are saved.
- Completed forms are one-time and cannot be edited through the public flow.
- Completed data should be masked when shown publicly.
- Interface copy is in Portuguese.

## Checkout Webhook Behavior

Checkout webhooks are processed at `POST /api/webhooks/checkout/:userId`.

Current selective buyer assignment rule:

- All tickets selected by a purchase receive the `order` value.
- Only the first selected ticket, sorted by `identificationNumber` ascending, receives buyer fields.
- Later tickets in the same purchase keep buyer fields empty.
- Quantity-based purchases select unsold tickets without table numbers.
- Table-based purchases select all tickets for the table number.
- Updates should be transaction-safe and avoid partial assignment on errors.

This rule protects buyer privacy and prevents duplicating personal data across all tickets in one order.

## Ticket Management

Ticket APIs support:

- Create one ticket for an event.
- Create a batch of tickets.
- Search/list tickets by event.
- Update/delete single tickets.
- Delete batches.
- Resend buyer email for a ticket.
- Bulk edit and bulk delete selected tickets.

The event detail UI uses `vue3-easy-data-table` with sorting, pagination, status columns, actions, and selection checkboxes.

Bulk edit supports partial updates. Empty fields are skipped unless the user explicitly chooses to clear the field. Server-side bulk operations must verify ownership and use transactions.

## QR Check-In

Ticket check-in uses public hash URLs and public API endpoints.

Key files:

- `services/checkinService.js`
- `utils/qrCodeHash.js`
- `src/views/TicketCheckin.vue`
- `src/views/QRCodeCheckin.vue`

Behavior:

- QR code URL format is `/checkin/:hash`.
- Public status endpoint returns ticket status.
- Public POST endpoint marks the ticket as checked in.
- Duplicate check-ins show an already checked-in state with timestamp.
- Hashes are deterministic and generated from user/event/ticket context.
- QR scanner can read full URLs or raw hashes and then redirects to `/checkin/:hash`.
- Camera access requires HTTPS in production.

## Accessory Pickup

Accessory pickup mirrors the check-in pattern but tracks accessory collection instead of entry.

Key files:

- `services/accessoryPickupService.js`
- `src/views/TicketAccessoryPickup.vue`
- `src/views/QRCodeAccessoryPickup.vue`

Behavior:

- Public URL format is `/accessory-pickup/:hash`.
- Public POST endpoint marks accessory as collected.
- Stats endpoint is scoped to an authenticated event owner.
- Ticket fields track collection status, timestamp, and notes.

## Email

AWS SES is used for buyer confirmation and completion emails.

Important expectations:

- `FROM_EMAIL` should be verified in SES.
- SES domain/email must be verified.
- Production SES must be out of sandbox mode if sending to arbitrary customers.
- IAM permissions must allow `ses:SendEmail` and `ses:SendRawEmail`.
- Webhook processing should send a confirmation link when customer email exists.
- Completing buyer confirmation should send a completion email with ticket details.

## Auth0

Auth0 is used for protected dashboard, event, ticket, profile, and owner-scoped routes.

Auth0 environment variables are required. Do not add hardcoded tenant, client id, or audience fallbacks in frontend or backend config. The browser uses `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, and `VITE_AUTH0_AUDIENCE`; the API uses `AUTH0_DOMAIN` and `AUTH0_AUDIENCE`.

Local Auth0 callback/origin values should include:

```text
http://localhost:3000/callback
http://localhost:3000
```

Production values should use the deployed domain, normally:

```text
https://ticketeer.vercel.app/callback
https://ticketeer.vercel.app
```

When adding protected backend routes, use the existing auth middleware pattern and derive user ownership from the authenticated user context. On the frontend, use the existing API/composable patterns instead of ad hoc fetch logic.

## Public API Testing

Useful local checks:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/test/simple
curl "http://localhost:3000/api/public/tickets/search?userId=auth0%7Csample&eventId=1&available=true"
```

Run focused tests when changing these areas:

```bash
yarn test -- --testNamePattern="Buyer Confirmation"
yarn test -- --testNamePattern="webhook"
yarn test -- --testNamePattern="Public Ticket Search"
```

## Deployment Notes

- Vercel build command is `vite build && npx prisma generate`.
- Run `yarn db:migrate:deploy` or `npx prisma migrate deploy` for production migrations.
- Ensure `BASE_URL`, `DATABASE_URL`, Auth0 variables, AWS SES variables, and `ORDER_HASH_SECRET` are configured in Vercel.
- Do not log secret values.
- Confirm production links resolve to the deployed domain before sending customer emails.
- Buyer confirmation assets in `public/` are needed for customer-facing confirmation links and should stay in the repository.

## Documentation Policy

Keep the root clean. The only Markdown file in the project root should be this `MEMORY.md`.

Do not reintroduce a broad `docs/` folder for historical notes. If project knowledge is still useful, add a concise version here. If behavior needs detail, keep it close to the implementation or tests.
