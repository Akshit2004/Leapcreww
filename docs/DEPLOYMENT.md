# WappFlow Deployment Runbook

> Operational reference for provisioning environments. Pair with [`.env.example`](../.env.example)
> for the full variable list and [`SECURITY_REMEDIATION_PLAN.md`](SECURITY_REMEDIATION_PLAN.md) for
> the security posture each secret upholds.

## Required production secrets

Every value below **must be set, non-empty, and unique per environment**. The webhook/auth routes
fail closed when their secret is missing (they reject all traffic rather than processing unsigned
requests), and `src/instrumentation.ts` logs a loud warning at boot if any is unset or left at a
committed default.

| Variable | Purpose | Failure mode if unset |
|----------|---------|-----------------------|
| `NEXTAUTH_SECRET` | NextAuth session/JWT signing | Auth breaks / insecure sessions |
| `WHATSAPP_APP_SECRET` | WhatsApp inbound webhook HMAC (`x-hub-signature-256`) | All WhatsApp webhooks → `401` |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Meta webhook GET verification handshake | Meta cannot verify the callback URL |
| `SHOPIFY_CLIENT_SECRET` | Shopify webhook HMAC (`x-shopify-hmac-sha256`) | All Shopify webhooks → `401` |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook + payment-link signature | Razorpay webhooks → `401` |
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL connection | App cannot start |
| `WHATSAPP_SYSTEM_USER_TOKEN` | Platform Meta System User token (outbound sends) | Outbound WhatsApp sends fail |

### Important: do not ship committed defaults

`WHATSAPP_WEBHOOK_VERIFY_TOKEN` historically shipped as `wappflow_verify_2026` in `.env.example`.
That default has been neutralized (the example is now empty). Generate a unique random token per
environment and set the **same** value in the Meta App webhook config.

## Optional but recommended

| Variable | Purpose | Behavior if unset |
|----------|---------|-------------------|
| `PLATFORM_ADMIN_EMAILS` | Comma-separated allowlist for cross-tenant platform-admin actions (e.g. `POST /api/partner`) | Nobody can provision partners (fail-closed) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Per-customer + OTP rate limiting | Rate limiting silently no-ops |
| `GROQ_API_KEY` | AI autoresponder / template auditor | AI features disabled |
| `CRON_SECRET` | Auth for `/api/cron/*` | Cron endpoints unprotected — set it |

## Generating secrets

```bash
# 256-bit random token (NEXTAUTH_SECRET, WHATSAPP_WEBHOOK_VERIFY_TOKEN, CRON_SECRET)
openssl rand -base64 32
```

`WHATSAPP_APP_SECRET`, `SHOPIFY_CLIENT_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` are issued by the
respective provider consoles (Meta App → Settings → Basic; Shopify Partners → app client secret;
Razorpay Dashboard → Webhooks) — copy them, don't generate.

## Pre-deploy verification gates (Constitution Article IV)

```bash
npx prisma validate
npx tsc --noEmit
SKIP_ENV_VALIDATION=1 npx next build
```
