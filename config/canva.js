module.exports = {
  apiKey: process.env.CANVA_API_KEY || '',
  apiSecret: process.env.CANVA_API_SECRET || '',
  mock: process.env.CANVA_MOCK === 'true' || true,
  baseUrl: 'https://api.canva.com/rest',
};
