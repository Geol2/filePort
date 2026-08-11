// =====================================================================
// renderer.ts — 테이블 DOM 렌더링 + 이벤트 위임
//
// columns 미지정: 기존 동작 — 헤더는 사용자 HTML, 바디는 simple 여부로 6/4열
//   simple: false (기본) → 체크박스·문서종류 포함 (6열)
//   simple: true         → 파일명·크기·상태·작업 (4열)
// columns 지정:   헤더(.fp-thead)까지 라이브러리가 columns 순서로 렌더
// =====================================================================

import type { FileManager } from './fileManager.js';
import type { ElementConfig, DocKind, DropzoneInstance, ColumnDef, ColumnKey, FileItem } from './types.js';

interface RendererDeps {
    manager:      FileManager;
    elCfg:        ElementConfig;
    getMessage:   (key: string) => string;
    showDocKind:  boolean;
    docKindList?: DocKind[];
    columns?:     ColumnDef[];
}

interface RenderOptions {
    simple?: boolean;
}

// columns 미지정 시 사용할 기본 컬럼 세트 (기존 동작 재현)
const FULL_COLUMNS: ColumnDef[] = [
    { key: 'check' }, { key: 'name' }, { key: 'dockind' },
    { key: 'size' }, { key: 'status' }, { key: 'action' },
];
const SIMPLE_COLUMNS: ColumnDef[] = [
    { key: 'name' }, { key: 'size' }, { key: 'status' }, { key: 'action' },
];

export class Renderer {
    readonly #manager:     FileManager;
    readonly #elCfg:       ElementConfig;
    readonly #getMessage:  (key: string) => string;
    readonly #showDocKind: boolean;
    #docKindList:          DocKind[];          // 런타임 교체 가능 (setDocKindList)
    #columns:              ColumnDef[] | null;  // 런타임 교체 가능 (setColumns)
    #headerRendered = false;
    #lastSimple     = false;                    // 런타임 재렌더 시 마지막 simple 값 유지

    constructor({ manager, elCfg, getMessage, showDocKind, docKindList = [], columns }: RendererDeps) {
        this.#manager     = manager;
        this.#elCfg       = elCfg;
        this.#getMessage  = getMessage;
        this.#showDocKind = showDocKind;
        this.#docKindList = docKindList;
        this.#columns     = columns && columns.length > 0 ? columns : null;
    }

