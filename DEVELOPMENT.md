# DEVELOPMENT.md: Developer Guide for Obsidian-RAG

This document provides guidance for developers contributing to or extending Obsidian-RAG, an ingestion-only Obsidian plugin forked from MindMatrix. It focuses on setting up a development environment, understanding the codebase, writing tests, and following best practices for contributions. For architectural details, refer to [ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites
- **Node.js**: Version 18+ (the Makefile will enforce this).
- **Yarn**: For package management.
- **Obsidian**: Latest version for testing the plugin.
- **Databases**: Supabase (with pgvector extension) and Neo4j 5.x for full feature testing.
- **Embedding Providers**: Ollama (local or cloud) or OpenAI-compatible API keys.
- **Git**: For cloning and managing the repo.
- **Optional Tools**: Jest for testing, ESLint for linting, and a TypeScript-aware IDE like VS Code.

## Getting Started
1. **Clone the Repository**:
   ```
   git clone https://github.com/SMPL-Ai-Agency/Obsidian-RAG.git
   cd Obsidian-RAG
   ```

2. **Install Dependencies**:
   ```
   yarn install
   ```

3. **Set Up Environment**:
   - Copy `.env.template` to `.env` and fill in your Supabase, Neo4j, Ollama, and OpenAI credentials.
   - For local testing, start Supabase and Neo4j instances (e.g., via Docker):
     ```
     # Example for Supabase (adjust as needed)
     docker-compose up -d
     ```
     ```
     # Example for Neo4j
     docker run --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:latest
     ```

4. **Development Mode**:
   - Run the dev watcher to build and hot-reload the plugin:
     ```
     yarn dev
     ```
   - Install the plugin in Obsidian: Go to `Settings > Community Plugins > Browse`, then load from folder (point to the repo's root).

5. **Build for Production**:
   ```
   yarn build
   ```
   This generates `main.js`, `manifest.json`, and `styles.css` in the root for manual installation or releases.

6. **Scripts and Utilities**:
   - **Query Tables**: Use `scripts/query_tables.ts` to inspect Supabase data (run with `ts-node scripts/query_tables.ts`).
   - **Release Utils**: `scripts/release-utils.sh` for automating version bumps and GitHub releases.
   - **Makefile Targets**: Run `make init` to set up DB schemas, or `make test` for running tests.

## Code Style and Conventions
- **Language**: TypeScript with strict typing (see `tsconfig.json`).
- **Formatting**: Use Prettier (integrated via `yarn format`).
- **Linting**: ESLint rules enforced; run `yarn lint` before commits.
- **Commits**: Follow conventional commits (e.g., `feat: add new mode toggle`, `fix: handle deletion edge case`). Keep changes atomic.
- **Comments**: Add JSDoc for public methods; inline comments for non-obvious logic.
- **Modularity**: Place DB logic in `services/`, helpers in `utils/`, types in `models/`.

## Testing
Obsidian-RAG uses Jest for unit and integration tests. Tests are located in `services/__tests__/` and `tests/`.

- **Run Tests**:
  ```
  yarn test
  ```
  Or watch mode: `yarn test:watch`.

- **Writing Tests**:
  - Focus on edge cases: offline syncs, retries, exclusions, and mode-specific behaviors.
  - Use mocks: Jest mocks for Obsidian APIs, HTTP requests (e.g., Ollama), and DB clients.
  - Example from `services/__tests__/QueueService.test.ts`:
    ```typescript
    import { QueueService } from '../QueueService';
    import { ProcessingTask } from '../../models/ProcessingTask';

    describe('QueueService', () => {
      let queueService: QueueService;

      beforeEach(() => {
        queueService = new QueueService();
      });

      it('should enqueue and process tasks', async () => {
        const task: ProcessingTask = { /* mock task */ };
        queueService.enqueue(task);
        // Assert processing logic
      });
    });
    ```

- **Coverage**: Aim for 80%+; run `yarn test:coverage` to check.

## Contributing
We welcome contributions! Follow these steps:
1. **Fork and Branch**: Create a feature branch from `main` (e.g., `feat/entity-extraction-enhance`).
2. **Develop and Test**: Implement changes, add tests, update docs if needed.
3. **Commit and PR**: Push to your fork and open a Pull Request with a clear title, description, limitations, and references to TASKS.md or issues.
4. **Review Process**: Expect feedback on alignment with design principles (privacy-first, resilience, modularity).

- **Bug Reports**: Open issues with reproduction steps, logs, and environment details.
- **Feature Ideas**: Discuss in issues before coding; tie to use cases like n8n integrations.

## Debugging Tips
- **Logs**: Enable verbose logging in settings; check Obsidian console (Ctrl+Shift+I).
- **Common Issues**:
  - Connection failures: Test with settings tab's "Test Connection" button.
  - Sync errors: Inspect queue via "Show recent sync graph overlay".
  - Offline reconciliation: Simulate disconnects and verify `OfflineQueueManager`.
- **Hot Reloading**: Changes to `main.ts` or services auto-reload in dev mode.

## Release Process
- Bump version in `manifest.json`.
- Run `yarn build`.
- Use `scripts/release-utils.sh` to tag and push releases.
- Update CHANGELOG.md with summaries.

For task tracking, see [TASKS.md](TASKS.md). If you're extending the plugin (e.g., custom extractors), ensure compatibility with hybrid modes.


This architecture ensures Obsidian-RAG remains lightweight, testable, and adaptable for privacy-focused RAG workflows. For specifics, dive into code comments or open an issue for clarifications.
