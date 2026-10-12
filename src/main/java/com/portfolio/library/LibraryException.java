package com.portfolio.library;
public class LibraryException extends RuntimeException {
    public final int status;
    public LibraryException(int status,String message) { super(message); this.status=status; }
    public static LibraryException conflict(String message) { return new LibraryException(409,message); }
}
