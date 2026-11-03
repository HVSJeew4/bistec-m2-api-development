const userModel = require('../models/userModel');
const postModel = require('../models/postModel');
const AppError = require('../utils/AppError');
const { getPagination } = require('../utils/pagination');
const { success, paginated } = require('../utils/response');

function getMe(req, res) {
  success(res, req.user); // loaded by requireAuth
}

async function updateMe(req, res) {
  const { name, bio } = req.valid;
  success(res, await userModel.update(req.user.id, { name, bio }));
}

async function getById(req, res) {
  const user = await userModel.findPublicById(req.valid.id);
  if (!user) throw AppError.notFound('User not found');
  success(res, user);
}

// Published posts of one author, newest first.
async function listPosts(req, res) {
  const { id, ...query } = req.valid;
  if (!(await userModel.findPublicById(id))) throw AppError.notFound('User not found');

  const { page, limit, offset } = getPagination(query);
  const { rows, total } = await postModel.list({ authorId: id, limit, offset });
  paginated(res, rows, { page, limit, total });
}

module.exports = { getMe, updateMe, getById, listPosts };
