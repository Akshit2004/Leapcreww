# WappFlow vs AiSensy — Feature Comparison & Build Plan

> Goal: Ship a WhatsApp engagement platform that is **at parity with AiSensy on the table-stakes** and **clearly better on 4–5 wedges** (AI, commerce, pricing transparency, UX).
> This document is a working build spec. Each gap is written as a **task** with: what it is, why it matters, the exact code/schema touchpoints in this repo, and a rough effort size.
>
> Effort key: **S** = ≤1 day · **M** = 2–4 days · **L** = 1–2 weeks · **XL** = 3+ weeks
> Priority key: **P0** = parity blocker (AiSensy has it, buyers expect it) · **P1** = strong differentiator · **P2** = nice-to-have

---

## 0. TL;DR — Where we stand

WappFlow is already a **surprisingly complete AiSensy clone**. The core loop (WhatsApp Cloud API send/receive → broadcasts → templates → CRM → visual chatbot → team inbox → analytics → commerce + payments) is genuinely built, not stubbed. Real Meta Graph API integration exists in `src/shared/lib/whatsapp.ts`, with a sandbox fallback for demos.

**What we already beat AiSensy on (keep pushing):**
- **AI depth** — AI Copilot, AI flow architect (Groq/Llama), AI template compliance auditor, brand-aware generation. AiSensy's AI is thinner.
- **Native commerce** — full Product/Cart/Order/Razorpay checkout + Meta Catalog. AiSensy mostly *links* catalogs; we *transact*.
- **UX/design** — Swiss-editorial, opinionated, fast. AiSensy looks like generic SaaS.

