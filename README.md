# CB-Audit: LivePerson Audit Trail Explorer

CB-Audit is a beautiful, secure internal dashboard designed for LivePerson employees to query, parse, and visualize chatbot configurations and interaction updates directly from Elasticsearch logs.

---

## ✨ Features

- **🔐 Google OAuth Integration:** Secured Gmail/LivePerson sign-in prevents unauthorized access to internal systems.
- **⚡ CSDS Account-to-Env Resolution:** Checks the environment (`US Production`, `EU Production`, `APAC Production`, or `QA/Sandbox`) of any LivePerson Account ID dynamically and targets the corresponding Elasticsearch cluster data views automatically.
- **⚙️ Structured Log Parsing Engine:** Seamlessly processes nested, raw console logs matching:
  `[AuditTrail] Pushed audit event with id: ... to redis queue for processing: AuditEvent(...)`
  and breaks them down into interactive timeline events.
- **🎨 Interactive Timeline & Diffing:** Deeply nested elements and fields are parsed and presented in side-by-side visual code diffs (Old vs. New values) with customizable highlight colors.
- **📋 Pasted Log Utility:** Paste a single raw `[AuditTrail]` log directly into the UI to inspect its modified elements instantly on-the-fly.
- **📥 Audit Export:** One-click download of parsed logs as fully structured JSON audits.

---

## 🛠️ Configuration & Getting Started

### 1. Requirements
Ensure you have **Node.js (v18+)** installed.

### 2. Environment Variables (`.env`)
Create a `.env` file in the root of the project to configure production variables:
```env
# Server Details
PORT=3001
SESSION_SECRET=a_super_secure_random_hash_string

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# (Optional) Elasticsearch Cluster Configuration
ELASTIC_URL=https://your-production-es-endpoint:9200
ELASTIC_API_KEY=your-secure-es-api-token
```
*Note: If no Google credentials or Elasticsearch values are supplied, the application automatically launches in **Developer Sandbox Mode**, permitting password-free Gmail bypass and serving dynamic high-fidelity simulated audit logs for instant local evaluations.*

### 3. Installation
Install the project dependencies:
```bash
npm install
```

### 4. Running the App
Launch both the Express backend server and the Vite React frontend concurrently with a single command:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to experience the application!

---

## 🧪 Running Verification Tests
Run the standalone parser validator to assert regex correctness against standard LP audit logs:
```bash
node test-parser.js
```