    // ── 런타임 구성 교체 (외부 모듈 push / ⚙ 개인화) ─────────────────
    /** 컬럼 구성을 런타임에 교체하고 헤더+바디를 다시 그린다. */
    setColumns(columns: ColumnDef[] | null): void {
        this.#columns = columns && columns.length > 0 ? columns : null;
        this.#headerRendered = false;        // 헤더 강제 재생성
        this.renderTable({ simple: this.#lastSimple });
    }

    /** 문서종류 목록을 런타임에 교체하고 다시 그린다. (dockind select 옵션 갱신) */
    setDocKindList(list: DocKind[]): void {
        this.#docKindList = list ?? [];
        this.renderTable({ simple: this.#lastSimple });
    }

    /** 현재 적용된 컬럼 구성 (개인화 패널/저장용). columns 미지정 시 null */
    getColumns(): ColumnDef[] | null {
        return this.#columns;
    }

    // ── 메인 렌더 ─────────────────────────────────────────────────────
    renderTable({ simple = false }: RenderOptions = {}): void {
        this.#lastSimple = simple;
        const tbody = document.getElementById(this.#elCfg.tbodyId);
        const table = document.getElementById(this.#elCfg.tableId);
        const wrapper = document.getElementById(this.#elCfg.wrapperId);
        if (!tbody || !table) return;

        this.#ensureHeader();

        tbody.innerHTML = '';

        if (this.#manager.files.length === 0) {
            table.classList.add('table-empty');
            wrapper?.classList.add('table-empty-state');
            const tr = document.createElement('div');
            tr.className = 'fp-tr drop-row';
            const cell = document.createElement('div');
            cell.className = 'fp-td drop-row-msg';
            cell.textContent = this.#getMessage('web.confirm.file.fileUploadPlz');
            tr.appendChild(cell);
            tbody.appendChild(tr);
            this.#updateStats();
            return;
        }

        table.classList.remove('table-empty');
        wrapper?.classList.remove('table-empty-state');
        const columns = this.#columns ?? (simple ? SIMPLE_COLUMNS : FULL_COLUMNS);
        this.#manager.files.forEach(file => tbody.appendChild(this.#buildRow(file, columns)));
        this.#syncCheckAll();
        this.#updateStats();
    }

    // ── 헤더 렌더 (columns 지정 시 1회만) ─────────────────────────────
    // checkAll 체크박스를 헤더에 생성하므로 attachEvents 보다 먼저 보장되어야 한다.
    #ensureHeader(): void {
        if (!this.#columns || this.#headerRendered) return;
        const table = document.getElementById(this.#elCfg.tableId);
        if (!table) return;

        let thead = table.querySelector('.fp-thead');
        if (!thead) {
            thead = document.createElement('div');
            thead.className = 'fp-thead';
            table.insertBefore(thead, table.firstChild);
        }
        thead.innerHTML = '';

        const tr = document.createElement('div');
        tr.className = 'fp-tr';
        for (const col of this.#columns) {
            if (col.visible === false) continue;
            const th = document.createElement('div');
            th.className = `fp-th fp-th-${col.key}`;
            if (col.key === 'check') {
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.id   = this.#elCfg.checkAllId;
                th.appendChild(cb);
            } else {
                th.textContent = col.header ?? this.#getMessage(`web.file.column.${col.key}`);
            }
            tr.appendChild(th);
        }
        thead.appendChild(tr);
        this.#headerRendered = true;
    }

    // ── 행 생성 ───────────────────────────────────────────────────────
    #buildRow(file: FileItem, columns: ColumnDef[]): HTMLDivElement {
        const tr = document.createElement('div');
        tr.className = 'fp-tr';
        tr.dataset['fileId'] = String(file.id);
        for (const col of columns) {
            if (col.visible === false) continue;
            tr.appendChild(this.#renderCell(col.key, file));
        }
        return tr;
    }

    #renderCell(key: ColumnKey, file: FileItem): HTMLDivElement {
        switch (key) {
            case 'check':   return this.#cellCheck(file);
            case 'name':    return this.#cellName(file);
            case 'dockind': return this.#cellDockind(file);
            case 'size':    return this.#cellSize(file);
            case 'status':  return this.#cellStatus(file);
            case 'action':  return this.#cellAction(file);
        }
        throw new Error('unknown column key: ' + key);
    }

    // ── 셀 렌더러 (key별) ─────────────────────────────────────────────
    #cellCheck(file: FileItem): HTMLDivElement {
        const td = this.#td('text-center fp-td-check');
        const cb = document.createElement('input');
        cb.type              = 'checkbox';
        cb.checked           = file.checked;
        cb.dataset['fileId'] = String(file.id);
        td.appendChild(cb);
        return td;
    }

    #cellName(file: FileItem): HTMLDivElement {
        const td = this.#td('text-center fp-td-name');
        td.setAttribute('title', file.name);
        td.textContent = file.name;
        return td;
    }

    #cellDockind(file: FileItem): HTMLDivElement {
        const td = this.#td('text-center fp-td-dockind');
        if (this.#showDocKind) {
            if (this.#docKindList.length > 0) {
                const sel = document.createElement('select');
                sel.className        = 'doc-kind-select';
                sel.dataset['fileId'] = String(file.id);
                sel.disabled         = file.status === 'success';
                const blank = document.createElement('option');
                blank.value       = '';
                blank.textContent = this.#getMessage('web.file.docKind.placeholder');
                sel.appendChild(blank);
                this.#docKindList.forEach(dk => {
                    const opt = document.createElement('option');
                    opt.value       = dk.id;
                    opt.textContent = dk.name;
                    if (dk.id === file.docKindId) opt.selected = true;
                    sel.appendChild(opt);
                });
                td.appendChild(sel);
            } else {
                td.textContent = file.docKindNm || '-';
            }
        }
        return td;
    }

    #cellSize(file: FileItem): HTMLDivElement {
        const td = this.#td('text-center fp-td-size');
        td.textContent = this.#manager.formatFileSize(file.size);
        return td;
    }

    #cellStatus(file: FileItem): HTMLDivElement {
        const td = this.#td('text-center fp-td-status');
        const span = document.createElement('span');
        span.className   = 'status-' + file.status;
        span.textContent = this.#manager.getStatusText(file.status);
        td.appendChild(span);
        return td;
    }

