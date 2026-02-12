# Security Guide for ZenReader

## 🚨 URGENT: Usage of API Keys in Frontend

**If you leaked your deployment URL, your API Key is considered COMPROMISED.**

Because ZenReader is a client-side application (React), your API Key is embedded strictly in the JavaScript code that runs in the browser. Anyone who can visit your site can inspect the code and extract the key.

### Immediate Action Required
1.  **Go to Google AI Studio / Google Cloud Console.**
2.  **Delete the compromised key.**
3.  **Generate a new API Key.**
4.  **Update your `.env` or deployment variables** with the new key.
5.  **Redeploy** the application immediately.
6.  **Verify**: Open the site, Inspect Element (F12) -> Search for "AIza". If you see the key, ensure your Domain Restrictions in Google Cloud Console are active.

---

## 🛡️ How to Secure Your App (Since there is no Backend)

Since we don't have a backend server to hide the key, you must rely on **API Key Restrictions** provided by Google.

### 1. HTTP Referrer Restrictions (Critical)
You must tell Google to only accept requests from *your specific website*.

1.  Go to the [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials).
2.  Find your API Key and click **Edit**.
3.  Under **Application restrictions**, select **Websites (HTTP referrers)**.
4.  Add your deployment URL.
    *   Example: `https://zenreader-app.web.app/*`
    *   Example: `https://zenreader-app.firebaseapp.com/*`
5.  **Save**.

**What this does:** Even if someone steals your key, they cannot use it from their own computer or script (curl/python) because the request isn't coming from your specific website domain.

### 2. Quotas and Budgets
Set up usage quotas to prevent a bill shock if someone manages to bypass restrictions.

## 📝 Summary of Risk
*   **Can they use my app?** Yes. If they have the URL, they can use the UI to consume your quota.
*   **Can they use my tokens?** Yes. They can extract the `VITE_GEMINI_API_KEY` from the browser's Network tab or Sources tab.
*   **Can I stop them?** Yes, by rotating the key and setting up strict HTTP Referrer restrictions.

### FAQ: Do I need to change my Deployment URL?
**Short Answer:** No, but you might want to.

*   **If you only care about protecting your Credit Card/API Token:** You do **NOT** need to change the URL. Rotating the key and adding domain restrictions is enough. The old leaked key becomes useless, and the new key only works on your domain.
*   **If you care about random strangers seeing your app or using up your daily quota:** You **SHOULD** change the URL. If the URL is public, anyone can visit the site and use the AI through your UI (even with a secure key), which eats into your usage limits.

### 3. Backend Proxy (The "Gold Standard")
We have now migrated to a Backend Proxy architecture.
*   **Where is the Key?** It is stored in Google Cloud Run's "Environment Variables".
*   **Is it visible?** No. It is injected into the server process running in Google's data center. It is NEVER sent to the browser.
*   **Result:** Even if someone Inspects Element on your site, they will only see calls to `/api/generate`. They cannot see the `AIza...` key.
