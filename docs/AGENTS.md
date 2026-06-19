# WappFlow Agents — Full Feature Reference

Three agents cover the full customer lifecycle on WhatsApp:
the **RTO Reduction Agent** (COD Risk Mitigation Engine),
the **Cart Recovery Agent** (Abandoned Checkout Recovery Engine), and the
**Conversion Finders** (Shade Finder + Size Finder).

---

## Agent 1 — RTO Reduction Agent

### What It Does
Intercepts Cash-on-Delivery orders the moment they are placed, scores them
for fraud risk, and runs a layered pipeline to prevent Return-to-Origin losses
before the order ever ships.

**Entry point:** Shopify webhook → `POST /api/webhooks/shopify`
or commerce webhook → `POST /api/webhooks/commerce`

---

### Feature 1 — COD Risk Scorer

**File:** `src/features/cod/services/codRiskScorer.ts`

Runs synchronously at order creation (no external API calls, zero latency).
Produces a risk score 0–10.

| Factor | Points |
|---|---|
| First-time buyer (zero prior confirmed orders) | +4 |
| Order > ₹3,000 | +5 |
| Order ₹1,500–₹3,000 | +3 |
| 5+ distinct SKUs in one COD order | +3 |
| Any single SKU qty ≥ 10 units | +2 |
| Suspicious/placeholder customer name | +1 |
| Prior RTO / cancel with THIS brand | +3 |
| Flagged by 2+ other stores in fraud network | +4 |
| Flagged by exactly 1 other store | +2 |

**Threshold:** Score ≥ 7 = HIGH RISK → triggers verification pipeline.
Max capped at 10.

---

### Feature 2 — Shopify Fulfillment Hold

**Files:** `src/features/cod/services/fulfillmentHoldService.ts`,
`src/features/integrations/connectors/shopifyAdmin.ts`

When a high-risk order is detected AND the org has `fulfillmentHoldEnabled = true`:
- Calls the Shopify Admin API to place a fulfillment hold on the order
  (`reason: "high_risk_of_fraud"`) so the warehouse cannot pack/ship it.
- Tags the Shopify order with `WF-High-Risk`.
- Stores the Shopify fulfillment order ID in `Order.fulfillmentHoldId`.

**Auto-release cron:** Every 1 hour (`/api/cron/fulfillment-hold-release`).
Orders held for > 4 hours with `codStatus` still `"pending"` are automatically
released (no merchant action required — warehouse is never blocked forever).

**Manual release:** Happens automatically when the customer pays the ₹99 token
or confirms via WhatsApp.

---

### Feature 3 — ₹99 Token Prepay (Skin-in-the-Game)

**File:** `src/features/cod/services/tokenPrepayService.ts`

For high-risk orders where an internal order ID exists:
- Creates a Razorpay payment link for exactly ₹99.
- Sends the customer a WhatsApp message:
  *"Pay ₹99 now to confirm your order. Balance ₹X to be paid at delivery.
  Token expires in 2 hours."*
- The ₹99 is deducted from the final COD amount at the door.

**Why it works:** Genuine buyers pay ₹99 without friction. Fraudsters and
impulse-cancellers vanish — which is exactly the signal needed.

**Token expiry cron:** Every 30 minutes (`/api/cron/cod-token-expire`).
Contacts with `token_prepay_pending = true` for > 2 hours have their order
auto-cancelled, fulfillment hold released, and receive a cancellation message.

**Payment confirmation:** Razorpay webhook (`POST /api/webhooks/razorpay`)
detects `order.codStatus === "pending"` → calls `confirmTokenPayment()` →
confirms the order, releases hold, sends "Token received!" message.

---

### Feature 4 — Plain YES/NO COD Verification (Fallback)

**File:** `src/features/cod/services/codService.ts`

For high-risk orders without a Razorpay-capable internal order ID, sends
the `cod_risk_verify` Meta template asking the customer to reply YES or NO.

**Inbound reply handler:** `handleCodReply()` — runs in the WhatsApp inbound
interceptor chain before the autoresponder.

- **YES / CONFIRM / HA / 1** → confirms order, tags `cod-confirmed`, stops sequences,
  sends confirmation message, offers prepaid conversion (see Feature 6).
- **NO / CANCEL / NAHI / 2** → cancels order, tags `cod-cancelled`, writes
  `cod_cancel` signal to the fraud network.

---

