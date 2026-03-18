// =====================================================================
// renderer.js — 테이블 DOM 렌더링 + 이벤트 위임
//
// renderTable({ simple }) 하나로 전체·간소 모드 통합.
//   simple: false (기본) → 체크박스·문서종류 열 포함 (6열)
//   simple: true        → 파일명·크기·상태·작업만 (4열)
// =====================================================================

/**
 * @param {{
 *   manager:     ReturnType<import('./fileManager.js').createFileManager>,
 *   elCfg:       object,
 *   getMessage:  (key: string) => string,
 *   showDocKind: boolean,
 * }} deps
 */
export function createRenderer({ manager, elCfg, getMessage, showDocKind }) {

    // ── 메인 렌더 ─────────────────────────────────────────────────────
    function renderTable({ simple = false } = {}) {
        const tbody = document.getElementById(elCfg.tbodyId);
        const table = document.getElementById(elCfg.tableId);
        if (!tbody || !table) return;

        tbody.innerHTML = '';

        if (manager.files.length === 0) {
            table.classList.add('table-empty');
            const tr = document.createElement('tr');
            tr.className = 'drop-row';
            const colspan = simple ? 4 : (showDocKind ? 6 : 5);
            tr.innerHTML = `<td colspan="${colspan}">${getMessage('web.confirm.file.fileUploadPlz')}</td>`;
            tbody.appendChild(tr);
            _updateStats();
            return;
        }

        table.classList.remove('table-empty');
        manager.files.forEach(file => tbody.appendChild(_buildRow(file, simple)));
        _syncCheckAll();
        _updateStats();
    }

    // ── 행 생성 ───────────────────────────────────────────────────────
    function _buildRow(file, simple) {
        const safeName = file.name
            .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const tr = document.createElement('tr');
        tr.dataset.fileId = file.id;

        // 체크박스 (full 모드만)
        if (!simple) {
            const td = _td('text-center');
            const cb = document.createElement('input');
            cb.type            = 'checkbox';
            cb.checked         = file.checked;
            cb.dataset.fileId  = file.id;
            td.appendChild(cb);
            tr.appendChild(td);
        }

        // 파일명
        const tdName = _td('text-center');
        tdName.title       = safeName;
        tdName.textContent = safeName;
        tr.appendChild(tdName);

        // 문서종류 (full + showDocKind 모드만)
        if (!simple && showDocKind) {
            const td = _td('text-center');
            td.textContent = file.docKindNm || '-';
            tr.appendChild(td);
        }

        // 크기
        const tdSize = _td('text-center');
        tdSize.textContent = manager.formatFileSize(file.size);
        tr.appendChild(tdSize);

        // 상태
        const tdStatus = _td('text-center');
        const span = document.createElement('span');
        span.className  = 'status-' + file.status;
        span.textContent = manager.getStatusText(file.status);
        tdStatus.appendChild(span);
        tr.appendChild(tdStatus);

        // 작업 버튼
        const tdAction = _td('text-center');
        const isDone = file.status === 'success';
        const btn = document.createElement('button');
        btn.className      = isDone ? 'btn btn-registered' : 'btn btn-delete';
        btn.title          = isDone ? '업로드완료' : '삭제';
        btn.textContent    = isDone ? '✓' : '×';
        btn.disabled       = isDone;
        btn.dataset.fileId = file.id;
        tdAction.appendChild(btn);
        tr.appendChild(tdAction);

        return tr;
    }

    // ── 전체선택 체크박스 동기화 ─────────────────────────────────────
    function _syncCheckAll() {
        const el = document.getElementById(elCfg.checkAllId);
        if (!el) return;
        const total   = manager.files.length;
        const checked = manager.files.filter(f => f.checked).length;
        el.indeterminate = checked > 0 && checked < total;
        el.checked       = total > 0 && checked === total;
    }

    // ── 하단 통계 바 갱신 ────────────────────────────────────────────
    function _updateStats() {
        const sizeEl    = document.getElementById(elCfg.footerSizeId);
        const percentEl = document.getElementById(elCfg.footerPercentId);
        const fillEl    = document.getElementById(elCfg.progressFillId);
        if (!sizeEl || !percentEl || !fillEl) return;

        const total        = manager.files.length;
        const totalSize    = manager.files.reduce((s, f) => s + f.size, 0);
        const successCount = manager.files.filter(f => f.status === 'success').length;
        const percent      = total > 0 ? Math.round(successCount / total * 100) : 0;

        sizeEl.textContent    = `${manager.formatFileSize(totalSize)} · ${total}${getMessage('web.file.countUnit')}`;
        percentEl.textContent = `${percent}%`;
        fillEl.style.width    = `${percent}%`;
    }

    // ── 이벤트 위임 (tbody 클릭/체인지 + checkAll) ───────────────────
    // getDropzone: () => Dropzone 인스턴스 — removeFile 시 Dropzone 큐에서도 제거하기 위해 lazy 참조
    function attachEvents(getDropzone) {
        const tbody = document.getElementById(elCfg.tbodyId);
        if (tbody) {
            tbody.addEventListener('click', e => {
                const btn = e.target.closest('.btn-delete');
                if (!btn) return;
                const id = parseFloat(btn.dataset.fileId);
                if (!isNaN(id)) manager.removeFile(id, getDropzone());
            });

            tbody.addEventListener('change', e => {
                const cb = e.target.closest('input[type="checkbox"]');
                if (!cb?.dataset.fileId) return;
                const id = parseFloat(cb.dataset.fileId);
                if (!isNaN(id)) manager.toggleCheck(id, cb.checked);
            });
        }

        const checkAll = document.getElementById(elCfg.checkAllId);
        if (checkAll) {
            checkAll.addEventListener('change', () => manager.toggleAll(checkAll.checked));
        }
    }

    // ── 헬퍼 ─────────────────────────────────────────────────────────
    function _td(className) {
        const td = document.createElement('td');
        td.className = className;
        return td;
    }

    return { renderTable, attachEvents };
}
