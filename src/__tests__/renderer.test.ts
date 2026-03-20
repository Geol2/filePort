import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileManager } from '../fileManager.js';
import { Renderer }    from '../renderer.js';
import type { ElementConfig } from '../types.js';
import type { DropzoneFile }  from '../types.js';

// ───────────────────────────────────────────────────────────────────────────
// 테스트용 DOM 셋업 헬퍼
// ───────────────────────────────────────────────────────────────────────────

const EL_CFG: ElementConfig = {
    wrapperId:       'tableWrapper',
    fileAddBtnId:    'btnFileAdd',
    tableId:         'fileTable',
    tbodyId:         'fileList',
    checkAllId:      'checkAll',
    footerSizeId:    'footerSize',
    progressFillId:  'progressFill',
    footerPercentId: 'footerPercent',
};

function setupDOM(): void {
    document.body.innerHTML = `
        <div id="tableWrapper">
            <table id="fileTable">
                <thead><tr>
                    <th><input type="checkbox" id="checkAll"></th>
                    <th>파일명</th><th>문서종류</th><th>크기</th><th>상태</th><th>작업</th>
                </tr></thead>
                <tbody id="fileList"></tbody>
            </table>
            <div>
                <span id="footerSize"></span>
                <div><div id="progressFill" style="width:0%"></div></div>
                <span id="footerPercent"></span>
            </div>
        </div>
        <button id="btnFileAdd"></button>
    `;
}

function makeDzFile(name: string, size = 512): DropzoneFile {
    return { name, size } as unknown as DropzoneFile;
}

function makeSetup(opts: { showDocKind?: boolean; docKindList?: { id: string; name: string }[] } = {}) {
    const onUpdate = vi.fn();
    const manager  = new FileManager({ getMessage: key => key, onUpdate });
    const renderer = new Renderer({
        manager,
        elCfg:       EL_CFG,
        getMessage:  key => key,
        showDocKind: opts.showDocKind ?? false,
        docKindList: opts.docKindList ?? [],
    });
    // onUpdate가 renderTable을 호출하도록 연결
    onUpdate.mockImplementation(() => renderer.renderTable());
    return { manager, renderer };
}

