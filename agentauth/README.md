# 🔐 AgentAuths - Agent Identity & Authentication API

> Microsoft Entra for developers who ship. Simple, secure authentication for AI agents.

## 🎯 What This Project Does

AgentAuths provides a complete identity and authentication system for AI agents. It allows you to:

- 🆔 Register agents with unique credentials
- 🔑 Issue and verify API keys
- 🎫 Generate JWT tokens for authenticated requests
- 📊 Track verification attempts for security
- 🛡️ Manage agent permissions and status

---

## ⚠️ ERRORS FIXED

This codebase had critical errors that have been **FIXED**:

### 1. **Column Name Mismatch** (CRITICAL)
- ❌ Original SQL used `agentauth` column
- ❌ Code used `agent_id` column  
- ✅ **FIXED:** Updated SQL schema to use `agent_id`

### 2. **Missing Dependency**
- ❌ `uuid` package missing from `package.json`
- ✅ **FIXED:** Added `uuid` to dependencies

### 3. **SQL Schema Issues**
- ❌ Wrong column names in indexes
- ❌ Wrong column names in view
- ❌ Wrong JOIN conditions
- ✅ **FIXED:** All corrected in new `schema.sql`

**📄 See detailed analysis in:**
- `ERRORS_FOUND.md` - Complete error report
- `SCHEMA_COMPARISON.md` - Before/after SQL comparison
- `SETUP_GUIDE.md` - Step-by-step setup instructions

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Create `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
JWT_SECRET=your-secret-here
PORT=3000
```

### 3. Run Database Schema
Copy contents of `schema.sql` into Supabase SQL Editor and run it.

### 4. Start Server
```bash
npm start
```

### 5. Test
```bash
npm test
```

**For detailed setup instructions, see `SETUP_GUIDE.md`**

---

## 📁 Project Files

| File | Description | Status |
|------|-------------|--------|
| `server.js` | Main API server with database | ✅ Working |
| `test.js` | Comprehensive test suite | ✅ Working |
| `schema.sql` | **FIXED** Database schema | ✅ Fixed |
| `package.json` | **UPDATED** Dependencies | ✅ Updated |
| `index.js` | Legacy in-memory version | ⚠️ Not used |
| `ERRORS_FOUND.md` | Error analysis report | 📄 Documentation |
| `SCHEMA_COMPARISON.md` | Before/after comparison | 📄 Documentation |
| `SETUP_GUIDE.md` | Complete setup guide | 📄 Documentation |

---

## 🔌 API Endpoints

### `POST /agents/register`
Register a new agent and receive API credentials
```bash
curl -X POST http://localhost:3000/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent","owner_email":"you@example.com"}'
```

### `POST /agents/verify`
Verify credentials and get JWT access token
```bash
curl -X POST http://localhost:3000/agents/verify \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"agt_...","api_key":"ak_..."}'
```

### `GET /agents/:id`
Get agent details (requires JWT token)
```bash
curl http://localhost:3000/agents/agt_... \
  -H "Authorization: Bearer <token>"
```

### `GET /health`
Health check endpoint
```bash
curl http://localhost:3000/health
```

---

## 🗄️ Database Schema

### Tables

**agents** - Stores agent credentials and metadata
- `id` - Primary key
- `agent_id` - Unique agent identifier (e.g., `agt_abc123`)
- `name` - Agent name
- `description` - Optional description
- `owner_email` - Owner's email
- `api_key_hash` - SHA-256 hash of API key
- `permissions` - Array of permissions (e.g., `['read', 'write']`)
- `status` - active | inactive | suspended | revoked
- `created_at` - Registration timestamp
- `last_verified_at` - Last successful verification

**verification_logs** - Security audit trail
- `id` - Primary key
- `agent_id` - Agent being verified
- `success` - Boolean verification result
- `reason` - Reason for failure (if any)
- `timestamp` - When verification occurred
- `ip_address` - IP address of request

**agent_stats** (view) - Analytics
- Aggregates verification statistics per agent

---

## 🔒 Security Features

- ✅ API keys hashed with SHA-256 (never stored in plain text)
- ✅ JWT tokens for authenticated requests (1-hour expiry)
- ✅ Verification logging for security audit
- ✅ Agent status management (active/inactive/suspended/revoked)
- ✅ Permission-based access control
- ⚠️ RLS (Row Level Security) ready but disabled for testing

---

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Tests cover:
- ✅ Health check
- ✅ Agent registration (success & validation)
- ✅ Agent verification (success & invalid credentials)
- ✅ Token authentication
- ✅ Getting agent details
- ✅ Permission checks

---

## 📊 What Changed

### Original Schema (Broken)
```sql
CREATE TABLE agents (
  agentauth VARCHAR(50) ...  -- ❌ Wrong!
);
```

### Fixed Schema
```sql
CREATE TABLE agents (
  agent_id VARCHAR(50) ...  -- ✅ Correct!
);
```

**Impact:** Every database operation would have failed with the original schema.

**See `SCHEMA_COMPARISON.md` for complete before/after comparison.**

---

## 🛠️ Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT (jsonwebtoken)
- **ID Generation:** UUID, Crypto
- **Environment:** dotenv

---

## 📝 Environment Variables

Required in `.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbG...` |
| `JWT_SECRET` | Secret for signing JWT tokens | `6963e33b...` |
| `PORT` | Server port (optional) | `3000` |

---

## 🐛 Troubleshooting

### "column agent_id does not exist"
→ You're using the old schema. Run the new `schema.sql`

### "Cannot find module uuid"
→ Run `npm install`

### "Invalid Supabase credentials"
→ Check your `.env` file has correct `SUPABASE_URL` and `SUPABASE_ANON_KEY`

**For more help, see `SETUP_GUIDE.md` troubleshooting section.**

---

## 📚 Documentation Files

1. **`README.md`** (this file) - Overview and quick start
2. **`SETUP_GUIDE.md`** - Complete setup instructions
3. **`ERRORS_FOUND.md`** - Detailed error analysis
4. **`SCHEMA_COMPARISON.md`** - SQL before/after comparison

---

## 🎯 Next Steps

1. ✅ Review errors fixed (you're reading this!)
2. ⬜ Setup environment variables
3. ⬜ Install dependencies (`npm install`)
4. ⬜ Run database schema in Supabase
5. ⬜ Start server (`npm start`)
6. ⬜ Run tests (`npm test`)
7. ⬜ Integrate with your AI agents

---

## 📈 Use Cases

- **AI Agent Authentication** - Secure your AI agents with unique credentials
- **Multi-Agent Systems** - Manage identities for multiple agents
- **Service-to-Service Auth** - Authenticate automated services
- **API Gateway** - Control access to your AI infrastructure
- **Security Audit** - Track all authentication attempts

---

## 🤝 Contributing

Before making changes:
1. Ensure column names match between code and schema
2. Run tests after changes
3. Update documentation
4. Follow existing code style

---

## 📄 License

MIT

---

## 🚨 Important Notes

1. **API keys are shown only once** during registration - save them!
2. **JWT tokens expire after 1 hour** - reverify to get a new token
3. **The `index.js` file is legacy code** - use `server.js` instead
4. **Always use environment variables** - never hardcode credentials
5. **Review security checklist** in `SETUP_GUIDE.md` before production

---

**Ready to get started? Follow the `SETUP_GUIDE.md`! 🚀**
