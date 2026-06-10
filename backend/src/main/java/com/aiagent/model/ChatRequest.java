package com.aiagent.model;

import lombok.Data;
import java.util.List;

@Data
public class ChatRequest {
    private String token;
    private String baseUrl;
    private String chatPath;
    private String model;
    private List<ChatMessage> messages;
}
