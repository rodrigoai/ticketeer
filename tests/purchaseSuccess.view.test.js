const fs = require('fs');
const path = require('path');
const { parse, compileScript } = require('@vue/compiler-sfc');
const { transformSync } = require('esbuild');
const Vue = require('vue');

// Render the actual Vue SFC with a lightweight host; no browser or live payment is required.
const source = fs.readFileSync(path.join(__dirname, '../src/views/PurchaseSuccess.vue'), 'utf8');
const compiled = compileScript(parse(source).descriptor, { id: 'purchase-success-test', inlineTemplate: true });
const code = transformSync(compiled.content, { format: 'cjs' }).code;
const walletModule = { exports: {} };
new Function('module', 'exports', transformSync(fs.readFileSync(path.join(__dirname, '../src/utils/wallet.js'), 'utf8'), { format: 'cjs' }).code)(walletModule, walletModule.exports);
const node = (type, text = '') => ({ type, text, children: [], props: {}, parent: null });
const renderer = Vue.createRenderer({
  createElement: type => node(type), createText: text => node('text', text), createComment: () => node('comment'),
  setText: (el, text) => { el.text = text; },
  setElementText: (el, text) => { el.text = text; el.children = []; },
  patchProp: (el, key, prev, value) => { el.props[key] = value; },
  insertStaticContent(content, parent, anchor) {
    const el = node('static', content.replace(/<[^>]*>/g, ''));
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(index < 0 ? parent.children.length : index, 0, el);
    el.parent = parent;
    return [el, el];
  },
  insert(el, parent, anchor) {
    if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1);
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(index < 0 ? parent.children.length : index, 0, el);
    el.parent = parent;
  },
  remove(el) { if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1); },
  parentNode: el => el.parent,
  nextSibling(el) { return el.parent?.children[el.parent.children.indexOf(el) + 1] || null; }
});
const all = el => [el, ...el.children.flatMap(all)];
const text = el => all(el).map(n => n.text).join(' ');
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); await Vue.nextTick(); };
let post;
let app;
let root;
let completeOwners;
let ownerProps;
let receipt;

beforeEach(() => {
  receipt = {
    event: { name: 'Festival', venue: 'Arena' }, confirmationHash: 'secure-order-hash',
    totalTickets: 1, isCompleted: true, qrEmailSent: true,
    wallet: { apple: false, google: false },
    tickets: [{ id: 10, identificationNumber: 1, description: 'Admission', buyer: 'Maria Oliveira', buyerEmail: 'maria@example.com', qrCode: 'data:image/png;base64,qr' }]
  };
  post = jest.fn().mockImplementation(async () => ({ purchase: receipt }));
  completeOwners = null;
  ownerProps = null;
  root = node('root');
});
afterEach(() => app?.unmount());

async function mount() {
  const module = { exports: {} };
  const deps = {
    vue: Vue,
    'vue-router': {
      useRoute: () => ({ params: { hash: 'public-event', purchaseId: 'purchase-token' } }),
      RouterLink: { props: ['to'], setup: (props, { slots }) => () => Vue.h('a', { href: props.to }, slots.default?.()) }
    },
    '@/composables/useApi': { useApi: () => ({ post }) },
    '@/utils/wallet': walletModule.exports,
    './BuyerConfirmation.vue': { __esModule: true, default: {
      props: ['orderHash'], emits: ['completed'],
      setup(props, { emit }) {
        ownerProps = props;
        completeOwners = result => emit('completed', result);
        return () => Vue.h('form', 'Ticket owner form');
      }
    } }
  };
  new Function('require', 'module', 'exports', code)(name => deps[name], module, module.exports);
  app = renderer.createApp(module.exports.default);
  app.mount(root);
  await flush();
}

test('return page confirms immediately and displays a single ticket and email delivery message', async () => {
  await mount();
  expect(post).toHaveBeenCalledWith('/api/public/events/public-event/purchases/purchase-token/confirm', {});
  expect(text(root)).toContain('Pagamento confirmado');
  expect(text(root)).toContain('Seu ingresso foi enviado por email');
  expect(all(root).find(n => n.type === 'img').props.src).toBe('data:image/png;base64,qr');
  expect(completeOwners).toBeNull();
  expect(text(root)).toContain('Maria Oliveira');
  expect(text(root)).toContain('maria@example.com');
  const download = all(root).find(n => n.type === 'a' && n.props.href?.endsWith('/pdf'));
  expect(download.props.href).toBe('/api/public/events/public-event/purchases/purchase-token/tickets/10/pdf');
  expect(text(root)).not.toContain('Adicionar à');
});

test('shows configured wallet choices with per-ticket links', async () => {
  receipt.wallet = { apple: true, google: true };
  await mount();
  const walletLinks = all(root).filter(n => n.type === 'a' && /\/(apple|google)$/.test(n.props.href));
  expect(walletLinks).toHaveLength(2);
  expect(walletLinks.map(n => n.props.href)).toEqual([
    '/api/public/events/public-event/purchases/purchase-token/tickets/10/apple',
    '/api/public/events/public-event/purchases/purchase-token/tickets/10/google'
  ]);
});

test('multiple tickets open the existing form and show tickets after owner confirmation', async () => {
  receipt = { ...receipt, totalTickets: 2, isCompleted: false, tickets: [] };
  await mount();
  expect(ownerProps.orderHash).toBe('secure-order-hash');
  expect(text(root)).toContain('Ticket owner form');
  receipt = { ...receipt, isCompleted: true, tickets: [
    { identificationNumber: 1, qrCode: 'qr-one' }, { identificationNumber: 2, qrCode: 'qr-two' }
  ] };
  completeOwners({ qrCodeEmails: { sent: 2, failed: 0 } });
  await flush();
  expect(text(root)).not.toContain('Ticket owner form');
  expect(all(root).filter(n => n.type === 'img').map(n => n.props.src)).toEqual(['qr-one', 'qr-two']);
  expect(text(root)).toContain('email de cada titular');
});

test('email failures display the ticket without claiming email delivery succeeded', async () => {
  receipt.qrEmailSent = false;
  await mount();
  expect(text(root)).toContain('Não foi possível enviar o email');
  expect(text(root)).not.toContain('Seu ingresso foi enviado por email');
  expect(all(root).some(n => n.type === 'img')).toBe(true);
});

test('failed confirmation shows no success or QR and supports retry', async () => {
  post.mockRejectedValueOnce(new Error('Payment could not be verified'));
  await mount();
  expect(text(root)).toContain('Payment could not be verified');
  expect(text(root)).not.toContain('Pagamento confirmado');
  expect(all(root).some(n => n.type === 'img')).toBe(false);
  await all(root).find(n => n.type === 'button').props.onClick();
  await flush();
  expect(text(root)).toContain('Pagamento confirmado');
});
