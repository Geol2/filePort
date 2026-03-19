import { useEffect, useRef, useState } from 'react';
import { createUploader } from 'fileport';
import type { DocKind } from 'fileport';

import 'fileport/src/filePort.css';

interface FileUploaderProps {
    uploadUrl:         string;
    contentsInsertUrl: string;
    docKindList?:      DocKind[];
    extra?:            Record<string, unknown>;
}

type Status = { msg: string; type: 'success' | 'error' } | null;

export default function FileUploader({
    uploadUrl,
    contentsInsertUrl,
    docKindList = [],
    extra = {},
}: FileUploaderProps) {
    const uploaderRef = useRef<ReturnType<typeof createUploader> | null>(null);
    const [status, setStatus] = useState<Status>(null);

    useEffect(() => {
        const uploader = createUploader({
            uploadUrl,
            showDocKind: docKindList.length > 0,
            docKindList,
            getExtra: () => extra,
            onSubmit(payload) {
                fetch(contentsInsertUrl, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ files: payload.files, ...payload.extra }),
                })
                .then(res => {
                    if (!res.ok) throw new Error('서버 오류: ' + res.status);
                    setStatus({ msg: '등록이 완료되었습니다.', type: 'success' });
                    payload.done(true);
                })
                .catch((err: Error) => {
                    setStatus({ msg: '등록 중 오류가 발생했습니다: ' + err.message, type: 'error' });
                    payload.done(false);
                });
            },
        });

        uploader.init();
        uploaderRef.current = uploader;

        return () => {
            uploaderRef.current?.myDropzone?.destroy();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleSubmit() {
        const uploader = uploaderRef.current;
        if (!uploader || uploader.fileManager.files.length === 0) {
            alert('첨부할 파일을 먼저 추가해 주세요.');
            return;
        }
        setStatus(null);
        uploader.startSubmit();
    }

    return (
        <>
            {/* filePort가 getElementById로 DOM을 직접 제어하므로 id 유지 */}
            <div id="tableWrapper" className="table-wrapper">
                <div className="table-scroll">
                    <table id="fileTable">
                        <thead>
                            <tr>
                                <th><input type="checkbox" id="checkAll" /></th>
                                <th>파일명</th>
                                <th>문서종류</th>
                                <th>크기</th>
                                <th>상태</th>
                                <th>작업</th>
                            </tr>
                        </thead>
                        <tbody id="fileList"></tbody>
                    </table>
                </div>
                <div className="table-footer">
                    <span id="footerSize">0 Bytes · 0건</span>
                    <div className="footer-progress">
                        <div className="progress-bar-wrap">
                            <div className="progress-bar-fill" id="progressFill" style={{ width: '0%' }}></div>
                        </div>
                        <span id="footerPercent">0%</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                <button id="btnFileAdd" style={btnStyle('#4285FF', '#fff', true)}>파일 추가</button>
                <button id="btnInsert"  style={btnStyle('#fff', '#4285FF')} onClick={handleSubmit}>등록</button>
            </div>

            {status && (
                <div style={statusStyle(status.type)}>{status.msg}</div>
            )}
        </>
    );
}

function btnStyle(bg: string, color: string, outlined = false): React.CSSProperties {
    return {
        padding:     '7px 18px',
        border:      outlined ? `1px solid ${color}` : 'none',
        borderRadius: 4,
        cursor:      'pointer',
        fontSize:    13,
        background:  bg,
        color,
        fontFamily:  'inherit',
    };
}

function statusStyle(type: 'success' | 'error'): React.CSSProperties {
    const isSuccess = type === 'success';
    return {
        marginTop:    14,
        padding:      '10px 14px',
        borderRadius: 4,
        fontSize:     13,
        background:   isSuccess ? '#e8f5e9' : '#ffebee',
        color:        isSuccess ? '#2e7d32' : '#c62828',
    };
}
