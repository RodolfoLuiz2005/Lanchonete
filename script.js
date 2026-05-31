const btnMenu = document.getElementById('btn-menu');
const menu = document.getElementById('menu');
const overlay = document.getElementById('overlay-menu');
const btnFechar = document.getElementById('btn-fechar');

if (btnMenu && menu) {
    btnMenu.addEventListener('click', () => {
        menu.classList.add('abrir-menu');
    });
}

if (btnFechar && menu) {
    btnFechar.addEventListener('click', () => {
        menu.classList.remove('abrir-menu');
    });
}

if (overlay && menu) {
    overlay.addEventListener('click', () => {
        menu.classList.remove('abrir-menu');
    });
}

const ORDER_CONTEXT_KEY = 'mk_order_context';

function getOrderContext() {
    try {
        return JSON.parse(localStorage.getItem(ORDER_CONTEXT_KEY) || 'null');
    } catch (error) {
        return null;
    }
}

function saveOrderContext(context) {
    localStorage.setItem(ORDER_CONTEXT_KEY, JSON.stringify(context));
}

function getTipoPedido(rawOrder) {
    return rawOrder?.tipoPedido || rawOrder?.tipo || '';
}

function tipoPedidoLabel(tipoPedido) {
    const labels = {
        delivery: 'Delivery',
        mesa: 'Estou na loja / mesa',
        retirada: 'Vou pedir de casa e retirar na loja'
    };
    return labels[tipoPedido] || 'Nao informado';
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildAddressLine(endereco) {
    if (!endereco) return '';

    const linhaPrincipal = [endereco.rua, endereco.numero, endereco.bairro]
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .join(', ');

    const complementares = [endereco.complemento, endereco.pontoReferencia]
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .join(' | ');

    if (!linhaPrincipal) return complementares;
    if (!complementares) return linhaPrincipal;
    return `${linhaPrincipal} | ${complementares}`;
}

function buildOrderSummaryHtml(info) {
    if (!info || !info.tipoPedido) {
        return '';
    }

    const base = [
        `<h3>${escapeHtml(tipoPedidoLabel(info.tipoPedido))}</h3>`,
        `<p><strong>Nome:</strong> ${escapeHtml(info.nome)}</p>`,
        `<p><strong>Telefone:</strong> ${escapeHtml(info.telefone)}</p>`
    ];

    if (info.tipoPedido === 'delivery') {
        const endereco = buildAddressLine(info.endereco);
        if (endereco) {
            base.push(`<p><strong>Endereco:</strong> ${escapeHtml(endereco)}</p>`);
        }
        if (info.observacaoPedido) {
            base.push(`<p><strong>Observacao:</strong> ${escapeHtml(info.observacaoPedido)}</p>`);
        }
    }

    if (info.tipoPedido === 'mesa') {
        base.push(`<p><strong>Mesa:</strong> ${escapeHtml(info.numeroMesa)}</p>`);
    }

    if (info.tipoPedido === 'retirada') {
        if (info.horarioRetirada) {
            base.push(`<p><strong>Horario retirada:</strong> ${escapeHtml(info.horarioRetirada)}</p>`);
        }
        if (info.observacao) {
            base.push(`<p><strong>Observacao:</strong> ${escapeHtml(info.observacao)}</p>`);
        }
    }

    return base.join('');
}

function isOrderContextValid(info) {
    if (!info || !info.tipoPedido || !info.nome || !info.telefone) {
        return false;
    }

    if (info.tipoPedido === 'delivery') {
        return !!(
            info.endereco &&
            info.endereco.rua &&
            info.endereco.numero &&
            info.endereco.bairro
        );
    }

    if (info.tipoPedido === 'mesa') {
        return !!info.numeroMesa;
    }

    if (info.tipoPedido === 'retirada') {
        return !!info.horarioRetirada;
    }

    return false;
}

const btnDelivery = document.getElementById('btn-delivery');
const btnPedirRetirar = document.getElementById('btn-pedir-retirar');
const orderIntakeOverlay = document.getElementById('order-intake-overlay');
const orderIntakeModal = document.getElementById('order-intake-modal');
const orderIntakeClose = document.getElementById('order-intake-close');
const orderIntakeTitle = document.getElementById('order-intake-title');
const orderIntakeBody = document.getElementById('order-intake-body');

function openOrderIntakeModal() {
    if (!orderIntakeModal || !orderIntakeOverlay) return;

    orderIntakeModal.classList.add('active');
    orderIntakeOverlay.classList.add('active');
    orderIntakeModal.removeAttribute('hidden');
    orderIntakeOverlay.removeAttribute('hidden');
    orderIntakeModal.setAttribute('aria-hidden', 'false');
}

function closeOrderIntakeModal() {
    if (!orderIntakeModal || !orderIntakeOverlay) return;

    orderIntakeModal.classList.remove('active');
    orderIntakeOverlay.classList.remove('active');
    orderIntakeModal.setAttribute('hidden', '');
    orderIntakeOverlay.setAttribute('hidden', '');
    orderIntakeModal.setAttribute('aria-hidden', 'true');
}

function mountDeliveryForm() {
    if (!orderIntakeTitle || !orderIntakeBody) return;

    const current = getOrderContext();
    const saved = current?.tipoPedido === 'delivery' ? current : {};
    const endereco = saved.endereco || {};

    orderIntakeTitle.textContent = 'Dados para delivery';
    orderIntakeBody.innerHTML = `
        <form class="order-intake-form" id="delivery-form">
            <input name="nome" placeholder="Nome" value="${escapeHtml(saved.nome || '')}" required>
            <input name="telefone" placeholder="Telefone" value="${escapeHtml(saved.telefone || '')}" required>
            <input name="rua" placeholder="Rua" value="${escapeHtml(endereco.rua || '')}" required>
            <input name="numero" placeholder="Numero" value="${escapeHtml(endereco.numero || '')}" required>
            <input name="bairro" placeholder="Bairro" value="${escapeHtml(endereco.bairro || '')}" required>
            <input name="complemento" placeholder="Complemento" value="${escapeHtml(endereco.complemento || '')}">
            <input name="pontoReferencia" placeholder="Ponto de referencia" value="${escapeHtml(endereco.pontoReferencia || '')}">
            <textarea name="observacaoPedido" placeholder="Observacao do pedido">${escapeHtml(saved.observacaoPedido || '')}</textarea>
            <div class="order-intake-actions">
                <button type="submit" class="save">Salvar dados</button>
            </div>
        </form>
    `;

    const form = document.getElementById('delivery-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(form);

        const context = {
            tipoPedido: 'delivery',
            nome: String(data.get('nome') || '').trim(),
            telefone: String(data.get('telefone') || '').trim(),
            endereco: {
                rua: String(data.get('rua') || '').trim(),
                numero: String(data.get('numero') || '').trim(),
                bairro: String(data.get('bairro') || '').trim(),
                complemento: String(data.get('complemento') || '').trim(),
                pontoReferencia: String(data.get('pontoReferencia') || '').trim()
            },
            observacaoPedido: String(data.get('observacaoPedido') || '').trim()
        };

        if (!isOrderContextValid(context)) {
            alert('Preencha todos os campos obrigatorios do delivery.');
            return;
        }

        saveOrderContext(context);
        renderCartOrderSummary();
        closeOrderIntakeModal();
        alert('Dados do delivery salvos.');
    });

    openOrderIntakeModal();
}

