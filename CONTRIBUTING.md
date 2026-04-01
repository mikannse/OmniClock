# Contributing to Omni Clock

Thank you for your interest in contributing to Omni Clock!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/omni-clock.git`
3. Install dependencies: `npm install`
4. Start development: `npm run tauri dev`

## Development Workflow

1. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. Make your changes following our coding standards

3. Commit your changes with a clear message:
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve issue with timer"
   ```

4. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

5. Open a Pull Request

## Coding Standards

- TypeScript strict mode enabled
- Use React functional components with hooks
- Follow existing code formatting (Prettier)
- Add TypeScript types for all function parameters and return values
- Write descriptive commit messages (see below)

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation changes
- `test` - Test additions/changes
- `chore` - Maintenance tasks
- `perf` - Performance improvements
- `ci` - CI/CD changes

Examples:
```
feat: add Pomodoro timer module
fix: resolve timer pause issue
docs: update README for new features
```

## Reporting Bugs

Before creating an issue, please:
1. Search existing issues
2. Update to the latest version
3. Provide clear reproduction steps

## Suggesting Features

We welcome feature suggestions! Please:
1. Describe the feature and its use case
2. Explain why it would benefit the project
3. Provide any relevant examples or references

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
