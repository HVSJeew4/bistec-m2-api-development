const userModel = require('../models/userModel');
const AppError = require('../utils/AppError');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { success } = require('../utils/response');

async function register(req, res) {
  const { email, password, name, bio } = req.valid;
  const user = await userModel.create({
    email,
    passwordHash: await hashPassword(password),
    name,
    bio,
  });
  success(res, user, 201);
}

async function login(req, res) {
  const { email, password } = req.valid;
  const found = await userModel.findByEmailWithPassword(email);
  // One message for "no such email" and "wrong password", so the API does not reveal
  // which emails are registered.
  if (!found || !(await verifyPassword(password, found.passwordHash))) {
    throw AppError.unauthorized('Invalid email or password');
  }
  const { passwordHash, ...user } = found; // never send the hash
  success(res, { token: signToken(user), user });
}

module.exports = { register, login };
