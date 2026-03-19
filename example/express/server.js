const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = 3000;

// ── 업로드 디렉토리 ─────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── multer 설정 ─────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination(req, file, cb) {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const dir   = path.join(UPLOAD_DIR, today);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename(req, file, cb) {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const ext   = path.extname(file.originalname);
        cb(null, `${today}_${uuidv4().replace(/-/g, '')}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── 미들웨어 ────────────────────────────────────────────────────────────────────
app.use(express.json());

// 라이브러리 정적 파일 — node_modules 에서 서빙
app.get('/fileport.iife.js', (_req, res) =>
    res.sendFile(require.resolve('fileport/dist/filePort.iife.js')));
app.get('/fileport.css', (_req, res) =>
    res.sendFile(require.resolve('fileport/src/filePort.css')));

// public 폴더 (index.html 등)
app.use(express.static(path.join(__dirname, 'public')));

// ── POST /upload ────────────────────────────────────────────────────────────────
/**
 * 프론트엔드 dropzoneUploader 가 파일을 업로드하는 엔드포인트.
 * 성공 시 { "id": "저장된 서버 파일명" } 을 반환해야 합니다.
 * (프론트엔드에서 json.id 를 serverFileNm 으로 사용)
 */
app.post('/upload', upload.single('file'), (req, res) => {
    const { docKindId = '', USER_ID = '', ORG_ID = '' } = req.body;
    const savedFileName = req.file.filename;

    console.log(
        `[upload] name=${req.file.originalname}  size=${req.file.size}` +
        `  docKindId=${docKindId}  userId=${USER_ID}  orgId=${ORG_ID}`,
    );

    // 실제 프로젝트: 여기서 DB에 FILE_INFO 테이블에 INSERT 수행
    res.json({ id: savedFileName });
});

// ── POST /api/contents/insert ───────────────────────────────────────────────────
/**
 * 파일 업로드 완료 후 콘텐츠(메타정보 + 파일 목록)를 등록하는 엔드포인트.
 * 프론트엔드 onSubmit 콜백에서 호출합니다.
 */
app.post('/api/contents/insert', (req, res) => {
    const { files = [], title, userId } = req.body;

    console.log(`[contents/insert] title=${title}  userId=${userId}  fileCount=${files.length}`);
    files.forEach((f, i) => console.log(`  [${i}]`, JSON.stringify(f)));

    // 실제 프로젝트: 여기서 DB에 CONTENTS / FILE_INFO 테이블에 INSERT 수행
    res.sendStatus(200);
});

// ── 서버 시작 ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`filePort Express 예제 서버 실행 중 → http://localhost:${PORT}`);
});
