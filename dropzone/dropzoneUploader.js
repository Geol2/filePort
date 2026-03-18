// =====================================================================
// dropzoneUploader.js — 업로드 케이스별 동작 흐름
// =====================================================================
//
// ┌─ 케이스 1: 새 파일만 (Dropzone으로 직접 추가) ─────────────────────
// │  fileItem: { dropzoneFile: Object, status:'pending', isScanned:false, isUploaded:false }
// │
// │  fnFileAddSubmit()
// │    └─ hasPendingDropzoneFiles = true
// │    └─ myDropzone.processQueue()
// │         ├─ success → fileItem.status='success', serverFileNm=json.id
// │         └─ complete → 다음 파일 processQueue()
// │    └─ queuecomplete → hasSuccess=true
// │         └─ fnGoSubmitDropzone()
// │              └─ fi = { fileNm:serverFileNm, srcFileNm:name }
// │              └─ AJAX 등록 → 완료
// │
// ├─ 케이스 2: 스캔 파일만 ────────────────────────────────────────────
// │  fileItem: { dropzoneFile:null, status:'pending', isScanned:true,
// │              fdKey01:'날짜', fdKey02:'uuid' }
// │
// │  fnUploaderAddFileInfo(data, UPLOAD_SCAN)  ← 스캐너 응답 후 호출
// │  fnFileAddSubmit()
// │    └─ hasPendingDropzoneFiles = false  (dropzoneFile===null)
// │    └─ fnGoSubmitDropzone() 직접 호출  ← queuecomplete 거치지 않음
// │         └─ fi = { fileNm:serverFileNm, fdKey01, fdKey02, isScanned:true }
// │         └─ AJAX 등록 → 완료
// │
// ├─ 케이스 3: 기존 파일만 (수정 모드) ───────────────────────────────
// │  fileItem: { dropzoneFile:null, status:'success', isUploaded:true,
// │              fileInfoId:'xxx', docInfoId:'yyy' }
// │
// │  fnUploaderAddFileInfo(data, UPLOAD_MODIFY)  ← 화면 진입 시 호출
// │  fnFileAddSubmit()
// │    └─ hasPendingDropzoneFiles = false  (dropzoneFile===null)
// │    └─ fnGoSubmitDropzone() 직접 호출
// │         └─ fi = { isOld:true, fileInfoId:'xxx', docInfoId:'yyy' }
// │         └─ AJAX 등록 → 완료
// │
// ├─ 케이스 4: 스캔 파일 + 새 파일 혼합 ─────────────────────────────
// │  파일A: { dropzoneFile:null,   status:'pending', isScanned:true  }
// │  파일B: { dropzoneFile:Object, status:'pending', isScanned:false }
// │
// │  fnFileAddSubmit()
// │    └─ hasPendingDropzoneFiles = true  (파일B 해당)
// │    └─ myDropzone.processQueue()  ← 파일B만 업로드
// │         └─ 파일B: success → status='success'
// │    └─ queuecomplete → hasSuccess=true
// │         └─ fnGoSubmitDropzone()
// │              ├─ 파일A: fi = { fdKey01, fdKey02, isScanned:true }
// │              └─ 파일B: fi = { fileNm:serverFileNm }
// │              └─ AJAX 두 파일 함께 등록 → 완료
// │
// └─ 케이스 5: 새 파일 업로드 중 일부 실패 ───────────────────────────
//    파일A: status='error'  /  파일B: status='success'
//
//    queuecomplete → hasError=true
//      └─ isProcessing=false, 버튼 재활성화, alert
//      └─ fnGoSubmitDropzone 호출 안 됨 → 사용자 재시도 가능
//    ※ 재시도 시 status='success' 파일이 재업로드될 수 있으므로
//      중복 등록 방지가 필요한 경우 별도 처리 필요
//
// =====================================================================

// 업로드 중복 실행 방지 플래그 (fnFileAddSubmit 호출 시 true, 등록 완료/실패 시 false)
var isProcessing = false;

