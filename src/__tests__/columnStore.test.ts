import { describe, it, expect } from 'vitest';
import { applyPersisted, toPersisted } from '../columnStore.js';
import type { ColumnDef } from '../types.js';

const base: ColumnDef[] = [
    { key: 'check' }, { key: 'name' }, { key: 'size' }, { key: 'status' }, { key: 'action' },
];

describe('columnStore.applyPersisted', () => {
    it('state가 null이면 base를 그대로 반환한다', () => {
        const r = applyPersisted(base, null);
        expect(r.map(c => c.key)).toEqual(['check', 'name', 'size', 'status', 'action']);
    });

    it('저장된 순서대로 정렬한다', () => {
        const r = applyPersisted(base, { order: ['status', 'name', 'check', 'size', 'action'], hidden: [] });
        expect(r.map(c => c.key)).toEqual(['status', 'name', 'check', 'size', 'action']);
    });

    it('hidden 컬럼은 visible:false로 적용된다', () => {
        const r = applyPersisted(base, { order: ['name', 'size', 'status'], hidden: ['size'] });
        expect(r.find(c => c.key === 'size')?.visible).toBe(false);
        expect(r.find(c => c.key === 'name')?.visible).toBe(true);
    });

    it('base에 없는 저장 key는 버린다', () => {
        const r = applyPersisted(base, { order: ['dockind', 'name'], hidden: [] });
        expect(r.find(c => c.key === 'dockind')).toBeUndefined();
        expect(r[0].key).toBe('name');
    });

    it('base에만 있는 새 컬럼은 끝에 표시 상태로 덧붙인다', () => {
        const r = applyPersisted(base, { order: ['name'], hidden: [] });
        expect(r[0].key).toBe('name');
        expect(r.map(c => c.key).sort()).toEqual(['action', 'check', 'name', 'size', 'status']);
        expect(r.find(c => c.key === 'check')?.visible).toBe(true);
    });

    it('외부가 base를 바꿔도 저장된 개인화(순서·숨김)가 유지된다', () => {
        const personalized = applyPersisted(base, { order: ['status', 'name'], hidden: ['name'] });
        const saved = toPersisted(personalized);

        // 외부 모듈이 dockind 컬럼을 추가한 새 base 공급
        const newBase: ColumnDef[] = [
            { key: 'check' }, { key: 'name' }, { key: 'dockind' },
            { key: 'size' }, { key: 'status' }, { key: 'action' },
        ];
        const r = applyPersisted(newBase, saved);

        // status가 name보다 앞 (저장 순서 유지), name은 숨김 유지
        expect(r.findIndex(c => c.key === 'status')).toBeLessThan(r.findIndex(c => c.key === 'name'));
        expect(r.find(c => c.key === 'name')?.visible).toBe(false);
        // 새 컬럼 dockind 도 포함
        expect(r.find(c => c.key === 'dockind')).toBeDefined();
    });
});

describe('columnStore.toPersisted', () => {
    it('순서와 숨김 컬럼을 추출한다', () => {
        const cols: ColumnDef[] = [
            { key: 'name' }, { key: 'size', visible: false }, { key: 'status' },
        ];
        const s = toPersisted(cols);
        expect(s.order).toEqual(['name', 'size', 'status']);
        expect(s.hidden).toEqual(['size']);
    });
});
