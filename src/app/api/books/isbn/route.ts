import { NextResponse } from "next/server";

type BookMetadata = {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  edition: string;
  publicationYear: string;
  language: string;
  coverImage: string;
  source: "Google Books" | "Open Library";
};

function normalizeIsbn(value: string) {
  return value.replaceAll(/[^0-9Xx]/g, "").toUpperCase();
}

function validIsbn(value: string) {
  if (value.length === 10) {
    let total = 0;
    for (let index = 0; index < 10; index += 1) {
      const digit = value[index] === "X" ? 10 : Number(value[index]);
      if (!Number.isInteger(digit)) return false;
      total += digit * (10 - index);
    }
    return total % 11 === 0;
  }

  if (value.length === 13 && /^97[89]\d{10}$/.test(value)) {
    const total = value.slice(0, 12).split("").reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    return (10 - (total % 10)) % 10 === Number(value[12]);
  }

  return false;
}

async function fetchJson(url: string) {
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(7000), next: { revalidate: 86400 } });
  if (!response.ok) return null;
  return response.json();
}

async function lookupGoogleBooks(isbn: string): Promise<BookMetadata | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const key = apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
  const payload = await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1${key}`);
  const info = payload?.items?.[0]?.volumeInfo;
  if (!info?.title) return null;

  return {
    title: info.title,
    author: info.authors?.join(", ") ?? "",
    isbn,
    publisher: info.publisher ?? "",
    edition: info.printType ? `${info.printType}${info.pageCount ? `, ${info.pageCount} pages` : ""}` : "",
    publicationYear: info.publishedDate?.slice(0, 4) ?? "",
    language: info.language ?? "English",
    coverImage: (info.imageLinks?.thumbnail ?? "").replace("http://", "https://"),
    source: "Google Books",
  };
}

async function lookupOpenLibrary(isbn: string): Promise<BookMetadata | null> {
  const index = await fetchJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
  const payload = index?.[`ISBN:${isbn}`];
  if (!payload?.title) return null;

  const authors = Array.isArray(payload.authors) ? payload.authors.map((author: { name?: string }) => author.name).filter(Boolean) : [];
  return {
    title: payload.title,
    author: authors.join(", "),
    isbn,
    publisher: typeof payload.publishers?.[0] === "string" ? payload.publishers[0] : payload.publishers?.[0]?.name ?? "",
    edition: payload.number_of_pages ? `${payload.number_of_pages} pages` : "",
    publicationYear: String(payload.publish_date ?? "").match(/\d{4}/)?.[0] ?? "",
    language: "English",
    coverImage: payload.cover?.medium ?? payload.cover?.large ?? "",
    source: "Open Library",
  };
}

export async function GET(request: Request) {
  const isbn = normalizeIsbn(new URL(request.url).searchParams.get("isbn") ?? "");
  if (!validIsbn(isbn)) return NextResponse.json({ error: "Enter a valid ISBN-10 or ISBN-13." }, { status: 400 });

  try {
    const result = await lookupGoogleBooks(isbn).catch(() => null) ?? await lookupOpenLibrary(isbn).catch(() => null);
    if (!result) return NextResponse.json({ error: "No book details found. You can still enter the details manually." }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Book lookup is temporarily unavailable. You can enter the details manually." }, { status: 503 });
  }
}