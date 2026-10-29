import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-semibold text-ink-950">Page not found</h1>
      <p className="mt-2 text-ink-500">The page you requested does not exist.</p>
      <Link className="mt-6 text-sm font-medium text-accent hover:underline" to="/dashboard">
        Go to dashboard
      </Link>
    </section>
  );
}