### Feature 5 — Address Confirmation Before Dispatch

**File:** `src/features/cod/services/addressConfirmService.ts`

Triggered by the `address_confirmation` sequence step (from the `ofd_alert`
recipe) before an order goes out for delivery:
- Sends the customer their current shipping address and asks them to confirm or
  provide a corrected one.
- On YES: marks confirmed.
- On corrected text reply: calls `updateOrderShippingAddress()` via
  `shopifyAdmin.ts` to write the new address back to the Shopify order (Admin
  API PUT). No warehouse error, no failed delivery.

---

### Feature 6 — COD → Prepaid Conversion (₹50 Discount Offer)

**File:** `src/features/cod/services/codService.ts` → `offerPrepaidConversion()`

After a customer confirms their COD order (YES reply):
- Automatically creates a Razorpay payment link for `total – ₹50`.
- Sends: *"Pay online and save ₹50! Pay ₹X instead of ₹Y: [link]"*
  (expires 2 hours).
- On payment: Razorpay webhook flips order to `paymentStatus: paid`, tags
  `cod-converted-prepaid`, logs a `prepaid_conversion` success-fee event.

---

### Feature 7 — NDR Rescue Pipeline

**File:** `src/features/ndr/services/ndrService.ts`

Triggered when a courier posts a Non-Delivery Report (NDR) via
`POST /api/ndr/webhook` or the Shiprocket connector.

**First attempt:** Enrolls the contact in the `ndr_recovery` drip sequence.
The customer receives options via WhatsApp:
1. **CONFIRM / YES / 1** — courier re-attempts delivery in 24–48h.
2. **RESCHEDULE / 2** — collects preferred date string from next message.
3. **ADDRESS / 3** — collects corrected address from next message.
4. **CANCEL / 4** — closes the NDR as cancelled.

Natural-language / Hinglish replies (e.g. "kal aao") are classified by Groq
(llama-3.1-8b-instant) before falling through to keyword matching.

**Second attempt (attempt ≥ 2):**
- Skips drip sequence entirely.
- Escalates directly to a human agent (`assignedAgent = "Human"`).
- Sends `ndr_alert_attempt2` template directly.
- Writes `ndr_2plus` signal to the shared fraud network.

---

### Feature 8 — Exact-Amount Dispatch Reminder (OFD Alert)

**File:** `src/features/sequences/services/sequenceService.ts`

The `ofd_alert` sequence step (Out For Delivery) injects the exact COD cash
amount into the template variable `{{2}}`:

> *"Your order #X is out for delivery today! Please keep ₹1,450 ready for
> the delivery agent."*

Amount is read from `contact.attributes.pending_cod_order_total` (set at
order creation). Eliminates the #1 reason for failed deliveries:
*"I didn't have the exact change."*

---

### Feature 9 — Shared RTO Fraud Network (The Moat)

**File:** `src/features/cod/services/networkSignalService.ts`

**Schema:** `NetworkSignal` table — `phoneHash` (sha256 — never raw PII),
`signal`, `organizationId`, `category`, `createdAt`.

Every brand contributes anonymized signals when:

| Event | Signal written |
|---|---|
| Customer ghosts ₹99 token for 2h | `token_unpaid` |
| Customer cancels COD via WhatsApp | `cod_cancel` |
| 2nd+ NDR attempt (persistent non-delivery) | `ndr_2plus` |
| Shiprocket reports "RTO INITIATED" | `rto` |

**Read at order scoring time:**
- `getNetworkRiskCounts(phone, orgId)` — returns `ownCount` (this brand's prior
  signals for this phone) and `networkCount` (signals from other brands).
- `getBrandHistoricalRtoCount(orgId, contactId)` — reads existing operational
  records (cancelled orders + NDR events) so own-history scoring works from day
  one, before the network table has any data.

**Network effect:** A serial RTO offender who RTOs at Store A gets +4 risk
score at Store B on their very first order there — without Store B ever having
seen them before. No raw phone number is ever stored or shared cross-merchant.

---

### Feature 10 — Success Fee Metering

**File:** `src/features/billing/services/successFeeService.ts`

Records `UsageEvent` rows (costMinor=0) for every billable outcome:

| Outcome | Fee |
|---|---|
| COD order confirmed via WhatsApp | ₹10 / event |
| COD → Prepaid conversion | ₹15 / event |
| NDR resolved (confirmed / rescheduled / address updated) | ₹10 / event |

