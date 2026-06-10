package com.aiagent.controller;

import com.aiagent.model.FileEditRequest;
import com.aiagent.model.FileInfo;
import com.aiagent.service.FileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    @GetMapping("/tree")
    public ResponseEntity<FileInfo> getTree(@RequestParam String path) {
        FileInfo tree = fileService.getFileTree(path);
        return ResponseEntity.ok(tree);
    }

    @GetMapping("/content")
    public ResponseEntity<Map<String, String>> getContent(@RequestParam String path) throws IOException {
        String content = fileService.readFile(path);
        return ResponseEntity.ok(Map.of("content", content, "path", path));
    }

    @PutMapping("/content")
    public ResponseEntity<Map<String, String>> updateContent(@RequestBody FileEditRequest request) throws IOException {
        fileService.writeFile(request.getPath(), request.getContent());
        return ResponseEntity.ok(Map.of("status", "ok", "path", request.getPath()));
    }
}
