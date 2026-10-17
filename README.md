# Steal an Egg: Math Quest

A single-player 3D browser remake of Roblox's *Steal an Egg*, where every egg is guarded by a mythical beast that asks a math question.

**Play:** double-click `index.html`. No server, install or internet needed (Three.js is bundled in `lib/`). Progress saves in the browser.

## Look
Roblox-style 3D: studded baseplates, a blocky avatar, plastic-looking parts, floating name tags, a Roblox-style third-person camera behind the character (WASD moves relative to the camera, Space (or the touch JUMP button) jumps, ←/→ or drag to turn, scroll to zoom, touch thumbstick on phones), and props or guardians that fade when they block the view.

## Characters
Press **👤** in the top bar to pick who you play as. Your choice is saved.
- **Classic:** the blocky Roblox avatar, with swinging arms and legs.
- **Kai:** an imported 3D model, holding a stag beetle. Imported models have no skeleton, so Kai hops, leans into the run and waddles instead of swinging limbs.

## Your base
A big safe zone that guardians can't enter. It has 12 large plots, the treadmill, the **TRAILS SHOP** circle and the spawn pad, with the path out to the Haunted Forest. Creatures grow with what they earn, from a small Common Goblin (~2.6 studs) to towering Divines from Elysium (~16 studs). Height = 2.6 × income^0.13, flattening out above $200K/s so the giants still fit on their plots.

### Selling creatures
- **Sell any creature:** stand on its plot and press **E**, or tap the prompt on a phone. A creature (or an egg still hatching) sells for 20 seconds of its income, and the plot becomes free.
- **Base full:** if every plot is taken when you bring an egg home, the game pauses and lists the new egg plus all your creatures, weakest first. Sell one of your creatures and the new egg takes its plot, or sell the new egg instead.

## Creature looks
Hatched creatures are sculpted rather than blocky: rounded, smooth-shaded parts, feathered wings and reflective materials. The rarer the creature, the grander it looks:
- **Common / Uncommon:** matte, with soft rounded shapes.
- **Rare / Epic:** glossy clear-coat. Epic adds a soft aura.
- **Legendary:** metallic sheen, a stronger aura and orbiting motes of light.
- **Mythic:** iridescent shimmer and a spinning rune circle underfoot.
- **Divine:** polished gold-white finish, a floating golden halo, slowly turning sun rays behind the head, a golden rune circle and a swarm of gold and white motes.

The **Divine Sun Sphinx** uses an imported 3D model (`.glb`) made from a player's drawing. It sits on big clawed haunches, with a long slender neck and a round face framed by a bob of hair with a curl on top. It has droopy cyan eyes and its tongue poking out, and its clawed wing-arms are flung wide with white membranes. If the model can't load, the game falls back to a hand-built version.

Three more creatures use imported models: **Cheese**, a floppy-eared yellow pet in a blue shirt (Divine, Bloom Cherry Blossom); **Shiny**, a round red sun-robot (Epic, Dragon Volcano); and **Thunder**, a steel mecha (Legendary, Storm Sky Isles).

**Adding imported models:** the originals are AI-generated meshes of about 2M triangles and 50–60MB each, so they are cut down for the game:
- the Sun Sphinx is simplified to 24K triangles with a 1024px texture (about 0.9MB);
- Kai, Shiny and Thunder have textures split into many small patches, which smear when simplified. Their texture colours are baked into the vertices first, then the mesh is simplified to 40K triangles (about 0.8MB each, no texture).
 It is stored as base64 in `assets/models.js`, because browsers block loading separate model files when you open `index.html` directly. A creature uses an imported model when its spec has `model: '<key>'`, and new characters go in the `CHARACTERS` list in `game.js`. The original high-poly files in `assets/*.glb` are not committed.

Guardians keep the classic blocky Roblox look.

