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

- [vue](apps/vue-demo)
- [react](apps/react-demo)
- [vanilla-ts](apps/vanilla-ts-demo)
- [vanilla-js](apps/vanilla-js-demo)


## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2026-present, [Dmitry Savchenkov](https://github.com/coldshine)