# tex-to-typst

[![tex-to-typst on npm](https://img.shields.io/npm/v/tex-to-typst.svg)](https://www.npmjs.com/package/tex-to-typst)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/curvenote/tex-to-typst/blob/main/LICENSE)
![CI](https://github.com/curvenote/tex-to-typst/workflows/CI/badge.svg)

A utility for translating LaTeX math to typst.

> **Note**: The library is in alpha, it will likely not work for the majority of math at the moment! More updates to come soon!

```shell
npm install tex-to-typst
```

The library uses `@unified-latex` for the LaTeX parsing.

## Overview & Usage

```ts
import { texToTypst } from 'tex-to-typst';

const typst = texToTypst(
  '\\frac{1}{4} \\sum_{i=1}^4 \\mathbf{P}_i^\\top \\sqrt{v} \\mathbf{\\Sigma}^{-1} \\sqrt{v} \\mathbf{P}_i \\mathbf{j} = \\mathbf{D}^\\top v \\phi',
);

console.log(typst);
// frac(1, 4) sum_(i = 1)^4 bold(P)_i^top sqrt(v) bold(Sigma)^(-1) sqrt(v) bold(P)_i bold(j) = bold(D)^top v phi
```

## Included Utilities

- `texToTypst` - translates tex markup to an equivalent typst string

---

This package is [ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

---

<p style="text-align: center; color: #aaa; padding-top: 50px">
  Made with love by
  <a href="https://curvenote.com" target="_blank" style="color: #aaa">
    <img src="https://curvenote.dev/images/icon.png" style="height: 1em" /> Curvenote
  </a>
</p>
