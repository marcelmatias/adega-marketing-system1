const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET nao definido. Configure a variavel de ambiente JWT_SECRET.');
}

module.exports = {
  secret,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
