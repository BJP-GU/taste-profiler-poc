import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "Graphic Design Taste Profiler",
  description: "A prototype for computing a personal graphic design taste profile.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900 min-h-screen">
        <Nav />
        <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
