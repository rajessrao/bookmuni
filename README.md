# Bookmuni

Bookmuni is a private, community-first way to lend and borrow physical books. Members can maintain a personal shelf, share copies with approved communities, request books, and track pickup, due dates, return, and trust signals.

## Stack

- Next.js App Router 16 with TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL, Storage, and Row Level Security
- Google Books ISBN lookup with Open Library fallback
- Vercel-compatible modular monolith

## Prerequisites

- Node.js and npm
- Supabase CLI
- A Supabase project linked to this repository

Install dependencies:

```bash
npm install
```

## Environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Required for normal development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_or_anon_key
```

Optional:

```env
GOOGLE_BOOKS_API_KEY=your_google_books_key
NEXT_PUBLIC_ENABLE_DEV_PASSWORD_LOGIN=false
```

Never commit `.env.local`, a Supabase service-role key, SMTP passwords, or API keys.

## Supabase setup

Link the local project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Apply all migrations and seed configuration:

```bash
supabase db push
```

Check migration status:

```bash
supabase migration list
supabase db push --dry-run
```

The migrations create profiles, communities, memberships, books, listings, loan requests, loans, notifications, storage buckets, reports, blocks, and ratings.

## Run locally

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful commands:

```bash
npm run lint
npm run build
npm run start
```

If port 3000 is already in use:

```bash
lsof -ti:3000 | xargs kill
npm run dev
```

## Authentication modes

### Normal OTP authentication

The production flow uses email OTP:

1. Enable **Authentication -> Providers -> Email** in Supabase.
2. Enable email confirmation if required by your project policy.
3. Configure SMTP under **Project Settings -> Authentication -> SMTP Settings**.
4. Set the sender email to a verified sender/domain.
5. Configure the email template to include `{{ .Token }}` if using the six-digit code UI.
6. Ensure the template does not rely only on `{{ .ConfirmationURL }}`.
7. Keep this variable disabled:

```env
NEXT_PUBLIC_ENABLE_DEV_PASSWORD_LOGIN=false
```

Open `/auth`, enter an email, request the code, and enter the six-digit OTP.

If Supabase returns `Error sending confirmation email`, the problem is SMTP/provider configuration, not the Bookmuni form. Check the Supabase Auth logs and SMTP sender/domain verification.

### Local testing without OTP email

When SMTP is unavailable, create confirmed test users through the Admin API. This requires a service-role key and must only be used locally.

Add these values to `.env.local` temporarily:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
NEXT_PUBLIC_ENABLE_DEV_PASSWORD_LOGIN=true
```

Run the local test-user seeder:

```bash
npm run seed:test-users
```

It creates or updates these confirmed users:

```text
admin.test@bookmuni.local / BookmuniTest123!
reader.one@bookmuni.local / BookmuniTest123!
reader.two@bookmuni.local / BookmuniTest123!
```

It also creates profiles and approves the users in the pilot community `Page Turner Troopers`, with `admin.test` as the community admin.

At `/auth`, choose **Use a local test account**. Password login is only shown when `NEXT_PUBLIC_ENABLE_DEV_PASSWORD_LOGIN=true`.

After testing:

1. Set `NEXT_PUBLIC_ENABLE_DEV_PASSWORD_LOGIN=false`.
2. Remove `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` if it is no longer needed.
3. Do not deploy the service-role key to Vercel or expose it to the browser.

## Pilot data

Pilot community:

```text
Name: Page Turner Troopers
Location: Patancheru, Hyderabad
Pickup: Community Hall
Lending period: 14 days
Invitation code: PAGE-TURNER
```

The invitation code is intended for development/pilot testing and should be rotated before real community use.

## Main routes

```text
/auth                         Email OTP or local test login
/dashboard                    Authenticated home
/profile                      Profile details
/communities                  Memberships and invitation joining
/communities/new              Create a community
/communities/[id]             Community details and approvals
/communities/[id]/admin       Community admin settings
/communities/[id]/admin/reports Admin report review
/communities/[id]/books       Community book discovery
/library                      Personal library
/library/new                  Add a physical copy
/library/[copyId]/edit        Edit, delete, and add copy photos
/books/[copyId]               Book detail and request form
/requests                     Lending request inbox
/loans                        Loan history
/loans/[loanId]               Pickup, return, close, report, and rating
/notifications                In-app notifications
/moderation                   Personal reports and blocked-member summary
```

## Scheduled loan processing

Due-soon and overdue notifications are processed by this Supabase function:

```sql
select public.process_loan_notifications();
```

For production, schedule it with Supabase Cron or another trusted server-side scheduler. Do not call it from an untrusted browser client.

## Storage

The library-completion migration creates:

```text
bookmuni-covers
bookmuni-copy-photos
```

Uploads are owner-scoped through Storage RLS. Copy photos are uploaded from the book edit route.

## Testing checklist

Run static checks:

```bash
npm run lint
npm run build
```

Manual pilot flow:

1. Sign in with OTP or a seeded local test account.
2. Complete the profile.
3. Join `Page Turner Troopers` with `PAGE-TURNER` or create a test community.
4. Add a book privately and with community visibility.
5. Open the community book shelf.
6. Request a book as a reader account.
7. Approve it as the lender account.
8. Confirm pickup as both users.
9. Confirm return as both users.
10. Close the loan and submit a private rating.
11. Check Notifications, Reports, and the community admin reports route.

## Security notes

- Authorization is enforced with Supabase RLS and server-side checks.
- Exact home addresses are not stored or exposed by the MVP.
- Service-role credentials must only be used by local/admin scripts.
- Do not enable the development password login in production.
- Rotate pilot invitation codes and development credentials before real users join.
You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
