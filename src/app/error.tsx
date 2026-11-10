"use client";

import { Button } from "@/components/Button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" className="container state-page">
      <p className="eyebrow">Something went wrong</p>
      <h1>Let’s try that again.</h1>
      <p>We couldn’t load this page. Please retry.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
