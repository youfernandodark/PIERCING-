(function() {
  "use strict";

  /* ---------- CONFIGURAÇÃO SUPABASE ---------- */
  const SUPABASE_URL = "https://hruldvebruatjcwaoozd.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhydWxkdmVicnVhdGpjd2Fvb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjI2ODQsImV4cCI6MjA5MjMzODY4NH0.bWxI30NlY53ZBgGChW6xrdRtygiAt9Zt2oHZAD49ZQU";
  
  const isSupabaseConfigured = SUPABASE_URL.includes("SEU_PROJETO") === false && 
                               SUPABASE_URL.startsWith("https://");

  /* ---------- DADOS ESTÁTICOS (catálogo local) ---------- */
  const staticProducts = [
    {
      id: 1,
      code: "TN54",
      name: "Labret Stone",
      thickness: "1.2mm",
      post_length_options: "6mm, 8mm",
      adornment_size: "2mm, 2.5mm, 3mm",
      ball_size: null,
      closure_type: "Rosca interna",
      material: "Titânio ASTM F-136",
      stone: "Zircônia cúbica",
      image_url: "https://cdn.dooca.store/149217/products/i4gv7ag18wggnxes422rvew637xopnjitkjh_640x640+fill_ffffff.jpg?v=1723906236&webp=0",
      stock_quantity: 5,
      is_available: true
    },
    {
      id: 2,
      code: "TN238",
      name: "Labret",
      thickness: "1.2mm",
      post_length_options: "6mm, 7mm, 8mm, 10mm, 12mm",
      adornment_size: null,
      ball_size: "3mm",
      closure_type: "Rosca interna",
      material: "Titânio ASTM F-136",
      stone: null,
      image_url: "https://cdn.dooca.store/149217/products/b31yhpotj21xrbpwxq0s16gnervsbmacjxhq_640x640+fill_ffffff.jpg?v=1714411709&webp=0",
      stock_quantity: 2,
      is_available: true
    },
    {
      id: 3,
      code: "TN09",
      name: "Microbell Curvo",
      thickness: "1.2mm",
      post_length_options: "6mm, 8mm, 10mm, 12mm",
      adornment_size: null,
      ball_size: "3mm",
      closure_type: "Rosca interna",
      material: "Titânio ASTM F-136",
      stone: null,
      image_url: "https://cdn.dooca.store/149217/products/d0opmepxmrko8qeu06nc2gqmy1gfzhivncjj_640x640+fill_ffffff.jpg?v=1715008547&webp=0",
      stock_quantity: 0,
      is_available: false
    },
    {
      id: 4,
      code: "TN13",
      name: "Segmento Articulado",
      thickness: "1.2mm",
      post_length_options: "6mm, 8mm, 10mm, 12mm",
      adornment_size: null,
      ball_size: null,
      closure_type: "Clicker",
      material: "Titânio ASTM F-136",
      stone: null,
      image_url: "https://cdn.dooca.store/149217/products/6w3ufphp0pdx5vn7ybfq929ynj2355auyf3t_640x640+fill_ffffff.jpg?v=1715006528&webp=0",
      stock_quantity: 8,
      is_available: true
    },
    {
      id: 5,
      code: "TN57-1",
      name: "Nostril Cravado",
      thickness: "1.0mm",
      post_length_options: "8mm",
      adornment_size: null,
      ball_size: null,
      closure_type: "Rosca interna",
      material: "Titânio ASTM F-136",
      stone: "Zircônia cúbica",
      image_url: "https://cdn.dooca.store/149217/products/g3obdnce2820ixfm7ukowxcdzl3gjyx8aa1r_640x640+fill_ffffff.jpg?v=1715011644&webp=0",
      stock_quantity: 1,
      is_available: true
    },
    {
      id: 6,
      code: "TN99",
      name: "Navel Piercing",
      thickness: "1.6mm",
      post_length_options: "10mm",
      adornment_size: "8,0mm * 5,0mm (Médio)",
      ball_size: null,
      closure_type: "Rosca interna",
      material: "Titânio ASTM F-136",
      stone: "Zircônia cúbica",
      image_url: "https://cdn.dooca.store/149217/products/tys0wmoqwwgff0hp5hpz6nctn3ycljmcjaaa_640x640+fill_ffffff.jpg?v=1714413218&webp=0",
      stock_quantity: 3,
      is_available: true
    }
  ];

  /* ---------- RENDERIZAÇÃO ---------- */
  const container = document.getElementById('productContainer');
  
  function renderProducts(products) {
    if (!products || products.length === 0) {
      container.innerHTML = '<div class="error-msg">Nenhum produto encontrado.</div>';
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

  /* ---------- REGISTRO DE VISITAS (page_views) ---------- */
  async function registerPageView() {
    if (!supabase) return;
    try {
      await supabase.from('page_views').insert([{ 
        page: 'catalogo',
      }]);
      console.log('📊 Visita registrada no Supabase');
    } catch (err) {
      console.warn('⚠️ Erro ao registrar visita:', err.message);
    }
  }

  /* ---------- CARREGAMENTO DO CATÁLOGO ---------- */
  async function loadCatalog() {
    container.innerHTML = '<div class="loading">Carregando catálogo...</div>';
    
    if (isSupabaseConfigured && supabase) {
      try {
        const data = await fetchFromSupabase();
        renderProducts(data);
        console.log('📦 Catálogo carregado do Supabase');
      } catch (err) {
        console.error('Erro ao carregar do Supabase, usando catálogo local:', err);
        renderProducts(staticProducts);
      }
    } else {
      renderProducts(staticProducts);
      console.log('📦 Catálogo local carregado');
    }
  }

  /* ---------- INICIALIZAÇÃO ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    registerPageView();
    loadCatalog();
  });

})();