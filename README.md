# Custom Approval Management

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This GitHub Action enables the addition of various teams and their members to the approval process, specifying the required number of members from each team. This is particularly useful, for example, when orchestrating a production deployment that requires explicit approval from the QA team, Product team, Development team, etc., making the process straightforward, simple, and transparent.

## Configuration

To setup this action except typical workflow config you will also need to setup approval config

### Approval configuration

```yaml
teams:
  dev-team:
    members: # team members that can approve this PR
      - user1
      - user2
      - user3
      - user4
    required: 2 # required number of members for approval

  qa-team: 
    members: # team members that can approve this PR
      - user1
      - user2
      - user3
      - user4
    required: 4 # required number of members for approval

  product-team:
    members: # team members that can approve this PR
      - user1
      - user2
      - user3
      - user4
    required: 1 # required number of members for approval

  other-team:
    members: # team members that can approve this PR
      - user1
      - user2
    required: 1 # required number of members for approval
```

Default path for this configuration is `.github/custom_approval.yml

### Workflow configuration

Create personal access token with org:read permisions
https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

and add it as a secret to the repo
https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions

Create a workflow file in `.github/workflows` (e.g. `.github/workflows/prod|stage|dev_approval.yml`):

```yaml
name: Require Members Approval

on:
  pull_request:
  pull_request_review:
    types: [editted, submitted]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  require_members_approval:
    name: Require Members Approval
    runs-on: ubuntu-latest
    steps:
      - name: Request review based on files changes and/or groups the author belongs to
        uses: creotiv/custom-approval-management@v0.0.4
        with:
          token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
          config: .github/custom_approval.yml # Config file location override
```

**!!! Please note that users not auto-asigned with this action, you need use [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) feature for this**
