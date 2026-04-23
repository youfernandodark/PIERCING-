(function() {
  "use strict";

  /* ---------- CONFIGURAÇÃO SUPABASE ---------- */
  const SUPABASE_URL = "https://hruldvebruatjcwaoozd.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhydWxkdmVicnVhdGpjd2Fvb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjI2ODQsImV4cCI6MjA5MjMzODY4NH0.bWxI30NlY53ZBgGChW6xrdRtygiAt9Zt2oHZAD49ZQU";
  const isSupabaseConfigured = SUPABASE_URL.includes("SEU_PROJETO") === false && SUPABASE_URL.startsWith("https://");

  /* ---------- ESTADO GLOBAL ---------- */
  let supabase = null;
  let allProducts = [];
  let likesMap = {};
  let currentFilter = { search: '', onlyAvailable: false, sort: 'default' };
  
  const CACHE_KEY = 'dark013_catalog_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  /* ---------- ELEMENTOS DOM ---------- */
  const container = document.getElementById('productContainer');
  const modelCountDisplay = document.getElementById('modelCountDisplay');
  const viewCountValue = document.getElementById('viewCountValue');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearch');
  const sortSelect = document.getElementById('sortSelect');
  const filterAvailableBtn = document.getElementById('filterAvailableBtn');
  const modal = document.getElementById('productModal');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.querySelector('.modal-close');
  const modalOverlay = document.querySelector('.modal-overlay');

  /* ---------- UTILITÁRIOS ---------- */
  const getUserToken = () => {
    let token = localStorage.getItem('dark013_user_token');
    if (!token) {
      token = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('dark013_user_token', token);
    }
    return token;
  };
  const userToken = getUserToken();

  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  /* ---------- SUPABASE CLIENT ---------- */
  if (isSupabaseConfigured) {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase inicializado');
    } catch (e) {
      console.warn("Supabase não inicializado:", e);
    }
  }

  /* ---------- CACHE LOCAL ---------- */
  function saveToCache(products, likes) {
    const cache = {
      timestamp: Date.now(),
      products: products,
      likes: likes
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }

  function loadFromCache() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    try {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_DURATION) {
        return data;
      }
    } catch (e) {}
    return null;
  }

  /* ---------- FILTROS E ORDENAÇÃO (CORRIGIDO) ---------- */
  function filterAndSortProducts() {
    let filtered = [...allProducts];
    
    // Busca textual (segura contra null/undefined)
    if (currentFilter.search) {
      const term = currentFilter.search.toLowerCase();
      filtered = filtered.filter(p => 
        (p.code ?? '').toLowerCase().includes(term) || 
        (p.name ?? '').toLowerCase().includes(term)
      );
    }
    
    // Apenas disponíveis
    if (currentFilter.onlyAvailable) {
      filtered = filtered.filter(p => p.is_available && p.stock_quantity > 0);
    }
    
    // Ordenação
    switch (currentFilter.sort) {
      case 'name':
        filtered.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        break;
      case 'name-desc':
        filtered.sort((a, b) => (b.name ?? '').localeCompare(a.name ?? ''));
        break;
      case 'likes':
        filtered.sort((a, b) => (likesMap[b.id] || 0) - (likesMap[a.id] || 0));
        break;
      case 'availability':
        filtered.sort((a, b) => {
          const aAvail = (a.is_available && a.stock_quantity > 0) ? 1 : 0;
          const bAvail = (b.is_available && b.stock_quantity > 0) ? 1 : 0;
          return bAvail - aAvail;
        });
        break;
    }
    
    return filtered;
  }

  function updateFilterUI() {
    clearSearchBtn.style.display = currentFilter.search ? 'block' : 'none';
    filterAvailableBtn.setAttribute('aria-pressed', currentFilter.onlyAvailable);
  }

  /* ---------- RENDERIZAÇÃO ---------- */
  function renderProducts() {
    const filtered = filterAndSortProducts();
    
    if (!filtered.length) {
      container.innerHTML = '<div class="error-msg">Nenhum produto encontrado.</div>';
      modelCountDisplay.textContent = '0 modelos';
      return;
    }
    
    modelCountDisplay.textContent = `${filtered.length} modelo${filtered.length > 1 ? 's' : ''}`;
    
    let html = '';
    filtered.forEach(prod => {
      const thickness = prod.thickness || '—';
      const postLength = prod.post_length_options || '—';
      let adornmentDisplay = prod.adornment_size || (prod.ball_size ? `Esfera ${prod.ball_size}` : '—');
      const closure = prod.closure_type || '—';
      const stoneHtml = prod.stone ? `<div class="stone-indicator">💎 ${prod.stone}</div>` : '';
      const stockQty = prod.stock_quantity ?? 0;
      const isAvailable = prod.is_available !== undefined ? prod.is_available : (stockQty > 0);
      const availabilityText = isAvailable ? 'Disponível' : 'Indisponível';
      const availabilityClass = isAvailable ? 'available' : 'unavailable';
      const stockDisplay = stockQty > 0 ? `${stockQty} unidade${stockQty > 1 ? 's' : ''}` : 'Esgotado';
      const likeCount = likesMap[prod.id] || 0;
      const lowStock = stockQty > 0 && stockQty <= 2;
      
      html += `
        <div class="product-card" data-product-id="${prod.id}">
          <div class="product-image">
            ${lowStock ? '<span class="low-stock-badge">🔥 Últimas unidades</span>' : ''}
            <img src="${prod.image_url}" alt="${prod.name}" loading="lazy" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 100 100\\'%3E%3Crect width=\\'100\\' height=\\'100\\' fill=\\'%23222222\\'/%3E%3Ctext x=\\'50\\' y=\\'55\\' font-family=\\'sans-serif\\' font-size=\\'12\\' fill=\\'%23999999\\' text-anchor=\\'middle\\'%3ESem imagem%3C/text%3E%3C/svg%3E'; this.style.opacity='1'">
          </div>
          <div class="product-info">
            <div class="product-code">${prod.code}</div>
            <div class="product-name">${prod.name}</div>
            <div class="specs">
              <div class="spec-item"><span class="spec-label">Espessura</span> <span class="spec-value">${thickness}</span></div>
              <div class="spec-item"><span class="spec-label">Haste</span> <span class="spec-value">${postLength}</span></div>
              <div class="spec-item"><span class="spec-label">Adereço/Esfera</span> <span class="spec-value">${adornmentDisplay}</span></div>
              <div class="spec-item"><span class="spec-label">Trava</span> <span class="spec-value">${closure}</span></div>
            </div>
            ${stoneHtml}
            <div class="material-badge">${prod.material}</div>
            
            <div class="like-section">
              <button class="like-button" data-product-id="${prod.id}" aria-label="Curtir produto">
                <span class="like-icon">❤️</span>
                <span class="like-count" id="like-count-${prod.id}">${likeCount}</span>
              </button>
              <span class="like-label">curtidas</span>
            </div>

            <div class="stock-info">
              <span class="availability-badge ${availabilityClass}">${availabilityText}</span>
              <span class="stock-quantity">${stockDisplay}</span>
            </div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;

    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.like-button')) return;
        const id = card.dataset.productId;
        const product = allProducts.find(p => p.id == id);
        if (product) openModal(product);
      });
    });

    document.querySelectorAll('.like-button').forEach(btn => {
      btn.addEventListener('click', handleLikeClick);
    });
  }

  function renderSkeletons(count = 6) {
    modelCountDisplay.textContent = '...';
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton-image"></div>
          <div class="skeleton-content">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line long"></div>
            <div class="skeleton-badge"></div>
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
  }

  /* ---------- MODAL ---------- */
  function openModal(product) {
    const likeCount = likesMap[product.id] || 0;
    const thickness = product.thickness || '—';
    const postLength = product.post_length_options || '—';
    const adornment = product.adornment_size || (product.ball_size ? `Esfera ${product.ball_size}` : '—');
    const stockQty = product.stock_quantity ?? 0;
    const isAvailable = product.is_available !== undefined ? product.is_available : (stockQty > 0);
    
    modalBody.innerHTML = `
      <div class="modal-image">
        <img src="${product.image_url}" alt="${product.name}" id="modalProductImage">
      </div>
      <div class="modal-title">${product.name}</div>
      <div class="modal-code">${product.code} · ${product.material}</div>
      ${product.stone ? `<div class="stone-indicator">💎 ${product.stone}</div>` : ''}
      <div class="modal-specs">
        <div class="modal-spec-item"><span class="modal-spec-label">Espessura</span><span class="modal-spec-value">${thickness}</span></div>
        <div class="modal-spec-item"><span class="modal-spec-label">Haste</span><span class="modal-spec-value">${postLength}</span></div>
        <div class="modal-spec-item"><span class="modal-spec-label">Adereço/Esfera</span><span class="modal-spec-value">${adornment}</span></div>
        <div class="modal-spec-item"><span class="modal-spec-label">Trava</span><span class="modal-spec-value">${product.closure_type || '—'}</span></div>
        <div class="modal-spec-item"><span class="modal-spec-label">Disponibilidade</span><span class="modal-spec-value">${isAvailable ? `${stockQty} un.` : 'Indisponível'}</span></div>
        <div class="modal-spec-item"><span class="modal-spec-label">Curtidas</span><span class="modal-spec-value" id="modalLikeCount">${likeCount}</span></div>
      </div>
      <div class="modal-actions">
        <a href="https://wa.me/message/FLSHGYBYY47GE1?text=Olá! Gostaria de informações sobre a joia ${product.code} - ${product.name}" class="modal-whatsapp-btn" target="_blank">
          <span>💬</span> Consultar no WhatsApp
        </a>
        <button class="modal-like-btn" id="modalLikeBtn" data-product-id="${product.id}">
          <span class="like-icon">❤️</span> Curtir
        </button>
      </div>
    `;
    
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    
    document.getElementById('modalLikeBtn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const id = btn.dataset.productId;
      btn.disabled = true;
      const result = await toggleLike(id);
      if (result.success) {
        const newCount = result.action === 'added' ? likeCount + 1 : Math.max(0, likeCount - 1);
        document.getElementById('modalLikeCount').textContent = newCount;
        const cardCount = document.getElementById(`like-count-${id}`);
        if (cardCount) cardCount.textContent = newCount;
        likesMap[id] = newCount;
        showToast(result.action === 'added' ? '❤️ Curtiu!' : '💔 Curtida removida');
      }
      btn.disabled = false;
    });

    // Zoom simples na imagem do modal
    const modalImg = document.getElementById('modalProductImage');
    modalImg.addEventListener('click', () => {
      modalImg.style.transform = modalImg.style.transform === 'scale(1.5)' ? 'scale(1)' : 'scale(1.5)';
    });
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }

  /* ---------- LIKES ---------- */
  async function toggleLike(productId) {
    if (!supabase) {
      showToast('Conexão indisponível', 'error');
      return { success: false };
    }
    try {
      const { data: existing, error: checkError } = await supabase
        .from('product_likes')
        .select('id')
        .eq('product_id', productId)
        .eq('user_token', userToken)
        .maybeSingle();
      if (checkError) throw checkError;
      
      if (existing) {
        const { error: deleteError } = await supabase
          .from('product_likes')
          .delete()
          .eq('id', existing.id);
        if (deleteError) throw deleteError;
        return { success: true, action: 'removed' };
      } else {
        const { error: insertError } = await supabase
          .from('product_likes')
          .insert([{ product_id: productId, user_token: userToken }]);
        if (insertError) throw insertError;
        return { success: true, action: 'added' };
      }
    } catch (err) {
      console.error('Erro ao processar like:', err);
      showToast('Erro ao curtir', 'error');
      return { success: false };
    }
  }

  async function handleLikeClick(e) {
    e.stopPropagation();
    const button = e.currentTarget;
    const productId = button.dataset.productId;
    if (!productId) return;
    button.disabled = true;
    const result = await toggleLike(productId);
    if (result.success) {
      const countSpan = document.getElementById(`like-count-${productId}`);
      if (countSpan) {
        let current = parseInt(countSpan.textContent, 10) || 0;
        const newCount = result.action === 'added' ? current + 1 : Math.max(0, current - 1);
        countSpan.textContent = newCount;
        likesMap[productId] = newCount;
      }
      showToast(result.action === 'added' ? '❤️ Curtiu!' : '💔 Curtida removida');
    }
    button.disabled = false;
  }

  /* ---------- DADOS ---------- */
  async function fetchFromSupabase() {
    if (!supabase) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
    if (error) throw error;
    return data;
  }

  async function fetchLikesForProducts(productIds) {
    if (!supabase || !productIds.length) return {};
    try {
      const { data, error } = await supabase.from('product_likes').select('product_id');
      if (error) throw error;
      const counts = {};
      data.forEach(like => { counts[like.product_id] = (counts[like.product_id] || 0) + 1; });
      return counts;
    } catch (err) {
      console.warn('Erro ao buscar likes:', err);
      return {};
    }
  }

  async function seedInitialProductIfNeeded() {
    if (!supabase) return;
    try {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
      if (count > 0) return;
      
      const initialProduct = {
        code: 'TN10', name: 'Ferradura', thickness: '1.2mm', post_length_options: '6mm, 8mm, 10mm, 12mm',
        ball_size: '3mm', closure_type: 'Rosca interna', material: 'Titânio ASTM F-136',
        image_url: 'https://cdn.dooca.store/149217/products/bz2bncigezjd3ucfkgnwkgtwfni7kqxtcvap_640x640+fill_ffffff.jpg',
        stock_quantity: 10, is_available: true, stone: null
      };
      await supabase.from('products').insert([initialProduct]);
      console.log('✅ Produto TN10 inserido');
    } catch (err) {
      console.warn('⚠️ Seed automático falhou:', err.message);
    }
  }

  async function registerPageView() {
    if (!supabase) return;
    try {
      await supabase.from('page_views').insert([{ page: 'catalogo' }]);
    } catch (err) {
      console.warn('⚠️ Erro ao registrar visita:', err.message);
    }
  }

  async function fetchAndDisplayTotalViews() {
    if (!supabase || !viewCountValue) return;
    try {
      const { count, error } = await supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('page', 'catalogo');
      if (error) throw error;
      viewCountValue.textContent = count || 0;
    } catch (err) {
      viewCountValue.textContent = '?';
    }
  }

  /* ---------- CARREGAMENTO DO CATÁLOGO (CORRIGIDO) ---------- */
  async function loadCatalog() {
    renderSkeletons(6);
    if (!isSupabaseConfigured || !supabase) {
      container.innerHTML = '<div class="error-msg">Erro: conexão com o banco de dados não configurada.</div>';
      return;
    }
    
    try {
      // Tentar cache primeiro
      const cached = loadFromCache();
      if (cached) {
        allProducts = cached.products;
        likesMap = cached.likes;
        renderProducts();
        await fetchAndDisplayTotalViews();
      }
      
      // Buscar dados frescos
      await seedInitialProductIfNeeded();
      const products = await fetchFromSupabase();
      const productIds = products.map(p => p.id);
      const freshLikesMap = await fetchLikesForProducts(productIds);
      
      allProducts = products;
      likesMap = freshLikesMap;
      saveToCache(products, freshLikesMap);
      
      renderProducts();
      await fetchAndDisplayTotalViews();
    } catch (err) {
      console.error('Erro ao carregar catálogo:', err);
      // Se já existem produtos em tela (veio do cache), manter a exibição atual
      if (allProducts.length > 0) {
        showToast('Não foi possível atualizar os dados. Exibindo versão em cache.', 'warning');
      } else {
        container.innerHTML = '<div class="error-msg">Falha ao carregar os produtos.</div>';
      }
    }
  }

  /* ---------- EVENT LISTENERS ---------- */
  function initFilters() {
    searchInput.addEventListener('input', (e) => {
      currentFilter.search = e.target.value;
      updateFilterUI();
      renderProducts();
    });
    
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      currentFilter.search = '';
      updateFilterUI();
      renderProducts();
    });
    
    sortSelect.addEventListener('change', (e) => {
      currentFilter.sort = e.target.value;
      renderProducts();
    });
    
    filterAvailableBtn.addEventListener('click', () => {
      currentFilter.onlyAvailable = !currentFilter.onlyAvailable;
      updateFilterUI();
      renderProducts();
    });
  }

  function initModal() {
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });
  }

  function initPromoCarousel() {
    const slidesContainer = document.querySelector('.promo-slides');
    const slides = document.querySelectorAll('.promo-slide');
    const indicators = document.querySelectorAll('.indicator');
    if (!slidesContainer || slides.length < 2) return;

    let currentIndex = 0, intervalId;
    const updateCarousel = (index) => {
      slidesContainer.style.transform = `translateX(-${index * 100}%)`;
      indicators.forEach((ind, i) => ind.classList.toggle('active', i === index));
      currentIndex = index;
    };
    const nextSlide = () => updateCarousel((currentIndex + 1) % slides.length);
    intervalId = setInterval(nextSlide, 8000);

    indicators.forEach((ind, i) => ind.addEventListener('click', () => {
      clearInterval(intervalId);
      updateCarousel(i);
      intervalId = setInterval(nextSlide, 8000);
    }));

    const carousel = document.querySelector('.promo-carousel');
    carousel.addEventListener('mouseenter', () => clearInterval(intervalId));
    carousel.addEventListener('mouseleave', () => intervalId = setInterval(nextSlide, 5000));

    let touchStartX = 0, touchEndX = 0;
    carousel.addEventListener('touchstart', (e) => touchStartX = e.changedTouches[0].screenX, { passive: true });
    carousel.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const threshold = 50;
      if (touchEndX < touchStartX - threshold) {
        clearInterval(intervalId); nextSlide(); intervalId = setInterval(nextSlide, 5000);
      } else if (touchEndX > touchStartX + threshold) {
        clearInterval(intervalId); updateCarousel((currentIndex - 1 + slides.length) % slides.length); intervalId = setInterval(nextSlide, 5000);
      }
    });
  }

  /* ---------- RÁDIO (CORRIGIDO) ---------- */
  function initRadioPlayer() {
    const audio = document.getElementById('radioAudio');
    const playBtn = document.getElementById('radioPlayBtn');
    const volumeSlider = document.getElementById('radioVolume');
    const muteBtn = document.getElementById('radioMuteBtn');
    const stationName = document.getElementById('radioStationName');
    
    // Se algum controle essencial não existir, não inicializa
    if (!audio || !playBtn || !volumeSlider || !muteBtn) return;
    
    const STREAM_URL = 'https://live.hunter.fm/kpop_stream?ag=mp3';
    audio.src = STREAM_URL;
    audio.volume = volumeSlider.value;
    
    if (stationName) stationName.textContent = 'Hunter FM K-pop';
    
    let isPlaying = false, lastVolume = audio.volume;
    
    const attemptAutoplay = () => {
      audio.play().then(() => {
        isPlaying = true;
        playBtn.textContent = '⏸';
        playBtn.classList.add('playing');
      }).catch(err => {
        console.warn('Autoplay bloqueado:', err);
        playBtn.title = 'Clique para iniciar a rádio';
      });
    };
    attemptAutoplay();
    
    playBtn.addEventListener('click', () => {
      if (isPlaying) {
        audio.pause();
        playBtn.textContent = '▶';
        playBtn.classList.remove('playing');
      } else {
        audio.play().catch(() => showToast('Erro ao reproduzir rádio', 'error'));
        playBtn.textContent = '⏸';
        playBtn.classList.add('playing');
      }
      isPlaying = !isPlaying;
    });
    
    volumeSlider.addEventListener('input', (e) => {
      audio.volume = e.target.value;
      muteBtn.textContent = audio.volume > 0 ? '🔊' : '🔇';
    });
    
    muteBtn.addEventListener('click', () => {
      if (audio.volume > 0) {
        lastVolume = audio.volume;
        audio.volume = 0;
        volumeSlider.value = 0;
        muteBtn.textContent = '🔇';
      } else {
        audio.volume = lastVolume || 0.5;
        volumeSlider.value = audio.volume;
        muteBtn.textContent = '🔊';
      }
    });
    
    audio.addEventListener('pause', () => {
      isPlaying = false;
      playBtn.textContent = '▶';
      playBtn.classList.remove('playing');
    });
    audio.addEventListener('play', () => {
      isPlaying = true;
      playBtn.textContent = '⏸';
      playBtn.classList.add('playing');
    });
    audio.addEventListener('error', () => {
      isPlaying = false;
      playBtn.textContent = '▶';
      playBtn.classList.remove('playing');
      showToast('Rádio indisponível', 'error');
    });
  }

  /* ---------- INICIALIZAÇÃO ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    await registerPageView();
    await loadCatalog();
    initFilters();
    initModal();
    initPromoCarousel();
    initRadioPlayer();
  });

})();