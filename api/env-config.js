module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    configured: Boolean(process.env.INSTAGRAM_TOKEN && process.env.INSTAGRAM_USER_ID),
    userId: process.env.INSTAGRAM_USER_ID || null,
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
  }));
};
