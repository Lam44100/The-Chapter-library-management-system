package com.portfolio.library;

import java.time.Clock;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(exclude=org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class)
@EnableScheduling
public class LibraryApplication {
    public static void main(String[] args) { SpringApplication.run(LibraryApplication.class, args); }
    @Bean Clock libraryClock() { return Clock.systemUTC(); }
}
