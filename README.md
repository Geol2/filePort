# filePort — Dropzone 기반 파일 첨부 업로더

드래그&드롭 파일 첨부 UI 컴포넌트입니다.
[Dropzone.js](https://www.dropzone.dev/) v5.9.3을 기반으로 동작하며, 커스텀 테이블 렌더링·상태 관리·업로드 흐름 제어 로직이 포함되어 있습니다.

---

## 파일 구조

```
filePort/
├── dropzone/
│   ├── dropzone.min.js       # Dropzone.js 라이브러리 (서드파티)
│   ├── dropzone.min.css      # Dropzone.js 기본 스타일 (서드파티)
│   ├── dropzoneUploader.js   # 커스텀 업로더 — 상태 관리·이벤트·제출 흐름
│   └── dropzoneUploader.css  # 커스텀 업로더 스타일 — 테이블·상태·버튼
├── example/
│   └── index.html            # 단독 실행 가능한 사용 예제 (백엔드 불필요)
├── THIRD_PARTY_LICENSES.md   # 서드파티 라이브러리 라이센스 고지
└── README.md
```

---

## 빠른 시작

### 1. 스크립트·스타일 로드

```html
<link rel="stylesheet" href="dropzone/dropzone.min.css">
<link rel="stylesheet" href="dropzone/dropzoneUploader.css">

<!-- 필수: fnGetMessage 등 전역 함수 정의 후 로드 -->
<script src="dropzone/dropzone.min.js"></script>
<script src="dropzone/dropzoneUploader.js"></script>
```

### 2. HTML 구조

`dropzoneElementConfig`의 ID와 일치하는 요소가 필요합니다.

```html
<div id="tableWrapper" class="table-wrapper">
    <div class="table-scroll">
        <table id="fileTable">
            <thead>
                <tr>
                    <th><input type="checkbox" id="checkAll"
                               onchange="fileManager.toggleAll(this.checked)"></th>
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
<button id="btnInsert" onclick="fnFileAddSubmit()">등록</button>
```

### 3. 페이지별 필수 구현

`dropzoneUploader.js` 로드 전에 아래 전역 함수·변수를 정의해야 합니다.

```js
// ① i18n 메시지 반환 함수 (필수)
function fnGetMessage(key) { /* ... */ }

// ② 문서종류 컬럼 표시 여부 (선택, 기본값 false)
var B_DOCKIND = true;
```

로드 후 아래 두 함수를 구현합니다.

```js
// ③ 등록 버튼 핸들러 — 업로드 시작 및 제출 흐름 제어
function fnFileAddSubmit() {
    if (isProcessing) return;
    isProcessing = true;
    document.getElementById(dropzoneSubmitConfig.submitBtnId).disabled = true;

    var hasPending = fileManager.files.some(function(f) {
        return f.dropzoneFile !== null && f.status === 'pending';
    });

    if (hasPending) {
        myDropzone.processQueue(); // → queuecomplete 이벤트에서 fnGoSubmitDropzone 호출
    } else {
        fnGoSubmitDropzone();
    }
}

// ④ 서버 등록 AJAX — 모든 파일 업로드 완료 후 호출됨
function fnGoSubmitDropzone() {
    var files = fileManager.files.map(function(f) {
        if (f.isOld)     return { isOld: true, fileInfoId: f.fileInfoId, docInfoId: f.docInfoId };
        if (f.isScanned) return { isScanned: true, fileNm: f.serverFileNm, fdKey01: f.fdKey01, fdKey02: f.fdKey02 };
        return { fileNm: f.serverFileNm, srcFileNm: f.name };
    });

    $.ajax({
        url: '/api/contents/insert',
        method: 'POST',
        data: JSON.stringify(Object.assign(dropzoneSubmitConfig.getExtraContentsInfo(), { files: files })),
        contentType: 'application/json',
        success: function() {
            fileManager.markAllRegistered();
            dropzoneSubmitConfig.onSuccess();
            isProcessing = false;
            document.getElementById(dropzoneSubmitConfig.submitBtnId).disabled = false;
        }
    });
}
```

---

## 설정 객체

### `dropzoneElementConfig` — DOM ID 매핑

`dropzoneUploader.js` 로드 전에 `window.dropzoneElementConfig`를 정의하면 기본값을 덮어씁니다.

| 키 | 기본값 | 역할 |
|---|---|---|
| `wrapperId` | `tableWrapper` | Dropzone 드롭 영역 |
| `fileAddBtnId` | `btnFileAdd` | 파일 선택 버튼 (`clickable`) |
| `tableId` | `fileTable` | 파일 목록 `<table>` |
| `tbodyId` | `fileList` | 파일 목록 `<tbody>` |
| `checkAllId` | `checkAll` | 전체선택 체크박스 |
| `footerSizeId` | `footerSize` | 파일 크기·건수 표시 |
| `progressFillId` | `progressFill` | 진행 바 fill |
| `footerPercentId` | `footerPercent` | 업로드 퍼센트 |

### `dropzoneSubmitConfig` — 제출 설정

| 키 | 기본값 | 역할 |
|---|---|---|
| `submitBtnId` | `btnInsert` | 등록 버튼 ID |
| `popupSelector` | `#contentsReg` | 닫을 팝업 선택자 |
| `getExtraContentsInfo` | `() => {}` | 추가 콘텐츠 필드 반환 함수 |
| `getExtraAttrInputs` | `() => []` | 추가 속성 input 목록 반환 함수 |
| `onSuccess` | `() => {}` | 등록 성공 후 콜백 |

---

## 업로드 케이스별 흐름

| 케이스 | 설명 | 흐름 |
|---|---|---|
| 1 | 새 파일만 | `processQueue` → `queuecomplete` → `fnGoSubmitDropzone` |
| 2 | 스캔 파일만 | `fnGoSubmitDropzone` 직접 호출 |
| 3 | 기존 파일만 (수정 모드) | `fnGoSubmitDropzone` 직접 호출 |
| 4 | 스캔 + 새 파일 혼합 | `processQueue` → `queuecomplete` → 전체 일괄 등록 |
| 5 | 일부 실패 | `queuecomplete`에서 에러 감지 → 버튼 재활성화·재시도 유도 |

---

## 예제

`example/index.html`을 브라우저에서 직접 열면 백엔드 없이 동작을 확인할 수 있습니다.
업로드와 서버 등록은 타이머로 시뮬레이션되며, 결과는 화면 하단 로그 박스에 출력됩니다.
