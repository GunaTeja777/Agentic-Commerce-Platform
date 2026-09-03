import "./globals.css";

export const metadata = {
  title: "NovaStore — Agentic Commerce E-Store",
  description: "Next.js Storefront & Standalone Model Context Protocol (MCP) Server powered by Razorpay and Prisma",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
