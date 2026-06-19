function hasValidAdminSession() {
  if (sessionStorage.getItem('mk_admin_auth') !== 'ok') return false;
  if (!window.MKStore || typeof MKStore.adminCredentials !== 'function') return false;
  const sessionUser = String(sessionStorage.getItem('mk_admin_user') || '').trim().toLowerCase();
  const currentUser = String(MKStore.adminCredentials().usuario || '').trim().toLowerCase();
  return !!sessionUser && sessionUser === currentUser;
}

if (!hasValidAdminSession()) location.href = 'admin-login.html';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const money = (v) => MKStore.BRL.format(Number(v || 0));
const pages = {
  dashboard: 'Dashboard',
  produtos: 'Produtos',
  promocoes: 'Promoções',
  pedidos: 'Pedidos',
  mesas: 'Mesas / QR Code',
  config: 'Configurações'
};
const DEFAULT_TABLES_COUNT = 10;

const PRODUCT_IMAGE_PLACEHOLDER = 'img/hamb.gourmet.jpg';
const DEFAULT_PRODUCT_CATEGORIES = [
  'Pizzas',
  'Pizzas Doces',
  'Bordas Recheadas',
  'Hambúrgueres',
  'Hambúrgueres Gourmet',
  'Beirutes',
  'Porções',
  'Adicionais',
  'Sorvete',
  'Açaí',
  'Sucos',
  'Bebidas',
  'Outros'
];
const productImageFileInput = $('#product-image-file');
const productImagePreview = $('#product-image-preview');
const productCategorySelect = $('#product-category');
let currentProductImage = '';

function normalizeImage(value) {
  const img = String(value || '').trim();
  return img || PRODUCT_IMAGE_PLACEHOLDER;
}

