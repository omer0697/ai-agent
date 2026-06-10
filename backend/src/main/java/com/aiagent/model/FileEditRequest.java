package com.aiagent.model;

import lombok.Data;

@Data
public class FileEditRequest {
    private String path;
    private String content;
}
