// Ember Court — the rules engine: turns, mana, combat, spells, armor, Guard.
import { buildDeck, freshCreature, makeRng } from './cards.js';

export const MAX_HAND = 7;
export const MAX_FIELD = 5;
export const START_LIFE = 30;
export const MAX_MANA = 10;

let uidCounter = 1;

export function newSide(rng) {
  return {
    life: START_LIFE, armor: 0, mana: 0, maxMana: 0,
    deck: buildDeck(rng), hand: [], field: [], fatigue: 0,
  };
}

export function newGame(seed) {
  const rng = makeRng(seed);
  uidCounter = 1;
  const state = {
    seed, rng, phase: 'title', turn: 0, active: 'player',
    player: newSide(rng), ai: newSide(rng),
    log: [], winner: null, over: false,
    selectedHand: -1, attackerUid: null, targetMode: null,
  };
  return state;
}

export function startMatch(state) {
  state.phase = 'play';
  state.turn = 1;
  for (let i = 0; i < 3; i++) drawCard(state, state.player);
  for (let i = 0; i < 4; i++) drawCard(state, state.ai);
  beginTurn(state, state.player);
  addLog(state, 'The duel begins. Your move, Ember Warden.');
}

export function drawCard(state, side) {
  if (side.hand.length >= MAX_HAND) {
    if (side.deck.length > 0) side.deck.pop();
    return null;
  }
  if (side.deck.length === 0) {
    side.fatigue += 1;
    damageHero(state, side, side.fatigue, 'fatigue');
    return null;
  }
  const card = side.deck.pop();
  side.hand.push(card);
  return card;
}

export function beginTurn(state, side) {
  side.maxMana = Math.min(MAX_MANA, side.maxMana + 1);
  side.mana = side.maxMana;
  for (const creature of side.field) {
    creature.canAttack = true;
    creature.justPlayed = false;
  }
  drawCard(state, side);
}

export function endTurn(state) {
  if (state.over || state.active !== 'player') return false;
  state.active = 'ai';
  state.selectedHand = -1;
  state.attackerUid = null;
  state.targetMode = null;
  addLog(state, 'You end your turn.');
  return true;
}

export function aiTakeTurn(state, aiBrain) {
  state.turn += 1;
  beginTurn(state, state.ai);
  addLog(state, `— Turn ${state.turn}: the Ashen Warden stirs —`);
  aiBrain(state);
  state.active = 'player';
  beginTurn(state, state.player);
  addLog(state, `— Turn ${state.turn}: your move —`);
}

export function addLog(state, text) {
  state.log.unshift(text);
  if (state.log.length > 6) state.log.length = 6;
}

export function sideOf(state, who) {
  return who === 'player' ? state.player : state.ai;
}

export function otherSide(state, who) {
  return who === 'player' ? state.ai : state.player;
}

function dealDamageToCreature(state, creature, amount) {
  creature.hp -= amount;
}

export function damageHero(state, side, amount, source) {
  let left = amount;
  if (side.armor > 0) {
    const absorbed = Math.min(side.armor, left);
    side.armor -= absorbed;
    left -= absorbed;
  }
  if (left > 0) side.life -= left;
  if (source === 'fatigue') addLog(state, `${side === state.player ? 'You take' : 'The Warden takes'} ${amount} fatigue damage.`);
  checkEnd(state);
}

export function healHero(side, amount) {
  side.life = Math.min(START_LIFE, side.life + amount);
}

export function checkEnd(state) {
  if (state.over) return;
  if (state.ai.life <= 0 && state.player.life <= 0) {
    state.winner = 'draw';
  } else if (state.ai.life <= 0) {
    state.winner = 'player';
  } else if (state.player.life <= 0) {
    state.winner = 'ai';
  } else {
    return;
  }
  state.over = true;
  state.phase = 'over';
  state.selectedHand = -1;
  state.attackerUid = null;
  state.targetMode = null;
  if (state.winner === 'player') addLog(state, 'Victory! The Ashen Warden falls.');
  else if (state.winner === 'ai') addLog(state, 'Defeat. The embers fade.');
  else addLog(state, 'A draw — both wardens fall together.');
}

export function hasGuard(side) {
  return side.field.some((c) => c.effect === 'guard' && c.hp > 0);
}

export function canAttackTarget(state, attacker, target) {
  if (!attacker.canAttack) return false;
  const foe = otherSide(state, attacker.owner);
  if (target.kind === 'hero') {
    return !hasGuard(foe);
  }
  const guardUp = hasGuard(foe);
  return !guardUp || target.creature.effect === 'guard';
}

