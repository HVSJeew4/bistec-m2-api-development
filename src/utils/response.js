// The three response envelopes from the brief. Every controller answers through one of these.

function success(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function paginated(res, data, { page, limit, total }) {
  return res.status(200).json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

module.exports = { success, paginated };
