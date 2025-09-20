(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
  const fmtBRL = (n) => (isNaN(+n) ? "R$ 0,00" : (+n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}));
  const uid = (prefix="id") => `${prefix}_${Math.random().toString(36).slice(2,9)}`;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const html = (strings, ...vals) => strings.map((s,i)=>s+(vals[i]??"")).join("");

  const K = {
    CART: "vini_cart_v2",
    THEME: "vini_theme",
    METRICS: "vini_metrics",
    COUPON: "vini_coupon",
  };
  const store = {
    get(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
    del(k){ localStorage.removeItem(k); }
  };

  const bus = {
    events: {},
    on(evt, fn){ (this.events[evt]??=([])).push(fn); },
    emit(evt, payload){ (this.events[evt]||[]).forEach(fn=>fn(payload)); }
  };

  const theme = {
    init(){
      const saved = store.get(K.THEME, "dark");
      document.documentElement.dataset.theme = saved;
      this.mountToggle();
    },
    toggle(){
      const cur = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = cur;
      store.set(K.THEME, cur);
      toast(`Tema: ${cur === "dark" ? "escuro" : "claro"}`);
    },
    mountToggle(){
      if ($("#theme-toggle")) return;
      const hdr = $("header .wrap") || $("header");
      if (!hdr) return;
      const btn = document.createElement("button");
      btn.id = "theme-toggle";
      btn.type = "button";
      btn.textContent = "Tema";
      btn.style.cssText = "margin-left:auto;border:0;border-radius:10px;padding:.45rem .7rem;font-weight:700;cursor:pointer;background:#0ea5e9;color:#001018";
      on(btn,"click",()=>this.toggle());
      hdr.appendChild(btn);
    }
  };

  const ensureStyles = () => {
    if ($("#adv-styles")) return;
    const s = document.createElement("style");
    s.id = "adv-styles";
    s.textContent = `
      :root{--c-accent:#0ea5e9;--c-bg:#0b0f1a;--c-card:rgba(17,24,39,.88);--c-border:#0b1220;--c-text:#f3f4f6;}
      [data-theme="light"]{--c-bg:#f8fafc;--c-card:#ffffff;--c-border:#e5e7eb;--c-text:#0f172a;}
      body{background:var(--c-bg);color:var(--c-text);}
      .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);
             background:var(--c-accent);color:#001018;padding:.7rem 1rem;border-radius:12px;
             font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.35);z-index:9999;opacity:0;
             transition:opacity .2s, transform .2s;}
      .toast.show{opacity:1;transform:translateX(-50%) translateY(-4px);}
      .lightbox{position:fixed;inset:0;background:rgba(0,0,0,.75);display:none;
                z-index:9998;align-items:center;justify-content:center;padding:16px;}
      .lightbox.open{display:flex;}
      .lightbox img{max-width:96vw;max-height:86vh;border-radius:12px;background:#000}
      #btn-topo{position:fixed;right:16px;bottom:16px;background:var(--c-accent);color:#001018;border:0;border-radius:999px;padding:.6rem .9rem;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.35);display:none;z-index:9997;}
      /* Drawer carrinho */
      .drawer{position:fixed;top:0;right:0;height:100%;width:min(420px,92vw);background:var(--c-card);border-left:1px solid var(--c-border);box-shadow:-8px 0 24px rgba(0,0,0,.4);transform:translateX(100%);transition:transform .25s ease;z-index:9996;display:flex;flex-direction:column;}
      .drawer.open{transform:translateX(0);}
      .drawer-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--c-border);}
      .drawer-body{flex:1;overflow:auto;padding:10px 14px;display:flex;flex-direction:column;gap:10px;}
      .drawer-foot{border-top:1px solid var(--c-border);padding:10px 14px;display:grid;gap:8px;}
      .cart-line{display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center;border:1px solid var(--c-border);border-radius:12px;padding:8px;}
      .cart-line img{width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--c-border);}
      .qty{display:inline-flex;align-items:center;border:1px solid var(--c-border);border-radius:999px;overflow:hidden;}
      .qty button{border:0;background:transparent;padding:.35rem .55rem;cursor:pointer;color:var(--c-text);}
      .toolbar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.5rem 0 1rem;}
      .toolbar input,.toolbar select{padding:.5rem .6rem;border:1px solid var(--c-border);border-radius:10px;background:transparent;color:var(--c-text);}
      .toolbar .chip{border:1px solid var(--c-border);border-radius:999px;padding:.35rem .6rem;cursor:pointer;user-select:none;}
      .toolbar .chip.active{background:#111827}
      .badge-estoque{font-size:.75rem;opacity:.85}
      .coupon{display:flex;gap:.5rem}
      .coupon input{flex:1}
      /* métrica badge simples */
      #cart-badge{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;margin-left:.5rem;background:var(--c-accent);color:#001018;border-radius:999px;font-size:.8rem;font-weight:800;}
    `;
    document.head.appendChild(s);
  };
  const toast = (msg="OK") => {
    ensureStyles();
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    void t.offsetWidth; t.classList.add("show");
    setTimeout(()=>{ t.classList.remove("show"); setTimeout(()=>t.remove(),200); }, 1600);
  };
  const lightbox = {
    open(src){ ensureStyles(); let lb = $(".lightbox"); if(!lb){ lb = document.createElement("div"); lb.className="lightbox"; lb.innerHTML=`<img alt="preview">`; document.body.appendChild(lb); on(lb,"click",e=>{ if(e.target===lb) this.close(); }); on(document,"keydown",e=>{ if(e.key==="Escape") this.close(); }); } $(".lightbox img").src = src; lb.classList.add("open"); },
    close(){ $(".lightbox")?.classList.remove("open"); }
  };

  const metrics = {
    data: store.get(K.METRICS, { sessions: 0, pv: 0, startedAt: Date.now(), events: [] }),
    start(){
      this.data.sessions += 1;
      this.data.pv += 1;
      store.set(K.METRICS, this.data);
    
      on(window, "beforeunload", () => this.flush());
    
      this._tick = setInterval(()=> this.event("heartbeat", { t: Date.now() }), 15000);
    },
    event(type, payload={}){
      this.data.events.push({ type, ts: Date.now(), ...payload });
      if (this.data.events.length > 200) this.data.events.shift();
    },
    flush(){
      store.set(K.METRICS, this.data);
      if (this._tick) clearInterval(this._tick);
    },
    debug(){
      console.info("%c[Métricas] snapshot", "font-weight:bold");
      console.table(this.data.events.slice(-15));
      console.log("PV:", this.data.pv, "Sessions:", this.data.sessions, "Uptime(min):", Math.round((Date.now()-this.data.startedAt)/60000));
    }
  };

  
  const seedProducts = [
    { id:"Notebook", title:"Notebook", price:3499.00, img:"notebook.jpg.jpg", stock:7, tags:["computador"] },
    { id:"Headset",  title:"Headset Bluetooth", price:249.00, img:"headset.jpg.jpg", stock:15, tags:["audio"] },
    { id:"Mouse",    title:"Mouse sem fio", price:99.00, img:"mouse.jpg.jpg", stock:20, tags:["periferico"] },
  ];
  const readDomProducts = () => {
    const cards = $$(".grid .card, main .card");
    const items = [];
    cards.forEach((card, idx) => {
      const title = $("h2, h3", card)?.textContent?.trim() || `Item ${idx+1}`;
      const img = $(".thumb", card)?.getAttribute("src") || "";
      const priceText = $(".price", card)?.textContent?.replace(/\./g, "") || "";
      const m = priceText.match(/(\d+,\d{2})/);
      const price = m ? parseFloat(m[1].replace(",", ".")) : NaN;
      const id = title.replace(/\s+/g,"-").toLowerCase();
      if (img || !isNaN(price)) items.push({ id, title, price: isNaN(price)?0:price, img, stock: 10, tags:[] });
    });
    return items;
  };


  const cart = {
    state: { items: [], coupon: store.get(K.COUPON, null) },
    load(){
      const saved = store.get(K.CART, []);
      this.state.items = Array.isArray(saved) ? saved : [];
      this.mountBadge();
      this.mountDrawer();
      this.syncTotals();
    },
    save(){ store.set(K.CART, this.state.items); this.mountBadge(); },
    clear(){ this.state.items = []; this.save(); this.syncTotals(); toast("Carrinho limpo"); },
    count(){ return this.state.items.reduce((a,b)=>a + (b.qtd||1), 0); },
    subtotal(){ return this.state.items.reduce((a,b)=>a + (b.price * (b.qtd||1)), 0); },
    discount(){
      const c = this.state.coupon?.code?.toUpperCase();
      if (!c) return 0;
      
      if (c === "VINITECH10") return this.subtotal() * 0.10;
      if (c === "FRETEGRATIS") return Math.min(30, this.subtotal()*0.15);
      return 0;
    },
    total(){ return Math.max(0, this.subtotal() - this.discount()); },
    add(item){
      const ix = this.state.items.findIndex(i=>i.id===item.id);
      if (ix >= 0) {
        this.state.items[ix].qtd = clamp((this.state.items[ix].qtd||1) + (item.qtd||1), 1, item.stock||99);
      } else {
        this.state.items.push({ ...item, qtd: clamp(item.qtd||1, 1, item.stock||99) });
      }
      this.save(); this.syncTotals(); toast("Adicionado ao carrinho"); bus.emit("cart:changed");
      metrics.event("cart_add",{ id:item.id, price:item.price });
    },
    setQty(id, qtd){
      const it = this.state.items.find(i=>i.id===id); if(!it) return;
      it.qtd = clamp(qtd, 1, it.stock||99); this.save(); this.syncTotals(); bus.emit("cart:changed");
    },
    remove(id){
      this.state.items = this.state.items.filter(i=>i.id!==id);
      this.save(); this.syncTotals(); bus.emit("cart:changed");
    },
    applyCoupon(code){
      this.state.coupon = { code: code.toUpperCase(), ts: Date.now() };
      store.set(K.COUPON, this.state.coupon);
      this.syncTotals(); toast("Cupom aplicado");
    },
    mountBadge(){
      ensureStyles();
      const hdr = $("header .wrap") || $("header");
      if (!hdr) return;
      let badge = $("#cart-badge");
      if (!badge) { badge = document.createElement("span"); badge.id="cart-badge"; hdr.appendChild(badge); }
      badge.textContent = String(this.count());
    },
    mountDrawer(){
      if ($(".drawer")) return;
      const node = document.createElement("aside");
      node.className = "drawer"; node.setAttribute("aria-label","Carrinho"); node.setAttribute("aria-hidden","true");
      node.innerHTML = html`
        <div class="drawer-head">
          <strong>Carrinho</strong>
          <div style="display:flex;gap:.5rem">
            <button id="btn-clear" type="button">Limpar</button>
            <button id="btn-close" type="button">Fechar</button>
          </div>
        </div>
        <div class="drawer-body" id="cart-list"></div>
        <div class="drawer-foot">
          <div class="coupon">
            <input id="coupon-input" placeholder="Cupom (ex: VINITECH10)">
            <button id="coupon-apply" type="button">Aplicar</button>
          </div>
          <div id="totals" style="display:grid;gap:2px"></div>
          <button id="btn-checkout" class="primary" type="button" style="border:0;border-radius:10px;padding:.7rem 1rem;font-weight:800;cursor:pointer;background:#0ea5e9;color:#001018">Finalizar</button>
        </div>
      `;
      document.body.appendChild(node);
    
      on($("#btn-close"),"click",()=>drawer.close());
      on($("#btn-clear"),"click",()=>this.clear());
      on($("#coupon-apply"),"click",()=>{ const c = $("#coupon-input").value.trim(); if(c) this.applyCoupon(c); });
      on($("#btn-checkout"),"click",()=>{ toast("Checkout de demonstração"); metrics.event("checkout",{ total:this.total() }); });
      
      on(document,"keydown",(e)=>{ if(e.key==="Escape") drawer.close(); });
    },
    render(){
      const list = $("#cart-list"); if(!list) return;
      list.innerHTML = "";
      if (!this.state.items.length) { list.innerHTML = `<p style="opacity:.8">Seu carrinho está vazio.</p>`; return; }
      this.state.items.forEach(it=>{
        const line = document.createElement("div");
        line.className = "cart-line";
        line.innerHTML = html`
          <img src="${it.img||""}" alt="${it.title}">
          <div>
            <div style="display:flex;justify-content:space-between;gap:.5rem;align-items:center">
              <strong>${it.title}</strong>
              <span class="badge-estoque">${it.stock?`Estoque: ${it.stock}`:""}</span>
            </div>
            <div style="display:flex;align-items:center;gap:.5rem;margin-top:.25rem">
              <div class="qty" aria-label="Quantidade">
                <button type="button" aria-label="Diminuir">−</button>
                <span style="min-width:2ch;text-align:center">${it.qtd||1}</span>
                <button type="button" aria-label="Aumentar">+</button>
              </div>
              <button type="button" class="ghost" data-act="rm" style="border:1px solid var(--c-border);border-radius:10px;padding:.35rem .6rem">Remover</button>
            </div>
          </div>
          <div>
            <div><strong>${fmtBRL(it.price)}</strong></div>
            <div style="opacity:.8;font-size:.9rem">Total: ${fmtBRL((it.qtd||1)*it.price)}</div>
          </div>
        `;
        const [btnMinus, , btnPlus] = $$(".qty button", line);
        on(btnMinus,"click",()=>this.setQty(it.id, clamp((it.qtd||1)-1,1,it.stock||99)));
        on(btnPlus ,"click",()=>this.setQty(it.id, clamp((it.qtd||1)+1,1,it.stock||99)));
        on($('[data-act="rm"]', line),"click",()=>this.remove(it.id));
        list.appendChild(line);
      });
    },
    syncTotals(){
      const t = $("#totals"); if(!t) return;
      t.innerHTML = html`
        <div style="display:flex;justify-content:space-between"><span>Itens</span><strong>${this.count()}</strong></div>
        <div style="display:flex;justify-content:space-between"><span>Subtotal</span><strong>${fmtBRL(this.subtotal())}</strong></div>
        <div style="display:flex;justify-content:space-between"><span>Desconto</span><strong>− ${fmtBRL(this.discount())}</strong></div>
        <div style="display:flex;justify-content:space-between;font-size:1.1rem"><span>Total</span><strong>${fmtBRL(this.total())}</strong></div>
      `;
      this.mountBadge();
      this.render();
    }
  };
  const drawer = {
    open(){ $(".drawer")?.classList.add("open"); $(".drawer")?.setAttribute("aria-hidden","false"); },
    close(){ $(".drawer")?.classList.remove("open"); $(".drawer")?.setAttribute("aria-hidden","true"); }
  };

  
  const globalUI = {
    init(){
      ensureStyles();
    
      const path = location.pathname.split("/").pop() || "index.html";
      $$(".menu a").forEach(a => a.getAttribute("href")===path ? a.setAttribute("aria-current","page"):a.removeAttribute("aria-current"));
      
      on(document,"click",(e)=>{
        const a = e.target.closest('a[href^="#"]'); if(!a) return;
        const id = a.getAttribute("href").slice(1); const target = id ? document.getElementById(id):null;
        if (target){ e.preventDefault(); target.scrollIntoView({behavior:"smooth"}); }
      }, { passive:false });
      
      let btn = $("#btn-topo"); if(!btn){ btn = document.createElement("button"); btn.id="btn-topo"; btn.textContent="Topo ↑"; document.body.appendChild(btn); }
      on(btn,"click",()=>window.scrollTo({top:0,behavior:"smooth"}));
      const onScroll = ()=>{ btn.style.display = window.scrollY>240 ? "inline-flex":"none"; };
      on(window,"scroll",onScroll,{passive:true}); onScroll();
      
      $$("img").forEach(img=>{ if(!img.hasAttribute("loading")) img.setAttribute("loading","lazy"); img.decoding="async"; });
      $$(".thumb").forEach(img=>{ img.style.cursor="zoom-in"; on(img,"click",()=> lightbox.open(img.currentSrc||img.src)); });
      if (!$("#btn-cart")) {
        const hdr = $("header .wrap") || $("header");
        const b = document.createElement("button");
        b.id="btn-cart"; b.type="button"; b.textContent="Carrinho";
        b.style.cssText="margin-left:.5rem;border:0;border-radius:10px;padding:.45rem .7rem;font-weight:700;cursor:pointer;background:transparent;color:inherit;border:1px solid var(--c-border)";
        hdr?.appendChild(b);
        on(b,"click",()=>drawer.open());
      }
    }
  };

  const productsPage = {
    data: [],
    init(){
      const domItems = readDomProducts();
      this.data = domItems.length ? domItems : seedProducts.slice();
      const wrap = $(".wrap.section-gap") || $("main .wrap") || $("main");
      if (!wrap) return;
      let grid = $(".grid", wrap); if(!grid){ grid = document.createElement("div"); grid.className="grid"; wrap.appendChild(grid); }
      this.grid = grid;
      this.mountToolbar(wrap);
      this.injectButtons();
      this.refresh();
    },
    mountToolbar(container){
      if ($(".toolbar", container)) return;
      const bar = document.createElement("div");
      bar.className = "toolbar";
      bar.innerHTML = html`
        <input id="q" placeholder="Buscar produto...">
        <select id="sort">
          <option value="relevance">Relevância</option>
          <option value="price_asc">Preço: menor → maior</option>
          <option value="price_desc">Preço: maior → menor</option>
          <option value="title_asc">Título A→Z</option>
        </select>
        <span class="chip" data-tag="computador">Computador</span>
        <span class="chip" data-tag="audio">Áudio</span>
        <span class="chip" data-tag="periferico">Periférico</span>
        <button id="reset" type="button">Limpar</button>
      `;
      container.insertBefore(bar, this.grid);
      on($("#q"),"input",()=>this.refresh());
      on($("#sort"),"change",()=>this.refresh());
      $$(".chip", bar).forEach(ch => on(ch,"click",()=>{ ch.classList.toggle("active"); this.refresh(); }));
      on($("#reset"),"click",()=>{ $("#q").value=""; $$(".chip.active",bar).forEach(c=>c.classList.remove("active")); $("#sort").value="relevance"; this.refresh(); });
    },
    query(){
      const q = $("#q")?.value.trim().toLowerCase();
      const tags = $$(".chip.active").map(c=>c.dataset.tag);
      let out = this.data.slice();
      if (q) out = out.filter(p => p.title.toLowerCase().includes(q));
      if (tags.length) out = out.filter(p => tags.every(t => p.tags?.includes(t)));
      const sort = $("#sort")?.value;
      if (sort==="price_asc") out.sort((a,b)=>a.price-b.price);
      if (sort==="price_desc") out.sort((a,b)=>b.price-a.price);
      if (sort==="title_asc") out.sort((a,b)=>a.title.localeCompare(b.title));
      return out;
    },
    refresh(){
      const items = this.query();
      $$(".grid .card").forEach(card=>{
        const t = $("h2, h3", card)?.textContent?.trim();
        const prod = this.data.find(p=>p.title===t);
        if(!prod) return;
        let badge = $(".badge-estoque", card);
        if(!badge){ badge = document.createElement("div"); badge.className="badge-estoque"; card.insertBefore(badge, $(".price",card)?.nextSibling||card.lastChild); }
        badge.textContent = prod.stock>0 ? `Estoque: ${prod.stock}` : "Sem estoque";
        card.style.opacity = prod.stock>0 ? "1" : ".6";
      });
      const titles = new Set(items.map(p=>p.title));
      $$(".grid .card").forEach(card=>{
        const t = $("h2, h3", card)?.textContent?.trim();
        card.style.display = titles.has(t) ? "" : "none";
      });
      metrics.event("products_refresh",{ count: items.length });
    },
    injectButtons(){
      $$(".grid .card").forEach((card, idx)=>{
        if ($(".btn-add", card)) return;
        const title = $("h2, h3", card)?.textContent?.trim() || `Item ${idx+1}`;
        const img = $(".thumb", card)?.getAttribute("src") || "";
        const priceText = $(".price", card)?.textContent?.replace(/\./g, "") || "";
        const m = priceText.match(/(\d+,\d{2})/);
        const price = m ? parseFloat(m[1].replace(",", ".")) : 0;
        const prod = this.data.find(p=>p.title===title) || { id: title.toLowerCase().replace(/\s+/g,"-"), stock: 9, tags:[] };
        const btn = document.createElement("button");
        btn.type = "button"; btn.className="primary btn-add";
        btn.style.cssText="margin-top:.5rem;border:0;border-radius:10px;padding:.6rem .9rem;font-weight:800;cursor:pointer;background:#0ea5e9;color:#001018";
        btn.textContent = "Adicionar ao carrinho";
        on(btn,"click",()=>{
          if (prod.stock<=0) { toast("Sem estoque"); return; }
          cart.add({ id: prod.id, title, img, price, qtd:1, stock: prod.stock });
          prod.stock = Math.max(0, (prod.stock||1)-1);
          this.refresh();
        });
        card.appendChild(btn);
      });
    }
  };

  const contactPage = {
    init(){
      if (!$("body.contato")) return;
      const form = $("form"); if(!form) return;
      const email = $("#email"); const tel = $("#tel");
      on(tel,"input",()=>{ let v = tel.value.replace(/\D/g,""); if(v.length>11) v=v.slice(0,11); if(v.length>=2)v=`(${v.slice(0,2)}) ${v.slice(2)}`; if(v.length>=10)v=`${v.slice(0, 10)}-${v.slice(10)}`; tel.value=v; });
      const isEmail = val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      on(form,"submit",(e)=>{
        const nome = $("#nome")?.value.trim();
        const assunto = $("#assunto")?.value.trim();
        const msg = $("#msg")?.value.trim();
        let ok = true;
        if (!nome) ok = false;
        if (!email || !isEmail(email.value.trim())) ok = false;
        if (!assunto) ok = false;
        if (!msg || msg.length<10) ok = false;
        if (!ok) { e.preventDefault(); toast("Revise os campos obrigatórios"); if(!nome) return $("#nome")?.focus(); if(!email||!isEmail(email.value.trim())) return email?.focus(); if(!assunto) return $("#assunto")?.focus(); return $("#msg")?.focus(); }
        e.preventDefault(); form.reset(); toast("Mensagem enviada");
        metrics.event("contact_submit",{ ok:true });
      });
    }
  };

  const homePage = {
    init(){
      if (!$("body.home")) return;
      const vid = $(".video-el");
      if (!vid) return;
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if (entry.isIntersecting && entry.intersectionRatio>=0.6) { vid.play().catch(()=>{}); }
          else { vid.pause(); }
        });
      }, { threshold:[0,0.6,1] });
      io.observe(vid);
    }
  };

  function boot(){
    ensureStyles();
    theme.init();
    globalUI.init();
    cart.load();

    homePage.init();
    productsPage.init();
    contactPage.init();

    on(document,"click",(e)=>{
      const target = e.target;
      if (target.id === "cart-badge") drawer.open();
    });

    metrics.start();
    metrics.event("pv",{ path: location.pathname });
    setTimeout(()=>metrics.debug(), 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
