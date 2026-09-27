const ADMIN_PASSWORD = '205090';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle body parsing whether parsed or raw string
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {}
  }

  const password = body?.password?.toString().trim();

  if (password === ADMIN_PASSWORD) {
    return res.status(200).json({
      success: true,
      token: 'admin_auth_' + Date.now(),
      message: 'অ্যাডমিন প্যানেলে সফলভাবে লগইন হয়েছে।',
    });
  }

  return res.status(401).json({
    success: false,
    error: 'ভুল অ্যাডমিন পাসওয়ার্ড! আবার চেষ্টা করুন।',
  });
}