function mountMesaForm() {
    if (!orderIntakeTitle || !orderIntakeBody) return;

    const current = getOrderContext();
    const saved = current?.tipoPedido === 'mesa' ? current : {};

    orderIntakeTitle.textContent = 'Estou na loja / mesa';
    orderIntakeBody.innerHTML = `
        <form class="order-intake-form" id="mesa-form">
            <input name="nome" placeholder="Nome" value="${escapeHtml(saved.nome || '')}" required>
            <input name="telefone" placeholder="Telefone" value="${escapeHtml(saved.telefone || '')}" required>
            <input name="numeroMesa" placeholder="Numero da mesa" value="${escapeHtml(saved.numeroMesa || '')}" required>
            <div class="order-intake-actions">
                <button type="button" class="back" id="back-to-choice">Voltar</button>
                <button type="submit" class="save">Salvar dados</button>
            </div>
        </form>
    `;

    const form = document.getElementById('mesa-form');
    const backButton = document.getElementById('back-to-choice');

    if (backButton) {
        backButton.addEventListener('click', mountRetiradaChoice);
    }

    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(form);

        const context = {
            tipoPedido: 'mesa',
            nome: String(data.get('nome') || '').trim(),
            telefone: String(data.get('telefone') || '').trim(),
            numeroMesa: String(data.get('numeroMesa') || '').trim()
        };

        if (!isOrderContextValid(context)) {
            alert('Preencha todos os campos obrigatorios da mesa.');
            return;
        }

        saveOrderContext(context);
        renderCartOrderSummary();
        closeOrderIntakeModal();
        alert('Dados da mesa salvos.');
    });

    openOrderIntakeModal();
}

