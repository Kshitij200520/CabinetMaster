"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { downloadQuotePdf, QuoteDocument } from "@/lib/quote-pdf";
import { formatINR } from "@/lib/currency";

interface SavedDesign {
  _id: string;
  title: string;
  layout: string;
  color: string;
  finish: string;
  previewImage?: string;
  aiRenderImage?: string;
  estimatedTotalINR: number;
  updatedAt: string;
}

interface Account {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  role: "customer" | "admin";
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<Account | null>(null);
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [quotes, setQuotes] = useState<QuoteDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState({ name: "", phone: "", city: "" });

  const loadData = useCallback(async () => {
    const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
    const me = await meResponse.json() as { user?: Account | null };
    if (!meResponse.ok || !me.user) {
      router.push("/login?next=%2Fdashboard");
      return;
    }
    setUser(me.user);
    setProfile({ name: me.user.name, phone: me.user.phone, city: me.user.city });
    const [designResponse, quoteResponse] = await Promise.all([
      fetch("/api/designs", { cache: "no-store" }),
      fetch("/api/quotes", { cache: "no-store" }),
    ]);
    const [designData, quoteData] = await Promise.all([designResponse.json(), quoteResponse.json()]);
    if (!designResponse.ok) throw new Error(designData.error || "Unable to load saved designs.");
    if (!quoteResponse.ok) throw new Error(quoteData.error || "Unable to load quotations.");
    setDesigns(designData.designs);
    setQuotes(quoteData.quotes);
  }, [router]);

