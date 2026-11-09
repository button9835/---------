/* ==========================================================================
   CONTROL CENTER — interactions
   의존성 없는 바닐라 JS 모듈. 모든 효과는 장식 목적이며,
   "live" 라고 표시된 값은 오직 이 브라우저 세션에서 실제로 측정한 값이다.
   ========================================================================== */

/* ---------------------------------------------------------------------------
   1. CONFIG — 이름과 연락처는 여기에서만 바꾸면 페이지 전체에 반영된다.
   (HTML의 data-slot="name" 기본값도 함께 바꿔 두면 JS가 꺼진 환경에서도 반영됨)
   ------------------------------------------------------------------------- */
const CONFIG = {
  name: '채형주',
  initials: 'button9835', // 비워 두면 이름에서 자동 생성
  contact: {
    email: 'button9835@kakao.com',  // 예: 'me@example.com'
    github: 'https://github.com/button9835', // 예: 'https://github.com/username'
  },
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const root = document.documentElement;
const finePointer = matchMedia('(pointer: fine)').matches;
const motionOn = () => root.dataset.motion !== 'off';
const pad = (n) => String(n).padStart(2, '0');

/* ---------------------------------------------------------------------------
   2. 이름 · 연락처 적용
   ------------------------------------------------------------------------- */
function applyConfig() {
  const name = CONFIG.name.trim() || 'YOUR NAME';
  $$('[data-slot="name"]').forEach((el) => (el.textContent = name));

  const initials =
    CONFIG.initials ||
    (name === 'YOUR NAME'
      ? 'ME'
      : name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase());
  $$('[data-slot="initials"]').forEach((el) => (el.textContent = initials));
  document.title = `${name} — Control Center`;

  const links = {
    email: (v) => ({ href: `mailto:${v}`, text: v }),
    github: (v) => ({ href: v, text: v.replace(/^https?:\/\/(www\.)?/, '') }),
  };
  Object.entries(CONFIG.contact).forEach(([key, value]) => {
    const slot = $(`[data-contact="${key}"]`);
    if (!slot || !value) return; // 값이 없으면 "[ 추후 입력 ]" 유지
    const { href, text } = links[key](value);
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    a.className = 'text-fg underline decoration-line-strong underline-offset-4 hover:text-cyan hover:decoration-cyan';
    if (key !== 'email') { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    slot.replaceChildren(a);
  });

  $$('[data-live="year"]').forEach((el) => (el.textContent = new Date().getFullYear()));
}

/* ---------------------------------------------------------------------------
   3. Motion 토글 (prefers-reduced-motion 기본값 + 사용자 선택 저장)
   ------------------------------------------------------------------------- */
function initMotionToggle() {
  const btn = $('[data-motion-toggle]');
  const label = $('[data-motion-label]');
  const led = btn?.querySelector('.led');
  const sync = () => {
    const on = motionOn();
    btn?.setAttribute('aria-pressed', String(on));
    if (label) label.textContent = on ? 'on' : 'off';
    led?.classList.toggle('led-off', !on);
  };
  btn?.addEventListener('click', () => {
    root.dataset.motion = motionOn() ? 'off' : 'on';
    try { localStorage.setItem('motion', root.dataset.motion); } catch {}
    sync();
    document.dispatchEvent(new CustomEvent('motionchange'));
  });
  sync();
}

/* ---------------------------------------------------------------------------
   4. Live session 정보 (이 브라우저에서 실제로 측정되는 값만)
   ------------------------------------------------------------------------- */
const session = { start: performance.now(), scroll: 0, trace: [] };

function initSession() {
  const clocks = $$('[data-live="clock"]');
  const uptime = $('[data-live="uptime"]');
  const viewport = $('[data-live="viewport"]');

  const tick = () => {
    const now = new Date();
    const t = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    clocks.forEach((el) => (el.textContent = t));
    const s = Math.floor((performance.now() - session.start) / 1000);
    if (uptime) uptime.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    // 스크롤 깊이를 1초에 한 번 기록 (최근 60개)
    session.trace.push(session.scroll);
    if (session.trace.length > 60) session.trace.shift();
    drawSpark();
  };
  const onResize = () => {
    if (viewport) viewport.textContent = `${innerWidth} × ${innerHeight}`;
  };
  tick();
  onResize();
  setInterval(tick, 1000);
  addEventListener('resize', onResize, { passive: true });
}

/* 스크롤 깊이 스파크라인 (단일 시리즈 · 0–100%) */
const spark = {};
function initSpark() {
  spark.wrap = $('[data-spark]');
  if (!spark.wrap) return;
  spark.line = $('[data-spark-line]', spark.wrap);
  spark.area = $('[data-spark-area]', spark.wrap);
  spark.cursor = $('[data-spark-cursor]', spark.wrap);
  spark.readout = $('[data-spark-readout]');
  spark.hover = null;

  spark.wrap.addEventListener('pointermove', (e) => {
    const r = spark.wrap.getBoundingClientRect();
    spark.hover = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    drawSpark();
  });
  spark.wrap.addEventListener('pointerleave', () => {
    spark.hover = null;
    drawSpark();
  });
}
function drawSpark() {
  if (!spark.line) return;
  const pts = session.trace;
  const W = 200, H = 36, n = 60;
  const x = (i) => ((i + (n - pts.length)) / (n - 1)) * W;
  const y = (v) => H - 1.5 - (v / 100) * (H - 4);
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  spark.line.setAttribute('d', d);
  spark.area.setAttribute('d', pts.length ? `${d}L${x(pts.length - 1).toFixed(1)} ${H}L${x(0).toFixed(1)} ${H}Z` : '');

  if (spark.hover == null || pts.length < 2) {
    spark.cursor.style.opacity = '0';
    spark.readout.innerHTML = `<span data-live="scroll">${session.scroll}</span>%`;
    return;
  }
  const idx = Math.round(spark.hover * (n - 1)) - (n - pts.length);
  const i = Math.max(0, Math.min(pts.length - 1, idx));
  const ago = pts.length - 1 - i;
  spark.cursor.style.opacity = '1';
  spark.cursor.style.left = `${(x(i) / W) * 100}%`;
  spark.readout.textContent = `${ago ? `−${ago}s` : 'now'} · ${pts[i]}%`;
}

/* ---------------------------------------------------------------------------
   5. 스크롤 진행 · 현재 섹션 표시
   ------------------------------------------------------------------------- */
function initScroll() {
  const bar = $('[data-progress]');
  const cue = $('[data-scroll-cue]');
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, scrollY / max) : 0;
    session.scroll = Math.round(p * 100);
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (cue) {
      const hide = scrollY > 60;
      cue.classList.toggle('opacity-0', hide);
      cue.classList.toggle('pointer-events-none', hide);
      cue.tabIndex = hide ? -1 : 0;
    }
    $$('[data-live="scroll"]').forEach((el) => (el.textContent = session.scroll));
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();

  // 현재 섹션: 화면 중앙선과 겹치는 섹션
  const sections = $$('[data-section][id]');
  const navLinks = $$('[data-nav]');
  const railLinks = $$('[data-rail]');
  const setActive = (id) => {
    navLinks.forEach((a) => a.setAttribute('aria-current', String(a.dataset.nav === id)));
    railLinks.forEach((a) => {
      const on = a.dataset.rail === id;
      a.classList.toggle('!text-cyan', on);
      a.querySelector('i')?.classList.toggle('!w-7', on);
      a.querySelector('span')?.classList.toggle('!opacity-100', on);
    });
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
  }, { rootMargin: '-50% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
}

/* ---------------------------------------------------------------------------
   6. 섹션 진입 애니메이션
   ------------------------------------------------------------------------- */
function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) return els.forEach((el) => el.classList.add('is-in'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((el) => io.observe(el));
}

/* ---------------------------------------------------------------------------
   7. 포인터 효과 — 배경 그리드 스포트라이트 · 패널 하이라이트 · 히어로 틸트
   ------------------------------------------------------------------------- */
function initPointer() {
  if (!finePointer) return;
  const grid = $('.bg-grid');
  const tilt = $('[data-tilt-inner]');
  const hero = $('#top');
  let e = null, raf = 0, panel = null;

  const frame = () => {
    raf = 0;
    if (!e) return;
    grid?.style.setProperty('--mx', `${e.clientX}px`);
    grid?.style.setProperty('--my', `${e.clientY}px`);

    if (panel) {
      const r = panel.getBoundingClientRect();
      panel.style.setProperty('--px', `${e.clientX - r.left}px`);
      panel.style.setProperty('--py', `${e.clientY - r.top}px`);
    }
    if (tilt && motionOn() && scrollY < hero.offsetHeight) {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      tilt.style.setProperty('--ry', `${(nx * 10).toFixed(2)}deg`);
      tilt.style.setProperty('--rx', `${(-ny * 8).toFixed(2)}deg`);
    }
  };
  addEventListener('pointermove', (ev) => {
    e = ev;
    panel = ev.target.closest?.('.panel') || null;
    grid?.style.setProperty('--spot', '1');
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });
  document.addEventListener('pointerleave', () => grid?.style.setProperty('--spot', '0'));
  document.addEventListener('motionchange', () => {
    if (!motionOn() && tilt) { tilt.style.setProperty('--rx', '0deg'); tilt.style.setProperty('--ry', '0deg'); }
  });
}

/* ---------------------------------------------------------------------------
   8. 모바일 메뉴
   ------------------------------------------------------------------------- */
function initMenu() {
  const btn = $('[data-menu-toggle]');
  const menu = $('#mobile-menu');
  if (!btn || !menu) return;
  const set = (open) => {
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.sr-only').textContent = open ? '메뉴 닫기' : '메뉴 열기';
    menu.hidden = !open;
  };
  btn.addEventListener('click', () => set(menu.hidden));
  menu.addEventListener('click', (e) => e.target.closest('a') && set(false));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); }
  });
  matchMedia('(width >= 48rem)').addEventListener('change', (m) => m.matches && set(false));
}

