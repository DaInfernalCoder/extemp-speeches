import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Extemp Speeches',
  description: 'Privacy policy for the Extemp Speeches leaderboard application',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#FFF8F0] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-block mb-6 brutal-button px-6 py-3 text-base bg-white"
            style={{ color: '#1a1a1a' }}
          >
            ← Back to Leaderboard
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
            Privacy Policy
          </h1>
          <p className="text-base sm:text-lg" style={{ color: '#666' }}>
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div className="brutal-card p-6 sm:p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              1. Introduction
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              Welcome to Extemp Speeches (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our extemporaneous speeches leaderboard application (the &quot;Service&quot;).
            </p>
            <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#1a1a1a' }}>
              By using our Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              2. Information We Collect
            </h2>
            
            <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6" style={{ color: '#1a1a1a' }}>
              2.1 Account Information
            </h3>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              When you sign in with Google OAuth, we collect:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Your name and email address</li>
              <li className="text-base sm:text-lg">Your Google profile picture (avatar)</li>
              <li className="text-base sm:text-lg">Google account ID for authentication</li>
            </ul>

            <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6" style={{ color: '#1a1a1a' }}>
              2.2 Speech Submissions
            </h3>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              When you submit speeches, we collect:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Video or audio recordings of your speeches</li>
              <li className="text-base sm:text-lg">Speech submission timestamps</li>
              <li className="text-base sm:text-lg">Video URLs (if uploaded to Cloudflare Stream or YouTube)</li>
              <li className="text-base sm:text-lg">Audio file URLs (if uploaded to Supabase Storage)</li>
            </ul>

            <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6" style={{ color: '#1a1a1a' }}>
              2.3 Feedback and Reviews
            </h3>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              When you review speeches (submit ballots), we collect:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Rating scores (gestures, delivery, pauses, content, entertaining)</li>
              <li className="text-base sm:text-lg">Focus area ratings and feedback</li>
              <li className="text-base sm:text-lg">Written feedback text</li>
              <li className="text-base sm:text-lg">Comparison flags (&quot;better than last&quot; indicators)</li>
              <li className="text-base sm:text-lg">Review timestamps</li>
            </ul>

            <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6" style={{ color: '#1a1a1a' }}>
              2.4 User Preferences
            </h3>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We store your preferences including:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Email reminder preferences</li>
              <li className="text-base sm:text-lg">Focus area for improvement</li>
              <li className="text-base sm:text-lg">Last reminder sent timestamp</li>
            </ul>

            <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6" style={{ color: '#1a1a1a' }}>
              2.5 Feature Requests
            </h3>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              If you submit feature requests, we collect:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Feature request title and description</li>
              <li className="text-base sm:text-lg">Submission timestamp</li>
              <li className="text-base sm:text-lg">Your name and email (associated with your account)</li>
            </ul>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              3. How We Use Your Information
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Provide and maintain the leaderboard service</li>
              <li className="text-base sm:text-lg">Display your speech submissions and rankings</li>
              <li className="text-base sm:text-lg">Enable peer review and feedback functionality</li>
              <li className="text-base sm:text-lg">Send email reminders (if you opt in)</li>
              <li className="text-base sm:text-lg">Notify you when you receive feedback on your speeches</li>
              <li className="text-base sm:text-lg">Track your progress and focus areas</li>
              <li className="text-base sm:text-lg">Process and respond to feature requests</li>
              <li className="text-base sm:text-lg">Improve and optimize the Service</li>
              <li className="text-base sm:text-lg">Ensure security and prevent fraud</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              4. Third-Party Services
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              Our Service uses the following third-party services that may collect, store, or process your information:
            </p>

            <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6" style={{ color: '#1a1a1a' }}>
              4.1 Supabase
            </h3>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We use Supabase for:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">User authentication and account management</li>
              <li className="text-base sm:text-lg">Database storage for user profiles, speeches, and ballots</li>
              <li className="text-base sm:text-lg">File storage for audio recordings</li>
              <li className="text-base sm:text-lg">Real-time data synchronization</li>
            </ul>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              Supabase&apos;s privacy policy: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#0066FF] font-bold underline hover:no-underline">https://supabase.com/privacy</a>
            </p>

            <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6" style={{ color: '#1a1a1a' }}>
              4.2 Google OAuth
            </h3>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We use Google OAuth for authentication and may request access to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Your Google account information (name, email, profile picture)</li>
              <li className="text-base sm:text-lg">YouTube upload permissions (if you choose to upload videos to YouTube)</li>
            </ul>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              Google&apos;s privacy policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#0066FF] font-bold underline hover:no-underline">https://policies.google.com/privacy</a>
            </p>

            <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6" style={{ color: '#1a1a1a' }}>
              4.3 Cloudflare Stream
            </h3>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              If you upload videos to Cloudflare Stream, your video files are stored and processed by Cloudflare. Videos uploaded to Cloudflare Stream are processed and encoded by their service.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              Cloudflare&apos;s privacy policy: <a href="https://www.cloudflare.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-[#0066FF] font-bold underline hover:no-underline">https://www.cloudflare.com/privacy/</a>
            </p>

            <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6" style={{ color: '#1a1a1a' }}>
              4.4 YouTube
            </h3>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              If you upload videos to YouTube, your videos are stored and managed by YouTube. Videos uploaded through our Service are set to &quot;unlisted&quot; privacy status by default.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              YouTube&apos;s privacy policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#0066FF] font-bold underline hover:no-underline">https://policies.google.com/privacy</a>
            </p>

            <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6" style={{ color: '#1a1a1a' }}>
              4.5 Resend
            </h3>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We use Resend to send transactional emails, including:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Daily reminder emails (if enabled)</li>
              <li className="text-base sm:text-lg">Notifications when you receive feedback</li>
              <li className="text-base sm:text-lg">Administrative alerts</li>
            </ul>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              Resend&apos;s privacy policy: <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#0066FF] font-bold underline hover:no-underline">https://resend.com/legal/privacy-policy</a>
            </p>

            <h3 className="text-xl sm:text-2xl font-bold mb-3 mt-6" style={{ color: '#1a1a1a' }}>
              4.6 Vercel
            </h3>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              Our Service is hosted on Vercel, which may collect analytics and usage data.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              Vercel&apos;s privacy policy: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#0066FF] font-bold underline hover:no-underline">https://vercel.com/legal/privacy-policy</a>
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              5. Data Security
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We implement appropriate technical and organizational measures to protect your information:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Row Level Security (RLS) policies on all database tables</li>
              <li className="text-base sm:text-lg">Authentication required for all data access</li>
              <li className="text-base sm:text-lg">Secure file storage with access controls</li>
              <li className="text-base sm:text-lg">Encrypted data transmission (HTTPS)</li>
              <li className="text-base sm:text-lg">Regular security updates and monitoring</li>
            </ul>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              6. Your Rights and Choices
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg"><strong>Access:</strong> You can view your profile information, speeches, and feedback through the Service</li>
              <li className="text-base sm:text-lg"><strong>Update:</strong> You can update your email preferences and focus area through the Service</li>
              <li className="text-base sm:text-lg"><strong>Delete:</strong> You can request deletion of your account and associated data by contacting us</li>
              <li className="text-base sm:text-lg"><strong>Email Preferences:</strong> You can opt out of email reminders at any time through your account settings</li>
              <li className="text-base sm:text-lg"><strong>Data Portability:</strong> You can request a copy of your data in a portable format</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              7. Data Retention
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We retain your information for as long as necessary to provide the Service and fulfill the purposes described in this Privacy Policy. If you request account deletion, we will delete your personal information within a reasonable timeframe, except where we are required to retain it for legal or legitimate business purposes.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              Note: Videos uploaded to Cloudflare Stream or YouTube are subject to those services&apos; retention policies. Audio files stored in Supabase Storage will be deleted when your account is deleted.
            </p>
          </section>

          {/* Children&apos;s Privacy */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              8. Children&apos;s Privacy
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              Our Service is intended for educational use. If you are under 13 years of age, please obtain parental consent before using our Service. We do not knowingly collect personal information from children under 13 without parental consent. If we become aware that we have collected information from a child under 13 without parental consent, we will take steps to delete that information.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              9. Changes to This Privacy Policy
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              10. Contact Us
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us at:
            </p>
            <div className="brutal-card p-4 mt-4" style={{ backgroundColor: '#f9f9f9' }}>
              <p className="text-base sm:text-lg font-bold mb-2" style={{ color: '#1a1a1a' }}>
                Email: <a href="mailto:yourextempcoaches@extemp.scaleprospectr.com" className="text-[#0066FF] underline hover:no-underline">yourextempcoaches@extemp.scaleprospectr.com</a>
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block brutal-button px-6 py-3 text-base bg-white"
            style={{ color: '#1a1a1a' }}
          >
            ← Back to Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}



