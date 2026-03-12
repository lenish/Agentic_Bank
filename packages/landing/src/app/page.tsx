import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Stack } from "@/components/sections/Stack";
import { DualRail } from "@/components/sections/DualRail";
import { Partnership } from "@/components/sections/Partnership";
import { Pipeline } from "@/components/sections/Pipeline";
import { ApiQuickstart } from "@/components/sections/ApiQuickstart";
import { Regulatory } from "@/components/sections/Regulatory";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      <Hero />
      <Problem />
      <Stack />
      <DualRail />
      <Partnership />
      <Pipeline />
      <ApiQuickstart />
      <Regulatory />
      <Footer />
    </main>
  );
}
