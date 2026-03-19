package com.example.fileport.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * 파일 저장 서비스
 *
 * 실제 프로젝트에서는 DB에 파일 메타정보를 함께 저장하고,
 * 저장 경로를 환경(개발/운영)별로 분리하는 것을 권장합니다.
 */
@Service
public class FileService {

    private static final Logger log = LoggerFactory.getLogger(FileService.class);

    @Value("${fileport.upload.dir:./uploads}")
    private String uploadDir;

    /**
     * 파일을 서버에 저장하고 저장된 파일명을 반환합니다.
     *
     * @return 저장된 서버 파일명 (프론트엔드의 json.id 로 사용됨)
     */
    public String store(MultipartFile file, String docKindId, String userId, String orgId) {
        String ext           = extractExtension(file.getOriginalFilename());
        String datePath      = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String savedFileName = datePath + "_" + UUID.randomUUID().toString().replace("-", "") + ext;

        Path targetDir  = Paths.get(uploadDir, datePath);
        Path targetFile = targetDir.resolve(savedFileName);

        try {
            Files.createDirectories(targetDir);
            file.transferTo(targetFile);
            log.info("파일 저장 완료 — saved={}, original={}", savedFileName, file.getOriginalFilename());
        } catch (IOException e) {
            log.error("파일 저장 실패 — original={}", file.getOriginalFilename(), e);
            throw new RuntimeException("파일 저장 중 오류가 발생했습니다.", e);
        }

        // 실제 프로젝트: 여기서 DB에 FILE_INFO 테이블에 INSERT 수행
        // fileInfoRepository.save(FileInfo.of(savedFileName, file.getOriginalFilename(),
        //         file.getSize(), docKindId, userId, orgId));

        return savedFileName;
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) return "";
        return originalFilename.substring(originalFilename.lastIndexOf("."));
    }
}
