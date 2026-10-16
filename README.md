# Steal an Egg: Math Quest

A single-player 3D browser remake of Roblox's *Steal an Egg*, where every egg is guarded by a mythical beast that asks a math question.

**Play:** double-click `index.html`. No server, install or internet needed (Three.js is bundled in `lib/`). Progress saves in the browser.

## Look
Roblox-style 3D: studded baseplates, a blocky avatar, plastic-looking parts, floating name tags, a Roblox-style third-person camera behind the character (WASD moves relative to the camera, Space (or the touch JUMP button) jumps, ←/→ or drag to turn, scroll to zoom, touch thumbstick on phones), and props or guardians that fade when they block the view.

## Your base
A big safe zone that guardians can't enter. It has 12 large plots, the treadmill, the **TRAILS SHOP** circle and the spawn pad, with the path out to the Haunted Forest. Creatures grow with what they earn, from a small Common Goblin (~2.6 studs) to towering Divines from the Void Cosmos (~13 studs). Height = 2.6 × income^0.13.

## Creature looks
Hatched creatures are sculpted rather than blocky: rounded, smooth-shaded parts, feathered wings and reflective materials. The rarer the creature, the grander it looks:
- **Common / Uncommon:** matte, with soft rounded shapes.
- **Rare / Epic:** glossy clear-coat. Epic adds a soft aura.
- **Legendary:** metallic sheen, a stronger aura and orbiting motes of light.
- **Mythic:** iridescent shimmer and a spinning rune circle underfoot.
- **Divine:** polished gold-white finish, a floating golden halo, slowly turning sun rays behind the head, a golden rune circle and a swarm of gold and white motes.

The **Divine Sun Sphinx** has its own hand-built model, based on a player's drawing. It sits on big clawed haunches, with a long slender neck and a round face framed by a pale-gold bob of hair with a curl on top. It has droopy cyan eyes and its tongue poking out, and its feather-tipped wing-arms are flung wide with white membranes sweeping down to its body.

Guardians keep the classic blocky Roblox look.

## Zones
Each zone is a big arena (about 90 × 70 studs):
- **A winding path** leads from the gate to the guardian's **lair**, a ring of torch-lit pillars. The **lair egg** inside always rolls rarer (and its question is harder). Eggs deeper in a zone are rarer in general.
- **Broken walls** split the zone into sections. Rubble gaps are too small for the guardian but you can squeeze through, and the same goes for the gaps between lair pillars.
- **Green boost pads** give a short burst of speed (×1.7), handy for getaways.
- Themed landmarks: a giant dead tree, a ruined statue, a pyramid, a step temple, ice crystals, an erupting volcano, a shipwreck and a floating monolith.

