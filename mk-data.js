(function(){
  const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const todayISO = () => new Date().toISOString();
  const uid = (prefix='MK') => `${prefix}${Date.now().toString().slice(-6)}${Math.floor(Math.random()*90+10)}`;

  const STORAGE_KEYS = {
    products: 'mk_produtos',
    promos: 'mk_promocoes',
    promosLegacy: 'mk_promos',
    orders: 'mk_pedidos',
    config: 'mk_config',
    systemConfig: 'configuracoesSistema',
    adminConfig: 'adminConfig',
    adminPassword: 'mk_admin_senha',
    notes: 'mk_notificacoes'
  };

  const PROMO_MIGRATION_FLAG = 'mk_promocoes_schema_v2';

  const read = (key, fallback=[]) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch(e){ return fallback; }
  };

  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const defaultImage = 'img/bomgourmet_2F2021_2F05_2F24202047_2Fhamburguer-janelabar-divulgacao.jpg';
  const gourmetImage = 'img/hamb.gourmet.jpg';
  const DEFAULT_TABLES = 10;
  const DEFAULT_ADMIN_USERNAME = 'admin';
  const DEFAULT_ADMIN_PASSWORD = '123456';

  function makeDefaultProduct(id, nome, descricao, preco, categoria, imagem = defaultImage){
    const now = todayISO();
    return {
      id,
      nome,
      descricao,
      preco,
      categoria,
      imagem,
      disponivel: true,
      origem: 'padrao',
      criadoEm: now,
      atualizadoEm: now
    };
  }

  const produtosPadrao = [
    makeDefaultProduct('produto-pizza-calabresa', 'Calabresa', 'Molho de tomate, mussarela, calabresa, cebola, azeitonas e oregano.', 41.99, 'Pizza'),
    makeDefaultProduct('produto-pizza-portuguesa', 'Portuguesa', 'Molho de tomate, mussarela, ovo, presunto, calabresa, tomate, milho, ervilha, pimentao, azeitona e oregano.', 49.99, 'Pizza'),
    makeDefaultProduct('produto-pizza-frango', 'Frango', 'Molho de tomate, mussarela, frango, azeitona e oregano.', 44.99, 'Pizza'),
    makeDefaultProduct('produto-pizza-mk', 'MK', 'Molho de tomate, mussarela, camarao, portuguesa, calabresa, frango, tomate, azeitona e oregano.', 58.99, 'Pizza'),
    makeDefaultProduct('produto-pizza-camarao', 'Camarao', 'Molho de tomate, mussarela, camarao, catupiry, azeitona e oregano.', 68.99, 'Pizza'),
    makeDefaultProduct('produto-pizza-luiz-gonzaga', 'Luiz Gonzaga', 'Molho de tomate, mussarela, charque desfiada, carne de sol desfiada, bacon, cebola e oregano.', 68.99, 'Pizza'),

    makeDefaultProduct('produto-doce-chocolate', 'Chocolate', 'Mussarela, chocolate derretido e M&M.', 33.99, 'Doces'),
    makeDefaultProduct('produto-doce-banana', 'Banana', 'Mussarela, banana, acucar e canela.', 33.99, 'Doces'),
    makeDefaultProduct('produto-doce-romeu-julieta', 'Romeu e Julieta', 'Mussarela, goiabada e queijo minas.', 68.99, 'Doces'),

    makeDefaultProduct('produto-hamb-tradicional', 'Tradicional', 'Pao, carne, creme de milho, tomate e cebola caramelizada.', 18.99, 'Hamburguer Tradicional'),
    makeDefaultProduct('produto-hamb-x-burguer', 'X-Burguer', 'Pao, carne, queijo, alface, tomate e maionese.', 22.99, 'Hamburguer Tradicional'),
    makeDefaultProduct('produto-hamb-x-bacon', 'X-Bacon', 'Pao, carne, queijo, bacon crocante, alface, tomate e maionese.', 26.99, 'Hamburguer Tradicional'),
    makeDefaultProduct('produto-hamb-x-tudo', 'X-Tudo', 'Pao, carne, queijo, bacon, ovo, presunto, alface, tomate e maionese.', 32.99, 'Hamburguer Tradicional'),
    makeDefaultProduct('produto-hamb-duplo', 'Duplo', 'Pao, dois hamburgueres, queijo duplo, alface, tomate e molho especial.', 36.99, 'Hamburguer Tradicional'),

    makeDefaultProduct('produto-gourmet-smash-classico', 'Smash Classico', 'Pao brioche, blend artesanal, cebola caramelizada, queijo gouda e maionese trufada.', 42.99, 'Hamburguer Gourmet', gourmetImage),
    makeDefaultProduct('produto-gourmet-bbq-bacon', 'BBQ Bacon', 'Pao brioche, blend artesanal, bacon crispy, queijo cheddar, molho BBQ e cebola crispy.', 48.99, 'Hamburguer Gourmet', gourmetImage),
    makeDefaultProduct('produto-gourmet-cogumelos', 'Cogumelos', 'Pao brioche, blend artesanal, cogumelos salteados, queijo brie, rucula e aioli de alho.', 52.99, 'Hamburguer Gourmet', gourmetImage),
    makeDefaultProduct('produto-gourmet-big-mac-1', 'Big Mac', 'Pao com gergelim, dois hamburgueres, alface, queijo, picles, cebola e molho especial.', 38.99, 'Hamburguer Gourmet', gourmetImage),
    makeDefaultProduct('produto-gourmet-big-mac-2', 'Big Mac', 'Pao com gergelim, dois hamburgueres, alface, queijo, picles, cebola e molho especial.', 38.99, 'Hamburguer Gourmet', gourmetImage),

    makeDefaultProduct('produto-sorvete-casquinha', 'Casquinha Tradicional', 'Casquinha crocante com sorvete de creme, chocolate ou morango.', 6.99, 'Sorvete'),
    makeDefaultProduct('produto-sorvete-sundae', 'Sundae', 'Sorvete de baunilha com calda de caramelo ou chocolate.', 12.99, 'Sorvete'),
    makeDefaultProduct('produto-sorvete-milkshake', 'Milkshake', 'Milkshake cremoso de chocolate, morango ou baunilha.', 18.99, 'Sorvete'),
    makeDefaultProduct('produto-sorvete-copa', 'Copa de Sorvete', 'Copa com duas bolas de sorvete a escolha, calda e granulado.', 15.99, 'Sorvete'),
    makeDefaultProduct('produto-sorvete-especial', 'Sorvete Especial', 'Sorvete artesanal com mix de frutas vermelhas e chantilly.', 22.99, 'Sorvete'),

    makeDefaultProduct('produto-acai-400-sem-sorvete', 'Acai 400ML S/Sorvete', '', 11.99, 'Acai'),
    makeDefaultProduct('produto-acai-400-com-sorvete', 'Acai 400ML C/Sorvete', '', 14.99, 'Acai'),
    makeDefaultProduct('produto-acai-600-sem-sorvete', 'Acai 600ML S/Sorvete', '', 14.99, 'Acai'),
    makeDefaultProduct('produto-acai-600-com-sorvete', 'Acai 600ML C/Sorvete', '', 17.99, 'Acai'),

    makeDefaultProduct('produto-bebida-refrigerante-lata', 'Refrigerante Lata', 'Coca-Cola, Guarana, Sprite ou Fanta lata 350ml gelada.', 6.99, 'Bebidas'),
    makeDefaultProduct('produto-bebida-suco-natural', 'Suco Natural', 'Suco natural de laranja, limao, maracuja ou abacaxi copo 400ml.', 10.99, 'Bebidas'),
    makeDefaultProduct('produto-bebida-agua-mineral', 'Agua Mineral', 'Agua mineral sem gas ou com gas garrafa 500ml.', 4.99, 'Bebidas'),
    makeDefaultProduct('produto-bebida-cha-gelado', 'Cha Gelado', 'Cha gelado de pessego, limao ou maca copo 400ml.', 8.99, 'Bebidas'),
    makeDefaultProduct('produto-bebida-vitamina-frutas', 'Vitamina de Frutas', 'Vitamina cremosa de banana com morango, manga ou abacate 400ml.', 13.99, 'Bebidas')
  ];

  const promoStyles = ['desconto', 'combo', 'clone', 'destaque'];

  function toNumber(value, fallback = 0){
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeText(value){
    return String(value || '').trim();
  }

  function normalizeForMatch(value){
    return normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function normalizeCategory(value){
    const category = normalizeText(value);
    return category || 'Outros';
  }

  function normalizeProductOrigin(value){
    return value === 'padrao' ? 'padrao' : 'admin';
  }

  function normalizePromoStyle(value){
    const style = String(value || '').trim().toLowerCase();
    return promoStyles.includes(style) ? style : 'desconto';
  }

  function normalizeAdminConfig(raw){
    const src = raw && typeof raw === 'object' ? raw : {};
    const usuario = normalizeText(src.usuario || DEFAULT_ADMIN_USERNAME) || DEFAULT_ADMIN_USERNAME;
    const senha = String(src.senha || DEFAULT_ADMIN_PASSWORD);
    return { usuario, senha };
  }

  function normalizeTableCount(value){
    const count = Number.parseInt(value, 10);
    if (!Number.isFinite(count)) return DEFAULT_TABLES;
    return Math.max(1, count);
  }

  function normalizeProduct(raw){
    const src = raw && typeof raw === 'object' ? raw : {};
    const createdAt = src.criadoEm || todayISO();

    return {
      id: String(src.id || uid('P')),
      nome: normalizeText(src.nome || src.title || ''),
      descricao: normalizeText(src.descricao || src.desc || ''),
      preco: toNumber(src.preco ?? src.price, 0),
      categoria: normalizeCategory(src.categoria || src.category || ''),
      imagem: normalizeText(src.imagem || src.image || defaultImage) || defaultImage,
      disponivel: src.disponivel !== false,
      origem: normalizeProductOrigin(src.origem),
      criadoEm: createdAt,
      atualizadoEm: src.atualizadoEm || createdAt,
      destaque: !!src.destaque
    };
  }

  function productMatchKey(product){
    return `${normalizeForMatch(product?.nome)}::${normalizeForMatch(product?.categoria)}`;
  }

  function normalizeProductsList(list){
    const raw = Array.isArray(list) ? list : [];
    return raw.map(normalizeProduct);
  }

  function normalizePromo(raw){
    const src = raw && typeof raw === 'object' ? raw : {};
    const oldStyle = src.estilo || src.tipo || '';

    return {
      id: String(src.id || uid('PR')),
      nome: normalizeText(src.nome || src.titulo || src.title || ''),
      descricao: normalizeText(src.descricao || src.desc || ''),
      precoPromocional: toNumber(src.precoPromocional ?? src.preco ?? src.price, 0),
      estiloPromocao: normalizePromoStyle(src.estiloPromocao || oldStyle),
      imagem: normalizeText(src.imagem || src.image || 'img/hamb.gourmet.jpg') || 'img/hamb.gourmet.jpg',
      ativa: src.ativa !== undefined ? !!src.ativa : (src.ativo !== undefined ? !!src.ativo : true),
      mostrarNoCardapioGeral: src.mostrarNoCardapioGeral !== undefined ? !!src.mostrarNoCardapioGeral : false,
      criadoEm: src.criadoEm || todayISO()
    };
  }

  function normalizePromosList(list){
    const raw = Array.isArray(list) ? list : [];
    return raw.map(normalizePromo);
  }

  function syncDefaultProducts(){
    const stored = read(STORAGE_KEYS.products, null);

    if (!Array.isArray(stored)) {
      write(STORAGE_KEYS.products, produtosPadrao.map(normalizeProduct));
      return;
    }

    const normalizedStored = normalizeProductsList(stored);
    const byId = new Set(normalizedStored.map((p) => String(p.id)));
    const candidatesByKey = new Map();
    let changed = false;

    normalizedStored.forEach((product) => {
      const key = productMatchKey(product);
      if (!candidatesByKey.has(key)) candidatesByKey.set(key, []);
      candidatesByKey.get(key).push(product);
    });

    const usedCandidates = new Set();
    produtosPadrao.forEach((defaultProduct) => {
      const defaultId = String(defaultProduct.id);
      if (byId.has(defaultId)) return;

      const defaultKey = productMatchKey(defaultProduct);
      const candidates = candidatesByKey.get(defaultKey) || [];
      const candidate = candidates.find((item) => !usedCandidates.has(item));

      if (candidate) {
        usedCandidates.add(candidate);
        candidate.id = defaultId;
        if (candidate.origem !== 'admin') candidate.origem = 'padrao';
        candidate.atualizadoEm = candidate.atualizadoEm || todayISO();
        byId.add(defaultId);
        changed = true;
        return;
      }

      normalizedStored.push(normalizeProduct(defaultProduct));
      byId.add(defaultId);
      changed = true;
    });

    const deduped = [];
    const seenId = new Set();
    normalizedStored.forEach((product) => {
      const normalized = normalizeProduct(product);
      const currentId = String(normalized.id || '');
      if (!currentId || seenId.has(currentId)) {
        normalized.id = uid('P');
        changed = true;
      }
      seenId.add(String(normalized.id));
      deduped.push(normalized);
    });

    if (changed || deduped.length !== normalizedStored.length) {
      write(STORAGE_KEYS.products, deduped);
      return;
    }

    write(STORAGE_KEYS.products, normalizedStored);
  }

  function seed(){
    syncDefaultProducts();

    if(!localStorage.getItem(STORAGE_KEYS.promos)) {
      const legacy = read(STORAGE_KEYS.promosLegacy, []);
      write(STORAGE_KEYS.promos, Array.isArray(legacy) ? legacy : []);
    }

    const legacyConfig = read(STORAGE_KEYS.config, {});
    const countFromLegacy = normalizeTableCount(
      legacyConfig?.quantidadeMesas ?? legacyConfig?.mesas ?? DEFAULT_TABLES
    );

    if(!localStorage.getItem(STORAGE_KEYS.systemConfig)) {
      write(STORAGE_KEYS.systemConfig, { quantidadeMesas: countFromLegacy });
    }

    const currentSystemConfig = read(STORAGE_KEYS.systemConfig, {});
    const finalCount = normalizeTableCount(
      currentSystemConfig?.quantidadeMesas ?? countFromLegacy
    );

    if(!localStorage.getItem(STORAGE_KEYS.config)) {
      write(STORAGE_KEYS.config, { quantidadeMesas: finalCount, mesas: finalCount });
    } else {
      write(STORAGE_KEYS.config, { ...legacyConfig, quantidadeMesas: finalCount, mesas: finalCount });
    }

    if(!localStorage.getItem(STORAGE_KEYS.adminPassword)) {
      const legacyPassword = normalizeText(legacyConfig?.senha);
      write(STORAGE_KEYS.adminPassword, legacyPassword || DEFAULT_ADMIN_PASSWORD);
    }

    if(!localStorage.getItem(STORAGE_KEYS.adminConfig)) {
      const legacyPassword = normalizeText(read(STORAGE_KEYS.adminPassword, ''));
      const legacyAuthConfig = {
        usuario: normalizeText(legacyConfig?.usuario) || DEFAULT_ADMIN_USERNAME,
        senha: normalizeText(legacyConfig?.senha) || legacyPassword || DEFAULT_ADMIN_PASSWORD
      };
      write(STORAGE_KEYS.adminConfig, normalizeAdminConfig(legacyAuthConfig));
    }
  }

  function migratePromosSchemaOnce(){
    if(localStorage.getItem(PROMO_MIGRATION_FLAG) === '1') return;
    const normalized = normalizePromosList(read(STORAGE_KEYS.promos, []));
    write(STORAGE_KEYS.promos, normalized);
    localStorage.setItem(PROMO_MIGRATION_FLAG, '1');
  }

  seed();
  migratePromosSchemaOnce();

  function products(){
    const list = normalizeProductsList(read(STORAGE_KEYS.products, produtosPadrao));
    write(STORAGE_KEYS.products, list);
    return list;
  }

  function saveProducts(list){
    const normalized = normalizeProductsList(list);
    write(STORAGE_KEYS.products, normalized);
    window.dispatchEvent(new Event('mk-products-updated'));
  }

  function promos(){
    const list = normalizePromosList(read(STORAGE_KEYS.promos, []));
    write(STORAGE_KEYS.promos, list);
    return list;
  }

  function savePromos(list){
    const normalized = normalizePromosList(list);
    write(STORAGE_KEYS.promos, normalized);
    window.dispatchEvent(new Event('mk-promos-updated'));
  }

  function orders(){ return read(STORAGE_KEYS.orders, []); }

  function saveOrders(list){
    write(STORAGE_KEYS.orders, list);
    window.dispatchEvent(new Event('mk-orders-updated'));
  }

  function config(){
    const legacy = read(STORAGE_KEYS.config, {});
    const system = read(STORAGE_KEYS.systemConfig, {});
    const quantidadeMesas = normalizeTableCount(
      system?.quantidadeMesas ?? legacy?.quantidadeMesas ?? legacy?.mesas ?? DEFAULT_TABLES
    );
    return { ...legacy, quantidadeMesas, mesas: quantidadeMesas };
  }

  function saveConfig(cfg){
    const currentLegacy = read(STORAGE_KEYS.config, {});
    const quantidadeMesas = normalizeTableCount(
      cfg?.quantidadeMesas ?? cfg?.mesas ?? currentLegacy?.quantidadeMesas ?? currentLegacy?.mesas ?? DEFAULT_TABLES
    );
    write(STORAGE_KEYS.systemConfig, { quantidadeMesas });
    write(STORAGE_KEYS.config, { ...currentLegacy, ...cfg, quantidadeMesas, mesas: quantidadeMesas });
    window.dispatchEvent(new Event('mk-config-updated'));
  }

  function adminCredentials(){
    const stored = read(STORAGE_KEYS.adminConfig, null);
    const normalized = normalizeAdminConfig(stored);
    write(STORAGE_KEYS.adminConfig, normalized);
    return normalized;
  }

  function saveAdminCredentials(credentials){
    const normalized = normalizeAdminConfig(credentials);
    write(STORAGE_KEYS.adminConfig, normalized);
    write(STORAGE_KEYS.adminPassword, normalized.senha);
    window.dispatchEvent(new Event('mk-auth-updated'));
    return normalized;
  }

  function verifyAdminCredentials(usuario, senha){
    const current = adminCredentials();
    return normalizeText(usuario).toLowerCase() === normalizeText(current.usuario).toLowerCase()
      && String(senha || '') === current.senha;
  }

  function adminPassword(){
    return adminCredentials().senha;
  }

  function orderTotal(order){ return Number(order.total || 0); }

  function isSameDay(date, ref = new Date()){
    const d = new Date(date || Date.now());
    return d.getFullYear()===ref.getFullYear() && d.getMonth()===ref.getMonth() && d.getDate()===ref.getDate();
  }

  function sameWeek(date){
    const d = new Date(date || Date.now()); const now = new Date();
    const start = new Date(now); start.setDate(now.getDate()-now.getDay()); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate()+7);
    return d>=start && d<end;
  }

  function sameMonth(date){
    const d = new Date(date || Date.now()); const now = new Date();
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  }

  function metrics(){
    const list = orders();
    const today = list.filter(o=>isSameDay(o.criadoEm || o.data || o.id));
    const week = list.filter(o=>sameWeek(o.criadoEm || o.data || o.id));
    const month = list.filter(o=>sameMonth(o.criadoEm || o.data || o.id));
    const sum = arr => arr.reduce((acc,o)=>acc+orderTotal(o),0);
    const topMap = {};
    list.forEach(o => (o.itensDetalhados || []).forEach(i => {
      const key = i.title || i.nome || i;
      topMap[key] = (topMap[key] || 0) + Number(i.qty || 1);
    }));
    const top = Object.entries(topMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
    return {today,week,month, faturamentoHoje:sum(today), faturamentoSemana:sum(week), faturamentoMes:sum(month), pedidosHoje:today.length, ticketMedio: today.length ? sum(today)/today.length : 0, top};
  }

  function notifyClient(order, message){
    const notes = read(STORAGE_KEYS.notes, []);
    notes.unshift({id:uid('N'), pedidoId:order.id, cliente:order.cliente || 'Cliente', message, createdAt:todayISO(), lida:false});
    write(STORAGE_KEYS.notes, notes.slice(0,60));
  }

  window.MKStore = {
    BRL, uid, read, write,
    products, saveProducts,
    promos, savePromos,
    orders, saveOrders,
    config, saveConfig,
    adminCredentials, saveAdminCredentials, verifyAdminCredentials, adminPassword,
    metrics, notifyClient
  };
})();
