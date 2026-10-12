package com.portfolio.library;
import com.portfolio.library.Domain.LibraryState;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
public interface StateRepository extends JpaRepository<LibraryState,Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from LibraryState s where s.id=1") LibraryState lock();
}
