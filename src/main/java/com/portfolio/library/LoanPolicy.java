package com.portfolio.library;

import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.ChronoUnit;

public final class LoanPolicy {
    public static final ZoneId ZONE = ZoneId.of("Asia/Kuala_Lumpur");
    public static final int MAX_LOANS = 5;
    private LoanPolicy() {}
    public static LocalDate today(Clock clock) { return LocalDate.now(clock.withZone(ZONE)); }
    public static BigDecimal fine(LocalDate due, LocalDate returned, LocalDate today) {
        return BigDecimal.valueOf(Math.max(0, ChronoUnit.DAYS.between(due, returned == null ? today : returned)))
            .multiply(new BigDecimal("0.50"));
    }
    public static Instant latestReset(Clock clock) {
        ZonedDateTime now = clock.instant().atZone(ZONE);
        ZonedDateTime reset = now.toLocalDate().atTime(4,0).atZone(ZONE);
        return (now.isBefore(reset) ? reset.minusDays(1) : reset).toInstant();
    }
}
