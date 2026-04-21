(function() {
  "use strict";

  // ---------- CONFIGURAÇÃO SUPABASE ----------
  // Substitua pelos dados do seu projeto
  const SUPABASE_URL = "https://SEU_PROJETO.supabase.co";
  const SUPABASE_ANON_KEY = "SUA_ANON_KEY";
  
  const isSupabaseConfigured = SUPABASE_URL.includes("SEU_PROJETO") === false && 
                               SUPABASE_URL.startsWith("https://");
  
  // ---------- DADOS ESTÁTICOS (catálogo local) ----------
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
      image_url: "https://cdn.dooca.store/149217/products/i4gv7ag18wggnxes422rvew637xopnjitkjh_640x640+fill_ffffff.jpg?v=1723906236&webp=0"
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
      image_url: "https://cdn.dooca.store/149217/products/b31yhpotj21xrbpwxq0s16gnervsbmacjxhq_640x640+fill_ffffff.jpg?v=1714411709&webp=0"
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
      image_url: "https://cdn.dooca.store/149217/products/d0opmepxmrko8qeu06nc2gqmy1gfzhivncjj_640x640+fill_ffffff.jpg?v=1715008547&webp=0"
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
      image_url: "https://cdn.dooca.store/149217/products/6w3ufphp0pdx5vn7ybfq929ynj2355auyf3t_640x640+fill_ffffff.jpg?v=1715006528&webp=0"
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
      image_url: "https://cdn.dooca.store/149217/products/g3obdnce2820ixfm7ukowxcdzl3gjyx8aa1r_640x640+fill_ffffff.jpg?v=1715011644&webp=0"
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
      image_url: "https://cdn.dooca.store/149217/products/tys0wmoqwwgff0hp5hpz6nctn3ycljmcjaaa_640x640+fill_ffffff.jpg?v=1714413218&webp=0"
    }
  ];

  // ---------- RENDERIZAÇÃO ----------
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
        `<div class="stone-indicator"> ${prod.stone}</div>` : '';
      
      html += `
        <div class="product-card">
          <div class="product-image">
            <img src="${prod.image_url}" alt="${prod.name}" loading="lazy" onerror="this.style.opacity='0.4'">
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
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // ---------- SUPABASE CLIENT ----------
  let supabase = null;
  if (isSupabaseConfigured) {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      document.getElementById('supabasePanel').style.display = 'flex';
      document.getElementById('supabaseStatus').innerText = ' Pronto para conectar';
    } catch (e) {
      console.warn("Supabase não inicializado:", e);
    }
  } else {
    const panel = document.getElementById('supabasePanel');
    if (panel) panel.style.display = 'none';
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

  async function loadCatalog(forceSupabase = false) {
    container.innerHTML = '<div class="loading">Carregando catálogo...</div>';
    
    if (forceSupabase && supabase) {
      try {
        const data = await fetchFromSupabase();
        renderProducts(data);
        document.getElementById('supabaseStatus').innerText = ' Dados do Supabase';
      } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="error-msg">Erro ao carregar do Supabase. Usando catálogo local.</div>';
        renderProducts(staticProducts);
        document.getElementById('supabaseStatus').innerText = ' Fallback local';
      }
    } else {
      renderProducts(staticProducts);
      if (supabase) {
        document.getElementById('supabaseStatus').innerText = ' Catálogo local (estático)';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const useSupabaseInitially = isSupabaseConfigured;
    loadCatalog(useSupabaseInitially);
    
    const useSupabaseBtn = document.getElementById('useSupabaseBtn');
    const useStaticBtn = document.getElementById('useStaticBtn');
    
    if (useSupabaseBtn) {
      useSupabaseBtn.addEventListener('click', () => loadCatalog(true));
    }
    if (useStaticBtn) {
      useStaticBtn.addEventListener('click', () => loadCatalog(false));
    }
  });

})();

/*
  ============================================
  SQL PARA CRIAR TABELA NO SUPABASE
  ============================================
  Execute o script abaixo no SQL Editor do Supabase:
  
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    thickness VARCHAR(20),
    post_length_options TEXT,
    adornment_size TEXT,
    ball_size VARCHAR(20),
    closure_type VARCHAR(50),
    material VARCHAR(100) DEFAULT 'Titânio ASTM F-136',
    stone VARCHAR(50),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Inserir os produtos (exemplo com os dados fornecidos)
  INSERT INTO products (code, name, thickness, post_length_options, adornment_size, ball_size, closure_type, material, stone, image_url) VALUES
  ('TN54', 'Labret Stone', '1.2mm', '6mm, 8mm', '2mm, 2.5mm, 3mm', NULL, 'Rosca interna', 'Titânio ASTM F-136', 'Zircônia cúbica', 'https://cdn.dooca.store/149217/products/i4gv7ag18wggnxes422rvew637xopnjitkjh_640x640+fill_ffffff.jpg?v=1723906236&webp=0'),
  ('TN238', 'Labret', '1.2mm', '6mm, 7mm, 8mm, 10mm, 12mm', NULL, '3mm', 'Rosca interna', 'Titânio ASTM F-136', NULL, 'https://cdn.dooca.store/149217/products/b31yhpotj21xrbpwxq0s16gnervsbmacjxhq_640x640+fill_ffffff.jpg?v=1714411709&webp=0'),
  ('TN09', 'Microbell Curvo', '1.2mm', '6mm, 8mm, 10mm, 12mm', NULL, '3mm', 'Rosca interna', 'Titânio ASTM F-136', NULL, 'https://cdn.dooca.store/149217/products/d0opmepxmrko8qeu06nc2gqmy1gfzhivncjj_640x640+fill_ffffff.jpg?v=1715008547&webp=0'),
  ('TN13', 'Segmento Articulado', '1.2mm', '6mm, 8mm, 10mm, 12mm', NULL, NULL, 'Clicker', 'Titânio ASTM F-136', NULL, 'https://cdn.dooca.store/149217/products/6w3ufphp0pdx5vn7ybfq929ynj2355auyf3t_640x640+fill_ffffff.jpg?v=1715006528&webp=0'),
  ('TN57-1', 'Nostril Cravado', '1.0mm', '8mm', NULL, NULL, 'Rosca interna', 'Titânio ASTM F-136', 'Zircônia cúbica', 'https://cdn.dooca.store/149217/products/g3obdnce2820ixfm7ukowxcdzl3gjyx8aa1r_640x640+fill_ffffff.jpg?v=1715011644&webp=0'),
  ('TN99', 'Navel Piercing', '1.6mm', '10mm', '8,0mm * 5,0mm (Médio)', NULL, 'Rosca interna', 'Titânio ASTM F-136', 'Zircônia cúbica', 'https://cdn.dooca.store/149217/products/tys0wmoqwwgff0hp5hpz6nctn3ycljmcjaaa_640x640+fill_ffffff.jpg?v=1714413218&webp=0');
*/