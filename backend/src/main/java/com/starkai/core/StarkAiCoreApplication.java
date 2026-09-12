package com.starkai.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties
public class StarkAiCoreApplication {

    public static void main(String[] args) {
        SpringApplication.run(StarkAiCoreApplication.class, args);
        System.out.println("=================================================");
        System.out.println("⚡ STARK-AI CORE Backend Online: Port 8080");
        System.out.println("Tagline: Your Intelligence. Your Core.");
        System.out.println("=================================================");
    }
}
