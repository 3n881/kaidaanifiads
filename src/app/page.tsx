import Hero from "@/components/Hero";
import ProductRow from "@/components/ProductRow";
import HowToBuy from "@/components/HowToBuy";
import Benefits from "@/components/Benefits";
import Testimonials from "@/components/Testimonials";
import Faq from "@/components/Faq";
import Reveal from "@/components/Reveal";
import { getEbooks, getCombos } from "@/lib/products";

export const revalidate = 300;

export default async function Home() {
  const [bestsellers, combos] = await Promise.all([getEbooks(), getCombos()]);

  return (
    <>
      <Hero />

      <Reveal>
        <ProductRow
          eyebrow="Bestsellers"
          title="सर्वाधिक विक्री होणारी पुस्तके"
          subtitle="तुमच्या कायदेशीर गरजांसाठी खास निवडलेली आणि तज्ञांनी लिहिलेली पुस्तके."
          products={bestsellers}
          viewAllHref="/ebooks"
          viewAllLabel="सर्व पुस्तके पहा"
        />
      </Reveal>

      <div className="bg-brand-50/40">
        <Reveal>
          <ProductRow
            eyebrow="Special Packages"
            title="कायदेशीर कॉम्बो पॅक्स (Combos)"
            subtitle="एकापेक्षा जास्त पुस्तकांचे संच आता आकर्षक सवलतीत उपलब्ध. संपूर्ण माहिती एकाच ठिकाणी."
            products={combos}
            viewAllHref="/combos"
            viewAllLabel="सर्व कॉम्बो पॅक्स पहा"
          />
        </Reveal>
      </div>

      <Reveal>
        <HowToBuy />
      </Reveal>
      <Reveal>
        <Benefits />
      </Reveal>
      <Reveal>
        <Testimonials />
      </Reveal>
      <Reveal>
        <Faq />
      </Reveal>
    </>
  );
}
