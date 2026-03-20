// =====================================================================
// renderer.ts — 테이블 DOM 렌더링 + 이벤트 위임
//
// renderTable({ simple }) 하나로 전체·간소 모드 통합.
//   simple: false (기본) → 체크박스·문서종류 열 포함 (6열)
//   simple: true        → 파일명·크기·상태·작업만 (4열)
// =====================================================================

import type { FileManager } from './fileManager.js';
import type { ElementConfig, DocKind, DropzoneInstance } from './types.js';

interface RendererDeps {
    manager:      FileManager;
    elCfg:        ElementConfig;
    getMessage:   (key: string) => string;
    showDocKind:  boolean;
    docKindList?: DocKind[];
}

interface RenderOptions {
    simple?: boolean;
}

export class Renderer {
    readonly #manager:     FileManager;
    readonly #elCfg:       ElementConfig;
    readonly #getMessage:  (key: string) => string;
    readonly #showDocKind: boolean;
    readonly #docKindList: DocKind[];

    constructor({ manager, elCfg, getMessage, showDocKind, docKindList = [] }: RendererDeps) {
        this.#manager     = manager;
        this.#elCfg       = elCfg;
        this.#getMessage  = getMessage;
        this.#showDocKind = showDocKind;
        this.#docKindList = docKindList;
    }

    // ── 메인 렌더 ─────────────────────────────────────────────────────
    renderTable({ simple = false }: RenderOptions = {}): void {
        const tbody = document.getElementById(this.#elCfg.tbodyId);
        const table = document.getElementById(this.#elCfg.tableId);
        if (!tbody || !table) return;

        tbody.innerHTML = '';

        if (this.#manager.files.length === 0) {
            table.classList.add('table-empty');
            const tr = document.createElement('tr');
            tr.className = 'drop-row';
            const colspan = simple ? 4 : 6; // full 모드는 문서종류 td 항상 포함이므로 항상 6
            tr.innerHTML = `<td colspan="${colspan}">${this.#getMessage('web.confirm.file.fileUploadPlz')}</td>`;
            tbody.appendChild(tr);
            this.#updateStats();
            return;
        }

        table.classList.remove('table-empty');
        this.#manager.files.forEach(file => tbody.appendChild(this.#buildRow(file, simple)));
        this.#syncCheckAll();
        this.#updateStats();
    }

    // ── 행 생성 ───────────────────────────────────────────────────────
    #buildRow(file: import('./types.js').FileItem, simple: boolean): HTMLTableRowElement {
        const safeName = file.name
            .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const tr = document.createElement('tr');
        tr.dataset['fileId'] = String(file.id);

        // 체크박스 (full 모드만)
        if (!simple) {
            const td = this.#td('text-center');
            const cb = document.createElement('input');
            cb.type             = 'checkbox';
            cb.checked          = file.checked;
            cb.dataset['fileId'] = String(file.id);
            td.appendChild(cb);
            tr.appendChild(td);
        }

        // 파일명
        const tdName = this.#td('text-center');
        tdName.title       = safeName;
        tdName.textContent = safeName;
        tr.appendChild(tdName);

        // 문서종류 td는 full 모드에서 showDocKind 여부와 관계없이 항상 추가
        // (no-dockind CSS가 td:nth-child(3)을 숨기므로 td가 없으면 파일크기가 숨겨지는 버그 방지)
        if (!simple) {
            const td = this.#td('text-center');
            if (this.#showDocKind) {
                if (this.#docKindList.length > 0) {
                    const sel = document.createElement('select');
                    sel.className       = 'doc-kind-select';
                    sel.dataset['fileId'] = String(file.id);
                    sel.disabled        = file.status === 'success';
                    const blank = document.createElement('option');
                    blank.value       = '';
                    blank.textContent = '선택';
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
            tr.appendChild(td);
        }

        // 크기
        const tdSize = this.#td('text-center');
        tdSize.textContent = this.#manager.formatFileSize(file.size);
        tr.appendChild(tdSize);

        // 상태
        const tdStatus = this.#td('text-center');
        const span = document.createElement('span');
        span.className   = 'status-' + file.status;
        span.textContent = this.#manager.getStatusText(file.status);
        tdStatus.appendChild(span);
        tr.appendChild(tdStatus);

        // 작업 버튼
        const tdAction = this.#td('text-center');
        const isDone = file.status === 'success';
        const btn = document.createElement('button');
        btn.className        = isDone ? 'btn btn-registered' : 'btn btn-delete';
        btn.title            = isDone ? '업로드완료' : '삭제';
        btn.textContent      = isDone ? '✓' : '×';
        btn.disabled         = isDone;
        btn.dataset['fileId'] = String(file.id);
        tdAction.appendChild(btn);
        tr.appendChild(tdAction);

        return tr;
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
        const tbody = document.getElementById(this.#elCfg.tbodyId);
        if (tbody) {
            tbody.addEventListener('click', e => {
                const btn = (e.target as Element).closest('.btn-delete') as HTMLElement | null;
                if (!btn) return;
                const id = parseFloat(btn.dataset['fileId'] ?? '');
                if (!isNaN(id)) this.#manager.removeFile(id, getDropzone());
            });

            tbody.addEventListener('change', e => {
                const target = e.target as HTMLElement;
                const cb = target.closest('input[type="checkbox"]') as HTMLInputElement | null;
                if (cb?.dataset['fileId']) {
                    const id = parseFloat(cb.dataset['fileId']);
                    if (!isNaN(id)) this.#manager.toggleCheck(id, cb.checked);
                    return;
                }
                const sel = target.closest('.doc-kind-select') as HTMLSelectElement | null;
                if (sel?.dataset['fileId']) {
                    const id = parseFloat(sel.dataset['fileId']);
                    if (!isNaN(id)) {
                        const docKindId = sel.value || null;
                        const docKind = docKindId
                            ? (this.#docKindList.find(d => d.id === docKindId) ?? null)
                            : null;
                        this.#manager.setDocKind(id, docKind);
                    }
                }
            });
        }

        const checkAll = document.getElementById(this.#elCfg.checkAllId) as HTMLInputElement | null;
        if (checkAll) {
            checkAll.addEventListener('change', () => this.#manager.toggleAll(checkAll.checked));
        }
    }

    // ── 헬퍼 ─────────────────────────────────────────────────────────
    #td(className: string): HTMLTableCellElement {
        const td = document.createElement('td');
        td.className = className;
        return td;
    }
}
