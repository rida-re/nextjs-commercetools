export type ConnectionTestResult = {
  ok: boolean;
  status: number;
  message: string;
  token?: string;
  expiresIn?: number;
};

export async function testCtpConnection(): Promise<ConnectionTestResult> {
  const clientId = process.env.CTP_CLIENT_ID ?? process.env.NEXT_PUBLIC_CTP_CLIENT_ID;
  const clientSecret = process.env.CTP_CLIENT_SECRET ?? process.env.NEXT_PUBLIC_CTP_CLIENT_SECRET;
  const authHost = process.env.CTP_AUTH_URL ?? process.env.NEXT_PUBLIC_CTP_AUTH_URL;
  const scopes = process.env.CTP_SCOPES ?? process.env.NEXT_PUBLIC_CTP_SCOPES;

  if (!clientId || !clientSecret || !authHost) {
    return {
      ok: false,
      status: 0,
      message:
        'Missing configuration: CTP_CLIENT_ID, CTP_CLIENT_SECRET and CTP_AUTH_URL must be set (or NEXT_PUBLIC_* fallbacks).',
    };
  }

  // Ensure the token endpoint is correct. Commercetools exposes the token endpoint at `/oauth/token`.
  const tokenUrl = new URL('/oauth/token', authHost).toString();

  const body = new URLSearchParams();
  body.set('grant_type', 'client_credentials');
  if (scopes) body.set('scope', scopes);

  const basic = typeof Buffer !== 'undefined'
    ? Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    : btoa(`${clientId}:${clientSecret}`);

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const text = await res.text();
    let json: any = undefined;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      // non-json response
    }

    if (!res.ok) {
      const message = json?.error_description || json?.error || text || `HTTP ${res.status}`;
      return { ok: false, status: res.status, message };
    }

    return {
      ok: true,
      status: res.status,
      message: 'Token retrieved successfully',
      token: json?.access_token,
      expiresIn: json?.expires_in,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, message: `Fetch error: ${msg}` };
  }
}

export default testCtpConnection;
