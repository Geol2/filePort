// =====================================================================
// dzEvents.ts — Dropzone 인스턴스 초기화 및 이벤트 핸들러
// =====================================================================

import Dropzone from './dropzone/dropzone.min.js';
import type { FileManager } from './fileManager.js';
import type { ElementConfig, SubmitPayload, SubmitFileItem, DropzoneInstance, DropzoneFile } from './types.js';

// 폼 자동 감지 비활성화 — filePort 내부에서 직접 초기화하므로 불필요
Dropzone.autoDiscover = false;

interface DzEventsDeps {
    manager:         FileManager;
    elCfg:           ElementConfig;
    getMessage:      (key: string) => string;
    uploadUrl:       string;
    maxFilesize:     number;
    acceptedFiles:   string | null;
    submitBtnId:     string;
    onSubmit:        (payload: SubmitPayload) => void;
    getExtra:        () => Record<string, unknown>;
    getIsProcessing: () => boolean;
    setIsProcessing: (v: boolean) => void;
}

export class DzEvents {
    readonly #dz:       DropzoneInstance | null = null;
    readonly #doSubmit: (() => void) | null      = null;

    get dz():       DropzoneInstance | null { return this.#dz; }
    get doSubmit(): (() => void) | null      { return this.#doSubmit; }

    constructor({
        manager,
        elCfg,
        getMessage,
        uploadUrl,
        maxFilesize,
        acceptedFiles,
        submitBtnId,
        onSubmit,
        getExtra,
        getIsProcessing,
        setIsProcessing,
    }: DzEventsDeps) {
        const wrapperEl = document.getElementById(elCfg.wrapperId);
        if (!wrapperEl) return;

        const dz = new Dropzone('#' + elCfg.wrapperId, {
            url:               uploadUrl,
            autoProcessQueue:  false,
            maxFilesize,
            parallelUploads:   1,
            acceptedFiles:     acceptedFiles ?? undefined,
            addRemoveLinks:    false,
            clickable:         '#' + elCfg.fileAddBtnId,
            previewsContainer: false,
        });

        // ── 드래그 강조 ──────────────────────────────────────────────────
        dz.on('dragover',  () => wrapperEl.classList.add('drag-over'));
        dz.on('dragleave', () => wrapperEl.classList.remove('drag-over'));
        dz.on('drop',      () => wrapperEl.classList.remove('drag-over'));

        // ── 파일 추가 ────────────────────────────────────────────────────
        dz.on('addedfile', (file: DropzoneFile) => manager.addFile(file));

        // ── 업로드 직전: 상태 변경 + 추가 파라미터 첨부 ──────────────────
        dz.on('sending', (file: DropzoneFile, _xhr: XMLHttpRequest, formData: FormData) => {
            const item = manager.files.find(f => f.dropzoneFile === file);
            if (!item) return;
            item.uploadStarted = true;
            manager.updateStatus(item.id, 'uploading');
            formData.append('docKindId', item.docKindId || '');
        });

        // ── 업로드 성공: 서버 응답에서 저장 파일명(json.id) 추출 ─────────
        dz.on('success', (file: DropzoneFile, response: string | object) => {
            const item = manager.files.find(f => f.dropzoneFile === file);
            if (!item) return;
            try {
                const json = typeof response === 'string' ? JSON.parse(response) : response as Record<string, unknown>;
                if (json && typeof json === 'object' && 'id' in json && json['id']) {
                    item.serverFileNm = String(json['id']);
                    manager.updateStatus(item.id, 'success', new Date().toLocaleString('ko-KR'));
                    return;
                }
            } catch (e) {
                console.error('[FilePort] 서버 응답 파싱 오류:', e, response);
            }
            manager.updateStatus(item.id, 'error');
        });

        // ── 업로드 실패: 목록 제거 + 오류 유형별 알림 ───────────────────
        // uploadStarted=false → 확장자·용량 거부 / true → 서버·네트워크 오류
        dz.on('error', (file: DropzoneFile, msg: string | Error) => {
            const item = manager.files.find(f => f.dropzoneFile === file);
            if (!item) return;
            const { name, uploadStarted } = item;
            manager.removeFile(item.id, dz);
            const errMsg = typeof msg === 'string' ? msg : msg.message;
            alert(uploadStarted
                ? `${name}\n${getMessage('web.js.error.upload')}`
                : `${name}\n${errMsg || '허용되지 않은 파일입니다.'}`
            );
        });

        // ── 파일 1개 완료 → 다음 파일 순차 처리 ─────────────────────────
        // parallelUploads:1 + autoProcessQueue:false 조합에서 직접 호출 필요
        dz.on('complete', () => {
            if (getIsProcessing()
                && dz.getUploadingFiles().length === 0
                && dz.getQueuedFiles().length   > 0) {
                dz.processQueue();
            }
        });

        // ── 전체 큐 완료 ─────────────────────────────────────────────────
        dz.on('queuecomplete', () => {
            const hasSuccess     = manager.files.some(f => f.status === 'success');
            const hasNonDropzone = manager.files.some(f => f.dropzoneFile === null);

            if (hasSuccess || hasNonDropzone) {
                setTimeout(doSubmit, 300);
            } else {
                setIsProcessing(false);
                const btn = document.getElementById(submitBtnId) as HTMLButtonElement | null;
                if (btn) btn.disabled = false;
            }
        });

        // ── 최종 서버 등록 ───────────────────────────────────────────────
        const doSubmit = (): void => {
            const files: SubmitFileItem[] = manager.files.map(f => {
                if (f.isOld)     return { isOld: true, fileInfoId: f.fileInfoId, docInfoId: f.docInfoId, docKindId: f.docKindId };
                if (f.isScanned) return { isScanned: true, fileNm: f.serverFileNm ?? undefined, fdKey01: f.fdKey01, fdKey02: f.fdKey02, docKindId: f.docKindId };
                return { fileNm: f.serverFileNm ?? undefined, srcFileNm: f.name, docKindId: f.docKindId };
            });

            onSubmit({
                files,
                extra: getExtra(),
                done(success = true) {
                    if (success) manager.markAllRegistered();
                    setIsProcessing(false);
                    const btn = document.getElementById(submitBtnId) as HTMLButtonElement | null;
                    if (btn) btn.disabled = false;
                },
            });
        };

        this.#dz       = dz;
        this.#doSubmit = doSubmit;
    }
}
