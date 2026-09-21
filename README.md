# Pi extensions

Pi extensions by [qch2012](https://github.com/qch2012).

## Included extensions and skills

- [`hide-tools`](./hide-tools): hides successful built-in tool rows while keeping failures visible.
- [`pi-grill-autoresearch`](./pi-grill-autoresearch): grills a measurable campaign contract, then starts or resumes [pi-autoresearch 1.8.1](https://github.com/davebcn87/pi-autoresearch) in an isolated worktree.

## Install

```bash
pi install git:github.com/qch2012/pi-extensions
```

`pi-grill-autoresearch` also requires:

```bash
pi install npm:pi-autoresearch
```

Manage individual extensions with `pi config`.

```bash
pi update --extensions
pi remove git:github.com/qch2012/pi-extensions
```

## Development

Run automated checks:

```bash
npm test
```

Test an extension directly:

```bash
pi -e ./hide-tools/hide-tools.ts
```
