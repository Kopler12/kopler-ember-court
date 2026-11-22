// Ember Court — boot, input, and the screenshot modes.
// Play with mouse or keyboard. ?shot=title|table|win|loss renders a fixed
// scene from the game's own code, so the screenshots are true renders.
import { newGame, startMatch, playCard, attackWith, castTargetedSpell, endTurn, aiTakeTurn, drawCard, hasGuard } from './engine.js';
import { render } from './render.js';
import { runAiTurn } from './ai.js';
import { freshCreature, cardById } from './cards.js';

let state = newGame((Date.now() % 2147483647) || 7);
let aiTimer = null;

function refresh() {
  render(state, handlers);
}

function scheduleAi() {
  clearTimeout(aiTimer);
  aiTimer = setTimeout(() => {
    if (state.over || state.active !== 'ai') return;
    aiTakeTurn(state, runAiTurn);
    refresh();
  }, 900);
}

const handlers = {
  onStart() {
    state = newGame((Date.now() % 2147483647) || 7);
    startMatch(state);
    refresh();
  },
  onRestart() {
    handlers.onStart();
  },
  onHandCard(i) {
    if (state.over || state.active !== 'player') return;
    const card = state.player.hand[i];
    if (!card) return;
    if (state.targetMode) { state.targetMode = null; state.selectedHand = -1; refresh(); return; }
    if (state.selectedHand === i) {
      const result = playCard(state, 'player', i);
      if (result === 'need-target') { refresh(); return; }
      if (result !== 'ok') flash(result);
      refresh();
      return;
    }
    state.selectedHand = i;
    state.attackerUid = null;
    refresh();
  },
  onFieldCreature(who, uid) {
    if (state.over || state.active !== 'player') return;
    if (who === 'ai') {
      if (state.targetMode) {
        const target = { kind: 'creature', creature: state.ai.field.find((c) => c.uid === uid) };
        if (target.creature) castTargetedSpell(state, 'player', target);
        refresh();
        return;
      }
      if (state.attackerUid) {
        const target = { kind: 'creature', creature: state.ai.field.find((c) => c.uid === uid) };
        const result = attackWith(state, 'player', state.attackerUid, target);
        state.attackerUid = null;
        if (result !== 'ok') flash(result);
        refresh();
        return;
      }
      return;
    }
    const creature = state.player.field.find((c) => c.uid === uid);
    if (!creature) return;
    if (state.targetMode) { state.targetMode = null; refresh(); return; }
    if (!creature.canAttack) { flash('That creature cannot attack yet.'); return; }
    state.attackerUid = state.attackerUid === uid ? null : uid;
    state.selectedHand = -1;
    refresh();
  },
  onHero(who) {
    if (state.over || state.active !== 'player') return;
    if (who === 'ai') {
      if (state.targetMode) { castTargetedSpell(state, 'player', { kind: 'hero' }); refresh(); return; }
      if (state.attackerUid) {
        if (hasGuard(state.player)) { flash('A Guard blocks the hero.'); return; }
        const result = attackWith(state, 'player', state.attackerUid, { kind: 'hero' });
        state.attackerUid = null;
        if (result !== 'ok') flash(result);
        refresh();
        return;
      }
    }
  },
  onEndTurn() {
    if (state.over || state.active !== 'player') return;
    if (endTurn(state)) {
      refresh();
      scheduleAi();
    }
  },
};

function flash(text) {
  state.log.unshift(text);
  if (state.log.length > 6) state.log.length = 6;
}

document.addEventListener('keydown', (event) => {
  if (state.phase === 'title' && (event.key === 'Enter' || event.key === ' ')) {
    handlers.onStart();
    return;
  }
  if (state.phase === 'over' && (event.key === 'r' || event.key === 'R' || event.key === 'Enter')) {
    handlers.onStart();
    return;
  }
  if (state.phase !== 'play' || state.active !== 'player' || state.over) return;
  if (event.key >= '1' && event.key <= '7') {
    handlers.onHandCard(Number(event.key) - 1);
  } else if (event.key === 'Enter' || event.key === ' ') {
    if (state.selectedHand >= 0) handlers.onHandCard(state.selectedHand);
  } else if (event.key === 'n' || event.key === 'N') {
    handlers.onEndTurn();
  } else if (event.key === 'Escape') {
    state.selectedHand = -1;
    state.attackerUid = null;
    state.targetMode = null;
    refresh();
  }
});

// ---- Screenshot scenes: fixed, deterministic states of the real game ----
function summon(state, who, cardId) {
  const side = who === 'player' ? state.player : state.ai;
  if (side.field.length >= 5) return;
  const creature = freshCreature(cardById(cardId));
  creature.uid = 1000 + side.field.length + (who === 'ai' ? 100 : 0);
  creature.owner = who;
  creature.canAttack = true;
  creature.justPlayed = false;
  side.field.push(creature);
}

function sceneTable() {
  const s = newGame(20261122);
  startMatch(s);
  s.turn = 5;
  s.player.mana = 6; s.player.maxMana = 6;
  s.player.hand = [cardById('drake'), cardById('bolt'), cardById('growth'), cardById('serpent'), cardById('skin')];
  s.ai.hand = [cardById('imp'), cardById('hound'), cardById('knight'), cardById('guard')];
  summon(s, 'player', 'knight');
  summon(s, 'player', 'golem');
  summon(s, 'player', 'wolf');
  summon(s, 'ai', 'serpent');
  summon(s, 'ai', 'sentry');
  s.player.field[0].hp = 2;
  s.ai.field[0].hp = 3;
  s.player.life = 24; s.player.armor = 3;
  s.ai.life = 19;
  s.log = [
    'Flame Knight trades with Wave Serpent (4 vs 5).',
    'The Warden summons Oak Sentry — Guard!',
    'You summon Stone Golem (4/6).',
    '— Turn 5: your move —',
  ];
  return s;
}

function sceneEnd(win) {
  const s = sceneTable();
  s.phase = 'over';
  s.over = true;
  if (win) {
    s.winner = 'player';
    s.ai.life = 0;
    s.log = ['Flame Knight strikes the enemy hero for 4.', 'Victory! The Ashen Warden falls.'];
  } else {
    s.winner = 'ai';
    s.player.life = 0;
    s.log = ['Wave Serpent strikes your hero for 5.', 'Defeat. The embers fade.'];
  }
  return s;
}

function boot() {
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot === 'title') {
    state = newGame(20261122);
    state.phase = 'title';
  } else if (shot === 'table') {
    state = sceneTable();
  } else if (shot === 'win') {
    state = sceneEnd(true);
  } else if (shot === 'loss') {
    state = sceneEnd(false);
  } else {
    state = newGame((Date.now() % 2147483647) || 7);
    state.phase = 'title';
  }
  refresh();
}

boot();
