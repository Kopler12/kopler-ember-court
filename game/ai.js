// Ember Court — the Ashen Warden: a readable opponent brain.
// It plays its best cards first, spends its embers, then attacks: lethal
// first, then favourable trades, then straight at the hero. Guard is obeyed.
import { playCard, attackWith, castTargetedSpell, hasGuard } from './engine.js';

function scoreCard(state, card) {
  let value = card.cost * 2 + (card.atk || 0) + (card.hp || 0);
  if (card.effect === 'guard') value += 2;
  if (card.effect === 'draw1') value += 2;
  if (card.effect === 'heal3' && state.ai.life < 24) value += 3;
  if (card.effect === 'buffAll' && state.ai.field.length > 1) value += 3;
  return value;
}

export function aiPlayCards(state) {
  const side = state.ai;
  for (let guard = 0; guard < 12; guard++) {
    let best = -1;
    let bestValue = -1;
    for (let i = 0; i < side.hand.length; i++) {
      const card = side.hand[i];
      if (card.cost > side.mana) continue;
      if (card.type === 'creature' && side.field.length >= 5) continue;
      if (card.type === 'spell' && card.effect === 'heal6' && side.life > 24) continue;
      if (card.type === 'spell' && card.effect === 'armor5' && side.life > 26) continue;
      if (card.type === 'spell' && card.effect === 'buffTeam' && side.field.length === 0) continue;
      const value = scoreCard(state, card);
      if (value > bestValue) { bestValue = value; best = i; }
    }
    if (best < 0) return;
    const card = side.hand[best];
    if (card.type === 'spell' && card.effect === 'bolt3') {
      const result = playCard(state, 'ai', best);
      if (result !== 'need-target') continue;
      const foe = state.player;
      const lethal = foe.life + foe.armor <= 3;
      if (lethal) {
        castTargetedSpell(state, 'ai', { kind: 'hero' });
        continue;
      }
      const big = foe.field.slice().sort((a, b) => b.atk - a.atk)[0];
      if (big && big.hp <= 3) {
        castTargetedSpell(state, 'ai', { kind: 'creature', creature: big });
      } else {
        castTargetedSpell(state, 'ai', { kind: 'hero' });
      }
      continue;
    }
    playCard(state, 'ai', best);
    if (state.over) return;
  }
}

export function aiAttack(state) {
  const foe = state.player;
  for (const attacker of state.ai.field.slice()) {
    if (state.over) return;
    if (!attacker.canAttack) continue;
    const guard = hasGuard(foe) ? foe.field.find((c) => c.effect === 'guard') : null;
    if (foe.life + foe.armor <= attacker.atk) {
      attackWith(state, 'ai', attacker.uid, { kind: 'hero' });
      continue;
    }
    if (guard) {
      attackWith(state, 'ai', attacker.uid, { kind: 'creature', creature: guard });
      continue;
    }
    let trade = null;
    for (const defender of foe.field) {
      if (defender.hp <= attacker.atk && defender.atk < attacker.hp) {
        if (!trade || defender.atk > trade.atk) trade = defender;
      }
    }
    if (trade) {
      attackWith(state, 'ai', attacker.uid, { kind: 'creature', creature: trade });
    } else {
      attackWith(state, 'ai', attacker.uid, { kind: 'hero' });
    }
  }
}

export function runAiTurn(state) {
  aiPlayCards(state);
  if (!state.over) aiAttack(state);
}
