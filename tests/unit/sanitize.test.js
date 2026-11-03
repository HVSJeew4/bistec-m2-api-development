const { stripHtml } = require('../../src/utils/sanitize');

describe('stripHtml', () => {
  it.each([
    ['removes script tags together with their content', 'Q&A <script>alert(1)</script>', 'Q&A '],
    ['removes event-handler tags', '<img src=x onerror=alert(1)>hi', 'hi'],
    ['keeps the text inside harmless tags', '<b>bold</b> text', 'bold text'],
    ['removes style blocks', '<style>body{}</style>after', 'after'],
    ['removes svg payloads', '<svg/onload=alert(1)>', ''],
    ['removes nested tag tricks', '<scr<script>ipt>alert(1)</script>', 'ipt>alert(1)'],
    ['removes entity-encoded tags', '&lt;script&gt;alert(1)&lt;/script&gt;', ''],
    ['removes double-encoded tags', '&amp;lt;script&amp;gt;alert(1)', ''],
  ])('%s', (_name, input, expected) => {
    expect(stripHtml(input)).toBe(expected);
  });

  it.each([
    ['ampersands', 'Tom & Jerry'],
    ['comparison signs with spaces', 'a < b and c > d'],
    ['a less-than sign before a digit', '1<2'],
    ['quotes and apostrophes', `"quoted" it's`],
    ['unicode', 'emoji 😀 café'],
  ])('keeps plain text with %s unchanged', (_name, input) => {
    expect(stripHtml(input)).toBe(input);
  });
});