## Zones
Each zone is a big arena (about 90 × 70 studs):
- **A winding path** leads from the gate to the guardian's **lair**, a ring of torch-lit pillars. The **lair egg** inside always rolls rarer (and its question is harder). Eggs deeper in a zone are rarer in general.
- **Broken walls** split the zone into sections. Rubble gaps are too small for the guardian but you can squeeze through, and the same goes for the gaps between lair pillars.
- **Green boost pads** give a short burst of speed (×1.7), handy for getaways.
- Themed landmarks: a giant dead tree, a ruined statue, a pyramid, a step temple, ice crystals, an erupting volcano, a shipwreck, a floating monolith, a crystal cluster, a floating sky island, a giant mushroom, a Greek temple, the gates of Hades, a glowing fae tree, an obsidian spire with a watching eye and a golden heaven gate.

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
- **Divine questions are always the hardest (difficulty 10).** Divine creatures earn 120× income. There are 17 of them, one per zone: Celestial Stag, Seraph Swan, Sun Sphinx, Jade Dragon King, Aurora Wolf, Sovereign Phoenix, Pearl Kraken, Archangel, Prismatic Dragon, Storm Sovereign, Elder Mycelium, Zeus Eagle, Soul Phoenix, Oberon the Fae King, Moonlight Wyrm, The Eternal One and Cheese.
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
| Rainbow | Celestial | ×3.15 | $120B |
| Void | Celestial | ×3.4 | $800B |
| Omega | Omega | ×3.7 | $6T |

The last three go beyond the original's list, for the deeper zones.

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
| Crystal Caverns | Crystallos the Gem Colossus | 160K |
| Storm Sky Isles | Zephyros the Thunderbird | 520K |
| Mushroom Realm | Mycelos the Spore King | 1.7M |
| Mount Olympus | Kronos the Titan | 5.5M |
| The Underworld | Cerberus the Hound of Hades (3 heads) | 18M |
| Fae Wilds | Titania the Fae Queen | 60M |
| Shadow Realm | Nyx the Shadow Wyrm | 200M |
| Elysium Heavens | Solarion the Seraph | 650M |
| **Bloom Cherry Blossom** (final level) | **Bloom** | 2.1B |

Each zone has 6 creatures to hatch, one per rarity (Common → Mythic), plus its Divine: 119 in total. They include Goblins, Griffins, Nagas, Anubis Jackals, Quetzalcoatl, Yetis, Hellhounds, Sirens, Leviathans, Celestial Dragons, Diamond Golems, Pegasi, Fungal Hydras, Nemean Lions, Cyclopes, Charon the Ferryman, Faerie Dragons, Nightmare Steeds, Cherubs, Radiant Phoenixes, Koi Serpents, Tengu and Sakura Dragons. All are built in `creatures.js`.

## The final level: Bloom Cherry Blossom
A pink cherry-blossom biome with giant blossom trees shedding petals, torii gates, stone lanterns and azalea bushes. Petals drift through the air. The gate is marked **★ FINAL LEVEL ★**, and you need 2.1B speed to get in. The boss is **Bloom**, an imported 3D model and the biggest guardian in the game. The zone's creatures are the Petal Sprite, Blossom Tanuki, Koi Serpent, Sakura Fox, Tengu and Sakura Dragon. Its Divine is **Cheese**.

## Big numbers
Late-game cash runs into the trillions and beyond: a Divine from Elysium earns $1.44B every second. Numbers use Roblox-style short names: K, M, B, T, Qa (quadrillion), Qi, Sx, Sp, Oc, No and Dc (decillion), then scientific notation (1.23e36). Speed, prices, income and the treadmill all use the same format. Movement runs in small sub-steps, so even very fast players and guardians can't skip through walls.

## Core loop (from the original)
Steal an egg → carry it to your base → it hatches into a creature that earns cash each second → train speed on the treadmill → unlock deeper zones with rarer eggs and faster guardians.

## The math twist
- Pick a level at the start (change it any time from ☰): Seedling (5–7, multiple choice), Explorer (8–10), Adventurer (11–13), Mastermind (14+).
- Question difficulty (1–10) grows with zone depth + egg rarity, reaching 10 in the deepest zones.
- **Right answer:** cash, speed and a streak bonus. You grab the egg; the guardian is stunned briefly, then chases you home.
- **Wrong answer:** the game shows the correct answer with a worked explanation, then the guardian SMACKS you back to base.

Files: `index.html`, `style.css`, `game.js` (game + 3D world), `creatures.js` (creature builder), `math.js` (questions), `assets/models.js` (imported models), `lib/three.min.js` and `lib/GLTFLoader.js` (the three.js r149 glTF loader, converted to a plain script).
Add `#debug` to the URL to expose `window.dbg` for testing.
