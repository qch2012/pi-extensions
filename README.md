# Pi extensions

Pi extensions by [qch2012](https://github.com/qch2012).

## Included extensions

- [`hide-tools`](./hide-tools): hides successful built-in tool rows while keeping failures visible.

## Install

```bash
pi install git:github.com/qch2012/pi-extensions
```

Manage individual extensions with `pi config`.

```bash
pi update --extensions
pi remove git:github.com/qch2012/pi-extensions
```

## Development

Test an extension directly:

```bash
pi -e ./hide-tools/hide-tools.ts
```
