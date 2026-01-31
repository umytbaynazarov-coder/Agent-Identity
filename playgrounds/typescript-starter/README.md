# AgentAuth TypeScript Playground

Interactive playground for trying the AgentAuth TypeScript SDK in your browser.

## 🚀 Quick Start

### Run in StackBlitz

Click the button below to open this playground in StackBlitz:

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/umytbaynazarov-coder/agentauth-typescript-starter)

### Run Locally

```bash
# Install dependencies
npm install

# Run the demo
npm start
```

## 📝 What This Demo Does

1. **Registers an agent** with type-safe permissions
2. **Verifies credentials** and gets a JWT token
3. **Fetches agent details** using the access token
4. **Demonstrates error handling**

## 🎯 Try It Yourself

Modify the code in `index.ts` to:

- Add more permissions (auto-complete works!)
- Change the agent name and email
- Fetch activity logs with `client.getActivity()`
- List all available permissions with `client.listPermissions()`

## 📚 Learn More

- [TypeScript SDK Documentation](https://github.com/umytbaynazarov-coder/Agent-Identity/tree/main/agentauth-sdk)
- [Full Getting Started Guide](https://github.com/umytbaynazarov-coder/Agent-Identity/blob/main/docs/getting-started/typescript.md)
- [AgentAuth Website](https://agentauth.dev)

## 🔒 Security Note

This demo connects to a live AgentAuth instance. API keys shown are for demonstration purposes only. In production, always store credentials securely in environment variables.
