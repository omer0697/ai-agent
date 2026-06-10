package com.aiagent.controller;

import com.aiagent.model.AuthRequest;
import com.aiagent.service.LLMService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final LLMService llmService;

    public AuthController(LLMService llmService) {
        this.llmService = llmService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody AuthRequest request) {
        Map<String, Object> response = llmService.authenticate(
                request.getBaseUrl(),
                request.getUsername(),
                request.getPassword()
        );
        return ResponseEntity.ok(response);
    }
}
