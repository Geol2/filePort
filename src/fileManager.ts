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

export class FileManager {
    readonly #files: FileItem[] = [];
    readonly #getMessage: (key: string) => string;
    readonly #onUpdate:   () => void;

    constructor({ getMessage, onUpdate }: FileManagerDeps) {
        this.#getMessage = getMessage;
        this.#onUpdate   = onUpdate;
    }

    get files(): FileItem[] { return this.#files; }

    #notify(): void { this.#onUpdate?.(); }

    // ── 파일 추가 ────────────────────────────────────────────────────
    addFile(dzFile: DropzoneFile): number {
        const item: FileItem = {
            id:           Date.now() + Math.random(),
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
    removeFile(fileId: number, dropzone: DropzoneInstance | null = null): void {
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
            id:           Date.now() + Math.random(),
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
    setDocKind(fileId: number, docKind: DocKind | null): void {
        const item = this.#files.find(f => f.id === fileId);
        if (!item) return;
        item.docKindId = docKind?.id   ?? null;
        item.docKindNm = docKind?.name ?? null;
        this.#notify();
    }

    // ── 체크박스 ─────────────────────────────────────────────────────
    toggleCheck(fileId: number, checked: boolean): void {
        const item = this.#files.find(f => f.id === fileId);
        if (item) { item.checked = checked; this.#notify(); }
    }

    toggleAll(checked: boolean): void {
        this.#files.forEach(f => { f.checked = checked; });
        this.#notify();
    }

    // ── 상태 변경 ────────────────────────────────────────────────────
    updateStatus(fileId: number, status: FileStatus, uploadTime: string | null = null): void {
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
