# TalkAI by Vision

A sleek AI chat app powered by Groq. Single HTML file — works anywhere.

---

## Setup (5 minutes, completely free)

### Step 1 — Deploy the Cloudflare Worker (free proxy)

1. Go to https://workers.cloudflare.com and sign up (free, no credit card)
2. Click **Create Worker**
3. Delete the default code and paste everything from `worker.js`
4. Click **Save and Deploy**
5. Copy your worker URL — looks like: `https://talkai-proxy.your-name.workers.dev`

### Step 2 — Update talkai.html

Open `talkai.html` in a text editor and find this line:

```
https://talkai-proxy.YOUR-SUBDOMAIN.workers.dev
```

Replace it with your actual Worker URL from Step 1.

### Step 3 — Open and use

Open `talkai.html` in any browser. Done!

---

## Before publishing

- Replace the API key in `worker.js` with a fresh one from https://console.groq.com
- The key in this file has been exposed and should be revoked

