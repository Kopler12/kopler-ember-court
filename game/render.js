// Ember Court — the table renderer: every card, hero and meter as DOM.
import { HOUSES } from './cards.js';
import { hasGuard, MAX_FIELD } from './engine.js';

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function housePip(house) {
  const h = HOUSES[house];
  const pip = el('span', 'pip', h.shape);
  pip.style.color = h.color;
  pip.style.textShadow = `0 0 8px ${h.glow}`;
  return pip;
}

export function cardNode(card, opts = {}) {
  const h = HOUSES[card.house];
  const node = el('div', 'card house-' + card.house);
  node.style.setProperty('--house', h.color);
  node.style.setProperty('--house-dark', h.dark);
  if (opts.small) node.classList.add('small');
  if (opts.selected) node.classList.add('selected');
  if (opts.playable) node.classList.add('playable');
  if (opts.attacker) node.classList.add('attacker');
  if (opts.targetable) node.classList.add('targetable');
  if (opts.canAttack) node.classList.add('can-attack');
  if (opts.dead) node.classList.add('dead');

  const cost = el('div', 'cost', String(card.cost));
  cost.title = 'Ember cost';
  node.appendChild(cost);

  const name = el('div', 'card-name', card.name);
  node.appendChild(name);

  const art = el('div', 'art');
  art.appendChild(housePip(card.house));
  const glyph = el('div', 'art-glyph', h.shape);
  glyph.style.color = h.glow;
  art.appendChild(glyph);
  const houseName = el('div', 'art-house', h.label.toUpperCase());
  art.appendChild(houseName);
  node.appendChild(art);

  const text = el('div', 'card-text', card.text);
  node.appendChild(text);

  const kind = el('div', 'card-kind', card.type === 'spell' ? 'SPELL' : 'CREATURE');
  node.appendChild(kind);

  if (card.type === 'creature') {
    const stats = el('div', 'stats');
    const atk = el('span', 'atk', '⚔ ' + card.atk);
    const hp = el('span', 'hp', '♥ ' + card.hp);
    stats.appendChild(atk);
    stats.appendChild(hp);
    node.appendChild(stats);
    if (card.effect === 'guard') {
      const guard = el('div', 'guard-tag', 'GUARD');
      node.appendChild(guard);
    }
  }
  return node;
}

function heroNode(state, who, handlers) {
  const side = who === 'player' ? state.player : state.ai;
  const name = who === 'player' ? 'Ember Warden' : 'Ashen Warden';
  const node = el('div', 'hero' + (who === 'player' ? ' hero-you' : ' hero-foe'));
  if (state.targetMode && who === 'player' && state.active === 'player') {
    // Firebolt may hit the enemy hero; the player's own hero is never a target.
  }
  if (state.attackerUid && who === 'ai' && state.active === 'player' && !hasGuard(state.player)) {
    node.classList.add('targetable');
  }
  if (state.targetMode && who === 'ai') node.classList.add('targetable');
  const portrait = el('div', 'portrait', who === 'player' ? '▲' : '◆');
  node.appendChild(portrait);
  const info = el('div', 'hero-info');
  info.appendChild(el('div', 'hero-name', name + (who === 'player' ? '  (YOU)' : '')));
  const lifeRow = el('div', 'hero-life');
  lifeRow.appendChild(el('span', 'life', '♥ ' + Math.max(0, side.life)));
  if (side.armor > 0) lifeRow.appendChild(el('span', 'armor', '🛡 ' + side.armor));
  lifeRow.appendChild(el('span', 'deck-count', 'Deck ' + side.deck.length));
  info.appendChild(lifeRow);
  node.appendChild(info);
  node.addEventListener('click', () => handlers.onHero(who));
  return node;
}

function fieldNode(state, who, handlers) {
  const side = who === 'player' ? state.player : state.ai;
  const zone = el('div', 'field field-' + who);
  if (side.field.length === 0) {
    zone.appendChild(el('div', 'field-empty', who === 'player' ? 'Your court is empty — play a creature.' : 'The Warden has no creatures yet.'));
  }
  for (const creature of side.field) {
    const isAttacker = state.attackerUid === creature.uid;
    const targetable =
      state.active === 'player' && who === 'ai' &&
      ((state.attackerUid && true) || state.targetMode);
    const node = cardNode(creature, {
      small: true,
      attacker: isAttacker,
      targetable: !!targetable,
      canAttack: who === 'player' && creature.canAttack && state.active === 'player' && !state.over,
    });
    node.dataset.uid = String(creature.uid);
    node.addEventListener('click', () => handlers.onFieldCreature(who, creature.uid));
    zone.appendChild(node);
  }
  for (let i = side.field.length; i < MAX_FIELD; i++) {
    zone.appendChild(el('div', 'field-slot'));
  }
  return zone;
}

function handNode(state, handlers) {
  const side = state.player;
  const zone = el('div', 'hand');
  side.hand.forEach((card, i) => {
    const playable = state.active === 'player' && !state.over && card.cost <= side.mana &&
      (card.type === 'spell' || side.field.length < MAX_FIELD);
    const node = cardNode(card, {
      selected: state.selectedHand === i,
      playable,
    });
    node.addEventListener('click', () => handlers.onHandCard(i));
    zone.appendChild(node);
  });
  if (side.hand.length === 0) {
    zone.appendChild(el('div', 'hand-empty', 'No cards — draw at the start of your turn.'));
  }
  return zone;
}

