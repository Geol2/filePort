package com.example.fileport.dto;

/**
 * 파일 업로드 응답 DTO
 *
 * 프론트엔드에서 json.id 를 serverFileNm 으로 사용하므로
 * 반드시 "id" 필드로 서버 저장 파일명을 반환해야 합니다.
 *
 * 응답 예시: { "id": "20240318_a1b2c3d4.pdf" }
 */
public class FileUploadResponse {

    private final String id;

    public FileUploadResponse(String id) {
        this.id = id;
    }

    public String getId() {
        return id;
    }
}