// =====================================================================
// dropzoneElementConfig: 페이지별 DOM ID 설정
// 이 파일보다 먼저 로드된 스크립트에서 이미 정의된 경우 해당 값을 유지한다.
// =====================================================================
var dropzoneElementConfig = window.dropzoneElementConfig || {
    wrapperId:      'tableWrapper',   // Dropzone 드롭 영역 id (table-wrapper)
    fileAddBtnId:   'btnFileAdd',     // 파일 선택 버튼 id
    tableId:        'fileTable',      // <table> id
    tbodyId:        'fileList',       // <tbody> id
    checkAllId:     'checkAll',       // 전체선택 체크박스 id
    footerSizeId:   'footerSize',     // 파일 크기·건수 표시 span id
    progressFillId: 'progressFill',   // 진행 바 fill div id
    footerPercentId:'footerPercent'   // 진행 퍼센트 span id
};

// =====================================================================
// dropzoneSubmitConfig: 페이지별 제출 설정
// 이 파일보다 먼저 로드된 스크립트에서 이미 정의된 경우 해당 값을 유지한다.
// =====================================================================
var dropzoneSubmitConfig = window.dropzoneSubmitConfig || {
    submitBtnId:          'btnInsert',   // 등록 버튼 ID
    popupSelector:        '#contentsReg', // 닫을 팝업 선택자
    getExtraContentsInfo: function() { return {}; },  // 추가 콘텐츠 필드
    getExtraAttrInputs:   function() { return []; },  // 추가 속성 input 목록
    onSuccess:            function() {}               // 등록 성공 후 처리
};

