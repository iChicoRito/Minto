import Link from "next/link";

// ponytail: placeholder root — replace with the real app; template lives at /template
export default function Home() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">App root</h1>
      <Link prefetch={false} href="/template" className="text-muted-foreground underline">
        View template
      </Link>
    </div>
  );
}
