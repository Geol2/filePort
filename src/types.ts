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
    id:           number;
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
    getMessage?:     (key: string) => string;
    getExtra?:       () => Record<string, unknown>;
    onSubmit?:       (payload: SubmitPayload) => void;
}
