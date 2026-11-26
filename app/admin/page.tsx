"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatINR } from "@/lib/currency";

type QuoteStatus = "Pending Review" | "In Consultation" | "Approved" | "Revision Requested";
interface AdminQuote {
  _id: string;
  quoteNumber: string;
  customerInfo: { name: string; email: string; phone: string; city: string; pincode: string };
  designSnapshot: { config: { layout: string }; previewImage?: string; aiRenderImage?: string };
  status: QuoteStatus;
  grandTotalINR: number;
  createdAt: string;
}
interface AdminDesign {
  _id: string;
  title: string;
  layout: string;
  color: string;
  finish: string;
  estimatedTotalINR: number;
  previewImage?: string;
  aiRenderImage?: string;
  userId?: { name: string; email: string };
}
interface Product {
  sku: string;
  name: string;
  category: string;
  widthIn: number;
  basePriceINR: number;
}

const statuses: QuoteStatus[] = ["Pending Review", "In Consultation", "Approved", "Revision Requested"];

export default function AdminPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<AdminQuote[]>([]);
  const [designs, setDesigns] = useState<AdminDesign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState({ totalQuotes: 0, pipelineINR: 0, approvedINR: 0 });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSku, setSavingSku] = useState("");

  const loadAdminData = useCallback(async () => {
    const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
    const me = await meResponse.json() as { user?: { role: string } | null };
    if (!meResponse.ok || me.user?.role !== "admin") {
      router.push("/login?next=%2Fadmin");
      return;
    }
    const responses = await Promise.all([
      fetch("/api/admin/quotes", { cache: "no-store" }),
      fetch("/api/admin/designs", { cache: "no-store" }),
      fetch("/api/admin/products", { cache: "no-store" }),
    ]);
    const [quoteData, designData, productData] = await Promise.all(responses.map((response) => response.json()));
    const failed = responses.findIndex((response) => !response.ok);
    if (failed >= 0) throw new Error([quoteData.error, designData.error, productData.error][failed] || "Unable to load admin data.");
    setQuotes(quoteData.quotes);
    setSummary(quoteData.summary);
    setDesigns(designData.designs);
    setProducts(productData.products);
  }, [router]);

  useEffect(() => {
    Promise.resolve()
      .then(loadAdminData)
      .catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Unable to load administrator data."))
      .finally(() => setLoading(false));
  }, [loadAdminData]);

  const updateStatus = async (id: string, status: QuoteStatus) => {
    const response = await fetch(`/api/admin/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setNotice(data.error || "Unable to update quote.");
      return;
    }
    setQuotes((items) => items.map((item) => item._id === id ? { ...item, status } : item));
    setNotice("Quote status updated.");
    await loadAdminData();
  };

  const updatePrice = async (sku: string, price: number) => {
    setSavingSku(sku);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(sku)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePriceINR: price }),
      });
      const data = await response.json() as { product?: Product; error?: string };
      if (!response.ok || !data.product) throw new Error(data.error || "Unable to update product pricing.");
      setProducts((items) => items.map((item) => item.sku === sku ? data.product! : item));
      setNotice(`${sku} price updated. New quotes will use this catalog price.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update product pricing.");
    } finally {
      setSavingSku("");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#F6F3ED] text-sm text-[#6D6F68]">Loading administration…</main>;

  return (
    <main className="min-h-screen bg-[#F6F3ED] text-[#272824]">
      <header className="flex items-center justify-between border-b border-[#272824]/10 px-5 py-5 md:px-10">
        <Link href="/" className="font-serif text-lg tracking-[0.16em]">CABINET STUDIO</Link>
        <div className="flex gap-4 text-xs"><Link href="/dashboard" className="underline underline-offset-4">Customer dashboard</Link><button onClick={logout}>Logout</button></div>
      </header>
      <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 md:py-16">
        <p className="eyebrow">Studio operations</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">Administration.</h1>
        {notice && <p role="status" className="mt-5 border border-[#B38B62]/40 bg-white/70 px-4 py-3 text-sm">{notice}</p>}
        <section className="mt-9 grid gap-4 sm:grid-cols-3">
          {[["All quotations", String(summary.totalQuotes)], ["Revenue pipeline", formatINR(summary.pipelineINR)], ["Approved", formatINR(summary.approvedINR)]].map(([label, value]) => (
            <article key={label} className="border border-[#272824]/10 bg-white p-5"><p className="text-[9px] uppercase tracking-[0.18em] text-[#77796F]">{label}</p><p className="mt-3 font-serif text-3xl">{value}</p></article>
          ))}
        </section>

        <section className="mt-14">
          <div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.2em] text-[#77796F]">Customer requests</p><h2 className="mt-2 font-serif text-3xl">Quotations</h2></div><span className="text-xs text-[#77796F]">{quotes.length} shown</span></div>
          <div className="mt-5 overflow-x-auto border border-[#272824]/10 bg-white">
            <table className="w-full min-w-[900px] border-collapse text-left text-xs">
              <thead className="border-b border-[#272824]/10 bg-[#EFECE4] text-[9px] uppercase tracking-wider"><tr><th className="p-4">Quote</th><th className="p-4">Customer</th><th className="p-4">Kitchen</th><th className="p-4">Estimate</th><th className="p-4">Status</th></tr></thead>
              <tbody>
                {quotes.map((quote) => <tr key={quote._id} className="border-b border-[#272824]/10 align-middle">
                  <td className="p-4"><b>{quote.quoteNumber}</b><span className="mt-1 block text-[10px] text-[#77796F]">{new Date(quote.createdAt).toLocaleDateString("en-IN")}</span></td>
                  <td className="p-4">{quote.customerInfo.name}<span className="mt-1 block text-[10px] text-[#77796F]">{quote.customerInfo.email} · {quote.customerInfo.phone}</span><span className="mt-1 block text-[10px] text-[#77796F]">{quote.customerInfo.city} {quote.customerInfo.pincode}</span></td>
                  <td className="p-4">{quote.designSnapshot.config.layout.toUpperCase()} layout</td>
                  <td className="p-4 font-semibold tabular-nums">{formatINR(quote.grandTotalINR)}</td>
                  <td className="p-4"><select value={quote.status} onChange={(event) => updateStatus(quote._id, event.target.value as QuoteStatus)} className="max-w-48 border border-[#D8D5CD] bg-[#F6F3ED] px-2 py-2 text-[10px]">{statuses.map((status) => <option key={status}>{status}</option>)}</select></td>
                </tr>)}
                {!quotes.length && <tr><td colSpan={5} className="p-8 text-center text-[#77796F]">No quote requests have been submitted.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#77796F]">Customer workspaces</p><h2 className="mt-2 font-serif text-3xl">Saved designs</h2>
          {designs.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {designs.map((design) => <article key={design._id} className="overflow-hidden border border-[#272824]/10 bg-white">
              <div className="relative aspect-[1.55] bg-[#E9E1D5]">{(design.aiRenderImage || design.previewImage) && <Image src={design.aiRenderImage || design.previewImage!} alt={`${design.title} preview`} fill unoptimized className="object-cover" />}</div>
              <div className="p-4"><h3 className="font-serif text-xl">{design.title}</h3><p className="mt-1 text-[10px] text-[#77796F]">{design.userId?.name || "Customer"} · {design.userId?.email}</p><p className="mt-3 text-xs">{design.layout} · {design.color} · {formatINR(design.estimatedTotalINR)}</p></div>
            </article>)}
          </div> : <p className="mt-5 border border-dashed border-[#272824]/20 bg-white/50 p-6 text-sm text-[#6D6F68]">No saved customer designs.</p>}
        </section>

        <section className="mt-14">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#77796F]">Illustrative INR catalog</p><h2 className="mt-2 font-serif text-3xl">Product pricing</h2>
          <div className="mt-5 divide-y divide-[#272824]/10 border-y border-[#272824]/10 bg-white">
            {products.map((product) => <ProductPriceEditor key={`${product.sku}:${product.basePriceINR}`} product={product} saving={savingSku === product.sku} onSave={updatePrice} />)}
            {!products.length && <p className="p-6 text-sm text-[#6D6F68]">No products found. Run the protected seed endpoint after configuring the database.</p>}
          </div>
        </section>
        <p className="mt-10 text-[10px] text-[#77796F]">Catalog and tax estimates are illustrative. Final quote values require design review.</p>
      </div>
    </main>
  );
}

function ProductPriceEditor({ product, saving, onSave }: { product: Product; saving: boolean; onSave: (sku: string, price: number) => Promise<void> }) {
  const [price, setPrice] = useState(product.basePriceINR);
  return <form onSubmit={(event) => { event.preventDefault(); void onSave(product.sku, price); }} className="grid gap-3 p-4 sm:grid-cols-[1fr_150px_auto] sm:items-center">
    <div><p className="text-sm font-medium">{product.name}</p><p className="mt-1 text-[10px] uppercase text-[#77796F]">{product.sku} · {product.category} · {product.widthIn ?? ""} in reference width</p></div>
    <label className="flex items-center border border-[#D8D5CD] px-3"><span className="text-xs">₹</span><input type="number" min={0} step={1} value={price} onChange={(event) => setPrice(Number(event.target.value))} className="w-full bg-transparent px-2 py-2 text-sm tabular-nums outline-none" /></label>
    <button disabled={saving} className="bg-[#272824] px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-white disabled:opacity-60">{saving ? "Saving…" : "Update price"}</button>
  </form>;
}
