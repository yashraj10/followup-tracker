# Fully Automated Email Follow-Up Tracker — Setup Guide

## Architecture

```
You send email from Outlook
        ↓ (automatic — Power Automate)
Notion Database (contact logged)
        ↓ (automatic — Vercel reads Notion)
Bookmarkable Tracker Page (live data, auto-refreshes)
```

**One-time setup. Zero manual steps after.**

---

## Part 1: Create a Notion Account & Database

### 1.1 — Create Notion Account
1. Go to [notion.so](https://www.notion.so) → Sign up (free plan works fine)
2. Create a new workspace or use your existing one

### 1.2 — Create the Follow-Up Database
1. In your Notion sidebar, click **+ Add a page**
2. Name it: **Email Follow-Ups**
3. Select **Table** as the page type (full page, not inline)
4. Create these columns (properties) with EXACT names and types:

| Column Name   | Type           | Options (for Select types)                  |
|---------------|----------------|---------------------------------------------|
| Name          | Title          | *(default, already exists)*                 |
| Email         | Email          |                                              |
| Company       | Text           |                                              |
| Role          | Text           |                                              |
| Subject       | Text           |                                              |
| Category      | Select         | `Job Application`, `Recruiter`, `Networking`|
| Status        | Select         | `Sent`, `Followed Up`, `Replied`, `Ghosted` |
| LastContact   | Date           |                                              |
| Notes         | Text           |                                              |

> **Important**: Column names are case-sensitive. Match them exactly.

5. Leave the table empty for now — Power Automate will populate it

### 1.3 — Get the Database ID
1. Open your **Email Follow-Ups** database in Notion
2. Look at the URL. It looks like:
   ```
   https://www.notion.so/yourworkspace/abc123def456...?v=...
   ```
3. The **Database ID** is the long string after your workspace name and before the `?v=`
4. Copy it — you'll need it later. Format: `abc123def456789...` (32 hex characters, no dashes)

---

## Part 2: Create a Notion API Integration

### 2.1 — Create the Integration
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **+ New integration**
3. Settings:
   - **Name**: `Follow-Up Tracker`
   - **Associated workspace**: Select your workspace
   - **Type**: Internal
4. Click **Submit**
5. Copy the **Internal Integration Secret** (starts with `ntn_...` or `secret_...`)
   — Save this securely, you'll need it twice

### 2.2 — Connect Integration to Your Database
1. Go back to your **Email Follow-Ups** database page in Notion
2. Click the **⋯** (three dots) in the top-right corner
3. Click **+ Add connections**
4. Search for **Follow-Up Tracker** (the integration you just created)
5. Click **Confirm**

> Without this step, the API can't access your database!

---

## Part 3: Deploy the Tracker to Vercel

### 3.1 — Push Code to GitHub
1. Create a new GitHub repository: `followup-tracker`
2. Upload the project folder I gave you (the one with `api/`, `public/`, `vercel.json`, `package.json`):
   ```bash
   cd followup-project
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/yashraj10/followup-tracker.git
   git push -u origin main
   ```

### 3.2 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → Sign in (or sign up with GitHub)
2. Click **Add New → Project**
3. Import your `followup-tracker` repo from GitHub
4. Before deploying, add **Environment Variables**:

| Key                  | Value                          |
|----------------------|--------------------------------|
| `NOTION_API_KEY`     | Your integration secret (`ntn_...`) |
| `NOTION_DATABASE_ID` | Your database ID (32 hex chars) |

5. Click **Deploy**
6. Once deployed, you'll get a URL like: `https://followup-tracker-xyz.vercel.app`
7. **Bookmark this URL** — this is your live tracker!

### 3.3 — Test It
1. Open your Vercel URL
2. You should see the tracker with "0 contacts" and a green connected dot
3. Manually add a test row in Notion → Click **↻ Refresh** in the tracker
4. If it shows up, the connection works!

---

## Part 4: Set Up Power Automate (Outlook → Notion)

This is the automation piece — every email you send from Outlook gets logged to Notion automatically.

### 4.1 — Create the Flow
1. Go to [flow.microsoft.com](https://flow.microsoft.com) → Sign in
2. Click **+ Create** → **Automated cloud flow**
3. Name: `Log Sent Emails to Notion`
4. Trigger: Search for **"When a new email is sent (V3)"** (Office 365 Outlook)
5. Click **Create**

### 4.2 — Configure the Trigger
- **Folder**: `SentItems`
- Leave other fields blank to capture all sent emails

### 4.3 — (Optional but Recommended) Add a Filter
To only log job-related emails:
1. Click **+ New step** → Search **Condition**
2. Set the condition:
   - `Subject` **contains** `application`
   - **OR** `Subject` **contains** `follow`
   - **OR** `Subject` **contains** `opportunity`
   - **OR** `Subject` **contains** `position`
   - **OR** `Subject` **contains** `interested`
   - **OR** `Subject` **contains** `role`
3. Put the next step (HTTP action) inside the **If yes** branch

### 4.4 — Add the Notion API Call
1. Inside the **If yes** branch (or directly after the trigger if you skipped filtering):
2. Click **+ New step** → Search **HTTP**
3. Configure:

**Method**: `POST`

**URI**: `https://api.notion.com/v1/pages`

**Headers**:
| Key               | Value                            |
|-------------------|----------------------------------|
| Authorization     | `Bearer ntn_YOUR_SECRET_HERE`    |
| Content-Type      | `application/json`               |
| Notion-Version    | `2022-06-28`                     |

> Replace `ntn_YOUR_SECRET_HERE` with your actual Notion integration secret

**Body** (click "Switch to text mode" if needed):
```json
{
  "parent": { "database_id": "YOUR_DATABASE_ID_HERE" },
  "properties": {
    "Name": {
      "title": [{ "text": { "content": "@{triggerOutputs()?['body/toRecipients']}" } }]
    },
    "Email": {
      "email": "@{first(triggerOutputs()?['body/toRecipients'])?['emailAddress/address']}"
    },
    "Subject": {
      "rich_text": [{ "text": { "content": "@{triggerOutputs()?['body/subject']}" } }]
    },
    "Category": {
      "select": { "name": "Networking" }
    },
    "Status": {
      "select": { "name": "Sent" }
    },
    "LastContact": {
      "date": { "start": "@{utcNow()}" }
    }
  }
}
```

> Replace `YOUR_DATABASE_ID_HERE` with your actual Notion database ID.

> **Important**: The `@{...}` expressions are Power Automate dynamic content. When you click in the Body field, Power Automate will show you dynamic content tokens — use those to insert the recipient name, email, and subject.

### 4.5 — Simplified Version (if dynamic content is tricky)
If the expression syntax is hard to get right, use this simpler approach:

1. Instead of one HTTP step, use **Compose** actions first:
   - **Compose - Recipient**: `@{first(triggerOutputs()?['body/toRecipients'])?['emailAddress/name']}`
   - **Compose - Email**: `@{first(triggerOutputs()?['body/toRecipients'])?['emailAddress/address']}`
   - **Compose - Subject**: `@{triggerOutputs()?['body/subject']}`

2. Then in the HTTP Body, reference the Compose outputs:
```json
{
  "parent": { "database_id": "YOUR_DATABASE_ID_HERE" },
  "properties": {
    "Name": {
      "title": [{ "text": { "content": "@{outputs('Compose_-_Recipient')}" } }]
    },
    "Email": {
      "email": "@{outputs('Compose_-_Email')}"
    },
    "Subject": {
      "rich_text": [{ "text": { "content": "@{outputs('Compose_-_Subject')}" } }]
    },
    "Category": { "select": { "name": "Networking" } },
    "Status": { "select": { "name": "Sent" } },
    "LastContact": { "date": { "start": "@{utcNow()}" } }
  }
}
```

### 4.6 — Save & Test
1. Click **Save** in Power Automate
2. Send a test email from Outlook with "test application" in the subject
3. Wait 1-3 minutes
4. Check your Notion database — a new row should appear
5. Open your bookmarked tracker — click Refresh — the contact should show up

---

## Done! Your Workflow From Now On

1. **Send emails from Outlook** — that's it, just send emails like normal
2. **Open your bookmarked tracker** anytime to see:
   - Who you've emailed
   - How many days since last contact
   - Who needs follow-up
   - Draft follow-up emails with one click
3. **Update statuses** in the tracker — changes sync back to Notion
4. **Auto-refreshes** every 5 minutes when the page is open

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Tracker shows "Disconnected" | Check your Vercel env vars (NOTION_API_KEY, NOTION_DATABASE_ID) |
| Power Automate not triggering | Make sure folder is set to "SentItems", not "Inbox" |
| Notion API returns 401 | Verify your integration secret is correct |
| Notion API returns 404 | Make sure you connected the integration to the database (Part 2.2) |
| HTTP action fails in Power Automate | Check the JSON body for syntax errors — paste it into jsonlint.com first |
| Contacts not showing in tracker | Click Refresh, check browser console (F12) for errors |
| Rate limited | Notion API allows 3 req/sec — shouldn't be an issue for normal use |

---

## Optional Upgrades (Ask Claude Anytime)

- **Smart categorization**: Power Automate can check the email domain and auto-set Category (e.g., @google.com → "Job Application")
- **Slack notifications**: Add a step to ping you on Slack when a contact goes 7+ days without reply
- **Notion → Google Calendar**: Auto-create follow-up reminders
- **Analytics dashboard**: Build a richer Vercel dashboard with charts
