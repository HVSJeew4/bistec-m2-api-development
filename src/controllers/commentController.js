const commentModel = require('../models/commentModel');
const postModel = require('../models/postModel');
const AppError = require('../utils/AppError');
const { getPagination } = require('../utils/pagination');
const { success, paginated } = require('../utils/response');

// Comments belong to a post the user can see; someone else's draft counts as missing.
async function findVisiblePost(postId, user) {
  const post = await postModel.findVisible(postId, user?.id);
  if (!post) throw AppError.notFound('Post not found');
  return post;
}

async function findOwnComment(id, user) {
  const comment = await commentModel.findById(id);
  if (!comment) throw AppError.notFound('Comment not found');
  if (comment.author.id !== user.id) {
    throw AppError.forbidden('Only the author can change this comment');
  }
  return comment;
}

async function listForPost(req, res) {
  const { id: postId, ...query } = req.valid;
  await findVisiblePost(postId, req.user);

  const { page, limit, offset } = getPagination(query);
  const { rows, total } = await commentModel.listByPost(postId, { limit, offset });
  paginated(res, rows, { page, limit, total });
}

async function create(req, res) {
  const { id: postId, content } = req.valid;
  await findVisiblePost(postId, req.user);
  const comment = await commentModel.create({ content, postId, authorId: req.user.id });
  success(res, comment, 201);
}

async function update(req, res) {
  const { id, content } = req.valid;
  await findOwnComment(id, req.user);
  success(res, await commentModel.update(id, content));
}

async function remove(req, res) {
  const { id } = req.valid;
  await findOwnComment(id, req.user);
  await commentModel.remove(id);
  success(res, { id });
}

module.exports = { listForPost, create, update, remove };
