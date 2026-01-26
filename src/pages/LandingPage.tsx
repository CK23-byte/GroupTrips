import { Link } from 'react-router-dom';
import { Plane, Users, Map, Camera, Clock, Shield, Sparkles, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header className="relative overflow-hidden" role="banner">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-fuchsia-600/20" aria-hidden="true" />
        <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto" aria-label="Main navigation">
          <Link to="/" className="flex items-center gap-2" aria-label="GroupTrips - Home">
            <Plane className="w-8 h-8 text-blue-400" aria-hidden="true" />
            <span className="text-2xl font-bold">GroupTrips</span>
          </Link>
          <div className="flex gap-4 items-center">
            {loading ? (
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-label="Loading" />
            ) : user ? (
              <>
                <Link to="/dashboard" className="btn-secondary">
                  My Trips
                </Link>
                <Link
                  to="/profile"
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center hover:scale-105 transition-transform"
                  aria-label="View profile"
                >
                  {user.profile_photo ? (
                    <img
                      src={user.profile_photo}
                      alt="Your profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : user.avatar_url ? (
                    <span className="text-lg">{user.avatar_url}</span>
                  ) : (
                    <User className="w-5 h-5" aria-hidden="true" />
                  )}
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">
                  Log In
                </Link>
                <Link to="/register" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
          {/* Trend meme reference - big and eye-catching */}
          <div className="mb-8 inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-fuchsia-500/30 to-blue-500/30 rounded-2xl border border-white/20 backdrop-blur-sm animate-pulse" aria-hidden="true">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-yellow-200 via-pink-200 to-blue-200 bg-clip-text text-transparent" style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
              When the trip actually makes it out the groupchat
            </span>
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-blue-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent leading-tight">
            Plan Group Travel
            <br />
            All In One Place
          </h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-8 leading-relaxed">
            The complete group travel app: tickets, live itinerary, group chat, shared photos, aftermovie & real-time location tracking.
            <span className="block mt-2 text-white/60">Perfect for friends, families, and teams traveling together.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-lg px-8 py-4">
              Start Planning Free
            </Link>
            <Link to="/join" className="btn-secondary text-lg px-8 py-4">
              Join Existing Trip
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-sm" role="list" aria-label="Key features">
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 rounded-xl" role="listitem">
              <span className="text-blue-400" aria-hidden="true">✈️</span>
              <span className="text-white/70">AI Ticket Scanning</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 rounded-xl" role="listitem">
              <span className="text-green-400" aria-hidden="true">📍</span>
              <span className="text-white/70">Live Location Map</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 rounded-xl" role="listitem">
              <span className="text-fuchsia-400" aria-hidden="true">📸</span>
              <span className="text-white/70">Shared Photo Album</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 rounded-xl" role="listitem">
              <span className="text-yellow-400" aria-hidden="true">🎬</span>
              <span className="text-white/70">Auto Aftermovie</span>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Features Section */}
        <section className="py-24 px-6" aria-labelledby="features-heading">
          <div className="max-w-7xl mx-auto">
            <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-center mb-4">
              Everything You Need for Group Travel Planning
            </h2>
            <p className="text-center text-white/60 mb-16 max-w-2xl mx-auto">
              No more scattered WhatsApp messages, lost tickets, or missed meetups. One app to organize your entire group adventure.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Plane className="w-8 h-8" />}
                title="AI-Powered Ticket Management"
                description="Upload flight, train, or event tickets and our AI automatically extracts dates, seat numbers, and booking details."
              />
              <FeatureCard
                icon={<Clock className="w-8 h-8" />}
                title="Shared Trip Itinerary"
                description="Create a full schedule with activities, times, locations, and reservation codes visible to your entire group."
              />
              <FeatureCard
                icon={<Map className="w-8 h-8" />}
                title="Real-Time Location Sharing"
                description="See where everyone is on an interactive map. Never lose track of your group at festivals, airports, or cities."
              />
              <FeatureCard
                icon={<Users className="w-8 h-8" />}
                title="Group Chat & Announcements"
                description="Built-in messaging with pinned announcements and reminders. Keep everyone informed without the chaos."
              />
              <FeatureCard
                icon={<Camera className="w-8 h-8" />}
                title="Shared Photo & Video Album"
                description="Everyone uploads their best moments. Create an automatic aftermovie with your chosen music."
              />
              <FeatureCard
                icon={<Shield className="w-8 h-8" />}
                title="Surprise Trip Mode"
                description="Planning a surprise? Keep the destination secret until reveal time. QR codes appear 3 hours before departure."
              />
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-24 px-6 bg-white/5" aria-labelledby="how-it-works-heading">
          <div className="max-w-7xl mx-auto">
            <h2 id="how-it-works-heading" className="text-3xl font-bold text-center mb-16">How GroupTrips Works</h2>

            <div className="grid md:grid-cols-4 gap-8">
              <StepCard
                number={1}
                title="Create Your Trip"
                description="Set up a trip as admin and get a unique lobby code to share with your group."
              />
              <StepCard
                number={2}
                title="Invite Your Group"
                description="Share the lobby code. Friends join with their email - no app download required."
              />
              <StepCard
                number={3}
                title="Add Tickets & Plans"
                description="Upload tickets (AI reads them automatically), add activities, and build your itinerary."
              />
              <StepCard
                number={4}
                title="Travel Together"
                description="Live location tracking, group chat, and shared memories. Everything in one place."
              />
            </div>
          </div>
        </section>

        {/* After Movie Feature */}
        <section className="py-24 px-6" aria-labelledby="aftermovie-heading">
          <div className="max-w-7xl mx-auto text-center">
            <h2 id="aftermovie-heading" className="text-3xl font-bold mb-6">Automatic Aftermovie Creation</h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
              After your trip, we automatically create a highlight video from all uploaded photos and videos.
              Choose your own music and share the memories with your group.
            </p>
            <div className="card p-8 max-w-lg mx-auto">
              <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center mb-4" aria-hidden="true">
                <Camera className="w-16 h-16 text-white/30" />
              </div>
              <p className="text-sm text-white/50">
                AI-generated aftermovie from your group's photos
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 px-6 bg-white/5" aria-labelledby="pricing-heading">
          <div className="max-w-4xl mx-auto text-center">
            <h2 id="pricing-heading" className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-white/70 mb-12">
              One payment per trip. Unlimited group members. No subscriptions.
            </p>
            <article className="card p-8 max-w-md mx-auto">
              <div className="text-5xl font-bold mb-2">€24.99</div>
              <p className="text-white/50 mb-6">per trip (one-time)</p>
              <ul className="text-left space-y-3 mb-8" aria-label="What's included">
                <li className="flex items-center gap-2">
                  <span className="text-green-400" aria-hidden="true">✓</span>
                  <span>Unlimited group members</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400" aria-hidden="true">✓</span>
                  <span>AI-powered ticket scanning</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400" aria-hidden="true">✓</span>
                  <span>Automatic aftermovie generation</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400" aria-hidden="true">✓</span>
                  <span>Real-time location sharing</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400" aria-hidden="true">✓</span>
                  <span>Unlimited photos & videos</span>
                </li>
              </ul>
              <Link to="/register" className="btn-primary w-full text-center block">
                Get Started - Create Free Account
              </Link>
            </article>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6" aria-labelledby="cta-heading">
          <div className="max-w-4xl mx-auto text-center card p-12">
            <h2 id="cta-heading" className="text-3xl font-bold mb-4">
              Ready to Plan Your Next Group Trip?
            </h2>
            <p className="text-white/70 mb-8">
              Stop planning in scattered group chats. Start making organized memories together.
            </p>
            <Link to="/register" className="btn-accent text-lg px-8">
              Create Your Free Account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10" role="contentinfo">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2" aria-label="GroupTrips home">
            <Plane className="w-6 h-6 text-blue-400" aria-hidden="true" />
            <span className="font-semibold">GroupTrips</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-white/50" aria-label="Footer navigation">
            <Link to="/terms" className="hover:text-white/70">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-white/70">Privacy Policy</Link>
          </nav>
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} GroupTrips. All rights reserved.
          </p>
          <p className="text-xs text-white/30">
            v1.9.0
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="card card-hover p-6">
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-fuchsia-500/20 flex items-center justify-center text-blue-400 mb-4" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-white/60">{description}</p>
    </article>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <article className="text-center">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center text-xl font-bold mx-auto mb-4" aria-hidden="true">
        {number}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-white/60 text-sm">{description}</p>
    </article>
  );
}
