package com.aiagent.service;

import com.aiagent.model.FileInfo;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class FileService {

    private static final List<String> IGNORED = Arrays.asList(
            ".git", "node_modules", "target", "build", ".idea", ".vscode", "__pycache__"
    );

    public FileInfo getFileTree(String rootPath) {
        File root = new File(resolvePath(rootPath));
        if (!root.exists()) {
            throw new IllegalArgumentException("Path does not exist: " + rootPath);
        }
        return buildTree(root);
    }

    // Windows yollarını Docker container içindeki bağlama noktasına çevirir
    // Örnek: C:\Users\omer\proje -> /c_drive/Users/omer/proje
    private String resolvePath(String path) {
        if (path == null) return path;
        String p = path.trim();
        if (p.matches("^[A-Za-z]:[/\\\\].*")) {
            char drive = Character.toLowerCase(p.charAt(0));
            String rest = p.substring(2).replace('\\', '/');
            return "/" + drive + "_drive" + rest;
        }
        return p.replace('\\', '/');
    }

    private FileInfo buildTree(File file) {
        FileInfo info = new FileInfo();
        info.setName(file.getName());
        info.setPath(file.getAbsolutePath().replace("\\", "/"));
        info.setDirectory(file.isDirectory());

        if (file.isDirectory() && !IGNORED.contains(file.getName())) {
            File[] children = file.listFiles();
            if (children != null) {
                Arrays.sort(children, (a, b) -> {
                    if (a.isDirectory() != b.isDirectory()) return a.isDirectory() ? -1 : 1;
                    return a.getName().compareToIgnoreCase(b.getName());
                });
                List<FileInfo> childInfos = new ArrayList<>();
                for (File child : children) {
                    if (!IGNORED.contains(child.getName())) {
                        childInfos.add(buildTree(child));
                    }
                }
                info.setChildren(childInfos);
            }
        }
        return info;
    }

    public String readFile(String path) throws IOException {
        Path p = Paths.get(resolvePath(path));
        if (!Files.exists(p)) {
            throw new IllegalArgumentException("File not found: " + path);
        }
        return Files.readString(p, StandardCharsets.UTF_8);
    }

    public void writeFile(String path, String content) throws IOException {
        Path p = Paths.get(resolvePath(path));
        Files.createDirectories(p.getParent());
        Files.writeString(p, content, StandardCharsets.UTF_8);
    }
}
