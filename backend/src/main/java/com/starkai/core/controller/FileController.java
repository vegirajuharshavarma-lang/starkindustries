package com.starkai.core.controller;

import com.starkai.core.model.User;
import com.starkai.core.model.VaultFile;
import com.starkai.core.service.FileVaultService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileVaultService fileVaultService;

    @PostMapping("/upload")
    public ResponseEntity<VaultFile> upload(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(fileVaultService.storeFile(user, file));
    }

    @GetMapping
    public ResponseEntity<List<VaultFile>> listFiles(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(fileVaultService.getUserFiles(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @AuthenticationPrincipal User user,
            @PathVariable String id) {
        fileVaultService.deleteFile(user, id);
        return ResponseEntity.ok(Map.of("message", "File eliminated from vault"));
    }
}
