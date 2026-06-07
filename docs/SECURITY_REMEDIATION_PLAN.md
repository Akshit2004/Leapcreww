# WappFlow Security Remediation Plan

> **Status:** Proposed · Created 2026-06-07
> **Source:** Static security audit (OWASP Top 10 + API checklist). Overall score at audit time: **6/10**.
> **Goal:** Close the webhook auth-bypass, unauthenticated data-dump endpoints, and the unverified
> Shopify webhook, then work down the Medium/Low backlog. Target post-remediation score: **8+/10**.
>
> All work MUST comply with [`CONSTITUTION.md`](../CONSTITUTION.md) — feature layering
> (`api/ → services/ → repositories/`), `requireSession`/`requireOrg` guards, no `any`, and the
> verification gates (`prisma validate · tsc --noEmit · next build`). See [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## How to use this document

Work top-to-bottom by phase. Each item lists **where**, **what's wrong**, **the fix**, and **how to verify**.
Check the box when the fix is merged and verified. Do Phase 0 before any production deploy.

---

## Finding summary

| # | Severity | Finding | Phase | Status |
|---|----------|---------|-------|--------|
| 1 | 🔴 Critical | WhatsApp webhook signature is skippable (`if (signature)`) → account takeover | 0 | ☑ |
| 2 | 🔴 Critical | Unauthenticated debug endpoints leak cross-tenant data | 0 | ☑ |
| 3 | 🟠 High | Shopify webhook has no HMAC verification + open "simulate" injection branch | 0 | ☑ |
| 4 | 🟠 High | Shopify catalog sync (GET) is unauthenticated, acts on arbitrary `orgId` | 1 | ☐ |
| 5 | 🟡 Medium | OTP uses `Math.random()` and has no max-try lockout | 1 | ☐ |
| 6 | 🟡 Medium | OTP-send has no per-phone throttle (WhatsApp OTP bombing) | 1 | ☐ |
| 7 | 🟡 Medium | Partner provisioning lacks an admin role gate (privilege escalation) | 1 | ☐ |
| 8 | 🟡 Medium | Vulnerable dependencies (`npm audit`: 11, 4 high) | 1 | ☐ |
| 9 | 🟡 Medium | Internal error messages returned to clients (info disclosure) | 2 | ☐ |
| 10 | 🟡 Medium | Shopify upsert keyed on global `id: email` → cross-tenant contact collision | 2 | ☐ |
| 11 | 🟢 Low | Razorpay webhook uses non-constant-time signature compare | 2 | ☐ |
| 12 | 🟢 Low | `any` casts in webhook handlers (Article IV violation) | 2 | ☐ |
| 13 | 🟢 Low | Default verify token committed in `.env.example` | 2 | ☐ |

**Already remediated this session (context, no action needed):**
- ✅ Per-customer rate limiting ([`src/proxy.ts`](../src/proxy.ts) + [`src/shared/lib/ratelimit.ts`](../src/shared/lib/ratelimit.ts))
- ✅ OWASP security headers + CSP ([`next.config.ts`](../next.config.ts))
- ✅ Zod input validation helper + key routes ([`src/shared/lib/validation.ts`](../src/shared/lib/validation.ts))
- ✅ Cross-tenant IDOR on `PATCH/DELETE /api/contact/[contactId]` (org ownership check added)

---

## New environment variables introduced by this plan

```bash
# Shopify HMAC verification uses SHOPIFY_CLIENT_SECRET natively. No new variable needed.
```

`WHATSAPP_APP_SECRET` and `RAZORPAY_WEBHOOK_SECRET` already exist and become **mandatory** in production
after Phase 0 (the webhook routes will reject traffic if they are unset).

---

## Phase 0 — Critical (before next production deploy)

### 0.1 — Make the WhatsApp webhook signature mandatory  *(Finding #1)*

**Where:** [`src/features/webhooks/api/whatsapp/route.ts`](../src/features/webhooks/api/whatsapp/route.ts) (POST, ~line 26)
**Problem:** Validation runs only `if (signature)` present. Omitting `x-hub-signature-256` bypasses it
entirely, enabling forged inbound messages and — via `handleSystemAuthWebhook` — marking a
`whatsAppLoginAttempt` VERIFIED for a victim's account → **login as the victim**.

**Fix:** the helper [`validateWebhookSignature`](../src/shared/lib/whatsapp.ts) is already correct
(HMAC + `timingSafeEqual`). Make the route reject when the signature is missing or invalid:

```ts
const signature = req.headers.get("x-hub-signature-256");
const bodyText = await req.text();

if (!validateWebhookSignature(signature, bodyText)) {
  console.warn("WhatsApp webhook: missing or invalid signature");
  return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
}
```

**Notes:**
- Requires `WHATSAPP_APP_SECRET` to be set in every environment (helper returns `false` without it,
  which now correctly rejects all traffic instead of silently allowing unsigned requests).
- Meta's webhook **GET verification** (`verifyWebhook`) is unchanged.

**Verify:** POST without the header → `401`. POST with a correct HMAC (compute
`HMAC-SHA256(appSecret, rawBody)`) → `200`. Confirm Meta's live deliveries still succeed in staging.

---

### 0.2 — Delete the debug endpoints  *(Finding #2)*

**Where:** [`src/app/api/debug-db/route.ts`](../src/app/api/debug-db/route.ts) ·
[`src/app/api/debug-template/route.ts`](../src/app/api/debug-template/route.ts)
**Problem:** Both are unauthenticated. `debug-db` dumps cross-tenant `flowResponses`, a hard-coded
contact's attributes, and system logs; `debug-template?id=` returns any template by id.

**Fix:** delete both files (and any `src/features/**` implementation they re-export — grep first).
There is no legitimate production use. If a diagnostic is needed later, build it behind
`requireOrg(orgId, "OWNER")` and scope every query by `organizationId`.

```bash
git rm src/app/api/debug-db/route.ts src/app/api/debug-template/route.ts
```

**Verify:** `GET /api/debug-db` and `/api/debug-template?id=…` both return `404`. `next build` still
generates all remaining routes.

---

### 0.3 — Verify the Shopify webhook HMAC + remove the simulate branch  *(Finding #3)*

**Where:** [`src/app/api/webhooks/shopify/route.ts`](../src/app/api/webhooks/shopify/route.ts) (POST, ~line 146)
**Problem:** POST trusts spoofable `x-shopify-topic` / `x-shopify-shop-domain` headers with no HMAC
check, and the fallback branch lets any anonymous caller inject `{ simulatedTopic, simulatedPayload,
orgId }` into **any** org (creates orders/contacts, sends WhatsApp messages, enrolls sequences).

**Fix:**
1. Read the **raw body once** and verify `x-shopify-hmac-sha256` (base64 HMAC-SHA256 of the raw body
   with `SHOPIFY_WEBHOOK_SECRET`) using `crypto.timingSafeEqual`. Reject with `401` on mismatch.
2. **Delete** the `simulatedTopic/simulatedPayload/orgId` branch. If simulation is needed for QA, expose
   it as a separate authenticated route under `requireOrg(orgId, "ADMIN")`.

```ts
import crypto from "crypto";

function verifyShopifyHmac(rawBody: string, header: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyShopifyHmac(rawBody, request.headers.get("x-shopify-hmac-sha256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const payload = JSON.parse(rawBody);
  const topic = request.headers.get("x-shopify-topic") || "";
  const shop  = request.headers.get("x-shopify-shop-domain") || "";
  // …existing org lookup + handleWebhookEvent…
}
```

**Architecture note:** this file currently lives in `src/app/api/**` and imports `prisma` directly,
which violates Article I/II. Fixing this is a good moment to move the handler into
`src/features/webhooks/` (`api/ → services/ → repositories/`) with a one-line shim, matching the
WhatsApp/Razorpay webhooks. Track as a follow-up refactor if out of scope for the hotfix.

**Verify:** forged POST without a valid HMAC → `401`. A request body signed with the test secret →
processes. The `simulated*` payload path no longer exists.

---

## Phase 1 — High / Medium (within the week)

### 1.1 — Authenticate the Shopify catalog sync  *(Finding #4)*

**Where:** [`src/app/api/webhooks/shopify/route.ts`](../src/app/api/webhooks/shopify/route.ts) (GET, ~line 8)
**Problem:** `GET ?orgId=&action=sync` runs a full product sync for any `orgId` with no auth.
**Fix:** move sync out of the webhook file into an org-scoped route
(`/api/org/[orgId]/integrations/shopify/sync`) guarded by `requireOrg(orgId, "ADMIN")`; derive `orgId`
from the authorized session/path, never from an unauthenticated query param.
**Verify:** unauthenticated GET → `401/403`; a member with `ADMIN` can sync; a member of another org cannot.

### 1.2 — Harden the OTP flow  *(Finding #5)*

**Where:** [`send-otp`](../src/app/api/whatsapp-auth/send-otp/route.ts) ·
[`verify-otp`](../src/app/api/whatsapp-auth/verify-otp/route.ts)
**Fix:**
- Generate with a CSPRNG: `crypto.randomInt(100000, 1000000).toString()`.
- Add an `attempts Int @default(0)` column to `WhatsAppLoginAttempt` (prisma-steward task). On each
  wrong OTP, increment; at ≥ 5, set `status = "EXPIRED"` and reject. Compare with `crypto.timingSafeEqual`.
**Verify:** 5 wrong guesses invalidate the attempt; a correct OTP within the window still succeeds.

### 1.3 — Throttle OTP sends per phone  *(Finding #6)*

**Where:** [`send-otp`](../src/app/api/whatsapp-auth/send-otp/route.ts)
**Fix:** reuse the Upstash limiter from [`src/shared/lib/ratelimit.ts`](../src/shared/lib/ratelimit.ts)
with a dedicated bucket (e.g. **3 sends / 15 min** keyed by normalized phone). Degrades to no-op
without Upstash, same as the proxy.
**Verify:** the 4th send to the same number inside the window returns `429`.

### 1.4 — Gate partner provisioning behind an admin role  *(Finding #7)*

**Where:** [`src/features/partner/api/partner/route.ts`](../src/features/partner/api/partner/route.ts)
**Problem:** any authenticated user can create a partner (`requireSession` only).
**Fix:** introduce a platform-super-admin check (env allowlist of user ids/emails, or a `User.isSuperAdmin`
flag) and require it here. Until that exists, restrict to a known allowlist rather than any session.
**Verify:** a normal user → `403`; an allowlisted admin → `201`.

### 1.5 — Patch vulnerable dependencies  *(Finding #8)*

**Fix:** `npm audit`, then `npm audit fix`; review the 4 high-severity advisories individually and
bump majors manually where needed. Re-run the verification gates after.
**Verify:** `npm audit` high count is `0`; `tsc --noEmit` and `next build` still pass.

---

## Phase 2 — Hardening (backlog)

### 2.1 — Stop leaking internal error messages  *(Finding #9)*
[`razorpay webhook`](../src/features/webhooks/api/razorpay/route.ts) (~line 107),
[`verify-payment`](../src/features/marketplace/api/verify-payment/route.ts) (~line 43) return
`err.message` to the client. Return a generic `{ error: "Internal error" }`; log details server-side
(the shared `route()` wrapper already does this — migrate these raw handlers onto it).

### 2.2 — Fix cross-tenant contact collision in Shopify upsert  *(Finding #10)*
[`shopify route`](../src/app/api/webhooks/shopify/route.ts) (~line 228) upserts `where: { id: email }`,
a global id. Two orgs sharing a customer email collide. Scope by `(email, organizationId)` (add a
compound unique) and stop using email as the primary key.

### 2.3 — Constant-time Razorpay signature compare  *(Finding #11)*
[`razorpay webhook`](../src/features/webhooks/api/razorpay/route.ts) (~line 22) uses `signature !== expected`.
Switch to `crypto.timingSafeEqual` (with a length guard), matching the WhatsApp helper.

### 2.4 — Remove `any` casts in webhook handlers  *(Finding #12)*
Type the inbound payloads (`updateData`, `contact.attributes`, etc.) to satisfy Article IV's no-`any` rule.

### 2.5 — Confirm prod overrides the default verify token  *(Finding #13)*
`WHATSAPP_WEBHOOK_VERIFY_TOKEN` defaults to `wappflow_verify_2026` in `.env.example`. Ensure each
environment sets a unique, secret value; document it in the deploy runbook.

---

## Cross-cutting verification (run after every phase)

Per Constitution Article IV, a change is **not done** until all pass:

```bash
npx prisma validate
npx tsc --noEmit
SKIP_ENV_VALIDATION=1 npx next build
```

Plus targeted manual checks:
- **Webhooks:** unsigned/forged POST → `401`; correctly-signed payload → processed. Verify Meta and
  Shopify live deliveries still succeed in staging.
- **Debug routes:** return `404`.
- **OTP:** lockout after 5 wrong tries; `429` after the per-phone send cap.
- **Authz:** unauthenticated/other-org access to the (now-authenticated) Shopify sync and partner
  route → `401/403`.

---

## Suggested sequencing & ownership

| Phase | Items | Suggested agent | Est. |
|-------|-------|-----------------|------|
| 0 | 0.1, 0.2, 0.3 | `api-architect` + `tenancy-security-auditor` review | ~half day |
| 1 | 1.1–1.5 (1.2 needs `prisma-steward` for the migration) | `api-architect`, `prisma-steward` | ~1–2 days |
| 2 | 2.1–2.5 | `api-architect` | backlog |

Run [`tenancy-security-auditor`](../.claude/agents/tenancy-security-auditor.md) on the webhook and
auth routes after Phase 0, and the [`verification-gatekeeper`](../.claude/agents/verification-gatekeeper.md)
before each merge.

---

## Pre-merge checklist (per PR)

```
[ ] Fix matches the finding and its phase in this plan
[ ] Route authenticates + authorizes with correct min role (Article III)
[ ] Webhook signatures verified with timingSafeEqual; reject on missing/invalid
[ ] No new `any` / ts-ignore / eslint-disable (Article IV)
[ ] Schema change generated + indexed if applicable (Article V) — e.g. OTP attempts column
[ ] prisma validate · tsc --noEmit · next build all pass (Article IV)
[ ] Manual verification for the finding completed
[ ] This plan's status table updated
```