function mountRetiradaForm() {
    if (!orderIntakeTitle || !orderIntakeBody) return;

    const current = getOrderContext();
    const saved = current?.tipoPedido === 'retirada' ? current : {};

    orderIntakeTitle.textContent = 'Vou pedir de casa e retirar na loja';
    orderIntakeBody.innerHTML = `
        <form class="order-intake-form" id="retirada-form">
            <input name="nome" placeholder="Nome" value="${escapeHtml(saved.nome || '')}" required>
            <input name="telefone" placeholder="Telefone" value="${escapeHtml(saved.telefone || '')}" required>
            <input name="horarioRetirada" placeholder="Horario aproximado para retirada" value="${escapeHtml(saved.horarioRetirada || '')}" required>
            <textarea name="observacao" placeholder="Observacao">${escapeHtml(saved.observacao || '')}</textarea>
            <div class="order-intake-actions">
                <button type="button" class="back" id="back-to-choice">Voltar</button>
                <button type="submit" class="save">Salvar dados</button>
            </div>
        </form>
    `;

    const form = document.getElementById('retirada-form');
    const backButton = document.getElementById('back-to-choice');

    if (backButton) {
        backButton.addEventListener('click', mountRetiradaChoice);
    }

    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(form);

        const context = {
            tipoPedido: 'retirada',
            nome: String(data.get('nome') || '').trim(),
            telefone: String(data.get('telefone') || '').trim(),
            horarioRetirada: String(data.get('horarioRetirada') || '').trim(),
            observacao: String(data.get('observacao') || '').trim()
        };

        if (!isOrderContextValid(context)) {
            alert('Preencha todos os campos obrigatorios da retirada.');
            return;
        }

        saveOrderContext(context);
        renderCartOrderSummary();
        closeOrderIntakeModal();
        alert('Dados da retirada salvos.');
    });

    openOrderIntakeModal();
}

function mountRetiradaChoice() {
    if (!orderIntakeTitle || !orderIntakeBody) return;

    orderIntakeTitle.textContent = 'Pedir e retirar';
    orderIntakeBody.innerHTML = `
        <p>Escolha como voce vai retirar:</p>
        <div class="order-choice-buttons">
            <button type="button" id="order-choice-mesa">Estou na loja / mesa</button>
            <button type="button" id="order-choice-retirada">Vou pedir de casa e retirar na loja</button>
        </div>
    `;

    const mesaButton = document.getElementById('order-choice-mesa');
    const retiradaButton = document.getElementById('order-choice-retirada');

    if (mesaButton) {
        mesaButton.addEventListener('click', mountMesaForm);
    }

    if (retiradaButton) {
        retiradaButton.addEventListener('click', mountRetiradaForm);
    }

    openOrderIntakeModal();
}

