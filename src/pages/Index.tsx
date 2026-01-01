import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Testimonials from '@/components/Testimonials';
import Pricing from '@/components/Pricing';
import BookingSection from '@/components/BookingSection';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Features />
      <Testimonials />
      <Pricing />
      <BookingSection />
      <FAQ />
      <Footer />
    </main>
  );
};

export default Index;
