const { sanitizeEventDescription } = require('../utils/sanitizeEventDescription');

describe('sanitizeEventDescription', () => {
  test('keeps supported event formatting', () => {
    const html = '<h1>Headline</h1><p>A <b>bold</b> paragraph.</p><div>Another line</div><ul><li>First</li></ul>';

    expect(sanitizeEventDescription(html)).toBe(html);
  });

  test('removes executable markup and unsafe attributes', () => {
    const html = '<p onclick="alert(1)">Welcome<script>alert(2)</script></p><a href="javascript:alert(3)">Bad link</a>';

    expect(sanitizeEventDescription(html)).toBe('<p>Welcome</p><a>Bad link</a>');
  });

  test('protects links that open a new tab', () => {
    const html = '<a href="https://example.com" target="_blank">Details</a>';

    expect(sanitizeEventDescription(html)).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Details</a>'
    );
  });
});
