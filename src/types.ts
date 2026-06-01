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
    | 'web.js.error.upload';

/** 한 언어의 완전한 메시지 팩 (모든 MessageKey 필수) */
export type Messages = Record<MessageKey, string>;

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
