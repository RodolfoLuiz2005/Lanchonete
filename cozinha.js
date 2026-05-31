function hasValidAdminSession() {
  if (sessionStorage.getItem('mk_admin_auth') !== 'ok') return false;
  if (!window.MKStore || typeof MKStore.adminCredentials !== 'function') return false;
  const sessionUser = String(sessionStorage.getItem('mk_admin_user') || '').trim().toLowerCase();
  const currentUser = String(MKStore.adminCredentials().usuario || '').trim().toLowerCase();
  return !!sessionUser && sessionUser === currentUser;
}

if (!hasValidAdminSession()) {
  location.href = 'admin-login.html';
}

let lastIds = new Set(MKStore.orders().map((o) => String(o.id)));
let soundEnabled = false;

const money = (v) => MKStore.BRL.format(Number(v || 0));

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

function beep() {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 240);
  } catch (error) {
    // ignore sound errors
  }
}

document.getElementById('enable-sound').onclick = () => {
  soundEnabled = true;
  beep();
  alert('Som ativado. A cozinha tocara um alerta quando chegar pedido novo.');
};

function ageTag(order) {
  const min = Math.floor((Date.now() - new Date(order.criadoEm || order.id).getTime()) / 60000);
  let cls = 'ok';
  if (min >= 20) cls = 'late';
  else if (min >= 10) cls = 'warn';
  return `<span class="tag ${cls}">${min} min</span>`;
}

function flowNext(status) {
  return {
    recebidos: 'preparando',
    preparando: 'pronto',
    pronto: 'entrega',
    entrega: 'finalizado'
  }[status] || 'finalizado';
}

function orderType(order) {
  return order?.tipoPedido || order?.tipo || 'retirada';
}

function typeLabel(order) {
  return {
    delivery: 'Delivery',
    mesa: 'Mesa',
    retirada: 'Retirada'
  }[orderType(order)] || 'Retirada';
}

function orderInfo(order) {
  return order?.dadosPedido || {};
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
  return order.endereco || '';
}

function orderNotes(order) {
  const info = orderInfo(order);
  return info.observacaoPedido || info.observacao || order.observacao || '';
}

function orderPickupTime(order) {
  const info = orderInfo(order);
  return info.horarioRetirada || order.horarioRetirada || '';
}

function orderPhone(order) {
  return order.telefone || orderInfo(order).telefone || '';
}

function orderTable(order) {
  return order.mesa || orderInfo(order).numeroMesa || '';
}

function renderOrderDetailsHtml(order) {
  const tipo = orderType(order);
  const details = [];

  const phone = orderPhone(order);
  if (phone) {
    details.push(`<p><strong>Telefone:</strong> ${escapeHtml(phone)}</p>`);
  }

  if (tipo === 'delivery') {
    const endereco = formatAddress(order);
    if (endereco) {
      details.push(`<p><strong>Endereco:</strong> ${escapeHtml(endereco)}</p>`);
    }
  }

  if (tipo === 'retirada') {
    const horario = orderPickupTime(order);
    if (horario) {
      details.push(`<p><strong>Retirada:</strong> ${escapeHtml(horario)}</p>`);
    }
  }

  const obs = orderNotes(order);
  if (obs) {
    details.push(`<p><strong>Observacao:</strong> ${escapeHtml(obs)}</p>`);
  }

  return details.join('');
}

function printText(order) {
  const tipo = orderType(order);
  const mesa = orderTable(order);
  const endereco = formatAddress(order);
  const phone = orderPhone(order);
  const horario = orderPickupTime(order);
  const obs = orderNotes(order);

  const lines = [
    '========================',
    `Pedido #${escapeHtml(order.codigo || order.id)}`,
    `Tipo: ${typeLabel(order)}${mesa ? ` | Mesa ${escapeHtml(mesa)}` : ''}`,
    `Cliente: ${escapeHtml(order.cliente || 'Cliente')}`
  ];

  if (phone) lines.push(`Telefone: ${escapeHtml(phone)}`);
  if (tipo === 'delivery' && endereco) lines.push(`Endereco: ${escapeHtml(endereco)}`);
  if (tipo === 'retirada' && horario) lines.push(`Retirada: ${escapeHtml(horario)}`);
  if (obs) lines.push(`Obs: ${escapeHtml(obs)}`);

  lines.push('------------------------');
  lines.push(...(order.itens || []));
  lines.push('------------------------');
  lines.push(`Total: ${money(order.total)}`);
  lines.push('========================');

  return lines.join('\n');
}

function advance(id) {
  const list = MKStore.orders();
  const order = list.find((item) => String(item.id) === String(id));
  if (!order) return;

  order.status = flowNext(order.status);
  order.atualizadoEm = new Date().toISOString();

  if (order.status === 'pronto') {
    MKStore.notifyClient(order, `Seu pedido #${order.codigo || order.id} esta pronto!`);
  }

  MKStore.saveOrders(list);
  render();
}

function printOrder(id) {
  const order = MKStore.orders().find((item) => String(item.id) === String(id));
  if (!order) return;

  const w = window.open('', '', 'width=360,height=600');
  if (!w) {
    alert('Nao foi possivel abrir a janela de impressao. Verifique se o bloqueador de pop-up esta ativo.');
    return;
  }
  w.document.write(`<pre style="font:16px monospace">${escapeHtml(printText(order))}</pre>`);
  w.print();
}

function render() {
  const statuses = ['recebidos', 'preparando', 'pronto', 'entrega', 'finalizado'];
  statuses.forEach((status) => {
    document.getElementById(status).innerHTML = `<h2>${{
      recebidos: 'Recebidos',
      preparando: 'Preparando',
      pronto: 'Prontos',
      entrega: 'Entrega',
      finalizado: 'Finalizados'
    }[status]}</h2>`;
  });

  const list = MKStore.orders();
  const ids = new Set(list.map((order) => String(order.id)));
  const hasNew = list.some((order) => !lastIds.has(String(order.id)) && order.status === 'recebidos');

  if (hasNew) beep();

  list.forEach((order) => {
    const col = document.getElementById(order.status || 'recebidos');
    if (!col) return;

    const mesa = orderTable(order);
    const safeId = escapeJsString(order.id);
    const card = document.createElement('article');
    card.className = `k-card ${!lastIds.has(String(order.id)) ? 'new' : ''}`;

    card.innerHTML = `
      <header><strong>#${escapeHtml(order.codigo || order.id)}</strong><span>${money(order.total)}</span></header>
      <div class="meta"><span class="tag">${typeLabel(order)}</span>${mesa ? `<span class="tag">Mesa ${escapeHtml(mesa)}</span>` : ''}${ageTag(order)}</div>
      <p><strong>Cliente:</strong> ${escapeHtml(order.cliente || 'Cliente')}</p>
      ${renderOrderDetailsHtml(order)}
      <ul>${(order.itens || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <div class="k-actions"><button class="print" onclick="printOrder('${safeId}')">Imprimir</button>${order.status !== 'finalizado' ? `<button class="done" onclick="advance('${safeId}')">Avancar</button>` : ''}</div>
    `;

    col.appendChild(card);
  });

  lastIds = ids;
}

window.advance = advance;
window.printOrder = printOrder;
render();
setInterval(render, 3000);
