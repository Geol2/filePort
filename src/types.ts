// =====================================================================
// types.ts — 공용 타입 정의
// =====================================================================

import type DropzoneLib from 'dropzone';

/** Dropzone 인스턴스 타입 */
export type DropzoneInstance = DropzoneLib;
/** Dropzone 파일 타입 */
export type DropzoneFile = DropzoneLib.DropzoneFile;

export type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

export type FileInfoType = 'scan' | 'modify';

/** 내장 언어팩 코드 */
export type LocaleCode = 'ko' | 'en';

/** 라이브러리가 사용하는 모든 메시지 키 */
export type MessageKey =
    | 'web.confirm.file.fileUploadPlz'
    | 'web.file.countUnit'
    | 'web.file.status.pending'
    | 'web.file.status.uploading'
    | 'web.file.status.success'
    | 'web.file.status.error'
    | 'web.file.status.registered'
    | 'web.file.docKind.placeholder'
    | 'web.file.action.delete'
    | 'web.js.error.upload'
    // 컬럼 헤더 라벨 (columns 사용 시 헤더 기본 텍스트)
    | 'web.file.column.check'
    | 'web.file.column.name'
    | 'web.file.column.dockind'
    | 'web.file.column.size'
    | 'web.file.column.status'
    | 'web.file.column.action'
    | 'web.file.columnSettings';

/** 한 언어의 완전한 메시지 팩 (모든 MessageKey 필수) */
export type Messages = Record<MessageKey, string>;

/** 테이블 컬럼 종류 (빌트인) */
export type ColumnKey = 'check' | 'name' | 'dockind' | 'size' | 'status' | 'action';

/** 컬럼 정의 — 순서/표시/헤더라벨을 선언적으로 구성 */
export interface ColumnDef {
    /** 컬럼 종류 */
    key:      ColumnKey;
    /** 헤더 표시 텍스트. 생략 시 locale 기본 라벨(web.file.column.*) 사용. check 컬럼은 무시(checkAll 체크박스) */
    header?:  string;
    /** 표시 여부. 기본 true. false면 헤더·바디 모두 렌더하지 않음 */
    visible?: boolean;
}

/** 톱니바퀴(⚙) 컬럼 설정 패널 옵션 */
export interface ColumnSettingsOptions {
    /** localStorage 저장 키. 지정 시 사용자 개인화(순서·표시)를 저장/복원. 생략 시 세션 한정(저장 안 함) */
    storageKey?: string;
    /** 패널 제목 텍스트 (기본: '컬럼 설정') */
    title?:      string;
}

/** 개인화 저장 형식 (순서 + 숨김 컬럼) */
export interface ColumnPersistState {
    order:  ColumnKey[];
    hidden: ColumnKey[];
}

export interface DocKind {
    id:   string;
    name: string;
}

export interface ElementConfig {
    wrapperId:       string;
    fileAddBtnId:    string;
    tableId:         string;
    tbodyId:         string;
    checkAllId:      string;
    footerSizeId:    string;
    progressFillId:  string;
    footerPercentId: string;
}

export interface FileItem {
    id:           string;
    name:         string;
    size:         number;
    status:       FileStatus;
    uploadTime:   string | null;
    dropzoneFile: DropzoneFile | null;
    checked:      boolean;
    registered:   boolean;
    serverFileNm: string | null;
    docKindId:    string | null;
    docKindNm:    string | null;
    uploadStarted?: boolean;
    // scan 파일
    isScanned?: boolean;
    fdKey01?:   string;
    fdKey02?:   string;
    // modify(기존) 파일
    isOld?:       boolean;
    fileInfoId?:  string;
    docInfoId?:   string;
    isUploaded?:  boolean;
}

export interface FileInfoData {
    fileNm?:      string;
    srcFileNm?:   string;
    fileSize?:    number;
    docKindId?:   string;
    docKindNm?:   string;
    // scan
    serverFileNm?: string;
    fdKey01?:      string;
    fdKey02?:      string;
    // modify
    fileInfoId?:   string;
    docInfoId?:    string;
}

export interface SubmitFileItem {
    fileNm?:     string;
    srcFileNm?:  string;
    docKindId?:  string | null;
    isOld?:      boolean;
    fileInfoId?: string;
    docInfoId?:  string;
    isScanned?:  boolean;
    fdKey01?:    string;
    fdKey02?:    string;
}

export interface SubmitPayload {
    files: SubmitFileItem[];
    extra: Record<string, unknown>;
    done:  (success?: boolean) => void;
}

export interface UploaderOptions {
    elementConfig?:  Partial<ElementConfig>;
    uploadUrl?:      string;
    maxFilesize?:    number;
    acceptedFiles?:  string | null;
    showDocKind?:    boolean;
    simple?:         boolean;   // true → 4열 간소 모드 (체크박스·문서종류 열 없음)
    /** 컬럼 순서/표시/헤더를 직접 구성. 지정 시 헤더(thead)도 라이브러리가 렌더하며 simple 옵션은 무시됨 */
    columns?:        ColumnDef[];
    /** 톱니바퀴(⚙) 컬럼 설정 패널을 내장. true 또는 옵션 객체. columns 와 함께 사용 */
    columnSettings?: boolean | ColumnSettingsOptions;
    /** 컬럼 구성이 바뀔 때(사용자 ⚙ 조작 또는 setColumns) 호출. 외부 모듈 동기화용 */
    onColumnsChange?: (columns: ColumnDef[]) => void;
    docKindList?:    DocKind[];
    submitBtnId?:    string;
    /** 내장 언어팩 선택 (기본: 'ko') */
    locale?:         LocaleCode;
    /** 특정 메시지만 부분적으로 덮어쓰기 (locale 팩 위에 병합) */
    messages?:       Partial<Record<MessageKey, string>>;
    /** 메시지 해석을 완전히 위임 (i18next 등 외부 i18n 연결용). 최우선 적용 */
    getMessage?:     (key: string) => string;
    getExtra?:       () => Record<string, unknown>;
    onSubmit?:       (payload: SubmitPayload) => void;
    onError?:        (fileName: string, message: string) => void;
}
