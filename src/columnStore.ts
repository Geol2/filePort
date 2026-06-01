// =====================================================================
// columnStore.ts — 컬럼 개인화 저장 + 병합 (순수 로직, DOM 무관)
//
// base   : 외부 모듈/개발자가 공급한 컬럼 풀 (사용 가능한 컬럼 + 기본 순서/표시)
// state  : 사용자가 ⚙ 로 정한 개인화 (순서 + 숨긴 컬럼)
// 병합   : base 위에 state 를 적용 → 외부가 base 를 바꿔도 개인화가 유지된다.
// =====================================================================

import type { ColumnDef, ColumnKey, ColumnPersistState } from './types.js';

/** localStorage 에서 개인화 상태를 읽는다. 없거나 손상 시 null. */
export function loadPersisted(storageKey: string): ColumnPersistState | null {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.order) || !Array.isArray(parsed.hidden)) return null;
        return { order: parsed.order as ColumnKey[], hidden: parsed.hidden as ColumnKey[] };
    } catch {
        return null;
    }
}

/** 개인화 상태를 localStorage 에 저장한다. (사파리 프라이빗 등 실패는 무시) */
export function savePersisted(storageKey: string, state: ColumnPersistState): void {
    try {
        localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
        /* storage 사용 불가 — 무시 */
    }
}

/** 현재 컬럼 구성을 저장 형식(순서 + 숨김)으로 변환한다. */
export function toPersisted(columns: ColumnDef[]): ColumnPersistState {
    return {
        order:  columns.map(c => c.key),
        hidden: columns.filter(c => c.visible === false).map(c => c.key),
    };
}

/**
 * base 컬럼 풀 위에 저장된 개인화(순서·숨김)를 적용한다.
 *  - state 가 null 이면 base 를 그대로 (초기 기본값).
 *  - 저장된 순서대로 정렬하되 base 에 존재하는 컬럼만 채택.
 *  - base 에만 있는 새 컬럼(개발자가 추가)은 끝에 기본 표시로 덧붙임.
 *  - 저장에만 있고 base 에 없는 컬럼은 버린다.
 *  - 헤더 라벨 등 정의는 항상 base 를 따른다(개인화는 순서·표시만).
 */
export function applyPersisted(base: ColumnDef[], state: ColumnPersistState | null): ColumnDef[] {
    if (!state) return base.map(c => ({ ...c }));

    const baseMap = new Map<ColumnKey, ColumnDef>(base.map(c => [c.key, c]));
    const hidden  = new Set<ColumnKey>(state.hidden);
    const used    = new Set<ColumnKey>();
    const result: ColumnDef[] = [];

    // 1) 저장된 순서 (base 에 존재하는 것만)
    for (const key of state.order) {
        const col = baseMap.get(key);
        if (!col || used.has(key)) continue;
        used.add(key);
        result.push({ ...col, visible: !hidden.has(key) });
    }
    // 2) base 에만 있는 새 컬럼은 끝에 (base 기본 표시 존중)
    for (const col of base) {
        if (used.has(col.key)) continue;
        result.push({ ...col, visible: col.visible !== false });
    }
    return result;
}
