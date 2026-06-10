package com.aiagent.service;

import com.aiagent.model.ChatRequest;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class LLMService {

    private final WebClient webClient;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public LLMService(WebClient webClient) {
        this.webClient = webClient;
    }

    public SseEmitter streamChat(ChatRequest request) {
        SseEmitter emitter = new SseEmitter(300_000L);

        Map<String, Object> body = new HashMap<>();
        body.put("model", request.getModel() != null ? request.getModel() : "gpt-4");
        body.put("stream", true);
        body.put("messages", request.getMessages());

        String url = request.getBaseUrl().replaceAll("/$", "") + request.getChatPath();

        executor.submit(() -> {
            webClient.post()
                    .uri(url)
                    .header("Authorization", "Bearer " + request.getToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToFlux(String.class)
                    // Her chunk'ı satırlara böl
                    .flatMap(chunk -> Flux.fromArray(chunk.split("\n")))
                    // Sadece "data: ..." satırlarını al
                    .filter(line -> line.startsWith("data:"))
                    // "data: " prefix'ini sıyır
                    .map(line -> line.replaceFirst("^data:\\s*", "").trim())
                    .filter(data -> !data.isEmpty())
                    // [DONE] gelince durdur
                    .takeWhile(data -> !data.equals("[DONE]"))
                    .subscribe(
                            data -> {
                                try {
                                    emitter.send(SseEmitter.event().data(data));
                                } catch (IOException e) {
                                    emitter.completeWithError(e);
                                }
                            },
                            emitter::completeWithError,
                            emitter::complete
                    );
        });

        return emitter;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> authenticate(String baseUrl, String username, String password) {
        Map<String, String> credentials = new HashMap<>();
        credentials.put("username", username);
        credentials.put("password", password);

        String url = baseUrl.replaceAll("/$", "") + "/api/auth/login";

        return webClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(credentials)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }
}