/* ---------------------------------------------------------------------------
   9. 스킬 필터 + 실제 개수 집계
   ------------------------------------------------------------------------- */
function initSkills() {
  const chips = $$('[data-skill-grid] .chip');
  if (!chips.length) return;
  const counts = { total: chips.length, used: 0, learning: 0, curious: 0 };
  chips.forEach((c) => counts[c.dataset.state]++);
  Object.entries(counts).forEach(([k, v]) => $$(`[data-count="${k}"]`).forEach((el) => (el.textContent = v)));

  const bar = $('[data-status-bar]');
  ['used', 'learning', 'curious'].forEach((k) => {
    const seg = $(`[data-seg="${k}"]`, bar);
    if (seg) seg.style.flex = String(counts[k]);
  });
  bar?.setAttribute('aria-label', `사용 경험 ${counts.used}개, 학습 중 ${counts.learning}개, 관심 분야 ${counts.curious}개`);

  const buttons = $$('[data-filter]');
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const f = b.dataset.filter;
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      chips.forEach((c) => c.classList.toggle('is-dimmed', f !== 'all' && c.dataset.state !== f));
    }),
  );
}

/* ---------------------------------------------------------------------------
   10. P-01 Incremental 스케치 — requestAnimationFrame 루프 개념 시연
   ------------------------------------------------------------------------- */
