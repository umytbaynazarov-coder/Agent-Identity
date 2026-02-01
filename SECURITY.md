# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.5.x   | :white_check_mark: |
| < 0.5   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

We take the security of AgentAuth seriously. If you discover a security vulnerability, please follow these steps:

### 1. Contact Us Privately

Email security details to: **umytbaynazarow754@gmail.com**

Please include:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if available)
- Your contact information for follow-up

### 2. Response Timeline

- **Acknowledgment:** Within 24-48 hours of your report
- **Initial Assessment:** Within 3-5 business days
- **Fix Timeline:** Within 7 days for critical vulnerabilities
- **Public Disclosure:** After patch is released (coordinated with you)

### 3. What to Expect

- We will acknowledge receipt of your vulnerability report
- We will provide an estimated timeline for a fix
- We will notify you when the vulnerability is fixed
- We will credit you in our Hall of Fame (unless you prefer to remain anonymous)

## Security Best Practices

When deploying AgentAuth, we recommend:

1. **Environment Variables:** Never commit `.env` files or hardcode secrets
2. **JWT Secrets:** Use a strong, randomly generated secret (32+ characters)
3. **HTTPS Only:** Always use HTTPS in production (no HTTP)
4. **Database Security:** Use strong passwords and limit network access
5. **Rate Limiting:** Keep rate limits enabled to prevent abuse
6. **Regular Updates:** Update to the latest version for security patches
7. **Webhook Signatures:** Always verify webhook signatures before processing

## Security Features

AgentAuth includes the following security features:

- **JWT Authentication:** Industry-standard token-based auth (HS256)
- **API Key Hashing:** Keys hashed with SHA-256 before storage
- **Rate Limiting:** Configurable rate limits per endpoint
- **CORS Protection:** Whitelist-based origin validation
- **Input Validation:** All inputs validated and sanitized
- **SQL Injection Prevention:** Parameterized queries via Supabase
- **Error Handling:** No sensitive data in error messages (production mode)

## Hall of Fame

We recognize security researchers who help make AgentAuth more secure:

<!-- Security researchers will be listed here -->

_No vulnerabilities reported yet. Be the first!_

---

## Disclosure Policy

- We prefer coordinated disclosure (notify us first, we fix it, then public disclosure)
- We will credit you publicly (unless you prefer anonymity)
- We do not currently offer a bug bounty program, but we deeply appreciate responsible disclosure

## Contact

- **Security Email:** umytbaynazarow754@gmail.com
- **General Support:** umytbaynazarow754@gmail.com
- **Website:** https://agentauth.dev

---

**Thank you for helping keep AgentAuth and our users safe!**