// ───────────────────────────────────────────────────────────────────────────
describe('Renderer', () => {
    beforeEach(setupDOM);

    // ── 빈 상태 ────────────────────────────────────────────────────────
    describe('renderTable — 빈 상태', () => {
        it('파일이 없으면 drop-row를 렌더링한다', () => {
            const { renderer } = makeSetup();
            renderer.renderTable();
            const row = document.querySelector('.drop-row');
            expect(row).not.toBeNull();
        });

        it('파일이 없으면 단일 셀(colspan=6) 안내 문구가 렌더링된다', () => {
            const { renderer } = makeSetup();
            renderer.renderTable();
            const msgCell = document.querySelector('.drop-row td.drop-row-msg') as HTMLTableCellElement | null;
            expect(msgCell).not.toBeNull();
            expect(msgCell!.getAttribute('colspan')).toBe('6');
            expect(document.querySelectorAll('.drop-row td')).toHaveLength(1);
        });

        it('simple 모드에서는 단일 셀(colspan=4) 안내 문구가 렌더링된다', () => {
            const { renderer } = makeSetup();
            renderer.renderTable({ simple: true });
            const msgCell = document.querySelector('.drop-row td.drop-row-msg') as HTMLTableCellElement | null;
            expect(msgCell).not.toBeNull();
            expect(msgCell!.getAttribute('colspan')).toBe('4');
            expect(document.querySelectorAll('.drop-row td')).toHaveLength(1);
        });

        it('파일이 없으면 table-empty 클래스가 붙는다', () => {
            const { renderer } = makeSetup();
            renderer.renderTable();
            expect(document.getElementById('fileTable')!.classList.contains('table-empty')).toBe(true);
        });

        it('파일이 없으면 wrapper에 empty-state 클래스가 붙는다', () => {
            const { renderer } = makeSetup();
            renderer.renderTable();
            expect(document.getElementById('tableWrapper')!.classList.contains('table-empty-state')).toBe(true);
        });

        it('footerSize가 "0 Bytes · 0web.file.countUnit" 형식으로 표시된다', () => {
            const { renderer } = makeSetup();
            renderer.renderTable();
            expect(document.getElementById('footerSize')!.textContent).toContain('0 Bytes');
        });
    });

    // ── 파일 추가 후 ──────────────────────────────────────────────────
    describe('renderTable — 파일 있음', () => {
        it('파일 행이 tbody에 추가된다', () => {
            const { manager, renderer } = makeSetup();
            manager.addFile(makeDzFile('report.pdf', 2048));
            renderer.renderTable();
            const rows = document.querySelectorAll('#fileList tr');
            expect(rows).toHaveLength(1);
        });

        it('파일명이 행에 표시된다', () => {
            const { manager, renderer } = makeSetup();
            manager.addFile(makeDzFile('report.pdf'));
            renderer.renderTable();
            expect(document.body.textContent).toContain('report.pdf');
        });

        it('table-empty 클래스가 제거된다', () => {
            const { manager, renderer } = makeSetup();
            manager.addFile(makeDzFile('a.pdf'));
            renderer.renderTable();
            expect(document.getElementById('fileTable')!.classList.contains('table-empty')).toBe(false);
        });

        it('파일이 있으면 wrapper의 empty-state 클래스가 제거된다', () => {
            const { manager, renderer } = makeSetup();
            renderer.renderTable();
            manager.addFile(makeDzFile('a.pdf'));
            renderer.renderTable();
            expect(document.getElementById('tableWrapper')!.classList.contains('table-empty-state')).toBe(false);
        });

        it('파일 추가 시 onUpdate로 자동 렌더링된다', () => {
            const { manager } = makeSetup();
            manager.addFile(makeDzFile('auto.pdf'));
            // onUpdate → renderTable이 이미 호출됨
            expect(document.querySelectorAll('#fileList tr')).toHaveLength(1);
        });
    });

    // ── 문서종류 select ───────────────────────────────────────────────
    describe('renderTable — 문서종류', () => {
        it('showDocKind=true + docKindList 있으면 select가 렌더링된다', () => {
            const { manager, renderer } = makeSetup({
                showDocKind: true,
                docKindList: [{ id: 'CONTRACT', name: '계약서' }],
            });
            manager.addFile(makeDzFile('a.pdf'));
            renderer.renderTable();
            expect(document.querySelector('.doc-kind-select')).not.toBeNull();
        });

        it('showDocKind=false면 select가 없다', () => {
            const { manager, renderer } = makeSetup({ showDocKind: false });
            manager.addFile(makeDzFile('a.pdf'));
            renderer.renderTable();
            expect(document.querySelector('.doc-kind-select')).toBeNull();
        });
    });

    // ── 상태 배지 ─────────────────────────────────────────────────────
    describe('renderTable — 상태 배지', () => {
        it('pending 파일에 status-pending 클래스가 붙는다', () => {
            const { manager, renderer } = makeSetup();
            manager.addFile(makeDzFile('a.pdf'));
            renderer.renderTable();
            expect(document.querySelector('.status-pending')).not.toBeNull();
        });

        it('success 파일에 삭제 버튼 대신 완료 버튼이 표시된다', () => {
            const { manager, renderer } = makeSetup();
            const id = manager.addFile(makeDzFile('a.pdf'));
            manager.updateStatus(id, 'success');
            renderer.renderTable();
            expect(document.querySelector('.btn-registered')).not.toBeNull();
            expect(document.querySelector('.btn-delete')).toBeNull();
        });
    });

    // ── 하단 통계 바 ─────────────────────────────────────────────────
    describe('통계 바', () => {
        it('파일 1개 추가 시 footerSize에 건수가 표시된다', () => {
            const { manager, renderer } = makeSetup();
            manager.addFile(makeDzFile('a.pdf', 1024));
            renderer.renderTable();
            expect(document.getElementById('footerSize')!.textContent).toContain('1');
        });

        it('success 파일 비율만큼 progressFill이 넓어진다', () => {
            const { manager, renderer } = makeSetup();
            const id = manager.addFile(makeDzFile('a.pdf'));
            manager.updateStatus(id, 'success');
            renderer.renderTable();
            expect(document.getElementById('progressFill')!.style.width).toBe('100%');
        });

        it('파일이 없으면 percent가 0%', () => {
            const { renderer } = makeSetup();
            renderer.renderTable();
            expect(document.getElementById('footerPercent')!.textContent).toBe('0%');
        });
    });

    // ── XSS 방어 ─────────────────────────────────────────────────────
    describe('XSS 방어', () => {
        it('<script> 태그가 DOM 엘리먼트로 삽입되지 않는다', () => {
            const { manager, renderer } = makeSetup();
            manager.addFile(makeDzFile('<script>alert(1)</script>.pdf'));
            renderer.renderTable();
            // 실제 <script> 엘리먼트가 tbody 안에 생성되면 안 됨
            expect(document.getElementById('fileList')!.querySelector('script')).toBeNull();
            // innerHTML에 원시 <script 태그가 없어야 함
            expect(document.getElementById('fileList')!.innerHTML).not.toMatch(/<script[\s>]/i);
        });
    });

    // ── 삭제 이벤트 ──────────────────────────────────────────────────
    describe('attachEvents — 삭제 버튼', () => {
        it('삭제 버튼 클릭 시 파일이 제거된다', () => {
            const { manager, renderer } = makeSetup();
            manager.addFile(makeDzFile('a.pdf'));
            renderer.renderTable();
            renderer.attachEvents(() => null);

            const btn = document.querySelector('.btn-delete') as HTMLButtonElement;
            btn.click();
            expect(manager.files).toHaveLength(0);
        });
    });
});