`getSuccessFeeSummary(orgId)` aggregates the current calendar month for
the merchant-facing billing view.

---

### Feature 11 — Silent Watcher Dashboard

**Route:** `GET /api/org/[orgId]/analytics/silent-watcher`

Returns pre-WhatsApp audit data so merchants can see how much RTO loss they
already have *before* activating the pipeline. Surfaces:
- High-risk COD contacts flagged
- Total COD orders
- Estimated RTO loss value (pending COD orders)
- WhatsApp connected status

This is the "Aha! moment" that converts prospects: "WappFlow detected 14 risky
orders and ₹38,000 of potential RTO — without doing anything yet."

---

### Cron Jobs (vercel.json)

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/cod-token-expire` | Every 30 min | Auto-cancel unpaid ₹99 tokens + release holds |
| `/api/cron/fulfillment-hold-release` | Every hour | Release Shopify holds older than 4h |

---

### Data Flow Summary (COD Order Created)

```
Shopify webhook received
  └─ save Order to DB
  └─ getNetworkRiskCounts(phone) + getBrandHistoricalRtoCount(contactId)
  └─ scoreCodOrder() → score 0–10
       score ≥ 7 (HIGH RISK)?
         YES ─── place Shopify fulfillment hold (if enabled)
               └─ send ₹99 token prepay request (if internal order ID exists)
                    ├─ Customer pays → confirmTokenPayment() → release hold
                    └─ 2h timeout → autoExpireUnpaidTokenOrders() → cancel + release hold
         NO  ─── enroll in cod_order_placed drip sequence (standard confirm flow)
  └─ record fraud network signals on cancel / RTO / token ghost
