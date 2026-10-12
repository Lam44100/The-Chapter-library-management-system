package com.portfolio.library;
import jakarta.validation.constraints.*;
import java.util.List;
import com.portfolio.library.Domain.*;
public final class Requests {
    private Requests() {}
    public record Login(@NotBlank @Size(max=180) String email,@NotBlank @Size(max=72) String password) {}
    public record DemoLogin(@NotNull Role role) {}
    public record TitleInput(@NotBlank @Size(max=32) String isbn,@NotBlank @Size(max=200) String title,@NotBlank @Size(max=80) String genre,@NotBlank @Size(max=120) String publisher,@NotNull @Size(max=2000) String description,@NotEmpty @Size(max=10) List<@NotNull Long> authorIds) {}
    public record AuthorInput(@NotBlank @Size(max=120) String name) {}
    public record CopyInput(@NotNull Long titleId,@NotBlank @Size(max=40) String barcode,@NotNull CopyStatus status) {}
    public record UserInput(@NotBlank @Size(max=120) String name,@NotBlank @Email @Size(max=180) String email,@Size(min=8,max=72) String password,@NotNull Role role,@NotNull AccountStatus status) {}
    public record Issue(@NotNull Long borrowerId,@NotNull Long copyId) {}
    public record Reserve(@NotNull Long titleId) {}
}
