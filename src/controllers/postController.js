const postModel = require('../models/postModel');
const AppError = require('../utils/AppError');
const { getPagination } = require('../utils/pagination');
const { success, paginated } = require('../utils/response');

// Loads a post the current user may see and checks they own it.
// Someone else's draft → 404 (it is invisible to them); someone else's published post → 403.
async function findOwnPost(id, user) {
  const post = await postModel.findVisible(id, user.id);
  if (!post) throw AppError.notFound('Post not found');
  if (post.author.id !== user.id) throw AppError.forbidden('Only the author can change this post');
  return post;
}

async function list(req, res) {
  const { author_id: authorId, search, sort, published, ...query } = req.valid;
  const drafts = published === false;
  if (drafts && !req.user) throw AppError.unauthorized('Log in to list your drafts');

  const { page, limit, offset } = getPagination(query);
  const { rows, total } = await postModel.list({
    authorId,
    search,
    sort,
    drafts,
    viewerId: req.user?.id,
    limit,
    offset,
  });
  paginated(res, rows, { page, limit, total });
}

async function getById(req, res) {
  const post = await postModel.findVisible(req.valid.id, req.user?.id);
  if (!post) throw AppError.notFound('Post not found');
  success(res, post);
}

async function create(req, res) {
  const { title, content, published } = req.valid;
  const post = await postModel.create({ title, content, published, authorId: req.user.id });
  success(res, post, 201);
}

async function update(req, res) {
  const { id, title, content, published } = req.valid;
  await findOwnPost(id, req.user);
  success(res, await postModel.update(id, { title, content, published }));
}

async function remove(req, res) {
  const { id } = req.valid;
  await findOwnPost(id, req.user);
  await postModel.remove(id);
  success(res, { id });
}

module.exports = { list, getById, create, update, remove };
