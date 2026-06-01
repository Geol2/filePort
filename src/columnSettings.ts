// =====================================================================
// columnSettings.ts — 톱니바퀴(⚙) 컬럼 설정 패널
//
// wrapper 우상단에 ⚙ 버튼 + 드롭다운 패널을 생성한다.
// 패널에서 컬럼 표시(체크) / 순서(드래그)를 바꾸면 onChange(columns) 호출.
// (헤더명은 개발자/외부 base 가 정하므로 여기서 편집하지 않는다 — 표시·순서만)
// =====================================================================

import type { ColumnDef } from './types.js';

interface ColumnSettingsDeps {
    wrapper:    HTMLElement;
    getMessage: (key: string) => string;
    title:      string;
    /** 현재 적용된 컬럼 (패널 렌더 기준) */
    getColumns: () => ColumnDef[];
    /** 사용자가 표시/순서를 바꿨을 때 */
    onChange:   (columns: ColumnDef[]) => void;
}

export class ColumnSettings {
    readonly #wrapper:    HTMLElement;
    readonly #getMessage: (key: string) => string;
    readonly #title:      string;
    readonly #getColumns: () => ColumnDef[];
    readonly #onChange:   (columns: ColumnDef[]) => void;

    #btn!:   HTMLButtonElement;
    #panel!: HTMLDivElement;
    #open = false;
    #cols: ColumnDef[] = [];          // 패널 작업 사본
    #dragIndex: number | null = null;

    constructor(deps: ColumnSettingsDeps) {
        this.#wrapper    = deps.wrapper;
        this.#getMessage = deps.getMessage;
        this.#title      = deps.title;
        this.#getColumns = deps.getColumns;
        this.#onChange   = deps.onChange;
    }

    mount(): void {
        // 테이블 헤더와 겹치지 않도록 wrapper 최상단에 전용 바를 두고 그 안에 ⚙ 배치
        const bar = document.createElement('div');
        bar.className = 'fp-col-settings-bar';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fp-col-settings-btn';
        btn.title = this.#title;
        btn.setAttribute('aria-label', this.#title);
        btn.textContent = '⚙';
        btn.addEventListener('click', e => { e.stopPropagation(); this.#toggle(); });
        this.#btn = btn;

        const panel = document.createElement('div');
        panel.className = 'fp-col-settings-panel';
        panel.hidden = true;
        this.#panel = panel;

        bar.appendChild(btn);
        bar.appendChild(panel);
        this.#wrapper.insertBefore(bar, this.#wrapper.firstChild);

        // 바깥 클릭 시 닫기
        document.addEventListener('click', e => {
            if (!this.#open) return;
            const t = e.target as Node;
            if (this.#panel.contains(t) || this.#btn.contains(t)) return;
            this.#close();
        });
    }

    /** 외부에서 컬럼이 바뀐 경우(setColumns) 열려있으면 패널 갱신 */
    refresh(): void {
        if (this.#open) {
            this.#cols = this.#getColumns().map(c => ({ ...c }));
            this.#renderPanel();
        }
    }

    #toggle(): void { if (this.#open) this.#close(); else this.#openPanel(); }

    #openPanel(): void {
        this.#cols = this.#getColumns().map(c => ({ ...c }));
        this.#renderPanel();
        this.#panel.hidden = false;
        this.#open = true;
    }

    #close(): void {
        this.#panel.hidden = true;
        this.#open = false;
    }

    #label(col: ColumnDef): string {
        if (col.header && col.header.trim()) return col.header;
        return this.#getMessage('web.file.column.' + col.key);
    }

    #renderPanel(): void {
        this.#panel.innerHTML = '';

        const head = document.createElement('div');
        head.className = 'fp-col-settings-title';
        head.textContent = this.#title;
        this.#panel.appendChild(head);

        const list = document.createElement('ul');
        list.className = 'fp-col-settings-list';

        this.#cols.forEach((col, i) => {
            const li = document.createElement('li');
            li.className = 'fp-col-settings-item';
            li.draggable = true;
            li.dataset['index'] = String(i);

            const handle = document.createElement('span');
            handle.className = 'fp-col-settings-handle';
            handle.textContent = '⋮⋮';

            const label = document.createElement('label');
            label.className = 'fp-col-settings-label';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = col.visible !== false;
            cb.addEventListener('change', () => {
                this.#cols[i] = { ...this.#cols[i], visible: cb.checked };
                this.#emit();
            });
            const text = document.createElement('span');
            text.textContent = this.#label(col);
            label.append(cb, text);

            li.append(handle, label);

            // 네이티브 드래그 순서 변경
            li.addEventListener('dragstart', () => { this.#dragIndex = i; li.classList.add('dragging'); });
            li.addEventListener('dragend',   () => li.classList.remove('dragging'));
            li.addEventListener('dragover',  e => e.preventDefault());
            li.addEventListener('drop', e => {
                e.preventDefault();
                const from = this.#dragIndex, to = i;
                if (from === null || from === to) return;
                const moved = this.#cols.splice(from, 1)[0];
                this.#cols.splice(to, 0, moved);
                this.#dragIndex = null;
                this.#renderPanel();
                this.#emit();
            });

            list.appendChild(li);
        });

        this.#panel.appendChild(list);
    }

    #emit(): void {
        this.#onChange(this.#cols.map(c => ({ ...c })));
    }
}
