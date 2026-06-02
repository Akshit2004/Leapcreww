# WhatsApp Business API Onboarding & Troubleshooting Guide

This guide compiles the real-world troubleshooting steps, root causes, and verification checklists for the WhatsApp Cloud API integration. Use this documentation to quickly resolve errors when onboarding new customers to the platform.

---

## 🛑 Quick Reference: Common Onboarding Errors

### 1. Error: `"Unsupported post request. Object with ID '...' does not exist, cannot be loaded due to missing permissions..."`

#### 🔍 Symptoms
* A phone number in the Meta Developer Console (under **WhatsApp > API Setup**) is greyed out.
* Selecting or trying to register the number shows a red error popup with the text above.
* API requests return `400 Bad Request` with `OAuthException` permissions errors.

#### 🛠️ Root Causes & Solutions

##### Cause A: Business Portfolio Mismatch
* **Explanation:** The Meta Developer App (e.g., `Smritix-WABot`) is linked to one Business Portfolio, but the WhatsApp Business Account (WABA) and phone number belong to a **different** Business Portfolio. Meta blocks cross-portfolio access for security.
* **Fix:** 
  1. Go to [Meta Developer Console](https://developers.facebook.com/) > Select your App.
  2. Click **App Settings > Basic**.
  3. Scroll down to the **Business Portfolio** section.
  4. Ensure the selected Business Portfolio matches the exact business portfolio that owns the WhatsApp Business Account.

##### Cause B: System User is Restricted (Pending Security Check)
* **Explanation:** Meta has flagged the **System User** (the account generating the API token) with an "Account verification required" block. This temporarily disables the system user's token from accessing any WhatsApp assets, resulting in a "does not exist / missing permissions" error.
* **Fix:**
  1. Go to **Meta Business Settings > Users > System Users**.
  2. Select the system user.
  3. Look for a yellow warning box saying **"Account verification required"**.
  4. Click the blue **Verify account** button and complete the security steps (SMS OTP, 2FA, or identity confirmation).
  5. **Crucial:** Once verified, click **Generate token** to get a fresh, unblocked token and update the project's environment variables (`WHATSAPP_SYSTEM_USER_TOKEN`).

##### Cause C: Assets are Not Linked
* **Explanation:** The System User or the App has not been assigned permission to manage the specific WhatsApp Business Account (WABA).
* **Fix:**
  1. Go to **Meta Business Settings > Users > System Users**.
  2. Select your System User and click **Assign assets**.
  3. Under **Apps**, select your Developer App and toggle on **Full Control**.
  4. Under **WhatsApp accounts**, select the correct WABA and toggle on **Full Control**.
  5. Click **Save Changes**.

##### Cause D: Phone Number is Unregistered / Unverified
* **Explanation:** The phone number was added to the WABA but has not gone through the official **6-digit OTP verification** inside Meta's servers to prove ownership.
* **Fix:**
  1. **Prerequisite:** Ensure the phone number is **completely deleted** from the mobile WhatsApp/WhatsApp Business app (go to Settings > Account > Delete Account inside the mobile app).
  2. Go to **Meta Business Settings > Accounts > WhatsApp Accounts**.
  3. Select the WhatsApp Account and click the **WhatsApp Manager** button at the bottom-right.
  4. In WhatsApp Manager, click the **Phone numbers** (phone icon) tab on the left.
  5. Find your phone number and click **Verify / Register**.
  6. Choose **SMS**, receive the 6-digit OTP on the phone, enter it, and click **Submit**. The status should change to a green dot saying **Connected**.

##### Cause E: Test WABA vs. Real WABA Mismatch
* **Explanation:** The developer portal's "API Setup" tab defaults to Meta's auto-generated **Test WABA** (e.g., ID `2305483223290836`). If your real number is registered under your **Real WABA** (e.g., ID `1626500191974104`), trying to use or register it in the Test WABA panel will fail.
* **Fix:** Bypassing the Test environment is easy. Do not try to register the number through the Test Dashboard's dropdown. Instead, copy the **real Phone Number ID** (found under the *Phone numbers* tab of your real WABA in Business Settings) and configure it directly in your project.

---

### 2. Error: `(#133010) Account not registered`

#### 🔍 Symptoms
* Next.js server console outputs `[WhatsApp API Error] (#133010) Account not registered`.
* API dispatch fails/skips sending the message.

#### 🛠️ Root Cause & Solution
* **Explanation:** The API request is trying to send a message using a `WHATSAPP_PHONE_NUMBER_ID` that Meta does not recognize as a registered, active API phone number, or the access token belongs to a system user that does not have permissions for that Phone Number ID.
* **Fix:**
  1. Double-check your `.env` file or database to ensure `WHATSAPP_PHONE_NUMBER_ID` is set to your **real Phone Number ID** (not the Test Phone Number ID starting with a different range).
  2. Ensure your `WHATSAPP_SYSTEM_USER_TOKEN` is the unblocked permanent token generated after the system user was verified.

---

## 📋 Standard Customer Onboarding Checklist
To prevent these errors when onboarding a new business customer, always follow this checklist in order:

### 1. Account Cleanup
* [ ] **Delete from Mobile App:** Confirm the customer has deleted the number from their regular WhatsApp/WhatsApp Business mobile app. (A phone number cannot be on both the API and a mobile app simultaneously).

### 2. Meta Business Manager Configuration
* [ ] **Business Verification:** Go to **Business Settings > Security Center** and start the Business Verification process if required.
* [ ] **Payment Method:** Go to **Business Settings > Accounts > WhatsApp Accounts > [Select WABA]**. Click **Payment settings** and add a valid payment method (credit/debit card) to the WABA.

### 3. Phone Number Registration
* [ ] **Add Number:** Go to **WhatsApp Accounts > WhatsApp Manager > Phone numbers** and add the phone number.
* [ ] **Verify OTP:** Trigger the 6-digit SMS OTP verification inside **WhatsApp Manager** and complete it to get the **Connected** status.

### 4. Technical Linkage (API Setup)
* [ ] **Link App to Portfolio:** Go to the Meta Developer Console and ensure the Developer App is associated with the customer's correct **Business Portfolio**.
* [ ] **System User Permissions:** Go to **Business Settings > Users > System Users**. Verify the user, click **Assign Assets**, and grant the System User **Full Control** over both the **App** and the **WhatsApp Business Account**.
* [ ] **Generate Permanent Token:** Generate the system user access token with `whatsapp_business_messaging`, `whatsapp_business_management`, and `business_management` scopes enabled.

### 5. Codebase Integration
* [ ] **Get Asset IDs:** Copy the following keys:
  * **System User Token** (from System Users page)
  * **Phone Number ID** (from WhatsApp Manager > Phone numbers)
  * **WhatsApp Business Account (WABA) ID** (from WhatsApp Accounts list)
* [ ] **Configure Environment:** Update the environment variables in your server configuration:
  ```env
  WHATSAPP_SYSTEM_USER_TOKEN="your_new_unblocked_token"
  WHATSAPP_PHONE_NUMBER_ID="your_real_phone_number_id"
  NEXT_PUBLIC_SYSTEM_WHATSAPP_NUMBER="your_real_phone_number"
  ```
* [ ] **Restart Server:** Run `npm run dev` or restart your production container to apply the environment changes.
