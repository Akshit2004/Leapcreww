# LeapCreww — Feature List & Testing Guide

> Updated: 2026-06-13
> Branch: `feat/embeddable-widget`
> Source: `src/features/`, `src/app/api/`, `prisma/schema.prisma`

Features are ordered **most rich → least** for testing priority.

---

## Table of Contents

1. [Campaigns (Broadcast Engine)](#1-campaigns-broadcast-engine) ⭐ most features
2. [Chatbot Builder (Conversational AI)](#2-chatbot-builder-conversational-ai)
3. [Templates (Meta-Approved Messages)](#3-templates-meta-approved-messages)
4. [Flows (WhatsApp Interactive Forms)](#4-flows-whatsapp-interactive-forms)
5. [Sequences (Drip Automation)](#5-sequences-drip-automation)
6. [Inbox (Unified Conversations)](#6-inbox-unified-conversations)
7. [Customers / CRM](#7-customers--crm)
8. [Analytics & Attribution](#8-analytics--attribution)
9. [Ads (Click-to-WhatsApp)](#9-ads-click-to-whatsapp)
10. [Marketplace (E-Commerce)](#10-marketplace-e-commerce)
11. [Segments (Audience Builder)](#11-segments-audience-builder)
12. [Integrations Hub](#12-integrations-hub)
13. [Billing & Wallet](#13-billing--wallet)
14. [Public API & Webhooks](#14-public-api--webhooks)
15. [Launches](#15-launches)
16. [Recipes (Automation Templates)](#16-recipes-automation-templates)
17. [Use Cases / Appointment Booking](#17-use-cases--appointment-booking)
18. [NDR (Non-Delivery Reports)](#18-ndr-non-delivery-reports)
19. [Embeddable Chat Widget](#19-embeddable-chat-widget) ← current branch
20. [Settings (WhatsApp Connection)](#20-settings-whatsapp-connection)
21. [Dashboard & Onboarding](#21-dashboard--onboarding)
22. [Authentication & Accounts](#22-authentication--accounts)
23. [Partner / White-Label](#23-partner--white-label)
24. [AI Copilot & Content Generation](#24-ai-copilot--content-generation)

---

## 1. Campaigns (Broadcast Engine)

| Feature | Details |
|---|---|
| Template broadcast | Send Meta-approved templates to tagged or segmented audience |
| Session broadcast | 24-hour session free-form message (no template required) |
| Audience targeting | Target by contact tag or saved segment |
| Audience exclusion | Exclude a tag from the send list |
| Media support | Attach image, video, or document |
| Variable interpolation | Substitute contact fields into template body |
| Scheduled delivery | Future send date/time with timezone selection |
| Anti-spam delay | Configurable per-message delay interval |
| Recurrence | Daily, weekly, monthly recurring campaigns |
| Delivery funnel analytics | Sent → Delivered → Read → Clicked per campaign |
| Campaign report drawer | Visual funnel chart per campaign |
| Conversion attribution | Outbound sends stamped in AttributionTouch |

**Test checklist:**
- [ ] Create template broadcast → select tag audience → send now
- [ ] Create session broadcast → send to single contact
- [ ] Schedule campaign for future time → verify it runs
- [ ] Set anti-spam delay → verify messages space out
- [ ] Open campaign report drawer → check funnel numbers
- [ ] Create recurring daily campaign → verify `nextRunAt` is set
- [ ] Variable interpolation: `{{name}}` replaced with contact name

**Routes:** `GET/POST /api/whatsapp/campaign` · `GET/PUT/DELETE /api/whatsapp/campaign/[campaignId]` · `POST /api/cron/process-broadcasts` · `POST /api/whatsapp/session-broadcast`

---

## 2. Chatbot Builder (Conversational AI)

| Feature | Details |
|---|---|
| Visual node canvas | Figma-like pan/zoom canvas to build conversation logic |
| Node types | Trigger, Message, Question, Delay, Routing |
| Node connections | Wire nodes to define conversation paths |
| Dynamic routing | Branch on user response keywords |
| AI Flow Architect | Generate node layout from natural-language prompt (Groq) |
| Pure AI Mode (Autoresponder) | LLM responds to every message dynamically |
| Autoresponder config | AI personality, context, fallback messages |
| Mobile bottom-sheet inspector | Node inspector slides up on mobile |
| Chatbot analytics | Impressions, response rate, drop-off per node |
| Toggle chatbot on/off | `chatbotBuilderEnabled` per org |
| Agent takeover detection | Chatbot yields when takeover flag set on contact |

**Test checklist:**
- [ ] Create trigger → message → question → delay chain; save and verify in DB
- [ ] Add routing node with keyword branches → test keyword match
- [ ] AI Flow Architect: enter brief → generate nodes → canvas renders
- [ ] Toggle Pure AI Mode → send incoming message → verify Groq response
- [ ] Mobile: open canvas → tap node → inspector slides up as sheet
- [ ] View chatbot analytics per node
- [ ] Set agent takeover on contact → verify chatbot stops responding

**Routes:** `GET/POST /api/org/[orgId]/chatbot` · `POST /api/org/[orgId]/chatbot/analytics` · `GET/PUT /api/chatbot/settings` · `POST /api/ai/generate-flow`

---

## 3. Templates (Meta-Approved Messages)

| Feature | Details |
|---|---|
| Template editor | Body, header (text/image/video/document), footer, buttons |
| Template categories | Marketing, Utility, Authentication |
| Button types | Quick Reply, Call-to-Action (URL/phone), Flow trigger |
| Meta submission | Submit to Meta; track approval status |
| Approval polling | Background status check against Meta API |
| AI Compliance Auditor | Groq evaluates against Meta guidelines before submission |
| AI template generation | Generate copy from a brief |
| AI copy optimization | Improve existing template for engagement/compliance |
| Template sharing | Share across all orgs (super-admin) |
| Template sync | Pull existing approved templates from Meta into DB |
| Template deletion | Delete locally and from Meta |
| Resumable media upload | Large header files via Meta Resumable Upload API |
| Bulk library | Bulk create from template library |

**Test checklist:**
- [ ] Create Marketing template with image header + 2 quick reply buttons → submit
- [ ] Run AI Compliance Auditor → verify Groq flags/approves the template
- [ ] Generate template from brief → AI fills body
- [ ] Sync templates from Meta → existing approved templates appear
- [ ] Delete template → removed from UI and Meta
- [ ] Share template → visible in other orgs

**Routes:** `POST /api/whatsapp/create-template` · `GET /api/whatsapp/check-template-status` · `DELETE /api/whatsapp/delete-template/[templateId]` · `POST /api/whatsapp/toggle-share` · `POST /api/org/[orgId]/templates/sync` · `POST /api/whatsapp/bulk-create-library` · `POST /api/ai/generate-template` · `POST /api/whatsapp/optimize-template`

---

## 4. Flows (WhatsApp Interactive Forms)

| Feature | Details |
|---|---|
| Flow list | View all flows with draft/published status |
| Visual flow builder | Drag-and-drop form builder (screens, components, routing) |
| Meta Flow JSON editor | Raw JSON editor for advanced configuration |
| Mobile preview | Live phone mockup preview |
| Publish to Meta | Submit flow and make it live |
| Test in sandbox | Test before publishing |
| Broadcast flow | Send published flow to contact list |
| Form response capture | Store submitted data per contact (FlowResponse) |
| Contact attribute updates | Responses auto-update contact attributes |
| Flow token correlation | Token matches responses back to contacts |
| Encryption support | Org-level public/private key pair for E2E encryption |
| AI flow generation | Generate Meta Flow JSON from requirements |

**Test checklist:**
- [ ] Create flow → add screen with text input + dropdown → save
- [ ] Toggle to JSON editor → valid JSON renders
- [ ] Mobile preview → form renders in phone mockup
- [ ] Publish flow → status changes to published
- [ ] Broadcast flow to a tag audience
- [ ] Submit form response → check FlowResponse table and contact attributes
- [ ] Generate encryption keys → verify stored in org

**Routes:** `GET/POST /api/org/[orgId]/flows` · `GET/PUT /api/org/[orgId]/flows/[flowId]` · `POST /api/org/[orgId]/flows/[flowId]/publish` · `POST /api/org/[orgId]/flows/[flowId]/broadcast` · `GET /api/org/[orgId]/flows/[flowId]/responses` · `POST /api/org/[orgId]/flows/[flowId]/test` · `GET/POST /api/org/[orgId]/flows-encryption` · `POST /api/ai/generate-wa-flow`

---

## 5. Sequences (Drip Automation)

| Feature | Details |
|---|---|
| Multi-step journeys | Ordered steps with delays between each |
| Trigger types | `tag_added`, `form_submit`, `ad_click`, `cart_abandoned`, `signup` |
| Step action types | `send_template`, `send_message`, `add_tag`, `branch` |
| Delay scheduling | Per-step delay in minutes; `nextRunAt` via cron |
| Branching conditions | Conditional routing based on contact state |
| Segment enrollment gate | Only enroll contacts matching a saved segment |
| Cron processor | `/api/cron/process-sequences` runs due enrollments |
| Enrollment tracking | `SequenceEnrollment` tracks per-contact position and status |
| Sequence ROI | Revenue attributed to sequence in analytics |

**Test checklist:**
- [ ] Create sequence with `tag_added` trigger → 3 steps with delays → activate
- [ ] Add tag to contact → verify enrollment created
- [ ] Advance clock / trigger cron → step 2 executes
- [ ] Add branch step → contacts route correctly based on condition
- [ ] View sequence ROI in analytics

**Routes:** `GET/POST /api/org/[orgId]/sequences` · `POST /api/cron/process-sequences` · `GET /api/org/[orgId]/analytics/sequence-roi`

---

## 6. Inbox (Unified Conversations)

| Feature | Details |
|---|---|
| Conversation thread list | Contacts with last message, unread count, assigned agent |
| Message composer | Send text, template, or media from web UI |
| Contact detail panel | Info, tags, attributes, order history in sidebar |
| Agent takeover | Mark conversation as agent-handled |
| Canned replies | Pre-saved responses for quick insertion |
| Working hours | Set business hours; out-of-hours auto-response |
| Contact notes | Per-contact private notes |
| AI reply suggestions | 3 quick-reply suggestions per conversation (Groq) |
| Bulk CSV import | Import contacts from CSV (name, phone, email, tags) |
| Unread badge | Per-contact unread counter |

**Test checklist:**
- [ ] Send text message from composer → appears in thread
- [ ] Send media (image) → renders inline
- [ ] Create canned reply → use it from composer dropdown
- [ ] Set working hours → trigger out-of-hours → auto-response fires
- [ ] Add note to contact → note persists across sessions
- [ ] Get AI reply suggestions → pick one → send
- [ ] Import CSV → contacts appear in CRM
- [ ] Mark agent takeover → chatbot stops for that contact

**Routes:** `POST /api/org/[orgId]/contacts/import` · `GET/PUT /api/contact/[contactId]` · `GET/POST /api/org/[orgId]/canned-replies` · `GET/PUT/DELETE /api/org/[orgId]/canned-replies/[id]` · `GET/PUT /api/org/[orgId]/working-hours` · `GET/POST /api/org/[orgId]/contacts/[contactId]/notes` · `POST /api/ai/reply-suggestions`

---

## 7. Customers / CRM

| Feature | Details |
|---|---|
| Contact list | Sortable, filterable table |
| Contact fields | Name, phone, email, status, tags, last active, assigned agent, custom attributes |
| Bulk tag management | Select multiple contacts → add/remove tags |
| Add contact | Manual creation form |
| Win-back flow | Win-back modal to re-engage inactive contacts |
| Custom attributes | Key-value attributes per contact |
| Contact source tracking | How contact was acquired (ad, Shopify, CSV, webhook) |
| Shopify sync | Contacts from Shopify orders/customers |

**Test checklist:**
- [ ] Add contact manually → appears in table
- [ ] Filter by tag → correct subset shown
- [ ] Bulk tag: select 5 contacts → add tag → all updated
- [ ] Open Win-Back modal → select inactive contacts → send campaign
- [ ] View contact detail → custom attributes displayed
- [ ] Source field shows correct origin

**Components:** `CustomersTab.tsx` · `CustomersTable.tsx` · `AddCustomerModal.tsx` · `BulkAddTagModal.tsx` · `WinBackModal.tsx`

---

## 8. Analytics & Attribution

| Feature | Details |
|---|---|
| ROI ledger | Revenue vs. cost per campaign and sequence |
| Conversion attribution | Last-touch model: order stamped with last campaign/sequence |
| AttributionTouch tracking | Every outbound send creates a touch record |
| Cost simulation | Estimated WhatsApp message cost by country and category |
| Agent performance metrics | Messages sent, response rate, contacts assigned |
| Sequence ROI | Isolated ROI per automation |
| Campaign funnel charts | Sent → Delivered → Read → Clicked per campaign |
| AI Analytics Narrator | Plain-English summary of campaign performance |
| AI Campaign Strategist | Recommends next campaigns based on past data |
| Chatbot analytics | Node-level impressions, response rates, drop-off |

**Test checklist:**
- [ ] Run campaign → open ROI ledger → cost entry exists
- [ ] Contact places order after campaign touch → order attributed
- [ ] View agent performance: check per-agent stats
- [ ] Open AnalyticsTab → AI Narrator generates summary
- [ ] AI Strategist recommends next campaign

**Routes:** `GET /api/org/[orgId]/analytics/roi-ledger` · `GET /api/org/[orgId]/analytics/agent-metrics` · `GET /api/org/[orgId]/analytics/sequence-roi` · `POST /api/ai/analytics-narrator` · `POST /api/ai/campaign-strategist`

---

## 9. Ads (Click-to-WhatsApp)

| Feature | Details |
|---|---|
| Ad creative builder | Headline, primary text, image URL, welcome template |
| AI ad creative generation | Generate headline + copy from topic brief (Groq) |
| Ad campaign management | Create/manage Meta ad campaigns (objective: LEADS) |
| Budget management | Daily budget in minor currency units |
| Campaign statuses | Draft, Active, Paused, Completed |
| Lead capture | Contacts auto-created from ad click referrals |
| Ad performance metrics | Impressions, leads, spend, CTR |
| Meta API integration | Push creative and campaign to Meta Marketing API |
| Sequence enrollment trigger | `ad_click` trigger auto-enrolls lead in sequence |

**Test checklist:**
- [ ] Create ad creative → AI generates copy
- [ ] Create ad campaign → push to Meta → status = Active
- [ ] Simulate ad click referral → contact created with `sourceAdId`
- [ ] Verify `ad_click` sequence trigger fires for new lead
- [ ] View impressions and CTR in ads dashboard

**Routes:** `GET/POST /api/org/[orgId]/ads` · `GET/POST /api/org/[orgId]/ads/campaigns` · `GET/PUT /api/org/[orgId]/ads/campaigns/[campaignId]` · `POST /api/ai/generate-ad`

---

## 10. Marketplace (E-Commerce)

| Feature | Details |
|---|---|
| Product catalog | Browse with category filtering |
| Product detail page | Images, description, price, stock |
| Contact-linked cart | One persistent cart per contact |
| Add to cart | Quantity selection |
| Razorpay checkout | Redirect to Razorpay; verify signature on return |
| Order creation | Order created on payment success with attribution |
| Order status workflow | Pending → Confirmed → Processing → Shipped → Delivered / Cancelled |
| Payment status tracking | Pending → Paid → Failed → Refunded |
| Inventory tracking | Stock decremented on purchase |
| Catalog sync from Meta | Pull from Meta Commerce into local DB |
| Cart abandonment trigger | `cart_abandoned` sequence auto-fires on inactive cart |
| Stock alerts | Notifications when stock drops below threshold |
| Marketplace settings | Configure catalog, currency, payment provider |

**Test checklist:**
- [ ] Browse catalog → add item to cart → confirm cart persists for same contact
- [ ] Proceed to Razorpay → complete payment → order created
- [ ] Verify stock count decremented after purchase
- [ ] Leave cart inactive → `cart_abandoned` sequence enrolls contact
- [ ] Sync Meta catalog → products imported
- [ ] Set stock alert threshold → alert fires when stock drops

**Routes:** `GET /api/marketplace/catalog` · `GET /api/marketplace/products/[id]` · `GET/POST /api/marketplace/cart` · `POST /api/marketplace/verify-payment` · `GET/PUT /api/marketplace/settings` · `GET/POST /api/org/[orgId]/stock-alerts`

---

## 11. Segments (Audience Builder)

| Feature | Details |
|---|---|
| Rule builder | AND/OR logic with multiple rule groups |
| Rule operators | `eq`, `neq`, `contains`, `in`, `active_within_days` |
| Rule fields | Tags, status, source, custom attribute key, last active |
| Audience preview | Count matching contacts before saving |
| Saved segments | Reusable; used in campaigns, sequences, routing |
| Audience resolution | `resolveAudience()` returns matching Contact IDs |

**Test checklist:**
- [ ] Create segment: `tag = vip AND status = active` → preview count
- [ ] Save segment → use it as campaign target
- [ ] Add `active_within_days = 30` rule → count updates
- [ ] Use segment as sequence enrollment gate

**Routes:** `GET/POST /api/org/[orgId]/segments` · `GET/PUT/DELETE /api/org/[orgId]/segments/[segmentId]`

---

## 12. Integrations Hub

| Feature | Details |
|---|---|
| Shopify | OAuth connect, order/customer webhook, lead import, cart abandon |
| WooCommerce | Webhook-based order/contact sync |
| Google Sheets | Row-based contact import |
| Shiprocket | Delivery status webhook → NDR pipeline |
| Commerce generic | Generic commerce webhook handler |
| Extensible connector registry | `Connector` interface for new integrations |
| Webhook normalization | Each connector parses into standard `InboundLead` |
| API key encryption | Credentials stored encrypted |
| Webhook URL generation | Unique inbound URL per integration per org |
| Connection status UI | Visual status indicator per integration |

**Test checklist:**
- [ ] Connect Shopify via OAuth → order webhook fires → contact created
- [ ] Add Google Sheets import → contacts imported from sheet rows
- [ ] Shiprocket webhook delivers order status → NDR tab updates
- [ ] Commerce webhook: send test payload → contact/order created

**Routes:** `GET/POST /api/org/[orgId]/integrations` · `POST /api/org/[orgId]/integrations/shopify/sync` · `/api/shopify/auth` · `/api/shopify/callback` · `POST /api/webhooks/shopify` · `POST /api/webhooks/shiprocket` · `POST /api/webhooks/commerce`

---

## 13. Billing & Wallet

| Feature | Details |
|---|---|
| Wallet balance | Per-org wallet displayed in dashboard |
| Wallet top-up | Razorpay payment to add funds |
| Razorpay webhook | Auto-credit wallet on successful payment |
| Meta billing modal | Direct Meta billing management overlay |
| Pre-send balance check | `canAfford()` guard prevents sends when empty |
| Usage metering | Every outbound message logged as `UsageEvent` |
| Usage ledger | View usage events with costs by campaign/date/category |
| Per-country pricing | India, US, global default pricing tables |
| Partner markup | Partner `pricingMarkup` multiplier applied to costs |
| Message categories | Marketing, Utility, Authentication, Service (free) |

**Test checklist:**
- [ ] Top-up wallet → Razorpay completes → balance increases
- [ ] Send campaign → usage events created → deducted from wallet
- [ ] Attempt send with zero balance → blocked by `canAfford()`
- [ ] Open Meta billing modal → displays billing info
- [ ] View usage ledger → per-message cost breakdown

**Routes:** `POST /api/org/[orgId]/wallet/topup` · `GET /api/org/[orgId]/usage` · `POST /api/webhooks/razorpay`

---

## 14. Public API & Webhooks

### Public REST API (v1)

| Feature | Details |
|---|---|
| Bearer token auth | API keys prefixed `wf_live_...`, SHA-256 hashed |
| API key management | Create, list, revoke; one-time plaintext on creation |
| Scoped keys | Key has scopes list (e.g. `messages:send`) |
| Send message | `POST /api/v1/messages` — send to any contact by phone |
| List contacts | `GET /api/v1/contacts` |
| Create contact | `POST /api/v1/contacts` |
| List templates | `GET /api/v1/templates` |
| Track events | `POST /api/v1/events` |
| Organization info | `GET /api/v1/me` |
| OpenAPI spec | `GET /api/v1/openapi` |
| Last-used tracking | `lastUsedAt` updated per auth |

### Outbound Webhooks

| Feature | Details |
|---|---|
| Webhook subscriptions | Subscribe to events: `message.received`, `message.status`, `order.placed` etc. |
| HMAC signing | Each delivery signed with org-specific secret |
| Webhook test | Send test payload to endpoint |
| Event filtering | Per-subscription event list |

### Inbound Webhooks

| Feature | Details |
|---|---|
| WhatsApp Cloud API | Inbound messages, delivery receipts, read receipts, referrals |
| Flow form responses | `nfm_reply` events → FlowResponse + contact attribute update |
| Razorpay | Payment events → wallet credit |
| Shopify | Order/customer/cart events |
| Shiprocket | Delivery status events |

**Test checklist:**
- [ ] Create API key → copy plaintext key → use in `Authorization: Bearer` header
- [ ] `POST /api/v1/messages` → message sent to contact
- [ ] `GET /api/v1/contacts` → returns paginated list
- [ ] `POST /api/v1/events` → event stored and triggers sequence
- [ ] Create outbound webhook subscription → send test payload → HMAC verifies
- [ ] Revoke API key → subsequent requests return 401

**Routes:** `GET/POST /api/org/[orgId]/api-keys` · `GET/POST /api/org/[orgId]/webhooks` · `GET/PUT/DELETE /api/org/[orgId]/webhooks/[subscriptionId]` · `POST /api/org/[orgId]/webhooks/[subscriptionId]/test` · `POST /api/v1/messages` · `GET/POST /api/v1/contacts` · `GET /api/v1/templates` · `POST /api/v1/events` · `GET /api/v1/me` · `GET /api/v1/openapi`

---

## 15. Launches

| Feature | Details |
|---|---|
| Launch list | View all product/campaign launches |
| Launch creation | Define launch with steps and schedule |
| Launch activation | Activate a launch to begin step processing |
| Step-by-step execution | Cron processes each launch step in order |
| Launch detail view | View launch status and step completion |

**Test checklist:**
- [ ] Create launch with 3 steps → activate
- [ ] Trigger cron `/api/cron/process-launch-steps` → step 1 executes
- [ ] View launch detail → completed steps marked

**Routes:** `GET/POST /api/org/[orgId]/launches` · `GET/PUT /api/org/[orgId]/launches/[launchId]` · `POST /api/org/[orgId]/launches/[launchId]/activate` · `POST /api/cron/process-launch-steps`

---

## 16. Recipes (Automation Templates)

| Feature | Details |
|---|---|
| Recipe library | Browse pre-built automation recipes |
| Recipe detail | View steps and configuration for a recipe |
| Apply recipe | Instantiate recipe into a live sequence or flow |
| AI recipe generation | Generate custom recipe from a business brief |
| Recipe CRUD | Create, update, delete custom recipes |

**Test checklist:**
- [ ] Browse recipe library → select a recipe → view steps
- [ ] Apply recipe → sequence created with correct steps
- [ ] AI: enter business brief → recipe generated
- [ ] Create custom recipe → save → appears in library

**Routes:** `GET/POST /api/org/[orgId]/recipes` · `GET/PUT/DELETE /api/org/[orgId]/recipes/[recipeId]` · `POST /api/org/[orgId]/recipes/ai`

---

## 17. Use Cases / Appointment Booking

| Feature | Details |
|---|---|
| Use case console | View and manage use-case automations (e.g. appointments) |
| Appointment booking | Customers book slots via WhatsApp |
| Slot generation | Auto-generate available time slots from schedule config |
| Slot management | View, update, delete individual slots |
| Booking management | View all bookings; update status |
| Use case settings | Configure business hours, slot duration, buffer time |

**Test checklist:**
- [ ] Configure use-case settings (working hours, duration) → slots generated
- [ ] Book a slot → booking appears in console
- [ ] Update booking status → confirmed/cancelled
- [ ] Delete a slot → no longer bookable

**Routes:** `GET/PUT /api/usecase/settings` · `GET/POST /api/usecase/slots` · `POST /api/usecase/slots/generate` · `GET/PUT/DELETE /api/usecase/slots/[id]` · `GET/POST /api/usecase/bookings` · `GET/PUT /api/usecase/bookings/[id]`

---

## 18. NDR (Non-Delivery Reports)

| Feature | Details |
|---|---|
| NDR list | View all failed/undelivered orders |
| NDR resolution | Reattempt delivery or cancel order |
| Shiprocket webhook | Inbound delivery failure events from Shiprocket |
| NDR automation | Auto-send WhatsApp message to contact on NDR |
| NDR status tracking | Pending → Resolved / Cancelled |

**Test checklist:**
- [ ] Send Shiprocket NDR webhook → NDR entry appears in tab
- [ ] Resolve NDR → status updates
- [ ] Verify WhatsApp message sent to contact on NDR event

**Routes:** `GET/PUT /api/org/[orgId]/ndr` · `POST /api/webhooks/ndr` · `POST /api/webhooks/shiprocket`

---

## 19. Embeddable Chat Widget

> **Active development branch: `feat/embeddable-widget`**

| Feature | Details |
|---|---|
| Widget config | Configure widget color, greeting, trigger delay per org |
| Public key | Each org gets a public key for widget authentication |
| Widget snippet | Embeddable `<script>` tag for any website |
| Click tracking | Track widget interactions via `/api/widget/[publicKey]/click` |
| Config endpoint | Public endpoint returns widget config by public key |
| Widget UI card | Settings card in dashboard to manage widget |

**Test checklist:**
- [ ] Open Settings → Widget card → configure color and greeting
- [ ] Copy embed snippet → paste into test HTML page → widget renders
- [ ] Click widget → click tracked via `/api/widget/[publicKey]/click`
- [ ] `GET /api/widget/[publicKey]/config` → returns correct config
- [ ] Update widget config → changes reflect on embedded widget

**Routes:** `GET/PUT /api/org/[orgId]/widget` · `GET /api/widget/[publicKey]/config` · `POST /api/widget/[publicKey]/click`

---

## 20. Settings (WhatsApp Connection)

| Feature | Details |
|---|---|
| Embedded Signup | Connect WhatsApp Business Account via Meta OAuth |
| Connection status | Current state, phone number, WABA ID |
| Phone number portfolio | List all numbers in the account |
| Phone number management | Add, update, delete individual phone numbers |
| Disconnect | Revoke WhatsApp connection |
| Catalog sync | Pull Meta product catalog to local DB |
| Test message | Send a test message to verify connection |
| Working hours | Set business hours (also accessible from Inbox) |

**Test checklist:**
- [ ] Run Embedded Signup → org shows as WhatsApp connected
- [ ] View phone number portfolio → numbers listed
- [ ] Send test message → delivered to phone
- [ ] Disconnect → status shows disconnected → re-connect
- [ ] Sync catalog → products imported

**Routes:** `POST /api/whatsapp/connect` · `POST /api/whatsapp/disconnect` · `GET /api/whatsapp/status` · `GET /api/whatsapp/portfolio` · `GET/POST /api/org/[orgId]/phone-numbers` · `GET/PUT/DELETE /api/org/[orgId]/phone-numbers/[id]` · `POST /api/org/[orgId]/test-message` · `POST /api/org/[orgId]/catalog/sync`

---

## 21. Dashboard & Onboarding

| Feature | Details |
|---|---|
| KPI overview cards | Contacts, campaigns sent, messages delivered, wallet balance |
| Onboarding checklist | Connect WhatsApp → create template → send first campaign |
| Activity / event stream | Chronological system log (FlowJournalStream) |
| Brand profile | Org name, industry, tone-of-voice for AI Copilot |
| Sandbox mode | Reset sandbox data; view sandbox-only metrics |
| Done-For-You Copilot | AI-guided setup wizard |
| System logs | View all system log entries |

**Test checklist:**
- [ ] New org → onboarding checklist shows → complete each step
- [ ] Complete onboarding → checklist disappears
- [ ] Activity stream updates after any action (send, import, etc.)
- [ ] Set brand profile → AI Copilot uses it for generation
- [ ] Reset sandbox → sandbox metrics clear

**Routes:** `GET /api/org/[orgId]/data` · `GET /api/org/[orgId]/onboarding` · `POST /api/org/[orgId]/reset-sandbox` · `GET /api/org/[orgId]/sandbox-metrics` · `GET/PUT /api/org/[orgId]/brand-profile` · `GET /api/org/[orgId]/system-logs`

---

## 22. Authentication & Accounts

| Feature | Details |
|---|---|
| Email/password login | Standard credential login via NextAuth.js |
| Email registration | Signup with hashed password |
| Email OTP login | Passwordless login via email OTP |
| WhatsApp OTP login | Login via WhatsApp; receive OTP on phone |
| Session management | JWT-based sessions via NextAuth |
| Multi-organization | User can be member of multiple orgs; org switcher |
| Role-based access | `OWNER`, `ADMIN`, `AGENT` — enforced on every API route |

**Test checklist:**
- [ ] Register new account → verify email → login
- [ ] Email OTP: initiate → receive OTP → verify → session created
- [ ] WhatsApp OTP: enter phone → OTP on WhatsApp → verify → session
- [ ] Switch org from sidebar → dashboard reloads with new org data
- [ ] AGENT role: verify admin-only routes return 403

**Routes:** `POST /api/auth/[...nextauth]` · `POST /api/register` · `POST /api/auth/email-otp/initiate` · `POST /api/auth/email-otp/verify` · `POST /api/whatsapp-auth/initiate` · `POST /api/whatsapp-auth/send-otp` · `POST /api/whatsapp-auth/verify-otp` · `GET /api/whatsapp-auth/status`

---

## 23. Partner / White-Label

| Feature | Details |
|---|---|
| Partner creation | Register agency/reseller with slug, logo, brand color, domain |
| Custom domain | Each partner serves the app on their own domain |
| Branding resolver | Domain/slug lookup returns `{name, logoUrl, primaryColor}` |
| Organization linking | Multiple orgs linked to one partner |
| Pricing markup | `pricingMarkup` multiplier applied to usage costs |
| Client org management | Partner lists all their client organizations |

**Test checklist:**
- [ ] Create partner with custom slug → branding resolver returns correct data
- [ ] Link org to partner → usage cost uses markup multiplier
- [ ] Custom domain: configure domain → app loads with partner branding

**Routes:** `POST /api/partner`

---

## 24. AI Copilot & Content Generation

| Feature | Details |
|---|---|
| Copilot sidebar | Persistent chat sidebar across all dashboard tabs |
| Brand-aware context | Uses org `brandProfile` for tailored output |
| Template generation | Generate WhatsApp template from brief |
| Template compliance audit | Groq evaluates against Meta guidelines |
| Template optimization | Improve template for engagement or compliance |
| Flow generation | Generate chatbot node flow from natural language |
| WhatsApp Form generation | Generate Meta Flow JSON from requirements |
| Ad creative generation | Generate headline + copy + image prompt |
| Analytics narrator | Plain-English performance summary |
| Campaign strategist | Recommends next campaigns from past data |
| Reply suggestions | 3 suggested quick-replies per inbox conversation |

**Test checklist:**
- [ ] Open Copilot sidebar → send any message → Groq responds
- [ ] Copilot references brand name/industry in response
- [ ] Template generation: enter brief → complete template body generated
- [ ] Compliance audit: submit a policy-violating template → Groq flags it
- [ ] Analytics narrator: view analytics tab → AI summary renders

**Routes:** `POST /api/ai/copilot` · `POST /api/ai/generate-template` · `POST /api/whatsapp/optimize-template` · `POST /api/ai/generate-flow` · `POST /api/ai/generate-wa-flow` · `POST /api/ai/generate-ad` · `POST /api/ai/analytics-narrator` · `POST /api/ai/campaign-strategist` · `POST /api/ai/reply-suggestions`

---

## Database Models Reference

| Model | Purpose |
|---|---|
| `User` | Authentication identity |
| `Organization` | Tenant workspace |
| `Membership` | User↔Org with role (OWNER/ADMIN/AGENT) |
| `Partner` | White-label agency |
| `Contact` | CRM contact with attributes and tags |
| `Message` | Individual WhatsApp message |
| `Campaign` | Broadcast campaign definition and stats |
| `Template` | WhatsApp template with Meta status |
| `ChatbotNode` | Visual chatbot flow node |
| `Flow` | WhatsApp interactive form definition |
| `FlowResponse` | Submitted form data from a contact |
| `Sequence` | Drip automation definition |
| `SequenceStep` | Individual step in a sequence |
| `SequenceEnrollment` | Per-contact automation state tracker |
| `Segment` | Saved audience rule set |
| `RoutingRule` | Agent auto-assignment rule |
| `Ad` | Ad creative record |
| `AdCampaign` | Meta ad campaign |
| `Product` | Marketplace product |
| `Cart` | Contact's shopping cart |
| `CartItem` | Line item in a cart |
| `Order` | Purchase record with attribution |
| `Integration` | Third-party platform connection |
| `UsageEvent` | Billing: metered message send event |
| `ApiKey` | Public API key (hashed) |
| `WebhookSubscription` | Outbound webhook endpoint config |
| `AttributionTouch` | Marketing touch for last-touch attribution |
| `SystemLog` | Audit trail of user operations |
| `ChatbotAnalytics` | Node-level chatbot performance data |
| `WhatsAppLoginAttempt` | Phone OTP login state |
| `Launch` | Product/campaign launch with steps |
| `Recipe` | Pre-built automation template |
| `Booking` | Appointment booking record |
| `Slot` | Available appointment slot |
| `Widget` | Embeddable chat widget config |
| `CannedReply` | Pre-saved message response |
| `Note` | Per-contact private note |

---

## Cron Jobs

| Route | Frequency | Purpose |
|---|---|---|
| `POST /api/cron/process-broadcasts` | Every minute | Execute scheduled campaign sends |
| `POST /api/cron/process-sequences` | Every minute | Advance due sequence enrollments |
| `POST /api/cron/process-launch-steps` | Every minute | Execute due launch steps |
| `POST /api/cron/process-webhooks` | Every minute | Retry failed outbound webhook deliveries |
