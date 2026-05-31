(function(){
  const CATEGORY_ORDER = [
    'Pizza',
    'Doces',
    'Hamburguer Tradicional',
    'Hamburguer Gourmet',
    'Sorvete',
    'Acai',
    'Bebidas',
    'Outros'
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
    return category || 'Outros';
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

  function buildProductCard(product){
    const a = document.createElement('a');
    a.href = '#';
    a.dataset.category = categoryToSlug(product.categoria);
    a.dataset.adminProduto = 'true';

    const nome = escapeHtml(product.nome || 'Produto');
    const descricao = escapeHtml(product.descricao || '');
    const imagem = escapeHtml(product.imagem || 'img/hamb.gourmet.jpg');
    const preco = money(product.preco || 0);

    a.innerHTML = `<img src="${imagem}" alt="${nome}">
      <div class="card-info"><h2>${nome}</h2><p>${descricao}</p><h4>${preco}</h4></div>`;

    return a;
  }

  function promoDescription(promo){
    const desc = String(promo.descricao || '').trim();
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

    const nome = escapeHtml(promo.nome || 'Promocao');
    const descricao = escapeHtml(promoDescription(promo));
    const imagem = escapeHtml(promo.imagem || 'img/hamb.gourmet.jpg');
    const preco = money(promo.precoPromocional || 0);

    a.innerHTML = `<img src="${imagem}" alt="${nome}">
      <div class="card-info"><h2>${nome}</h2><p>${descricao}</p><h4>${preco}</h4></div>`;

    return a;
  }

  function clearCatalogNodes(wrap){
    [...wrap.children].forEach((node) => {
      const isHeading = node.tagName === 'H2';
      const isCard = node.tagName === 'A' && !!node.querySelector('.card-info h2');
      const isPromoGrid = node.classList?.contains('promocoes-grid');
      if (isHeading || isCard || isPromoGrid) {
        node.remove();
      }
    });
  }

  function groupedCategories(products){
    const groups = new Map();
    products.forEach((product) => {
      const category = normalizeCategory(product.categoria);
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
    const activeProducts = MKStore.products().filter((product) => product.disponivel !== false);

    const promoGeneralCards = activePromos.filter((promo) => promo.mostrarNoCardapioGeral);
    promoGeneralCards.forEach((promo) => wrap.appendChild(buildPromoCard(promo, false)));

    if (activePromos.length) {
      const promoTitle = document.createElement('h2');
      promoTitle.id = 'promocoes';
      promoTitle.dataset.adminPromocoes = 'true';
      promoTitle.textContent = 'Promocoes';
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

      groups.get(category).forEach((product) => {
        wrap.appendChild(buildProductCard(product));
      });
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