// =====================================================================
// fileManager: 파일 목록 상태 관리 및 테이블 렌더링 담당 객체
// =====================================================================
var fileManager = {
    files: [], // 추가된 파일 목록 (fileItem 객체 배열)

    // 파일 추가: Dropzone이 파일을 인식하면 호출됨. fileItem을 생성하여 목록에 추가하고 테이블 갱신.
    addFile: function(file) {
        const fileItem = {
            id: Date.now() + Math.random(), // 파일별 고유 ID (DOM data-file-id 속성으로도 사용)
            name: file.name,
            size: file.size,
            status: 'pending',              // 초기 상태: 대기중
            uploadTime: null,               // 업로드 완료 시각 (성공 후 설정)
            dropzoneFile: file,             // Dropzone File 객체 참조 (이벤트 핸들러에서 매칭에 사용)
            checked: true,                  // 파일 추가 시 기본 체크
            registered: false,              // 콘텐츠 등록 완료 여부 (true이면 삭제 버튼 → 체크 버튼)
            docKindId: null,                // 문서종류 ID (settingDockindToFilelist에서 설정)
            docKindNm: null                 // 문서종류 명칭 (테이블에 표시)
        };
        this.files.push(fileItem);
        this.renderTable();
        return fileItem.id;
    },

    // 파일 제거: X 버튼 클릭 시 호출됨. Dropzone 큐에서도 함께 제거.
    removeFile: function(fileId) {
        const index = this.files.findIndex(f => f.id === fileId);
        if (index > -1) {
            const file = this.files[index];
            if (file.dropzoneFile && myDropzone) {
                myDropzone.removeFile(file.dropzoneFile); // Dropzone 내부 큐에서도 제거
            }
            this.files.splice(index, 1);
            this.renderTable();
        }
    },

    // 개별 체크박스 상태 변경: onchange 인라인 핸들러에서 호출됨.
    toggleCheck: function(fileId, checked) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;
        file.checked = checked;
        this.updateCheckAllState(); // 전체선택 체크박스 상태 동기화
    },

    // 전체 체크박스 토글: 전체선택 체크박스 onchange에서 호출됨.
    toggleAll: function(checked) {
        this.files.forEach(f => { f.checked = checked; });
        this.renderTable();
    },

    // 전체선택 체크박스(#checkAll) 상태 갱신: 전체/일부/없음 선택에 따라 checked/indeterminate 설정.
    updateCheckAllState: function() {
        const checkAll = document.getElementById(dropzoneElementConfig.checkAllId);
        if (!checkAll) return;
        const total = this.files.length;
        const checkedCount = this.files.filter(f => f.checked).length;
        checkAll.indeterminate = checkedCount > 0 && checkedCount < total;
        checkAll.checked = total > 0 && checkedCount === total;
    },

    // 파일 업로드 상태 변경: Dropzone 이벤트(sending/success/error)에서 호출됨. 변경 후 테이블 재렌더링.
    updateStatus: function(fileId, status, uploadTime = null) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
            file.status = status;
            if (uploadTime) file.uploadTime = uploadTime;
            this.renderTable();
        }
    },

    // 파일 크기를 사람이 읽기 쉬운 단위(Bytes/KB/MB/GB)로 변환.
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    },

    // 파일 목록 테이블(#fileList) 전체 재렌더링.
    // 파일이 없으면 드래그 안내 행을 표시하고, 있으면 파일별 행을 생성.
    renderTable: function() {
        const fileList = document.getElementById(dropzoneElementConfig.tbodyId);
        const fileTable = document.getElementById(dropzoneElementConfig.tableId);
        if (!fileList || !fileTable) return; // 요소가 없는 페이지에서 호출 시 무시

        fileList.innerHTML = '';

        if (this.files.length === 0) {
            fileTable.style.display = 'table';
            fileTable.classList.add('table-empty');
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'drop-row';
            const colspan = (typeof B_DOCKIND !== 'undefined' && B_DOCKIND) ? 6 : 5;
            emptyRow.innerHTML = `<td colspan="${colspan}">${fnGetMessage('web.confirm.file.fileUploadPlz')}</td>`;
            fileList.appendChild(emptyRow);
            this.updateStats();
            return;
        }

        fileTable.classList.remove('table-empty');
        fileTable.style.display = 'table';
        this.files.forEach(file => {
            const row = document.createElement('tr');
            const safeName = file.name.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            row.innerHTML = `
                <td class="text-center">
                    <input type="checkbox" ${file.checked ? 'checked' : ''}
                        data-file-id="${file.id}"
                        onchange="fileManager.toggleCheck(${file.id}, this.checked)">
                </td>
                <td title="${safeName}" class="text-center">${safeName}</td>
                <td class="text-center">${file.docKindNm || '-'}</td>
                <td class="text-center">${this.formatFileSize(file.size)}</td>
                <td class="text-center"><span class="status-${file.status}">${this.getStatusText(file.status)}</span></td>
                <td class="text-center">
                    ${file.status === 'success'
                        ? `<button class="btn btn-registered" title="업로드완료" disabled>✓</button>`
                        : `<button class="btn btn-delete" onclick="fileManager.removeFile(${file.id})" title="삭제">×</button>`
                    }
                </td>
            `;
            fileList.appendChild(row);
        });

        this.updateCheckAllState();
        this.updateStats();
    },

    // 하단 통계 영역 갱신: 총 파일 크기, 파일 수, 업로드 진행률(%) 표시.
    updateStats: function() {
        var footerSizeEl = document.getElementById(dropzoneElementConfig.footerSizeId);
        var footerPercentEl = document.getElementById(dropzoneElementConfig.footerPercentId);
        var progressFillEl = document.getElementById(dropzoneElementConfig.progressFillId);
        if (!footerSizeEl || !footerPercentEl || !progressFillEl) return; // 요소가 없는 페이지에서 호출 시 무시

        const total = this.files.length;
        const totalSize = this.files.reduce((sum, f) => sum + f.size, 0);
        const successCount = this.files.filter(f => f.status === 'success').length;
        const percent = total > 0 ? Math.round(successCount / total * 100) : 0;

        footerSizeEl.textContent = `${this.formatFileSize(totalSize)} · ${total}${fnGetMessage('web.file.countUnit')}`;
        footerPercentEl.textContent = `${percent}%`;
        progressFillEl.style.width = `${percent}%`;
    },

    // 공지사항 내의 등록창에 간편한 렌더링 방식 (체크박스와 문서종류 선택하는 것이 없음)
    renderTableSimple: function() {
        const fileList = document.getElementById(dropzoneElementConfig.tbodyId);
        const fileTable = document.getElementById(dropzoneElementConfig.tableId);
        if (!fileList || !fileTable) return;

        fileList.innerHTML = '';
        if (this.files.length === 0) {
            fileTable.style.display = 'table';
            fileTable.classList.add('table-empty');
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'drop-row';
            emptyRow.innerHTML = `<td colspan="4">${fnGetMessage('web.confirm.file.fileUploadPlz')}</td>`;
            fileList.appendChild(emptyRow);
            this.updateStats();
            return;
        }

        fileTable.classList.remove('table-empty');
        fileTable.style.display = 'table';
        const self = this;
        this.files.forEach(file => {
            const row = document.createElement('tr');
            const btn = document.createElement('button');
            if (file.status === 'success') {
                btn.className = 'btn btn-registered';
                btn.setAttribute('title', '업로드완료');
                btn.disabled = true;
                btn.textContent = '✓';
            } else {
                btn.className = 'btn btn-delete';
                btn.setAttribute('data-file-id', file.id);
                btn.setAttribute('title', '삭제');
                btn.textContent = '×';
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const fileId = parseFloat(this.getAttribute('data-file-id'));
                    self.removeFile(fileId);
                });
            }
            row.innerHTML = `
                <td title="${file.name}" class="text-center">${file.name}</td>
                <td class="text-center">${this.formatFileSize(file.size)}</td>
                <td class="text-center"><span class="status-${file.status}">${this.getStatusText(file.status)}</span></td>
                <td class="text-center"></td>`;
            row.querySelector('td:last-child').appendChild(btn);
            fileList.appendChild(row);
        });
        this.updateStats();
    },

    // 콘텐츠 등록 완료 후 호출: 모든 파일을 registered=true로 표시하고 테이블 재렌더링.
    // 삭제(×) 버튼이 체크(✓) 버튼으로 교체되어 등록 완료 상태를 시각적으로 표시.
    markAllRegistered: function() {
        this.files.forEach(function(f) { f.registered = true; });
        this.renderTable();
    },

    // 업로드 상태 코드를 화면 표시 텍스트로 변환.
    getStatusText: function(status) {
        const statusMap = {
            'pending':   fnGetMessage('web.file.status.pending'),
            'uploading': fnGetMessage('web.file.status.uploading'),
            'success':   fnGetMessage('web.file.status.success'),
            'error':     fnGetMessage('web.file.status.error'),
        };
        return statusMap[status] || status;
    },

};

