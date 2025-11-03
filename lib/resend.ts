import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set');
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'yourextempcoaches@resend.dev';

// Resolve the public site URL for emails. Preference order:
// 1) NEXT_PUBLIC_SITE_URL (explicit override)
// 2) VERCEL_URL (provided by Vercel env) prefixed with https://
// 3) localhost fallback for local development
const SITE_URL: string = (() => {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicitUrl && explicitUrl.trim().length > 0) {
    return explicitUrl;
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim().length > 0) {
    return `https://${vercelUrl}`;
  }
  return 'http://localhost:3000';
})();

interface BallotDetails {
  reviewerName: string;
  gestures: number;
  delivery: number;
  pauses: number;
  content: number;
  entertaining: number;
  betterThanLast: boolean;
  feedbackText: string | null;
  speechUrl: string;
}

interface SpeechSubmission {
  speakerName: string;
  speechUrl: string;
  submittedAt: string;
}

interface FeatureRequestDetails {
  title: string;
  description: string;
  submitterName: string;
  submittedAt: string;
}

export async function sendDailyReminderEmail(
  toEmail: string,
  userName: string
): Promise<void> {
  const subject = '🎤 Time for your daily extemp practice!';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">🎤 Daily Practice Reminder</h1>
        </div>
        <div class="content">
          <p>Hey ${userName}! 👋</p>
          <p>We noticed you haven&apos;t submitted a speech today. Remember, consistency is key to becoming a great extemporaneous speaker!</p>
          <p><strong>Why practice today?</strong></p>
          <ul>
            <li>Build your confidence and fluency</li>
            <li>Stay ahead on the leaderboard</li>
            <li>Get valuable feedback from your peers</li>
            <li>Develop a daily habit that compounds over time</li>
          </ul>
          <p style="text-align: center;">
            <a href="${SITE_URL}" class="cta-button">
              Submit Your Speech Now
            </a>
          </p>
          <p>Even a 2-minute practice session is better than none. Your future self will thank you! 💪</p>
        </div>
        <div class="footer">
          <p>Keep speaking, keep improving!</p>
          <p><em>Your Extemp Coaches</em></p>
        </div>
      </body>
    </html>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject,
    html,
  });
}

export async function sendBallotNotificationEmail(
  toEmail: string,
  speakerName: string,
  ballotDetails: BallotDetails
): Promise<void> {
  const subject = '🎯 New Feedback on Your Speech!';
  
  const averageScore = (
    (ballotDetails.gestures + 
     ballotDetails.delivery + 
     ballotDetails.pauses + 
     ballotDetails.content + 
     ballotDetails.entertaining) / 5
  ).toFixed(1);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .rating-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          .rating-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
          }
          .rating-label {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .rating-value {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
          }
          .feedback-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #10b981;
          }
          .badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 14px;
            margin: 10px 0;
          }
          .average-score {
            text-align: center;
            font-size: 48px;
            font-weight: bold;
            color: #667eea;
            margin: 20px 0;
          }
          .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">🎯 New Feedback Received!</h1>
        </div>
        <div class="content">
          <p>Hey ${speakerName}! 👋</p>
          <p><strong>${ballotDetails.reviewerName}</strong> just reviewed your speech and left you some feedback!</p>
          
          <div class="average-score">
            ${averageScore}/10
          </div>
          <p style="text-align: center; color: #6b7280; margin-top: -10px;">Average Score</p>

          ${ballotDetails.betterThanLast ? '<div style="text-align: center;"><span class="badge">✨ Better than last time!</span></div>' : ''}

          <h3 style="margin-top: 30px;">Detailed Ratings:</h3>
          <div class="rating-grid">
            <div class="rating-item">
              <div class="rating-label">Gestures</div>
              <div class="rating-value">${ballotDetails.gestures}/10</div>
            </div>
            <div class="rating-item">
              <div class="rating-label">Delivery</div>
              <div class="rating-value">${ballotDetails.delivery}/10</div>
            </div>
            <div class="rating-item">
              <div class="rating-label">Pauses</div>
              <div class="rating-value">${ballotDetails.pauses}/10</div>
            </div>
            <div class="rating-item">
              <div class="rating-label">Content</div>
              <div class="rating-value">${ballotDetails.content}/10</div>
            </div>
            <div class="rating-item" style="grid-column: 1 / -1;">
              <div class="rating-label">Entertaining</div>
              <div class="rating-value">${ballotDetails.entertaining}/10</div>
            </div>
          </div>

          ${ballotDetails.feedbackText ? `
            <h3 style="margin-top: 30px;">Written Feedback:</h3>
            <div class="feedback-box">
              <p style="margin: 0; white-space: pre-wrap;">${ballotDetails.feedbackText}</p>
            </div>
          ` : ''}

          <p style="text-align: center;">
            <a href="${ballotDetails.speechUrl}" class="cta-button">
              View Your Speech
            </a>
          </p>

          <p>Keep up the great work! Use this feedback to make your next speech even better. 🚀</p>
        </div>
      </body>
    </html>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject,
    html,
  });
}

export async function sendSpeechSubmissionAlert(
  submission: SpeechSubmission,
  recipientEmails: string[]
): Promise<void> {
  const subject = `🎤 New Speech Submitted by ${submission.speakerName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .info-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #f59e0b;
          }
          .cta-button {
            display: inline-block;
            background: #f59e0b;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">🎤 New Speech Alert!</h1>
        </div>
        <div class="content">
          <p>Hey coaches! 👋</p>
          <p><strong>${submission.speakerName}</strong> just submitted a new speech and is waiting for feedback!</p>
          
          <div class="info-box">
            <p><strong>Speaker:</strong> ${submission.speakerName}</p>
            <p><strong>Submitted:</strong> ${new Date(submission.submittedAt).toLocaleString('en-US', { 
              dateStyle: 'full', 
              timeStyle: 'short' 
            })}</p>
          </div>

          <p style="text-align: center;">
            <a href="${submission.speechUrl}" class="cta-button">
              Listen & Provide Feedback
            </a>
          </p>

          <p>Your feedback helps them improve and stay motivated. Take a few minutes to review when you can! 🎯</p>
        </div>
      </body>
    </html>
  `;

  for (const recipient of recipientEmails) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient,
      subject,
      html,
    });
  }
}

export async function sendFeatureRequestAlert(
  details: FeatureRequestDetails
): Promise<void> {
  const subject = `💡 New Feature Request: ${details.title}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .info-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #06b6d4;
          }
          .description-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #8b5cf6;
          }
          .cta-button {
            display: inline-block;
            background: #06b6d4;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">💡 New Feature Request</h1>
        </div>
        <div class="content">
          <p>Hey Sumit! 👋</p>
          <p>A new feature request has been submitted!</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #06b6d4;">${details.title}</h3>
            <p style="margin: 0;"><strong>Submitted by:</strong> ${details.submitterName}</p>
            <p style="margin: 5px 0 0 0;"><strong>Date:</strong> ${new Date(details.submittedAt).toLocaleString('en-US', { 
              dateStyle: 'full', 
              timeStyle: 'short' 
            })}</p>
          </div>

          <div class="description-box">
            <h4 style="margin-top: 0; color: #8b5cf6;">Description:</h4>
            <p style="white-space: pre-wrap; margin: 0;">${details.description}</p>
          </div>

          <p style="text-align: center;">
            <a href="${SITE_URL}" class="cta-button">
              View All Feature Requests
            </a>
          </p>
        </div>
      </body>
    </html>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: 'dattasumit2019@gmail.com',
    subject,
    html,
  });
}

