# fast-sheets

Render over million cells instantly!
Fast-sheet uses WebGL to render massive data grids


## Installation

```bash
npm install fast-sheets
```

## Usage

```typescript
import { FastSheets } from 'fast-sheets'

const elContainer = document.getElementById('fast-sheets')
if (elContainer) {
  new FastSheets({
    elContainer,
    data: [
      ['cell 1 : 1', 'cell 1 : 2'],
      ['cell 2 : 1', 'cell 2 : 2'],
    ]
  })
}
```

📚[Documentation](https://fastsheets.io/docs.html)


## Integrations demo

- [vue](https://github.com/fast-sheets/fast-sheets/tree/main/apps/vue-demo)
- [react](https://github.com/fast-sheets/fast-sheets/tree/main/apps/react-demo)
- [vanilla-ts](https://github.com/fast-sheets/fast-sheets/tree/main/apps/vanilla-ts-demo)
- [vanilla-js](https://github.com/fast-sheets/fast-sheets/tree/main/apps/vanilla-js-demo)


## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2026-present, [Dmitry Savchenkov](https://github.com/coldshine)