function setProductImagePreview(src) {
  if (!productImagePreview) return;
  productImagePreview.src = normalizeImage(src);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsString(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

function normalizeCategory(value) {
  const category = normalizeText(value);
  const match = normalizeForMatch(category);
  if (match === 'hamburgueres gourmet' || match === 'hamburguer gourmet' || match === 'gourmet') {
    return 'Hambúrgueres Gourmet';
  }
  if (match === 'hamburgueres' || match === 'hamburguer tradicional' || match === 'hamburgueres tradicionais') {
    return 'Hambúrgueres';
  }
  if (match === 'pizzas' || match === 'pizza') return 'Pizzas';
  if (match === 'doces' || match === 'pizza doce' || match === 'pizzas doces') return 'Pizzas Doces';
  if (match === 'porcoes' || match === 'porcao') return 'Porções';
  if (match === 'acai') return 'Açaí';
  return category || 'Outros';
}
function normalizeForMatch(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isOutroProductName(value) {
  const name = normalizeForMatch(value);
  return name === 'outro' || name === 'outros';
}

function refreshProductCategoryOptions(selectedValue = 'Outros') {
  if (!productCategorySelect) return;

  const categories = new Set(DEFAULT_PRODUCT_CATEGORIES.map(normalizeCategory));
  MKStore.products().forEach((product) => categories.add(normalizeCategory(product.categoria)));
  if (selectedValue) categories.add(normalizeCategory(selectedValue));

  const options = [...categories].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  productCategorySelect.innerHTML = options
    .map((category) => `<option value="${category}">${category}</option>`)
    .join('');
  productCategorySelect.value = normalizeCategory(selectedValue);
}

function safeOrder(order) {
  return order && typeof order === 'object' ? order : {};
}

function orderType(order) {
  const item = safeOrder(order);
  return item.tipoPedido || item.tipo || 'retirada';
}

function typeLabel(order) {
  return {
    delivery: 'Delivery',
    mesa: 'Mesa',
    retirada: 'Retirada'
  }[orderType(order)] || 'Retirada';
}

function orderInfo(order) {
  const item = safeOrder(order);
  return item.dadosPedido && typeof item.dadosPedido === 'object' ? item.dadosPedido : {};
}

function orderPhone(order) {
  const item = safeOrder(order);
  return item.telefone || orderInfo(item).telefone || '';
}

function orderTable(order) {
  const item = safeOrder(order);
  return item.mesa || orderInfo(item).numeroMesa || '';
}

function orderPickupTime(order) {
  const item = safeOrder(order);
  return orderInfo(item).horarioRetirada || item.horarioRetirada || '';
}

function orderNotes(order) {
  const item = safeOrder(order);
  return orderInfo(item).observacaoPedido || orderInfo(item).observacao || item.observacao || '';
}

function formatAddress(order) {
  const info = orderInfo(order);
  const endereco = info.endereco;
  if (endereco) {
    const linha = [endereco.rua, endereco.numero, endereco.bairro].filter(Boolean).join(', ');
    const extra = [endereco.complemento, endereco.pontoReferencia].filter(Boolean).join(' | ');
    if (linha && extra) return `${linha} | ${extra}`;
    if (linha) return linha;
    if (extra) return extra;
  }
  return safeOrder(order).endereco || '';
}

function orderDetailsHtml(order) {
  const detalhes = [];
  const phone = orderPhone(order);
  const tipo = orderType(order);

  if (phone) detalhes.push(`<small>Telefone: ${escapeHtml(phone)}</small>`);

  if (tipo === 'delivery') {
    const endereco = formatAddress(order);
    if (endereco) detalhes.push(`<small>Endereço: ${escapeHtml(endereco)}</small>`);
  }

  if (tipo === 'retirada') {
    const retirada = orderPickupTime(order);
    if (retirada) detalhes.push(`<small>Retirada: ${escapeHtml(retirada)}</small>`);
  }

  const obs = orderNotes(order);
  if (obs) detalhes.push(`<small>Obs: ${escapeHtml(obs)}</small>`);

  return detalhes.join('<br>');
}

function orderItemsHtml(order) {
  const items = Array.isArray(order.itens) ? order.itens : [];
  if (!items.length) return '';
  return `<br><small>Itens: ${items.map(escapeHtml).join(' | ')}</small>`;
}

function buildOrderPrintText(order) {
  const item = safeOrder(order);
  const tipo = orderType(order);
  const mesa = orderTable(order);
  const phone = orderPhone(order);
  const endereco = formatAddress(order);
  const retirada = orderPickupTime(order);
  const obs = orderNotes(order);

  const lines = [
    '========================',
    `Pedido #${item.codigo || item.id || ''}`,
    `Tipo: ${typeLabel(order)}${mesa ? ` | Mesa ${mesa}` : ''}`,
    `Cliente: ${item.cliente || 'Cliente'}`
  ];

  if (phone) lines.push(`Telefone: ${phone}`);
  if (tipo === 'delivery' && endereco) lines.push(`Endereço: ${endereco}`);
  if (tipo === 'retirada' && retirada) lines.push(`Retirada: ${retirada}`);
  if (obs) lines.push(`Obs: ${obs}`);

  lines.push('------------------------');
  lines.push(...(Array.isArray(item.itens) ? item.itens : []));
  lines.push('------------------------');
  lines.push(`Total: ${money(item.total)}`);
  lines.push('========================');

  return lines.join('\n');
}

$('#logout').onclick = () => {
  sessionStorage.removeItem('mk_admin_auth');
  sessionStorage.removeItem('mk_admin_user');
  location.href = 'admin-login.html';
};

$('#menu-toggle').onclick = () => $('#sidebar').classList.toggle('open');

function activatePage(pageKey) {
  $$('.nav-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.page === pageKey);
  });
  $$('.page').forEach((page) => {
    page.classList.toggle('active', page.id === pageKey);
  });
  $('#page-title').textContent = pages[pageKey] || 'Dashboard';
  $('#sidebar').classList.remove('open');
}

window.abrirConfiguracoes = () => {
  activatePage('config');
  carregarConfiguracoes(true);
  gerarMesas();
};

window.fecharConfiguracoes = () => {
  activatePage('dashboard');
  renderDashboard();
};

$$('.nav-btn').forEach((btn) => {
  btn.onclick = () => {
    if (btn.dataset.page === 'config') {
      abrirConfiguracoes();
      return;
    }
    activatePage(btn.dataset.page);
    renderAll();
  };
});

function renderDashboard() {
  const m = MKStore.metrics();
  $('#fat-hoje').textContent = money(m.faturamentoHoje);
  $('#fat-semana').textContent = money(m.faturamentoSemana);
  $('#fat-mes').textContent = money(m.faturamentoMes);
  $('#ticket-medio').textContent = money(m.ticketMedio);
  $('#pedidos-hoje-mini').textContent = `${m.pedidosHoje} pedidos`;

  const values = [
    { n: 'Hoje', v: m.faturamentoHoje },
    { n: 'Semana', v: m.faturamentoSemana },
    { n: 'Mês', v: m.faturamentoMes }
  ];
  const max = Math.max(...values.map((x) => x.v), 1);

  $('#sales-bars').innerHTML = values
    .map((x) => `<div class="bar-row"><strong>${x.n}</strong><div class="bar"><span style="width:${Math.max(4, (x.v / max) * 100)}%"></span></div><span>${money(x.v)}</span></div>`)
    .join('');

  $('#top-products').innerHTML = m.top.length
    ? m.top.map(([n, q]) => `<div class="top-item"><strong>${escapeHtml(n)}</strong><span class="badge">${q} vendidos</span></div>`).join('')
    : '<p class="muted">Ainda não há vendas suficientes.</p>';
}

function renderProducts() {
  const products = MKStore.products().slice().sort((a, b) => {
    return normalizeCategory(a.categoria).localeCompare(normalizeCategory(b.categoria), 'pt-BR')
      || a.nome.localeCompare(b.nome, 'pt-BR');
  });

  refreshProductCategoryOptions(productCategorySelect.value || 'Outros');

  $('#products-table').innerHTML = products
    .map((p) => {
      const pid = escapeJsString(p.id);
      return `
      <div class="row">
        <div>
          <img src="${escapeHtml(normalizeImage(p.imagem))}" alt="${escapeHtml(p.nome)}" style="width:46px;height:46px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-right:8px;border:1px solid #ead9cd;">
          <strong>${escapeHtml(p.nome)}</strong><br>
          <small>${escapeHtml(normalizeCategory(p.categoria))} | ${p.disponivel !== false ? 'Disponível' : 'Indisponível'} | ${p.origem === 'padrao' ? 'Padrão' : 'Admin'}</small>
        </div>
        <strong>${money(p.preco)}</strong>
        <span class="badge">${p.disponivel !== false ? 'Ativo' : 'Inativo'}</span>
        <div class="row-actions">
          <button class="ghost" onclick="editProduct('${pid}')">Editar</button>
          <button class="ghost" onclick="toggleProduct('${pid}')">${p.disponivel !== false ? 'Desativar' : 'Ativar'}</button>
          <button class="danger" onclick="deleteProduct('${pid}')">Excluir</button>
        </div>
      </div>
    `;
    })
    .join('');
}

$('#new-product').onclick = () => {
  $('#product-form').classList.remove('hidden');
  $('#product-form').reset();
  $('#product-id').value = '';
  refreshProductCategoryOptions('Outros');
  if (productCategorySelect) productCategorySelect.value = 'Outros';
  $('#product-active').checked = true;
  $('#product-featured').checked = false;
  if (productImageFileInput) productImageFileInput.value = '';
  currentProductImage = '';
  setProductImagePreview(PRODUCT_IMAGE_PLACEHOLDER);
};

$('#cancel-product').onclick = () => $('#product-form').classList.add('hidden');

if (productImageFileInput) {
  productImageFileInput.addEventListener('change', () => {
    const file = productImageFileInput.files?.[0];
    if (!file) {
      return;
    }

    const isImage = String(file.type || '').startsWith('image/');
    const maxSize = 3 * 1024 * 1024;
    if (!isImage) {
      alert('Arquivo inválido. Envie apenas imagem.');
      productImageFileInput.value = '';
      return;
    }
    if (file.size > maxSize) {
      alert('Imagem muito grande. Limite de 3MB.');
      productImageFileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      currentProductImage = String(reader.result || '');
      setProductImagePreview(currentProductImage);
    };
    reader.readAsDataURL(file);
  });
}

$('#product-form').onsubmit = (e) => {
  e.preventDefault();
  const list = MKStore.products();
  const id = $('#product-id').value || MKStore.uid('P');
  const existing = list.find((p) => p.id === id) || {};
  const nome = normalizeText($('#product-name').value);
  const preco = Number($('#product-price').value);
  if (!nome) {
    alert('Informe o nome do produto.');
    return;
  }
  if (isOutroProductName(nome)) {
    alert('Use um nome de produto válido. "Outro" não deve ser cadastrado como produto.');
    return;
  }
  if (!Number.isFinite(preco) || preco < 0) {
    alert('Informe um preço válido.');
    return;
  }
  const imagemFinal = normalizeImage(currentProductImage || existing.imagem);
  const data = {
    ...existing,
    id,
    nome,
    categoria: normalizeCategory($('#product-category').value),
    preco,
    imagem: imagemFinal,
    descricao: $('#product-desc').value.trim(),
    disponivel: $('#product-active').checked,
    destaque: $('#product-featured').checked,
    origem: existing.origem || 'admin',
    criadoEm: existing.criadoEm || new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
  const i = list.findIndex((p) => p.id === id);
  if (i >= 0) list[i] = data;
  else list.push(data);
  MKStore.saveProducts(list);
  $('#product-form').classList.add('hidden');
  currentProductImage = '';
  if (productImageFileInput) productImageFileInput.value = '';
  setProductImagePreview(PRODUCT_IMAGE_PLACEHOLDER);
  renderProducts();
  alert('Produto salvo com sucesso.');
};

window.editProduct = (id) => {
  const p = MKStore.products().find((x) => x.id === id);
  if (!p) return;
  $('#product-form').classList.remove('hidden');
  $('#product-id').value = p.id;
  $('#product-name').value = p.nome;
  refreshProductCategoryOptions(p.categoria || 'Outros');
  $('#product-category').value = normalizeCategory(p.categoria);
  $('#product-price').value = p.preco;
  $('#product-desc').value = p.descricao || '';
  $('#product-active').checked = p.disponivel !== false;
  $('#product-featured').checked = !!p.destaque;
  currentProductImage = p.imagem || '';
  if (productImageFileInput) productImageFileInput.value = '';
  setProductImagePreview(currentProductImage || PRODUCT_IMAGE_PLACEHOLDER);
};

window.toggleProduct = (id) => {
  const list = MKStore.products();
  const p = list.find((x) => x.id === id);
  if (!p) return;
  p.disponivel = p.disponivel === false;
  p.atualizadoEm = new Date().toISOString();
  MKStore.saveProducts(list);
  renderProducts();
};

window.deleteProduct = (id) => {
  if (!confirm('Excluir produto')) return;
  MKStore.saveProducts(MKStore.products().filter((p) => p.id !== id));
  renderProducts();
};

function renderPromos() {
  const styleLabel = {
    desconto: 'Desconto',
    combo: 'Combo',
    clone: 'Clone',
    destaque: 'Destaque'
  };

  const promos = MKStore.promos().slice().sort((a, b) => {
    return new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime();
  });

  if (!promos.length) {
    $('#promos-table').innerHTML = '<p class="muted">Nenhuma promoção cadastrada.</p>';
    return;
  }

  $('#promos-table').innerHTML = promos
    .map((p) => {
      const pid = escapeJsString(p.id);
      return `
      <div class="row">
        <div>
          <strong>${escapeHtml(p.nome)}</strong><br>
          <small>${escapeHtml(p.descricao || '')}</small><br>
          <small>Estilo: ${styleLabel[p.estiloPromocao] || 'Desconto'}</small>
          <small>${p.mostrarNoCardapioGeral ? ' | Também no cardápio geral' : ''}</small>
        </div>
        <strong>${money(p.precoPromocional)}</strong>
        <span class="badge">${p.ativa ? 'Ativa' : 'Inativa'}</span>
        <div class="row-actions">
          <button class="ghost" onclick="editPromo('${pid}')">Editar</button>
          <button class="ghost" onclick="togglePromoStatus('${pid}')">${p.ativa ? 'Desativar' : 'Ativar'}</button>
          <button class="danger" onclick="deletePromo('${pid}')">Excluir</button>
        </div>
      </div>
    `;
    })
    .join('');
}

$('#new-promo').onclick = () => {
  $('#promo-form').classList.remove('hidden');
  $('#promo-form').reset();
  $('#promo-id').value = '';
  $('#promo-style').value = 'desconto';
  $('#promo-image').value = 'img/hamb.gourmet.jpg';
  $('#promo-show-menu').checked = false;
  $('#promo-active').checked = true;
};

$('#cancel-promo').onclick = () => $('#promo-form').classList.add('hidden');

$('#promo-form').onsubmit = (e) => {
  e.preventDefault();
  const list = MKStore.promos();
  const id = $('#promo-id').value || MKStore.uid('PR');
  const existing = list.find((p) => p.id === id) || {};
  const nome = normalizeText($('#promo-name').value);
  const precoPromocional = Number($('#promo-price').value || 0);
  if (!nome) {
    alert('Informe o nome da promoção.');
    return;
  }
  if (!Number.isFinite(precoPromocional) || precoPromocional < 0) {
    alert('Informe um preço promocional válido.');
    return;
  }
  const data = {
    ...existing,
    id,
    nome,
    descricao: $('#promo-desc').value.trim(),
    precoPromocional,
    estiloPromocao: $('#promo-style').value,
    imagem: $('#promo-image').value.trim() || 'img/hamb.gourmet.jpg',
    ativa: $('#promo-active').checked,
    mostrarNoCardapioGeral: $('#promo-show-menu').checked,
    criadoEm: existing.criadoEm || new Date().toISOString()
  };
  const i = list.findIndex((p) => p.id === id);
  if (i >= 0) list[i] = data;
  else list.push(data);
  MKStore.savePromos(list);
  $('#promo-form').classList.add('hidden');
  renderPromos();
};

window.editPromo = (id) => {
  const p = MKStore.promos().find((x) => x.id === id);
  if (!p) return;
  $('#promo-form').classList.remove('hidden');
  $('#promo-id').value = p.id;
  $('#promo-name').value = p.nome || '';
  $('#promo-desc').value = p.descricao || '';
  $('#promo-price').value = p.precoPromocional || 0;
  $('#promo-style').value = p.estiloPromocao || 'desconto';
  $('#promo-image').value = p.imagem || 'img/hamb.gourmet.jpg';
  $('#promo-show-menu').checked = !!p.mostrarNoCardapioGeral;
  $('#promo-active').checked = !!p.ativa;
};

window.togglePromoStatus = (id) => {
  const list = MKStore.promos();
  const promo = list.find((x) => x.id === id);
  if (!promo) return;
  promo.ativa = !promo.ativa;
  MKStore.savePromos(list);
  renderPromos();
};

window.deletePromo = (id) => {
  if (!confirm('Excluir promoção')) return;
  MKStore.savePromos(MKStore.promos().filter((p) => p.id !== id));
  renderPromos();
};

function renderOrders() {
  const list = MKStore.orders().filter((order) => order && typeof order === 'object').slice().reverse();
  $('#orders-table').innerHTML = list.length
    ? list
      .map((o) => {
        const item = safeOrder(o);
        const oid = escapeJsString(item.id);
        const mesa = orderTable(o);
        const details = orderDetailsHtml(o);
        return `
          <div class="row order">
            <div>
              <strong>Pedido #${escapeHtml(item.codigo || item.id)}</strong><br>
              <small>${typeLabel(o)} ${mesa ? `| Mesa ${escapeHtml(mesa)}` : ''} | ${new Date(item.criadoEm || item.id || Date.now()).toLocaleString('pt-BR')}</small>
              ${details ? `<br>${details}` : ''}
              ${orderItemsHtml(o)}
            </div>
            <strong>${money(item.total)}</strong>
            <span class="badge">${escapeHtml(item.status || 'aguardando')}</span>
            <div class="row-actions">
              <button class="ghost" onclick="printOrder('${oid}')">Imprimir</button>
              <button class="ghost" onclick="advanceOrder('${oid}')">Avançar</button>
            </div>
          </div>
        `;
      })
      .join('')
    : '<p class="muted">Nenhum pedido ainda.</p>';
}

window.advanceOrder = (id) => {
  const list = MKStore.orders();
  const o = list.find((x) => String(x.id) === String(id));
  if (!o) return;

  const aliases = { recebidos: 'aguardando', entrega: 'entregue', finalizado: 'entregue' };
  const flow = ['aguardando', 'preparando', 'pronto', 'entregue'];
  const status = aliases[o.status] || o.status || 'aguardando';
  o.status = flow[Math.min(Math.max(flow.indexOf(status), 0) + 1, flow.length - 1)] || 'aguardando';
  o.atualizadoEm = new Date().toISOString();

  if (o.status === 'pronto') {
    MKStore.notifyClient(o, `Seu pedido #${o.codigo || o.id} está pronto!`);
  }

  MKStore.saveOrders(list);
  renderAll();
};

window.printOrder = (id) => {
  const o = MKStore.orders().find((x) => String(x.id) === String(id));
  if (!o) return;
  const w = window.open('', '', 'width=360,height=600');
  if (!w) {
    alert('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-up está ativo.');
    return;
  }
  w.document.write(`<pre style="font:16px monospace">${escapeHtml(buildOrderPrintText(o))}</pre>`);
  w.print();
};

$('#clear-finalized').onclick = () => {
  if (confirm('Remover pedidos finalizados')) {
    MKStore.saveOrders(MKStore.orders().filter((o) => !['entregue', 'finalizado'].includes(o.status)));
    renderOrders();
    renderDashboard();
  }
};

function sanitizeTableCount(value) {
  const count = Number.parseInt(value, 10);
  if (!Number.isFinite(count)) return DEFAULT_TABLES_COUNT;
  return Math.max(1, count);
}

function getTableCountFromConfig(config) {
  return sanitizeTableCount(config.quantidadeMesas ?? config.mesas ?? DEFAULT_TABLES_COUNT);
}

function updateTableSelects(totalMesas) {
  const optionsHtml = Array.from({ length: totalMesas }, (_, i) => {
    const value = String(i + 1).padStart(2, '0');
    return `<option value="${value}">Mesa ${value}</option>`;
  }).join('');

  document
    .querySelectorAll('select[data-mesa-select], select[name="numeroMesa"], select#numero-mesa')
    .forEach((select) => {
      const currentValue = select.value;
      select.innerHTML = optionsHtml;
      if (currentValue && Number(currentValue) >= 1 && Number(currentValue) <= totalMesas) {
        select.value = currentValue.padStart(2, '0');
      }
    });
}

window.gerarMesas = () => {
  const totalMesas = getTableCountFromConfig(MKStore.config());
  const base = location.href.replace(/admin\.html.*/, 'index.html');
  $('#tables-list').innerHTML = Array.from({ length: totalMesas }, (_, i) => {
    const mesa = String(i + 1).padStart(2, '0');
    const link = `${base}?mesa=${mesa}`;
    return `<div class="qr-card"><strong>Mesa ${mesa}</strong><code>${escapeHtml(link)}</code><button class="ghost" onclick="navigator.clipboard.writeText('${escapeJsString(link)}')">Copiar link</button></div>`;
  }).join('');
  updateTableSelects(totalMesas);
};

window.carregarConfiguracoes = (force = false) => {
  const config = MKStore.config();
  const totalMesas = getTableCountFromConfig(config);
  const input = $('#cfg-mesas');
  if (input && (force || document.activeElement !== input)) {
    input.value = totalMesas;
  }
  return { quantidadeMesas: totalMesas };
};

window.salvarConfiguracoes = (event) => {
  if (event) event.preventDefault();
  const totalMesas = sanitizeTableCount($('#cfg-mesas').value);
  MKStore.saveConfig({ quantidadeMesas: totalMesas });
  $('#cfg-mesas').value = totalMesas;
  gerarMesas();
  alert('Configurações salvas.');
};

$('#config-form').addEventListener('submit', salvarConfiguracoes);
$('#close-config')?.addEventListener('click', fecharConfiguracoes);

function clearSecurityFormFields() {
  const current = $('#sec-current-pass');
  const next = $('#sec-new-pass');
  const confirm = $('#sec-confirm-pass');
  if (current) current.value = '';
  if (next) next.value = '';
  if (confirm) confirm.value = '';
}

window.carregarCredenciais = (force = false) => {
  if (!window.MKStore || typeof MKStore.adminCredentials !== 'function') return null;
  const creds = MKStore.adminCredentials();
  const userInput = $('#sec-user');
  if (userInput && (force || document.activeElement !== userInput)) {
    userInput.value = creds.usuario || 'admin';
  }
  return creds;
};

window.salvarCredenciais = (event) => {
  if (event) event.preventDefault();
  if (!window.MKStore || typeof MKStore.adminCredentials !== 'function' || typeof MKStore.saveAdminCredentials !== 'function') {
    alert('Não foi possível atualizar as credenciais.');
    return;
  }

  const currentCreds = MKStore.adminCredentials();
  const usuario = normalizeText($('#sec-user').value);
  const senhaAtual = String($('#sec-current-pass').value || '');
  const novaSenha = String($('#sec-new-pass').value || '');
  const confirmarSenha = String($('#sec-confirm-pass').value || '');

  if (!usuario) {
    alert('Informe o usuário.');
    return;
  }

  if (senhaAtual !== currentCreds.senha) {
    alert('Senha atual incorreta.');
    return;
  }

  if (novaSenha.length < 4) {
    alert('A nova senha deve ter pelo menos 4 caracteres.');
    return;
  }

  if (novaSenha !== confirmarSenha) {
    alert('A confirmação da nova senha não confere.');
    return;
  }

  MKStore.saveAdminCredentials({ usuario, senha: novaSenha });
  clearSecurityFormFields();
  carregarCredenciais(true);
  alert('Credenciais atualizadas com sucesso. Faça login novamente.');
  sessionStorage.removeItem('mk_admin_auth');
  sessionStorage.removeItem('mk_admin_user');
  location.href = 'admin-login.html';
};

$('#security-form')?.addEventListener('submit', salvarCredenciais);
$('#cancel-security')?.addEventListener('click', () => {
  clearSecurityFormFields();
  carregarCredenciais(true);
});

function renderAll() {
  renderDashboard();
  renderProducts();
  renderPromos();
  renderOrders();
  gerarMesas();
  carregarConfiguracoes();
  carregarCredenciais();
}

function initAdmin() {
  renderAll();
}

initAdmin();
setInterval(renderAll, 3000);
window.addEventListener('mk-promos-updated', renderPromos);
window.addEventListener('mk-products-updated', renderProducts);
window.addEventListener('mk-config-updated', () => {
  gerarMesas();
  carregarConfiguracoes();
});
window.addEventListener('mk-auth-updated', () => {
  carregarCredenciais(true);
});
window.addEventListener('storage', (event) => {
  if (event.key === 'mk_produtos') renderProducts();
  if (event.key === 'mk_promocoes') renderPromos();
  if (event.key === 'mk_config' || event.key === 'configuracoesSistema') {
    gerarMesas();
    carregarConfiguracoes();
  }
  if (event.key === 'adminConfig') {
    carregarCredenciais(true);
  }
});
setProductImagePreview(PRODUCT_IMAGE_PLACEHOLDER);