```

---
---

## Agent 2 — Cart Recovery Agent

### What It Does
Detects abandoned checkouts, sends a multi-touch WhatsApp drip, analyses
inbound replies with AI to detect buyer intent, and closes the sale —
either by sending a discount code or escalating to a human.

**Entry point:**
- Shopify `checkouts/create` webhook → stamps `cart_abandoned_at` on contact
- Cron `process-sequences` (every minute) → `sweepAbandonedCarts(60)` → enrols
  contacts who have been idle > 60 minutes

---

### Feature 1 — Abandoned Cart Detection

**File:** `src/features/sequences/services/sequenceService.ts` →
`sweepAbandonedCarts()`

Every minute, finds contacts with:
- `attributes.cart_abandoned_at` set
- `attributes.cart_recovered_at` NOT set
- Last abandoned-cart enrollment > 1 hour ago

Enrols them in the `cart_abandoned` trigger sequence and stamps
`cart_recovery_started = true`.

---

### Feature 2 — 12-Variant Template Drip (3 Touches)

**File:** `src/features/sequences/services/cartRecoveryTemplateSelector.ts`

Deterministically selects one of 12 template variants based on:
- **Order value tier:** `highvalue` (> ₹3,000) | `standard`
- **Buyer history:** `new` | `repeat`
- **Touch number:** 1 (image nudge, 30 min) | 2 (social proof, 2h) | 3 (incentive, 24h)

**Touch 1 variants (image header — visual hook):**
`cr_t1_new`, `cr_t1_repeat`, `cr_t1_highvalue`, `cr_t1_generic`

**Touch 2 variants (social proof — urgency):**
`cr_t2_proof`, `cr_t2_scarcity`, `cr_t2_fit`

**Touch 3 variants (incentive — discount / final push):**
`cr_t3_discount`, `cr_t3_escalate`, `cr_t3_hold`, `cr_t3_size`, `cr_t3_cold`

Template variables filled at send time:
- `{{1}}` = customer name
- `{{2}}` = product name (Groq-enriched one-liner for personalisation)
- `{{3}}` = checkout URL

---

### Feature 3 — AI Objection Analyst (Groq)

**File:** `src/features/sequences/services/cartRecoveryAgent.ts`

Every WhatsApp reply from a contact in active cart recovery is processed by
a two-step AI pipeline (llama-3.1-70b-versatile, fast path to 8b-instant):

**Step 1 — Analyst:** Classifies intent and objection type.

| Intent | Meaning |
|---|---|
| `hot` | Ready to buy — just needs the checkout link |
| `objection` | Has a specific concern (see objection types below) |
| `not_now` | Not ready yet — nurture |
| `dead` | Unrecoverable — cancel enrollment |

| Objection type | Trigger phrase examples |
|---|---|
| `price` | "too expensive", "costly" |
| `shipping` | "delivery charges", "free delivery?" |
| `fit` | "will it fit?", "what size?" |
| `stock` | "out of stock?", "available?" |
| `thinking` | "let me think", "checking" |
| `cod_payment` | "COD available?", "cash on delivery?" |

**Step 2 — Ghostwriter** (if `action = "close"`): Drafts a warm, personalised
closing message using the customer's name and product, sent immediately.

---

### Feature 4 — Deterministic Objection Closer

**File:** `src/features/sequences/services/cartRecoveryAgent.ts` →
`runObjectionCloser()`

AI identifies the objection type; the closer responds deterministically
(no AI involved in the decision):

| Objection | Response |
|---|---|
| `price` | Fetches `org.cartRecoveryDiscountCode`, sends the discount code with the checkout link |
| `shipping` | Same — frames it as "free shipping" if a code exists |
| `cod_payment` | Confirms COD is available + sends checkout link directly |
| `fit` / `stock` | Sets `assignedAgent = "Human"`, increments `unreadCount`, logs escalation — human takes over |

This keeps AI out of discount and payment decisions (deterministic + auditable)
while using AI only for intent classification where it actually adds value.

---

### Feature 5 — Cart Discount Resolution

**File:** `src/features/sequences/services/cartDiscountService.ts`

`resolveCartDiscount(orgId)` reads `org.cartRecoveryDiscountCode`:
- If a static code is stored → returns it directly
- Falls back to a sensible default message if none is configured

Discount codes are set by the merchant in org settings and never generated
on-the-fly (no Shopify Discounts API dependency).

---

### Feature 6 — Recovery Confirmation & Enrollment Cleanup

**File:** `src/features/sequences/services/sequenceService.ts` →
`markCartRecovered()`

Called when a Razorpay payment goes through on an order that had an abandoned
cart:
- Sets `cart_recovered_at` on the contact.
- Completes all active `cart_abandoned` sequence enrollments.
- Stops the drip — no more messages once the cart is recovered.

Also triggered if the customer manually completes checkout (Shopify
`orders/create` webhook stamps `cart_recovered_at`).

---

### Feature 7 — Cart Recovery Analytics

**Route:** `GET /api/org/[orgId]/analytics/cart-recovery`
**File:** `src/features/analytics/services/cartRecoveryAnalyticsService.ts`

Surfaces in the Analytics → Recovery tab:

| Metric | Source |
|---|---|
| In recovery | Enrollments with `status = "active"` |
| Recovered | Enrollments completed after `cart_recovered_at` set |
| Lost | Enrollments completed without recovery |
| Recovery rate % | recovered / (recovered + lost) |
| Replies handled | AI analysis count |
| Recovered revenue | Sum of recovered contact `cart_total` attributes |
| Intent breakdown | Count per `IntentLabel` |
| Recent AI replies | Last 20 analysed contacts with objection + action |

---

### Data Flow Summary (Abandoned Cart)

```
Shopify checkout/create webhook
  └─ stamps contact.attributes.cart_abandoned_at + cart_total + checkout_url

Cron: process-sequences (every minute)
  └─ sweepAbandonedCarts(60)
       └─ enrols contact in cart_abandoned sequence
  └─ processDueEnrollments()
       └─ Touch 1 (30 min): selectCartRecoveryTemplate(touch=1) → send image nudge
       └─ Touch 2 (2h):     selectCartRecoveryTemplate(touch=2) → send social proof
       └─ Touch 3 (24h):    selectCartRecoveryTemplate(touch=3) → send incentive

Customer replies via WhatsApp
  └─ whatsappInboundService → handleCartRecoveryReply()
       └─ Groq Analyst → intent + objection
       ├─ intent=hot → Ghostwriter → warm close message
       ├─ intent=objection, price/shipping → send discount code
       ├─ intent=objection, cod_payment → confirm COD + checkout link
       ├─ intent=objection, fit/stock → escalate to human agent
       ├─ intent=not_now → nurture (continue drip)
       └─ intent=dead → cancel enrollment

Customer completes order
  └─ markCartRecovered() → stop drip, stamp cart_recovered_at
