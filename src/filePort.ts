// =====================================================================
// filePort.ts — 진입점
//
// FileManager / Renderer / DzEvents 를 조립하여
// 하나의 업로더 인스턴스를 반환합니다.
//
// [ESM]
//   import { createUploader } from './dist/filePort.js'
//
// [바닐라 / IIFE]
//   <script src="dist/filePort.iife.js"></script>
//   const uploader = FilePort.createUploader({ ... })
//
// ── 업로드 케이스별 흐름 ─────────────────────────────────────────────
//
//  케이스 1: 새 파일만
//    startSubmit() → processQueue() → queuecomplete → onSubmit({ files, extra, done })
//
//  케이스 2: 스캔 파일만
//    addFileInfo(data, 'scan') → startSubmit() → onSubmit 직접 호출
//
//  케이스 3: 기존 파일만 (수정 모드)
//    addFileInfo(data, 'modify') → startSubmit() → onSubmit 직접 호출
//
//  케이스 4: 스캔 + 새 파일 혼합
//    startSubmit() → processQueue() → queuecomplete → onSubmit (전체 일괄)
//
//  케이스 5: 일부 실패
//    queuecomplete → 성공 파일 없음 → 버튼 재활성화 (재시도 가능)
//
// =====================================================================

import './filePort.css';
import { FileManager } from './fileManager.js';
import { Renderer }    from './renderer.js';
import { DzEvents }    from './dzEvents.js';
import { LOCALES, DEFAULT_LOCALE } from './locales/index.js';
import type { ElementConfig, UploaderOptions, FileInfoData, FileInfoType, DropzoneInstance, Messages } from './types.js';

export type { UploaderOptions, SubmitPayload, FileItem, DocKind, ElementConfig, LocaleCode, MessageKey, Messages } from './types.js';

const DEFAULT_ELEMENT_CONFIG: ElementConfig = {
    wrapperId:       'tableWrapper',
    fileAddBtnId:    'btnFileAdd',
    tableId:         'fileTable',
    tbodyId:         'fileList',
    checkAllId:      'checkAll',
    footerSizeId:    'footerSize',
    progressFillId:  'progressFill',
    footerPercentId: 'footerPercent',
};

/**
 * 메시지 해석기를 구성한다. 우선순위(높음 → 낮음):
 *   1) options.getMessage  — 외부 i18n 위임 (키와 다른 값을 반환할 때만 채택)
 *   2) options.messages    — 사용자 부분 오버라이드
 *   3) locale 팩           — 내장 언어팩 (기본 'ko')
 *   4) 키 원본             — 어디에도 없으면 키 문자열 그대로
 */
function buildGetMessage(options: UploaderOptions): (key: string) => string {
    const pack: Messages = LOCALES[options.locale ?? DEFAULT_LOCALE] ?? LOCALES[DEFAULT_LOCALE];
    const merged: Record<string, string> = { ...pack, ...options.messages };
    const userGetMessage = options.getMessage;

    return (key: string): string => {
        if (userGetMessage) {
            const v = userGetMessage(key);
            if (v && v !== key) return v;
        }
        return merged[key] ?? key;
    };
}

class FilePort {
    readonly #elCfg:         ElementConfig;
    readonly #uploadUrl:     string;
    readonly #maxFilesize:   number;
    readonly #acceptedFiles: string | null;
    readonly #showDocKind:   boolean;
    readonly #simple:        boolean;
    readonly #docKindList:   import('./types.js').DocKind[];
    readonly #submitBtnId:   string;
    readonly #getExtra:      () => Record<string, unknown>;
    readonly #onSubmit:      (payload: import('./types.js').SubmitPayload) => void;
    readonly #onError:       (fileName: string, message: string) => void;
    readonly #getMessage:    (key: string) => string;

    #isProcessing = false;
    readonly #manager:  FileManager;
    readonly #renderer: Renderer;
    #dz:       DropzoneInstance | null = null;
    #doSubmit: (() => void) | null      = null;

