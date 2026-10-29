import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { ArrowRight } from "lucide-react";

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to sign in"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-950">
          Welcome back
        </h1>
        <p className="font-sans text-sm text-ink-500">
          Enter your credentials to access your financial command center.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs font-semibold text-rose-700" role="alert">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 rounded-xl bg-accent hover:bg-accent-hover text-white font-sans font-semibold text-sm shadow-xs transition-all"
          isLoading={isSubmitting}
        >
          <span>Sign In</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      <div className="pt-2 text-center">
        <p className="font-sans text-xs text-ink-500">
          Don&apos;t have an account?{" "}
          <Link className="font-semibold text-accent hover:underline decoration-accent/40 underline-offset-4" to="/register">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}
