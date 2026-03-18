package com.example.fileport.controller;

import com.example.fileport.dto.ContentsInsertRequest;
import com.example.fileport.service.ContentsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * POST /api/contents/insert
 *
 * 파일 업로드 완료 후 콘텐츠(메타정보 + 파일 목록)를 DB에 등록하는 엔드포인트.
 * 프론트엔드 onSubmit 콜백에서 호출합니다.
 */
@RestController
@RequestMapping("/api/contents")
public class ContentsController {

    private static final Logger log = LoggerFactory.getLogger(ContentsController.class);

    private final ContentsService contentsService;

    public ContentsController(ContentsService contentsService) {
        this.contentsService = contentsService;
    }

    @PostMapping("/insert")
    public ResponseEntity<Void> insert(@RequestBody ContentsInsertRequest request) {
        log.info("콘텐츠 등록 요청 — fileCount={}", request.getFiles().size());
        contentsService.insert(request);
        return ResponseEntity.ok().build();
    }
}
