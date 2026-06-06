import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FileSignature, ShieldCheck, ClipboardList, Share2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SignTrust — Secure Digital Document Signatures" },
      { name: "description", content: "Upload PDFs, place signatures, send tokenized links, and track every signature with a full audit trail." },
      { property: "og:title", content: "SignTrust" },
      { property: "og:description", content: "Secure digital document signing with audit trails." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
            <FileSignature className="h-5 w-5 text-accent" />
            SignTrust
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth"><Button>Get started</Button></Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32 text-primary-foreground">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
            <ShieldCheck className="h-3.5 w-3.5" /> Audit-ready signatures
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl md:text-6xl font-semibold tracking-tight">
            Sign documents with the trust of an enterprise vault.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80">
            Upload PDFs, drop signature fields, share tokenized links, and receive
            tamper-evident signed documents — backed by a full audit trail.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/auth"><Button size="lg" variant="secondary">Start signing free</Button></Link>
            <Link to="/dashboard"><Button size="lg" variant="outline" className="bg-transparent text-primary-foreground border-white/30 hover:bg-white/10 hover:text-primary-foreground">Go to dashboard</Button></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-3 gap-8">
        {[
          { icon: FileSignature, title: "Drag-and-drop placement", desc: "Place signature fields anywhere on a PDF page with pixel-perfect coordinates." },
          { icon: Share2, title: "Tokenized signing links", desc: "Send a single-use link. Signers never need an account." },
          { icon: ClipboardList, title: "Immutable audit trail", desc: "Every view, sign, and reject is logged with timestamp and IP." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <Icon className="h-6 w-6 text-accent" />
            <h3 className="mt-4 font-semibold text-card-foreground">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} SignTrust. Built on Lovable.
      </footer>
    </div>
  );
}
