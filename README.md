# filePort — Dropzone-based File Attachment Uploader

A drag & drop file attachment UI component.
[Dropzone.js](https://www.dropzone.dev/) v5.9.3 is bundled, so you only need to import `fileport` without installing it separately.
Written in **TypeScript**, with type definition files (`.d.ts`) included.

---

## File Structure

```text
filePort/
├── src/                          # Source (TypeScript)
│   ├── filePort.ts               # Entry point — exports createUploader()
│   ├── fileManager.ts            # File state management (pure logic, no DOM)
│   ├── renderer.ts               # Table rendering + event delegation
│   ├── dzEvents.ts               # Dropzone initialization + event handlers
│   ├── types.ts                  # Shared type definitions
│   ├── filePort.css              # Uploader styles — table, status, buttons
│   └── dropzone/
│       ├── dropzone.min.js       # Dropzone.js library (included in bundle)
│       ├── dropzone.min.css      # Dropzone.js default styles (not required)
│       └── dropzone.min.d.ts     # Dropzone type declarations
├── dist/                         # Build output
│   ├── filePort.js               # ESM (Dropzone included)
│   ├── filePort.iife.js          # IIFE (for vanilla script tag usage)
│   ├── filePort.d.ts             # Main type definitions
│   ├── types.d.ts                # Shared types (UploaderOptions, FileItem, etc.)
│   ├── fileManager.d.ts
│   ├── renderer.d.ts
│   └── dzEvents.d.ts
├── example/
│   ├── html/                     # Frontend-only example (no backend required)
│   ├── express/                  # Express.js backend example
│   ├── react/                    # React example
│   ├── jsp/                      # JSP + Spring Boot example
│   └── backend-spring/           # Thymeleaf + Spring Boot example
├── tsconfig.json
├── vite.config.ts
├── package.json
├── THIRD_PARTY_LICENSES.md
└── README.md
```

---

## Build (ESM / IIFE)

Building `src/filePort.ts` with Vite library mode generates ESM, IIFE, and type definitions simultaneously.

```bash
npm install
npm run build   # → generates dist/
```

```text
dist/
├── filePort.js        # ESM   (Dropzone included)
├── filePort.iife.js   # IIFE  (Dropzone included)
└── *.d.ts             # Type definitions
```

> Dropzone JS is included in the bundle. Dropzone CSS is not required (Dropzone's default UI is disabled via `previewsContainer: false`).

---

## Installation

```bash
npm install fileport
```

---

## Usage

### TypeScript / ESM

```ts
import { createUploader, type UploaderOptions } from 'fileport'
import 'fileport/src/filePort.css'

const options: UploaderOptions = {
    uploadUrl:   '/upload',
    docKindList: [
        { id: 'CONTRACT', name: 'Contract' },
        { id: 'INVOICE',  name: 'Invoice' },
        { id: 'OTHER',    name: 'Other' },
    ],
    onSubmit: ({ files, extra, done }) => {
        fetch('/api/contents/insert', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ ...extra, files }),
        }).then(() => done(true))
    },
}

const uploader = createUploader(options)
uploader.init()

document.getElementById('btnInsert')!.onclick = () => uploader.startSubmit()
```

### JavaScript / ESM

```js
import { createUploader } from 'fileport'
import 'fileport/src/filePort.css'

const uploader = createUploader({
    uploadUrl:   '/upload',
    onSubmit: ({ files, extra, done }) => {
        fetch('/api/contents/insert', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ ...extra, files }),
        }).then(() => done(true))
    },
})

uploader.init()
document.getElementById('btnInsert').onclick = () => uploader.startSubmit()
```

### Vanilla (script tag)

```html
<link rel="stylesheet" href="filePort.css">
<script src="dist/filePort.iife.js"></script>
<script>
    const uploader = FilePort.createUploader({
        uploadUrl: '/upload',
        onSubmit: ({ files, extra, done }) => {
            done(true)
        },
    })
    uploader.init()

    document.getElementById('btnInsert').onclick = () => uploader.startSubmit()
</script>
```

### React (TypeScript)

```tsx
import { useEffect, useRef } from 'react'
import { createUploader, type UploaderOptions } from 'fileport'
import 'fileport/src/filePort.css'

export default function FileUploader() {
    const uploaderRef = useRef<ReturnType<typeof createUploader> | null>(null)

    useEffect(() => {
        const uploader = createUploader({
            uploadUrl: '/upload',
            onSubmit: ({ files, extra, done }) => {
                fetch('/api/contents/insert', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ ...extra, files }),
                }).then(() => done(true))
            },
        })
        uploader.init()
        uploaderRef.current = uploader
        return () => { uploaderRef.current?.myDropzone?.destroy() }
    }, [])

    return (/* HTML structure */)
}
```

### Thymeleaf + Spring Boot

```html
<link rel="stylesheet" th:href="@{/filePort.css}">
<script th:src="@{/filePort.iife.js}"></script>

<script th:inline="javascript">
    const uploader = FilePort.createUploader({
        uploadUrl: /*[[@{/upload}]]*/ '/upload',
        onSubmit: ({ files, extra, done }) => {
            fetch(/*[[@{/api/contents/insert}]]*/ '/api/contents/insert', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ ...extra, files }),
            }).then(() => done(true))
        },
    })
    uploader.init()
</script>
```

---

## HTML Structure

Elements matching the IDs in `elementConfig` are required.

```html
<link rel="stylesheet" href="/filePort.css">

<div id="tableWrapper" class="table-wrapper">
    <div class="table-scroll">
        <table id="fileTable">
            <thead>
                <tr>
                    <th><input type="checkbox" id="checkAll"></th>
                    <th>File name</th>
                    <th>Document type</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody id="fileList"></tbody>
        </table>
    </div>
    <div class="table-footer">
        <span id="footerSize"></span>
        <div class="footer-progress">
            <div class="progress-bar-wrap">
                <div class="progress-bar-fill" id="progressFill"></div>
            </div>
            <span id="footerPercent"></span>
        </div>
    </div>
</div>

<button id="btnFileAdd">Add file</button>
<button id="btnInsert">Submit</button>

<script src="/filePort.iife.js"></script>
<!-- No need to load Dropzone JS/CSS separately -->
```

---

## `createUploader` Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `elementConfig` | `Partial<ElementConfig>` | Default ID map | DOM ID mapping (see table below) |
| `uploadUrl` | `string` | `'/upload'` | File upload server URL |
| `maxFilesize` | `number` | `10` | Maximum file size (MB) |
| `acceptedFiles` | `string \| null` | `null` | Allowed extensions (e.g., `'.pdf,.docx'`) |
| `showDocKind` | `boolean` | `true` | Whether to show the document type column |
| `docKindList` | `DocKind[]` | `[]` | Document type list — shows static text if empty |
| `submitBtnId` | `string` | `'btnInsert'` | Submit button id |
| `getMessage` | `(key: string) => string` | Built-in Korean | Function returning i18n messages |
| `getExtra` | `() => Record<string, unknown>` | `() => ({})` | Function returning additional content fields |
| `onSubmit` | `(payload: SubmitPayload) => void` | `() => {}` | Callback after upload completion |

### `elementConfig` Defaults

| Key | Default | Role |
| --- | --- | --- |
| `wrapperId` | `tableWrapper` | Dropzone drop area |
| `fileAddBtnId` | `btnFileAdd` | File selection button (`clickable`) |
| `tableId` | `fileTable` | File list `<table>` |
| `tbodyId` | `fileList` | File list `<tbody>` |
| `checkAllId` | `checkAll` | Select-all checkbox |
| `footerSizeId` | `footerSize` | Displays file size and count |
| `progressFillId` | `progressFill` | Progress bar fill |
| `footerPercentId` | `footerPercent` | Upload percentage |

### `SubmitPayload` Type

```ts
interface SubmitPayload {
    files: SubmitFileItem[]           // List of successfully uploaded files
    extra: Record<string, unknown>    // Value returned by getExtra()
    done:  (success?: boolean) => void // Must be called after submission completes
}
```

---

## Public API

```ts
const uploader = createUploader({ ... })

uploader.init()                          // Call after DOM is ready — initializes Dropzone, events, and rendering
uploader.startSubmit()                   // Submit button handler — starts upload or calls onSubmit directly
uploader.addFileInfo(data, type)         // Directly add scanned or existing files ('scan' | 'modify')

uploader.fileManager                     // FileManager instance (files[], updateStatus, etc.)
uploader.myDropzone                      // Dropzone instance (Dropzone.Dropzone | null)
uploader.isProcessing                    // Whether processing is in progress (boolean)
```

---

## Upload Flow by Case

| Case | Description | Flow |
| --- | --- | --- |
| 1 | New files only | `startSubmit` → `processQueue` → `queuecomplete` → `onSubmit` |
| 2 | Scanned files only | `addFileInfo(data, 'scan')` → `startSubmit` → `onSubmit` directly |
| 3 | Existing files only (edit mode) | `addFileInfo(data, 'modify')` → `startSubmit` → `onSubmit` directly |
| 4 | Scanned + new files mixed | `startSubmit` → `processQueue` → `queuecomplete` → `onSubmit` together |
| 5 | Partial failure | `queuecomplete` → no successful files → re-enable button, prompt retry |

---

## Examples

| Example | Description | Run |
| --- | --- | --- |
| `example/html/` | Run directly in the browser without a backend | Open `index.html` in a browser |
| `example/express/` | Express.js backend | `npm install && npm start` → `http://localhost:3000` |
| `example/react/` | React + Vite | `npm install && npm run dev` |
| `example/jsp/` | JSP + Spring Boot | Build with Gradle and run |
| `example/backend-spring/` | Thymeleaf + Spring Boot | `http://localhost:8090` |
