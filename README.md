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
│   ├── locales/                  # Built-in language packs
│   │   ├── index.ts              # Locale registry (LOCALES, DEFAULT_LOCALE)
│   │   ├── ko.ts                 # Korean pack
│   │   └── en.ts                 # English pack
│   └── dropzone/
│       ├── dropzone.min.js       # Dropzone.js library (included in bundle)
│       ├── dropzone.min.css      # Dropzone.js default styles (not required)
│       └── dropzone.min.d.ts     # Dropzone type declarations
├── dist/                         # Build output (three variants)
│   ├── esm/                      # ESM bundle — for bundlers / `import`
│   │   ├── filePort.js           #   ESM (Dropzone included, minified)
│   │   ├── filePort.css          #   Bundled styles
│   │   └── *.d.ts                #   Type defs (filePort, types, fileManager, renderer, ...)
│   ├── min/                      # Minified IIFE — for a plain <script> tag
│   │   ├── filePort.iife.js      #   IIFE, global window.FilePort (minified)
│   │   └── filePort.css
│   └── dev/                      # Unminified IIFE — readable / legacy jQuery.html() injection
│       ├── filePort.iife.js      #   IIFE, global window.FilePort (unminified)
│       └── filePort.css
├── example/
│   ├── html/                     # Frontend-only example (no backend required)
│   ├── builder/                  # Drag-and-drop column layout builder
│   ├── express/                  # Express.js backend example
│   ├── react/                    # React example
│   ├── jsp/                      # JSP + Spring Boot example
│   └── backend-spring/           # Thymeleaf + Spring Boot example
├── tsconfig.json
├── vite.config.ts                # ESM build config      (dist/esm + .d.ts)
├── vite.min.config.ts            # Minified IIFE config   (dist/min)
├── vite.dev.config.ts            # Unminified IIFE config (dist/dev)
├── package.json
├── THIRD_PARTY_LICENSES.md
└── README.md
```

---

## Build (ESM / IIFE)

Building `src/filePort.ts` with Vite library mode produces three variants plus type definitions.

```bash
npm install
npm run build   # → generates dist/esm, dist/min, dist/dev
```

```text
dist/
├── esm/filePort.js        # ESM  (Dropzone included, minified) + *.d.ts
├── min/filePort.iife.js   # IIFE (Dropzone included, minified)   — global window.FilePort
└── dev/filePort.iife.js   # IIFE (unminified, readable)          — global window.FilePort
```

`npm run build` runs all three. You can also run them separately:

| Script | Output | Use |
| --- | --- | --- |
| `npm run build:esm` | `dist/esm/filePort.js` (+ `.d.ts`) | bundlers / `import` |
| `npm run build:min` | `dist/min/filePort.iife.js` | plain `<script>` tag (production) |
| `npm run build:dev` | `dist/dev/filePort.iife.js` | reading / debugging; also legacy pages that inject markup via `jQuery.html()` (a classic `<script src>` runs synchronously, unlike an ES module) |

> Dropzone JS is included in the bundle. Dropzone CSS is not required (Dropzone's default UI is disabled via `previewsContainer: false`).

---

## Publish

```bash
npm login

# bump the "version" field in package.json first

npm publish
```

## Installation

```bash
npm install fileport
```

---

## Usage

### TypeScript / ESM

```ts
import { createUploader, type UploaderOptions } from 'fileport'
import 'fileport/css'

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
import 'fileport/css'

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
<link rel="stylesheet" href="dist/min/filePort.css">
<script src="dist/min/filePort.iife.js"></script>
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
import 'fileport/css'

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

Elements matching the IDs in `elementConfig` are required. The table is **div-based**
(`.fp-table` / `.fp-thead` / `.fp-tbody`) — the library renders the rows (and, in `columns`
mode, the header too), so you only supply the empty containers, not a native `<table>`.

