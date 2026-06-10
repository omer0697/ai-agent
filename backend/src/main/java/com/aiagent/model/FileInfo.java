package com.aiagent.model;

import lombok.Data;
import java.util.List;

@Data
public class FileInfo {
    private String name;
    private String path;
    private boolean directory;
    private List<FileInfo> children;
}
