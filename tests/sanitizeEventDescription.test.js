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

  test('can sanitize additional information with the same formatting rules', () => {
    const html = '<h2>Parking</h2><p onclick="alert(1)">Use gate B.</p><script>alert(2)</script>';

    expect(sanitizeEventDescription(html)).toBe('<h2>Parking</h2><p>Use gate B.</p>');
  });

  test('protects links that open a new tab', () => {
    const html = '<a href="https://example.com" target="_blank">Details</a>';

    expect(sanitizeEventDescription(html)).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Details</a>'
    );
  });

  test('keeps supported font sizes and removes unrelated classes', () => {
    const html = '<p><span class="fixed rte-font-size-large text-red-500">Important</span></p>';

    expect(sanitizeEventDescription(html)).toBe(
      '<p><span class="rte-font-size-large">Important</span></p>'
    );
  });

  test('does not preserve unsupported font-size classes or styles', () => {
    const html = '<span class="rte-font-size-huge" style="font-size: 100px">Oversized</span>';

    expect(sanitizeEventDescription(html)).toBe('<span>Oversized</span>');
  });
});
