import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto space-y-6">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10">
          <FileQuestion className="h-7 w-7 text-primary" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-[56px] font-bold tracking-tight leading-none text-foreground">
            404
          </h1>
          <h2 className="text-[20px] font-semibold text-foreground">
            Page not found
          </h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        {/* Action */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-primary-foreground bg-primary hover:bg-primary/95 shadow-[0_6px_20px_rgba(0,102,214,0.26)] hover:shadow-[0_10px_26px_rgba(0,102,214,0.32)] hover:-translate-y-0.5 transition-[transform,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          Go home
        </Link>
      </div>
    </div>
  );
}
