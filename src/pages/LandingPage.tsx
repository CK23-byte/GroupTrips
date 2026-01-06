import { Link } from 'react-router-dom';
import { Plane, Users, Map, Camera, Clock, Shield } from 'lucide-react';

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
              Inloggen
            </Link>
            <Link to="/register" className="btn-primary">
              Account aanmaken
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
            Verrassingsreizen
            <br />
            Samen Beleven
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
            Organiseer groepsreizen met een twist. Houd de bestemming geheim tot het
            laatste moment en deel de ervaring met je groep.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-lg px-8">
              Start een Trip
            </Link>
            <Link to="/join" className="btn-secondary text-lg px-8">
              Join met Code
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">
            Alles wat je nodig hebt voor de perfecte groepsreis
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Clock className="w-8 h-8" />}
              title="Getimede Onthulling"
              description="QR-codes 3 uur van tevoren, volledige tickets 1 uur voor vertrek. Maximale spanning!"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Groepscommunicatie"
              description="Real-time updates, herinneringen en berichten naar je hele groep."
            />
            <FeatureCard
              icon={<Map className="w-8 h-8" />}
              title="Live Locaties"
              description="Zie waar iedereen is op een interactieve kaart. Niemand raakt verloren."
            />
            <FeatureCard
              icon={<Camera className="w-8 h-8" />}
              title="Gedeelde Media"
              description="Upload foto's en video's. Iedereen draagt bij aan de herinneringen."
            />
            <FeatureCard
              icon={<Plane className="w-8 h-8" />}
              title="Ticket Management"
              description="Upload vlucht- en treintickets. Automatische QR-code extractie."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Documenten Veilig"
              description="Bewaar paspoorten, verzekeringen en andere documenten centraal."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Hoe werkt het?</h2>

          <div className="grid md:grid-cols-4 gap-8">
            <StepCard
              number={1}
              title="Maak een Trip"
              description="Admin maakt een groep aan en krijgt een unieke lobby code."
            />
            <StepCard
              number={2}
              title="Nodig Uit"
              description="Deel de lobby code met je groep. Zij loggen in met hun email."
            />
            <StepCard
              number={3}
              title="Upload Tickets"
              description="Admin uploadt de vlieg- of treintickets. Bestemming blijft geheim!"
            />
            <StepCard
              number={4}
              title="Onthul & Geniet"
              description="3 uur voor vertrek: QR-codes. 1 uur: volledige tickets. En vertrekken!"
            />
          </div>
        </div>
      </section>

      {/* After Movie Feature */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Na de Reis</h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
            Genereer automatisch een aftermovie van alle geüploade foto's en video's.
            Kies je eigen muziek en deel met de groep.
          </p>
          <div className="card p-8 max-w-lg mx-auto">
            <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center mb-4">
              <Camera className="w-16 h-16 text-white/30" />
            </div>
            <p className="text-sm text-white/50">
              Aftermovie wordt automatisch gegenereerd na de reis
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center card p-12">
          <h2 className="text-3xl font-bold mb-4">
            Klaar voor een onvergetelijke reis?
          </h2>
          <p className="text-white/70 mb-8">
            Start vandaag nog met het plannen van jullie verrassingsreis.
          </p>
          <Link to="/register" className="btn-accent text-lg px-8">
            Maak gratis account
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
          <p className="text-sm text-white/50">
            © 2024 GroupTrips. Alle rechten voorbehouden.
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
