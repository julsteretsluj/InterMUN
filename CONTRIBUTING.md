# Contributing to InterMUN

Thank you for your interest in contributing to InterMUN. This document explains how to submit changes and the legal requirements for doing so.

## Before you start

1. Read [README.md](README.md) for project setup.
2. Review [LICENSE](LICENSE) and [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md) if your use case may be commercial.
3. Search existing issues and pull requests to avoid duplicate work.

## Development setup

```bash
git clone https://github.com/your-org/intermun.git
cd intermun
npm install
cp .env.example .env.local
# Fill in Supabase and other values — see README.md
npm run dev
```

Run quality checks before opening a PR:

```bash
npm run lint
npm run i18n:check
npm run build
```

## How to contribute

### Bug reports and feature requests

Open a GitHub issue with:

- Clear steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment (browser, Node version, deployment target)

### Code contributions

1. Fork the repository and create a branch from `main`.
2. Make focused changes; match existing code style and conventions.
3. Update translations if you add or change user-facing strings (`messages/en.json` first, then run `npm run i18n:check`).
4. Do **not** commit secrets, `.env.local`, allocation workbooks with personal data, or generated credentials.
5. Open a pull request with a concise description and test plan.

## Developer Certificate of Origin (DCO)

By contributing to this project, you agree to the [Developer Certificate of Origin Version 1.1](https://developercertificate.org/), reproduced below.

You must **sign off** every commit you intend to merge. Use:

```bash
git commit -s -m "Your message"
```

The sign-off line must match your real name and email:

```
Signed-off-by: Jane Doe <jane@example.com>
```

### Developer Certificate of Origin 1.1

```
By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I have the right to
    submit it under the open source license indicated in the file; or

(b) The contribution is based upon previous work that, to the best of my knowledge,
    is covered under an appropriate open source license and I have the right under
    that license to submit that work with modifications, whether created in whole or
    in part by me, under the same open source license (unless I am permitted to
    submit under a different license), as indicated in the file; or

(c) The contribution was provided directly to me by some other person who certified
    (a), (b) or (c) and I have not modified it.

(d) I understand and agree that this project and the contribution are public and that
    a record of the contribution (including all personal information I submit with
    it, including my sign-off) is maintained indefinitely and may be redistributed
    consistent with this project or the open source license(s) involved.
```

Pull requests without DCO sign-off on all commits may be asked to rebase with `git commit --amend -s` (only on your own unpushed commits) or to add sign-off via new commits.

## Copyright and licensing

- Contributions are licensed under the same terms as the project: [Apache License 2.0](LICENSE) for non-commercial use, subject to [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md) for commercial deployment.
- Intermun retains ownership of the core project; contributors retain copyright in their contributions.

## Code review

Maintainers may request changes, squash commits, or close PRs that are out of scope. We aim to review in a timely manner but cannot guarantee SLAs for community contributions.

## Security

Do not open public issues for security vulnerabilities. Report them privately to the partnership contact listed in [README.md](README.md#contact--partnership).

## Questions

Open a discussion or issue if anything in this guide is unclear.
