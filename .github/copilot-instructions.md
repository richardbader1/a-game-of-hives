# AI coding instructions

Read `PROMPT_FOR_VSCODE.md`, `docs/game-rules.md`, `docs/confirmed-decisions.md`, `docs/implementation-conventions.md`, and `docs/acceptance-tests.md` **before editing code**.

Keep rules and rendering separate. Rule interpretation must follow these documents and the authoritative original in `references/`.

Never overwrite designer-confirmed decisions during refactors. Create tests for each game rule and show passing build/test results before calling a milestone complete.

Use the folder structure in `docs/project-tree.txt` as a guide; replace `.gitkeep` markers with actual project files when appropriate.
