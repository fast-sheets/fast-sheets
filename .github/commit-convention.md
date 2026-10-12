## Git Commit Message Convention

> This is adapted from [Angular's commit message guidelines](https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#-commit-message-guidelines).

#### TL;DR:

Messages must be matched by the following regex:

```regexp
/^(revert: )?(build|ci|docs|feat|fix|perf|refactor|style|test)(\(.+\))?: .{1,50}/
```

#### Type

Must be one of the following:
- build: Changes that affect the build system or external dependencies (example scopes: npm, vite)
- ci: Changes to our CI configuration files and scripts (example scopes: github)
- docs: Documentation only changes
- feat: A new feature
- fix: A bug fix
- perf: A code change that improves performance
- refactor: A code change that neither fixes a bug nor adds a feature
- style: Changes that do not affect the meaning of the code (white-space, formatting, missing semicolons, etc.)
- test: Adding missing tests or correcting existing tests

### Full Message Format

A commit message consists of a **header**, **body** and **footer**. The header has a **type**, **scope** and **subject**:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory and the **scope** of the header is optional.

### Revert

If the commit reverts a previous commit, it should begin with `revert: `, followed by the header of the reverted commit. In the body, it should say: `This reverts commit <hash>.`, where the hash is the SHA of the commit being reverted.

### Scope

The scope could be anything specifying the place of the commit change. For example `core`, `editable-plugin`, `search-plugin`, `vue-demo` etc...

### Subject

The subject contains a succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize the first letter
- no dot (.) at the end

### Body

Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes".
The body should include the motivation for the change and contrast this with previous behavior.

### Footer

The footer should contain any information about **Breaking Changes** and is also the place to
reference GitHub issues that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.