function initIdleSketch() {
  const box = $('[data-idle]');
  if (!box) return;
  const ui = {
    amount: $('[data-idle-amount]', box), rate: $('[data-idle-rate]', box), mult: $('[data-idle-mult]', box),
    bar: $('[data-idle-bar]', box), cost: $('[data-idle-cost]', box), gens: $('[data-idle-gens]', box),
    frame: $('[data-idle-frame]', box), target: $('[data-idle-target]', box), state: $('[data-idle-state]', box),
    collect: $('[data-idle-collect]', box), buy: $('[data-idle-buy]', box), prestige: $('[data-idle-prestige]', box),
    steps: $$('[data-loop-step]', box),
  };
  const TARGET = 500;
  const s = { energy: 0, gens: 1, mult: 1, frame: 0, last: 0, running: false };
  const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const cost = () => Math.ceil(10 * 1.18 ** (s.gens - 1));
  const rate = () => s.gens * 1.5 * s.mult;

  const render = () => {
    ui.amount.textContent = fmt.format(s.energy);
    ui.rate.textContent = fmt.format(rate());
    ui.mult.textContent = s.mult.toFixed(1);
    ui.gens.textContent = s.gens;
    ui.cost.textContent = cost();
    ui.frame.textContent = s.frame;
    ui.bar.style.transform = `scaleX(${Math.min(1, s.energy / TARGET)})`;
    ui.buy.disabled = s.energy < cost();
    ui.buy.classList.toggle('opacity-40', ui.buy.disabled);
    ui.prestige.disabled = s.energy < TARGET;
    if (ui.state) {
      ui.state.textContent =
        `state = {\n  energy: ${s.energy.toFixed(1)},\n  generators: ${s.gens},\n  multiplier: ${s.mult.toFixed(1)},\n  canPrestige: ${s.energy >= TARGET}\n}`;
    }
    const step = Math.floor(s.frame / 20) % 3;
    ui.steps.forEach((el, i) => el.classList.toggle('tag-cyan', i === step));
  };
  const loop = (t) => {
    if (!s.running) return;
    const dt = s.last ? Math.min(0.1, (t - s.last) / 1000) : 0; // 탭 전환 등 큰 간격은 제한
    s.last = t;
    s.energy += rate() * dt; // update(Δt)
    s.frame++;
    render(); // render()
    requestAnimationFrame(loop);
  };
  ui.target.textContent = TARGET;
  ui.collect.addEventListener('click', () => { s.energy += 1 * s.mult; render(); });
  ui.buy.addEventListener('click', () => {
    if (s.energy < cost()) return;
    s.energy -= cost();
    s.gens++;
    render();
  });
  ui.prestige.addEventListener('click', () => {
    if (s.energy < TARGET) return;
    s.mult += 0.5;
    s.energy = 0;
    s.gens = 1;
    render();
  });

  // 화면에 보일 때만 루프 실행
  new IntersectionObserver(([e]) => {
    s.running = e.isIntersecting;
    s.last = 0;
    if (s.running) requestAnimationFrame(loop);
  }).observe(box);
  render();
}

/* ---------------------------------------------------------------------------
   11. 화면 밖 장식 애니메이션 일시정지 (성능)
   ------------------------------------------------------------------------- */
function initOffscreenPause() {
  const targets = $$('#top svg, .orbits, #p-03 .viz, #p-04 svg, #p-05 .viz');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      $$('.signal, .spin-slow, .spin-rev, .orbit, [data-flow]', e.target).forEach((el) => {
        el.style.animationPlayState = e.isIntersecting ? 'running' : 'paused';
      });
    });
  });
  targets.forEach((t) => io.observe(t));
}

/* --------------------------------------------------------------------------- */
// 콘텐츠 표시(reveal)를 가장 먼저 초기화하고 준비 완료를 알린다.
// 이후 단계에서 오류가 나더라도 본문은 항상 보이게 된다.
initReveal();
window.__ccReady = true;
applyConfig();
initMotionToggle();
initSession();
initSpark();
initScroll();
initPointer();
initMenu();
initSkills();
initIdleSketch();
initOffscreenPause();