```html
<link rel="stylesheet" href="/filePort.css">

<div id="tableWrapper" class="table-wrapper">
    <div class="table-scroll">
        <div id="fileTable" class="fp-table">
            <!-- .fp-thead header is rendered by the library in columns mode -->
            <div id="fileList" class="fp-tbody"></div>
        </div>
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
| `simple` | `boolean` | `false` | Simple 4-column mode (no checkbox / document type columns) |
| `docKindList` | `DocKind[]` | `[]` | Document type list — shows static text if empty |
| `submitBtnId` | `string` | `'btnInsert'` | Submit button id |
| `columns` | `ColumnDef[]` | — | Configure column order / visibility / header (see [Column layout](#column-layout)). When set, the library renders the header too and `simple` is ignored |
| `columnSettings` | `boolean \| ColumnSettingsOptions` | — | Built-in gear (⚙) panel for end-user column personalization. `{ storageKey, title }`; with `storageKey`, show/order is saved to localStorage. Requires `columns` |
| `onColumnsChange` | `(columns: ColumnDef[]) => void` | — | Called when the column config changes (⚙ edit or `setColumns`) — for external-module sync |
| `locale` | `'ko' \| 'en'` | `'ko'` | Built-in language pack (see [Internationalization](#internationalization-i18n)) |
| `messages` | `Partial<Record<MessageKey, string>>` | `{}` | Override specific messages on top of the locale pack |
| `getMessage` | `(key: string) => string` | — | Delegate message resolution entirely (e.g. i18next). Highest priority |
| `getExtra` | `() => Record<string, unknown>` | `() => ({})` | Function returning additional content fields |
| `onSubmit` | `(payload: SubmitPayload) => void` | `() => {}` | Callback after upload completion |
| `onError` | `(fileName: string, message: string) => void` | `alert(...)` | Callback on upload error |

### `elementConfig` Defaults

| Key | Default | Role |
| --- | --- | --- |
| `wrapperId` | `tableWrapper` | Dropzone drop area |
| `fileAddBtnId` | `btnFileAdd` | File selection button (`clickable`) |
| `tableId` | `fileTable` | File list container (`.fp-table` div) |
| `tbodyId` | `fileList` | File list body (`.fp-tbody` div) |
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

## Internationalization (i18n)

All user-facing text is managed through message keys, so the UI language can be switched without touching the markup. Built-in language packs are bundled (`ko`, `en`).

### Resolution priority

When resolving a message key, the following sources are tried in order (highest first):

1. **`getMessage`** — external resolver (e.g. i18next); used when it returns a value different from the key
2. **`messages`** — your partial overrides
3. **`locale` pack** — the selected built-in pack (default `'ko'`)
4. **the key itself** — fallback when nothing matches

### Usage

```js
// 1) Built-in English pack
createUploader({ locale: 'en' })

// 2) English pack + override a few strings
createUploader({
    locale: 'en',
    messages: {
        'web.file.action.delete': 'Remove',
        'web.file.status.success': 'Complete',
    },
})

// 3) Delegate entirely to an external i18n library
createUploader({
    getMessage: (key) => i18next.t(key),
})
```

### Message keys

| Key | `ko` | `en` |
| --- | --- | --- |
| `web.confirm.file.fileUploadPlz` | 파일을 이곳에 드래그하거나 버튼을 클릭하세요 | Drag files here or click the button |
| `web.file.countUnit` | 건 | ` file(s)` |
| `web.file.status.pending` | 대기 | Pending |
| `web.file.status.uploading` | 업로드중 | Uploading |
| `web.file.status.success` | 완료 | Done |
| `web.file.status.error` | 오류 | Error |
| `web.file.status.registered` | 업로드완료 | Uploaded |
| `web.file.docKind.placeholder` | 선택 | Select |
| `web.file.action.delete` | 삭제 | Delete |
| `web.js.error.upload` | 업로드 중 오류가 발생했습니다. 다시 첨부해 주세요. | An error occurred during upload. Please attach the file again. |
| `web.file.column.check` | 선택 | Select |
| `web.file.column.name` | 파일명 | Name |
| `web.file.column.dockind` | 문서종류 | Type |
| `web.file.column.size` | 크기 | Size |
| `web.file.column.status` | 상태 | Status |
| `web.file.column.action` | 작업 | Action |
| `web.file.columnSettings` | 컬럼 설정 | Column settings |

### Adding a language

1. Copy `src/locales/ko.ts` to a new file (e.g. `ja.ts`) and translate the values
2. Add the code to `LocaleCode` in `src/types.ts`
3. Register it in `LOCALES` in `src/locales/index.ts`

The `Messages` type forces every pack to define all keys, so a missing translation fails the build.

---

## Column layout

By default the table renders a fixed set of columns (checkbox · name · document type · size · status · action), with the header written as static HTML by you. Pass `columns` to control the **order, visibility, and header label** declaratively — when set, the library renders the `.fp-thead` header too, so header and body always stay in sync (and the `simple` option is ignored).

```ts
interface ColumnDef {
    key:      'check' | 'name' | 'dockind' | 'size' | 'status' | 'action'
    header?:  string   // header label; omit to use the locale default (web.file.column.*). Ignored for 'check'
    visible?: boolean  // default true; false removes the column from both header and body
}
```

```js
createUploader({
    columns: [
        { key: 'status' },                       // reordered to the front
        { key: 'name', header: 'File name' },    // custom header label
        { key: 'size' },
        { key: 'action' },
        // 'check' and 'dockind' omitted → not rendered
    ],
})
```

When `columns` is set, your table only needs an empty header container; the library fills it in:

```html
<div id="fileTable" class="fp-table">
    <div class="fp-thead"></div>      <!-- rendered by the library from columns -->
    <div id="fileList" class="fp-tbody"></div>
