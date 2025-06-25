import { describe, it, expect, beforeEach, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../../index";
import { db } from "../../app/config/database";
import { books } from "../../db/schema/book";

describe("Book API", () => {
    // Seed the database with some test data before each test
    beforeEach(async () => {
        await db.delete(books);
        await db.insert(books).values([
            {
                id: 1,
                title: "The Hobbit",
                author: "J.R.R. Tolkien",
                publish_date: new Date("1937-09-21"),
                ISBN_13: "9780618260300",
                category: "Fantasy",
                publisher: "George Allen & Unwin",
                language: "English",
                is_removed: false,
                description: "A fantasy novel.",
                printType: "Book",
                pageCount: 310,
                quantity: 1,
            },
            {
                id: 2,
                title: "The Fellowship of the Ring",
                author: "J.R.R. Tolkien",
                publish_date: new Date("1954-07-29"),
                ISBN_13: "9780618346257",
                category: "Fantasy",
                publisher: "George Allen & Unwin",
                language: "English",
                is_removed: false,
                description: "The first volume of The Lord of the Rings.",
                printType: "Book",
                pageCount: 423,
                quantity: 1,
            },
            {
                id: 3,
                title: "1984",
                author: "George Orwell",
                publish_date: new Date("1949-06-08"),
                ISBN_13: "9780451524935",
                category: "Dystopian",
                publisher: "Secker & Warburg",
                language: "English",
                is_removed: true,
                description: "A dystopian social science fiction novel and cautionary tale.",
                printType: "Book",
                pageCount: 328,
                quantity: 1,
            },
        ]);
    });

    // Clean up the database after all tests have run
    afterAll(async () => {
        await db.delete(books);
    });

    describe("GET /books", () => {
        it("should return a list of books", async () => {
            const res = await request(app).get("/books");
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(2);
        });

        it("should return a paginated list of books", async () => {
            const res = await request(app).get("/books?page=1&itemsPerPage=1");
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.pagination.totalPages).toBe(2);
        });

        it("should return removed books if requested", async () => {
            const res = await request(app).get("/books?is_removed=true");
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(3);
        });
    });

    describe("GET /books/:id", () => {
        it("should return a single book by id", async () => {
            const res = await request(app).get("/books/1");
            expect(res.status).toBe(200);
            expect(res.body.title).toBe("The Hobbit");
        });

        it("should return 404 if book not found", async () => {
            const res = await request(app).get("/books/999");
            expect(res.status).toBe(404);
        });

        it("should return 400 for invalid id", async () => {
            const res = await request(app).get("/books/invalid");
            expect(res.status).toBe(400);
        });
    });

    describe("GET /books/search/:search", () => {
        it("should return books matching the search term", async () => {
            const res = await request(app).get("/books/search/Hobbit");
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].title).toBe("The Hobbit");
        });

        it("should return books by author", async () => {
            const res = await request(app).get("/books/search/Tolkien");
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(2);
        });
    });

    describe("GET /books/search", () => {
        it("should return books matching the filter", async () => {
            const res = await request(app).get("/books/search?category=Fantasy");
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(2);
        });

        it("should return removed books if requested", async () => {
            const res = await request(app).get(
                "/books/search?category=Dystopian&is_removed=true",
            );
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
        });
    });

    describe("GET /books/categories", () => {
        it("should return a list of categories", async () => {
            const res = await request(app).get("/books/categories");
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body).toContain("Fantasy");
        });
    });

    describe("GET /books/publishers", () => {
        it("should return a list of publishers", async () => {
            const res = await request(app).get("/books/publishers");
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body).toContain("George Allen & Unwin");
        });
    });

    describe("GET /books/authors", () => {
        it("should return a list of authors", async () => {
            const res = await request(app).get("/books/authors");
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body).toContain("J.R.R. Tolkien");
        });
    });
});