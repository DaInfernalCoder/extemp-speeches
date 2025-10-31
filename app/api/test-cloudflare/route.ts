import { NextResponse } from 'next/server';

export async function GET() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  console.log('[TEST] Verifying Cloudflare credentials');

  // Test 0: Check token permissions and details
  const tokenResponse = await fetch(
    'https://api.cloudflare.com/client/v4/user/tokens/verify',
    {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    }
  );

  const tokenData = await tokenResponse.json();

  console.log('[TEST] Token verify response:', {
    status: tokenResponse.status,
    success: tokenData.success,
    token: tokenData.result,
  });

  // Test 1: Simple account info call
  const accountResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}`,
    {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    }
  );

  const accountData = await accountResponse.json();

  console.log('[TEST] Account info response:', {
    status: accountResponse.status,
    success: accountData.success,
    account: accountData.result?.name,
    errors: accountData.errors,
  });

  // Test 2: Try to list streams
  const streamsResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
    {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    }
  );

  const streamsData = await streamsResponse.json();

  console.log('[TEST] Streams list response:', {
    status: streamsResponse.status,
    success: streamsData.success,
    totalCount: streamsData.result?.total_count,
    errors: streamsData.errors,
  });

  // Test 3: Try direct upload
  const directUploadResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: 3600,
      }),
    }
  );

  const directUploadData = await directUploadResponse.json();

  console.log('[TEST] Direct upload response:', {
    status: directUploadResponse.status,
    success: directUploadData.success,
    errors: directUploadData.errors,
  });

  return NextResponse.json({
    tokenInfo: {
      status: tokenResponse.status,
      success: tokenData.success,
      token: tokenData.result,
      errors: tokenData.errors,
    },
    accountTest: {
      status: accountResponse.status,
      success: accountData.success,
      message: accountData.errors?.[0]?.message || 'OK',
      errors: accountData.errors,
    },
    streamsTest: {
      status: streamsResponse.status,
      success: streamsData.success,
      message: streamsData.errors?.[0]?.message || 'OK',
      errors: streamsData.errors,
    },
    directUploadTest: {
      status: directUploadResponse.status,
      success: directUploadData.success,
      message: directUploadData.errors?.[0]?.message || 'OK',
      errors: directUploadData.errors,
    },
  });
}
