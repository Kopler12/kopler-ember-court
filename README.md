[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Kopler12/kopler-ember-court/rank.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Kopler12/kopler-ember-court/reward.svg)](https://make.fun/c/best-card-game-20261122-1826)

# Ember Court

A complete, original card battler that runs offline in a desktop browser
from static files — no network, no build step. You are the Ember Warden,
duelling the Ashen Warden for the throne of a court of living cards.

## How it plays

- **Life 30 vs 30.** Reduce the Ashen Warden to 0 to win; fall to 0 and the
  embers fade.
- **Embers are mana.** You gain one more ember each turn (up to 10) and
  spend them to play cards from your hand.
- **Four houses, told apart by colour and shape:** Flame ▲ (red, aggressive),
  Tide ● (blue, draw and healing), Thorn ◆ (green, growth), Stone ■ (amber,
  armor and Guard).
- **Creatures fight, spells strike.** Creatures attack the turn after they
  are played and trade damage with what they hit. Firebolt needs a target;
  Healing Rain, Overgrowth and Stone Skin resolve at once.
- **Guard matters.** While a Guard creature stands, foes must strike it
  before they can touch its hero. Armor absorbs damage first.
- **A readable opponent.** The Ashen Warden plays its best cards, takes
  favourable trades, and goes for lethal when it sees it — so you can read
  its plan and counter it.

## Controls

Mouse or keyboard: click a hand card to select it, click again (or press
Enter) to play it; click one of your ready creatures, then an enemy creature
or the enemy hero, to attack. Keys `1–7` select a card, `Enter` plays it,
`N` ends your turn, `Esc` cancels.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshot scenes (real renders of the game code):

```sh
http://localhost:8080/?shot=title
http://localhost:8080/?shot=table
http://localhost:8080/?shot=win
http://localhost:8080/?shot=loss
```

## Files

- `game/index.html` — the table; `game/styles.css` — all of the look
- `game/cards.js` — the four houses and the 18-card catalogue
- `game/engine.js` — turns, mana, combat, spells, armor, Guard
- `game/ai.js` — the Ashen Warden's brain
- `game/render.js` — the table as DOM
- `game/main.js` — boot, input, screenshot scenes
- `main.ts` — the make.fun entrypoint (Node 22, stdlib only)
- `screenshots/` — four real renders: title, mid-game table, win, loss

## License

MIT — see [LICENSE](LICENSE). Original game, art, names and rules.
