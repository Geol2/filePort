# filePort — Dropzone 기반 파일 첨부 업로더

드래그&드롭 파일 첨부 UI 컴포넌트입니다.
[Dropzone.js](https://www.dropzone.dev/) v5.9.3을 기반으로 동작하며, 커스텀 테이블 렌더링·상태 관리·업로드 흐름 제어 로직이 포함되어 있습니다.

---

## 파일 구조

```text
filePort/
├── src/                          # 빌드 소스 (ES 모듈)
│   ├── filePort.js               # 진입점 — createUploader() export
│   ├── fileManager.js            # 파일 상태 관리 (순수 로직, DOM 없음)
│   ├── renderer.js               # 테이블 렌더링 + 이벤트 위임
│   └── dzEvents.js               # Dropzone 초기화 + 이벤트 핸들러
├── dist/                         # 빌드 결과물
│   ├── filePort.js               # ESM
│   └── filePort.iife.js          # IIFE (바닐라 script 태그용)
├── dropzone/
│   ├── dropzone.min.js           # Dropzone.js 라이브러리 (서드파티)
│   ├── dropzone.min.css          # Dropzone.js 기본 스타일 (서드파티)
│   ├── dropzoneUploader.js       # 레거시 전역 변수 방식 (기존 페이지용)
│   └── dropzoneUploader.css      # 업로더 스타일 — 테이블·상태·버튼
├── example/
│   ├── index.html                # 프론트엔드 단독 실행 예제 (백엔드 불필요)
│   └── backend/                  # Spring Boot 백엔드 예제
│       ├── build.gradle
│       └── src/main/
│           ├── java/com/example/fileport/
│           │   ├── controller/
│           │   │   ├── FileUploadController.java   # POST /upload
│           │   │   ├── ContentsController.java     # POST /api/contents/insert
│           │   │   └── IndexController.java        # GET /
│           │   ├── service/
│           │   │   ├── FileService.java            # 파일 저장 로직
│           │   │   └── ContentsService.java        # 콘텐츠 등록 로직
│           │   └── dto/
│           │       ├── FileUploadResponse.java     # { "id": "서버파일명" }
│           │       └── ContentsInsertRequest.java  # 등록 요청 body
│           └── resources/
│               ├── templates/index.html            # Thymeleaf 템플릿
│               ├── static/                         # 정적 파일 (빌드 결과 복사)
│               └── application.yml
├── vite.config.js
├── package.json
├── THIRD_PARTY_LICENSES.md
└── README.md
```

---

## 빌드 (ESM / IIFE)

`src/filePort.js`를 Vite 라이브러리 모드로 빌드하면 ESM과 바닐라(IIFE) 두 포맷을 동시에 생성합니다.

```bash
npm install
npm run build   # → dist/ 생성
```

```text
dist/
├── filePort.js        # ESM   (10.7 kB / gzip 3.7 kB)
└── filePort.iife.js   # IIFE  ( 8.2 kB / gzip 3.4 kB)
```

> Dropzone 라이브러리는 external 처리됩니다. 사용자가 직접 로드해야 합니다.

---

## 사용법

### ESM (import 방식)

```js
import { createUploader } from './dist/filePort.js'
import Dropzone from 'dropzone'   // Dropzone은 별도 import

const uploader = createUploader({
    getMessage: (key) => myI18n(key),
    uploadUrl:  '/upload',
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
<script src="dropzone/dropzone.min.js"></script>
<script src="dist/filePort.iife.js"></script>
<script>
    const uploader = FilePort.createUploader({
        getMessage: (key) => myI18n(key),
        uploadUrl:  '/upload',
        onSubmit: ({ files, extra, done }) => {
            done(true)
        },
    })
    uploader.init()

    document.getElementById('btnInsert').onclick = () => uploader.startSubmit()
</script>
```

### Thymeleaf + Spring Boot

```html
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
<link rel="stylesheet" href="/dropzone.min.css">
<link rel="stylesheet" href="/dropzoneUploader.css">

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

<script src="/dropzone.min.js"></script>
<script src="/filePort.iife.js"></script>
```

---

## `createUploader` 옵션

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `elementConfig` | 기본 ID 맵 | DOM ID 매핑 (아래 표 참고) |
| `uploadUrl` | `'/upload'` | 파일 업로드 서버 URL |
| `maxFilesize` | `10` | 최대 파일 크기 (MB) |
| `acceptedFiles` | `null` | 허용 확장자 (예: `'.pdf,.docx'`) |
| `showDocKind` | `true` | 문서종류 열 표시 여부 |
| `submitBtnId` | `'btnInsert'` | 등록 버튼 id |
| `getMessage` | 내장 한국어 | i18n 메시지 반환 함수 `(key) => string` |
| `getExtra` | `() => ({})` | 추가 콘텐츠 필드 반환 함수 |
| `onSubmit` | `() => {}` | 업로드 완료 후 콜백 `({ files, extra, done })` |

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

---

## 공개 API

```js
const uploader = createUploader({ ... })

uploader.init()                      // DOM 준비 후 호출 — Dropzone·이벤트·렌더링 초기화
uploader.startSubmit()               // 등록 버튼 핸들러 — 업로드 시작 또는 onSubmit 직접 호출
uploader.addFileInfo(data, type)     // 스캔·기존 파일 직접 추가 ('scan' | 'modify')

uploader.fileManager                 // 파일 목록 상태 객체 (files[], updateStatus 등)
uploader.myDropzone                  // Dropzone 인스턴스
uploader.isProcessing                // 처리 중 여부
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

## 레거시 (전역 변수 방식)

`dropzone/dropzoneUploader.js`는 기존 페이지 호환을 위해 유지됩니다.
`window.fileManager`, `window.myDropzone` 등 전역 변수를 직접 사용하는 방식으로, 새 프로젝트에는 `createUploader` 방식을 권장합니다.

---

## 예제

`example/index.html`을 브라우저에서 직접 열면 백엔드 없이 동작을 확인할 수 있습니다.
업로드와 서버 등록은 타이머로 시뮬레이션되며, 결과는 화면 하단 로그 박스에 출력됩니다.

Spring Boot 예제는 `example/backend/`에 있으며, `http://localhost:8090`에서 실행됩니다.