</div>
```

### Visual builder

`example/builder/index.html` is a no-backend drag-and-drop builder: reorder columns by dragging, toggle visibility, edit header labels, and see a live preview. It outputs both the `columns` JSON and a ready-to-paste `createUploader` snippet. Open it directly in a browser (after `npm run build`, since it loads `dist/min/filePort.iife.js`).

### Runtime updates (external modules)

`columns` and `docKindList` can be replaced at runtime, so an external module (menu switch, permission change, etc.) can push a new config:

```js
menu.on('change', (cfg) => {
    uploader.setColumns(cfg.columns)       // replace columns + re-render header/body
    uploader.setDocKindList(cfg.docKinds)  // refresh the document-type <select>
})
```

### User personalization (⚙)

Set `columnSettings` to embed a gear button (top-right of the wrapper) that lets the **end user** reorder columns and toggle visibility. With a `storageKey`, their choices are saved to localStorage and restored on the next visit:

```js
createUploader({
    columns: baseColumns,
    columnSettings: { storageKey: 'my-table-cols' },
    onColumnsChange: (cols) => { /* optional: sync to a server */ },
})
```

Personalization is **merged on top of the base columns**: when an external module calls `setColumns(newBase)`, the saved order/visibility is re-applied to the new base, so user preferences survive config changes. (The gear panel adjusts order and visibility only — header labels stay as defined in `columns`.)

### Row click to toggle

When the `check` column is present, clicking anywhere on a row (name / size / status …) toggles that row's checkbox. Clicking the checkbox itself, the document-type `<select>`, or the delete button keeps its own behavior and does **not** double-toggle. Rows without a `check` column ignore row clicks.

---

## Public API

```ts
const uploader = createUploader({ ... })

uploader.init()                          // Call after DOM is ready — initializes Dropzone, events, and rendering
uploader.startSubmit()                   // Submit button handler — starts upload or calls onSubmit directly
uploader.addFileInfo(data, type)         // Directly add scanned or existing files ('scan' | 'modify')

uploader.setColumns(columns)             // Replace column config at runtime (re-applies saved personalization)
uploader.getColumns()                    // Current applied column config (ColumnDef[] | null)
uploader.setDocKindList(list)            // Replace the document-type list at runtime
uploader.toggleDocKind(show)             // Show/hide the document-type column at runtime

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
| `example/builder/` | Drag-and-drop column layout builder | Open `index.html` in a browser (after `npm run build`) |
| `example/express/` | Express.js backend | `npm install && npm start` → `http://localhost:3000` |
| `example/react/` | React + Vite | `npm install && npm run dev` |
| `example/jsp/` | JSP + Spring Boot | Build with Gradle and run |
| `example/backend-spring/` | Thymeleaf + Spring Boot | `http://localhost:8090` |
