// Ember Court — card catalogue and deck building.
// Every card belongs to one of four houses. A house is told apart by colour
// AND by shape, never by text alone: Flame is a red triangle, Tide a blue
// circle, Thorn a green diamond, Stone an amber square.

export const HOUSES = {
  flame: { label: 'Flame', shape: '▲', color: '#e2483d', dark: '#8f1d16', glow: '#ff7a5c' },
  tide: { label: 'Tide', shape: '●', color: '#2f8fe8', dark: '#144a7d', glow: '#6fc2ff' },
  thorn: { label: 'Thorn', shape: '◆', color: '#3fae5a', dark: '#1c5c2e', glow: '#7ede8f' },
  stone: { label: 'Stone', shape: '■', color: '#d99a2b', dark: '#7a5510', glow: '#ffcf6e' },
};

// effect: the engine key that runs when the card resolves.
//   none     — plain creature
//   draw1    — draw a card on play
//   heal3    — restore 3 life to your hero on play
//   buffAll  — give your other creatures +2 attack / +2 health
//   guard    — enemies must attack this creature before anything else
//   bolt3    — spell: deal 3 damage to any target you choose
//   heal6    — spell: restore 6 life to your hero
//   buffTeam — spell: give all your creatures +2 / +2
//   armor5   — spell: gain 5 armor
export const CARDS = [
  { id: 'imp', name: 'Ember Imp', house: 'flame', cost: 1, type: 'creature', atk: 2, hp: 1, effect: 'none', text: 'A spark with teeth.' },
  { id: 'hound', name: 'Cinder Hound', house: 'flame', cost: 2, type: 'creature', atk: 3, hp: 2, effect: 'none', text: 'It hunts in the smoke.' },
  { id: 'knight', name: 'Flame Knight', house: 'flame', cost: 3, type: 'creature', atk: 4, hp: 3, effect: 'none', text: 'His blade never cools.' },
  { id: 'drake', name: 'Pyre Drake', house: 'flame', cost: 5, type: 'creature', atk: 6, hp: 5, effect: 'none', text: 'The sky catches fire.' },
  { id: 'phoenix', name: 'Ember Phoenix', house: 'flame', cost: 6, type: 'creature', atk: 7, hp: 6, effect: 'draw1', text: 'Reborn — draw a card.' },
  { id: 'sprite', name: 'Tide Sprite', house: 'tide', cost: 1, type: 'creature', atk: 1, hp: 2, effect: 'draw1', text: 'Draw a card.' },
  { id: 'guard', name: 'Reef Guard', house: 'tide', cost: 2, type: 'creature', atk: 2, hp: 3, effect: 'heal3', text: 'Restore 3 life.' },
  { id: 'serpent', name: 'Wave Serpent', house: 'tide', cost: 4, type: 'creature', atk: 5, hp: 4, effect: 'none', text: 'It rides the flood.' },
  { id: 'sprout', name: 'Thorn Sprout', house: 'thorn', cost: 1, type: 'creature', atk: 1, hp: 3, effect: 'buffAll', text: 'Your other creatures +1/+1.' },
  { id: 'wolf', name: 'Briar Wolf', house: 'thorn', cost: 2, type: 'creature', atk: 3, hp: 3, effect: 'none', text: 'Thorns for fur.' },
  { id: 'dryad', name: 'Thorn Dryad', house: 'thorn', cost: 3, type: 'creature', atk: 3, hp: 5, effect: 'heal3', text: 'Restore 3 life.' },
  { id: 'sentry', name: 'Oak Sentry', house: 'stone', cost: 3, type: 'creature', atk: 2, hp: 6, effect: 'guard', text: 'Guard: foes must strike it first.' },
  { id: 'golem', name: 'Stone Golem', house: 'stone', cost: 4, type: 'creature', atk: 4, hp: 6, effect: 'guard', text: 'Guard: foes must strike it first.' },
  { id: 'titan', name: 'Cinder Titan', house: 'stone', cost: 6, type: 'creature', atk: 7, hp: 7, effect: 'guard', text: 'Guard: foes must strike it first.' },
  { id: 'bolt', name: 'Firebolt', house: 'flame', cost: 2, type: 'spell', atk: 0, hp: 0, effect: 'bolt3', text: 'Deal 3 damage to any target.' },
  { id: 'rain', name: 'Healing Rain', house: 'tide', cost: 2, type: 'spell', atk: 0, hp: 0, effect: 'heal6', text: 'Restore 6 life to your hero.' },
  { id: 'growth', name: 'Overgrowth', house: 'thorn', cost: 2, type: 'spell', atk: 0, hp: 0, effect: 'buffTeam', text: 'Your creatures +2/+2.' },
  { id: 'skin', name: 'Stone Skin', house: 'stone', cost: 1, type: 'spell', atk: 0, hp: 0, effect: 'armor5', text: 'Gain 5 armor.' },
];

export function cardById(id) {
  return CARDS.find((c) => c.id === id);
}

// Small seeded RNG (mulberry32) so screenshot modes are deterministic.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(deck, rng) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// A 24-card deck: two copies of twelve designs, one from each house family.
const DECK_IDS = [
  'imp', 'imp', 'hound', 'knight', 'drake', 'phoenix',
  'sprite', 'guard', 'serpent', 'sprout', 'wolf', 'dryad',
  'sentry', 'golem', 'titan', 'bolt', 'bolt', 'rain',
  'growth', 'growth', 'skin', 'skin', 'hound', 'serpent',
];

export function buildDeck(rng) {
  return shuffle(DECK_IDS.map((id) => cardById(id)), rng);
}

export function freshCreature(card) {
  return {
    uid: 0, cardId: card.id, name: card.name, house: card.house,
    cost: card.cost, atk: card.atk, hp: card.hp, maxHp: card.hp,
    effect: card.effect, text: card.text, canAttack: false, justPlayed: true,
  };
}
