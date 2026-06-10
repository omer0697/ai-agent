package com.aiagent.controller;

import com.aiagent.model.ChatRequest;
import com.aiagent.service.LLMService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final LLMService llmService;

    public ChatController(LLMService llmService) {
        this.llmService = llmService;
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChat(@RequestBody ChatRequest request) {
        return llmService.streamChat(request);
    }
}
