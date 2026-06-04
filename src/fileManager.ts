// =====================================================================
// fileManager.ts — 파일 목록 순수 상태 관리
// DOM 접근 없음. 상태 변경 시 onUpdate 콜백을 통해 렌더러에 알림.
// =====================================================================

import type { FileItem, FileInfoData, FileInfoType, FileStatus, DocKind, DropzoneInstance, DropzoneFile } from './types.js';

const STATUS_KEY: Record<FileStatus, string> = {
    pending:   'web.file.status.pending',
    uploading: 'web.file.status.uploading',
    success:   'web.file.status.success',
    error:     'web.file.status.error',
};

interface FileManagerDeps {
    getMessage: (key: string) => string;
    onUpdate:   () => void;
}

/**
 * UUID v4 생성.
 * crypto.randomUUID()는 보안 컨텍스트(HTTPS·localhost)에서만 제공된다.
 * HTTP(비-localhost) 개발서버 등에서는 undefined 이므로, crypto.getRandomValues 폴백 →
 * 그마저 없으면 Math.random 폴백으로 안전하게 ID를 생성한다.
 */
function safeUUID(): string {
    const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
    if (c && typeof c.randomUUID === 'function') {
        return c.randomUUID();
    }
    if (c && typeof c.getRandomValues === 'function') {
        const b = c.getRandomValues(new Uint8Array(16));
        b[6] = (b[6] & 0x0f) | 0x40;   // version 4
        b[8] = (b[8] & 0x3f) | 0x80;   // variant
        const h: string[] = [];
        for (let i = 0; i < 256; i++) h.push((i + 256).toString(16).slice(1));
        return `${h[b[0]]}${h[b[1]]}${h[b[2]]}${h[b[3]]}-${h[b[4]]}${h[b[5]]}-${h[b[6]]}${h[b[7]]}-${h[b[8]]}${h[b[9]]}-${h[b[10]]}${h[b[11]]}${h[b[12]]}${h[b[13]]}${h[b[14]]}${h[b[15]]}`;
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
        const r = (Math.random() * 16) | 0;
        return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

export class FileManager {
    readonly #files: FileItem[] = [];
    readonly #getMessage: (key: string) => string;
    readonly #onUpdate:   () => void;

    constructor({ getMessage, onUpdate }: FileManagerDeps) {
        this.#getMessage = getMessage;
        this.#onUpdate   = onUpdate;
    }

    get files(): FileItem[] { return [...this.#files]; }

    #notify(): void { this.#onUpdate?.(); }

    // ── 파일 추가 ────────────────────────────────────────────────────
    addFile(dzFile: DropzoneFile): string {
        const item: FileItem = {
            id:           safeUUID(),
            name:         dzFile.name,
            size:         dzFile.size,
            status:       'pending',
            uploadTime:   null,
            dropzoneFile: dzFile,
            checked:      true,
            registered:   false,
            serverFileNm: null,
            docKindId:    null,
            docKindNm:    null,
        };
        this.#files.push(item);
        this.#notify();
        return item.id;
    }

    // ── 파일 제거 (Dropzone 큐에서도 함께 제거) ──────────────────────
    removeFile(fileId: string, dropzone: DropzoneInstance | null = null): void {
        const idx = this.#files.findIndex(f => f.id === fileId);
        if (idx === -1) return;
        const item = this.#files[idx];
        if (item.dropzoneFile && dropzone) {
            dropzone.removeFile(item.dropzoneFile);
        }
        this.#files.splice(idx, 1);
        this.#notify();
    }

    // ── 스캔·기존(수정 모드) 파일을 목록에 직접 추가 ─────────────────
    addFileInfo(data: FileInfoData, type: FileInfoType): void {
        const item: FileItem = {
            id:           safeUUID(),
            name:         data.fileNm || data.srcFileNm || '',
            size:         data.fileSize || 0,
            status:       type === 'modify' ? 'success' : 'pending',
            uploadTime:   null,
            dropzoneFile: null,
            checked:      true,
            registered:   false,
            serverFileNm: null,
            docKindId:    data.docKindId || null,
            docKindNm:    data.docKindNm || null,
            ...(type === 'scan'   && { isScanned: true,  serverFileNm: data.serverFileNm ?? null, fdKey01: data.fdKey01, fdKey02: data.fdKey02 }),
            ...(type === 'modify' && { isOld: true, fileInfoId: data.fileInfoId, docInfoId: data.docInfoId, isUploaded: true }),
        };
        this.#files.push(item);
        this.#notify();
    }

    // ── 문서종류 변경 ─────────────────────────────────────────────────
    setDocKind(fileId: string, docKind: DocKind | null): void {
        const item = this.#files.find(f => f.id === fileId);
        if (!item) return;
        item.docKindId = docKind?.id   ?? null;
        item.docKindNm = docKind?.name ?? null;
        this.#notify();
    }

    // ── 체크박스 ─────────────────────────────────────────────────────
    toggleCheck(fileId: string, checked: boolean): void {
        const item = this.#files.find(f => f.id === fileId);
        if (item) { item.checked = checked; this.#notify(); }
    }

    toggleAll(checked: boolean): void {
        this.#files.forEach(f => { f.checked = checked; });
        this.#notify();
    }

    // ── 상태 변경 ────────────────────────────────────────────────────
    updateStatus(fileId: string, status: FileStatus, uploadTime: string | null = null): void {
        const item = this.#files.find(f => f.id === fileId);
        if (!item) return;
        item.status = status;
        if (uploadTime) item.uploadTime = uploadTime;
        this.#notify();
    }

    markAllRegistered(): void {
        this.#files.forEach(f => { f.registered = true; });
        this.#notify();
    }

    // ── 유틸 ─────────────────────────────────────────────────────────
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getStatusText(status: FileStatus): string {
        return this.#getMessage(STATUS_KEY[status] ?? ('web.file.status.' + status)) || status;
    }
}
