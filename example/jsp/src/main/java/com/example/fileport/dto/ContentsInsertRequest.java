package com.example.fileport.dto;

import java.util.List;

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

        public String  getFileNm()     { return fileNm; }
        public String  getSrcFileNm()  { return srcFileNm; }
        public Boolean getIsOld()      { return isOld; }
        public String  getFileInfoId() { return fileInfoId; }
        public String  getDocInfoId()  { return docInfoId; }
        public Boolean getIsScanned()  { return isScanned; }
        public String  getFdKey01()    { return fdKey01; }
        public String  getFdKey02()    { return fdKey02; }

        public void setFileNm(String v)      { this.fileNm = v; }
        public void setSrcFileNm(String v)   { this.srcFileNm = v; }
        public void setIsOld(Boolean v)      { this.isOld = v; }
        public void setFileInfoId(String v)  { this.fileInfoId = v; }
        public void setDocInfoId(String v)   { this.docInfoId = v; }
        public void setIsScanned(Boolean v)  { this.isScanned = v; }
        public void setFdKey01(String v)     { this.fdKey01 = v; }
        public void setFdKey02(String v)     { this.fdKey02 = v; }
    }
}
