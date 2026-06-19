(function(){
  const CATEGORY_ORDER = [
    "Pizzas",
    "Pizzas Doces",
    "Bordas Recheadas",
    "Hambúrgueres",
    "Hambúrgueres Gourmet",
    "Beirutes",
    "Porções",
    "Adicionais",
    "Sorvete",
    "Açaí",
    "Sucos",
    "Bebidas",
    "Outros"
  ];

  function money(v){
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v || 0));
  }

  function escapeHtml(value){
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeText(value){
    return String(value || '').trim();
  }

  function normalizeCategory(value){
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
  function normalizeForMatch(value){
    return normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function isOutroProductName(value){
    const name = normalizeForMatch(value);
    return name === 'outro' || name === 'outros';
  }

  function categoryToSlug(value){
    const normalized = normalizeCategory(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return normalized
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'outros';
  }


  function fallbackDescription(product, name, category){
    const normalizedCategory = normalizeForMatch(category);
    if (normalizedCategory === 'acai') {
      return 'Açaí cremoso com acompanhamentos e calda à escolha.';
    }
    if (normalizedCategory === 'bebidas' || normalizedCategory === 'sucos') {
      return 'Bebida gelada selecionada para acompanhar seu pedido.';
    }
    if (normalizedCategory.includes('hamburguer') || normalizedCategory === 'beirutes') {
      return 'Preparado com ingredientes selecionados e muito sabor.';
    }
    if (normalizedCategory.includes('pizza') || normalizedCategory === 'bordas recheadas' || normalizedCategory === 'porcoes' || normalizedCategory === 'adicionais') {
      return 'Receita especial da casa, feita para compartilhar bons momentos.';
    }
    if (normalizedCategory === 'sorvete') {
      return 'Sobremesa cremosa e refrescante para finalizar o pedido.';
    }
    return `${name} preparado com o padrão de qualidade da casa.`;
  }
  function buildProductCard(product){
    const a = document.createElement('a');
    a.href = '#';
    const categoria = normalizeCategory(product.categoria || product.category);
    a.dataset.category = categoryToSlug(categoria);
    a.dataset.adminProduto = 'true';

    const rawName = product.nome || product.name || product.title || 'Produto';
    const nome = escapeHtml(rawName);
    const descricao = escapeHtml(product.descricao || product.description || product.desc || fallbackDescription(product, rawName, categoria));
    const imagem = escapeHtml(product.imagem || product.image || 'img/img-header.png');
    const preco = money(product.preco ?? product.price ?? 0);

    a.innerHTML = `<img src="${imagem}" alt="${nome}">
      <div class="card-info"><h2>${nome}</h2><p>${descricao}</p><h4>${preco}</h4></div>`;

    return a;
  }

  function promoDescription(promo){
    const desc = String(promo.descricao || promo.description || promo.desc || '').trim();
    const style = String(promo.estiloPromocao || '').trim();
    if (!desc) return style ? `Estilo: ${style}` : '';
    return desc;
  }

  function buildPromoCard(promo, inPromoSection){
    const a = document.createElement('a');
    a.href = '#promocoes';
    a.dataset.category = 'promocoes';

    if (inPromoSection) {
      a.dataset.adminPromocoes = 'true';
      if (promo.estiloPromocao === 'destaque') {
        a.className = 'produto-destaque-admin';
      }
    } else {
      a.dataset.adminPromoGeral = 'true';
    }

    const nome = escapeHtml(promo.nome || promo.name || promo.title || 'Promoção');
    const descricao = escapeHtml(promoDescription(promo));
    const imagem = escapeHtml(promo.imagem || promo.image || 'img/img-header.png');
    const preco = money(promo.precoPromocional ?? promo.price ?? 0);

    a.innerHTML = `<img src="${imagem}" alt="${nome}">
      <div class="card-info"><h2>${nome}</h2><p>${descricao}</p><h4>${preco}</h4></div>`;

    return a;
  }

  function clearCatalogNodes(wrap){
    [...wrap.children].forEach((node) => {
      const isHeading = node.tagName === 'H2';
      const isCard = node.tagName === 'A' && !!node.querySelector('.card-info h2');
      const isCardsContainer = node.classList.contains('cards-container') || node.classList.contains('flex-cards');
      const isPromoGrid = node.classList.contains('promocoes-grid');
      if (isHeading || isCard || isCardsContainer || isPromoGrid) {
        node.remove();
      }
    });
  }

  function buildCardsContainer(){
    const container = document.createElement('div');
    container.className = 'cards-container';
    return container;
  }
  function productRenderKey(product){
    const name = normalizeForMatch(product.nome || product.name || product.title);
    const category = normalizeForMatch(normalizeCategory(product.categoria || product.category));
    if (name && category) return `${name}::${category}`;
    return String(product.id || '').trim();
  }

  function dedupeProductsForRender(products){
    const seen = new Set();
    return products.filter((product) => {
      const key = productRenderKey(product);
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function groupedCategories(products){
    const groups = new Map();
    products.forEach((product) => {
      const category = normalizeCategory(product.categoria || product.category);
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(product);
    });

    const ordered = [];
    CATEGORY_ORDER.forEach((category) => {
      if (groups.has(category)) ordered.push(category);
    });

    const remaining = [...groups.keys()]
      .filter((category) => !ordered.includes(category))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return { groups, orderedCategories: [...ordered, ...remaining] };
  }

  function renderClientCatalog(){
    const wrap = document.querySelector('section.main-cards .interface');
    if(!wrap || !window.MKStore) return;

    clearCatalogNodes(wrap);

    const activePromos = MKStore.promos().filter((promo) => promo.ativa !== false);
    const activeProducts = dedupeProductsForRender(MKStore.products().filter((product) => (
      product.disponivel !== false && !isOutroProductName(product.nome || product.name || product.title)
    )));

    const promoGeneralCards = activePromos.filter((promo) => promo.mostrarNoCardapioGeral);
    if (promoGeneralCards.length) {
      const promoGeneralContainer = buildCardsContainer();
      promoGeneralCards.forEach((promo) => promoGeneralContainer.appendChild(buildPromoCard(promo, false)));
      wrap.appendChild(promoGeneralContainer);
    }

    if (activePromos.length) {
      const promoTitle = document.createElement('h2');
      promoTitle.id = 'promocoes';
      promoTitle.dataset.adminPromocoes = 'true';
      promoTitle.textContent = 'Promoções';
      wrap.appendChild(promoTitle);

      const promoGrid = document.createElement('div');
      promoGrid.className = 'promocoes-grid';
      promoGrid.dataset.adminPromocoes = 'true';
      wrap.appendChild(promoGrid);

      activePromos.forEach((promo) => {
        promoGrid.appendChild(buildPromoCard(promo, true));
      });
    }

    const { groups, orderedCategories } = groupedCategories(activeProducts);
    orderedCategories.forEach((category) => {
      const sectionTitle = document.createElement('h2');
      sectionTitle.id = categoryToSlug(category);
      sectionTitle.textContent = `${category}:`;
      wrap.appendChild(sectionTitle);

      const cardsContainer = buildCardsContainer();
      groups.get(category).forEach((product) => {
        cardsContainer.appendChild(buildProductCard(product));
      });
      wrap.appendChild(cardsContainer);
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderClientCatalog);
  else renderClientCatalog();

  window.addEventListener('storage', (event) => {
    if (event.key === 'mk_promocoes' || event.key === 'mk_produtos') renderClientCatalog();
  });

  window.addEventListener('mk-promos-updated', renderClientCatalog);
  window.addEventListener('mk-products-updated', renderClientCatalog);
  window.addEventListener('focus', renderClientCatalog);
  window.addEventListener('pageshow', renderClientCatalog);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderClientCatalog();
  });
})();