## Guardians
- They chase at or above the speed their zone requires, faster in deeper zones (so you'll want a trail), and they **pounce** every few seconds (a burst of speed with a growl and a flaring red ring).
- They path-find around walls and pillars, and barge through small scenery when close.
- They stay dazed for 1.8s after you grab an egg. They chase you out of their zone and halfway through the previous one, then give up (**ESCAPED!**).
- Caught while carrying an egg:
  - **inside the monster's zone:** the egg goes straight back onto its pedestal.
  - **after you've left its zone:** the egg drops where you were caught, marked with a glowing beam. Walk up to it and press E (or tap it), then **solve a new math question** to pick it up. A wrong answer smacks you home again and the egg stays where it is. If you're still within the monster's reach, it comes after you again.

## Day & night (from the original's reset cycle)
The original runs a 5-minute cycle that ends in a short night "reset": eggs restock, grow 30× faster, and ultra-rare eggs (Secret / Eternal / **Divine**) are rolled, with a server-wide alert naming the egg and its biome. This remake uses:
- **4 minutes of day, then 1 minute of night.** The clock is in the HUD. The sky darkens, stars and a moon come out, torches glow, and a lantern lights up around you.
- **At nightfall** every egg restocks and eggs at your base hatch **3× faster** (30× would hatch everything instantly with these short timers). The field also stays open at night, because a full minute of closed zones would be boring.
- **Divine eggs spawn only at night.** The chance is 55% at nightfall and 30% at midnight, and the first night always brings one. It appears in a zone you've unlocked. A big **✨ A DIVINE EGG HAS SPAWNED! ✨** banner, a chime and a tracker show which zone it's in and how far away it is. A golden beam of light marks it from across the map.
- **Divine questions are always the hardest (difficulty 10).** Divine creatures earn 120× income. There are 8 of them: Celestial Stag, Seraph Swan, Sun Sphinx, Jade Dragon King, Aurora Wolf, Sovereign Phoenix, Pearl Kraken and Archangel.
- **At sunrise** a Divine egg still on its pedestal fades away. One you're carrying, or one dropped outside its zone, is safe.

## Speed & trails
- **Speed you can feel:** speed points turn into run speed on a steeper curve (8 studs/s at the start, ~18 at 450 points, ~25.6 at 50K).
  - The HUD shows your actual run speed in studs/s.
  - Every 4% gain pops a **⚡ FASTER!**.
  - Stepping off the treadmill shows how much faster you got.
  - As you speed up, the camera's field of view widens, speed lines stream in at the edges, and your stride quickens.
- **Trails** (from the original): walk into the glowing yellow **TRAILS SHOP** circle in your base, or use Shop → Trails. Each trail multiplies your run speed. Only the equipped one counts (they don't stack), and it multiplies your treadmill speed.
  - While you run, a glowing ribbon in the trail's colours streams behind you. Galaxy and higher also shed sparkles.
  - The original goes up to ×14. Here the multipliers are compressed so guardians stay a threat, and deeper guardians run a bit faster to match.

| Trail | Rarity | Speed | Price |
|---|---|---|---|
| Gray | Common | ×1.15 | $150 |
| Green | Uncommon | ×1.3 | $2.5K |
| Blue | Rare | ×1.45 | $25K |
| Purple | Epic | ×1.6 | $200K |
| Golden | Legendary | ×1.75 | $1.5M |
| Red | Mythic | ×1.9 | $12M |
| Galaxy | Legendary | ×2.1 | $100M |
| Secret | Secret | ×2.35 | $800M |
| Eternal | Eternal | ×2.6 | $4B |
| Divine | Divine | ×2.9 | $20B |

## Jumping & sound
- **Jumping:** a Roblox-style jump about 4 studs high. In mid-air you clear small scenery (rocks, bushes, trees). Walls and lair pillars are still too tall to jump.
- **Sound effects:** all made with Web Audio, no sound files. They imitate the original's Roblox feel:
  - moving: a springy jump, a landing thud, footsteps that change with the ground (grass, sand, snow crunch), and a whoosh on boost pads;
  - getting hit: a Roblox-style **"oof"** when smacked or caught;
  - rewards: a cash "ka-ching" for right answers, coin chimes from your creatures, an egg-grab pop, and a crack when an egg hatches;
  - tension: a heartbeat during chases that speeds up as the monster gets closer, and ticks counting down the last 5 seconds before night or sunrise.

## Zones & guardians
| Zone | Guardian | Speed needed |
|---|---|---|
| Haunted Forest | Gorehorn the Minotaur | 0 |
| Hydra Lake | The Lernaean Hydra (3 heads) | 25 |
| Cursed Desert | The Manticore | 120 |
| Serpent Jungle | The Basilisk | 450 |
| Frost Peaks | Ymir the Frost Giant | 1.5K |
| Dragon Volcano | Ignis the Inferno Dragon | 5K |
| Kraken Abyss | The Kraken | 16K |
| Void Cosmos | Astraeus the Void Dragon | 50K |

Each zone has 6 creatures to hatch, one per rarity (Common → Mythic), 48 in total: Goblins, Griffins, Nagas, Anubis Jackals, Quetzalcoatl, Yetis, Hellhounds, Sirens, Leviathans, Celestial Dragons and more. All are built from blocky parts in `creatures.js`.

## Core loop (from the original)
Steal an egg → carry it to your base → it hatches into a creature that earns cash each second → train speed on the treadmill → unlock deeper zones with rarer eggs and faster guardians.

## The math twist
- Pick a level at the start (change it any time from ☰): Seedling (5–7, multiple choice), Explorer (8–10), Adventurer (11–13), Mastermind (14+).
- Question difficulty (1–10) = zone depth + egg rarity.
- **Right answer:** cash, speed and a streak bonus. You grab the egg; the guardian is stunned briefly, then chases you home.
- **Wrong answer:** the game shows the correct answer with a worked explanation, then the guardian SMACKS you back to base.

Files: `index.html`, `style.css`, `game.js` (game + 3D world), `creatures.js` (creature builder), `math.js` (questions), `lib/three.min.js`.
Add `#debug` to the URL to expose `window.dbg` for testing.
