const sanitizeHtml = require('sanitize-html');
const { decodeHTML } = require('entities');

// No tags or attributes allowed: everything is reduced to plain text. sanitize-html also drops
// the *content* of <script>, <style> and similar tags, not just the tags themselves.
const PLAIN_TEXT = { allowedTags: [], allowedAttributes: {} };
const MAX_ROUNDS = 5;

// Removes HTML from user text but keeps plain text exactly as typed ("Q&A", "a < b").
//
// sanitize-html returns HTML-escaped text ("Q&amp;A"), so the result is decoded back to plain
// text. Decoding can reveal tags that were sent entity-encoded ("&lt;script&gt;"), so the two
// steps repeat until the text stops changing.
function stripHtml(input) {
  let text = input;
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const next = decodeHTML(sanitizeHtml(text, PLAIN_TEXT));
    if (next === text) return text;
    text = next;
  }
  // Still changing after several rounds: only deliberately nested encodings get here.
  // Return the escaped form, which is safe even if a client renders it as HTML.
  return sanitizeHtml(text, PLAIN_TEXT);
}

module.exports = { stripHtml };
