import { Link } from 'react-router-dom';
import { ChevronLeft, Plane } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Terms of Service</h1>
          </div>
          <Link to="/" className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-blue-400" />
            <span className="font-bold">GroupTrips</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="card p-8 prose prose-invert">
          <h1>Terms of Service</h1>
          <p className="text-white/60">Last updated: January 2025</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using GroupTrips, you accept and agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            GroupTrips is a platform that helps users organize and coordinate group travel experiences.
            Our service includes trip planning, ticket management, scheduling, and media sharing features.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials.
            You agree to notify us immediately of any unauthorized use of your account.
          </p>

          <h2>4. Pricing and Payment</h2>
          <p>
            Creating a trip costs €24.99 per trip. Payment is processed securely through Stripe.
            Refunds are available within 14 days if no members have joined the trip.
          </p>

          <h2>5. User Content</h2>
          <p>
            You retain ownership of content you upload. By uploading content, you grant us a license
            to store and display it to trip members. You agree not to upload illegal or harmful content.
          </p>

          <h2>6. Privacy</h2>
          <p>
            Your privacy is important to us. Please review our <Link to="/privacy" className="text-blue-400">Privacy Policy</Link> for
            information about how we collect and use your data.
          </p>

          <h2>7. Limitation of Liability</h2>
          <p>
            GroupTrips is not responsible for any travel arrangements made outside our platform.
            We are not liable for any damages arising from your use of our service.
          </p>

          <h2>8. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the service
            after changes constitutes acceptance of the new terms.
          </p>

          <h2>9. Contact</h2>
          <p>
            For questions about these Terms, please contact us at support@grouptrips.app
          </p>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-12 py-6">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-white/40">
          <span>© GroupTrips</span>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-white/60">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-white/60">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
