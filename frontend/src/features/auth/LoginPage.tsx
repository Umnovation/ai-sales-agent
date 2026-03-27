import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/shared/hooks/useAuth";

export function LoginPage(): React.ReactElement {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--app-bg-page)]">
      <div className="w-full max-w-sm rounded-xl border border-[var(--app-border)] bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--app-primary)] text-base font-bold text-white">
            S
          </div>
        </div>
        <h1 className="mb-1 text-center text-xl font-semibold text-[var(--app-font-primary)]">
          AI Sales Agent
        </h1>
        <p className="mb-6 text-center text-sm text-[var(--app-font-secondary)]">
          Sign in to your account
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-[var(--app-font-primary)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none transition-colors focus:border-[var(--app-primary)] focus:ring-1 focus:ring-[var(--app-primary)]"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-[var(--app-font-primary)]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-font-primary)] outline-none transition-colors focus:border-[var(--app-primary)] focus:ring-1 focus:ring-[var(--app-primary)]"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--app-error)]">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-10 w-full bg-[var(--app-primary)] text-sm font-medium text-white hover:bg-[var(--app-primary-dark)]"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
