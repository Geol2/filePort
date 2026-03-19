package com.example.fileport.service;

import com.example.fileport.dto.ContentsInsertRequest;
import com.example.fileport.dto.ContentsInsertRequest.FileItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 콘텐츠 등록 서비스
 *
 * 파일 업로드 완료 후 콘텐츠 메타정보와 파일 목록을 DB에 저장합니다.
 * 실제 프로젝트에서는 JPA Repository 또는 MyBatis Mapper를 주입해서 사용합니다.
 * 트랜잭션이 필요하면 spring-boot-starter-data-jpa 추가 후 @Transactional 을 붙여주세요.
 */
@Service
public class ContentsService {

    private static final Logger log = LoggerFactory.getLogger(ContentsService.class);

    public void insert(ContentsInsertRequest request) {
        // ── 1. 콘텐츠 메타정보 저장 ──────────────────────────────────
        // 실제: String contentsId = contentsRepository.insert(request);
        log.info("콘텐츠 저장 — title={}", request.getTitle());

        // ── 2. 파일 목록 순회하여 DOC_INFO 저장 ──────────────────────
        for (FileItem file : request.getFiles()) {
            if (Boolean.TRUE.equals(file.getIsOld())) {
                // 기존 파일: 이미 등록된 파일이므로 연결 정보만 갱신
                log.info("기존 파일 연결 — fileInfoId={}, docInfoId={}",
                        file.getFileInfoId(), file.getDocInfoId());
                // 실제: docInfoRepository.linkToContents(contentsId, file.getFileInfoId());

            } else if (Boolean.TRUE.equals(file.getIsScanned())) {
                // 스캔 파일: 스캐너가 미리 업로드한 파일을 콘텐츠에 연결
                log.info("스캔 파일 등록 — fileNm={}, fdKey01={}, fdKey02={}",
                        file.getFileNm(), file.getFdKey01(), file.getFdKey02());
                // 실제: docInfoRepository.insertScanned(contentsId, file);

            } else {
                // 새 파일: store() 단계에서 이미 디스크에 저장됨. DB 등록만 수행.
                log.info("새 파일 등록 — fileNm={}, srcFileNm={}",
                        file.getFileNm(), file.getSrcFileNm());
                // 실제: docInfoRepository.insert(contentsId, file.getFileNm(), file.getSrcFileNm());
            }
        }
    }
}
