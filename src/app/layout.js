import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "Designer Taste Profiler",
  description:
    "Semantic web/UI taste profile from liked and disliked website references.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white text-black min-h-screen overflow-x-hidden antialiased">
        <Nav />
        <main className="max-w-3xl mx-auto px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
