(() => {
  const KITCHEN_AUTH_KEY = 'mk_cozinha_auth';
  const KITCHEN_USER = 'cozinha';
  const KITCHEN_PASSWORD = '123456';
  const STATUS_FLOW = ['aguardando', 'preparando', 'pronto', 'entregue'];
  const STATUS_LABELS = {
    aguardando: 'Aguardando',
    preparando: 'Preparando',
    pronto: 'Prontos',
    entregue: 'Entregues'
  };
  const LEGACY_STATUS = {
    recebidos: 'aguardando',
    entrega: 'entregue',
    finalizado: 'entregue',
    finalizados: 'entregue'
  };

  let soundEnabled = false;
  let lastIds = new Set();
  let renderTimer = null;

  function isKitchenAuthenticated() {
    return sessionStorage.getItem(KITCHEN_AUTH_KEY) === 'ok';
  }

  function setKitchenLocked(locked) {
    document.body.classList.toggle('kitchen-locked', locked);
    document.querySelector('.kitchen-top')?.setAttribute('aria-hidden', locked ? 'true' : 'false');
    document.querySelector('.kitchen-board')?.setAttribute('aria-hidden', locked ? 'true' : 'false');
    document.getElementById('kitchen-login')?.setAttribute('aria-hidden', locked ? 'false' : 'true');
  }

  function showLoginError(message) {
    const error = document.getElementById('kitchen-login-error');
    if (error) error.textContent = message;
  }

  function clearLoginForm() {
    const userInput = document.getElementById('kitchen-user');
    const passInput = document.getElementById('kitchen-pass');
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';
  }

  function handleKitchenLogin(event) {
    event.preventDefault();
    const user = String(document.getElementById('kitchen-user')?.value || '').trim().toLowerCase();
    const password = String(document.getElementById('kitchen-pass')?.value || '');

    if (user === KITCHEN_USER && password === KITCHEN_PASSWORD) {
      sessionStorage.setItem(KITCHEN_AUTH_KEY, 'ok');
      showLoginError('');
      clearLoginForm();
      startKitchenPanel();
      return;
    }

    showLoginError('Usuário ou senha incorretos.');
  }

  function logoutKitchen() {
    sessionStorage.removeItem(KITCHEN_AUTH_KEY);
    if (renderTimer) {
      clearInterval(renderTimer);
      renderTimer = null;
    }
    lastIds = new Set();
    setKitchenLocked(true);
    clearColumns();
    showLoginError('');
    document.getElementById('kitchen-user')?.focus();
  }

  function startKitchenPanel() {
    if (!isKitchenAuthenticated()) {
      setKitchenLocked(true);
      return;
    }

    setKitchenLocked(false);
    lastIds = new Set(readOrders().map((order) => String(order.id)));
    render();

    if (!renderTimer) {
      renderTimer = setInterval(render, 3000);
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeJsString(value) {
    return String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n');
  }

  function readOrders() {
    if (window.MKStore && typeof MKStore.orders === 'function') {
      try {
        const orders = MKStore.orders();
        return Array.isArray(orders) ? orders : [];
      } catch (error) {
        console.warn(`Não foi possível ler pedidos pelo MKStore. ${error.message}`);
      }
    }

    try {
      const parsed = JSON.parse(localStorage.getItem('mk_pedidos') || '[]');
      if (Array.isArray(parsed)) return parsed;
      localStorage.setItem('mk_pedidos', '[]');
      return [];
    } catch (error) {
      console.warn(`mk_pedidos inválido. O painel será iniciado vazio. ${error.message}`);
      localStorage.setItem('mk_pedidos', '[]');
      return [];
    }
  }

  function saveOrders(orders) {
    const safeOrders = Array.isArray(orders) ? orders : [];
    if (window.MKStore && typeof MKStore.saveOrders === 'function') {
      MKStore.saveOrders(safeOrders);
      return;
    }

    localStorage.setItem('mk_pedidos', JSON.stringify(safeOrders));
  }

  function money(value) {
    if (window.MKStore?.BRL) {
      return MKStore.BRL.format(Number(value || 0));
    }

    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
      .format(Number(value || 0));
  }

  function normalizeStatus(status) {
    const raw = String(status || '').trim().toLowerCase();
    const mapped = LEGACY_STATUS[raw] || raw;
    return STATUS_FLOW.includes(mapped) ? mapped : 'aguardando';
  }

  function flowNext(status) {
    const normalized = normalizeStatus(status);
    const index = STATUS_FLOW.indexOf(normalized);
    return STATUS_FLOW[Math.min(index + 1, STATUS_FLOW.length - 1)];
  }

  function orderType(order) {
    return order.tipoPedido || order.tipo || 'retirada';
  }

  function typeLabel(order) {
    return {
      delivery: 'Delivery',
      mesa: 'Mesa',
      retirada: 'Retirada'
    }[orderType(order)] || 'Retirada';
  }

  function orderInfo(order) {
    return order?.dadosPedido && typeof order.dadosPedido === 'object' ? order.dadosPedido : {};
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

  function normalizeItems(order) {
    if (Array.isArray(order?.itens)) {
      return order?.itens.map((item) => String(item || '').trim()).filter(Boolean);
    }

    if (Array.isArray(order?.itensDetalhados)) {
      return order?.itensDetalhados.map((item) => {
        const qty = Number(item.qty || 1);
        const title = item.title || item.nome || 'Item';
        return `${qty}x ${title}`;
      });
    }

    return [];
  }

  function normalizeOrder(rawOrder, index) {
    const source = rawOrder && typeof rawOrder === 'object' ? rawOrder : {};
    const id = source.id || `pedido-${index}-${Date.now()}`;
    const createdAt = source.criadoEm || new Date().toISOString();

    return {
      ...source,
      id,
      codigo: source.codigo || `MK${String(id).slice(-6)}`,
      cliente: String(source.cliente || source.nome || 'Cliente').trim() || 'Cliente',
      total: Number(source.total || 0),
      itens: normalizeItems(source),
      status: normalizeStatus(source.status),
      tipoPedido: source.tipoPedido || source.tipo || 'retirada',
      criadoEm: createdAt,
      atualizadoEm: source.atualizadoEm || createdAt
    };
  }

  function getNormalizedOrders() {
    let changed = false;
    const orders = readOrders().map((order, index) => {
      const normalized = normalizeOrder(order, index);
      if (!order || typeof order !== 'object' || order.status !== normalized.status || !order.status) {
        changed = true;
      }
      return normalized;
    });

    if (changed) {
      saveOrders(orders);
    }

    return orders;
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
      // Som e bloqueio de autoplay variam por navegador.
    }
  }

  function ageTag(order) {
    const time = new Date(order.criadoEm || order.id || Date.now()).getTime();
    const min = Math.max(0, Math.floor((Date.now() - time) / 60000));
    let cls = 'ok';
    if (min >= 20) cls = 'late';
    else if (min >= 10) cls = 'warn';
    return `<span class="tag ${cls}">${min} min</span>`;
  }

  function renderOrderDetailsHtml(order) {
    const tipo = orderType(order);
    const details = [];

    const phone = orderPhone(order);
    if (phone) details.push(`<p><strong>Telefone:</strong> ${escapeHtml(phone)}</p>`);

    if (tipo === 'delivery') {
      const endereco = formatAddress(order);
      if (endereco) details.push(`<p><strong>Endereço:</strong> ${escapeHtml(endereco)}</p>`);
    }

    if (tipo === 'retirada') {
      const horario = orderPickupTime(order);
      if (horario) details.push(`<p><strong>Retirada:</strong> ${escapeHtml(horario)}</p>`);
    }

    const obs = orderNotes(order);
    if (obs) details.push(`<p><strong>Observação:</strong> ${escapeHtml(obs)}</p>`);

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
      `Pedido #${order.codigo || order.id}`,
      `Tipo: ${typeLabel(order)}${mesa ? ` | Mesa ${mesa}` : ''}`,
      `Cliente: ${order.cliente || 'Cliente'}`
    ];

    if (phone) lines.push(`Telefone: ${phone}`);
    if (tipo === 'delivery' && endereco) lines.push(`Endereço: ${endereco}`);
    if (tipo === 'retirada' && horario) lines.push(`Retirada: ${horario}`);
    if (obs) lines.push(`Obs: ${obs}`);

    lines.push('------------------------');
    lines.push(...(order?.itens || []));
    lines.push('------------------------');
    lines.push(`Total: ${money(order.total)}`);
    lines.push('========================');

    return lines.join('\n');
  }

  function clearColumns() {
    STATUS_FLOW.forEach((status) => {
      const col = document.getElementById(status);
      if (!col) return;
      col.innerHTML = `<h2>${STATUS_LABELS[status]}</h2><p class="empty-column">Nenhum pedido nesta etapa.</p>`;
    });
  }

  function render() {
    if (!isKitchenAuthenticated()) return;

    const list = getNormalizedOrders();
    const ids = new Set(list.map((order) => String(order.id)));
    const hasNew = list.some((order) => !lastIds.has(String(order.id)) && normalizeStatus(order.status) === 'aguardando');

    clearColumns();
    if (hasNew) beep();

    list.forEach((order) => {
      const status = normalizeStatus(order.status);
      const col = document.getElementById(status) || document.getElementById('aguardando');
      if (!col) return;

      const empty = col.querySelector('.empty-column');
      if (empty) empty.remove();

      const mesa = orderTable(order);
      const safeId = escapeHtml(order.id);
      const card = document.createElement('article');
      card.className = `k-card ${!lastIds.has(String(order.id)) ? 'new' : ''}`;
      card.dataset.orderId = String(order.id);

      const items = order?.itens.length
        ? order?.itens.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>Itens não informados</li>';

      card.innerHTML = `
        <header><strong>#${escapeHtml(order.codigo || order.id)}</strong><span>${money(order.total)}</span></header>
        <div class="meta"><span class="tag">${typeLabel(order)}</span>${mesa ? `<span class="tag">Mesa ${escapeHtml(mesa)}</span>` : ''}${ageTag(order)}</div>
        <p><strong>Cliente:</strong> ${escapeHtml(order.cliente || 'Cliente')}</p>
        ${renderOrderDetailsHtml(order)}
        <ul>${items}</ul>
        <div class="k-actions">
          <button class="print" type="button" data-print="${safeId}">Imprimir</button>
          ${status !== 'entregue' ? `<button class="done" type="button" data-advance="${safeId}">Avançar</button>` : ''}
        </div>
      `;

      col.appendChild(card);
    });

    lastIds = ids;
  }

  function advance(id) {
    const list = getNormalizedOrders();
    const order = list.find((item) => String(item.id) === String(id));
    if (!order) return;

    order.status = flowNext(order.status);
    order.atualizadoEm = new Date().toISOString();

    if (order.status === 'pronto' && window.MKStore.notifyClient) {
      MKStore.notifyClient(order, `Seu pedido #${order.codigo || order.id} está pronto!`);
    }

    saveOrders(list);
    render();
  }

  function printOrder(id) {
    const order = getNormalizedOrders().find((item) => String(item.id) === String(id));
    if (!order) return;

    const w = window.open('', '', 'width=360,height=600');
    if (!w) {
      alert('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-up está ativo.');
      return;
    }
    w.document.write(`<pre style="font:16px monospace">${escapeHtml(printText(order))}</pre>`);
    w.print();
  }

  function clearDelivered() {
    const activeOrders = getNormalizedOrders().filter((order) => normalizeStatus(order.status) !== 'entregue');
    saveOrders(activeOrders);
    render();
  }

  document.addEventListener('click', (event) => {
    const advanceButton = event.target.closest('[data-advance]');
    if (advanceButton) {
      advance(advanceButton.dataset.advance);
      return;
    }

    const printButton = event.target.closest('[data-print]');
    if (printButton) {
      printOrder(printButton.dataset.print);
    }
  });

  document.getElementById('enable-sound')?.addEventListener('click', () => {
    soundEnabled = true;
    beep();
    alert('Som ativado. A cozinha tocará um alerta quando chegar pedido novo.');
  });

  document.getElementById('btn-limpar-finalizados')?.addEventListener('click', clearDelivered);
  document.getElementById('kitchen-login-form')?.addEventListener('submit', handleKitchenLogin);
  document.getElementById('kitchen-logout')?.addEventListener('click', logoutKitchen);

  window.addEventListener('storage', (event) => {
    if (event.key === 'mk_pedidos' && isKitchenAuthenticated()) render();
  });
  window.addEventListener('mk-orders-updated', () => {
    if (isKitchenAuthenticated()) render();
  });

  window.advanceKitchenOrder = advance;
  window.printKitchenOrder = printOrder;

  if (isKitchenAuthenticated()) {
    startKitchenPanel();
  } else {
    setKitchenLocked(true);
    document.getElementById('kitchen-user')?.focus();
  }
})();
