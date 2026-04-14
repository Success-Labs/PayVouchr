# Contributing to Vouchr

Thank you for your interest in contributing to Vouchr. This project is building offline-friendly payment infrastructure on Stellar, and every contribution — whether it is a bug fix, a new feature, improved documentation, or a test — moves that mission forward.

Please take a few minutes to read this guide before opening an issue or pull request.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Commit Message Convention](#commit-message-convention)
- [Code Style](#code-style)
- [Testing Requirements](#testing-requirements)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Stellar Drips Wave Tasks](#stellar-drips-wave-tasks)

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) Code of Conduct. By participating, you agree to uphold a welcoming and respectful environment for everyone. Harassment, discrimination, or hostile behaviour of any kind will not be tolerated.

---

## How to Contribute

There are several ways to contribute:

- **Fix a bug** — check the Issues tab for bugs labelled `bug` or `good first issue`
- **Add a feature** — check issues labelled `enhancement` or open a discussion first
- **Improve documentation** — typos, clarity, missing examples — all welcome
- **Write tests** — additional test coverage for edge cases is always valuable
- **Review pull requests** — constructive code review helps everyone

If you are unsure where to start, look for issues tagged `good first issue` or `help wanted`.

---

## Development Setup

### Prerequisites

- Rust 1.70+ with the WASM target:
  ```bash
  rustup target add wasm32-unknown-unknown
  ```
- Stellar CLI:
  ```bash
  cargo install --locked stellar-cli --features opt
  ```
- Node.js 18+ and npm
- Git

### Fork and Clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/Success-Labs/PayVouchr.git
cd vouchr

# Add the upstream remote
git remote add upstream https://github.com/<your-org>/vouchr.git
```

### Smart Contract

```bash
cd contract/vouchr-stellar

# Run tests
cargo test

# Build WASM
stellar contract build
```

### Frontend

```bash
cd frontend/vouchr-ui

cp .env.example .env
# Fill in VITE_CONTRACT_ID with a testnet deployment

npm install
npm run dev
```

---

## Project Structure

```
vouchr/
├── contract/vouchr-stellar/     # Soroban smart contract (Rust)
├── frontend/vouchr-ui/          # React + TypeScript UI
├── docs/                        # Project documentation
├── CONTRIBUTING.md              # This file
└── LICENSE
```

See [docs/STRUCTURE.md](docs/STRUCTURE.md) for a detailed breakdown.

---

## Submitting a Pull Request

1. **Create a branch** from `main` with a descriptive name:
   ```bash
   git checkout -b feat/cancel-expiry-ui
   # or
   git checkout -b fix/double-redeem-edge-case
   ```

2. **Make your changes.** Keep commits focused — one logical change per commit.

3. **Run tests** before pushing:
   ```bash
   # Contract tests
   cd contract/vouchr-stellar && cargo test

   # Frontend build check
   cd frontend/vouchr-ui && npm run build
   ```

4. **Push your branch** and open a Pull Request against `main`.

5. **Fill in the PR template** — describe what changed, why, and how to test it.

6. A maintainer will review your PR. Please respond to feedback promptly. PRs with no activity for 14 days may be closed.

### PR Checklist

- [ ] Tests pass locally (`cargo test`)
- [ ] No new compiler warnings introduced
- [ ] Documentation updated if behaviour changed
- [ ] Commit messages follow the convention below

---

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

Types:

| Type | When to use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `test` | Adding or updating tests |
| `refactor` | Code change that is neither a fix nor a feature |
| `chore` | Build process, dependency updates, tooling |

Examples:

```
feat(contract): add optional memo field to voucher struct
fix(frontend): handle expired voucher error message correctly
docs(api): document cancel function error conditions
test(contract): add test for zero-amount voucher rejection
```

---

## Code Style

### Rust

- Run `cargo fmt` before committing
- Run `cargo clippy` and resolve all warnings
- Keep functions small and focused
- Add doc comments (`///`) to all public functions

### TypeScript / React

- Use TypeScript strictly — no `any` types
- Prefer functional components and hooks
- Keep components focused on a single responsibility
- Use descriptive variable names

---

## Testing Requirements

All new contract logic must be accompanied by tests in `src/test.rs`. See [docs/TESTING.md](docs/TESTING.md) for the full guide on writing tests.

For bug fixes, add a regression test that would have caught the bug before the fix.

---

## Reporting Bugs

Before opening a bug report, please search existing issues to avoid duplicates.

When filing a bug, include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behaviour vs actual behaviour
- Relevant logs or error messages
- Your environment (OS, Rust version, Node version, network — testnet/mainnet)

For security vulnerabilities, do **not** open a public issue. Follow the process in [docs/SECURITY.md](docs/SECURITY.md).

---

## Suggesting Features

Open a GitHub Issue with the label `enhancement`. Describe:

- The problem you are trying to solve
- Your proposed solution
- Any alternatives you considered
- Whether you are willing to implement it yourself

Large features benefit from a discussion before implementation begins, to avoid wasted effort.

---

## Stellar Drips Wave Tasks

Vouchr is participating in the Stellar Community Fund Drips Wave. Specific tasks are tracked in the Issues tab with the label `drips-wave`. These tasks are well-scoped and a great way to make a meaningful contribution while supporting the Stellar ecosystem.

If you complete a Drips Wave task, mention the issue number in your PR description.

---

Thank you for contributing to Vouchr.
