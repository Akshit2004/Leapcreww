# Shopify Partner Program & App Setup Guide

This document provides a comprehensive, step-by-step guide for setting up the **Shopify Partner Program**, creating a public Shopify app, configuring API credentials, and running the **1-Click OAuth Shopify Integration** in LeapCreww for both local development and production deployment.

---

## Overview of the Integration Flow

LeapCreww integrates with Shopify via standard **OAuth 2.0**. Regular merchants connect their stores in just **two clicks**:
1. Merchant inputs their store address (`your-store.myshopify.com`) and clicks **"Connect via Shopify"**.
2. LeapCreww redirects the merchant to the Shopify App Consent screen.
3. Merchant approves the access scopes and clicks **"Install app"**.
4. LeapCreww exchanges the authorization code for a permanent token, records the connection, and automatically registers webhook subscriptions.

---

## Step 1: Set Up your Shopify Partner Account
To build public integrations, you must have a free **Shopify Partner** developer account.

1. Go to **[Shopify Partners Portal](https://partners.shopify.com/)**.
2. Click **Join now** to register. 
3. If you already have a personal or merchant Shopify ID, log in with it. Clicking **Join now** will instantly create a free Partner Organization on top of your existing credentials.
4. Fill in your business name and details (you can select *App Development* as your primary interest).

---

## Step 2: Create a Shopify App in Partners
Once your Partner account is active, you need to register LeapCreww as a Shopify App to obtain your API client keys.

1. Inside your Partner Dashboard, click **Apps** in the left sidebar menu.
2. Click the **Create app** button at the top right, then select **Create app manually**.
3. Name your app (e.g. `LeapCreww` or `LeapCreww Integration`).

---

## Step 3: Configure App URLs, Scopes, and Versioning
Shopify manages app configurations using version-controlled structures.

1. In your app's dashboard, click on **Versions** in the left sidebar menu.
2. Click the **New version** (or **Edit configuration**) button.
3. Fill in the following configurations:

### A. App URLs (OAuth Setup)
*   **App URL**: The root domain where your application runs.
    *   *Local Development*: `http://localhost:3000`
    *   *Production (Vercel)*: `https://wapp-flow-six.vercel.app`
*   **Allowed Redirect URIs** *(Highly Critical)*: The exact URL where Shopify sends the auth callback code.
    *   *Local Development*: `http://localhost:3000/api/shopify/callback`
    *   *Production (Vercel)*: `https://wapp-flow-six.vercel.app/api/shopify/callback`

### B. Access Scopes (Permissions)
LeapCreww requires specific read/write access to sync catalogs and capture checkouts/orders. In the **Scopes** field, paste this exact comma-separated list:
```text
read_products, read_orders, write_orders, read_customers
```

### C. Distribution Method
*   Select **Public distribution** and click **Select**.
*   > [!TIP]
    > **Keep App Unlisted**: You can leave the app *unlisted* in the Shopify App Store. This prevents other public users from seeing it while giving you full access to install it on any development store without domain limitations or invalid token errors!

4. Click **Save** / **Release version** at the top right to make this configuration active.

---

## Step 4: Configure LeapCreww Server Credentials
Copy your API credentials into your LeapCreww environment.

1. In your app's dashboard, click on **Settings** in the left sidebar menu.
2. Scroll to the **Credentials** panel to find your **Client ID** and **Secret**.
3. Add these credentials to your server environment:

### Local Development (`.env`)
Open your local [**`.env`**](file:///d:/Akshit/Projects/AiSennsy%20Clone/.env) file and paste the keys:
```bash
SHOPIFY_CLIENT_ID="your_client_id_here"
SHOPIFY_CLIENT_SECRET="your_client_secret_here"
```
*Note: Always **restart your terminal server** (`npm run dev`) after modifying `.env`.*

### Production (Vercel)
1. Open your **Vercel Dashboard** and go to your LeapCreww project.
2. Go to **Settings** → **Environment Variables**.
3. Add `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` with your credentials and save.
4. Re-push your code to deploy.

---

## Step 5: Test the Integration with a Free Development Store
Development stores act as sandbox environments to test catalog syncs, orders, and checkout automations completely for free.

1. Go back to your **Partner Dashboard** and click **Stores** in the left sidebar.
2. Click **Add store** → **Create development store**.
3. Select **Create a store for test and developer use** (highly recommended as this has no expiration and is completely free).
4. Name your store (e.g. `my-leapcreww-test-store`) and click create.
5. Once your store admin portal is ready:
   * Open LeapCreww.
   * Go to **Integrations** tab.
   * Enter your store domain (e.g. `my-leapcreww-test-store.myshopify.com`).
   * Click **Connect via Shopify (1-Click Install)**.
   * Shopify will prompt you to authorize the app. Click **Install app** to complete the connection!

---

## Local Webhook Tunneling Advisory
Shopify requires public `https://` secure endpoints to dispatch real-time webhook payloads (e.g. when an order is created or a checkout is abandoned). 

Because `http://localhost:3000` is private and unencrypted, Shopify API will reject automatic webhook registrations during local testing.

### To test live webhook payloads on localhost:
1. Fire up a public secure tunnel using **Ngrok** or **Cloudflare Tunnels**:
   ```bash
   ngrok http 3000
   # or
   cloudflared tunnel --url http://localhost:3000
   ```
2. Copy your public secure forwarding address (e.g., `https://xxxx.ngrok-free.app`).
3. Temporarily update your **App URL** and **Redirect URIs** in both your **Shopify Partner App Version** and your LeapCreww configuration to use this public forwarding address.
4. When you connect, Shopify will successfully auto-register the webhook subscriptions!
