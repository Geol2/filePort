// =====================================================================
// filePort.js — 진입점
//
// createFileManager / createRenderer / initDropzone 을 조립하여
// 하나의 업로더 인스턴스를 반환합니다.
//
// [ESM]
//   import { createUploader } from './dist/filePort.js'
//
// [바닐라 / IIFE]
//   <script src="dist/filePort.iife.js"></script>
//   const uploader = FilePort.createUploader({ ... })
//
// ── 업로드 케이스별 흐름 ─────────────────────────────────────────────
//
//  케이스 1: 새 파일만
//    startSubmit() → processQueue() → queuecomplete → onSubmit({ files, extra, done })
//
//  케이스 2: 스캔 파일만
//    addFileInfo(data, 'scan') → startSubmit() → onSubmit 직접 호출
//
//  케이스 3: 기존 파일만 (수정 모드)
//    addFileInfo(data, 'modify') → startSubmit() → onSubmit 직접 호출
//
//  케이스 4: 스캔 + 새 파일 혼합
//    startSubmit() → processQueue() → queuecomplete → onSubmit (전체 일괄)
//
//  케이스 5: 일부 실패
//    queuecomplete → 성공 파일 없음 → 버튼 재활성화 (재시도 가능)
//
// =====================================================================

import { createFileManager } from './fileManager.js';
import { createRenderer }    from './renderer.js';
import { initDropzone }      from './dzEvents.js';

const DEFAULT_ELEMENT_CONFIG = {
    wrapperId:       'tableWrapper',
    fileAddBtnId:    'btnFileAdd',
    tableId:         'fileTable',
    tbodyId:         'fileList',
    checkAllId:      'checkAll',
    footerSizeId:    'footerSize',
    progressFillId:  'progressFill',
    footerPercentId: 'footerPercent',
};

const DEFAULT_MESSAGES = {
    'web.confirm.file.fileUploadPlz': '파일을 이곳에 드래그하거나 버튼을 클릭하세요',
    'web.file.countUnit':             '건',
    'web.file.status.pending':        '대기',
    'web.file.status.uploading':      '업로드중',
    'web.file.status.success':        '완료',
    'web.file.status.error':          '오류',
    'web.js.error.upload':            '업로드 중 오류가 발생했습니다. 다시 첨부해 주세요.',
};

/**
 * 업로더 인스턴스를 생성합니다.
 *
 * @param {{
 *   elementConfig?:  Partial<typeof DEFAULT_ELEMENT_CONFIG>,
 *   uploadUrl?:      string,
 *   maxFilesize?:    number,
 *   acceptedFiles?:  string | null,
 *   showDocKind?:    boolean,
 *   submitBtnId?:    string,
 *   getMessage?:     (key: string) => string,
 *   getExtra?:       () => object,
 *   onSubmit?:       (payload: { files, extra, done }) => void,
 * }} options
 */
export function createUploader(options = {}) {
    const elCfg         = { ...DEFAULT_ELEMENT_CONFIG, ...options.elementConfig };
    const uploadUrl     = options.uploadUrl     || '/upload';
    const maxFilesize   = options.maxFilesize   || 10;
    const acceptedFiles = options.acceptedFiles ?? null;
    const showDocKind   = options.showDocKind   !== false;
    const docKindList   = options.docKindList   || [];
    const submitBtnId   = options.submitBtnId   || 'btnInsert';
    const getExtra      = options.getExtra      || (() => ({}));
    const onSubmit      = options.onSubmit      || (() => {});
    const getMessage    = options.getMessage    || (key => DEFAULT_MESSAGES[key] ?? key);

    let isProcessing = false;
    let dzRef        = null;
    let doSubmitRef  = null;

    // ── 모듈 조립 ─────────────────────────────────────────────────────
    const manager = createFileManager({
        getMessage,
        onUpdate: () => renderer.renderTable(),
    });

    const renderer = createRenderer({ manager, elCfg, getMessage, showDocKind, docKindList });

    // ── 공개 API ──────────────────────────────────────────────────────

    /**
     * DOM 준비 후 호출 — Dropzone·이벤트·초기 렌더링 수행
     */
    function init() {
        const result = initDropzone({
            manager,
            elCfg,
            getMessage,
            uploadUrl,
            maxFilesize,
            acceptedFiles,
            submitBtnId,
            onSubmit,
            getExtra,
            getIsProcessing: () => isProcessing,
            setIsProcessing: v => { isProcessing = v; },
        });

        dzRef       = result?.dz       ?? null;
        doSubmitRef = result?.doSubmit ?? null;

        renderer.attachEvents(() => dzRef);
        renderer.renderTable();
    }

    /**
     * 등록 버튼 클릭 시 호출.
     * 새 파일(pending)이 있으면 processQueue, 없으면 onSubmit 직접 호출.
     */
    function startSubmit() {
        if (isProcessing || manager.files.length === 0) return;

        isProcessing = true;
        const btn = document.getElementById(submitBtnId);
        if (btn) btn.disabled = true;

        const hasPending = manager.files.some(
            f => f.dropzoneFile !== null && f.status === 'pending'
        );

        if (hasPending) {
            dzRef?.processQueue();
        } else {
            doSubmitRef?.();
        }
    }

    /**
     * 스캔·기존(수정 모드) 파일을 목록에 직접 추가.
     * @param {object} data
     * @param {'scan' | 'modify'} type
     */
    function addFileInfo(data, type) {
        manager.addFileInfo(data, type);
    }

    return {
        get fileManager()  { return manager; },
        get myDropzone()   { return dzRef; },
        get isProcessing() { return isProcessing; },
        init,
        startSubmit,
        addFileInfo,
    };
}
