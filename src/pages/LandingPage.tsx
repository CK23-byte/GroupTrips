import { Link } from 'react-router-dom';
import { Plane, Users, Map, Camera, Clock, Shield, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-fuchsia-600/20" />
        <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Plane className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold">GroupTrips</span>
          </div>
          <div className="flex gap-4">
            <Link to="/login" className="btn-secondary">
              Log In
            </Link>
            <Link to="/register" className="btn-primary">
              Sign Up
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
          {/* Trend meme reference - big and eye-catching */}
          <div className="mb-8 inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-fuchsia-500/30 to-blue-500/30 rounded-2xl border border-white/20 backdrop-blur-sm animate-pulse">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-yellow-200 via-pink-200 to-blue-200 bg-clip-text text-transparent" style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
              When the trip actually makes it out the groupchat
            </span>
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-blue-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent leading-tight">
            Your Entire Trip
            <br />
            In One Place
          </h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-8 leading-relaxed">
            Tickets, live schedule, group chat, shared memories, aftermovie & live locations.
            <span className="block mt-2 text-white/60">Everything your group needs for the perfect trip.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-lg px-8 py-4">
              Start Planning
            </Link>
            <Link to="/join" className="btn-secondary text-lg px-8 py-4">
              Join with Code
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-sm">
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 rounded-xl">
              <span className="text-blue-400">✈️</span>
              <span className="text-white/70">Tickets</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 rounded-xl">
              <span className="text-green-400">📍</span>
              <span className="text-white/70">Live Locations</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 rounded-xl">
              <span className="text-fuchsia-400">📸</span>
              <span className="text-white/70">Shared Photos</span>
            </div>
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 rounded-xl">
              <span className="text-yellow-400">🎬</span>
              <span className="text-white/70">Aftermovie</span>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Everything you need for the perfect group trip
          </h2>
          <p className="text-center text-white/60 mb-16 max-w-2xl mx-auto">
            No more scattered messages, lost tickets, or missed meetups. One app for your entire adventure.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Plane className="w-8 h-8" />}
              title="Smart Ticket Management"
              description="Upload tickets and our AI extracts flight details, dates, and seat info automatically."
            />
            <FeatureCard
              icon={<Clock className="w-8 h-8" />}
              title="Live Schedule"
              description="Full trip itinerary with activities, times, locations, and reservation codes."
            />
            <FeatureCard
              icon={<Map className="w-8 h-8" />}
              title="Live Locations"
              description="See where everyone is on an interactive map. Like WhatsApp location sharing, but better."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Group Chat & Updates"
              description="Real-time messaging, announcements, and reminders to your entire group."
            />
            <FeatureCard
              icon={<Camera className="w-8 h-8" />}
              title="Shared Memories"
              description="Upload photos and videos. Create an auto-generated aftermovie after the trip."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Surprise Mode (Optional)"
              description="Keep destination secret until the reveal! QR codes appear 3h before departure."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">How it works</h2>

          <div className="grid md:grid-cols-4 gap-8">
            <StepCard
              number={1}
              title="Create a Trip"
              description="Admin creates a group and receives a unique lobby code."
            />
            <StepCard
              number={2}
              title="Invite Your Crew"
              description="Share the lobby code with your group. They sign up with their email."
            />
            <StepCard
              number={3}
              title="Upload Tickets & Activities"
              description="Add flight tickets, plan activities, and build your full schedule."
            />
            <StepCard
              number={4}
              title="Reveal & Go"
              description="3 hours before: QR codes. 1 hour: full tickets. Time to travel!"
            />
          </div>
        </div>
      </section>

      {/* After Movie Feature */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">After the Trip</h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
            Automatically generate an aftermovie from all uploaded photos and videos.
            Choose your own music and share with the group.
          </p>
          <div className="card p-8 max-w-lg mx-auto">
            <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center mb-4">
              <Camera className="w-16 h-16 text-white/30" />
            </div>
            <p className="text-sm text-white/50">
              Aftermovie is automatically generated after the trip
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-white/70 mb-12">
            One price per trip, unlimited members
          </p>
          <div className="card p-8 max-w-md mx-auto">
            <div className="text-5xl font-bold mb-2">€24.99</div>
            <p className="text-white/50 mb-6">per trip</p>
            <ul className="text-left space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Unlimited group members</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>AI-powered ticket scanning</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Automatic aftermovie generation</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Live location sharing</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Unlimited photos & videos</span>
              </li>
            </ul>
            <Link to="/register" className="btn-primary w-full text-center block">
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center card p-12">
          <h2 className="text-3xl font-bold mb-4">
            Ready for an unforgettable trip?
          </h2>
          <p className="text-white/70 mb-8">
            Stop planning in the group chat. Start making memories.
          </p>
          <Link to="/register" className="btn-accent text-lg px-8">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-blue-400" />
            <span className="font-semibold">GroupTrips</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/50">
            <Link to="/terms" className="hover:text-white/70">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-white/70">Privacy Policy</Link>
          </div>
          <p className="text-sm text-white/50">
            © GroupTrips. All rights reserved.
          </p>
          <p className="text-xs text-white/30">
            v1.4.0
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
    <div className="card card-hover p-6">
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-fuchsia-500/20 flex items-center justify-center text-blue-400 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-white/60">{description}</p>
    </div>
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
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-white/60 text-sm">{description}</p>
    </div>
  );
}