    #cellAction(file: FileItem): HTMLDivElement {
        const td = this.#td('text-center fp-td-action');
        const isDone = file.status === 'success';
        const btn = document.createElement('button');
        btn.className         = isDone ? 'btn btn-registered' : 'btn btn-delete';
        btn.title             = isDone ? this.#getMessage('web.file.status.registered') : this.#getMessage('web.file.action.delete');
        btn.textContent       = isDone ? '✓' : '×';
        btn.disabled          = isDone;
        btn.dataset['fileId'] = String(file.id);
        td.appendChild(btn);
        return td;
    }

    // ── 전체선택 체크박스 동기화 ─────────────────────────────────────
    #syncCheckAll(): void {
        const el = document.getElementById(this.#elCfg.checkAllId) as HTMLInputElement | null;
        if (!el) return;
        const total   = this.#manager.files.length;
        const checked = this.#manager.files.filter(f => f.checked).length;
        el.indeterminate = checked > 0 && checked < total;
        el.checked       = total > 0 && checked === total;
    }

    // ── 하단 통계 바 갱신 ────────────────────────────────────────────
    #updateStats(): void {
        const sizeEl    = document.getElementById(this.#elCfg.footerSizeId);
        const percentEl = document.getElementById(this.#elCfg.footerPercentId);
        const fillEl    = document.getElementById(this.#elCfg.progressFillId) as HTMLElement | null;
        if (!sizeEl || !percentEl || !fillEl) return;

        const total        = this.#manager.files.length;
        const totalSize    = this.#manager.files.reduce((s, f) => s + f.size, 0);
        const successCount = this.#manager.files.filter(f => f.status === 'success').length;
        const percent      = total > 0 ? Math.round(successCount / total * 100) : 0;

        sizeEl.textContent    = `${this.#manager.formatFileSize(totalSize)} · ${total}${this.#getMessage('web.file.countUnit')}`;
        percentEl.textContent = `${percent}%`;
        fillEl.style.width    = `${percent}%`;
    }

    // ── 이벤트 위임 (tbody 클릭/체인지 + checkAll) ───────────────────
    attachEvents(getDropzone: () => DropzoneInstance | null): void {
        // columns 모드면 checkAll 체크박스가 헤더에 먼저 존재해야 리스너를 붙일 수 있다.
        this.#ensureHeader();

        const tbody = document.getElementById(this.#elCfg.tbodyId);
        if (tbody) {
            tbody.addEventListener('click', e => {
                const target = e.target as Element;

                // 1) 삭제 버튼
                const delBtn = target.closest('.btn-delete') as HTMLElement | null;
                if (delBtn) {
                    const delId = delBtn.dataset['fileId'] ?? '';
                    if (delId) this.#manager.removeFile(delId, getDropzone());
                    return;
                }

                // 2) 체크박스 자체 클릭은 네이티브 change 가 토글을 처리하므로 중복 방지
                if (target.closest('input[type="checkbox"]')) return;
                // 3) 문서종류 select·작업 버튼 등 상호작용 요소는 행 토글에서 제외
                if (target.closest('.doc-kind-select') || target.closest('.fp-td-action')) return;

                // 4) 그 외 행 아무 곳 클릭 → 해당 행의 체크박스 토글
                const row = target.closest('.fp-tr') as HTMLElement | null;
                const rowId = row?.dataset['fileId'];
                if (!rowId) return;                       // 헤더·드롭 안내행 등 (fileId 없음) 제외
                const cb = row!.querySelector('input[type="checkbox"][data-file-id]') as HTMLInputElement | null;
                if (!cb) return;                          // check 컬럼이 없는 구성(게시판 첨부 등)은 무시
                this.#manager.toggleCheck(rowId, !cb.checked);
            });

            tbody.addEventListener('change', e => {
                const target = e.target as HTMLElement;
                const cb = target.closest('input[type="checkbox"]') as HTMLInputElement | null;
                if (cb?.dataset['fileId']) {
                    const id = cb.dataset['fileId'];
                    this.#manager.toggleCheck(id, cb.checked);
                    return;
                }
                const sel = target.closest('.doc-kind-select') as HTMLSelectElement | null;
                if (sel?.dataset['fileId']) {
                    const id = sel.dataset['fileId'];
                    const docKindId = sel.value || null;
                    const docKind = docKindId
                        ? (this.#docKindList.find(d => d.id === docKindId) ?? null)
                        : null;
                    this.#manager.setDocKind(id, docKind);
                }
            });
        }

        const checkAll = document.getElementById(this.#elCfg.checkAllId) as HTMLInputElement | null;
        if (checkAll) {
            checkAll.addEventListener('change', () => this.#manager.toggleAll(checkAll.checked));
        }
    }

    // ── 헬퍼 ─────────────────────────────────────────────────────────
    #td(className: string): HTMLDivElement {
        const td = document.createElement('div');
        td.className = `fp-td ${className}`;
        return td;
    }
}
