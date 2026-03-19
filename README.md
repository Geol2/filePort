# filePort — Dropzone 기반 파일 첨부 업로더

드래그&드롭 파일 첨부 UI 컴포넌트입니다.
[Dropzone.js](https://www.dropzone.dev/) v5.9.3이 번들에 포함되어 있어 별도 설치 없이 `fileport`만 import하면 됩니다.
**TypeScript**로 작성되어 타입 정의 파일(`.d.ts`)이 함께 제공됩니다.

---

## 파일 구조

```text
filePort/
├── src/                          # 소스 (TypeScript)
│   ├── filePort.ts               # 진입점 — createUploader() export
│   ├── fileManager.ts            # 파일 상태 관리 (순수 로직, DOM 없음)
│   ├── renderer.ts               # 테이블 렌더링 + 이벤트 위임
│   ├── dzEvents.ts               # Dropzone 초기화 + 이벤트 핸들러
│   ├── types.ts                  # 공용 타입 정의
│   ├── filePort.css              # 업로더 스타일 — 테이블·상태·버튼
│   └── dropzone/
│       ├── dropzone.min.js       # Dropzone.js 라이브러리 (번들에 포함)
│       ├── dropzone.min.css      # Dropzone.js 기본 스타일 (불필요)
│       └── dropzone.min.d.ts     # Dropzone 타입 선언
├── dist/                         # 빌드 결과물
│   ├── filePort.js               # ESM (Dropzone 포함)
│   ├── filePort.iife.js          # IIFE (바닐라 script 태그용)
│   ├── filePort.d.ts             # 메인 타입 정의
│   ├── types.d.ts                # 공용 타입 (UploaderOptions, FileItem 등)
│   ├── fileManager.d.ts
│   ├── renderer.d.ts
│   └── dzEvents.d.ts
├── example/
│   ├── html/                     # 프론트엔드 단독 실행 예제 (백엔드 불필요)
│   ├── express/                  # Express.js 백엔드 예제
│   ├── react/                    # React 예제
│   ├── jsp/                      # JSP + Spring Boot 예제
│   └── backend-spring/           # Thymeleaf + Spring Boot 예제
├── tsconfig.json
├── vite.config.ts
├── package.json
├── THIRD_PARTY_LICENSES.md
└── README.md
```

---

## 빌드 (ESM / IIFE)

`src/filePort.ts`를 Vite 라이브러리 모드로 빌드하면 ESM, IIFE, 타입 정의를 동시에 생성합니다.

```bash
npm install
npm run build   # → dist/ 생성
```

```text
dist/
├── filePort.js        # ESM   (Dropzone 포함)
├── filePort.iife.js   # IIFE  (Dropzone 포함)
└── *.d.ts             # 타입 정의
```

> Dropzone JS는 번들에 포함됩니다. Dropzone CSS는 필요하지 않습니다 (`previewsContainer: false`로 Dropzone 기본 UI 비활성화).

---

## 설치

```bash
npm install fileport
```

---

## 사용법

### TypeScript / ESM

```ts
import { createUploader, type UploaderOptions } from 'fileport'
import 'fileport/src/filePort.css'

const options: UploaderOptions = {
    uploadUrl:   '/upload',
    docKindList: [
        { id: 'CONTRACT', name: '계약서' },
        { id: 'INVOICE',  name: '청구서' },
        { id: 'OTHER',    name: '기타' },
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

### 바닐라 (script 태그 방식)

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

    return (/* HTML 구조 */)
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

## HTML 구조

`elementConfig`의 ID와 일치하는 요소가 필요합니다.

```html
<link rel="stylesheet" href="/filePort.css">

<div id="tableWrapper" class="table-wrapper">
    <div class="table-scroll">
        <table id="fileTable">
            <thead>
                <tr>
                    <th><input type="checkbox" id="checkAll"></th>
                    <th>파일명</th>
                    <th>문서종류</th>
                    <th>크기</th>
                    <th>상태</th>
                    <th>작업</th>
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

<button id="btnFileAdd">파일 추가</button>
<button id="btnInsert">등록</button>

<script src="/filePort.iife.js"></script>
<!-- Dropzone JS/CSS 별도 로드 불필요 -->
```

---

## `createUploader` 옵션

| 옵션 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `elementConfig` | `Partial<ElementConfig>` | 기본 ID 맵 | DOM ID 매핑 (아래 표 참고) |
| `uploadUrl` | `string` | `'/upload'` | 파일 업로드 서버 URL |
| `maxFilesize` | `number` | `10` | 최대 파일 크기 (MB) |
| `acceptedFiles` | `string \| null` | `null` | 허용 확장자 (예: `'.pdf,.docx'`) |
| `showDocKind` | `boolean` | `true` | 문서종류 열 표시 여부 |
| `docKindList` | `DocKind[]` | `[]` | 문서종류 선택 목록 — 비어있으면 정적 텍스트 표시 |
| `submitBtnId` | `string` | `'btnInsert'` | 등록 버튼 id |
| `getMessage` | `(key: string) => string` | 내장 한국어 | i18n 메시지 반환 함수 |
| `getExtra` | `() => Record<string, unknown>` | `() => ({})` | 추가 콘텐츠 필드 반환 함수 |
| `onSubmit` | `(payload: SubmitPayload) => void` | `() => {}` | 업로드 완료 후 콜백 |

### `elementConfig` 기본값

| 키 | 기본값 | 역할 |
| --- | --- | --- |
| `wrapperId` | `tableWrapper` | Dropzone 드롭 영역 |
| `fileAddBtnId` | `btnFileAdd` | 파일 선택 버튼 (`clickable`) |
| `tableId` | `fileTable` | 파일 목록 `<table>` |
| `tbodyId` | `fileList` | 파일 목록 `<tbody>` |
| `checkAllId` | `checkAll` | 전체선택 체크박스 |
| `footerSizeId` | `footerSize` | 파일 크기·건수 표시 |
| `progressFillId` | `progressFill` | 진행 바 fill |
| `footerPercentId` | `footerPercent` | 업로드 퍼센트 |

### `SubmitPayload` 타입

```ts
interface SubmitPayload {
    files: SubmitFileItem[]           // 업로드 완료된 파일 목록
    extra: Record<string, unknown>    // getExtra() 반환값
    done:  (success?: boolean) => void // 등록 완료 후 반드시 호출
}
```

---

## 공개 API

```ts
const uploader = createUploader({ ... })

uploader.init()                          // DOM 준비 후 호출 — Dropzone·이벤트·렌더링 초기화
uploader.startSubmit()                   // 등록 버튼 핸들러 — 업로드 시작 또는 onSubmit 직접 호출
uploader.addFileInfo(data, type)         // 스캔·기존 파일 직접 추가 ('scan' | 'modify')

uploader.fileManager                     // FileManager 인스턴스 (files[], updateStatus 등)
uploader.myDropzone                      // Dropzone 인스턴스 (Dropzone.Dropzone | null)
uploader.isProcessing                    // 처리 중 여부 (boolean)
```

---

## 업로드 케이스별 흐름

| 케이스 | 설명 | 흐름 |
| --- | --- | --- |
| 1 | 새 파일만 | `startSubmit` → `processQueue` → `queuecomplete` → `onSubmit` |
| 2 | 스캔 파일만 | `addFileInfo(data, 'scan')` → `startSubmit` → `onSubmit` 직접 |
| 3 | 기존 파일만 (수정 모드) | `addFileInfo(data, 'modify')` → `startSubmit` → `onSubmit` 직접 |
| 4 | 스캔 + 새 파일 혼합 | `startSubmit` → `processQueue` → `queuecomplete` → `onSubmit` 일괄 |
| 5 | 일부 실패 | `queuecomplete` → 성공 파일 없음 → 버튼 재활성화·재시도 유도 |

---

## 예제

| 예제 | 설명 | 실행 |
| --- | --- | --- |
| `example/html/` | 백엔드 없이 브라우저에서 직접 실행 | `index.html` 브라우저로 열기 |
| `example/express/` | Express.js 백엔드 | `npm install && npm start` → `http://localhost:3000` |
| `example/react/` | React + Vite | `npm install && npm run dev` |
| `example/jsp/` | JSP + Spring Boot | Gradle 빌드 후 실행 |
| `example/backend-spring/` | Thymeleaf + Spring Boot | `http://localhost:8090` |
