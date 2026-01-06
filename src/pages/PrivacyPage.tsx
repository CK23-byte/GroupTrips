import { Link } from 'react-router-dom';
import { ChevronLeft, Plane } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Privacy Policy</h1>
          </div>
          <Link to="/" className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-blue-400" />
            <span className="font-bold">GroupTrips</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="card p-8 prose prose-invert">
          <h1>Privacy Policy</h1>
          <p className="text-white/60">Last updated: January 2025</p>

          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, including:
          </p>
          <ul>
            <li>Account information (name, email address)</li>
            <li>Trip details and travel documents you upload</li>
            <li>Photos and videos shared within trips</li>
            <li>Location data (when you enable location sharing)</li>
            <li>Communications within the app</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send notifications about your trips</li>
            <li>Facilitate trip coordination among group members</li>
            <li>Respond to your comments and questions</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>
            We share your information only in the following circumstances:
          </p>
          <ul>
            <li>With other members of your trip groups</li>
            <li>With service providers who assist our operations</li>
            <li>When required by law or to protect rights</li>
            <li>With your consent</li>
          </ul>

          <h2>4. Data Storage and Security</h2>
          <p>
            Your data is stored securely using Supabase infrastructure. We implement appropriate
            technical and organizational measures to protect your personal information against
            unauthorized access, alteration, disclosure, or destruction.
          </p>

          <h2>5. Your Rights</h2>
          <p>
            You have the right to:
          </p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data</li>
            <li>Withdraw consent at any time</li>
          </ul>

          <h2>6. Location Data</h2>
          <p>
            When you enable live location sharing, we collect and share your location with
            trip members. You can disable this feature at any time in the trip settings.
            Location data is only stored while actively sharing and is deleted when sharing is stopped.
          </p>

          <h2>7. Cookies and Tracking</h2>
          <p>
            We use essential cookies to maintain your session and preferences. We do not
            use tracking cookies for advertising purposes.
          </p>

          <h2>8. Third-Party Services</h2>
          <p>
            We use the following third-party services:
          </p>
          <ul>
            <li>Supabase for authentication and data storage</li>
            <li>Stripe for payment processing</li>
            <li>OpenAI for ticket extraction and suggestions</li>
          </ul>

          <h2>9. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active. Trip data
            is retained for 2 years after the trip ends. You can request earlier deletion
            by contacting us.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any
            changes by posting the new policy on this page and updating the "Last updated" date.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at
            privacy@grouptrips.app
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
