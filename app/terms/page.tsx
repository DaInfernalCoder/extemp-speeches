import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Extemp Speeches',
  description: 'Terms of service for the Extemp Speeches leaderboard application',
};

export default function TermsOfService() {
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
            Terms of Service
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
              1. Acceptance of Terms
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              By accessing and using the Extemp Speeches leaderboard application (&quot;Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this Service.
            </p>
            <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#1a1a1a' }}>
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of our Service. We reserve the right to update, change, or replace any part of these Terms at any time. It is your responsibility to check this page periodically for changes.
            </p>
          </section>

          {/* Use of Service */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              2. Use of Service
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              The Service is provided for educational purposes to facilitate extemporaneous speech practice and peer feedback. You agree to use the Service only for lawful purposes and in accordance with these Terms.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              You agree not to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Use the Service in any way that violates any applicable federal, state, local, or international law or regulation</li>
              <li className="text-base sm:text-lg">Transmit any material that is defamatory, obscene, offensive, or otherwise objectionable</li>
              <li className="text-base sm:text-lg">Impersonate or attempt to impersonate another user, person, or entity</li>
              <li className="text-base sm:text-lg">Interfere with or disrupt the Service or servers connected to the Service</li>
              <li className="text-base sm:text-lg">Attempt to gain unauthorized access to any portion of the Service or any other systems or networks</li>
              <li className="text-base sm:text-lg">Use any robot, spider, or other automatic device to access the Service for any purpose</li>
              <li className="text-base sm:text-lg">Submit false, misleading, or fraudulent information</li>
            </ul>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              3. User Accounts
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              To access certain features of the Service, you must register for an account using Google OAuth. You are responsible for:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Maintaining the confidentiality of your account credentials</li>
              <li className="text-base sm:text-lg">All activities that occur under your account</li>
              <li className="text-base sm:text-lg">Notifying us immediately of any unauthorized use of your account</li>
              <li className="text-base sm:text-lg">Ensuring that all information you provide is accurate and up-to-date</li>
            </ul>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason we deem necessary to protect the integrity of the Service.
            </p>
          </section>

          {/* Speech Submissions */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              4. Speech Submissions
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              When you submit speeches to the Service:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">You represent and warrant that you own or have the necessary rights to submit the content</li>
              <li className="text-base sm:text-lg">You grant us a non-exclusive, worldwide, royalty-free license to store, display, and distribute your speech recordings through the Service</li>
              <li className="text-base sm:text-lg">You understand that your speeches will be visible to other users of the Service for review and feedback purposes</li>
              <li className="text-base sm:text-lg">You are responsible for ensuring your speech content complies with all applicable laws and does not infringe on any third-party rights</li>
              <li className="text-base sm:text-lg">You agree not to submit content that contains copyrighted material without proper authorization</li>
            </ul>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We reserve the right to remove any speech submission that violates these Terms or that we determine is inappropriate, harmful, or violates any applicable law.
            </p>
          </section>

          {/* Feedback and Reviews */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              5. Feedback and Reviews
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              When providing feedback or reviews (ballots) on speeches:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">You agree to provide constructive, respectful, and honest feedback</li>
              <li className="text-base sm:text-lg">You will not submit false, misleading, or malicious reviews</li>
              <li className="text-base sm:text-lg">You will not review your own speeches</li>
              <li className="text-base sm:text-lg">You understand that your reviews will be visible to the speech submitter and other users</li>
              <li className="text-base sm:text-lg">You grant us the right to display your reviews as part of the Service</li>
            </ul>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We reserve the right to remove any feedback that violates these Terms, is inappropriate, or does not contribute constructively to the educational purpose of the Service.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              6. Intellectual Property
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              The Service and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              You retain ownership of any content you submit to the Service. However, by submitting content, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, adapt, publish, and distribute such content solely for the purpose of operating and providing the Service.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              You may not reproduce, distribute, modify, create derivative works of, publicly display, or otherwise exploit any part of the Service without our prior written permission.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              7. Third-Party Services
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              The Service uses third-party services including but not limited to Google OAuth, Supabase, Cloudflare Stream, YouTube, Resend, and Vercel. Your use of these services is subject to their respective terms of service and privacy policies. We are not responsible for the practices, policies, or content of these third-party services.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              When you upload videos to YouTube or Cloudflare Stream, or audio files to Supabase Storage, you are also subject to those services&apos; terms of service and privacy policies.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              8. Termination
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              Upon termination, your right to use the Service will cease immediately. You may request deletion of your account and associated data by contacting us. However, we may retain certain information as required by law or for legitimate business purposes.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              You may stop using the Service at any time. If you wish to delete your account, please contact us using the information provided in the Contact section.
            </p>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              9. Disclaimers
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS. WE MAKE NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We do not warrant that:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">The Service will be available at all times or will be uninterrupted, secure, or error-free</li>
              <li className="text-base sm:text-lg">The results obtained from using the Service will be accurate or reliable</li>
              <li className="text-base sm:text-lg">Any defects or errors in the Service will be corrected</li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              10. Limitation of Liability
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Your use or inability to use the Service</li>
              <li className="text-base sm:text-lg">Any unauthorized access to or use of our servers and/or any personal information stored therein</li>
              <li className="text-base sm:text-lg">Any interruption or cessation of transmission to or from the Service</li>
              <li className="text-base sm:text-lg">Any bugs, viruses, trojan horses, or the like that may be transmitted to or through the Service by any third party</li>
            </ul>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              Our total liability to you for all claims arising from or related to the Service shall not exceed the amount you paid us, if any, in the twelve (12) months preceding the claim, or $100, whichever is greater.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              11. Indemnification
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              You agree to defend, indemnify, and hold harmless us and our officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including without limitation reasonable attorney&apos;s fees and costs, arising out of or in any way connected with:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: '#1a1a1a' }}>
              <li className="text-base sm:text-lg">Your access to or use of the Service</li>
              <li className="text-base sm:text-lg">Your violation of these Terms</li>
              <li className="text-base sm:text-lg">Your violation of any third-party right, including without limitation any intellectual property right, publicity, confidentiality, property, or privacy right</li>
              <li className="text-base sm:text-lg">Any content you submit, post, or transmit through the Service</li>
            </ul>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              12. Changes to Terms
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days&apos; notice prior to any new terms taking effect.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you must stop using the Service.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              13. Governing Law
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
            </p>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              14. Contact Information
            </h2>
            <p className="text-base sm:text-lg leading-relaxed mb-4" style={{ color: '#1a1a1a' }}>
              If you have any questions about these Terms of Service, please contact us at:
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

