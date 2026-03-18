// =====================================================================
// dzEvents.js — Dropzone 인스턴스 초기화 및 이벤트 핸들러
// =====================================================================

/**
 * @param {{
 *   manager:         ReturnType<import('./fileManager.js').createFileManager>,
 *   elCfg:           object,
 *   getMessage:      (key: string) => string,
 *   uploadUrl:       string,
 *   maxFilesize:     number,
 *   acceptedFiles:   string | null,
 *   submitBtnId:     string,
 *   onSubmit:        (payload: object) => void,
 *   getExtra:        () => object,
 *   getIsProcessing: () => boolean,
 *   setIsProcessing: (v: boolean) => void,
 * }} deps
 * @returns {{ dz: Dropzone, doSubmit: () => void } | null}
 */
export function initDropzone({
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
}) {
    const wrapperEl = document.getElementById(elCfg.wrapperId);
    if (!wrapperEl) return null;

    if (typeof Dropzone === 'undefined') {
        console.error('[FilePort] Dropzone 라이브러리를 찾을 수 없습니다.');
        return null;
    }

    const dz = new Dropzone('#' + elCfg.wrapperId, {
        url:               uploadUrl,
        autoProcessQueue:  false,
        maxFilesize,
        parallelUploads:   1,
        acceptedFiles,
        addRemoveLinks:    false,
        clickable:         '#' + elCfg.fileAddBtnId,
        previewsContainer: false,
    });

    // ── 드래그 강조 ──────────────────────────────────────────────────
    dz.on('dragover',  () => wrapperEl.classList.add('drag-over'));
    dz.on('dragleave', () => wrapperEl.classList.remove('drag-over'));
    dz.on('drop',      () => wrapperEl.classList.remove('drag-over'));

    // ── 파일 추가 ────────────────────────────────────────────────────
    dz.on('addedfile', file => manager.addFile(file));

    // ── 업로드 직전: 상태 변경 + 추가 파라미터 첨부 ──────────────────
    dz.on('sending', (file, _xhr, formData) => {
        const item = manager.files.find(f => f.dropzoneFile === file);
        if (!item) return;
        item.uploadStarted = true;
        manager.updateStatus(item.id, 'uploading');
        formData.append('docKindId', item.docKindId || '');
        if (typeof USER_ID !== 'undefined') formData.append('USER_ID', USER_ID);
        if (typeof ORG_ID  !== 'undefined') formData.append('ORG_ID',  ORG_ID);
    });

    // ── 업로드 성공: 서버 응답에서 저장 파일명(json.id) 추출 ─────────
    dz.on('success', (file, response) => {
        const item = manager.files.find(f => f.dropzoneFile === file);
        if (!item) return;
        try {
            const json = typeof response === 'string' ? JSON.parse(response) : response;
            if (json?.id) {
                item.serverFileNm = json.id;
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
    dz.on('error', (file, msg) => {
        const item = manager.files.find(f => f.dropzoneFile === file);
        if (!item) return;
        const { name, uploadStarted } = item;
        manager.removeFile(item.id, dz);
        alert(uploadStarted
            ? `${name}\n${getMessage('web.js.error.upload')}`
            : `${name}\n${(typeof msg === 'string' && msg) || '허용되지 않은 파일입니다.'}`
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
            // 전부 실패·제거 → 버튼 재활성화
            setIsProcessing(false);
            const btn = document.getElementById(submitBtnId);
            if (btn) btn.disabled = false;
        }
    });

    // ── 최종 서버 등록 ───────────────────────────────────────────────
    function doSubmit() {
        const files = manager.files.map(f => {
            if (f.isOld)     return { isOld: true, fileInfoId: f.fileInfoId, docInfoId: f.docInfoId };
            if (f.isScanned) return { isScanned: true, fileNm: f.serverFileNm, fdKey01: f.fdKey01, fdKey02: f.fdKey02 };
            return { fileNm: f.serverFileNm, srcFileNm: f.name };
        });

        onSubmit({
            files,
            extra: getExtra(),
            done(success = true) {
                if (success) manager.markAllRegistered();
                setIsProcessing(false);
                const btn = document.getElementById(submitBtnId);
                if (btn) btn.disabled = false;
            },
        });
    }

    return { dz, doSubmit };
}
