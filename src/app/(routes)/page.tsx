import { HeroSection } from "./_components/HeroSection";
import { AboutSection } from "./_components/AboutSection";
import { ChannelsSection } from "./_components/ChannelsSection";
import { TimelineSection } from "./_components/TimelineSection";
import { EventsSection } from "./_components/EventsSection";
import { MerchSection } from "./_components/MerchSection";
import { ProcessSection } from "./_components/ProcessSection";
import { ContactSection } from "./_components/ContactSection";

export default function HomePage() {
 return (
<main id="main-content" tabIndex={-1} className="reply-site">
<HeroSection />
<AboutSection />
<ChannelsSection />
<TimelineSection />
<EventsSection />
<MerchSection />
<ProcessSection />
<ContactSection />
</main>
 );
}