// =====================================================================
// Dropzone 인스턴스 초기화
// autoProcessQueue: false → 등록 버튼 클릭 시에만 업로드 시작
// parallelUploads: 1 → 파일을 하나씩 순차 업로드
// ※ 해당 요소가 존재하는 페이지에서만 초기화 (popBoardForm 등에서는 별도 초기화)
// =====================================================================
var myDropzone = null;
(function() {
    var wrapperEl = document.getElementById(dropzoneElementConfig.wrapperId);
    if (wrapperEl) {
        myDropzone = new Dropzone('#' + dropzoneElementConfig.wrapperId, {
            url: "/upload", // 실제 업로드 URL은 fnFileAddSubmit에서 설정
            autoProcessQueue: false,
            maxFilesize: 10,
            parallelUploads: 1,
            acceptedFiles: null,
            addRemoveLinks: false,
            clickable: '#' + dropzoneElementConfig.fileAddBtnId,
            previewsContainer: false
        });

        // =====================================================================
        // Dropzone 이벤트 핸들러 (myDropzone이 존재할 때만 등록)
        // =====================================================================

        // 드래그 진입 시 영역 강조 표시
        myDropzone.on("dragover", function() {
            document.getElementById(dropzoneElementConfig.wrapperId).classList.add("drag-over");
        });

        // 드래그 벗어남 / 드롭 시 강조 해제
        myDropzone.on("dragleave", function() {
            document.getElementById(dropzoneElementConfig.wrapperId).classList.remove("drag-over");
        });

        myDropzone.on("drop", function() {
            document.getElementById(dropzoneElementConfig.wrapperId).classList.remove("drag-over");
        });

        // 파일 추가됨: Dropzone이 파일을 인식하는 즉시 fileManager에 등록하고 테이블에 표시
        myDropzone.on("addedfile", function(file) {
            fileManager.addFile(file);
        });

        // 업로드 시작 직전: 상태를 '업로드중'으로 변경하고, 서버에 전달할 추가 파라미터(문서종류/사용자/기관) 첨부
        // uploadStarted=true: 실제로 업로드가 시작된 파일 표시 (확장자·용량 거부 파일과 구분하기 위함)
        myDropzone.on("sending", function(file, xhr, formData) {
            const fileItem = fileManager.files.find(f => f.dropzoneFile === file);
            if (fileItem) {
                fileItem.uploadStarted = true;
                fileManager.updateStatus(fileItem.id, 'uploading');
                formData.append('docKindId', fileItem.docKindId || '');
                if (typeof USER_ID !== 'undefined') formData.append('USER_ID', USER_ID);
                if (typeof ORG_ID  !== 'undefined') formData.append('ORG_ID',  ORG_ID);
            }
        });

        // 업로드 성공: 서버 응답에서 파일 ID(json.id)를 serverFileNm으로 저장.
        // serverFileNm은 콘텐츠 등록(fnGoSubmitDropzone)에서 서버 파일명으로 사용됨.
        // json.id를 받지 못한 경우 서버 등록 시 오류가 발생하므로 명시적으로 'error' 처리.
        myDropzone.on("success", function(file, response) {
            var fileItem = fileManager.files.find(function(f) { return f.dropzoneFile === file; });
            if (fileItem) {
                var gotFileNm = false;
                try {
                    var json = (typeof response === 'string') ? JSON.parse(response) : response;
                    if (json && json.id) {
                        fileItem.serverFileNm = json.id;
                        gotFileNm = true;
                    }
                } catch(e) { console.error('[dropzone] 서버 응답 파싱 오류:', e, response); }
                if (gotFileNm) {
                    fileManager.updateStatus(fileItem.id, 'success', new Date().toLocaleString('ko-KR'));
                } else {
                    fileManager.updateStatus(fileItem.id, 'error');
                }
            }
        });

        // 업로드 실패: 목록에서 제거하고 오류 유형에 따라 안내 메시지 표시
        // - uploadStarted=false : 확장자·용량 거부 → Dropzone 오류 메시지 표시
        // - uploadStarted=true  : 서버·네트워크 오류 → 재첨부 안내
        myDropzone.on("error", function(file, msg) {
            const fileItem = fileManager.files.find(f => f.dropzoneFile === file);
            if (!fileItem) return;
            var fileName = fileItem.name;
            var isUploadError = fileItem.uploadStarted === true;
            fileManager.removeFile(fileItem.id);
            if (isUploadError) {
                alert(fileName + '\n' + fnGetMessage('web.js.error.upload'));
            } else {
                var detail = (typeof msg === 'string') ? msg : '';
                alert(fileName + '\n' + (detail || '허용되지 않은 파일입니다.'));
            }
        });

        // 파일 1개 완료 후 다음 파일 처리: parallelUploads=1이고 autoProcessQueue=false이므로
        // 직접 processQueue()를 호출해야 다음 파일이 순차적으로 업로드됨.
        // isProcessing 확인: 등록 버튼 클릭 전 파일 거부(확장자·용량)로 complete가 발생해도 큐를 시작하지 않음.
        myDropzone.on("complete", function(file) {
            if (isProcessing && myDropzone.getUploadingFiles().length === 0 && myDropzone.getQueuedFiles().length > 0) {
                myDropzone.processQueue();
            }
        });

        // 전체 큐 완료: 모든 파일 업로드가 끝난 후 호출됨.
        // 에러 파일은 error 핸들러에서 이미 제거되므로 여기서는 성공 여부만 판단.
        // 성공 파일 또는 스캔·기존 파일이 있으면 콘텐츠 등록, 없으면 버튼 재활성화.
        myDropzone.on("queuecomplete", function() {
            var hasSuccess    = fileManager.files.some(function(f) { return f.status === 'success'; });
            var hasNonDropzone = fileManager.files.some(function(f) { return f.dropzoneFile === null; });
            if (hasSuccess || hasNonDropzone) {
                setTimeout(fnGoSubmitDropzone, 300);
            } else {
                // 업로드 성공 파일 없음 (전부 실패·제거됨) → 버튼 재활성화
                isProcessing = false;
                document.getElementById(dropzoneSubmitConfig.submitBtnId).disabled = false;
            }
        });
    }
})();

// 초기 테이블 렌더링 (빈 목록 상태로 드래그 안내 표시)
fileManager.renderTable();
