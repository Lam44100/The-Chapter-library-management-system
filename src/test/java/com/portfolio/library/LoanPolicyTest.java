package com.portfolio.library;
import org.junit.jupiter.api.Test;
import java.time.*;
import static org.assertj.core.api.Assertions.*;
class LoanPolicyTest {
    @Test void finesStartAfterDueDateAndStopAtReturn() {
        LocalDate due=LocalDate.of(2026,10,12);
        assertThat(LoanPolicy.fine(due,null,due)).isEqualByComparingTo("0.00");
        assertThat(LoanPolicy.fine(due,null,due.plusDays(1))).isEqualByComparingTo("0.50");
        assertThat(LoanPolicy.fine(due,due.plusDays(3),due.plusDays(30))).isEqualByComparingTo("1.50");
        assertThat(LoanPolicy.fine(due,due.minusDays(1),due)).isEqualByComparingTo("0");
    }
    @Test void calendarAndResetUseMalaysiaTime() {
        Clock clock=Clock.fixed(Instant.parse("2026-10-11T20:00:00Z"),ZoneOffset.UTC);
        assertThat(LoanPolicy.today(clock)).isEqualTo(LocalDate.of(2026,10,12));
        assertThat(LoanPolicy.latestReset(clock)).isEqualTo(clock.instant());
        assertThat(LoanPolicy.latestReset(Clock.offset(clock,Duration.ofSeconds(-1)))).isEqualTo(clock.instant().minus(Duration.ofDays(1)));
    }
}