```

---
---

---

## Agent 3 — Conversion Finders (Shade Finder + Size Finder)

### What It Does
Two pre-purchase advisors — a **Shade Finder** for beauty/cosmetics brands and a
**Size Finder** for apparel brands — that guide customers to the right product
variant through a short tappable conversation. Both run in brand voice (Groq
writes every recommendation as the brand's own stylist/store-associate) and both
can **capture anonymous browser phone numbers** via storefront deep links.

**Entry points:**
- **Brand-triggered** — a sequence sends `size_finder_start` / `shade_finder_start`
  templates; `sequenceService` sets the initial state; customer replies land in the handler.
- **Customer-triggered** — customer texts `SHADE` / `SIZE` (e.g. via a `wa.me` storefront
  button); `handleFinderKeyword` starts the flow and captures their number in the process.

**Core files:**
- `src/features/size-shade-finder/services/sizeShadeService.ts`
- `src/features/size-shade-finder/repositories/sizeShadeRepo.ts`
- `src/app/api/org/[orgId]/finder-links/route.ts`

---

### Feature 1 — Shade Finder (Beauty / Cosmetics)

**File:** `src/features/size-shade-finder/services/sizeShadeService.ts` → `handleShadeFinderReply`

3-tap diagnostic. No forms, no number-crunching — every question is a WhatsApp
interactive reply button. The customer's product context (from the deep-link
payload) is passed to Groq so the final message names the actual product
they were looking at.

| Step | State | Question | Buttons |
|---|---|---|---|
| Q1 | `awaiting_depth` | How would you describe your skin tone? | Fair / Medium / Deep |
| Q2 | `awaiting_undertone` | Which jewellery makes your skin glow more? | Gold · Silver · Both |
| Q3 | `awaiting_finish` | What's the vibe you're going for? | Everyday / Full Glam |
| Refine (optional) | `awaiting_skintype` | How does your skin usually behave? | Oily · Dry · Combo |

**Undertone proxy:** the gold-vs-silver jewellery question replaces "look at your
veins" — Gold → warm undertone, Silver → cool, Both → neutral.

**Shade output:** a depth × undertone family (e.g. `warm + medium` → "honey /
golden-beige, NW30 family") adjusted by finish note ("matte long-wear for glam /
lightweight natural-finish for everyday").

**Groq personalisation:** the final recommendation is written by
`llama-3.1-70b-versatile` (fallback: `8b-instant`) in the brand's tone, using
`org.name`, `brandProfile.toneOfVoice`, and `aiPersona`. Falls back to a clean
static message if the API is unavailable.

**State keys stored on `contact.attributes`:**
`shade_finder_state`, `shade_finder_depth`, `shade_finder_undertone`,
`shade_finder_finish`, `shade_finder_result`, `shade_finder_product`,
`shade_finder_skintype`

---

### Feature 2 — Size Finder (Apparel)

**File:** `src/features/size-shade-finder/services/sizeShadeService.ts` → `handleSizeFinderReply`

Anchor-based sizing — no height, no weight. The customer anchors on a size they
already know fits them ("I usually wear M" / "Zara L" / "32 waist") and the
finder adjusts it for garment type and fit preference.

| Step | State | Question | Input |
|---|---|---|---|
| Q1 | `awaiting_category` | What are you shopping for? | Top · Jeans · Jacket/Ethnic |
| Q2 | `awaiting_anchor` | What size do you usually wear and love? | Free text (S/M/L, "Zara M", "32 waist") |
| Q3 | `awaiting_fit` | How do you like things to fit? | Snug · True to size · Relaxed |

**Size adjustment logic:**
- Snug → size down one; Relaxed → size up one; Outerwear/ethnic → nudge +1 further for roominess.
- Numeric waist sizes (24–48) adjusted in inches: Snug −1, Relaxed +2.
- Letter sizes walk `SIZE_ORDER`: XXS → XS → S → M → L → XL → XXL → XXXL.

**Groq personalisation:** same brand-voice pipeline as the Shade Finder — anchored
size + fit word passed to Groq; fallback to static message.

**State keys stored on `contact.attributes`:**
`size_finder_state`, `size_finder_category`, `size_finder_anchor_letter`,
`size_finder_anchor_numeric`, `size_finder_fit`, `size_finder_result`,
`size_finder_product`

---

### Feature 3 — Keyword Entry + Phone Capture

**File:** `src/features/size-shade-finder/services/sizeShadeService.ts` → `handleFinderKeyword`

When a customer messages `SHADE` / `SIZE` (or phrases like "find my shade",
"size finder") the inbound chain calls `handleFinderKeyword` **before** the
reply handlers. It:
1. Parses any product context after a colon (e.g. `SHADE: Velvet Lipstick`).
2. Sets the initial state attribute on the contact.
3. Sends Q1 as an interactive button message — no template required because the
   *customer* opened the 24-hour session window.

Because the customer sent the first message, their phone number is now in the
system as a known, opted-in contact.

Wired at: `whatsappInboundService.ts` — runs before `handleSizeFinderReply` /
`handleShadeFinderReply` in the interceptor chain.

---

### Feature 4 — Storefront Deep-Link Generator

**File:** `src/app/api/org/[orgId]/finder-links/route.ts`

`GET /api/org/[orgId]/finder-links?product=<name>` returns:

```json
{
  "number": "919876543210",
  "shade": "https://wa.me/919876543210?text=SHADE%3A+Velvet+Lipstick",
  "size":  "https://wa.me/919876543210?text=SIZE%3A+Velvet+Lipstick"
}
```

The merchant drops these URLs as "Find my shade" / "Find my size" CTA buttons
on their Shopify product pages. The `product` param is optional; omit it for a
generic keyword link.

Phone number source: prefers `PhoneNumber.isDefault`, falls back to
`WidgetConfig.phoneNumber`.

---

### Templates Required (Finders — brand-triggered path only)

| Template | Purpose |
|---|---|
| `size_finder_start` | Brand initiates the size finder (template required as first message outside 24h window) |
| `shade_finder_start` | Brand initiates the shade finder |

Both templates must contain `{{1}}` (contact name). The customer-triggered
(keyword/deep-link) path needs **no templates** — it runs entirely in free-form
session messages.

---

## Shared Infrastructure

### WhatsApp Inbound Interceptor Chain
`src/features/webhooks/services/whatsappInboundService.ts`

Every inbound WhatsApp message passes through handlers in this order:

1. NFM (native flow message) handler
2. Lead qualifier
3. **Address confirm reply** (RTO Agent)
4. **Cart recovery reply** (Cart Recovery Agent)
5. **COD reply** (RTO Agent — YES/NO confirmation)
6. **NDR reply** (RTO Agent — delivery failure rescue)
7. **Finder keyword entry** (Finders — `SHADE`/`SIZE` starts the flow)
8. **Size finder reply** (Finders — in-progress size flow)
9. **Shade finder reply** (Finders — in-progress shade flow)
10. Replenishment reminder
11. Marketplace / Appointment handlers
12. Autoresponder / Chatbot flow (fallback)

Each handler returns `true` if it consumed the message (short-circuit), `false`
to pass it down the chain.

### Required Meta Templates

The following templates must be approved in Meta Business Manager:

| Template | Agent | Purpose |
|---|---|---|
| `cod_risk_verify` | RTO | YES/NO high-risk order challenge |
| `cod_confirmation` | RTO | Order confirmed message |
| `ndr_alert` | RTO | First NDR attempt rescue |
| `ndr_alert_attempt2` | RTO | Second attempt escalation |
| `ofd_alert` | RTO | Out-for-delivery exact cash reminder |
| `rto_initiated` | RTO | RTO notification + winback |
| `cr_t1_new` through `cr_t3_cold` (12 total) | Cart | All cart recovery drip templates |
| `size_finder_start` | Finders | Brand-initiated size finder opener |
| `shade_finder_start` | Finders | Brand-initiated shade finder opener |

Use the **one-click seed** in Analytics → RTO / NDR → "Create drafts in Template
Builder" to create all RTO templates as drafts, then submit them to Meta.

### Environment Variables Required

```
CRON_SECRET          # Bearer token for all /api/cron/* routes
GROQ_API_KEY         # AI objection analysis + ghostwriter
RAZORPAY_KEY_ID      # ₹99 token prepay + COD→prepaid links
RAZORPAY_KEY_SECRET
```

Per-org configuration (set in Integrations UI):
- **Shopify** — `Integration` row with `id="shopify"`, encrypted
  `{shopDomain, accessToken}`. Required for fulfillment holds and address write-back.
- `org.fulfillmentHoldEnabled = true` — opt-in to place holds (default: false).
- `org.cartRecoveryDiscountCode` — discount code to send for price/shipping objections.
