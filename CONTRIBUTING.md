# Contributing to AgentAuth

Thank you for considering contributing to AgentAuth! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Running Tests](#running-tests)
- [Code Style Guide](#code-style-guide)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Recognition](#recognition)

## Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to umytbaynazarow754@gmail.com.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Agent-Identity.git
   cd Agent-Identity
   ```
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL (or use Docker Compose)

### Backend Setup

```bash
# Navigate to backend directory
cd agentauth

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your local database credentials
# Required variables:
# - DATABASE_URL
# - JWT_SECRET
# - PORT

# Run database migrations (if applicable)
npm run migrate

# Start the backend server
npm run dev
```

The backend will be available at `http://localhost:3000`

### Frontend Dashboard Setup

```bash
# Navigate to dashboard directory
cd agentauth-dashboard

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with backend API URL
# VITE_API_URL=http://localhost:3000

# Start the development server
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Using Docker Compose (Recommended)

The easiest way to run the full stack locally:

```bash
# From the repository root
docker-compose up

# Backend: http://localhost:3000
# Frontend: http://localhost:80
# Database: PostgreSQL on port 5432
```

## Running Tests

### Backend Tests

```bash
cd agentauth
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
```

We have 56 integration tests covering:
- API endpoints
- Authentication flows
- Permission validation
- Security (CORS, rate limiting)
- Webhooks

### Frontend Tests

```bash
cd agentauth-dashboard
npm test                    # Run all tests
npm run test:ui            # Run tests with Vitest UI
```

We have 33 component tests covering:
- React components
- Input sanitization
- Error boundaries
- Loading states

### Testing Your Changes

Before submitting a PR, ensure:
- [ ] All existing tests pass
- [ ] New features have accompanying tests
- [ ] Test coverage doesn't decrease

## Code Style Guide

We use ESLint and Prettier to maintain code quality.

### Backend (Node.js/TypeScript)

- **Linting:** ESLint with TypeScript rules
- **Formatting:** Prettier
- **Style:** 2-space indentation, semicolons required

Run linters:
```bash
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues
npm run format            # Format with Prettier
```

### Frontend (React/TypeScript)

- **Linting:** ESLint with React hooks rules
- **Formatting:** Prettier
- **Style:** 2-space indentation, functional components preferred

### General Guidelines

- Use meaningful variable and function names
- Add comments for complex logic (but prefer self-documenting code)
- Keep functions small and focused (single responsibility)
- Avoid hardcoding values (use constants or environment variables)
- Handle errors gracefully with user-friendly messages

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring (no functional changes)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config, etc.)

### Examples

```bash
feat(api): add bulk agent import endpoint

- Added POST /v1/agents/bulk endpoint
- Supports CSV file upload
- Validates agent data before import
- Returns import results with success/failure counts

Closes #123
```

```bash
fix(dashboard): resolve webhook signature verification error

The webhook signature was using wrong encoding (base64 instead of hex).
Changed to hex encoding to match backend implementation.

Fixes #456
```

```bash
docs(readme): update installation instructions

Added Docker Compose setup section and clarified environment variables.
```

## Pull Request Process

### Before Submitting

1. **Update documentation** if you changed functionality
2. **Add tests** for new features or bug fixes
3. **Run tests** to ensure everything passes
4. **Run linters** and fix any issues
5. **Update CHANGELOG.md** if applicable (for significant changes)

### Submitting Your PR

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub from your fork to `main` branch

3. **Fill out the PR template** with:
   - Description of changes
   - Related issue (if applicable)
   - Testing performed
   - Screenshots (for UI changes)

4. **Wait for review** - a maintainer will review your PR
   - Address any feedback or requested changes
   - Keep the PR up to date with the main branch

### PR Review Criteria

We look for:
- [ ] Clear description of what the PR does
- [ ] Tests pass (CI/CD checks)
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] No merge conflicts
- [ ] Changes are focused (one feature/fix per PR)

### After Approval

- A maintainer will merge your PR
- Your contribution will be included in the next release
- You'll be added to our [contributors list](#recognition)!

## Recognition

We use [All Contributors](https://allcontributors.org/) to recognize everyone who contributes to AgentAuth.

Contributors are recognized for:
- 💻 Code contributions
- 📖 Documentation improvements
- 🐛 Bug reports
- 💡 Ideas and feature requests
- 🎨 Design contributions
- ✅ Testing and QA

After your first contribution, you'll be added to the README.md contributors section.

## Questions?

- **General Questions:** Open a [GitHub Discussion](https://github.com/umyt-dev/Agent-Identity/discussions)
- **Bug Reports:** Open a [GitHub Issue](https://github.com/umyt-dev/Agent-Identity/issues)
- **Security Issues:** Email umytbaynazarow754@gmail.com
- **Support:** Email umytbaynazarow754@gmail.com or join our [Discord](https://discord.gg/agentauth)

---

**Thank you for contributing to AgentAuth! 🎉**

We appreciate your time and effort in making AgentAuth better for everyone.
