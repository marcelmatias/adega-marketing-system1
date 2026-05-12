const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  adegaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Adega', required: true, index: true },
  nome: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senha: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['admin', 'staff', 'viewer'], default: 'staff' },
  socialId: { type: String, default: '' },
  socialProvider: { type: String, enum: ['', 'google', 'facebook'], default: '' },
  ativo: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('senha')) return next();
  this.senha = await bcrypt.hash(this.senha, 12);
  next();
});

userSchema.methods.compararSenha = async function (senha) {
  return bcrypt.compare(senha, this.senha);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.senha;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
