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
          title={{ mr: "सर्वाधिक विक्री होणारी पुस्तके", hi: "सबसे अधिक बिकने वाली किताबें", en: "Bestselling books" }}
          subtitle={{ mr: "तुमच्या कायदेशीर गरजांसाठी खास निवडलेली आणि तज्ञांनी लिहिलेली पुस्तके.", hi: "आपकी कानूनी जरूरतों के लिए विशेषज्ञों द्वारा तैयार किताबें।", en: "Expert-created books selected for your legal information needs." }}
          products={bestsellers}
          viewAllHref="/ebooks"
          viewAllLabel={{ mr: "सर्व पुस्तके पहा", hi: "सभी किताबें देखें", en: "View all books" }}
        />
      </Reveal>

      <div className="bg-brand-50/40">
        <Reveal>
          <ProductRow
            eyebrow="Special Packages"
            title={{ mr: "कायदेशीर कॉम्बो पॅक्स", hi: "कानूनी कॉम्बो पैक्स", en: "Legal combo packs" }}
            subtitle={{ mr: "एकापेक्षा जास्त पुस्तकांचे संच आता आकर्षक सवलतीत उपलब्ध.", hi: "एक से अधिक किताबों के सेट आकर्षक छूट पर उपलब्ध हैं।", en: "Multi-book sets with useful savings, all in one place." }}
            products={combos}
            viewAllHref="/combos"
            viewAllLabel={{ mr: "सर्व कॉम्बो पॅक्स पहा", hi: "सभी कॉम्बो देखें", en: "View all combos" }}
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
