export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {}
  }

  const vercelToken = body?.vercelToken?.toString().trim();
  if (!vercelToken) {
    return res.status(400).json({ success: false, error: 'Vercel API token is required' });
  }

  try {
    const vercelRes = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
      },
    });

    if (!vercelRes.ok) {
      return res.status(401).json({
        success: false,
        error: 'ভুল Vercel টোকেন! vercel.com/account/tokens থেকে সঠিক টোকেন দিন।',
      });
    }

    const userData = (await vercelRes.json()) as any;
    const user = userData.user;

    return res.status(200).json({
      success: true,
      token: 'vercel_auth_' + Date.now(),
      vercelUser: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name || user.username,
        avatar: user.avatar ? `https://vercel.com/api/www/avatar/${user.avatar}` : null,
      },
      message: `স্বাগতম ${user.name || user.username}! Vercel.com দিয়ে সফলভাবে অ্যাডমিন প্যানেলে লগইন হয়েছে।`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Vercel.com API-র সাথে যোগাযোগ করা যায়নি।' });
  }
}