    constructor(options: UploaderOptions = {}) {
        this.#elCfg         = { ...DEFAULT_ELEMENT_CONFIG, ...options.elementConfig };
        this.#uploadUrl     = options.uploadUrl     ?? '/upload';
        this.#maxFilesize   = options.maxFilesize   ?? 10;
        this.#acceptedFiles = options.acceptedFiles ?? null;
        this.#showDocKind   = options.showDocKind   !== false;
        this.#simple        = options.simple        ?? false;
        this.#docKindList   = options.docKindList   ?? [];
        this.#submitBtnId   = options.submitBtnId   ?? 'btnInsert';
        this.#getExtra      = options.getExtra      ?? (() => ({}));
        this.#onSubmit      = options.onSubmit      ?? (() => {});
        this.#onError       = options.onError       ?? ((fileName, msg) => alert(`${fileName}\n${msg}`));
        this.#getMessage    = buildGetMessage(options);

        // ── 모듈 조립 ─────────────────────────────────────────────────────
        this.#manager = new FileManager({
            getMessage: this.#getMessage,
            onUpdate:   () => this.#renderer.renderTable({ simple: this.#simple }),
        });

        this.#renderer = new Renderer({
            manager:     this.#manager,
            elCfg:       this.#elCfg,
            getMessage:  this.#getMessage,
            showDocKind: this.#showDocKind,
            docKindList: this.#docKindList,
        });
    }

    get fileManager():  FileManager                    { return this.#manager; }
    get myDropzone():   DropzoneInstance | null       { return this.#dz; }
    get isProcessing(): boolean                        { return this.#isProcessing; }

    // ── 공개 API ──────────────────────────────────────────────────────

    /** DOM 준비 후 호출 — Dropzone·이벤트·초기 렌더링 수행 */
    init(): void {
        const dzEvents = new DzEvents({
            manager:         this.#manager,
            elCfg:           this.#elCfg,
            getMessage:      this.#getMessage,
            uploadUrl:       this.#uploadUrl,
            maxFilesize:     this.#maxFilesize,
            acceptedFiles:   this.#acceptedFiles,
            submitBtnId:     this.#submitBtnId,
            onSubmit:        this.#onSubmit,
            onError:         this.#onError,
            getExtra:        this.#getExtra,
            getIsProcessing: () => this.#isProcessing,
            setIsProcessing: (v: boolean) => { this.#isProcessing = v; },
        });

        this.#dz       = dzEvents.dz;
        this.#doSubmit = dzEvents.doSubmit;

        this.#renderer.attachEvents(() => this.#dz);
        this.#renderer.renderTable({ simple: this.#simple });
    }

    /**
     * 등록 버튼 클릭 시 호출.
     * 새 파일(pending)이 있으면 processQueue, 없으면 onSubmit 직접 호출.
     */
    startSubmit(): void {
        if (this.#isProcessing || this.#manager.files.length === 0) return;

        this.#isProcessing = true;
        const btn = document.getElementById(this.#submitBtnId) as HTMLButtonElement | null;
        if (btn) btn.disabled = true;

        const hasPending = this.#manager.files.some(
            f => f.dropzoneFile !== null && f.status === 'pending'
        );

        if (hasPending) {
            this.#dz?.processQueue();
        } else {
            this.#doSubmit?.();
        }
    }

    /**
     * 스캔·기존(수정 모드) 파일을 목록에 직접 추가.
     */
    addFileInfo(data: FileInfoData, type: FileInfoType): void {
        this.#manager.addFileInfo(data, type);
    }

    /**
     * 문서종류 열 표시/숨김 전환.
     * show=true  → 열 표시 (no-dockind 클래스 제거)
     * show=false → 열 숨김 (no-dockind 클래스 추가)
     *
     * 사용 예: 문서분류 그리드 로드 완료 후 B_DOCKIND 값에 따라 호출
     *   uploader.toggleDocKind(!!B_DOCKIND);
     */
    toggleDocKind(show: boolean): void {
        const table = document.getElementById(this.#elCfg.tableId);
        if (table) table.classList.toggle('no-dockind', !show);
        // 문서종류 열 변경에 따른 재렌더 (drop-row colspan 등 갱신)
        this.#renderer.renderTable({ simple: this.#simple });
    }
}

/** 업로더 인스턴스를 생성합니다. */
export function createUploader(options: UploaderOptions = {}): FilePort {
    return new FilePort(options);
}
