package com.portfolio.library;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DemoLifecycle implements ApplicationRunner {
  final DemoService demo;
  final boolean reset;
  final ConfigurableApplicationContext context;

  DemoLifecycle(
      DemoService demo,
      @Value("${library.reset-on-start}") boolean reset,
      ConfigurableApplicationContext context) {
    this.demo = demo;
    this.reset = reset;
    this.context = context;
  }

  @Override
  public void run(ApplicationArguments args) {
    if (reset) {
      demo.reset();
      System.exit(SpringApplication.exit(context, () -> 0));
    } else demo.maintain();
  }

  @Scheduled(cron = "0 0 4 * * *", zone = "Asia/Kuala_Lumpur")
  public void scheduledReset() {
    demo.maintain();
  }
}
