import { NextResponse } from "next/server";

export async function GET() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const cloudflareConfigured = Boolean(
    accountId
    && /^[a-f0-9]{32}$/i.test(accountId)
    && apiToken
    && apiToken !== "your_api_token_here",
  );
  const imageProvider = cloudflareConfigured
    ? "Cloudflare Workers AI"
    : "Curated preview fallback";
  return NextResponse.json({
    imageRenderConfigured: cloudflareConfigured,
    imageProvider,
    aiAdvisorConfigured: Boolean(process.env.GROQ_API_KEY),
    promptFallbackAvailable: true,
  });
}
