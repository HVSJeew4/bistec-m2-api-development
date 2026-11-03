const { idParam, text } = require('./common');
const { paginationRules } = require('../utils/pagination');

const CONTENT_MAX = 5000;

const listForPost = [idParam(), ...paginationRules];

const create = [idParam(), text('content', CONTENT_MAX)];

const update = [idParam(), text('content', CONTENT_MAX)];

const remove = [idParam()];

module.exports = { listForPost, create, update, remove };
