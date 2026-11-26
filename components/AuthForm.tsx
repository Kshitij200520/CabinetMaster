"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface AuthFormProps {
  mode: "login" | "register";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const getNextPath = () => {
    const requested = new URLSearchParams(window.location.search).get("next");
    return requested?.startsWith("/") && !requested.startsWith("//") ? requested : mode === "register" ? "/dashboard" : "/design";
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login"
          ? { email, password }
          : { name, email, password, phone, city }),
      });
      const payload = await response.json() as { error?: string; user?: { role: string } };
      if (!response.ok) throw new Error(payload.error || "Unable to complete sign in.");
      const nextPath = getNextPath();
      const destination = payload.user?.role === "admin"
        ? nextPath === "/dashboard" ? "/admin" : nextPath
        : nextPath.startsWith("/admin") ? "/dashboard" : nextPath;
      router.push(destination);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to complete sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-[#F6F3ED] text-[#272824] lg:grid-cols-[1.05fr_.95fr]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#272824] p-12 text-[#F6F3ED] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(39,40,36,.94),rgba(39,40,36,.62)),url('/cabinet-studio/hero-kitchen.jpg')] bg-cover bg-center" />
        <Link href="/" className="relative font-serif text-lg tracking-[0.18em]">CABINET STUDIO</Link>
        <div className="relative max-w-xl pb-8">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[#B38B62]">A more considered kitchen</p>
          <h1 className="mt-5 font-serif text-6xl leading-[1.02]">Your design journey,<br />beautifully continued.</h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/75">Return to saved designs, explore materials and carry your ideas into a thoughtful design conversation.</p>
        </div>
        <p className="relative text-[10px] text-white/55">Indicative estimates in INR · Final pricing subject to design review</p>
      </aside>
      <section className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-12 lg:px-[12%]">
        <Link href="/" className="mb-14 font-serif text-base tracking-[0.16em] lg:hidden">CABINET STUDIO</Link>
        <div className="mx-auto w-full max-w-md">
          <p className="eyebrow">{mode === "login" ? "Welcome back" : "Your Cabinet Studio account"}</p>
          <h2 className="mt-4 font-serif text-5xl">{mode === "login" ? "Sign in." : "Create account."}</h2>
          <p className="mt-4 text-sm leading-6 text-[#6D6F68]">
            {mode === "login" ? "Open your saved kitchens and quotations." : "Save your kitchen ideas and return to them anytime."}
          </p>
          <form onSubmit={submit} className="mt-9 space-y-4">
            {mode === "register" && (
              <>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.15em]">Full name
                  <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} autoComplete="name" className="mt-2 w-full border border-[#D8D5CD] bg-white/70 px-4 py-3.5 text-sm outline-none focus:border-[#694A36]" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.15em]">Phone
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" className="mt-2 w-full border border-[#D8D5CD] bg-white/70 px-4 py-3.5 text-sm outline-none focus:border-[#694A36]" />
                  </label>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.15em]">City
                    <input value={city} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" className="mt-2 w-full border border-[#D8D5CD] bg-white/70 px-4 py-3.5 text-sm outline-none focus:border-[#694A36]" />
                  </label>
                </div>
              </>
            )}
            <label className="block text-[10px] font-semibold uppercase tracking-[0.15em]">Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="mt-2 w-full border border-[#D8D5CD] bg-white/70 px-4 py-3.5 text-sm outline-none focus:border-[#694A36]" />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.15em]">Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "register" ? 10 : 1} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-2 w-full border border-[#D8D5CD] bg-white/70 px-4 py-3.5 text-sm outline-none focus:border-[#694A36]" />
              {mode === "register" && <span className="mt-2 block text-[10px] normal-case text-[#77796F]">Use at least 10 characters.</span>}
            </label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="mt-3 flex w-full items-center justify-center bg-[#272824] px-5 py-4 text-xs font-medium uppercase tracking-[0.14em] text-[#F6F3ED] transition hover:bg-[#694A36] disabled:opacity-60">
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
          <p className="mt-7 text-sm text-[#6D6F68]">
            {mode === "login" ? "New to Cabinet Studio?" : "Already have an account?"}{" "}
            <Link href={mode === "login" ? "/register" : "/login"} onClick={(event) => {
              event.preventDefault();
              router.push(`${mode === "login" ? "/register" : "/login"}?next=${encodeURIComponent(getNextPath())}`);
            }} className="font-medium text-[#694A36] underline underline-offset-4">
              {mode === "login" ? "Create an account" : "Sign in"}
            </Link>
          </p>
          <Link href="/" className="mt-8 inline-block text-xs text-[#77796F] hover:text-[#272824]">← Return to Cabinet Studio</Link>
        </div>
      </section>
    </main>
  );
}
