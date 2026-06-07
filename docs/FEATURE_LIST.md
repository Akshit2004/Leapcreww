# WappFlow — Complete Feature List

> Generated: 2026-06-07  
> Branch: `feat/layered-architecture-roadmap-scaffold`  
> Source of truth: codebase exploration across `src/features/`, `src/app/api/`, `prisma/schema.prisma`

---

## Table of Contents

1. [Authentication & Accounts](#1-authentication--accounts)
2. [Dashboard & Onboarding](#2-dashboard--onboarding)
3. [Inbox (Unified Conversations)](#3-inbox-unified-conversations)
4. [Customers / CRM](#4-customers--crm)
5. [Campaigns (Broadcast Engine)](#5-campaigns-broadcast-engine)
6. [Templates (Meta-Approved Messages)](#6-templates-meta-approved-messages)
7. [Flows (WhatsApp Interactive Forms)](#7-flows-whatsapp-interactive-forms)
8. [Chatbot Builder (Conversational AI)](#8-chatbot-builder-conversational-ai)
9. [Sequences (Drip Automation)](#9-sequences-drip-automation)
10. [Segments (Audience Builder)](#10-segments-audience-builder)
11. [Ads (Click-to-WhatsApp)](#11-ads-click-to-whatsapp)
12. [Analytics & Attribution](#12-analytics--attribution)
13. [Marketplace (E-Commerce)](#13-marketplace-e-commerce)
14. [Settings (WhatsApp Connection)](#14-settings-whatsapp-connection)
15. [Integrations Hub](#15-integrations-hub)
16. [Billing & Wallet](#16-billing--wallet)
17. [Public API & Webhooks](#17-public-api--webhooks)
18. [Partner / White-Label](#18-partner--white-label)
19. [AI Copilot & Content Generation](#19-ai-copilot--content-generation)
20. [WhatsApp Auth (Phone Login)](#20-whatsapp-auth-phone-login)

---

## 1. Authentication & Accounts

| Feature | Details |
|---|---|
| Email/password login | Standard credential login via NextAuth.js |
| Email registration | User signup with hashed password |
| Session management | JWT-based sessions via NextAuth |
| WhatsApp OTP login | Initiate login via phone; receive OTP on WhatsApp; verify and get session |
| Multi-organization | A user can be member of multiple orgs; org switcher in sidebar |
| Role-based access | Roles: `OWNER`, `ADMIN`, `AGENT` — enforced on every API route |

**Routes:**  
`POST /api/auth/[...nextauth]` · `POST /api/auth/register`  
`POST /api/whatsapp-auth/initiate` · `POST /api/whatsapp-auth/send-otp` · `POST /api/whatsapp-auth/verify-otp` · `GET /api/whatsapp-auth/status`

---

## 2. Dashboard & Onboarding

| Feature | Details |
|---|---|
| KPI overview cards | Contacts, campaigns sent, messages delivered, wallet balance |
| Onboarding checklist | Step-by-step wizard: connect WhatsApp → create template → send first campaign |
| Activity / event stream | Chronological system log of user operations |
| Brand profile | Store org name, industry, tone-of-voice — used by AI Copilot for context-aware generation |
| Sandbox mode | Reset sandbox data; view sandbox-only metrics |
| Tab navigation | Switches between all 12 feature tabs without page reload |

**Routes:**  
`GET /api/org/[orgId]/data` · `GET /api/org/[orgId]/onboarding` · `POST /api/org/[orgId]/reset-sandbox`  
`GET /api/org/[orgId]/sandbox-metrics` · `GET /POST /api/org/[orgId]/brand-profile`

---

## 3. Inbox (Unified Conversations)

| Feature | Details |
|---|---|
| Conversation thread list | All contacts with last message, unread count, assigned agent |
| Message composer | Send text, template, or media messages from the web UI |
| Contact detail panel | View contact info, tags, attributes, order history in sidebar |
| Agent takeover | Mark conversation as agent-handled (disables chatbot for that contact) |
| Bulk CSV import | Import contacts from CSV (name, phone, email, source, tags, status) |
| AI reply suggestions | AI suggests 3 quick-reply options per conversation (Groq-powered) |
| Unread badge | Per-contact unread message counter |

**Routes:**  
`POST /api/org/[orgId]/contacts/import` · `GET/PUT /api/org/[orgId]/contact/[contactId]`  
`POST /api/ai/reply-suggestions`

---

## 4. Customers / CRM

| Feature | Details |
|---|---|
| Contact list | Sortable, filterable table of all CRM contacts |
| Contact fields | Name, phone, email, status, tags, last active, assigned agent, custom attributes |
| Bulk tag management | Select multiple contacts → add/remove tags in one action |
| Add contact | Manual contact creation form |
| Tag-based segmentation | Filter contacts by tag; use tags as campaign targets |
| Custom attributes | Key-value attributes on each contact (populated by flows/forms) |
| Contact source tracking | Source field records how contact was acquired (ad, shopify, CSV, webhook, etc.) |
| Shopify sync | Contacts imported from Shopify orders/customers via webhook |

**Components:** `CustomersTab.tsx` · `CustomersTable.tsx` · `TagBadge.tsx` · `BulkAddTagModal.tsx` · `AddCustomerModal.tsx`

---

## 5. Campaigns (Broadcast Engine)

| Feature | Details |
|---|---|
| Template broadcast | Send Meta-approved templates to a tagged or segmented audience |
| Session broadcast | 24-hour session window free-form message (no template required) |
| Audience targeting | Target by contact tag or saved segment |
| Audience exclusion | Exclude a tag from the send list |
| Media support | Attach image, video, or document to campaign message |
| Variable interpolation | Substitute contact fields (name, phone, custom attribute) into template body |
| Scheduled delivery | Set future send date/time with timezone selection |
| Anti-spam delay | Configurable per-message delay interval to avoid rate limits |
| Recurrence | Daily, weekly, or monthly recurring campaigns |
| Delivery funnel analytics | Per-campaign stats: Sent → Delivered → Read → Clicked |
| Campaign report drawer | Visual funnel chart per campaign |
| Conversion attribution | Campaign outbound sends stamped in AttributionTouch for ROI tracking |

**Routes:**  
`GET/POST /api/org/[orgId]/campaigns` · `GET/PUT/DELETE /api/org/[orgId]/campaigns/[campaignId]`  
`POST /api/cron/process-broadcasts` · `POST /api/whatsapp/session-broadcast`

---

## 6. Templates (Meta-Approved Messages)

| Feature | Details |
|---|---|
| Template editor | Create templates with body, header (text/image/video/document), footer, buttons |
| Template categories | Marketing, Utility, Authentication |
| Button types | Quick Reply, Call-to-Action (URL/phone), Flow trigger |
| Meta submission | Submit template to Meta for approval; track approval status |
| Approval polling | Background status check against Meta API |
| AI Compliance Auditor | Groq evaluates template against Meta guidelines — flags issues before submission |
| AI template generation | Generate template copy from a brief using AI |
| AI copy optimization | Improve existing template for engagement or compliance |
| Template sharing | Share template across all orgs (super-admin feature) |
| Template sync | Pull existing approved templates from Meta back into the DB |
| Template deletion | Delete template locally and from Meta |
| Resumable media upload | Large media header files use Meta Resumable Upload API |

**Routes:**  
`POST /api/org/[orgId]/templates/create` · `GET /api/org/[orgId]/templates/check-template-status`  
`DELETE /api/org/[orgId]/templates/delete-template/[templateId]` · `POST /api/org/[orgId]/templates/toggle-share`  
`POST /api/org/[orgId]/templates/sync` · `POST /api/ai/generate-template` · `POST /api/ai/optimize-template`

---

## 7. Flows (WhatsApp Interactive Forms)

| Feature | Details |
|---|---|
| Flow list | View all flows with draft/published status |
| Visual flow builder | Drag-and-drop form builder (screens, components, routing) |
| Meta Flow JSON | Raw JSON editor for advanced Meta Flows configuration |
| Mobile preview | Live mobile phone mockup preview of the form |
| Publish to Meta | Submit flow to Meta and make it live |
| Test in sandbox | Test flow in Meta sandbox before publishing |
| Broadcast flow | Send published flow to a list of contacts |
| Form response capture | Store submitted form data per contact (FlowResponse table) |
| Contact attribute updates | Form responses automatically update contact attributes |
| Flow token correlation | Each send uses a token to match responses back to contacts |
| Encryption support | Org-level public/private key pair for end-to-end flow encryption |

**Routes:**  
`GET/POST /api/org/[orgId]/flows` · `GET/PUT /api/org/[orgId]/flows/[flowId]`  
`POST /api/org/[orgId]/flows/[flowId]/publish` · `GET /api/org/[orgId]/flows/[flowId]/responses`  
`POST /api/org/[orgId]/flows/[flowId]/broadcast` · `POST /api/org/[orgId]/flows/[flowId]/test`  
`POST /api/ai/generate-wa-flow`

---

## 8. Chatbot Builder (Conversational AI)

| Feature | Details |
|---|---|
| Visual node canvas | Figma-like panning/zooming canvas to build conversation logic |
| Node types | Trigger, Message, Question, Delay, Routing |
| Node connections | Wire nodes together to define conversation paths |
| Dynamic routing | Branch conversation based on user response keywords |
| AI Flow Architect | Generate entire node layout from a natural-language prompt (Groq) |
| Pure AI Mode (Autoresponder) | Bypass node flow; use LLM to respond to every message dynamically |
| Autoresponder config | Set AI personality, context, fallback messages |
| Mobile bottom-sheet inspector | On mobile, node inspector slides up as a sheet instead of sidebar |
| Chatbot analytics | Impressions, response rate, drop-off per node |
| Toggle chatbot on/off | `chatbotBuilderEnabled` flag per organization |
| Agent takeover detection | Chatbot yields to human agent when takeover flag is set on contact |

**Routes:**  
`GET/POST /api/org/[orgId]/chatbot` · `POST /api/org/[orgId]/chatbot/analytics`  
`POST /api/ai/generate-flow`

---

## 9. Sequences (Drip Automation)

| Feature | Details |
|---|---|
| Multi-step journeys | Define ordered steps with delays between each |
| Trigger types | `tag_added`, `form_submit`, `ad_click`, `cart_abandoned`, `signup` |
| Step action types | `send_template`, `send_message`, `add_tag`, `branch` |
| Delay scheduling | Per-step delay in minutes; `nextRunAt` processed by cron |
| Branching conditions | Conditional routing between steps based on contact state |
| Segment enrollment gate | Only enroll contacts matching a saved segment |
| Cron processor | `/api/cron/process-sequences` runs due enrollments continuously |
| Enrollment tracking | `SequenceEnrollment` tracks per-contact position, status, and next run time |
| Sequence ROI | Revenue attributed to sequence tracked in analytics |

**Routes:**  
`GET/POST /api/org/[orgId]/sequences` · `POST /api/cron/process-sequences`  
`GET /api/org/[orgId]/analytics/sequence-roi`

---

## 10. Segments (Audience Builder)

| Feature | Details |
|---|---|
| Rule builder | Build audiences using AND/OR logic |
| Rule operators | `eq`, `neq`, `contains`, `in`, `active_within_days` |
| Rule fields | Tags, status, source, custom attribute key, last active date |
| Audience preview | Count matching contacts before saving |
| Saved segments | Reusable named segments; used in campaigns, sequences, and routing rules |
| Audience resolution | `resolveAudience()` returns matching Contact IDs for any segment |

**Routes:**  
`GET/POST /api/org/[orgId]/segments` · `GET/PUT/DELETE /api/org/[orgId]/segments/[segmentId]`

---

## 11. Ads (Click-to-WhatsApp)

| Feature | Details |
|---|---|
| Ad creative builder | Headline, primary text, image URL, welcome template selection |
| AI ad creative generation | Generate headline + copy from topic brief (Groq) |
| Ad campaign management | Create/manage Meta ad campaigns (objective: LEADS) |
| Budget management | Daily budget with minor currency unit support |
| Campaign statuses | Draft, Active, Paused, Completed |
| Lead capture | Contacts created automatically from ad click referrals |
| Ad performance metrics | Impressions, leads, spend, CTR |
| Meta API integration | Pushes creative and campaign to Meta Marketing API |
| Contact source tracking | Contacts sourced from ads stamped with `sourceAdId` |
| Sequence enrollment trigger | `ad_click` trigger auto-enrolls lead in a sequence |
| Conversion attribution | Ad-attributed contacts' orders tracked in ROI ledger |

**Routes:**  
`GET/POST /api/org/[orgId]/ads` · `GET/POST /api/org/[orgId]/ads/campaigns`  
`GET/PUT /api/org/[orgId]/ads/campaigns/[campaignId]` · `POST /api/ai/generate-ad`

---

## 12. Analytics & Attribution

| Feature | Details |
|---|---|
| ROI ledger | Revenue vs. cost per campaign and sequence |
| Conversion attribution | Last-touch model: each order stamped with the campaign/sequence/agent that last touched the contact |
| AttributionTouch tracking | Every outbound marketing send creates a touch record |
| Cost simulation | Estimated WhatsApp message cost by country and category |
| Agent performance metrics | Messages sent, response rate, contacts assigned per agent |
| Sequence ROI | Isolated ROI view per automation sequence |
| Campaign funnel charts | Sent → Delivered → Read → Clicked funnel per campaign |
| AI Analytics Narrator | AI generates a plain-English summary of campaign performance |
| AI Campaign Strategist | AI recommends next campaign strategy based on past performance |
| Chatbot analytics | Node-level impressions, response rates, drop-off |

**Routes:**  
`GET /api/org/[orgId]/analytics/roi-ledger` · `GET /api/org/[orgId]/analytics/agent-metrics`  
`GET /api/org/[orgId]/analytics/sequence-roi` · `POST /api/ai/analytics-narrator`  
`POST /api/ai/campaign-strategist` · `POST /api/org/[orgId]/chatbot/analytics`

---

## 13. Marketplace (E-Commerce)

| Feature | Details |
|---|---|
| Product catalog | Browse products with filtering by category |
| Product detail page | Images, description, price, stock |
| Contact-linked cart | One persistent cart per contact (not per browser session) |
| Add to cart | Add products with quantity selection |
| Razorpay checkout | Redirect to Razorpay; verify payment signature on return |
| Order creation | On payment success, create Order with conversion attribution |
| Order status workflow | Pending → Confirmed → Processing → Shipped → Delivered / Cancelled |
| Payment status tracking | Pending → Paid → Failed → Refunded |
| Inventory tracking | Stock field decremented on purchase |
| Catalog sync from Meta | Pull product catalog from Meta Commerce into local DB |
| Cart abandonment trigger | `cart_abandoned` sequence trigger auto-fires when cart is inactive |

**Routes:**  
`GET /api/marketplace/catalog` · `GET /api/marketplace/products/[id]`  
`POST /api/marketplace/cart` · `POST /api/marketplace/verify-payment`  
`POST /api/org/[orgId]/catalog/sync`

---

## 14. Settings (WhatsApp Connection)

| Feature | Details |
|---|---|
| Embedded Signup | Connect WhatsApp Business Account via Meta Embedded Signup (OAuth) |
| Connection status | Show current connection state, phone number, WABA ID |
| Phone number portfolio | List all phone numbers in the account |
| Disconnect | Revoke WhatsApp connection and clear stored credentials |
| Catalog sync | Pull Meta product catalog and sync products to local DB |
| Org credentials stored | `whatsappBusinessAccountId`, `whatsappPhoneNumberId`, `metaBusinessId`, `metaCatalogId` |

**Routes:**  
`POST /api/org/[orgId]/connect` · `POST /api/org/[orgId]/disconnect`  
`GET /api/org/[orgId]/status` · `GET /api/org/[orgId]/portfolio`  
`POST /api/org/[orgId]/catalog/sync`

---

## 15. Integrations Hub

| Feature | Details |
|---|---|
| Shopify | OAuth connect, order/customer webhook, lead import, cart abandon detection |
| WooCommerce | Webhook-based order/contact sync |
| Google Sheets | Row-based contact import |
| Extensible connector registry | `Connector` interface for adding new integrations |
| Webhook normalization | Each connector parses its native webhook into a standard `InboundLead` |
| API key encryption | Integration credentials stored encrypted |
| Webhook URL generation | Each org gets a unique inbound webhook URL per integration |
| Connection status UI | Visual status indicator per integration |

**Routes:**  
`GET/POST /api/org/[orgId]/integrations` · `/api/shopify/auth` · `/api/shopify/callback`  
`POST /api/integrations/shopify-webhook`

---

## 16. Billing & Wallet

| Feature | Details |
|---|---|
| Wallet balance | Per-org wallet (major currency float) displayed in dashboard |
| Wallet top-up | Initiate Razorpay payment to add funds |
| Razorpay payment webhook | Auto-credit wallet on successful payment event |
| Pre-send balance check | `canAfford()` guard prevents sends when wallet is empty |
| Usage metering | Every outbound message logged as a `UsageEvent` with cost |
| Usage ledger | View all usage events with costs by campaign, date, category |
| Per-country pricing | India, US, and global default pricing tables per message category |
| Partner markup | Partner's `pricingMarkup` multiplier applied on top of base price |
| Message categories | Marketing, Utility, Authentication, Service (free) |

**Routes:**  
`POST /api/org/[orgId]/wallet/topup` · `GET /api/org/[orgId]/usage`  
`POST /api/webhooks/razorpay`

---

## 17. Public API & Webhooks

### Public REST API

| Feature | Details |
|---|---|
| Bearer token auth | API keys prefixed `wf_live_...`, SHA-256 hashed in DB |
| API key management | Create, list, revoke keys from UI; one-time plaintext display on creation |
| Scoped keys | Each key has a scopes list (default: `messages:send`) |
| Send message endpoint | `POST /api/v1/messages` — send a message to any contact by phone |
| Last-used tracking | `lastUsedAt` updated on each successful auth |

### Outbound Webhooks

| Feature | Details |
|---|---|
| Webhook subscriptions | Subscribe to events: `message.received`, `message.status`, `order.placed`, etc. |
| HMAC signing | Each webhook delivery signed with org-specific secret |
| Event filtering | Per-subscription event list |

### Inbound Webhooks

| Feature | Details |
|---|---|
| WhatsApp Cloud API | Inbound messages, delivery receipts, read receipts, referrals, ad clicks |
| Flow form responses | `nfm_reply` events stored as FlowResponse, contact attributes updated |
| Razorpay | Payment events trigger wallet credit |
| Shopify | Order, customer, cart events processed via Shopify connector |

**Routes:**  
`POST /api/v1/messages` · `GET/POST /api/org/[orgId]/api-keys`  
`POST /api/webhooks/whatsapp` · `POST /api/webhooks/razorpay`

---

## 18. Partner / White-Label

| Feature | Details |
|---|---|
| Partner creation | Register agency/reseller with slug, logo, brand color, custom domain |
| Custom domain | Each partner can serve the app on their own domain |
| Branding resolver | Domain/slug lookup returns `{name, logoUrl, primaryColor}` for dynamic branding |
| Organization linking | Multiple orgs linked to a single partner |
| Pricing markup | Partner `pricingMarkup` float multiplier applied to all usage costs for their orgs |
| Client org management | Partner can list all their client organizations |

**Routes:** `POST /api/partner`

---

## 19. AI Copilot & Content Generation

| Feature | Details |
|---|---|
| Copilot sidebar | Persistent chat sidebar available across all dashboard tabs |
| Brand-aware context | Copilot uses org's `brandProfile` (name, industry, tone) for tailored output |
| Template generation | Generate WhatsApp template body from a brief |
| Template compliance audit | Groq evaluates template against Meta guidelines before submission |
| Template copy optimization | Improve template for engagement or Meta approval |
| Flow generation | Generate chatbot node flow from a natural-language brief |
| WhatsApp Form generation | Generate a Meta Flow JSON definition from requirements |
| Ad creative generation | Generate headline, primary text, and image prompt for click-to-WhatsApp ad |
| Analytics narrator | Plain-English summary of campaign performance data |
| Campaign strategist | AI recommends next campaigns based on past performance |
| Reply suggestions | 3 suggested quick-replies per inbox conversation |

**Routes:**  
`POST /api/ai/copilot` · `POST /api/ai/generate-template` · `POST /api/ai/optimize-template`  
`POST /api/ai/generate-flow` · `POST /api/ai/generate-wa-flow` · `POST /api/ai/generate-ad`  
`POST /api/ai/analytics-narrator` · `POST /api/ai/campaign-strategist` · `POST /api/ai/reply-suggestions`

---

## 20. WhatsApp Auth (Phone Login)

| Feature | Details |
|---|---|
| Code-based initiation | User visits `/login/whatsapp` → gets a unique 12-char code |
| OTP via WhatsApp | System sends OTP to user's phone via WhatsApp |
| OTP verification | Verify OTP → create session (new or existing user) |
| Status polling | Poll `GET /api/whatsapp-auth/status` until verified or expired |
| Expiry | Login attempts expire; status goes to `EXPIRED` |
| New user flow | If phone not found → create user account automatically |

**Routes:**  
`POST /api/whatsapp-auth/initiate` · `POST /api/whatsapp-auth/send-otp`  
`POST /api/whatsapp-auth/verify-otp` · `GET /api/whatsapp-auth/status`

---

## Database Models Reference

| Model | Purpose |
|---|---|
| `User` | Authentication identity |
| `Organization` | Tenant workspace |
| `Membership` | User↔Org with role (OWNER/ADMIN/AGENT) |
| `Partner` | White-label agency record |
| `Contact` | CRM contact with attributes and tags |
| `Message` | Individual WhatsApp message (in or out) |
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

---

## Roadmap Status

| ID | Feature | Status |
|---|---|---|
| T-01 | Click-to-WhatsApp Ads | ✅ Implemented |
| T-02 | WhatsApp Flows & Forms | ✅ Implemented |
| T-03 | Drip / Sequence Automation | ✅ Implemented |
| T-04 | Smart Segments | ✅ Implemented |
| T-05 | Multi-Agent Routing Rules | ✅ Model ready (UI TBD) |
| T-06 | Conversation Billing & Wallet | ✅ Implemented |
| T-07 | Integrations Hub | ✅ Extensible (Shopify, WooCommerce, Google Sheets) |
| T-08 | Public API + Outbound Webhooks | ✅ Implemented |
| T-09 | White-Label / Partner | ✅ Implemented |
| T-11 | Timezone-Aware Scheduled Campaigns | ✅ Implemented |
| D-04 | Conversion-First Attribution & ROI | ✅ Implemented |
| — | Visual Chatbot Builder | ✅ Implemented |
| — | In-App Marketplace + Razorpay | ✅ Implemented |
| — | AI Copilot Sidebar | ✅ Implemented |
| — | Brand-Aware AI Profile | ✅ Implemented |
| — | WhatsApp Phone OTP Login | ✅ Implemented |
| — | Flow Encryption (E2E keys) | ✅ Model ready (Meta integration TBD) |
