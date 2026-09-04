This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Supabase setup

1. Copy `.env.example` to `.env.local` and add the project URL and anon key from Supabase Project Settings > API.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. In Supabase Authentication > Providers, enable Email.

The app uses `lib/supabase.ts` for browser access, `lib/supabase-server.ts` for server access, and `proxy.ts` to refresh the auth session in the Next.js App Router. Notes are private by default.

## Free inbound SMS notes with TextBee

TextBee can forward SMS received by an Android phone to Tether. Install and configure TextBee on an Android phone with the number you want to text, then deploy Tether to a public HTTPS address.

1. In Supabase Authentication > Users, copy the target Tether user's UUID into `TETHER_SMS_OWNER_ID`.
2. Add the Supabase **service role** key as `SUPABASE_SERVICE_ROLE_KEY`. Keep this server-only value out of `NEXT_PUBLIC_*` variables and never commit it.
3. Set a long random `TETHER_SMS_WEBHOOK_SECRET` and set `TETHER_SMS_ALLOWED_SENDER` to the phone number allowed to create notes.
4. In TextBee, configure its inbound-message webhook URL as `https://your-domain.com/api/sms?secret=YOUR_SECRET`.

Tether accepts JSON or form-encoded webhook payloads with common body fields (`body`, `message`, `text`, or `content`) and sender fields (`from`, `sender`, or `phone`). Every incoming SMS becomes a private note tagged `source:sms`. SMS text can include `#tag` or `##tag` to create main or sub tags.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
