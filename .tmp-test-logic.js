const fs = require('fs');
const vm = require('vm');

function makeCtx() {
  const store = new Map();
  const events = [];
  const ctx = {
    localStorage: {
      getItem(k){ return store.has(k) ? store.get(k) : null; },
      setItem(k,v){ store.set(k, String(v)); },
      removeItem(k){ store.delete(k); }
    },
    window: {
      dispatchEvent(ev){ events.push(ev.type || ev); },
      addEventListener(){}
    },
    Event: function(name){ this.type = name; },
    Intl,
    Date,
    Math,
    JSON,
    String,
    Number,
    Boolean,
    Object,
    Array,
    Set,
    Map,
    console
  };
  ctx.globalThis = ctx;
  return { ctx, store, events };
}

const code = fs.readFileSync('mk-data.js','utf8');
const { ctx, store } = makeCtx();
vm.createContext(ctx);
vm.runInContext(code, ctx);
const MKStore = ctx.window.MKStore;

const p = MKStore.products();
if (!Array.isArray(p) || p.length < 20) throw new Error('Produtos padrao nao carregaram');

const cfg = MKStore.config();
if (!cfg || !(cfg.quantidadeMesas >= 1)) throw new Error('Config mesas invalida');

const auth = MKStore.adminCredentials();
if (!auth || !auth.usuario || !auth.senha) throw new Error('Credenciais nao carregaram');
if (!MKStore.verifyAdminCredentials(auth.usuario, auth.senha)) throw new Error('Verificacao de credenciais falhou');

MKStore.saveAdminCredentials({ usuario: 'admin2', senha: 'senha1234' });
if (!MKStore.verifyAdminCredentials('admin2', 'senha1234')) throw new Error('Atualizacao de credenciais falhou');

const promos = MKStore.promos();
if (!Array.isArray(promos)) throw new Error('Promocoes invalidas');

const order = { id: '1', codigo: 'MK0001', total: 10, itensDetalhados: [{ title: 'X', qty: 1 }], status: 'recebidos' };
MKStore.saveOrders([order]);
const outOrders = MKStore.orders();
if (!Array.isArray(outOrders) || outOrders.length !== 1) throw new Error('Pedidos nao salvaram');

console.log('OK_TEST_LOGIC');
