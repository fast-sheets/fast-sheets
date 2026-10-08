# fast-sheets

Render over million cells instantly!


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


## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2026-present, [Dmitry Savchenkov](https://github.com/coldshine)