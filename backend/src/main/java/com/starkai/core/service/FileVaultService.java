package com.starkai.core.service;

import com.starkai.core.model.User;
import com.starkai.core.model.VaultFile;
import com.starkai.core.repository.VaultFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FileVaultService {

    private final VaultFileRepository vaultFileRepository;

    @Transactional
    public VaultFile storeFile(User user, MultipartFile file) throws IOException {
        long maxBytes = switch (user.getPlan()) {
            case STANDARD -> 10L * 1024 * 1024;
            case PRO -> 50L * 1024 * 1024;
            case VIP -> 200L * 1024 * 1024;
        };

        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("File size exceeds your plan's maximum allowed bandwidth.");
        }

        String checksum = calculateChecksum(file.getBytes());

        VaultFile vaultFile = VaultFile.builder()
                .user(user)
                .filename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "document")
                .fileSizeBytes(file.getSize())
                .mimeType(file.getContentType())
                .tokensEstimated((int) (file.getSize() / 4))
                .checksum(checksum)
                .build();

        return vaultFileRepository.save(vaultFile);
    }

    public List<VaultFile> getUserFiles(User user) {
        return vaultFileRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Transactional
    public void deleteFile(User user, String fileId) {
        VaultFile file = vaultFileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("File not found in vault"));
        if (!file.getUser().getId().equals(user.getId())) throw new SecurityException("Unauthorized");
        vaultFileRepository.delete(file);
    }

    private String calculateChecksum(byte[] bytes) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(bytes);
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return "unknown";
        }
    }
}
