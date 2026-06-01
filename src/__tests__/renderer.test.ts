import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileManager } from '../fileManager.js';
import { Renderer }    from '../renderer.js';
import type { ElementConfig, ColumnDef } from '../types.js';
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
            <div id="fileTable" class="fp-table">
                <div class="fp-thead"><div class="fp-tr">
                    <div class="fp-th fp-th-check"><input type="checkbox" id="checkAll"></div>
                    <div class="fp-th fp-th-name">파일명</div>
                    <div class="fp-th fp-th-dockind">문서종류</div>
                    <div class="fp-th fp-th-size">크기</div>
                    <div class="fp-th fp-th-status">상태</div>
                    <div class="fp-th fp-th-action">작업</div>
                </div></div>
                <div id="fileList" class="fp-tbody"></div>
            </div>
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

function makeSetup(opts: { showDocKind?: boolean; docKindList?: { id: string; name: string }[]; columns?: ColumnDef[] } = {}) {
    const onUpdate = vi.fn();
    const manager  = new FileManager({ getMessage: key => key, onUpdate });
    const renderer = new Renderer({
        manager,
        elCfg:       EL_CFG,
        getMessage:  key => key,
        showDocKind: opts.showDocKind ?? false,
        docKindList: opts.docKindList ?? [],
        columns:     opts.columns,
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

        it('파일이 없으면 단일 셀 안내 문구가 렌더링된다', () => {
            const { renderer } = makeSetup();
            renderer.renderTable();
            const msgCell = document.querySelector('.drop-row .drop-row-msg') as HTMLDivElement | null;
            expect(msgCell).not.toBeNull();
            expect(document.querySelectorAll('.drop-row .fp-td')).toHaveLength(1);
        });

        it('simple 모드에서도 단일 셀 안내 문구가 렌더링된다', () => {
            const { renderer } = makeSetup();
            renderer.renderTable({ simple: true });
            const msgCell = document.querySelector('.drop-row .drop-row-msg') as HTMLDivElement | null;
            expect(msgCell).not.toBeNull();
            expect(document.querySelectorAll('.drop-row .fp-td')).toHaveLength(1);
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
            const rows = document.querySelectorAll('#fileList > .fp-tr');
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
            expect(document.querySelectorAll('#fileList > .fp-tr')).toHaveLength(1);
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
            // textContent는 그대로 표시되어야 함 (이스케이프 불필요, textContent는 안전)
            const nameCell = document.querySelector('.fp-td-name');
            expect(nameCell?.textContent).toBe('<script>alert(1)</script>.pdf');
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

    // ── columns 옵션 (선언적 컬럼 구성) ───────────────────────────────
    describe('columns 옵션', () => {
        it('columns 순서대로 바디 셀이 렌더링된다', () => {
            const { manager, renderer } = makeSetup({
                columns: [{ key: 'status' }, { key: 'name' }, { key: 'action' }],
            });
            manager.addFile(makeDzFile('a.pdf'));
            renderer.renderTable();
            const row = document.querySelector('#fileList > .fp-tr')!;
            const cells = Array.from(row.children).map(c => c.className);
            expect(cells).toHaveLength(3);
            expect(cells[0]).toContain('fp-td-status');
            expect(cells[1]).toContain('fp-td-name');
            expect(cells[2]).toContain('fp-td-action');
        });

        it('visible:false 컬럼은 바디·헤더 모두 렌더링되지 않는다', () => {
            const { manager, renderer } = makeSetup({
                columns: [{ key: 'name' }, { key: 'size', visible: false }, { key: 'status' }],
            });
            manager.addFile(makeDzFile('a.pdf'));
            renderer.renderTable();
            expect(document.querySelector('#fileList .fp-td-size')).toBeNull();
            expect(document.querySelector('#fileList .fp-td-name')).not.toBeNull();
            expect(document.querySelector('.fp-thead .fp-th-size')).toBeNull();
        });

        it('columns 지정 시 헤더(.fp-thead)가 그 순서로 재생성된다', () => {
            const { renderer } = makeSetup({
                columns: [{ key: 'status' }, { key: 'name' }],
            });
            renderer.renderTable();
            const ths = Array.from(document.querySelectorAll('.fp-thead .fp-th')).map(t => t.className);
            expect(ths).toHaveLength(2);
            expect(ths[0]).toContain('fp-th-status');
            expect(ths[1]).toContain('fp-th-name');
        });

        it('header 미지정 시 getMessage 기본 라벨이 헤더에 들어간다', () => {
            const { renderer } = makeSetup({ columns: [{ key: 'name' }] });
            renderer.renderTable();
            // 테스트 getMessage는 identity 이므로 키 그대로
            expect(document.querySelector('.fp-thead .fp-th-name')?.textContent).toBe('web.file.column.name');
        });

        it('header 지정 시 그 라벨이 헤더에 들어간다', () => {
            const { renderer } = makeSetup({ columns: [{ key: 'name', header: 'File' }] });
            renderer.renderTable();
            expect(document.querySelector('.fp-thead .fp-th-name')?.textContent).toBe('File');
        });

        it('check 컬럼 헤더에 checkAll 체크박스가 생성된다', () => {
            const { renderer } = makeSetup({ columns: [{ key: 'check' }, { key: 'name' }] });
            renderer.renderTable();
            expect(document.querySelector('.fp-thead .fp-th-check input#checkAll')).not.toBeNull();
        });
    });

    // ── 런타임 교체 (외부 push / ⚙ 개인화) ────────────────────────────
    describe('런타임 setColumns / setDocKindList / getColumns', () => {
        it('setColumns로 바디 셀 순서가 런타임에 바뀐다', () => {
            const { manager, renderer } = makeSetup({ columns: [{ key: 'name' }, { key: 'size' }] });
            manager.addFile(makeDzFile('a.pdf'));
            renderer.renderTable();
            renderer.setColumns([{ key: 'size' }, { key: 'name' }]);
            const cells = Array.from(document.querySelector('#fileList > .fp-tr')!.children).map(c => c.className);
            expect(cells[0]).toContain('fp-td-size');
            expect(cells[1]).toContain('fp-td-name');
        });

        it('setColumns로 헤더도 갱신된다', () => {
            const { renderer } = makeSetup({ columns: [{ key: 'name' }] });
            renderer.renderTable();
            renderer.setColumns([{ key: 'status' }, { key: 'name' }]);
            const ths = Array.from(document.querySelectorAll('.fp-thead .fp-th')).map(t => t.className);
            expect(ths[0]).toContain('fp-th-status');
            expect(ths[1]).toContain('fp-th-name');
        });

        it('getColumns가 현재 적용 컬럼을 반환한다', () => {
            const { renderer } = makeSetup({ columns: [{ key: 'name' }] });
            renderer.setColumns([{ key: 'size' }, { key: 'status' }]);
            expect(renderer.getColumns()?.map(c => c.key)).toEqual(['size', 'status']);
        });

        it('setDocKindList로 dockind select 옵션이 런타임에 갱신된다', () => {
            const { manager, renderer } = makeSetup({
                showDocKind: true,
                docKindList: [{ id: 'A', name: '에이' }],
                columns: [{ key: 'name' }, { key: 'dockind' }],
            });
            manager.addFile(makeDzFile('a.pdf'));
            renderer.renderTable();
            renderer.setDocKindList([{ id: 'B', name: '비' }, { id: 'C', name: '씨' }]);
            const opts = Array.from(document.querySelectorAll('.doc-kind-select option')).map(o => o.textContent);
            expect(opts).toContain('비');
            expect(opts).toContain('씨');
            expect(opts).not.toContain('에이');
        });
    });
});
