import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="container state-page">
      <p className="eyebrow">404 · Page not found</p>
      <h1>Nothing here yet.</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <Link href="/" className="button">Back to home</Link>
    </main>
  );
}
