const sanitizeHtml = require('sanitize-html');

const EVENT_DESCRIPTION_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'div', 'p', 'br', 'hr',
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
    }
  },
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    blockquote: ['cite'],
    ol: ['start', 'reversed', 'type'],
    li: ['value'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan']
  }
});

module.exports = {
  EVENT_DESCRIPTION_TAGS,
  sanitizeEventDescription
};
