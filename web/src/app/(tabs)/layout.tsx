import BottomNav from "@/components/BottomNav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-950 text-white">
      <div className="mx-auto max-w-md px-4 pb-24 pt-4">{children}</div>
      <BottomNav />
    </div>
  );
}
