import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FileSignature, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function AppHeader({ email }: { email?: string | null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="border-b border-border bg-background sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
          <FileSignature className="h-5 w-5 text-accent" /> SignTrust
        </Link>
        <div className="flex items-center gap-3">
          {email && <span className="hidden sm:inline text-sm text-muted-foreground">{email}</span>}
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}