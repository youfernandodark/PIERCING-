// script.js
(function () {
    'use strict';

    /* ========== CONFIGURAÇÃO SUPABASE ========== */
    const SUPABASE_URL = 'https://hruldvebruatjcwaoozd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhydWxkdmVicnVhdGpjd2Fvb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjI2ODQsImV4cCI6MjA5MjMzODY4NH0.bWxI30NlY53ZBgGChW6xrdRtygiAt9Zt2oHZAD49ZQU';
    const isSupabaseConfigured = SUPABASE_URL.includes('SEU_PROJETO') === false && SUPABASE_URL.startsWith('https://');

    /* ========== ESTADO GLOBAL ========== */
    let supabase = null;
    let allProducts = [];
    let likesMap = {};
    let userLikes = new Set();
    let currentFilter = { search: '', onlyAvailable: false, sort: 'default' };

    const CACHE_KEY = 'dark013_catalog_cache_v2';
    const CACHE_DURATION = 5 * 60 * 1000;
    const userToken = (() => {
        let token = localStorage.getItem('dark013_user_token');
        if (!token) {
            token = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('dark013_user_token', token);
        }
        return token;
    })();

    /* ========== ELEMENTOS DOM ========== */
    const container = document.getElementById('productContainer');
    const modelCountDisplay = document.getElementById('modelCountDisplay');
    const viewCountValue = document.getElementById('viewCountValue');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const sortSelect = document.getElementById('sortSelect');
    const filterAvailableBtn = document.getElementById('filterAvailableBtn');
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.querySelector('.modal-content--product .modal-close');
    const modalOverlay = modal ? modal.querySelector('.modal-overlay') : null;
    const artistModal = document.getElementById('artistModal');
    const artistModalBody = document.getElementById('artistModalBody');
    const artistModalClose = document.querySelector('.modal-content--artist .modal-close');
    const artistModalOverlay = artistModal ? artistModal.querySelector('.modal-overlay') : null;

    /* ========== UTILITÁRIOS ========== */
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px) scale(0.95)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2800);
    }

    /* ========== INICIALIZAÇÃO SUPABASE ========== */
    if (isSupabaseConfigured) {
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase conectado');
        } catch (e) {
            console.warn('Supabase não inicializado:', e);
        }
    }

    /* ========== CACHE ========== */
    function saveToCache(products, likes, userLikeSet) {
        const cache = {
            timestamp: Date.now(),
            products,
            likes,
            userLikes: Array.from(userLikeSet || [])
        };
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
            // localStorage cheio
        }
    }

    function loadFromCache() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < CACHE_DURATION) {
                return {
                    products: data.products,
                    likes: data.likes,
                    userLikes: new Set(data.userLikes || [])
                };
            }
        } catch (e) {
            // Cache inválido
        }
        return null;
    }

    /* ========== FILTRAGEM E ORDENAÇÃO ========== */
    function filterAndSortProducts() {
        let filtered = [...allProducts];

        if (currentFilter.search) {
            const term = currentFilter.search.toLowerCase();
            filtered = filtered.filter(p =>
                (p.code ?? '').toLowerCase().includes(term) ||
                (p.name ?? '').toLowerCase().includes(term)
            );
        }

        if (currentFilter.onlyAvailable) {
            filtered = filtered.filter(p => p.is_available && p.stock_quantity > 0);
        }

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

    /* ========== CRIA HTML DO CARD (COMPONENTIZADO) ========== */
    function createCardHTML(product, likeCount, userLiked) {
        const thickness = product.thickness || '—';
        const postLength = product.post_length_options || '—';
        const adornmentDisplay = product.adornment_size || (product.ball_size ? `Esfera ${product.ball_size}` : '—');
        const closure = product.closure_type || '—';
        const stockQty = product.stock_quantity ?? 0;
        const isAvailable = product.is_available !== undefined ? product.is_available : (stockQty > 0);
        const availabilityText = isAvailable ? 'Disponível' : 'Indisponível';
        const availabilityClass = isAvailable ? 'available' : 'unavailable';
        const stockDisplay = stockQty > 0 ? `${stockQty} un.` : 'Esgotado';
        const lowStock = stockQty > 0 && stockQty <= 2;
        const userLikedClass = userLiked ? 'liked' : '';
        const unavailableClass = isAvailable ? '' : 'product-card--unavailable';

        return `
            <article class="product-card ${unavailableClass}" data-product-id="${product.id}" role="button" tabindex="0" aria-label="${product.name}, ${availabilityText}">
                <div class="product-card__image">
                    ${lowStock ? `<span class="low-stock-badge" title="Apenas ${stockQty} unidade(s) em estoque">🔥 Poucas un.</span>` : ''}
                    <img src="${product.image_url}" alt="${product.name}" loading="lazy" width="300" height="300"
                        onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27300%27 height=%27300%27%3E%3Crect fill=%27%23181818%27 width=%27300%27 height=%27300%27/%3E%3Ctext x=%2750%27 y=%2755%27 font-family=%27sans-serif%27 font-size=%2714%27 fill=%27%23666%27 text-anchor=%27middle%27%3E📷%3C/text%3E%3C/svg%3E'">
                </div>
                <div class="product-card__body">
                    <div class="product-card__header">
                        <span class="product-card__code">${product.code}</span>
                        <h3 class="product-card__name" title="${product.name}">${product.name}</h3>
                    </div>
                    <div class="product-card__specs">
                        <span class="spec-chip">📏 Esp: ${thickness}</span>
                        <span class="spec-chip">📐 Haste: ${postLength}</span>
                        <span class="spec-chip">💎 ${adornmentDisplay}</span>
                        <span class="spec-chip">🔒 Trava: ${closure}</span>
                        ${product.stone ? `<span class="spec-chip spec-chip--stone">🪨 ${product.stone}</span>` : ''}
                        <span class="spec-chip spec-chip--material">⚙️ ${product.material}</span>
                    </div>
                    <div class="product-card__footer">
                        <div class="stock-info">
                            <span class="availability-badge ${availabilityClass}">${availabilityText}</span>
                            <span class="stock-quantity">${stockDisplay}</span>
                        </div>
                        <div class="like-section">
                            <button class="like-button ${userLikedClass}" data-product-id="${product.id}"
                                aria-label="${userLiked ? 'Descurtir' : 'Curtir'} ${product.name}"
                                aria-pressed="${userLiked}">
                                <span class="like-icon" aria-hidden="true">${userLiked ? '❤️' : '🤍'}</span>
                                <span class="like-count" id="like-count-${product.id}">${likeCount}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    /* ========== RENDERIZAÇÃO DE PRODUTOS ========== */
    function renderProducts() {
        const filtered = filterAndSortProducts();

        if (!filtered.length) {
            container.innerHTML = '<div class="error-msg">Nenhum produto encontrado.</div>';
            modelCountDisplay.textContent = '0 modelos';
            return;
        }

        modelCountDisplay.textContent = `${filtered.length} modelo${filtered.length !== 1 ? 's' : ''}`;

        const html = filtered.map(prod => createCardHTML(prod, likesMap[prod.id] || 0, userLikes.has(prod.id))).join('');
        container.innerHTML = html;

        // Delegação de clique e teclado
        container.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.like-button')) return;
                const id = card.dataset.productId;
                const product = allProducts.find(p => p.id == id);
                if (product) openModal(product);
            });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });

        container.querySelectorAll('.like-button').forEach(btn => {
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
                    <div class="skeleton-body">
                        <div class="skeleton-line short"></div>
                        <div class="skeleton-line medium"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line long"></div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    /* ========== MODAL DE PRODUTO (COMPACTO) ========== */
    function getProductDescription(product) {
        if (product.description && product.description.trim() !== '') {
            return product.description;
        }
        const thickness = product.thickness || 'adequada';
        const material = product.material || 'Titânio ASTM F-136';
        const typeHint = (product.name || '').toLowerCase();

        let specificInfo = '';
        if (typeHint.includes('argola') || typeHint.includes('segmento')) {
            specificInfo = '• Confortável para uso diário, fecho de segmento garante fixação segura.\n';
        } else if (typeHint.includes('ferradura') || typeHint.includes('circular')) {
            specificInfo = '• Formato circular com esferas rosqueáveis, ideal para múltiplas perfurações.\n';
        } else if (typeHint.includes('labret') || typeHint.includes('flat')) {
            specificInfo = '• Disco plano na parte traseira minimiza atrito com gengivas e dentes.\n';
        } else if (typeHint.includes('banana') || typeHint.includes('curvo')) {
            specificInfo = '• Haste curva anatômica, perfeita para sobrancelha e umbigo.\n';
        }

        return `Joia confeccionada em ${material}, grau cirúrgico implantável.\n`
             + `• Totalmente biocompatível e hipoalergênico, livre de níquel.\n`
             + `• Espessura ${thickness}, esterilizada em autoclave.\n`
             + specificInfo
             + `• Recomendada para uso profissional em body piercing.\n`
             + `Consulte disponibilidade de tamanhos antes de agendar.`;
    }

    function openModal(product) {
        const likeCount = likesMap[product.id] || 0;
        const userLiked = userLikes.has(product.id);
        const thickness = product.thickness || '—';
        const postLength = product.post_length_options || '—';
        const adornment = product.adornment_size || (product.ball_size ? `Esfera ${product.ball_size}` : '—');
        const stockQty = product.stock_quantity ?? 0;
        const isAvailable = product.is_available !== undefined ? product.is_available : (stockQty > 0);
        const description = getProductDescription(product);

        // Layout mais compacto
        modalBody.innerHTML = `
            <div class="modal-image">
                <img src="${product.image_url}" alt="${product.name}" id="modalProductImage" loading="lazy">
            </div>
            <div class="modal-header">
                <h2 class="modal-title" id="modalTitle">${product.name}</h2>
                <span class="modal-code">${product.code} · ${product.material}</span>
                ${product.stone ? `<span class="stone-indicator">💎 ${product.stone}</span>` : ''}
            </div>
            <div class="modal-specs-compact">
                <div class="spec-item-compact">📏 <b>Esp:</b> ${thickness}</div>
                <div class="spec-item-compact">📐 <b>Haste:</b> ${postLength}</div>
                <div class="spec-item-compact">💎 <b>Adereço:</b> ${adornment}</div>
                <div class="spec-item-compact">🔒 <b>Trava:</b> ${product.closure_type || '—'}</div>
                <div class="spec-item-compact">📦 <b>Estoque:</b> ${isAvailable ? `${stockQty} un.` : 'Indisponível'}</div>
                <div class="spec-item-compact">❤️ <b>Curtidas:</b> <span id="modalLikeCount">${likeCount}</span></div>
            </div>
            <div class="modal-description">${description}</div>
            <div class="modal-actions">
                <button class="modal-like-btn ${userLiked ? 'liked' : ''}" id="modalLikeBtn" data-product-id="${product.id}"
                    aria-label="${userLiked ? 'Descurtir' : 'Curtir'} produto" aria-pressed="${userLiked}">
                    <span class="like-icon" aria-hidden="true">${userLiked ? '❤️' : '🤍'}</span>
                    ${userLiked ? 'Curtida' : 'Curtir'}
                </button>
            </div>
        `;

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        const modalLikeBtn = document.getElementById('modalLikeBtn');
        modalLikeBtn.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const id = btn.dataset.productId;
            btn.disabled = true;
            const result = await toggleLike(id);
            if (result.success) {
                updateLikeUIAfterToggle(id, result.action, likeCount);
            }
            btn.disabled = false;
        });

        const modalImg = document.getElementById('modalProductImage');
        if (modalImg) {
            modalImg.addEventListener('click', () => {
                modalImg.classList.toggle('zoomed');
            });
        }
    }

    function closeModal() {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    /* ========== MODAL DE ARTISTA ========== */
    const artistData = {
        fernando: {
            name: 'Fernando Dark',
            role: 'Tatuador & Body Piercer · Proprietário',
            avatar: 'https://i.ibb.co/v6hzMpNV/IMG-20250817-171554-861.jpg',
            bio: 'Fernando Dark é o fundador da DARK013TATTOO, com anos de experiência em tatuagens customizadas e piercings de alta precisão. Especializado em traços ousados, realismo e cobertura de cicatrizes, preza pela segurança e utilização de materiais de grau cirúrgico (ASTM F-136) em todos os procedimentos. Atendimento exclusivo com hora marcada, garantindo atenção total a cada cliente.',
            specialties: ['Realismo', 'Tattoos Delicadas', 'Traços Bold', 'Piercings'],
            whatsapp: 'https://wa.me/message/FLSHGYBYY47GE1?text=Olá! Gostaria de agendar um serviço na DARK013TATTOO'
        },
        thalia: {
            name: 'Thalia',
            role: 'Tatuadora · Especialista em Traços Finos',
            avatar: 'https://i.ibb.co/wF5kfM6M/IMG-20260426-WA0000.jpg',
            bio: 'Thalia é a artista delicada do estúdio, apaixonada por tatuagens finas, lettering e desenhos minimalistas. Seu traço suave e preciso transforma ideias em arte sobre a pele, sempre com foco no conforto e acolhimento. Ela acredita que cada tattoo é uma experiência única, e por isso dedica tempo para entender o significado de cada projeto antes de criá-lo.',
            specialties: ['Traços Finos', 'Lettering', 'Minimalismo', 'Aquarela'],
            whatsapp: 'https://wa.me/message/2NCM2O7J7ECRN1?text=Olá! Gostaria de agendar um serviço com a Thalia'
        }
    };

    function openArtistModal(artistKey) {
        const artist = artistData[artistKey];
        if (!artist || !artistModal || !artistModalBody) return;

        const tagsHtml = artist.specialties.map(s => `<span class="artist-profile__tag">${s}</span>`).join('');

        artistModalBody.innerHTML = `
            <div class="artist-profile">
                <div class="artist-profile__header">
                    <img src="${artist.avatar}" alt="${artist.name}" class="artist-profile__avatar" loading="lazy">
                    <div>
                        <div class="artist-profile__name" id="artistModalTitle">${artist.name}</div>
                        <div class="artist-profile__role">${artist.role}</div>
                    </div>
                </div>
                <div class="artist-profile__bio">${artist.bio}</div>
                <div class="artist-profile__specialties">${tagsHtml}</div>
                <div class="artist-profile__contact">
                    <a href="${artist.whatsapp}" class="modal-whatsapp-btn" target="_blank" rel="noopener noreferrer">
                        💬 Agendar com ${artist.name.split(' ')[0]}
                    </a>
                    <button class="modal-like-btn" id="closeArtistModalBtn">Fechar</button>
                </div>
            </div>
        `;

        artistModal.classList.add('active');
        artistModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        const closeBtn = document.getElementById('closeArtistModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeArtistModal);
        }
    }

    function closeArtistModal() {
        if (!artistModal) return;
        artistModal.classList.remove('active');
        artistModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    /* ========== SISTEMA DE LIKES ========== */
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
            console.error('Erro no like:', err);
            showToast('Erro ao curtir', 'error');
            return { success: false };
        }
    }

    function updateLikeUIAfterToggle(productId, action, previousCount) {
        const isNowLiked = action === 'added';
        userLikes[isNowLiked ? 'add' : 'delete'](productId);
        const newCount = isNowLiked ? (previousCount || likesMap[productId] || 0) + 1 : Math.max(0, (likesMap[productId] || 1) - 1);
        likesMap[productId] = newCount;

        // Vibração (mobile)
        if (navigator.vibrate) navigator.vibrate(20);

        // Atualizar contador no modal
        const modalCount = document.getElementById('modalLikeCount');
        if (modalCount) modalCount.textContent = newCount;

        // Atualizar botão no modal
        const modalBtn = document.getElementById('modalLikeBtn');
        if (modalBtn) {
            const iconSpan = modalBtn.querySelector('.like-icon');
            if (iconSpan) iconSpan.textContent = isNowLiked ? '❤️' : '🤍';
            modalBtn.childNodes[modalBtn.childNodes.length - 1] && (modalBtn.childNodes[modalBtn.childNodes.length - 1].textContent = isNowLiked ? ' Curtida' : ' Curtir');
            modalBtn.classList.toggle('liked', isNowLiked);
            modalBtn.setAttribute('aria-pressed', isNowLiked);
        }

        // Atualizar card correspondente
        const cardBtn = document.querySelector(`.like-button[data-product-id="${productId}"]`);
        if (cardBtn) {
            cardBtn.querySelector('.like-icon').textContent = isNowLiked ? '❤️' : '🤍';
            cardBtn.classList.toggle('liked', isNowLiked);
            cardBtn.setAttribute('aria-pressed', isNowLiked);
            const countSpan = document.getElementById(`like-count-${productId}`);
            if (countSpan) {
                countSpan.textContent = newCount;
                // Animação pop
                countSpan.classList.remove('like-pop');
                void countSpan.offsetWidth;
                countSpan.classList.add('like-pop');
            }
        }

        showToast(isNowLiked ? '❤️ Curtiu!' : '💔 Curtida removida');
        saveToCache(allProducts, likesMap, userLikes);
    }

    async function handleLikeClick(e) {
        e.stopPropagation();
        const button = e.currentTarget;
        const productId = button.dataset.productId;
        if (!productId) return;

        button.disabled = true;
        const previousCount = likesMap[productId] || 0;
        const result = await toggleLike(productId);
        if (result.success) {
            updateLikeUIAfterToggle(productId, result.action, previousCount);
        }
        button.disabled = false;
    }

    /* ========== CARREGAMENTO DE DADOS ========== */
    async function fetchFromSupabase() {
        if (!supabase) throw new Error('Supabase não configurado.');
        const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
        if (error) throw error;
        return data;
    }

    async function fetchLikesAndUserLikes() {
        if (!supabase) return { likesMap: {}, userLikes: new Set() };
        try {
            const { data: allLikes, error: errorAll } = await supabase.from('product_likes').select('product_id');
            if (errorAll) throw errorAll;
            const counts = {};
            allLikes.forEach(like => {
                counts[like.product_id] = (counts[like.product_id] || 0) + 1;
            });

            const { data: myLikes, error: errorMy } = await supabase
                .from('product_likes')
                .select('product_id')
                .eq('user_token', userToken);
            if (errorMy) throw errorMy;
            const mySet = new Set(myLikes.map(l => l.product_id));

            return { likesMap: counts, userLikes: mySet };
        } catch (err) {
            console.warn('Erro ao buscar likes:', err);
            return { likesMap: {}, userLikes: new Set() };
        }
    }

    async function seedInitialProductIfNeeded() {
        if (!supabase) return;
        try {
            const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
            if (count > 0) return;

            const initialProduct = {
                code: 'TN10',
                name: 'Ferradura',
                thickness: '1.2mm',
                post_length_options: '6mm, 8mm, 10mm, 12mm',
                ball_size: '3mm',
                closure_type: 'Rosca interna',
                material: 'Titânio ASTM F-136',
                image_url: 'https://cdn.dooca.store/149217/products/bz2bncigezjd3ucfkgnwkgtwfni7kqxtcvap_640x640+fill_ffffff.jpg',
                stock_quantity: 10,
                is_available: true,
                stone: null
            };
            await supabase.from('products').insert([initialProduct]);
            console.log('✅ Produto inicial inserido');
        } catch (err) {
            console.warn('⚠️ Seed automático falhou:', err.message);
        }
    }

    async function registerPageView() {
        if (!supabase) return;
        try {
            await supabase.from('page_views').insert([{ page: 'catalogo' }]);
        } catch (err) {
            // Silencioso
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
        } catch {
            viewCountValue.textContent = '?';
        }
    }

    async function loadCatalog() {
        renderSkeletons(6);

        if (!isSupabaseConfigured || !supabase) {
            container.innerHTML = '<div class="error-msg">Erro: conexão com o banco de dados não configurada.</div>';
            return;
        }

        try {
            const cached = loadFromCache();
            if (cached) {
                allProducts = cached.products;
                likesMap = cached.likes;
                userLikes = cached.userLikes;
                renderProducts();
                await fetchAndDisplayTotalViews();
            }

            await seedInitialProductIfNeeded();
            const products = await fetchFromSupabase();
            const { likesMap: freshLikesMap, userLikes: freshUserLikes } = await fetchLikesAndUserLikes();

            allProducts = products;
            likesMap = freshLikesMap;
            userLikes = freshUserLikes;
            saveToCache(products, freshLikesMap, freshUserLikes);

            renderProducts();
            await fetchAndDisplayTotalViews();
        } catch (err) {
            console.error('Erro ao carregar catálogo:', err);
            if (allProducts.length > 0) {
                showToast('Dados em cache exibidos', 'warning');
            } else {
                container.innerHTML = '<div class="error-msg">Falha ao carregar produtos. Tente novamente.</div>';
            }
        }
    }

    /* ========== INICIALIZAÇÃO DE EVENTOS ========== */
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
            searchInput.focus();
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
            if (e.key === 'Escape') {
                if (modal.classList.contains('active')) closeModal();
                if (artistModal && artistModal.classList.contains('active')) closeArtistModal();
            }
        });
    }

    function initArtistModal() {
        if (!artistModal || !artistModalClose || !artistModalOverlay) return;

        artistModalClose.addEventListener('click', closeArtistModal);
        artistModalOverlay.addEventListener('click', closeArtistModal);

        document.querySelectorAll('.promo-banner__desc-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const artistKey = btn.dataset.artist;
                if (artistKey) openArtistModal(artistKey);
            });
        });
    }

    function initPromoCarousel() {
        const slidesContainer = document.querySelector('.promo-slides');
        const slides = document.querySelectorAll('.promo-slide');
        const indicators = document.querySelectorAll('.indicator');
        const pauseBtn = document.querySelector('.carousel-pause-btn');
        if (!slidesContainer || slides.length < 2) return;

        let currentIndex = 0;
        let intervalId;
        let isPaused = false;

        const updateCarousel = (index) => {
            slidesContainer.style.transform = `translateX(-${index * 100}%)`;
            indicators.forEach((ind, i) => ind.classList.toggle('active', i === index));
            currentIndex = index;
        };

        const nextSlide = () => updateCarousel((currentIndex + 1) % slides.length);

        const startAutoPlay = () => {
            if (intervalId) clearInterval(intervalId);
            if (!isPaused) intervalId = setInterval(nextSlide, 7000);
        };

        const pauseAutoPlay = () => {
            clearInterval(intervalId);
            isPaused = true;
            pauseBtn.textContent = '▶️';
            pauseBtn.setAttribute('aria-label', 'Retomar carrossel');
        };

        const resumeAutoPlay = () => {
            isPaused = false;
            pauseBtn.textContent = '⏸️';
            pauseBtn.setAttribute('aria-label', 'Pausar carrossel');
            startAutoPlay();
        };

        startAutoPlay();

        pauseBtn.addEventListener('click', () => {
            isPaused ? resumeAutoPlay() : pauseAutoPlay();
        });

        indicators.forEach((ind, i) => {
            ind.addEventListener('click', () => {
                clearInterval(intervalId);
                updateCarousel(i);
                if (!isPaused) startAutoPlay();
            });

            ind.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    ind.click();
                }
            });
        });

        const carousel = document.querySelector('.promo-carousel');
        carousel.addEventListener('mouseenter', () => {
            if (!isPaused) clearInterval(intervalId);
        });
        carousel.addEventListener('mouseleave', () => {
            if (!isPaused) startAutoPlay();
        });

        let touchStartX = 0;
        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        carousel.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const threshold = 50;
            if (touchEndX < touchStartX - threshold) {
                clearInterval(intervalId);
                nextSlide();
                if (!isPaused) startAutoPlay();
            } else if (touchEndX > touchStartX + threshold) {
                clearInterval(intervalId);
                updateCarousel((currentIndex - 1 + slides.length) % slides.length);
                if (!isPaused) startAutoPlay();
            }
        });
    }

    function initRadioPlayer() {
        const audio = document.getElementById('radioAudio');
        const playBtn = document.getElementById('radioPlayBtn');
        const volumeSlider = document.getElementById('radioVolume');
        const muteBtn = document.getElementById('radioMuteBtn');

        if (!audio || !playBtn || !volumeSlider || !muteBtn) return;

        const STREAM_URL = 'https://live.hunter.fm/kpop_stream?ag=mp3';
        audio.src = STREAM_URL;
        audio.volume = volumeSlider.value;
        audio.preload = 'none';

        let isPlaying = false;
        let lastVolume = audio.volume;

        playBtn.addEventListener('click', () => {
            if (isPlaying) {
                audio.pause();
                playBtn.textContent = '▶';
                playBtn.classList.remove('playing');
                isPlaying = false;
            } else {
                audio.play().then(() => {
                    playBtn.textContent = '⏸';
                    playBtn.classList.add('playing');
                    isPlaying = true;
                }).catch(() => {
                    showToast('Erro ao reproduzir rádio', 'error');
                });
            }
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

    function generateStructuredData() {
        if (!allProducts.length) return;
        const items = allProducts.slice(0, 20).map(prod => ({
            '@type': 'Product',
            name: prod.name,
            image: prod.image_url,
            description: `${prod.code} - ${prod.material}`,
            sku: prod.code,
            offers: {
                '@type': 'Offer',
                availability: prod.is_available ? 'InStock' : 'OutOfStock',
                price: '0',
                priceCurrency: 'BRL'
            }
        }));
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: items.map((item, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item
            }))
        });
        document.head.appendChild(script);
    }

    /* ==================== NOVAS FUNÇÕES MOBILE APP ==================== */
    function initBottomNav() {
        const nav = document.getElementById('bottomNav');
        if (!nav) return;
        
        const items = nav.querySelectorAll('.bottom-nav__item');
        const sections = {
            home: document.querySelector('.promo-carousel'),
            catalog: document.getElementById('productContainer'),
            contact: null
        };

        items.forEach(item => {
            item.addEventListener('click', () => {
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const tab = item.dataset.tab;
                
                if (tab === 'home') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else if (tab === 'catalog') {
                    const catalogTitle = document.querySelector('.catalog-title');
                    if (catalogTitle) {
                        catalogTitle.scrollIntoView({ behavior: 'smooth' });
                    }
                } else if (tab === 'contact') {
                    window.open('https://wa.me/message/FLSHGYBYY47GE1?text=Olá! Vim pelo catálogo da DARK013TATTOO', '_blank');
                }

                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            });
        });

        window.addEventListener('scroll', () => {
            const catalogRect = document.querySelector('.catalog-title')?.getBoundingClientRect();
            if (catalogRect && catalogRect.top < window.innerHeight / 2) {
                items.forEach(i => i.classList.remove('active'));
                const catalogBtn = nav.querySelector('[data-tab="catalog"]');
                if (catalogBtn) catalogBtn.classList.add('active');
            } else {
                items.forEach(i => i.classList.remove('active'));
                const homeBtn = nav.querySelector('[data-tab="home"]');
                if (homeBtn) homeBtn.classList.add('active');
            }
        }, { passive: true });
    }

    function initPullToRefresh() {
        const ptr = document.getElementById('ptrIndicator');
        if (!ptr) return;

        let startY = 0;
        let pulling = false;
        let refreshing = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!pulling || refreshing) return;
            const delta = e.touches[0].clientY - startY;
            if (delta > 40) {
                ptr.classList.add('pulling');
            }
        }, { passive: true });

        document.addEventListener('touchend', async () => {
            if (!pulling) return;
            pulling = false;

            if (ptr.classList.contains('pulling') && !refreshing) {
                refreshing = true;
                ptr.classList.add('refreshing');
                ptr.classList.remove('pulling');

                try {
                    await loadCatalog();
                    showToast('Catálogo atualizado ✨', 'success');
                } catch {
                    showToast('Erro ao atualizar', 'error');
                }

                setTimeout(() => {
                    ptr.classList.remove('refreshing');
                    refreshing = false;
                }, 600);
            } else {
                ptr.classList.remove('pulling');
            }
        });
    }

    function initSwipeToDismissModal() {
        const modalContent = document.querySelector('.modal-content--product');
        if (!modalContent) return;

        let touchStartY = 0;
        let currentTranslate = 0;
        let isDragging = false;

        modalContent.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            isDragging = true;
            modalContent.style.transition = 'none';
        }, { passive: true });

        modalContent.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const delta = e.touches[0].clientY - touchStartY;
            if (delta > 0) {
                currentTranslate = delta;
                modalContent.style.transform = `translateY(${delta}px)`;
                modalContent.classList.add('swiping');
            }
        }, { passive: true });

        modalContent.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            modalContent.style.transition = 'transform 0.25s ease-out';

            if (currentTranslate > 120) {
                closeModal();
            }
            
            modalContent.style.transform = '';
            modalContent.classList.remove('swiping');
            currentTranslate = 0;
        });
    }

    function initTouchOptimizations() {
        document.querySelectorAll('button, a, .product-card').forEach(el => {
            el.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            }, { passive: true });
            el.addEventListener('touchend', function() {
                this.classList.remove('touch-active');
            }, { passive: true });
        });
    }

    /* ========== INICIALIZAÇÃO PRINCIPAL ========== */
    document.addEventListener('DOMContentLoaded', async () => {
        await registerPageView();
        await loadCatalog();
        initFilters();
        initModal();
        initPromoCarousel();
        initRadioPlayer();
        initArtistModal();
        generateStructuredData();
        
        initBottomNav();
        initPullToRefresh();
        initSwipeToDismissModal();
        initTouchOptimizations();
    });
})();