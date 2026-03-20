import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileManager } from '../fileManager.js';
import type { DropzoneFile } from '../types.js';

// DropzoneFile 최소 mock
function makeDzFile(name: string, size = 1024): DropzoneFile {
    return { name, size } as unknown as DropzoneFile;
}

// ───────────────────────────────────────────────────────────────────────────
describe('FileManager', () => {
    let manager: FileManager;
    let onUpdate: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onUpdate = vi.fn();
        manager  = new FileManager({
            getMessage: key => key,
            onUpdate,
        });
    });

    // ── addFile ─────────────────────────────────────────────────────────
    describe('addFile', () => {
        it('파일을 목록에 추가한다', () => {
            manager.addFile(makeDzFile('hello.pdf'));
            expect(manager.files).toHaveLength(1);
            expect(manager.files[0].name).toBe('hello.pdf');
        });

        it('추가된 파일의 초기 상태는 pending', () => {
            manager.addFile(makeDzFile('a.pdf'));
            expect(manager.files[0].status).toBe('pending');
        });

        it('추가 시 onUpdate가 호출된다', () => {
            manager.addFile(makeDzFile('a.pdf'));
            expect(onUpdate).toHaveBeenCalledOnce();
        });

        it('checked 기본값은 true', () => {
            manager.addFile(makeDzFile('a.pdf'));
            expect(manager.files[0].checked).toBe(true);
        });

        it('고유한 id를 반환한다', () => {
            const id1 = manager.addFile(makeDzFile('a.pdf'));
            const id2 = manager.addFile(makeDzFile('b.pdf'));
            expect(id1).not.toBe(id2);
        });
    });

    // ── removeFile ───────────────────────────────────────────────────────
    describe('removeFile', () => {
        it('파일을 목록에서 제거한다', () => {
            const id = manager.addFile(makeDzFile('a.pdf'));
            manager.removeFile(id);
            expect(manager.files).toHaveLength(0);
        });

        it('없는 id는 무시한다', () => {
            manager.addFile(makeDzFile('a.pdf'));
            manager.removeFile(9999);
            expect(manager.files).toHaveLength(1);
        });

        it('dropzone.removeFile을 함께 호출한다', () => {
            const dzFile  = makeDzFile('a.pdf');
            const mockDz  = { removeFile: vi.fn() };
            const id      = manager.addFile(dzFile);
            manager.removeFile(id, mockDz as any);
            expect(mockDz.removeFile).toHaveBeenCalledWith(dzFile);
        });
    });

    // ── addFileInfo ──────────────────────────────────────────────────────
    describe('addFileInfo', () => {
        it('scan 파일은 isScanned=true, status=pending', () => {
            manager.addFileInfo({ fileNm: 'scan.pdf', fileSize: 512 }, 'scan');
            const f = manager.files[0];
            expect(f.isScanned).toBe(true);
            expect(f.status).toBe('pending');
        });

        it('modify 파일은 isOld=true, status=success', () => {
            manager.addFileInfo({ fileNm: 'old.pdf', fileInfoId: 'FI001', docInfoId: 'DI001' }, 'modify');
            const f = manager.files[0];
            expect(f.isOld).toBe(true);
            expect(f.status).toBe('success');
        });

        it('fileSize가 없으면 size=0', () => {
            manager.addFileInfo({ fileNm: 'a.pdf' }, 'scan');
            expect(manager.files[0].size).toBe(0);
        });
    });

    // ── setDocKind ───────────────────────────────────────────────────────
    describe('setDocKind', () => {
        it('문서종류를 설정한다', () => {
            const id = manager.addFile(makeDzFile('a.pdf'));
            manager.setDocKind(id, { id: 'CONTRACT', name: '계약서' });
            expect(manager.files[0].docKindId).toBe('CONTRACT');
            expect(manager.files[0].docKindNm).toBe('계약서');
        });

        it('null 전달 시 초기화된다', () => {
            const id = manager.addFile(makeDzFile('a.pdf'));
            manager.setDocKind(id, { id: 'CONTRACT', name: '계약서' });
            manager.setDocKind(id, null);
            expect(manager.files[0].docKindId).toBeNull();
            expect(manager.files[0].docKindNm).toBeNull();
        });

        it('없는 id는 무시한다', () => {
            manager.setDocKind(9999, { id: 'X', name: 'Y' });
            expect(manager.files).toHaveLength(0);
        });
    });

    // ── toggleCheck / toggleAll ──────────────────────────────────────────
    describe('toggleCheck', () => {
        it('특정 파일의 checked를 변경한다', () => {
            const id = manager.addFile(makeDzFile('a.pdf'));
            manager.toggleCheck(id, false);
            expect(manager.files[0].checked).toBe(false);
        });
    });

    describe('toggleAll', () => {
        it('전체 파일의 checked를 false로 변경한다', () => {
            manager.addFile(makeDzFile('a.pdf'));
            manager.addFile(makeDzFile('b.pdf'));
            manager.toggleAll(false);
            expect(manager.files.every(f => !f.checked)).toBe(true);
        });

        it('전체 파일의 checked를 true로 변경한다', () => {
            manager.addFile(makeDzFile('a.pdf'));
            manager.addFile(makeDzFile('b.pdf'));
            manager.toggleAll(false);
            manager.toggleAll(true);
            expect(manager.files.every(f => f.checked)).toBe(true);
        });
    });

    // ── updateStatus ─────────────────────────────────────────────────────
    describe('updateStatus', () => {
        it('상태를 변경한다', () => {
            const id = manager.addFile(makeDzFile('a.pdf'));
            manager.updateStatus(id, 'success');
            expect(manager.files[0].status).toBe('success');
        });

        it('uploadTime을 함께 저장한다', () => {
            const id   = manager.addFile(makeDzFile('a.pdf'));
            const time = '2024-01-01 12:00';
            manager.updateStatus(id, 'success', time);
            expect(manager.files[0].uploadTime).toBe(time);
        });

        it('없는 id는 무시한다', () => {
            manager.updateStatus(9999, 'success');
            expect(manager.files).toHaveLength(0);
        });
    });

    // ── markAllRegistered ────────────────────────────────────────────────
    describe('markAllRegistered', () => {
        it('모든 파일을 registered=true로 변경한다', () => {
            manager.addFile(makeDzFile('a.pdf'));
            manager.addFile(makeDzFile('b.pdf'));
            manager.markAllRegistered();
            expect(manager.files.every(f => f.registered)).toBe(true);
        });
    });

    // ── formatFileSize ────────────────────────────────────────────────────
    describe('formatFileSize', () => {
        it.each([
            [0,              '0 Bytes'],
            [1024,           '1 KB'],
            [1024 * 1024,    '1 MB'],
            [1536,           '1.5 KB'],
        ])('%i bytes → %s', (bytes, expected) => {
            expect(manager.formatFileSize(bytes)).toBe(expected);
        });
    });

    // ── getStatusText ─────────────────────────────────────────────────────
    describe('getStatusText', () => {
        it('getMessage 키를 올바르게 조회한다', () => {
            const m = new FileManager({
                getMessage: key => ({ 'web.file.status.pending': '대기' })[key] ?? key,
                onUpdate:   vi.fn(),
            });
            expect(m.getStatusText('pending')).toBe('대기');
        });

        it('키 미정의 시 status 값을 반환한다', () => {
            expect(manager.getStatusText('error')).toBe('web.file.status.error');
        });
    });
});