function handBacks(count) {
  const zone = el('div', 'hand-backs');
  for (let i = 0; i < count; i++) {
    const back = el('div', 'card-back');
    back.appendChild(el('div', 'back-glyph', '◆'));
    zone.appendChild(back);
  }
  return zone;
}

function manaNode(side) {
  const node = el('div', 'mana');
  for (let i = 0; i < 10; i++) {
    const gem = el('div', 'ember' + (i < side.mana ? ' lit' : '') + (i < side.maxMana ? '' : ' locked'), '●');
    node.appendChild(gem);
  }
  node.appendChild(el('span', 'mana-text', `${side.mana}/${side.maxMana} embers`));
  return node;
}

export function render(state, handlers) {
  const app = document.getElementById('app');
  app.replaceChildren();

  const top = el('header', 'topbar');
  top.appendChild(el('div', 'brand', 'EMBER COURT'));
  const turnLabel = state.phase === 'play'
    ? (state.active === 'player' ? `Turn ${state.turn} — Your move` : `Turn ${state.turn} — The Warden thinks…`)
    : state.phase === 'title' ? 'A duel of living cards' : 'Duel over';
  top.appendChild(el('div', 'turn-banner', turnLabel));
  top.appendChild(el('div', 'hint', 'Click a card, then a target · 1–7 select · Enter play · N end turn'));
  app.appendChild(top);

  const table = el('main', 'table');

  const foeRow = el('section', 'row foe-row');
  foeRow.appendChild(heroNode(state, 'ai', handlers));
  foeRow.appendChild(fieldNode(state, 'ai', handlers));
  foeRow.appendChild(handBacks(state.ai.hand.length));
  table.appendChild(foeRow);

  const mid = el('section', 'row mid-row');
  const log = el('div', 'log');
  log.appendChild(el('div', 'log-title', 'DUEL LOG'));
  for (const line of state.log) log.appendChild(el('div', 'log-line', line));
  mid.appendChild(log);
  const endBtn = el('button', 'end-turn', state.active === 'player' && !state.over ? 'END TURN  (N)' : 'WAITING…');
  endBtn.disabled = state.active !== 'player' || state.over;
  endBtn.addEventListener('click', handlers.onEndTurn);
  mid.appendChild(endBtn);
  table.appendChild(mid);

  const youRow = el('section', 'row you-row');
  youRow.appendChild(heroNode(state, 'player', handlers));
  youRow.appendChild(fieldNode(state, 'player', handlers));
  const side = el('div', 'you-side');
  side.appendChild(manaNode(state.player));
  youRow.appendChild(side);
  table.appendChild(youRow);

  const handRow = el('section', 'row hand-row');
  handRow.appendChild(handNode(state, handlers));
  table.appendChild(handRow);

  app.appendChild(table);

  if (state.phase === 'title') {
    const overlay = el('div', 'overlay title-screen');
    overlay.appendChild(el('div', 'big-title', 'EMBER COURT'));
    overlay.appendChild(el('div', 'subtitle', 'A duel of living cards — four houses, one throne'));
    const houses = el('div', 'houses');
    for (const key of Object.keys(HOUSES)) {
      const h = HOUSES[key];
      const chip = el('div', 'house-chip');
      chip.appendChild(el('span', 'chip-shape', h.shape));
      chip.appendChild(el('span', 'chip-name', h.label));
      chip.style.color = h.color;
      houses.appendChild(chip);
    }
    overlay.appendChild(houses);
    overlay.appendChild(el('div', 'rules',
      'Life 30 vs 30 · Spend embers to play cards · Creatures fight, spells strike · ' +
      'Guard creatures shield their hero · Reduce the Ashen Warden to 0 to win.'));
    const play = el('button', 'play-btn', '▶  ENTER THE COURT');
    play.addEventListener('click', handlers.onStart);
    overlay.appendChild(play);
    overlay.appendChild(el('div', 'keys', 'Mouse + keyboard: 1–7 select a card · Enter plays it · N ends your turn · Esc cancels'));
    app.appendChild(overlay);
  }

  if (state.phase === 'over') {
    const win = state.winner === 'player';
    const overlay = el('div', 'overlay end-screen ' + (win ? 'win' : 'loss'));
    overlay.appendChild(el('div', 'end-title', win ? '👑  VICTORY  👑' : 'THE EMBERS FADE'));
    overlay.appendChild(el('div', 'end-sub', win
      ? 'The Ashen Warden falls. The Ember Court is yours.'
      : 'The Ashen Warden stands. Your court is scattered.'));
    const score = el('div', 'end-score');
    score.appendChild(el('span', null, `You ${Math.max(0, state.player.life)} ♥`));
    score.appendChild(el('span', null, `—  Turn ${state.turn}  —`));
    score.appendChild(el('span', null, `Warden ${Math.max(0, state.ai.life)} ♥`));
    overlay.appendChild(score);
    const again = el('button', 'play-btn', '↻  PLAY AGAIN  (R)');
    again.addEventListener('click', handlers.onRestart);
    overlay.appendChild(again);
    app.appendChild(overlay);
  }

  if (state.targetMode) {
    const tip = el('div', 'target-tip', 'Choose a target for Firebolt — click an enemy creature or the Ashen Warden. (Esc to cancel)');
    app.appendChild(tip);
  }
  if (state.attackerUid) {
    const tip = el('div', 'target-tip', 'Choose a target to attack — click an enemy creature or the Ashen Warden. (Esc to cancel)');
    app.appendChild(tip);
  }
}