  useEffect(() => {
    Promise.resolve()
      .then(loadData)
      .catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Unable to load your account."))
      .finally(() => setLoading(false));
  }, [loadData]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await response.json() as { user?: Account; error?: string };
      if (!response.ok || !data.user) throw new Error(data.error || "Unable to update profile.");
      setUser(data.user);
      setNotice("Profile updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update profile.");
    } finally {
      setBusy(false);
    }
  };

  const deleteDesign = async (id: string) => {
    if (!window.confirm("Delete this saved kitchen design?")) return;
    const response = await fetch(`/api/designs/${id}`, { method: "DELETE" });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setNotice(data.error || "Unable to delete design.");
      return;
    }
    setDesigns((items) => items.filter((item) => item._id !== id));
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#F6F3ED] text-sm text-[#6D6F68]">Loading your studio…</main>;

  return (
    <main className="min-h-screen bg-[#F6F3ED] text-[#272824]">
      <header className="flex items-center justify-between border-b border-[#272824]/10 px-5 py-5 md:px-10">
        <Link href="/" className="font-serif text-lg tracking-[0.16em]">CABINET STUDIO</Link>
        <div className="flex items-center gap-4 text-xs">
          <span className="hidden sm:inline">Welcome, {user?.name}</span>
          <Link href="/design" className="bg-[#272824] px-4 py-3 text-[#F6F3ED]">Design Kitchen</Link>
          <button onClick={logout} className="underline underline-offset-4">Logout</button>
        </div>
      </header>
      <div className="mx-auto max-w-[1360px] px-5 py-12 md:px-10 md:py-16">
        <p className="eyebrow">Your Cabinet Studio</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">My dashboard.</h1>
        {notice && <p role="status" className="mt-5 border border-[#B38B62]/40 bg-white/70 px-4 py-3 text-sm">{notice}</p>}

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[#77796F]">Your work in progress</p><h2 className="mt-2 font-serif text-3xl">Saved kitchen designs</h2></div>
            <span className="text-xs text-[#77796F]">{designs.length} saved</span>
          </div>
          {designs.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((design) => {
              const image = design.aiRenderImage || design.previewImage;
              return <article key={design._id} className="overflow-hidden border border-[#272824]/10 bg-white">
                <div className="relative aspect-[1.55] bg-[#E9E1D5]">
                  {image ? <Image src={image} alt={`${design.title} preview`} fill unoptimized className="object-cover" /> : <div className="grid h-full place-items-center text-xs text-[#77796F]">3D preview not captured</div>}
                </div>
                <div className="p-5">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[#77796F]">{design.layout} layout · Updated {new Date(design.updatedAt).toLocaleDateString("en-IN")}</p>
                  <h3 className="mt-2 font-serif text-2xl">{design.title}</h3>
                  <p className="mt-2 text-xs text-[#6D6F68]">{design.color} · {design.finish}</p>
                  <p className="mt-4 font-serif text-2xl">{formatINR(design.estimatedTotalINR)}</p>
                  <div className="mt-4 flex gap-3">
                    <Link href={`/design?designId=${design._id}`} className="flex-1 bg-[#272824] px-3 py-3 text-center text-[10px] uppercase tracking-[0.12em] text-[#F6F3ED]">Open in 3D Studio</Link>
                    <button onClick={() => deleteDesign(design._id)} className="border border-[#272824]/20 px-3 py-3 text-[10px] uppercase tracking-[0.1em]">Delete</button>
                  </div>
                </div>
              </article>;
            })}
          </div> : <div className="mt-5 border border-dashed border-[#272824]/20 bg-white/50 p-8 text-sm text-[#6D6F68]">No saved designs yet. Your next kitchen idea can begin in the 3D studio.</div>}
        </section>

        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-[#77796F]">For your review</p><h2 className="mt-2 font-serif text-3xl">My quotations</h2></div>
            <span className="text-xs text-[#77796F]">{quotes.length} quotations</span>
          </div>
          <div className="mt-6 divide-y divide-[#272824]/10 border-y border-[#272824]/10 bg-white">
            {quotes.map((quote) => {
              const image = quote.designSnapshot.aiRenderImage || quote.designSnapshot.previewImage;
              return <article key={quote.quoteNumber} className="grid gap-4 p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center md:p-5">
                <div className="relative aspect-[1.4] overflow-hidden bg-[#E9E1D5]">
                  {image && <Image src={image} alt={`${quote.quoteNumber} kitchen preview`} fill unoptimized className="object-cover" />}
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[#77796F]">{quote.quoteNumber} · {new Date(quote.createdAt).toLocaleDateString("en-IN")}</p>
                  <h3 className="mt-1 font-serif text-xl">{quote.designSnapshot.config.layout.toUpperCase()} kitchen estimate</h3>
                  <p className="mt-1 text-xs text-[#6D6F68]">Status: {("status" in quote ? (quote as QuoteDocument & { status?: string }).status : null) || "Pending Review"}</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                  <p className="font-serif text-xl">{formatINR(quote.grandTotalINR)}</p>
                  <button onClick={() => downloadQuotePdf(quote)} className="mt-2 text-[10px] uppercase tracking-[0.12em] underline underline-offset-4">Download PDF Quote</button>
                </div>
              </article>;
            })}
            {!quotes.length && <p className="p-8 text-sm text-[#6D6F68]">Your submitted quotations will appear here.</p>}
          </div>
        </section>

        <section className="mt-16 max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#77796F]">Your details</p>
          <h2 className="mt-2 font-serif text-3xl">Profile</h2>
          <form onSubmit={saveProfile} className="mt-6 grid gap-4 bg-white p-5 sm:grid-cols-2 md:p-7">
            <label className="text-[10px] font-semibold uppercase tracking-wider">Name<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required minLength={2} className="mt-2 w-full border border-[#D8D5CD] p-3 text-sm font-normal normal-case" /></label>
            <label className="text-[10px] font-semibold uppercase tracking-wider">Email<input value={user?.email ?? ""} readOnly className="mt-2 w-full border border-[#D8D5CD] bg-[#F6F3ED] p-3 text-sm font-normal normal-case" /></label>
            <label className="text-[10px] font-semibold uppercase tracking-wider">Phone<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className="mt-2 w-full border border-[#D8D5CD] p-3 text-sm font-normal normal-case" /></label>
            <label className="text-[10px] font-semibold uppercase tracking-wider">City<input value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })} className="mt-2 w-full border border-[#D8D5CD] p-3 text-sm font-normal normal-case" /></label>
            <button disabled={busy} className="bg-[#272824] px-5 py-3 text-xs uppercase tracking-[0.12em] text-[#F6F3ED] disabled:opacity-60 sm:col-span-2">{busy ? "Saving…" : "Save profile"}</button>
          </form>
        </section>
        <p className="mt-12 text-[10px] leading-5 text-[#77796F]">All prices are indicative estimates in INR; final pricing is subject to design review.</p>
      </div>
    </main>
  );
}
