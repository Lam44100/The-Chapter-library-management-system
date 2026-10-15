import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { BookCard, ErrorBox, date, money } from "./components";
import type { Book } from "./types";
const book: Book = {
  id: 1,
  isbn: "9780141439518",
  title: "Pride and Prejudice",
  genre: "Classics",
  publisher: "Penguin",
  description: "A novel",
  authors: [{ id: 1, name: "Jane Austen" }],
  copies: [{ id: 1, barcode: "A1", status: "AVAILABLE" }],
  available: 1,
};
describe("reader-facing information", () => {
  it("links to the title and shows actual copy availability", () => {
    render(
      <MemoryRouter>
        <BookCard book={book} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/catalog/1");
    expect(screen.getByText("1 of 1 copies available")).toBeVisible();
    expect(screen.getByText("Available")).toBeVisible();
  });
  it("does not label an unavailable title as available", () => {
    render(
      <MemoryRouter>
        <BookCard book={{ ...book, available: 0 }} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Available")).not.toBeInTheDocument();
    expect(screen.getByText("On loan / held")).toBeVisible();
  });
  it("announces action errors accessibly", () => {
    render(<ErrorBox message="This copy is held for another member." />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "held for another member",
    );
  });
  it("formats Malaysia dates and fines consistently", () => {
    expect(date("2026-10-12")).toContain("12");
    expect(money(1.5)).toContain("1.50");
  });
});