if (btnDelivery) {
    btnDelivery.addEventListener('click', mountDeliveryForm);
}

if (btnPedirRetirar) {
    btnPedirRetirar.addEventListener('click', mountRetiradaChoice);
}

if (orderIntakeClose) {
    orderIntakeClose.addEventListener('click', closeOrderIntakeModal);
}

if (orderIntakeOverlay) {
    orderIntakeOverlay.addEventListener('click', closeOrderIntakeModal);
}

const productsContainer = document.querySelector('section.main-cards .interface');
const modal = document.getElementById('product-modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalPrice = document.getElementById('modal-price');
const qtyDecrease = document.getElementById('qty-decrease');
const qtyIncrease = document.getElementById('qty-increase');
const qtyValue = document.getElementById('qty-value');
const addToCartBtn = document.getElementById('add-to-cart');
const cartCount = document.getElementById('cart-count');
const cartButton = document.getElementById('btn-carrinho');
const cartPanel = document.getElementById('cart-panel');
const cartPanelOverlay = document.getElementById('cart-panel-overlay');
const cartClose = document.getElementById('cart-close');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const finalizeButton = document.getElementById('btn-finalize');
const cartOrderSummary = document.getElementById('cart-order-summary');

let currentQty = 1;
let currentProduct = null;

function formatPrice(value) {
    return 'R$ ' + Number(value || 0).toFixed(2).replace('.', ',');
}

function parsePrice(priceText) {
    if (!priceText) return 0;
    const cleaned = priceText.replace(/[^0-9,\.]/g, '').replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(cleaned) || 0;
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function getCart() {
    try {
        const data = JSON.parse(localStorage.getItem('mk_cart') || '[]');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('mk_cart', JSON.stringify(cart));
}

function getOrders() {
    try {
        const data = JSON.parse(localStorage.getItem('mk_pedidos') || '[]');
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
}

function saveOrders(orders) {
    localStorage.setItem('mk_pedidos', JSON.stringify(orders));
}

function updateCartCount() {
    if (!cartCount) return;
    const cart = getCart();
    const totalQty = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
    cartCount.textContent = totalQty;
}

function getProductFromCard(card) {
    const title = card.querySelector('.card-info h2')?.textContent.trim() || '';
    const desc = card.querySelector('.card-info p')?.textContent.trim() || '';
    const priceText = card.querySelector('.card-info h4')?.textContent.trim() || 'R$ 0,00';
    const price = parsePrice(priceText);
    const img = card.querySelector('img')?.src || '';

    return {
        title,
        desc,
        price,
        img,
        category: card.dataset.category || ''
    };
}

function addToCart(product, qty = 1) {
    const cart = getCart();
    const existing = cart.find((item) =>
        item.title === product.title &&
        JSON.stringify(item.acompanhamentos) === JSON.stringify(product.acompanhamentos) &&
        JSON.stringify(item.adicionais || []) === JSON.stringify(product.adicionais || []) &&
        item.calda === product.calda &&
        Number(item.adicional || 0) === Number(product.adicional || 0)
    );

    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({
            title: product.title,
            desc: product.desc,
            price: product.price,
            qty,
            acompanhamentos: product.acompanhamentos || [],
            adicionais: product.adicionais || [],
            calda: product.calda || '',
            adicional: product.adicional || 0
        });
    }

    saveCart(cart);
    updateCartCount();
}

function renderCartOrderSummary() {
    if (!cartOrderSummary) return;

    const info = getOrderContext();
    const html = buildOrderSummaryHtml(info);

    if (!html) {
        cartOrderSummary.classList.remove('active');
        cartOrderSummary.innerHTML = '';
        return;
    }

    cartOrderSummary.classList.add('active');
    cartOrderSummary.innerHTML = html;
}

function renderCart() {
    const cart = getCart();
    renderCartOrderSummary();

    cartItemsContainer.innerHTML = '';

    const orderContext = getOrderContext();
    if (!orderContext || !orderContext.tipoPedido) {
        const warning = document.createElement('p');
        warning.className = 'cart-order-warning';
        warning.textContent = 'Antes de finalizar, escolha Delivery ou Pedir e retirar e preencha seus dados.';
        cartItemsContainer.appendChild(warning);
    }

    if (cart.length === 0) {
        cartItemsContainer.innerHTML += '<p class="empty-cart">Carrinho vazio</p>';
        cartTotal.textContent = 'R$ 0,00';
        return;
    }

    let total = 0;

    cart.forEach((item, index) => {
        const subtotal = item.price * item.qty;
        total += subtotal;

        const card = document.createElement('div');
        card.className = 'cart-item';
        card.innerHTML = `
            <button class="cart-item-remove">×</button>
            <h3>${escapeHtml(item.title)}</h3>
            ${item.acompanhamentos?.length ? `<span><strong>Acompanhamentos:</strong> ${escapeHtml(item.acompanhamentos.join(', '))}</span>` : ''}
            ${item.adicionais?.length ? `<span><strong>Adicionais:</strong> ${escapeHtml(item.adicionais.join(', '))}</span>` : ''}
            ${item.calda ? `<span><strong>Calda:</strong> ${escapeHtml(item.calda)}</span>` : ''}
            <span>Qtd: ${item.qty}</span>
            <span>Subtotal: ${formatPrice(subtotal)}</span>
        `;

        const removeButton = card.querySelector('.cart-item-remove');
        removeButton.addEventListener('click', () => {
            removeFromCart(index);
        });

        cartItemsContainer.appendChild(card);
    });

    cartTotal.textContent = formatPrice(total);
}

function removeFromCart(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    updateCartCount();
    renderCart();
}

function finalizeOrder() {
    const cart = getCart();

    if (cart.length === 0) {
        alert('Carrinho vazio');
        return;
    }

    const orderContext = getOrderContext();
    if (!isOrderContextValid(orderContext)) {
        alert('Preencha os dados do pedido em Delivery ou Pedir e retirar antes de finalizar.');
        return;
    }

    const pedidos = getOrders();
    const tipoPedido = getTipoPedido(orderContext);
    const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    const novoPedido = {
        id: Date.now(),
        codigo: 'MK' + String(Date.now()).slice(-6),
        cliente: orderContext.nome || 'Cliente',
        telefone: orderContext.telefone || '',
        tipoPedido,
        tipo: tipoPedido,
        mesa: tipoPedido === 'mesa' ? (orderContext.numeroMesa || '') : '',
        endereco: tipoPedido === 'delivery' ? buildAddressLine(orderContext.endereco) : '',
        observacao: tipoPedido === 'delivery'
            ? (orderContext.observacaoPedido || '')
            : (orderContext.observacao || ''),
        horarioRetirada: orderContext.horarioRetirada || '',
        dadosPedido: orderContext,
        total,
        itens: cart.map((item) => `${item.qty || 1}x ${item.title}`),
        itensDetalhados: cart,
        status: 'recebidos',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
    };

    pedidos.push(novoPedido);
    saveOrders(pedidos);
    localStorage.removeItem('mk_cart');

    alert('Pedido enviado para a cozinha!');
    updateCartCount();
    closeCartPanel();
}

function openCart() {
    renderCart();
    cartPanel.classList.add('active');
    cartPanelOverlay.classList.add('active');
    cartPanel.removeAttribute('hidden');
    cartPanelOverlay.removeAttribute('hidden');
    cartPanel.setAttribute('aria-hidden', 'false');
}

function closeCartPanel() {
    cartPanel.classList.remove('active');
    cartPanelOverlay.classList.remove('active');
    cartPanel.setAttribute('hidden', '');
    cartPanelOverlay.setAttribute('hidden', '');
    cartPanel.setAttribute('aria-hidden', 'true');
}

function openModal(product) {
    currentProduct = product;
    currentQty = 1;

    modalImage.src = product.img;
    modalTitle.textContent = product.title;
    modalDesc.textContent = product.desc;
    modalPrice.textContent = formatPrice(product.price);
    qtyValue.textContent = currentQty;

    const extrasContainer = document.getElementById('extras-container');
    if (product.category === 'acai') {
        extrasContainer.style.display = 'block';
    } else {
        extrasContainer.style.display = 'none';
    }

    modal.classList.add('active');
    modalOverlay.classList.add('active');
    modal.removeAttribute('hidden');
    modalOverlay.removeAttribute('hidden');
}

function closeModal() {
    modal.classList.remove('active');
    modalOverlay.classList.remove('active');
    modal.setAttribute('hidden', '');
    modalOverlay.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    currentProduct = null;

    document
        .querySelectorAll('#extras-container input[type="checkbox"]')
        .forEach((input) => {
            input.checked = false;
        });

    document.getElementById('calda-select').selectedIndex = 0;
}

if (productsContainer) {
    productsContainer.addEventListener('click', (event) => {
        const card = event.target.closest('a');
        if (!card || !productsContainer.contains(card)) return;
        if (!card.querySelector('.card-info')) return;
        event.preventDefault();
        openModal(getProductFromCard(card));
    });
}

updateCartCount();
renderCartOrderSummary();

if (cartButton) {
    cartButton.addEventListener('click', () => {
        openCart();
    });
}

if (cartClose) {
    cartClose.addEventListener('click', closeCartPanel);
}

if (cartPanelOverlay) {
    cartPanelOverlay.addEventListener('click', closeCartPanel);
}

if (finalizeButton) {
    finalizeButton.addEventListener('click', finalizeOrder);
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (cartPanel.classList.contains('active')) {
            closeCartPanel();
        }
        if (modal.classList.contains('active')) {
            closeModal();
        }
        if (orderIntakeModal?.classList.contains('active')) {
            closeOrderIntakeModal();
        }
    }
});

if (modalClose) {
    modalClose.addEventListener('click', closeModal);
}

if (modalOverlay) {
    modalOverlay.addEventListener('click', closeModal);
}

if (qtyDecrease) {
    qtyDecrease.addEventListener('click', () => {
        if (currentQty > 1) {
            currentQty -= 1;
            qtyValue.textContent = currentQty;
        }
    });
}

if (qtyIncrease) {
    qtyIncrease.addEventListener('click', () => {
        currentQty += 1;
        qtyValue.textContent = currentQty;
    });
}

if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
        if (!currentProduct) return;

        let acompanhamentos = [];
        let adicionais = [];
        let calda = '';
        let adicionaisValor = 0;

        const isAcai = currentProduct.category === 'acai' ||
            normalizeText(currentProduct.title).includes('acai');

        if (isAcai) {
            acompanhamentos = [
                ...document.querySelectorAll('#extras-container input:not(.adicional):checked')
            ].map((item) => item.value);

            calda = document.getElementById('calda-select').value;

            document.querySelectorAll('.adicional:checked').forEach((item) => {
                adicionais.push(item.value);
                adicionaisValor += Number(item.dataset.price);
            });
        }

        const produtoFinal = {
            ...currentProduct,
            acompanhamentos,
            adicionais,
            calda,
            adicional: adicionaisValor
        };

        produtoFinal.price += adicionaisValor;

        addToCart(produtoFinal, currentQty);
        closeModal();

        alert(`${currentQty}x ${currentProduct.title} adicionado ao carrinho`);
    });
}
