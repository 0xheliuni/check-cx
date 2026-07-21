import Link from "next/link";
import {ChevronLeft} from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="nier-shadow mb-8 flex h-20 w-20 items-center justify-center border border-foreground/40 bg-card">
        <span className="text-3xl font-extrabold text-muted-foreground">■</span>
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
        System Message
      </p>
      <h1 className="nier-text-shadow mb-4 text-3xl font-extrabold uppercase tracking-[0.15em] text-foreground md:text-5xl">
        Error 404
      </h1>
      <div className="nier-rule mb-6 w-64 max-w-full" />

      <p className="mb-8 max-w-md uppercase tracking-widest text-muted-foreground">
        Target data not found.
        <br />
        该页面不存在或已被移除。
      </p>

      <Link
        href="/"
        className="nier-shadow inline-flex items-center gap-2 bg-foreground px-6 py-2.5 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-foreground/80"
      >
        <ChevronLeft className="h-4 w-4" />
        Return to Dashboard
      </Link>
    </div>
  );
}
