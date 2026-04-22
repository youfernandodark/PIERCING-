(function() {
  "use strict";

  /* ---------- CONFIGURAÇÃO SUPABASE ---------- */
  const SUPABASE_URL = "https://hruldvebruatjcwaoozd.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhydWxkdmVicnVhdGpjd2Fvb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjI2ODQsImV4cCI6MjA5MjMzODY4NH0.bWxI30NlY53ZBgGChW6xrdRtygiAt9Zt2oHZAD49ZQU";
  
  const isSupabaseConfigured = SUPABASE_URL.includes("SEU_PROJETO") === false && 
                               SUPABASE_URL.startsWith("https://");

  const container = document.getElementById('productContainer');
  const modelCountDisplay = document.getElementById('modelCountDisplay');
  const viewCountValue = document.getElementById('viewCountValue');
  
  const getUserToken = () => {
    let token = localStorage.getItem('dark013_user_token');
    if (!token) {
      token = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('dark013_user_token', token);
    }
    return token;
  };
  const userToken = getUserToken();

  /* ---------- RENDERIZAÇÃO ---------- */
  function renderProducts(products, likesMap = {}) {
    if (!products || products.length === 0) {
      container.innerHTML = '<div class="error-msg">Nenhum produto encontrado no catálogo.</div>';
      if (modelCountDisplay) modelCountDisplay.textContent = '0 modelos';
      return;
    }
    
    if (modelCountDisplay) {
      modelCountDisplay.textContent = `${products.length} modelo${products.length > 1 ? 's' : ''}`;
    }
    
    let html = '';
    products.forEach(prod => {
      const thickness = prod.thickness || '—';
      const postLength = prod.post_length_options || '—';
      let adornmentDisplay = '';
      if (prod.adornment_size) adornmentDisplay = prod.adornment_size;
      else if (prod.ball_size) adornmentDisplay = `Esfera ${prod.ball_size}`;
      else adornmentDisplay = '—';
      
      const closure = prod.closure_type || '—';
      const stoneHtml = prod.stone ? `<div class="stone-indicator">💎 ${prod.stone}</div>` : '';
      const stockQty = prod.stock_quantity ?? 0;
      const isAvailable = prod.is_available !== undefined ? prod.is_available : (stockQty > 0);
      const availabilityText = isAvailable ? 'Disponível' : 'Indisponível';
      const availabilityClass = isAvailable ? 'available' : 'unavailable';
      const stockDisplay = stockQty > 0 ? `${stockQty} unidade${stockQty > 1 ? 's' : ''}` : 'Esgotado';
      const likeCount = likesMap[prod.id] || 0;
      
      html += `
        <div class="product-card" data-product-id="${prod.id}">
          <div class="product-image">
            <img src="${prod.image_url}" alt="${prod.name}" loading="lazy" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23222222\'/%3E%3Ctext x=\'50\' y=\'55\' font-family=\'sans-serif\' font-size=\'12\' fill=\'%23999999\' text-anchor=\'middle\'%3ESem imagem%3C/text%3E%3C/svg%3E'; this.style.opacity='1'">
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

    document.querySelectorAll('.like-button').forEach(btn => {
      btn.addEventListener('click', handleLikeClick);
    });
  }

  function renderSkeletons(count = 6) {
    if (modelCountDisplay) modelCountDisplay.textContent = '...';
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

  /* ---------- SUPABASE CLIENT ---------- */
  let supabase = null;
  if (isSupabaseConfigured) {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase inicializado');
    } catch (e) {
      console.warn("Supabase não inicializado:", e);
    }
  }

  async function fetchFromSupabase() {
    if (!supabase) throw new Error("Supabase não configurado.");
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return data;
  }

  async function seedInitialProductIfNeeded() {
    if (!supabase) return;
    try {
      const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      if (countError) throw countError;
      if (count > 0) return;
      
      console.log('📦 Tabela vazia. Inserindo produto inicial TN10...');
      const initialProduct = {
        code: 'TN10',
        name: 'Ferradura',
        thickness: '1.2mm',
        post_length_options: '6mm, 8mm, 10mm, 12mm',
        ball_size: '3mm',
        closure_type: 'Rosca interna',
        material: 'Titânio ASTM F-136',
        image_url: 'https://cdn.dooca.store/149217/products/bz2bncigezjd3ucfkgnwkgtwfni7kqxtcvap_640x640+fill_ffffff.jpg?v=1714414393&webp=0',
        stock_quantity: 10,
        is_available: true,
        stone: null
      };
      const { error: insertError } = await supabase.from('products').insert([initialProduct]);
      if (insertError) throw insertError;
      console.log('✅ Produto TN10 inserido com sucesso!');
    } catch (err) {
      console.warn('⚠️ Não foi possível executar o seed automático:', err.message);
    }
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

  async function toggleLike(productId) {
    if (!supabase) {
      alert('Conexão com o servidor indisponível.');
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
      alert('Não foi possível registrar sua curtida. Tente novamente.');
      return { success: false };
    }
  }

  async function handleLikeClick(e) {
    e.preventDefault();
    const button = e.currentTarget;
    const productId = button.dataset.productId;
    if (!productId) return;
    button.disabled = true;
    const result = await toggleLike(productId);
    if (result.success) {
      const countSpan = document.getElementById(`like-count-${productId}`);
      if (countSpan) {
        let current = parseInt(countSpan.textContent, 10) || 0;
        countSpan.textContent = result.action === 'added' ? current + 1 : Math.max(0, current - 1);
      }
    }
    button.disabled = false;
  }

  async function registerPageView() {
    if (!supabase) return;
    try {
      await supabase.from('page_views').insert([{ page: 'catalogo' }]);
      console.log('📊 Visita registrada no Supabase');
    } catch (err) {
      console.warn('⚠️ Erro ao registrar visita:', err.message);
    }
  }

  async function fetchAndDisplayTotalViews() {
    if (!supabase || !viewCountValue) return;
    try {
      const { count, error } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('page', 'catalogo');
      if (error) throw error;
      viewCountValue.textContent = count || 0;
    } catch (err) {
      console.warn('Erro ao buscar total de visualizações:', err);
      viewCountValue.textContent = '?';
    }
  }

  async function loadCatalog() {
    renderSkeletons(6);
    if (!isSupabaseConfigured || !supabase) {
      container.innerHTML = '<div class="error-msg">Erro: conexão com o banco de dados não configurada.</div>';
      if (modelCountDisplay) modelCountDisplay.textContent = 'Erro';
      return;
    }
    try {
      await seedInitialProductIfNeeded();
      const products = await fetchFromSupabase();
      const productIds = products.map(p => p.id);
      const freshLikesMap = await fetchLikesForProducts(productIds);
      renderProducts(products, freshLikesMap);
      await fetchAndDisplayTotalViews();
    } catch (err) {
      console.error('Erro ao carregar catálogo:', err);
      container.innerHTML = '<div class="error-msg">Falha ao carregar os produtos. Tente novamente mais tarde.</div>';
      if (modelCountDisplay) modelCountDisplay.textContent = 'Falha';
    }
  }

  /* ---------- CARROSSEL ---------- */
  function initPromoCarousel() {
    const slidesContainer = document.querySelector('.promo-slides');
    const slides = document.querySelectorAll('.promo-slide');
    const indicators = document.querySelectorAll('.indicator');
    if (!slidesContainer || slides.length < 2) return;

    let currentIndex = 0;
    let intervalId;

    function updateCarousel(index) {
      slidesContainer.style.transform = `translateX(-${index * 100}%)`;
      indicators.forEach((ind, i) => {
        ind.classList.toggle('active', i === index);
      });
      currentIndex = index;
    }

    function nextSlide() {
      const next = (currentIndex + 1) % slides.length;
      updateCarousel(next);
    }

    intervalId = setInterval(nextSlide, 5000);

    indicators.forEach((ind, i) => {
      ind.addEventListener('click', () => {
        clearInterval(intervalId);
        updateCarousel(i);
        intervalId = setInterval(nextSlide, 5000);
      });
    });

    const carousel = document.querySelector('.promo-carousel');
    carousel.addEventListener('mouseenter', () => clearInterval(intervalId));
    carousel.addEventListener('mouseleave', () => {
      intervalId = setInterval(nextSlide, 5000);
    });

    let touchStartX = 0;
    let touchEndX = 0;
    carousel.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    carousel.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });
    function handleSwipe() {
      const threshold = 50;
      if (touchEndX < touchStartX - threshold) {
        clearInterval(intervalId);
        nextSlide();
        intervalId = setInterval(nextSlide, 5000);
      } else if (touchEndX > touchStartX + threshold) {
        clearInterval(intervalId);
        const prev = (currentIndex - 1 + slides.length) % slides.length;
        updateCarousel(prev);
        intervalId = setInterval(nextSlide, 5000);
      }
    }
  }

  /* ---------- PLAYER DE RÁDIO (AUTOPLAY COM SOM, SEM MUTED) ---------- */
  function initRadioPlayer() {
    const audio = document.getElementById('radioAudio');
    const playBtn = document.getElementById('radioPlayBtn');
    const volumeSlider = document.getElementById('radioVolume');
    
    // Substitua pela sua rádio favorita
    const DEFAULT_RADIO_STREAM = 'https://live.hunter.fm/kpop_stream?ag=mp3';
    
    if (!audio || !playBtn || !volumeSlider) return;
    
    audio.src = DEFAULT_RADIO_STREAM;
    audio.volume = volumeSlider.value;
    // Removido audio.muted = true; agora começa com som (se permitido)
    
    let isPlaying = false;
    
    // Tentar autoplay assim que possível
    const attemptAutoplay = () => {
      audio.play().then(() => {
        isPlaying = true;
        playBtn.textContent = '⏸';
        playBtn.classList.add('playing');
      }).catch(err => {
        console.warn('Autoplay com som bloqueado pelo navegador:', err);
        // Exibe uma dica visual sutil (não usa alert para não irritar)
        playBtn.title = 'Clique para iniciar a rádio';
        // O botão permanece como play; usuário precisará clicar
      });
    };
    
    attemptAutoplay();
    
    const togglePlay = () => {
      if (isPlaying) {
        audio.pause();
        playBtn.textContent = '▶';
        playBtn.classList.remove('playing');
      } else {
        audio.play().catch(err => {
          console.warn('Erro ao reproduzir rádio:', err);
          alert('Não foi possível reproduzir a rádio. Verifique a stream ou sua conexão.');
          return;
        });
        playBtn.textContent = '⏸';
        playBtn.classList.add('playing');
      }
      isPlaying = !isPlaying;
    };
    
    playBtn.addEventListener('click', togglePlay);
    
    volumeSlider.addEventListener('input', (e) => {
      audio.volume = e.target.value;
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
      alert('A rádio não está disponível no momento.');
    });
  }

  /* ---------- INICIALIZAÇÃO ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    await registerPageView();
    await loadCatalog();
    await fetchAndDisplayTotalViews();
    initPromoCarousel();
    initRadioPlayer();
  });

})();