const sanitizeHtml = require('sanitize-html');

const EVENT_FONT_SIZE_CLASSES = new Set([
  'rte-font-size-small',
  'rte-font-size-normal',
  'rte-font-size-large',
  'rte-font-size-x-large'
]);

const EVENT_DESCRIPTION_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'div', 'p', 'span', 'br', 'hr',
  'b', 'strong', 'i', 'em', 'u', 's', 'mark', 'small', 'sub', 'sup',
  'blockquote', 'pre', 'code',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'
];

const sanitizeEventDescription = (html = '') => sanitizeHtml(String(html), {
  allowedTags: EVENT_DESCRIPTION_TAGS,
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (tagName, attributes) => {
      const safeAttributes = { ...attributes };

      if (safeAttributes.target === '_blank') {
        safeAttributes.rel = 'noopener noreferrer';
      }

      return { tagName, attribs: safeAttributes };
    },
    span: (tagName, attributes) => {
      const fontSizeClass = String(attributes.class || '')
        .split(/\s+/)
        .find((className) => EVENT_FONT_SIZE_CLASSES.has(className));

      return {
        tagName,
        attribs: fontSizeClass ? { class: fontSizeClass } : {}
      };
    }
  },
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    span: ['class'],
    blockquote: ['cite'],
    ol: ['start', 'reversed', 'type'],
    li: ['value'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan']
  }
});

module.exports = {
  EVENT_DESCRIPTION_TAGS,
  EVENT_FONT_SIZE_CLASSES,
  sanitizeEventDescription
};
