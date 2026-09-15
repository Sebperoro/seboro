import TopNav from "@/components/TopNav";
import DiscoverCatalog from "@/components/DiscoverCatalog";

export default function DescubrePage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#2b2521]">
      <TopNav />

      <div className="mx-auto max-w-[1550px] px-5 pb-20 pt-7 md:px-8">
        <DiscoverCatalog />
      </div>
    </main>
  );
}
