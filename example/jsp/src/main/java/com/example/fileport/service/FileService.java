package com.example.fileport.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class FileService {

    private static final Logger log = LoggerFactory.getLogger(FileService.class);

    @Value("${fileport.upload.dir:./uploads}")
    private String uploadDir;

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

        // 실제 프로젝트: DB에 FILE_INFO INSERT
        return savedFileName;
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) return "";
        return originalFilename.substring(originalFilename.lastIndexOf("."));
    }
}
