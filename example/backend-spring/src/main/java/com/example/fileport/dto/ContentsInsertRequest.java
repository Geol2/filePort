package com.example.fileport.dto;

import java.util.List;

/**
 * 콘텐츠 등록 요청 DTO
 *
 * 프론트엔드 onSubmit 콜백이 전송하는 JSON 구조:
 * {
 *   "files": [
 *     { "fileNm": "서버저장파일명", "srcFileNm": "원본파일명.pdf" },          ← 새 파일
 *     { "isOld": true, "fileInfoId": "xxx", "docInfoId": "yyy" },             ← 기존 파일
 *     { "isScanned": true, "fileNm": "xxx", "fdKey01": "날짜", "fdKey02": "uuid" } ← 스캔
 *   ],
 *   "title": "문서 제목",
 *   ...
 * }
 */
public class ContentsInsertRequest {

    private List<FileItem> files;
    private String title;
    private String userId;

    public List<FileItem> getFiles()  { return files; }
    public String getTitle()          { return title; }
    public String getUserId()         { return userId; }

    public void setFiles(List<FileItem> files)  { this.files = files; }
    public void setTitle(String title)          { this.title = title; }
    public void setUserId(String userId)        { this.userId = userId; }

    public static class FileItem {
        private String  fileNm;
        private String  srcFileNm;
        private Boolean isOld;
        private String  fileInfoId;
        private String  docInfoId;
        private Boolean isScanned;
        private String  fdKey01;
        private String  fdKey02;

        public String  getFileNm()    { return fileNm; }
        public String  getSrcFileNm() { return srcFileNm; }
        public Boolean getIsOld()     { return isOld; }
        public String  getFileInfoId(){ return fileInfoId; }
        public String  getDocInfoId() { return docInfoId; }
        public Boolean getIsScanned() { return isScanned; }
        public String  getFdKey01()   { return fdKey01; }
        public String  getFdKey02()   { return fdKey02; }

        public void setFileNm(String fileNm)        { this.fileNm = fileNm; }
        public void setSrcFileNm(String srcFileNm)  { this.srcFileNm = srcFileNm; }
        public void setIsOld(Boolean isOld)         { this.isOld = isOld; }
        public void setFileInfoId(String fileInfoId){ this.fileInfoId = fileInfoId; }
        public void setDocInfoId(String docInfoId)  { this.docInfoId = docInfoId; }
        public void setIsScanned(Boolean isScanned) { this.isScanned = isScanned; }
        public void setFdKey01(String fdKey01)      { this.fdKey01 = fdKey01; }
        public void setFdKey02(String fdKey02)      { this.fdKey02 = fdKey02; }
    }
}