// Play a hand card. For targeted spells, returns 'need-target' and arms
// targeting; otherwise resolves at once and returns 'ok' or an error string.
export function playCard(state, who, handIndex) {
  const side = sideOf(state, who);
  const foe = otherSide(state, who);
  const card = side.hand[handIndex];
  if (!card) return 'no such card';
  if (state.over || state.active !== who) return 'not your turn';
  if (card.cost > side.mana) return 'not enough embers';
  if (card.type === 'creature' && side.field.length >= MAX_FIELD) return 'your field is full';

  if (card.type === 'spell' && card.effect === 'bolt3') {
    state.selectedHand = handIndex;
    state.targetMode = { spell: 'bolt3', handIndex };
    state.attackerUid = null;
    return 'need-target';
  }

  side.mana -= card.cost;
  side.hand.splice(handIndex, 1);
  state.selectedHand = -1;
  state.targetMode = null;

  if (card.type === 'creature') {
    const creature = freshCreature(card);
    creature.uid = uidCounter++;
    creature.owner = who;
    side.field.push(creature);
    addLog(state, `${who === 'player' ? 'You summon' : 'The Warden summons'} ${card.name} (${card.atk}/${card.hp}).`);
    applyBattlecry(state, who, creature);
  } else {
    resolveSpell(state, who, card, null);
  }
  checkEnd(state);
  return 'ok';
}

export function applyBattlecry(state, who, creature) {
  const side = sideOf(state, who);
  if (creature.effect === 'draw1') {
    drawCard(state, side);
    addLog(state, `${creature.name} draws a card.`);
  } else if (creature.effect === 'heal3') {
    healHero(side, 3);
    addLog(state, `${creature.name} restores 3 life.`);
  } else if (creature.effect === 'buffAll') {
    for (const other of side.field) {
      if (other.uid !== creature.uid) { other.atk += 1; other.hp += 1; other.maxHp += 1; }
    }
    addLog(state, `${creature.name} strengthens your court +1/+1.`);
  }
}

export function resolveSpell(state, who, card, target) {
  const side = sideOf(state, who);
  const foe = otherSide(state, who);
  if (card.effect === 'bolt3') {
    if (!target) return 'choose a target';
    if (target.kind === 'hero') {
      damageHero(state, foe, 3, 'spell');
      addLog(state, `${who === 'player' ? 'Your Firebolt scorches' : 'Firebolt scorches'} the enemy hero for 3.`);
    } else {
      dealDamageToCreature(state, target.creature, 3);
      addLog(state, `Firebolt hits ${target.creature.name} for 3.`);
      sweepDead(state, foe);
    }
  } else if (card.effect === 'heal6') {
    healHero(side, 6);
    addLog(state, `${who === 'player' ? 'You' : 'The Warden'} restore 6 life.`);
  } else if (card.effect === 'buffTeam') {
    for (const c of side.field) { c.atk += 2; c.hp += 2; c.maxHp += 2; }
    addLog(state, 'Overgrowth: your creatures +2/+2.');
  } else if (card.effect === 'armor5') {
    side.armor += 5;
    addLog(state, `${who === 'player' ? 'You gain' : 'The Warden gains'} 5 armor.`);
  }
  checkEnd(state);
  return 'ok';
}

export function castTargetedSpell(state, who, target) {
  const mode = state.targetMode;
  if (!mode) return 'no spell armed';
  const side = sideOf(state, who);
  const card = side.hand[mode.handIndex];
  if (!card) { state.targetMode = null; return 'spell gone'; }
  side.mana -= card.cost;
  side.hand.splice(mode.handIndex, 1);
  state.targetMode = null;
  state.selectedHand = -1;
  resolveSpell(state, who, card, target);
  return 'ok';
}

export function sweepDead(state, side) {
  const before = side.field.length;
  side.field = side.field.filter((c) => c.hp > 0);
  if (side.field.length < before) addLog(state, 'A creature falls.');
}

// A creature strikes a target. Both creatures trade damage at once.
export function attackWith(state, who, attackerUid, target) {
  const side = sideOf(state, who);
  const foe = otherSide(state, who);
  const attacker = side.field.find((c) => c.uid === attackerUid);
  if (!attacker) return 'no attacker';
  if (state.over || state.active !== who) return 'not your turn';
  if (!canAttackTarget(state, attacker, target)) {
    return target.kind === 'hero' ? 'a Guard blocks the hero' : 'that creature cannot attack yet';
  }
  attacker.canAttack = false;
  if (target.kind === 'hero') {
    damageHero(state, foe, attacker.atk, 'attack');
    addLog(state, `${attacker.name} strikes the enemy hero for ${attacker.atk}.`);
  } else {
    const defender = target.creature;
    dealDamageToCreature(state, defender, attacker.atk);
    dealDamageToCreature(state, attacker, defender.atk);
    addLog(state, `${attacker.name} trades with ${defender.name} (${attacker.atk} vs ${defender.atk}).`);
    sweepDead(state, foe);
    sweepDead(state, side);
  }
  checkEnd(state);
  return 'ok';
}
