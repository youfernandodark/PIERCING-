(function() {
  "use strict";

  /* ---------- CONFIGURAÇÃO SUPABASE ---------- */
  const SUPABASE_URL = "https://hruldvebruatjcwaoozd.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhydWxkdmVicnVhdGpjd2Fvb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjI2ODQsImV4cCI6MjA5MjMzODY4NH0.bWxI30NlY53ZBgGChW6xrdRtygiAt9Zt2oHZAD49ZQU";
  
  const isSupabaseConfigured = SUPABASE_URL.includes("SEU_PROJETO") === false && 
                               SUPABASE_URL.startsWith("https://");

  const container = document.getElementById('productContainer');
  
  /* ---------- RENDERIZAÇÃO ---------- */
  function renderProducts(products) {
    if (!products || products.length === 0) {
      container.innerHTML = '<div class="error-msg">Nenhum produto encontrado no catálogo.</div>';
      return;
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
      const stoneHtml = prod.stone ? 
        `<div class="stone-indicator">💎 ${prod.stone}</div>` : '';

      // Controle de disponibilidade
      const stockQty = prod.stock_quantity ?? 0;
      const isAvailable = prod.is_available !== undefined ? prod.is_available : (stockQty > 0);
      const availabilityText = isAvailable ? 'Disponível' : 'Indisponível';
      const availabilityClass = isAvailable ? 'available' : 'unavailable';
      const stockDisplay = stockQty > 0 ? `${stockQty} unidade${stockQty > 1 ? 's' : ''}` : 'Esgotado';
      
      html += `
        <div class="product-card">
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
            <div class="stock-info">
              <span class="availability-badge ${availabilityClass}">${availabilityText}</span>
              <span class="stock-quantity">${stockDisplay}</span>
            </div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  /* ---------- SKELETON LOADER ---------- */
  function renderSkeletons(count = 6) {
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
  } else {
    console.error('❌ Credenciais do Supabase não configuradas.');
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

  /* ---------- REGISTRO DE VISITAS (page_views) ---------- */
  async function registerPageView() {
    if (!supabase) return;
    try {
      await supabase.from('page_views').insert([{ page: 'catalogo' }]);
      console.log('📊 Visita registrada no Supabase');
    } catch (err) {
      console.warn('⚠️ Erro ao registrar visita:', err.message);
    }
  }

  /* ---------- CARREGAMENTO DO CATÁLOGO ---------- */
  async function loadCatalog() {
    // Exibe skeletons imediatamente
    renderSkeletons(6);
    
    if (!isSupabaseConfigured || !supabase) {
      container.innerHTML = '<div class="error-msg">Erro: conexão com o banco de dados não configurada.</div>';
      return;
    }

    try {
      const data = await fetchFromSupabase();
      renderProducts(data);
      console.log('📦 Catálogo carregado do Supabase');
    } catch (err) {
      console.error('Erro ao carregar catálogo do Supabase:', err);
      container.innerHTML = '<div class="error-msg">Falha ao carregar os produtos. Tente novamente mais tarde.</div>';
    }
  }

  /* ---------- INICIALIZAÇÃO ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    registerPageView();
    loadCatalog();
  });

})();