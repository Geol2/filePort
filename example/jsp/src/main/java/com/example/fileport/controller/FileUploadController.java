package com.example.fileport.controller;

import com.example.fileport.dto.FileUploadResponse;
import com.example.fileport.service.FileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * POST /upload
 *
 * 성공 시 { "id": "저장된 서버 파일명" } 반환
 * (프론트엔드에서 json.id 를 serverFileNm 으로 사용)
 */
@RestController
public class FileUploadController {

    private static final Logger log = LoggerFactory.getLogger(FileUploadController.class);

    private final FileService fileService;

    public FileUploadController(FileService fileService) {
        this.fileService = fileService;
    }

    @PostMapping("/upload")
    public ResponseEntity<FileUploadResponse> upload(
            @RequestParam("file")                                     MultipartFile file,
            @RequestParam(value = "docKindId", required = false, defaultValue = "") String docKindId,
            @RequestParam(value = "USER_ID",   required = false, defaultValue = "") String userId,
            @RequestParam(value = "ORG_ID",    required = false, defaultValue = "") String orgId
    ) {
        log.info("파일 업로드 요청 — name={}, size={}, docKindId={}", file.getOriginalFilename(), file.getSize(), docKindId);
        String savedFileName = fileService.store(file, docKindId, userId, orgId);
        return ResponseEntity.ok(new FileUploadResponse(savedFileName));
    }
}
