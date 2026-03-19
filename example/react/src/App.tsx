import FileUploader from './components/FileUploader.tsx';

export default function App() {
    return (
        <div style={{ fontFamily: "'Malgun Gothic', sans-serif", fontSize: 13, background: '#f4f6f8', minHeight: '100vh', margin: 0, padding: 24 }}>
            <div style={{ maxWidth: 860, margin: '0 auto', background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: 24 }}>
                <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#333' }}>첨부파일 업로드 (React 예제)</h2>
                <FileUploader
                    uploadUrl="/upload"
                    contentsInsertUrl="/api/contents/insert"
                    docKindList={[
                        { id: 'CONTRACT',    name: '계약서' },
                        { id: 'INVOICE',     name: '청구서' },
                        { id: 'REPORT',      name: '보고서' },
                        { id: 'CERTIFICATE', name: '증명서' },
                        { id: 'OTHER',       name: '기타' },
                    ]}
                    extra={{ title: '테스트 문서', userId: 'user01' }}
                />
            </div>
        </div>
    );
}