**Where AiSensy beats us today (the gap list):**
1. Click-to-WhatsApp **Ads** manager (their #1 lead-gen wedge) — we have nothing.
2. **WhatsApp Flows / Forms** (native lead-capture forms) — we have chatbot nodes but not Meta Flows.
3. **Drip / sequence / journey automation** over time — we have single broadcasts + reactive bot only.
4. **Smart audience segmentation** (saved filters, custom attributes) — we have flat tags only.
5. **Roles & multi-agent routing** in the inbox — schema has roles, inbox doesn't enforce/route.
6. **White-label / partner / agency** reselling — entirely absent.
7. **Zapier / native CRM integrations** (HubSpot, Salesforce, WooCommerce, Sheets) — only Shopify exists.
8. **Public Project API + webhooks** for customers to build on — internal only today.
9. **Conversation-based billing & per-message cost ledger** — wallet exists, WhatsApp cost accounting doesn't.

---

## 1. Current WappFlow feature inventory (what's there)

Mapped to the actual code so you know the starting line.

| Area | Status | Where it lives |
|---|---|---|
| WhatsApp Cloud API send (text, media, template, interactive buttons, list, catalog, product) | ✅ Real | `src/shared/lib/whatsapp.ts` |
| Embedded Signup fields (WABA id, phone id, business id, catalog id) | ✅ Schema + connect flow | `prisma/schema.prisma` (Organization), `src/features/settings/api/connect` |
| Inbound webhook processing → bot flow or AI autoresponder | ✅ Real | `src/features/webhooks/api/whatsapp/process/route.ts` |
| Broadcast campaigns (template + 24h session), scheduling, media, variables, anti-spam delay | ✅ Real | `src/features/campaigns/*`, `api/cron/process-broadcasts` |
| Campaign funnel analytics (sent→delivered→read→clicked) | ✅ Real | `Campaign` model, `CampaignReportDrawer.tsx` |
| Meta template builder + AI compliance auditor + status polling | ✅ Real | `src/features/templates/*`, `api/ai/generate-template`, `optimize-template` |
| Template library (shareable across orgs) | ✅ | `Template.isShared`, `bulk-create-library` |
| CRM contacts, tags, status, source, bulk tag, CSV import | ✅ | `src/features/customers/*`, `inbox/api/contacts/import` |
| Team Inbox (live chat, per-contact threads, unread counts) | ✅ | `src/features/inbox/*` |
| Visual drag-drop chatbot builder (trigger/message/question/delay nodes, routes) | ✅ Real | `src/features/chatbot/*`, `ChatbotNode` model |
| AI autoresponder ("Pure AI mode") | ✅ | `src/shared/lib/autoresponder.ts`, `groq.ts` |
| AI Copilot sidebar | ✅ | `src/features/ai/components/AICopilotSidebar.tsx` |
| Commerce: products, cart, orders, Meta Catalog sync | ✅ Real | `Product/Cart/Order` models, `src/features/marketplace/*`, `lib/meta-catalog.ts` |
| Payments: Razorpay checkout + webhook | ✅ Real | `lib/razorpay.ts`, `api/webhooks/razorpay`, `wallet/topup` |
| Wallet / credits | ✅ Balance only | `Organization.walletBalance`, `WalletTopupModal` |
| Shopify integration (OAuth + webhook) | ✅ Real | `src/app/api/shopify/*`, `src/app/api/webhooks/shopify` (HMAC-verified), `org/[orgId]/integrations/shopify/sync` |
| Multi-tenant orgs + memberships + roles (OWNER/ADMIN/AGENT) | ✅ Schema | `Organization`, `Membership`, `Role` |
| Auth (NextAuth + WhatsApp OTP login) | ✅ | `src/features/auth/*`, `WhatsAppLoginAttempt` |
| Analytics dashboard, ROI ledger, agent metrics, chatbot analytics | ✅ Partial | `src/features/analytics/*`, `api/org/[orgId]/analytics/*`, `ChatbotAnalytics` |
| System activity log | ✅ | `SystemLog` model, `FlowJournalStream` |
| Onboarding wizard | ✅ | `ChecklistWizard.tsx`, `dashboard/api/onboarding` |
| File uploads | ✅ | UploadThing (`lib/uploadthing.ts`) |

---

## 2. AiSensy feature set (the benchmark)

From aisensy.com (BSP, 210k+ businesses, 68 countries):

- **Broadcasting** — template messages to lakhs of contacts, scheduling up to 2 months ahead across timezones.
- **Smart audience segmentation** — saved filters on tags/campaigns/attributes, no re-upload of Excel.
- **Drag-drop chatbots** + **Dialogflow** one-click connect.
- **WhatsApp Flows** — native catalog/conversational flow builder.
- **WhatsApp Forms** — capture leads/feedback/payments natively in chat.
- **Custom attributes** (5 on free) + **tags** (10 on free).
- **Click-to-WhatsApp Ads** — create FB/IG ads + **AI Ad Creative Generator** + AI audience targeting.
- **Retargeting** — track read/replied/clicked, retarget for higher ROAS.
- **Multi-agent Team Inbox** — same number, smart agent routing by tag/campaign/attribute.
- **AI Agent** — human-like support agents on WhatsApp.
- **WhatsApp Commerce** — catalog + WhatsApp Pay.
- **Payments** — connect gateway, collect in chat.
- **Integrations** — Shopify, WooCommerce, HubSpot, Salesforce, Zapier, payment portals, custom CRM.
- **Project API + Webhooks** — build on top of the platform.
- **White-label / Partner** — resell under own brand, logo, sub-domain.
- **Real-time analytics** — delivered/read rates.
- **Pricing** — Free-forever (API + dashboard, 10 tags, 5 attributes, $1 credit), Basic ~$45/mo, Pro ~$99/mo; per-template message billing.

Sources: [aisensy.com](https://aisensy.com/), [Features](https://aisensy.com/features), [Chatbot Flow Builder](https://aisensy.com/features/chatbot-flow-builder), [Ads that Click to WhatsApp](https://aisensy.com/features/ads-that-click-to-whatsapp), [WhatsApp Payments](https://aisensy.com/features/whatsapp-payments), [Partner](https://aisensy.com/partner), [Pricing](https://aisensy.com/pricing/usd), [ColdIQ review](https://coldiq.com/tools/aisensy).

---

## 3. Parity matrix

| Capability | AiSensy | WappFlow | Verdict |
|---|:---:|:---:|---|
| WhatsApp Cloud API send/receive | ✅ | ✅ | **Par** |
| Template broadcasts + scheduling | ✅ | ✅ | **Par** |
| Timezone-aware + 2-month-ahead scheduling | ✅ | ⚠️ basic `scheduledAt` | Gap (T-11) |
| Smart audience segmentation (saved filters) | ✅ | ❌ flat tags | **Missing (T-04)** |
| Custom attributes on contacts | ✅ | ❌ | **Missing (T-04)** |
| Drag-drop chatbot | ✅ | ✅ | **Par (we're better)** |
| WhatsApp Flows (Meta native) | ✅ | ❌ | **Missing (T-02)** |
| WhatsApp Forms / lead forms | ✅ | ❌ | **Missing (T-02)** |
| Drip / sequence / journey automation | ✅ | ❌ | **Missing (T-03)** |
| Click-to-WhatsApp Ads manager | ✅ | ❌ | **Missing (T-01)** |
| AI ad creative generator | ✅ | ❌ | Missing (T-01) — *easy win for us, we have AI* |
| Retargeting from click data | ✅ | ⚠️ click tracked, no retarget action | Gap (T-01) |
| Multi-agent inbox + routing | ✅ | ⚠️ inbox yes, routing no | **Partial (T-05)** |
| Roles enforced (Owner/Admin/Agent) | ✅ | ⚠️ schema only | **Partial (T-05)** |
| AI support agent | ✅ | ✅ autoresponder | **Par (we're better)** |
| WhatsApp commerce / catalog | ✅ | ✅ | **Par** |
| In-chat payments | ✅ WA Pay | ✅ Razorpay | **Par (we transact more)** |
| Shopify | ✅ | ✅ | **Par** |
| WooCommerce / HubSpot / Salesforce / Sheets | ✅ | ❌ | **Missing (T-07)** |
| Zapier / Make | ✅ | ❌ | **Missing (T-07)** |
| Public Project API + webhooks | ✅ | ❌ | **Missing (T-08)** |
| White-label / partner / agency | ✅ | ❌ | **Missing (T-09)** |
| Conversation-based billing + cost ledger | ✅ | ⚠️ wallet only | **Partial (T-06)** |
| AI everything (copilot, audit, brand) | ⚠️ thin | ✅ deep | **We win** |
| Design / UX | ⚠️ generic | ✅ opinionated | **We win** |

---

## 4. Gap-closing tasks (parity work)

### T-01 — Click-to-WhatsApp Ads Manager `P0` `XL`
**What:** Let users create FB/IG "Click to WhatsApp" ads, pick the welcome message/flow, and see leads land in the inbox tagged by ad. Add an **AI Ad Creative Generator** (headline, primary text, image prompt) using the existing Groq pipeline.
**Why:** This is AiSensy's headline lead-gen wedge. Without it we lose the "grow my audience" buyer entirely.
**Build:**
- New `Ad` + `AdCampaign` models (objective, budget, creative, status, `ctwaClid`, linked welcome template/flow).
- Meta Marketing API integration (`act_<id>/ads`, `adcreatives`) — new `src/shared/lib/meta-ads.ts`. Reuse the system-user token pattern from `whatsapp.ts:getWhatsAppConfig`.
- Webhook already receives `referral.source_id` on CTWA leads → tag contact with ad id in `webhooks/api/whatsapp/process/route.ts`.
- AI creative gen route under `src/features/ai/api/generate-ad/route.ts` (mirror `generate-template`).
- New tab `src/features/ads/` + sidebar entry.
**Note:** Meta Marketing API requires `ads_management` permission + App Review. Phase the AI creative generator first (ships day 1), live ad publishing second.

### T-02 — WhatsApp Flows & Forms `P0` `L`
**What:** Native Meta **WhatsApp Flows** (multi-screen forms inside chat) for lead capture, appointment booking, feedback, surveys. Build a simple Flow JSON builder and attach Flows to templates/bot nodes.
**Why:** Forms are a core AiSensy module; our chatbot "question" nodes are free-text, not structured native forms (worse completion + no data schema).
**Build:**
- New `Flow` model (name, flowJson, metaFlowId, status, category).
- Meta Flows API (`/<waba>/flows`, publish, send via template/interactive). Extend `whatsapp.ts` message types with `flow`.
- Builder UI reuses the chatbot canvas patterns from `ChatbotTab.tsx`.
- Capture flow responses in webhook → write to contact custom attributes (depends on T-04).

### T-03 — Drip / Sequence / Journey Automation `P0` `L`
**What:** Time-based multi-step automations: "Day 0 welcome → Day 2 offer → Day 5 if no reply, nudge." Triggered by tag added, form submit, ad click, cart abandon, or signup.
**Why:** Today we only have *single* broadcasts + *reactive* bot. AiSensy does scheduled sequences. This is the retention engine.
**Build:**
- New models: `Sequence`, `SequenceStep` (delay, template/message, conditions), `SequenceEnrollment` (contactId, currentStep, nextRunAt, status).
- Reuse the cron pattern in `api/cron/process-broadcasts/route.ts` → add `api/cron/process-sequences` that wakes enrollments where `nextRunAt <= now`.
- Trigger hooks: on tag add (`customers`), on order/cart events (`webhooks/razorpay`, marketplace), on CTWA click (T-01).
- UI: new "Automations" section (can live under Campaigns or its own tab).

### T-04 — Smart Segments + Custom Attributes `P0` `M`
**What:** Add arbitrary **custom attributes** (key/value) to contacts, and **saved segments** (named filter sets: tag IN, attribute =, last-active within N days, source, status). Broadcasts/sequences target a segment instead of a single tag.
**Why:** `Campaign.targetTag` is a single string today — too blunt. Segmentation is explicitly an AiSensy feature and underpins T-01/T-03.
**Build:**
- `Contact.attributes Json?` (already have `tags String[]`). Add `lastActiveAt DateTime?`.
- New `Segment` model (name, rules Json). A small rules evaluator in `src/shared/lib/segments.ts` → Prisma `where` builder.
- Update broadcast send (`campaigns/api/campaign`) + sequence enrollment to accept `segmentId`.
- UI: segment builder in Customers tab; segment picker replaces tag dropdown in Campaigns.

### T-05 — Multi-Agent Routing + Role Enforcement `P1` `M`
**What:** Assign chats to agents, auto-route by segment/tag/round-robin, enforce OWNER/ADMIN/AGENT permissions (agents see only assigned chats; admins manage settings/billing).
**Why:** `Membership.role` and `Contact.assignedAgent` exist but nothing enforces or routes. Multi-agent routing is a named AiSensy capability.
**Build:**
- Middleware/guard helper `src/shared/lib/authz.ts` checking membership role per org.
- Routing rules model `RoutingRule` (condition → agent/team). Apply in inbound webhook + on contact create.
- Inbox UI: assignment dropdown, "My chats / Unassigned / All" filters, presence. Files: `src/features/inbox/*`.
- Add `AGENT`-scoped queries everywhere contacts/messages are read.

### T-06 — Conversation Billing & Cost Ledger `P1` `M`
**What:** Track WhatsApp conversation/message **cost** per org, debit `walletBalance`, expose a usage ledger and low-balance alerts. Map Meta's per-message pricing (marketing/utility/auth/service categories).
**Why:** We have a wallet but no metering. AiSensy bills per-template-message; buyers want cost transparency. Also prevents us eating Meta costs.
**Build:**
- New `UsageEvent` model (orgId, type, category, units, costMinor, campaignId, createdAt).
- On every send in `whatsapp.ts` success path → write a `UsageEvent` + atomic wallet debit.
- Pricing table `src/shared/lib/wa-pricing.ts` (per-country per-category rates).
- UI: billing/usage page; low-balance banner; block sends when balance < cost.

### T-07 — Integrations Hub (WooCommerce, HubSpot, Salesforce, Sheets, Zapier) `P1` `L`
**What:** Expand beyond Shopify. Priority order: **Zapier/Make** (unlocks 1000s of apps cheaply) → **Google Sheets** → **WooCommerce** → **HubSpot/Salesforce**.
**Why:** AiSensy lists all of these. Integrations are the moat that keeps SMBs from churning.
**Build:**
- `Integration` model already generic (`id`, `apiKey`, `webhookUrl`). Add per-provider connectors under `src/features/integrations/connectors/`.
- **Zapier** is highest ROI: just need stable public webhooks + the Project API (T-08), then publish a Zapier app. Triggers (new lead, order, reply) + actions (send template, add tag).
- Google Sheets: OAuth + append/read for contact sync.
- WooCommerce: REST API key + order/abandoned-cart webhooks (mirror Shopify flow).

### T-08 — Public Project API + Webhooks `P1` `M`
**What:** Per-org **API keys** + documented REST endpoints (send message, send template, create/lookup contact, add tag, get campaign status) and **outbound webhooks** (message received, status update, order placed).
**Why:** AiSensy ships "Project API". Developers/agencies need it; it also powers T-07 (Zapier) and partner builds.
**Build:**
- `ApiKey` model (orgId, hashedKey, scopes, lastUsedAt).
- API namespace `src/app/api/v1/*` with bearer-key auth middleware (separate from NextAuth session auth).
- `WebhookSubscription` model + a dispatcher that fans out events (reuse `SystemLog` event points).
- Rate limiting + OpenAPI doc page.

### T-09 — White-Label / Partner / Agency Mode `P2` `L`
**What:** Let agencies resell under their brand: custom logo, sub-domain/custom domain, manage multiple client workspaces, partner-level markup on conversation pricing, partner dashboard.
**Why:** AiSensy's `/partner` program is a major revenue channel. We're multi-tenant already, so the lift is mostly branding + a parent-org layer.
**Build:**
- `Partner` model (brand assets, domain, pricing markup) → `Organization.partnerId?`.
- Theme/branding from partner config (logo, colors) — the design system is centralized, so swap the `WF` mark + `bg-[#fafaf9]` tokens via config.
- Partner dashboard: list client orgs, aggregate usage/revenue.
- Custom domain routing (Vercel domains API / wildcard).

### T-10 — Dialogflow / External NLU Connect `P2` `S`
**What:** One-click connect an external NLU (Dialogflow/Rasa) as the brain instead of/alongside the built-in Groq autoresponder.
**Why:** Listed by AiSensy; cheap to add given our autoresponder is already pluggable in `autoresponder.ts`.
**Build:** Add a provider switch in chatbot settings → route webhook text to Dialogflow detectIntent when configured.

### T-11 — Scheduling polish `P2` `S`
**What:** Timezone-aware scheduling, "send up to 2 months ahead", recurring broadcasts, best-time send.
**Why:** AiSensy explicitly markets 2-month + timezone scheduling. We have a basic `scheduledAt`.
**Build:** Add `timezone` + `recurrence` to `Campaign`; respect in `process-broadcasts` cron.

---

## 5. Differentiators — how we beat AiSensy (not just match)

These are where we should spend the *extra* energy, because parity alone = "another AiSensy."

### D-01 — AI-Native everything `P1` `M` *(extends our existing lead)*
We already have Copilot + compliance auditor + brand profile. Push further:
- **AI Campaign Strategist** — "It's Diwali, I sell sarees" → drafts the template, segment, schedule, and a 3-step sequence, ready to launch.
- **AI Reply Suggestions** in the team inbox (agent assist) — drafts replies grounded in past chats + catalog.
- **AI Analytics narrator** — plain-English "why did this campaign underperform" on the analytics page.
- **AI ad creative generator** (also serves T-01).
All reuse `lib/groq.ts`; swap to a stronger model where quality matters.

### D-02 — Transparent, predictable pricing `P1` `S`
AiSensy's per-message + plan tiers confuse SMBs. Ship a **live cost calculator** and a **real-time spend meter** (builds on T-06). "You'll spend ₹X for this broadcast" before they hit send. Trust = conversion.

### D-03 — Deep commerce (we already transact) `P1` `M`
AiSensy mostly *links* catalogs. We have cart→order→Razorpay. Extend:
- **Abandoned cart recovery sequence** (ties T-03 + existing `Cart`).
- **Order status automations** (shipped/delivered → WhatsApp update).
- **WhatsApp-native re-order** ("buy again") flows.
This makes us the pick for D2C/e-com specifically.

### D-04 — Conversion-first analytics `P1` `M`
Go past delivered/read. Tie revenue to messages: **revenue per campaign**, **per-sequence ROI**, **agent-attributed sales** (we have `roi-ledger` + `agent-metrics` started). AiSensy shows engagement; we show **money**.

### D-05 — Onboarding & time-to-first-broadcast `P2` `S`
We have a `ChecklistWizard`. Make "connect number → import contacts → send first broadcast" a sub-10-minute guided path with a sandbox that sends to the user's own number first. Lowest-friction onboarding wins SMB.

### D-06 — Vertical templates packs `P2` `S`
Ship curated, pre-approved-style **template + flow + sequence bundles** per industry (D2C, clinics, real estate, education, restaurants). We already have a shareable template library (`Template.isShared`) — extend to bundles. Instant value, hard for users to leave.

---

## 6. Suggested phased roadmap

**Phase 1 — Close the bleeding parity gaps (≈4–6 wks)**
T-04 (segments/attributes) → T-03 (sequences) → T-02 (Flows/Forms) → T-06 (billing ledger).
*Rationale: these unlock each other and fix the biggest "AiSensy has it, we don't" objections. Segments first because Ads + Sequences both need it.*

**Phase 2 — Lead-gen + ecosystem (≈4–6 wks)**
T-01 (Ads + AI creative) → T-08 (Project API) → T-07 (Zapier/Sheets/WooCommerce) → T-05 (agent routing).
*Rationale: Ads brings audience growth; API+Zapier brings the integration moat.*

**Phase 3 — Differentiate & monetize (≈4–6 wks)**
D-01 (AI strategist + inbox assist) → D-03 (commerce automations) → D-04 (revenue analytics) → T-09 (white-label/partner) → D-02/D-05/D-06 polish.
*Rationale: now we stop matching AiSensy and start beating it; white-label opens the agency revenue channel.*

---

## 7. Schema changes summary (single migration view)

New models to add: `Ad`, `AdCampaign`, `Flow`, `Sequence`, `SequenceStep`, `SequenceEnrollment`, `Segment`, `RoutingRule`, `UsageEvent`, `ApiKey`, `WebhookSubscription`, `Partner`.
Field additions: `Contact.attributes Json?`, `Contact.lastActiveAt DateTime?`, `Campaign.segmentId`, `Campaign.timezone`, `Campaign.recurrence`, `Organization.partnerId?`, `Template.flowId?`, `ChatbotNode.flowId?`.

---

*Built from a read of the WappFlow codebase (Next.js 16 / Prisma / WhatsApp Cloud API / Groq) and AiSensy's public feature set. Use the task IDs (T-xx / D-xx) as your backlog tickets.*
