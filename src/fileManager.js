// =====================================================================
// fileManager.js — 파일 목록 순수 상태 관리
// DOM 접근 없음. 상태 변경 시 onUpdate 콜백을 통해 렌더러에 알림.
// =====================================================================

const STATUS_KEY = {
    pending:   'web.file.status.pending',
    uploading: 'web.file.status.uploading',
    success:   'web.file.status.success',
    error:     'web.file.status.error',
};

/**
 * @param {{ getMessage: (key: string) => string, onUpdate: () => void }} deps
 */
export function createFileManager({ getMessage, onUpdate }) {
    const files = [];

    const notify = () => onUpdate?.();

    // ── 파일 추가 ────────────────────────────────────────────────────
    function addFile(dzFile) {
        const item = {
            id:           Date.now() + Math.random(),
            name:         dzFile.name,
            size:         dzFile.size,
            status:       'pending',
            uploadTime:   null,
            dropzoneFile: dzFile,
            checked:      true,
            registered:   false,
            docKindId:    null,
            docKindNm:    null,
        };
        files.push(item);
        notify();
        return item.id;
    }

    // ── 파일 제거 (Dropzone 큐에서도 함께 제거) ──────────────────────
    function removeFile(fileId, dropzone = null) {
        const idx = files.findIndex(f => f.id === fileId);
        if (idx === -1) return;
        const item = files[idx];
        if (item.dropzoneFile && dropzone) {
            dropzone.removeFile(item.dropzoneFile);
        }
        files.splice(idx, 1);
        notify();
    }

    // ── 스캔·기존(수정 모드) 파일을 목록에 직접 추가 ─────────────────
    function addFileInfo(data, type) {
        const item = {
            id:           Date.now() + Math.random(),
            name:         data.fileNm || data.srcFileNm || '',
            size:         data.fileSize || 0,
            status:       type === 'modify' ? 'success' : 'pending',
            uploadTime:   null,
            dropzoneFile: null,
            checked:      true,
            registered:   false,
            docKindId:    data.docKindId || null,
            docKindNm:    data.docKindNm || null,
            ...(type === 'scan'   && { isScanned: true,  serverFileNm: data.serverFileNm, fdKey01: data.fdKey01, fdKey02: data.fdKey02 }),
            ...(type === 'modify' && { isOld: true, fileInfoId: data.fileInfoId, docInfoId: data.docInfoId, isUploaded: true }),
        };
        files.push(item);
        notify();
    }

    // ── 문서종류 변경 ─────────────────────────────────────────────────
    // select 변경 시 DOM 재렌더 없이 모델만 갱신 (notify 생략)
    function setDocKind(fileId, docKindId, docKindNm) {
        const item = files.find(f => f.id === fileId);
        if (!item) return;
        item.docKindId = docKindId;
        item.docKindNm = docKindNm;
    }

    // ── 체크박스 ─────────────────────────────────────────────────────
    function toggleCheck(fileId, checked) {
        const item = files.find(f => f.id === fileId);
        if (item) { item.checked = checked; notify(); }
    }

    function toggleAll(checked) {
        files.forEach(f => { f.checked = checked; });
        notify();
    }

    // ── 상태 변경 ────────────────────────────────────────────────────
    function updateStatus(fileId, status, uploadTime = null) {
        const item = files.find(f => f.id === fileId);
        if (!item) return;
        item.status = status;
        if (uploadTime) item.uploadTime = uploadTime;
        notify();
    }

    function markAllRegistered() {
        files.forEach(f => { f.registered = true; });
        notify();
    }

    // ── 유틸 ─────────────────────────────────────────────────────────
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    function getStatusText(status) {
        return getMessage(STATUS_KEY[status] ?? ('web.file.status.' + status)) || status;
    }

    return {
        get files() { return files; },
        addFile,
        removeFile,
        addFileInfo,
        setDocKind,
        toggleCheck,
        toggleAll,
        updateStatus,
        markAllRegistered,
        formatFileSize,
        getStatusText,
    };
}
