import { Button } from "@/components/ui/button";
import { Wine, Headphones, Globe, Play } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="wine-gradient text-white relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-shadow">
              Wine Podcast Directory
            </h1>
            <p className="text-xl md:text-3xl mb-12 opacity-90 max-w-4xl mx-auto">
              Discover premium wine podcasts from around the world. Save favorites, add notes, and explore the finest wine content.
            </p>
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-white text-wine-dark hover:bg-gray-100 font-semibold px-8 py-4 text-lg"
              data-testid="button-login"
            >
              <Play className="mr-2 h-5 w-5" />
              Get Started
            </Button>
          </div>
        </div>
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute -bottom-1 left-0 right-0 h-8 bg-gradient-to-r from-rose-900/20 to-amber-900/20 transform skew-y-1"></div>
      </header>

      {/* Features */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="wine-gradient w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Headphones className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Curated Collection</h3>
              <p className="text-muted-foreground">
                Discover handpicked wine podcasts from renowned sommeliers, critics, and industry experts worldwide.
              </p>
            </div>
            <div className="text-center">
              <div className="wine-gradient w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Wine className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Personal Collection</h3>
              <p className="text-muted-foreground">
                Save your favorite podcasts, add personal notes, and build your own curated wine learning library.
              </p>
            </div>
            <div className="text-center">
              <div className="wine-gradient w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Global Reach</h3>
              <p className="text-muted-foreground">
                Explore wine culture through podcasts from France, Italy, California, Australia, and beyond.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start Your Wine Journey?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our community of wine enthusiasts and discover your next favorite podcast today.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="wine-gradient text-white hover:opacity-90 font-semibold px-8 py-4 text-lg"
            data-testid="button-login-cta"
          >
            <Play className="mr-2 h-5 w-5" />
            Sign In to Begin
          </Button>
        </div>
      </section>
    </div>
  );
}