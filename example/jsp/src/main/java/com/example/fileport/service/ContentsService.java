package com.example.fileport.service;

import com.example.fileport.dto.ContentsInsertRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ContentsService {

    private static final Logger log = LoggerFactory.getLogger(ContentsService.class);

    public void insert(ContentsInsertRequest request) {
        log.info("콘텐츠 저장 — title={}, userId={}, fileCount={}",
                request.getTitle(), request.getUserId(), request.getFiles().size());

        // 실제 프로젝트: DB에 CONTENTS / FILE_INFO INSERT
    }
}
