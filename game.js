(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');

  // ---------------- Data ----------------
  // Game logic runs in "px" units on a 2D map (x = along the world, y = depth). U converts px -> 3D studs.
  const U = 0.05;
  const WORLD_H = 1400, GARDEN_W = 1700, ZONE_W = 1800;
  const SPAWN = { x: 1450, y: WORLD_H / 2 };
  const TREADMILL = { x: 1230, y: 880, w: 200, h: 150 };
  const TRAIL_SHOP = { x: 1330, y: 450, r: 95 };
  const MAX_SLOTS = 12, START_SLOTS = 6;
  // Playable characters. `model` is a key in assets/models.js; the classic blocky avatar needs none.
  const CHARACTERS = [
    { id: 'classic', n: 'Classic', desc: 'The blocky original.', spec: { type: 'noob' } },
    { id: 'kai', n: 'Kai', desc: 'Never goes anywhere without a pet stag beetle.', model: 'kai', spec: { type: 'biped', model: 'kai', body: 0x5a3020, skin: 0xc07a50, legs: 0x6a6a6a, eye: 0x111111 } },
    { id: 'shiny', n: 'Shiny', desc: 'Glowing cracks, and a real skeleton: swings its arms and legs as it runs.', model: 'shinyrig', spec: { type: 'biped', bulky: true, model: 'shinyrig', body: 0xd8401a, skin: 0x3a6a66, cracks: 0xffd23f, eye: 0xffee00 } },
    { id: 'cheese', n: 'Cheese', desc: "Cheese never leaves a dog's side.", model: 'cheeserig', spec: { type: 'biped', model: 'cheeserig', body: 0xf6d000, belly: 0x6a7aff, eye: 0x222222 } },
  ];

  const RARITIES = [
    { name: 'Common', color: '#d9d4c7', hex: 0xd9d4c7, mult: 1, hatch: 5 },
    { name: 'Uncommon', color: '#5fd35f', hex: 0x5fd35f, mult: 2, hatch: 8 },
    { name: 'Rare', color: '#4aa3ff', hex: 0x4aa3ff, mult: 4, hatch: 12 },
    { name: 'Epic', color: '#b46cff', hex: 0xb46cff, mult: 8, hatch: 18 },
    { name: 'Legendary', color: '#ffb52e', hex: 0xffb52e, mult: 16, hatch: 26 },
    { name: 'Mythic', color: '#ff3d7f', hex: 0xff3d7f, mult: 40, hatch: 36 },
    // Divine eggs never roll normally: they only appear at night (see nightfall()).
    { name: 'Divine', color: '#fff2a8', hex: 0xfff2a8, mult: 120, hatch: 60 },
  ];
  const DIVINE = 6;

  const ZONES = [
    { name: 'Haunted Forest', req: 0, base: 1, ground: 0x4a7436, edge: 0x34552a, sky: 0x8fb5c9, deco: 'forest',
      guard: { n: 'Gorehorn the Minotaur', spec: { type: 'biped', bulky: true, body: 0x5a3a22, skin: 0x7a4e2c, legs: 0x3a2616, armor: 0x5c5f66, belt: 0x2a1a10, horns: 'bull', snout: true, eye: 0xff2a1a, weapon: 'axe' } },
      pets: [
        { n: 'Goblin', spec: { type: 'biped', body: 0x5a3b22, skin: 0x6aa84f, pointyEars: true, eye: 0xffee00, weapon: 'club', weaponColor: 0x7a5a3a } },
        { n: 'Dire Wolf', spec: { type: 'quad', body: 0x55555f, belly: 0x8a8a94, ears: true, eye: 0xffcc00, tail: 'long' } },
        { n: 'Thorn Boar', spec: { type: 'quad', body: 0x5a3b25, tusks: true, spikes: 0x2e4a1e, ears: true, eye: 0xff3300 } },
        { n: 'Griffin', spec: { type: 'quad', body: 0xb8863b, beak: true, headColor: 0xf4efe2, wings: 0x8a6233, eye: 0xffaa00, claws: true } },
        { n: 'Elder Treant', spec: { type: 'biped', bulky: true, body: 0x4a3320, skin: 0x5a3d24, leaves: 0x2f6a2a, eye: 0x9cff3c, claws: true } },
        { n: 'Shadow Unicorn', spec: { type: 'quad', body: 0x2a2238, mane: 0x8a3cff, horns: 'unicorn', hornColor: 0xd9b3ff, eye: 0xd27bff } },
      ] },
    { name: 'Hydra Lake', req: 25, base: 3, ground: 0x5f8f62, edge: 0x456e48, sky: 0x8fc4dc, deco: 'lake',
      guard: { n: 'The Lernaean Hydra', spec: { type: 'serpent', heads: 3, segs: 6, body: 0x2f6f5a, body2: 0x245a48, belly: 0xc9d98a, eye: 0xffe14a, spikes: 0x173a2e } },
      pets: [
        { n: 'Kelpie', spec: { type: 'quad', body: 0x2f5f6a, mane: 0x3a8a4a, eye: 0x66ffee } },
        { n: 'Naga', spec: { type: 'serpent', hood: 0x3a7a8a, body: 0x2a6a7a, belly: 0xe0e0a0, eye: 0xffff66 } },
        { n: 'Water Wisp', spec: { type: 'wisp', body: 0x3ab8ff, orbs: 0xaee8ff } },
        { n: 'Hippocampus', spec: { type: 'quad', body: 0x3a9aa8, mane: 0x1a6a8a, spikes: 0x88ddee, eye: 0xffffff, tail: 'long' } },
        { n: 'Lake Serpent', spec: { type: 'serpent', body: 0x1f5f70, body2: 0x18505e, spikes: 0x88ccdd, horns: 'demon', eye: 0x66ffcc } },
        { n: 'Twin Hydra', spec: { type: 'serpent', heads: 2, body: 0x3a2f6f, body2: 0x2a2258, belly: 0xd0c0ff, spikes: 0x8a6aff, eye: 0xff66ff } },
      ] },
    { name: 'Cursed Desert', req: 120, base: 9, ground: 0xd2ad66, edge: 0xb08a48, sky: 0xe8c890, deco: 'desert',
      guard: { n: 'The Manticore', spec: { type: 'quad', body: 0xc07a35, belly: 0xe0b070, mane: 0x6a2a10, wings: 0x7a3a20, tail: 'scorpion', sting: 0x9cff3c, eye: 0xff3300, claws: true } },
      pets: [
        { n: 'Scarab Golem', spec: { type: 'biped', bulky: true, body: 0x2a4a5a, cracks: 0x33ffdd, eye: 0x33ffdd } },
        { n: 'Anubis Jackal', spec: { type: 'biped', body: 0x1e1e26, armor: 0xd4a020, snout: true, ears: true, eye: 0xffd700, weapon: 'staff', weaponColor: 0x33ccff } },
        { n: 'Sand Wyrm', spec: { type: 'serpent', body: 0xb8904a, body2: 0xa07a3a, spikes: 0x6a4a2a, eye: 0xff5500 } },
        { n: 'Manticore Cub', spec: { type: 'quad', body: 0xc07a35, mane: 0x6a2a10, tail: 'scorpion', eye: 0xff3300 } },
        { n: 'Sphinx', spec: { type: 'quad', body: 0xd9b060, mane: 0x2a4a8a, wings: 0xc09040, eye: 0x33ccff, claws: true } },
        { n: 'Djinn', spec: { type: 'biped', float: true, glowBody: true, body: 0x2a6aff, skin: 0x4a8aff, crown: 0xffd700, eye: 0xffee66 } },
      ] },
    { name: 'Serpent Jungle', req: 450, base: 25, ground: 0x2f6a30, edge: 0x214f23, sky: 0x86b38a, deco: 'jungle',
      guard: { n: 'The Basilisk', spec: { type: 'serpent', segs: 8, body: 0x2a5a24, body2: 0x1f4a1c, belly: 0xd8cf6a, crest: 0xff3030, eye: 0xffe000, spikes: 0x153010, horns: 'demon', hornColor: 0x15200f } },
      pets: [
        { n: 'Chupacabra', spec: { type: 'quad', body: 0x5a6a5a, spikes: 0x2a3a2a, eye: 0xff2020, ears: true } },
        { n: 'Lizardman', spec: { type: 'biped', body: 0x3a6a2a, skin: 0x4a8a3a, snout: true, weapon: 'trident', eye: 0xffcc00 } },
        { n: 'Cockatrice', spec: { type: 'bird', body: 0x9a5a2a, wings: 0x6a3a1a, crest: 0xff3030, eye: 0xffee00 } },
        { n: 'Jaguar Spirit', spec: { type: 'quad', body: 0x1a2a2a, glowLines: 0x33ff99, eye: 0x33ff99, ears: true, tail: 'long' } },
        { n: 'Basilisk Hatchling', spec: { type: 'serpent', body: 0x3a7a2a, crest: 0xff3030, eye: 0xffe000 } },
        { n: 'Quetzalcoatl', spec: { type: 'serpent', body: 0x2ab87a, body2: 0xe0c030, wings: 0x2ab87a, wingGlow: true, crest: 0xff4466, eye: 0xffffff } },
      ] },
    { name: 'Frost Peaks', req: 1500, base: 70, ground: 0xe6eef6, edge: 0xb9cad9, sky: 0xcfe0f0, deco: 'snow',
      guard: { n: 'Ymir the Frost Giant', spec: { type: 'biped', bulky: true, body: 0x4a6a8a, skin: 0x9cc8ea, legs: 0x3a4a5a, armor: 0xd8ecff, horns: 'demon', hornColor: 0xe8f6ff, beard: 0xf0f8ff, eye: 0x55ddff, weapon: 'club', weaponColor: 0xa8e4ff } },
      pets: [
        { n: 'Ice Imp', spec: { type: 'biped', body: 0x6ab0e0, horns: 'demon', pointyEars: true, eye: 0xffffff } },
        { n: 'Frost Wolf', spec: { type: 'quad', body: 0xdde8f0, spikes: 0x9ad8ff, eye: 0x55ddff, ears: true, tail: 'long' } },
        { n: 'Yeti', spec: { type: 'biped', bulky: true, body: 0xf0f4f8, skin: 0xb0c4d0, eye: 0x55ddff, claws: true } },
        { n: 'Ice Wyvern', spec: { type: 'dragon', body: 0x8ac8f0, belly: 0xe0f4ff, wings: 0x5aa8e0, spikes: 0xffffff, horns: 'demon', eye: 0x33ffff } },
        { n: 'Frost Giant', spec: { type: 'biped', bulky: true, body: 0x3a5a7a, skin: 0x8ab8da, beard: 0xffffff, horns: 'ram', eye: 0x55ddff, weapon: 'club', weaponColor: 0xa8e4ff } },
        { n: 'Ice Phoenix', spec: { type: 'bird', body: 0x8ae0ff, wings: 0x55ccff, wingGlow: true, crest: 0xffffff, eye: 0xffffff } },
      ] },
    { name: 'Dragon Volcano', req: 5000, base: 200, ground: 0x3a2a26, edge: 0x241a17, sky: 0x5a2a20, deco: 'volcano',
      guard: { n: 'Ignis the Inferno Dragon', spec: { type: 'dragon', body: 0x7a1a10, body2: 0x5a120a, belly: 0xff8a2a, wings: 0x4a0f0a, spikes: 0x1e1210, horns: 'demon', hornColor: 0x1e1210, eye: 0xffd000 } },
      pets: [
        { n: 'Fire Imp', spec: { type: 'biped', body: 0xc02a10, horns: 'demon', hornColor: 0x2a1a10, eye: 0xffee00, claws: true } },
        { n: 'Hellhound', spec: { type: 'quad', body: 0x1a1414, spikes: 0xff4400, glowLines: 0xff5500, eye: 0xff3300, ears: true } },
        { n: 'Salamander', spec: { type: 'quad', low: true, long: 1.3, body: 0xe0501a, belly: 0xffb040, spikes: 0xffd000, tail: 'long', eye: 0xffff00 } },
        { n: 'Shiny', spec: { type: 'biped', bulky: true, model: 'shiny', body: 0xd8401a, skin: 0x3a6a66, cracks: 0xffd23f, eye: 0xffee00 } },
        { n: 'Chimera', spec: { type: 'quad', body: 0xb07a30, mane: 0x6a2a10, horns: 'ram', wings: 0x5a2a1a, tail: 'scorpion', eye: 0xff3300 } },
        { n: 'Inferno Wyrm', spec: { type: 'dragon', body: 0xa01a10, belly: 0xffb040, wings: 0xff5a00, wingGlow: true, spikes: 0xffd000, horns: 'demon', eye: 0xffff66 } },
      ] },
    { name: 'Kraken Abyss', req: 16000, base: 600, ground: 0x1e3a5a, edge: 0x142a44, sky: 0x0f2a48, deco: 'abyss',
      guard: { n: 'The Kraken', spec: { type: 'kraken', body: 0x6a1e4a, belly: 0xa04a7a, eye: 0x33ffcc, suckers: 0xff66cc } },
      pets: [
        { n: 'Siren', spec: { type: 'biped', float: true, glowBody: true, body: 0x1a8a8a, skin: 0x7ad8c8, crown: 0xff66ff, eye: 0xff66ff } },
        { n: 'Abyssal Eel', spec: { type: 'serpent', body: 0x0e1a2a, glowLines: 0x33ffff, eye: 0x33ffff } },
        { n: 'Kraken Spawn', spec: { type: 'kraken', body: 0x8a2a6a, eye: 0xffee55 } },
        { n: 'Sea Serpent', spec: { type: 'serpent', body: 0x1a5a7a, spikes: 0xff7744, horns: 'demon', eye: 0xffaa00 } },
        { n: 'Leviathan', spec: { type: 'serpent', segs: 9, body: 0x2a3a6a, body2: 0x1a2a5a, spikes: 0x66ccff, glowLines: 0x66ccff, eye: 0x66ffff } },
        { n: 'Abyssal Kraken', spec: { type: 'kraken', body: 0x2a1a4a, eye: 0xff3333, suckers: 0x33ffff } },
      ] },
    { name: 'Void Cosmos', req: 50000, base: 1800, ground: 0x1e1640, edge: 0x120d2a, sky: 0x0c0820, deco: 'cosmic',
      guard: { n: 'Astraeus the Void Dragon', spec: { type: 'dragon', body: 0x1e1640, body2: 0x2a1f5a, belly: 0x7a5cff, wings: 0x6a3cff, wingGlow: true, spikes: 0x33ffff, horns: 'demon', hornColor: 0xd0c0ff, eye: 0xff55ff, glowLines: 0x33ffff } },
      pets: [
        { n: 'Star Sprite', spec: { type: 'wisp', body: 0xffe066, orbs: 0xffffff } },
        { n: 'Moon Wolf', spec: { type: 'quad', body: 0xc8c8e8, glowLines: 0x9a9aff, eye: 0x9ad8ff, ears: true, tail: 'long' } },
        { n: 'Comet Griffin', spec: { type: 'quad', body: 0x3a3a8a, beak: true, headColor: 0xeeeeff, wings: 0x66aaff, wingGlow: true, eye: 0x66ffff, claws: true } },
        { n: 'Nebula Djinn', spec: { type: 'biped', float: true, glowBody: true, body: 0x8a3cff, skin: 0xb08aff, crown: 0x33ffff, eye: 0xffffff } },
        { n: 'Celestial Dragon', spec: { type: 'dragon', body: 0xe8e0ff, belly: 0xffd700, wings: 0xffd700, wingGlow: true, spikes: 0xffd700, horns: 'antler', hornColor: 0xffd700, eye: 0x33ffff } },
        { n: 'Cosmic Phoenix', spec: { type: 'bird', body: 0xff4fa0, wings: 0x9a4fff, wingGlow: true, crest: 0x33ffff, eye: 0xffffff } },
      ] },
    { name: 'Crystal Caverns', req: 160000, base: 5400, ground: 0x3a3452, edge: 0x28233c, sky: 0x4a3f6e, deco: 'crystal',
      guard: { n: 'Crystallos the Gem Colossus', spec: { type: 'biped', bulky: true, body: 0x5a3f8a, skin: 0x7a5ab0, legs: 0x3a2a5a, armor: 0xc8a8ff, cracks: 0xff66ee, horns: 'demon', hornColor: 0xff9af4, eye: 0xff66ee, claws: true, weapon: 'club', weaponColor: 0xd8b8ff } },
      pets: [
        { n: 'Shard Imp', spec: { type: 'biped', body: 0x9a6ae0, horns: 'demon', hornColor: 0xff9af4, pointyEars: true, eye: 0xffffff } },
        { n: 'Geode Tortoise', spec: { type: 'quad', low: true, body: 0x5a5070, belly: 0x8a7aa0, spikes: 0xff66ee, eye: 0xff9af4 } },
        { n: 'Prism Wisp', spec: { type: 'wisp', body: 0xff88ee, orbs: 0x9af4ff } },
        { n: 'Quartz Panther', spec: { type: 'quad', body: 0xe8e0ff, glowLines: 0xff66ee, ears: true, tail: 'long', eye: 0xff66ee } },
        { n: 'Diamond Golem', spec: { type: 'biped', bulky: true, body: 0x9ad8ff, skin: 0xc8f0ff, cracks: 0x66ffff, eye: 0x66ffff } },
        { n: 'Amethyst Wyrm', spec: { type: 'dragon', body: 0x8a4aff, belly: 0xe0c8ff, wings: 0xc08aff, wingGlow: true, spikes: 0xff9af4, horns: 'demon', hornColor: 0xffffff, eye: 0xffffff } },
      ] },
    { name: 'Storm Sky Isles', req: 520000, base: 16000, ground: 0xdfe8f2, edge: 0xb4c4d8, sky: 0x6f93c8, deco: 'sky',
      guard: { n: 'Zephyros the Thunderbird', spec: { type: 'bird', body: 0x24305a, belly: 0x4a5a8a, wings: 0x4a6aff, wingGlow: true, crest: 0xfff066, eye: 0xfff066, wingSpan: 3.4 } },
      pets: [
        { n: 'Cloud Sprite', spec: { type: 'wisp', body: 0xf4f8ff, orbs: 0x9ad8ff } },
        { n: 'Storm Hawk', spec: { type: 'bird', body: 0x5a6a8a, wings: 0x3a4a6a, crest: 0xfff066, eye: 0xfff066 } },
        { n: 'Thunder Ram', spec: { type: 'quad', body: 0xe8ecf4, belly: 0xffffff, horns: 'ram', hornColor: 0xfff066, glowLines: 0xfff066, eye: 0x66ccff } },
        { n: 'Pegasus', spec: { type: 'quad', body: 0xffffff, mane: 0x9ad8ff, wings: 0xf4f8ff, eye: 0x33ccff, tail: 'long' } },
        { n: 'Thunder', spec: { type: 'biped', bulky: true, model: 'thunder', body: 0x4a5260, skin: 0x5a6270, armor: 0x1a3a6a, eye: 0x66ffff } },
        { n: 'Roc', spec: { type: 'bird', body: 0x8a5a2a, belly: 0xe0c090, wings: 0x6a3a1a, crest: 0xff5a00, eye: 0xffaa00, wingSpan: 3.4 } },
      ] },
    { name: 'Mushroom Realm', req: 1.7e6, base: 48000, ground: 0x4a3a5c, edge: 0x342842, sky: 0x6a4a72, deco: 'fungal',
      guard: { n: 'Mycelos the Spore King', spec: { type: 'biped', bulky: true, body: 0x6a3a5a, skin: 0xc8a08a, legs: 0x4a2a3a, leaves: 0xff3a6a, crown: 0x9cff3c, eye: 0x9cff3c, claws: true, weapon: 'staff', weaponColor: 0x9cff3c } },
      pets: [
        { n: 'Sporeling', spec: { type: 'biped', body: 0xd8c0a0, skin: 0xe8d8c0, leaves: 0xff4a4a, eye: 0x222222 } },
        { n: 'Moss Hound', spec: { type: 'quad', body: 0x4a6a3a, belly: 0x8aa06a, spikes: 0x9cff3c, ears: true, eye: 0x9cff3c } },
        { n: 'Glowcap Wisp', spec: { type: 'wisp', body: 0x9cff3c, orbs: 0x33ffcc } },
        { n: 'Truffle Boar', spec: { type: 'quad', body: 0x5a3a2a, tusks: true, spikes: 0xff4a9a, ears: true, eye: 0xff4a9a } },
        { n: 'Myconid Elder', spec: { type: 'biped', bulky: true, body: 0x8a5a7a, skin: 0xd8b0c8, leaves: 0x9a4aff, beard: 0xe8d8f0, eye: 0x9cff3c } },
        { n: 'Fungal Hydra', spec: { type: 'serpent', heads: 3, body: 0x6a3a8a, body2: 0x5a2a7a, belly: 0xf0d0ff, crest: 0x9cff3c, spikes: 0xff66cc, eye: 0x9cff3c } },
      ] },
    { name: 'Mount Olympus', req: 5.5e6, base: 145000, ground: 0xe2dccb, edge: 0xbdb49c, sky: 0x9cc4f0, deco: 'olympus',
      guard: { n: 'Kronos the Titan', spec: { type: 'biped', bulky: true, body: 0xc8b890, skin: 0xd8c8a8, legs: 0x8a7a5a, armor: 0xffd23f, belt: 0x8a5a20, beard: 0xf4f4f4, crown: 0xffd23f, eye: 0xffd700, weapon: 'staff', weaponColor: 0xffd700 } },
      pets: [
        { n: 'Satyr', spec: { type: 'biped', body: 0x8a5a3a, skin: 0xd8a878, legs: 0x6a4a2a, horns: 'ram', hornColor: 0xe8d8b0, eye: 0x3a2a1a } },
        { n: 'Golden Hind', spec: { type: 'quad', body: 0xe8b84a, belly: 0xfff0c0, horns: 'antler', hornColor: 0xffd700, ears: true, eye: 0x222222 } },
        { n: 'Nemean Lion', spec: { type: 'quad', body: 0xd8a040, mane: 0xa86a20, claws: true, ears: true, tail: 'long', eye: 0xffd700 } },
        { n: 'Bronze Talos', spec: { type: 'biped', bulky: true, body: 0xb07a3a, skin: 0xc89050, armor: 0xffd23f, eye: 0xff6a00, weapon: 'trident', weaponColor: 0xffd23f } },
        { n: 'Cyclops', spec: { type: 'biped', bulky: true, body: 0x7a6a5a, skin: 0xc8a888, horns: 'demon', hornColor: 0xe8d8b0, beard: 0x5a4a3a, eye: 0xff3300, weapon: 'club' } },
        { n: 'Golden Pegasus', spec: { type: 'quad', body: 0xfff0c0, mane: 0xffd700, wings: 0xffd700, wingGlow: true, horns: 'unicorn', hornColor: 0xffd700, eye: 0x33ccff, tail: 'long' } },
      ] },
    { name: 'The Underworld', req: 1.8e7, base: 430000, ground: 0x2c2228, edge: 0x1a1218, sky: 0x2a1018, deco: 'underworld',
      guard: { n: 'Cerberus the Hound of Hades', spec: { type: 'quad', heads: 3, long: 1.2, body: 0x1e1616, belly: 0x3a2a2a, spikes: 0x66ff99, glowLines: 0x66ff99, horns: 'demon', hornColor: 0x0e0a0a, ears: true, eye: 0x66ff99, claws: true, tail: 'long' } },
      pets: [
        { n: 'Bone Imp', spec: { type: 'biped', body: 0xe8e0c8, skin: 0xd8d0b8, horns: 'demon', hornColor: 0x3a2a2a, eye: 0x66ff99 } },
        { n: 'Shade Hound', spec: { type: 'quad', body: 0x2a2a3a, glowLines: 0x66ff99, ears: true, tail: 'long', eye: 0x66ff99 } },
        { n: 'Lost Soul', spec: { type: 'wisp', body: 0x66ff99, orbs: 0xc8ffe0 } },
        { n: 'Styx Serpent', spec: { type: 'serpent', body: 0x1a3a3a, body2: 0x12302e, belly: 0x66ff99, glowLines: 0x66ff99, horns: 'demon', eye: 0x66ff99 } },
        { n: 'Charon the Ferryman', spec: { type: 'biped', float: true, glowBody: true, body: 0x1a1a24, skin: 0xd8d0c0, hood: 0x2a2a38, eye: 0x66ff99, weapon: 'staff', weaponColor: 0x66ff99 } },
        { n: 'Hades Drake', spec: { type: 'dragon', body: 0x2a1a2a, belly: 0x66ff99, wings: 0x3a1a3a, spikes: 0x66ff99, glowLines: 0x66ff99, horns: 'demon', hornColor: 0x111111, eye: 0x66ff99 } },
      ] },
    { name: 'Fae Wilds', req: 6e7, base: 1.3e6, ground: 0x62b884, edge: 0x449064, sky: 0xe8b0dc, deco: 'fairy',
      guard: { n: 'Titania the Fae Queen', spec: { type: 'biped', float: true, glowBody: true, body: 0x9a4aff, skin: 0xffd8f0, wings: 0xff9ae0, wingGlow: true, crown: 0xffe066, eye: 0xff66cc, weapon: 'staff', weaponColor: 0xff66cc, wingSpan: 3.6 } },
      pets: [
        { n: 'Pixie', spec: { type: 'biped', float: true, body: 0x6ad87a, skin: 0xffe0c8, wings: 0xc8fff0, wingGlow: true, pointyEars: true, eye: 0x33ffcc, wingSpan: 2 } },
        { n: 'Moonlit Fox', spec: { type: 'quad', body: 0xf0e0ff, belly: 0xffffff, ears: true, tail: 'long', glowLines: 0xff9ae0, eye: 0xff66cc } },
        { n: 'Firefly Swarm', spec: { type: 'wisp', body: 0xffe066, orbs: 0x9cff3c } },
        { n: 'Dryad', spec: { type: 'biped', body: 0x6a8a3a, skin: 0x9ac87a, leaves: 0xff9ae0, eye: 0xffe066, pointyEars: true } },
        { n: 'Faerie Dragon', spec: { type: 'dragon', body: 0x8ae0ff, belly: 0xffd8f0, wings: 0xff9ae0, wingGlow: true, spikes: 0xffe066, horns: 'antler', hornColor: 0xffe066, eye: 0xffffff } },
        { n: 'Moon Unicorn', spec: { type: 'quad', body: 0xf4f0ff, mane: 0xff9ae0, horns: 'unicorn', hornColor: 0xfff2a8, eye: 0x9a4aff, tail: 'long' } },
      ] },
    { name: 'Shadow Realm', req: 2e8, base: 3.9e6, ground: 0x18141f, edge: 0x0c0a12, sky: 0x100a18, deco: 'shadow',
      guard: { n: 'Nyx the Shadow Wyrm', spec: { type: 'dragon', body: 0x120e1a, body2: 0x1e1630, belly: 0x5a1a8a, wings: 0x2a0a4a, wingGlow: true, spikes: 0xb000ff, horns: 'demon', hornColor: 0x05030a, glowLines: 0xb000ff, eye: 0xff2aff } },
      pets: [
        { n: 'Shadow Imp', spec: { type: 'biped', body: 0x1a1428, horns: 'demon', hornColor: 0xb000ff, pointyEars: true, eye: 0xff2aff } },
        { n: 'Night Stalker', spec: { type: 'quad', body: 0x14101c, glowLines: 0xb000ff, spikes: 0x5a1a8a, ears: true, tail: 'long', eye: 0xff2aff } },
        { n: 'Void Wisp', spec: { type: 'wisp', body: 0xb000ff, orbs: 0x220033 } },
        { n: 'Nightmare Steed', spec: { type: 'quad', body: 0x0e0a14, mane: 0xb000ff, horns: 'demon', hornColor: 0xb000ff, eye: 0xff2a2a, tail: 'long' } },
        { n: 'Umbral Serpent', spec: { type: 'serpent', segs: 8, body: 0x1a1428, body2: 0x120e1a, glowLines: 0xb000ff, spikes: 0xb000ff, horns: 'demon', eye: 0xff2aff } },
        { n: 'Eclipse Dragon', spec: { type: 'dragon', body: 0x1e1630, belly: 0xff8a00, wings: 0xff6a00, wingGlow: true, spikes: 0xffd000, horns: 'demon', hornColor: 0x05030a, eye: 0xffd000 } },
      ] },
    { name: 'Elysium Heavens', req: 6.5e8, base: 1.2e7, ground: 0xfff4d8, edge: 0xe8d6a0, sky: 0xffe8b0, deco: 'heaven',
      guard: { n: 'Solarion the Seraph', spec: { type: 'biped', float: true, glowBody: true, bulky: true, body: 0xfff4d0, skin: 0xffe8c0, armor: 0xffd23f, wings: 0xffffff, wingGlow: true, crown: 0xffd700, eye: 0xffd700, weapon: 'staff', weaponColor: 0xffd700, wingSpan: 4 } },
      pets: [
        { n: 'Cherub', spec: { type: 'biped', float: true, body: 0xfff0e0, skin: 0xffe0c8, wings: 0xffffff, crown: 0xffd700, eye: 0x33ccff, wingSpan: 2 } },
        { n: 'Halo Hound', spec: { type: 'quad', body: 0xfff8f0, belly: 0xffffff, mane: 0xffd700, ears: true, tail: 'long', eye: 0x33ccff } },
        { n: 'Light Wisp', spec: { type: 'wisp', body: 0xfff2a8, orbs: 0xffffff } },
        { n: 'Sun Lion', spec: { type: 'quad', body: 0xffd860, mane: 0xff9a00, wings: 0xfff2a8, wingGlow: true, claws: true, eye: 0xffffff, tail: 'long' } },
        { n: 'Throne Guardian', spec: { type: 'biped', bulky: true, body: 0xffffff, skin: 0xfff4e0, armor: 0xffd23f, wings: 0xfff2a8, wingGlow: true, eye: 0x33ccff, weapon: 'trident', weaponColor: 0xffd700 } },
        { n: 'Radiant Phoenix', spec: { type: 'bird', body: 0xfff4d0, wings: 0xffd23f, wingGlow: true, crest: 0xffffff, eye: 0x33ccff, wingSpan: 3.2 } },
      ] },
    // The final level. Its boss and its Divine are imported models (assets/models.js).
    { name: 'Bloom Cherry Blossom', req: 2.1e9, base: 3.6e7, ground: 0x9fcf8c, edge: 0x76a866, sky: 0xffd3e4, deco: 'blossom', final: true,
      guard: { n: 'Bloom', spec: { type: 'biped', model: 'bloom', body: 0xe8d8c0, skin: 0xe8d8c0, horns: 'demon', hornColor: 0x3a1010, pointyEars: true, eye: 0xff2a4a } },
      pets: [
        { n: 'Petal Sprite', spec: { type: 'wisp', body: 0xffb7d5, orbs: 0xffffff } },
        { n: 'Blossom Tanuki', spec: { type: 'quad', body: 0x8a6a4a, belly: 0xe8d8c0, ears: true, tail: 'long', eye: 0x222222 } },
        { n: 'Koi Serpent', spec: { type: 'serpent', body: 0xff7a2a, body2: 0xffffff, belly: 0xffe8d8, spikes: 0xff3a3a, eye: 0x222222 } },
        { n: 'Sakura Fox', spec: { type: 'quad', body: 0xffc8dc, belly: 0xffffff, ears: true, tail: 'long', glowLines: 0xff6aa0, eye: 0xff3a7a } },
        { n: 'Tengu', spec: { type: 'biped', body: 0x2a2a3a, skin: 0xd8303a, wings: 0x2a2a3a, snout: true, eye: 0xffd23f, weapon: 'staff', weaponColor: 0xff9ac8, wingSpan: 2.6 } },
        { n: 'Sakura Dragon', spec: { type: 'dragon', body: 0xffc0d8, belly: 0xffffff, wings: 0xff8ab8, wingGlow: true, spikes: 0xff4a8a, horns: 'antler', hornColor: 0x6a3a2a, eye: 0xff2a6a } },
      ] },
  ];
  // One divine creature per zone (rarity 6).
  [
    { n: 'Celestial Stag', spec: { type: 'quad', body: 0xfff8e6, belly: 0xffffff, mane: 0xffd700, horns: 'antler', hornColor: 0xffd700, eye: 0x33ffff } },
    { n: 'Seraph Swan', spec: { type: 'bird', body: 0xffffff, wings: 0xffe680, wingGlow: true, crest: 0xffd700, eye: 0x33ccff } },
    { n: 'Sun Sphinx', spec: { type: 'sunsphinx', model: 'sunsphinx', body: 0xf6c443, arms: 0xf0a818, hair: 0xf8d887, membrane: 0xfffdf4, eye: 0x5ee8ff } },
    { n: 'Jade Dragon King', spec: { type: 'dragon', body: 0x3cffb0, belly: 0xfff1a8, wings: 0xffd700, wingGlow: true, spikes: 0xffd700, horns: 'antler', hornColor: 0xffd700, eye: 0xffffff } },
    { n: 'Aurora Wolf', spec: { type: 'quad', body: 0xe8f6ff, belly: 0xffffff, mane: 0x7dffea, ears: true, tail: 'long', eye: 0xff66ff } },
    { n: 'Sovereign Phoenix', spec: { type: 'bird', body: 0xffd23f, wings: 0xff5a00, wingGlow: true, crest: 0xffffff, eye: 0xffffff } },
    { n: 'Pearl Kraken', spec: { type: 'kraken', body: 0xf4e8ff, suckers: 0xffd700, eye: 0x33ffff } },
    { n: 'Archangel', spec: { type: 'biped', float: true, glowBody: true, body: 0xffffff, skin: 0xfff1d0, wings: 0xffffff, wingGlow: true, crown: 0xffd700, eye: 0x33ffff, weapon: 'staff', weaponColor: 0xffd700 } },
    { n: 'Prismatic Dragon', spec: { type: 'dragon', body: 0xffffff, belly: 0xffe8ff, wings: 0xff9af4, wingGlow: true, spikes: 0x9af4ff, horns: 'antler', hornColor: 0xffd700, glowLines: 0x9af4ff, eye: 0xff66ee } },
    { n: 'Storm Sovereign', spec: { type: 'quad', body: 0xffffff, mane: 0xfff066, wings: 0xfff2a8, wingGlow: true, horns: 'unicorn', hornColor: 0xfff066, glowLines: 0x66ccff, eye: 0x66ccff, tail: 'long' } },
    { n: 'Elder Mycelium', spec: { type: 'serpent', heads: 3, body: 0xf0e0ff, body2: 0xe0c8ff, belly: 0xffffff, crest: 0xffd700, spikes: 0x9cff3c, glowLines: 0x9cff3c, eye: 0xffffff } },
    { n: 'Zeus Eagle', spec: { type: 'bird', body: 0xffffff, belly: 0xfff2a8, wings: 0xffd700, wingGlow: true, crest: 0x66ccff, eye: 0x66ccff, wingSpan: 3.4 } },
    { n: 'Soul Phoenix', spec: { type: 'bird', body: 0xc8ffe0, wings: 0x66ff99, wingGlow: true, crest: 0xffffff, eye: 0xffffff, wingSpan: 3.2 } },
    { n: 'Oberon the Fae King', spec: { type: 'biped', float: true, glowBody: true, body: 0xfff4ff, skin: 0xffe8f4, wings: 0xff9ae0, wingGlow: true, crown: 0xffe066, eye: 0x33ffcc, weapon: 'staff', weaponColor: 0xffe066, wingSpan: 3.4 } },
    { n: 'Moonlight Wyrm', spec: { type: 'dragon', body: 0xe8e0ff, belly: 0xffffff, wings: 0xc8b0ff, wingGlow: true, spikes: 0xffffff, horns: 'antler', hornColor: 0xd0c0ff, glowLines: 0xb000ff, eye: 0xff2aff } },
    { n: 'Cheese', spec: { type: 'quad', model: 'cheese', body: 0xf6d000, belly: 0x6a7aff, ears: true, tail: 'long', eye: 0x222222 } },
    { n: 'The Eternal One', spec: { type: 'biped', float: true, glowBody: true, bulky: true, body: 0xffffff, skin: 0xfff8e0, armor: 0xffd700, wings: 0xffd700, wingGlow: true, crown: 0xffffff, eye: 0x33ffff, weapon: 'staff', weaponColor: 0xffffff, wingSpan: 4.2 } },
  ].forEach((d, z) => ZONES[z].pets.push(d));
  const WORLD_W = GARDEN_W + ZONES.length * ZONE_W;
  const zoneX = (z) => GARDEN_W + z * ZONE_W;
  const zoneAt = (x) => (x < GARDEN_W ? -1 : Math.min(ZONES.length - 1, Math.floor((x - GARDEN_W) / ZONE_W)));

  const income = (z, r) => ZONES[z].base * RARITIES[r].mult;
  const difficulty = (z, r) => (r === DIVINE ? 10 : Math.min(10, 1 + Math.round(((z + r) * 9) / (ZONES.length + 4))));
  // Speed points -> run speed (px/s). Steeper than before so training is something you can feel.
  const moveSpeed = (s) => 160 + 75 * Math.log10(1 + s);
  // Trails (from the original): bought at the TRAILS SHOP circle in your base, each one multiplies your
  // run speed and only the equipped one counts. The original goes up to x14; it's compressed here so
  // guardians stay a threat, and deeper guardians are tuned assuming you've bought a trail or two.
  const TRAILS = [
    { n: 'Gray Trail', rar: 'Common', col: '#d9d4c7', mult: 1.15, cost: 150, c: [0xf0f0f0, 0x8a8a8a] },
    { n: 'Green Trail', rar: 'Uncommon', col: '#5fd35f', mult: 1.3, cost: 2500, c: [0x9dffaa, 0x1f9a3a] },
    { n: 'Blue Trail', rar: 'Rare', col: '#4aa3ff', mult: 1.45, cost: 25000, c: [0x9ad8ff, 0x1a4aff] },
    { n: 'Purple Trail', rar: 'Epic', col: '#b46cff', mult: 1.6, cost: 200000, c: [0xe6bbff, 0x7a2fe0] },
    { n: 'Golden Trail', rar: 'Legendary', col: '#ffb52e', mult: 1.75, cost: 1.5e6, c: [0xfff4b0, 0xffa000] },
    { n: 'Red Trail', rar: 'Mythic', col: '#ff3d7f', mult: 1.9, cost: 1.2e7, c: [0xffa0a0, 0xd00020] },
    { n: 'Galaxy Trail', rar: 'Legendary', col: '#9a7bff', mult: 2.1, cost: 1e8, c: [0x33ffff, 0x7a3cff, 0xff55ff], sparkle: true },
    { n: 'Secret Trail', rar: 'Secret', col: '#ff4a6a', mult: 2.35, cost: 8e8, c: [0xffffff, 0xff1a4a, 0x8a0030], sparkle: true },
    { n: 'Eternal Trail', rar: 'Eternal', col: '#7dffff', mult: 2.6, cost: 4e9, c: [0xffffff, 0x66ffff, 0x3a6aff], sparkle: true },
    { n: 'Divine Trail', rar: 'Divine', col: '#fff2a8', mult: 2.9, cost: 2e10, c: [0xffffff, 0xfff0a0, 0xffa000], sparkle: true },
    // Beyond the original's list, for the deeper zones added later.
    { n: 'Rainbow Trail', rar: 'Celestial', col: '#ff9af4', mult: 3.15, cost: 1.2e11, c: [0xff4a4a, 0xffd23f, 0x4aff7a, 0x4aa3ff, 0xb46cff], sparkle: true },
    { n: 'Void Trail', rar: 'Celestial', col: '#b000ff', mult: 3.4, cost: 8e11, c: [0xffffff, 0xb000ff, 0x1a0030], sparkle: true },
    { n: 'Omega Trail', rar: 'Omega', col: '#ffffff', mult: 3.7, cost: 6e12, c: [0xffffff, 0x33ffff, 0xffd700, 0xff2aff], sparkle: true },
  ];
  const trailMult = () => (S.trail >= 0 ? TRAILS[S.trail].mult : 1);
  const runSpeed = () => moveSpeed(S.speed) * trailMult();
  // Guardians run a little faster than the speed their zone requires, more so in deeper zones.
  // Past the Void Cosmos the gap keeps growing slowly, so the late trails stay worth buying.
  const guardSpeed = (z) => moveSpeed(ZONES[z].req) * (z <= 7 ? (1 + 0.015 * z) * (1 + 0.08 * z) : 1.724 + 0.13 * (z - 7));
  const treadGain = (lvl) => Math.round(1.75 ** (lvl - 1) * 10) / 10;
  const treadCost = (lvl) => Math.round(25 * 2.4 ** (lvl - 1));
  const slotCost = (n) => Math.round(80 * 3 ** (n - START_SLOTS));

  function rollRarity(z) {
    const base = [60, 25, 10, 4, 1, 0.3];
    const zf = Math.min(z, 7) + 0.3 * Math.max(0, z - 7);
    const w = base.map((b, r) => b * (1 + 0.45 * zf) ** r);
    let t = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let r = 0; r < w.length; r++) if ((t -= w[r]) <= 0) return r;
    return 0;
  }
  // Eggs deeper in a zone (and in the lair) roll rarer.
  const rollEgg = (p) => Math.min(5, rollRarity(p.zone) + [Math.random() < 0.2 ? 1 : 0, Math.random() < 0.5 ? 1 : 0, 1, 2][p.tier]);
  // Short number names (Roblox style): 1.25K, 3.4M, 12B, 7.5T, 1.2Qa … then 1.23e45 beyond decillions.
  const SUFFIX = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    n = Math.floor(n);
    if (n < 1000) return String(n);
    let e = Math.floor(Math.log10(n) / 3);
    if (e > SUFFIX.length) return n.toExponential(2).replace('e+', 'e');
    let v = n / 1000 ** e;
    if (v < 1) { e--; v *= 1000; } else if (v >= 1000) { e++; v /= 1000; }
    // truncate (not round) so 999.99K never shows as "1000K"
    const s = v < 10 ? (Math.floor(v * 100) / 100).toFixed(2) : v < 100 ? (Math.floor(v * 10) / 10).toFixed(1) : String(Math.floor(v));
    return s + SUFFIX[e - 1];
  }
  // Like fmt() but keeps one decimal for small values (speed per second, etc.).
  const fmtD = (n) => (n < 100 ? String(Math.round(n * 10) / 10) : fmt(n));

  // ---------------- Persistent state ----------------
  const SAVE_KEY = 'stealAnEggMath_v1';
  // Day/night: like the original's reset cycle. Night restocks every egg, speeds up hatching
  // and is the only time Divine eggs can spawn.
  const DAY_LEN = 240, NIGHT_LEN = 60, CYCLE = DAY_LEN + NIGHT_LEN, NIGHT_HATCH = 3;
  const fresh = () => ({
    clock: 0, nights: 0,
    level: null, money: 0, speed: 0, treadLvl: 1, slotsUnlocked: START_SLOTS,
    slots: Array(MAX_SLOTS).fill(null), discovered: {}, streak: 0, trails: [], trail: -1, character: 'classic',
    stats: { correct: 0, wrong: 0, best: 0 },
  });
  let S = fresh();
  let hasSave = false;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { S = loadSave(JSON.parse(raw)); hasSave = S.level !== null; }
  } catch (e) { /* storage unavailable or corrupt save */ }
  // Rebuild the save field by field with type and range checks, so a corrupted or hand-edited
  // save can't inject markup into the UI, pollute prototypes or crash the game.
  function loadSave(d) {
    const out = fresh();
    if (!d || typeof d !== 'object') return out;
    const num = (v, lo, hi, def) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
    const int = (v, lo, hi, def) => Math.round(num(v, lo, hi, def));
    out.level = Number.isInteger(d.level) && d.level >= 0 && d.level < MathGen.LEVELS.length ? d.level : null;
    out.money = num(d.money, 0, 1e300, 0);
    out.speed = num(d.speed, 0, 1e300, 0);
    out.treadLvl = int(d.treadLvl, 1, 100, 1);
    out.slotsUnlocked = int(d.slotsUnlocked, START_SLOTS, MAX_SLOTS, START_SLOTS);
    out.streak = int(d.streak, 0, 1e9, 0);
    out.clock = num(d.clock, 0, CYCLE - 0.001, 0);
    out.nights = int(d.nights, 0, 1e9, 0);
    if (Array.isArray(d.trails)) out.trails = [...new Set(d.trails.filter((i) => Number.isInteger(i) && i >= 0 && i < TRAILS.length))].sort((a, b) => a - b);
    out.trail = Number.isInteger(d.trail) && out.trails.includes(d.trail) ? d.trail : -1;
    out.character = CHARACTERS.some((c) => c.id === d.character) ? d.character : 'classic';
    const st = d.stats && typeof d.stats === 'object' ? d.stats : {};
    out.stats = { correct: int(st.correct, 0, 1e9, 0), wrong: int(st.wrong, 0, 1e9, 0), best: int(st.best, 0, 1e9, 0) };
    if (d.discovered && typeof d.discovered === 'object') {
      for (const k of Object.keys(d.discovered)) {
        const m = /^(\d+):(\d+)$/.exec(k);
        if (m && +m[1] < ZONES.length && +m[2] < RARITIES.length && d.discovered[k] === true) out.discovered[k] = true;
      }
    }
    if (Array.isArray(d.slots)) {
      for (let i = 0; i < MAX_SLOTS; i++) {
        const s = d.slots[i];
        if (s && Number.isInteger(s.zone) && s.zone >= 0 && s.zone < ZONES.length && Number.isInteger(s.rarity) && s.rarity >= 0 && s.rarity < RARITIES.length) {
          out.slots[i] = { zone: s.zone, rarity: s.rarity, hatch: num(s.hatch, 0, 3600, 0) };
        }
      }
    }
    return out;
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  // ---------------- Three.js scene ----------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fb5c9);
  scene.fog = new THREE.Fog(0x8fb5c9, 60, 150);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 220);
  const hemi = new THREE.HemisphereLight(0xeaf4ff, 0x4a5a40, 0.75);
  const sun = new THREE.DirectionalLight(0xfff4e0, 0.85);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 });
  sun.shadow.bias = -0.0006;
  scene.add(hemi, sun, sun.target);
  // Night extras: a lantern glow around the player, stars and a moon that follow the camera.
  let nightK = 0;
  const lantern = new THREE.PointLight(0xffd9a0, 0, 38, 1.4); scene.add(lantern);
  const starField = (() => {
    const n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = 0.08 + Math.random() * 1.3, r = 190;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * r; pos[i * 3 + 1] = Math.sin(e) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    pts.visible = false; scene.add(pts); return pts;
  })();
  const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf4f1d8, fog: false }));
  moon.visible = false; scene.add(moon);

  const { mat, glow, boxG } = Models;
  function part(parent, w, h, d, material, x, y, z, opts = {}) {
    const m = new THREE.Mesh(opts.geo || boxG(w, h, d), material);
    m.position.set(x, y, z);
    if (opts.ry) m.rotation.y = opts.ry;
    if (opts.rx) m.rotation.x = opts.rx;
    if (opts.rz) m.rotation.z = opts.rz;
    m.castShadow = opts.shadow !== false; m.receiveShadow = true;
    parent.add(m); return m;
  }
  function mesh(parent, geo, material, x, y, z) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  }

  // Roblox-style studded baseplate texture.
  const studImg = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#ededed'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#c9c9c9'; g.beginPath(); g.arc(32, 35, 17, 0, 7); g.fill();
    g.fillStyle = '#f7f7f7'; g.beginPath(); g.arc(32, 31, 15, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 2; g.strokeRect(0, 0, 64, 64);
    return c;
  })();
  function studMat(color, rx, ry) {
    const tex = new THREE.CanvasTexture(studImg);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(rx, ry);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return new THREE.MeshLambertMaterial({ color, map: tex });
  }

  // Billboard text labels (like Roblox BillboardGui).
  function makeLabel(text, o = {}) {
    const c = document.createElement('canvas');
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: o.depthTest ?? true, depthWrite: false }));
    sp.renderOrder = 10;
    sp.userData = { c, tex, text: null, o: Object.assign({ size: 56, color: '#ffffff', h: 1.2, bg: null }, o) };
    setLabel(sp, text);
    return sp;
  }
  function setLabel(sp, text) {
    const d = sp.userData;
    if (d.text === text) return;
    d.text = text;
    const { c, o } = d, g = c.getContext('2d');
    const lines = String(text).split('\n');
    const font = `900 ${o.size}px "Arial Black","Segoe UI",Arial,sans-serif`;
    g.font = font;
    const w = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width))) + o.size * 0.8;
    const lh = o.size * 1.18, h = Math.ceil(lh * lines.length + o.size * 0.35);
    if (c.width !== w || c.height !== h) {
      // WebGL textures can't be resized in place, so swap in a fresh one.
      c.width = w; c.height = h;
      d.tex.dispose(); d.tex = new THREE.CanvasTexture(c); d.tex.minFilter = THREE.LinearFilter;
      sp.material.map = d.tex; sp.material.needsUpdate = true;
    }
    g.clearRect(0, 0, w, h);
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (o.bg) { g.fillStyle = o.bg; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, o.size * 0.3); g.fill(); }
    lines.forEach((l, i) => {
      const y = o.size * 0.18 + lh * (i + 0.5);
      g.lineWidth = o.size * 0.16; g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineJoin = 'round';
      g.strokeText(l, w / 2, y);
      g.fillStyle = i === 0 ? o.color : (o.color2 || o.color); g.fillText(l, w / 2, y);
    });
    d.tex.needsUpdate = true;
    const hh = o.h * lines.length;
    sp.scale.set((hh * w) / h, hh, 1);
  }

  // ---------------- World building ----------------
  function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  const animProps = [];
  const DEPTH = WORLD_H * U;
  let onTread = false;

  // ---------------- Zone layouts (px) ----------------
  const THEMES = {
    forest: { stone: 0x6a6f66, moss: 0x3f6a34, torch: 0xff8a2a },
    lake: { stone: 0x7d8b92, moss: 0x4a8a5a, torch: 0x33ccff },
    desert: { stone: 0xc9a66b, moss: 0xa8834a, torch: 0xffb52e },
    jungle: { stone: 0x5f6f58, moss: 0x2f7a34, torch: 0x7dff4a },
    snow: { stone: 0x9fd2ee, moss: 0xffffff, torch: 0x9ee6ff },
    volcano: { stone: 0x2a2226, moss: 0x4a2a20, torch: 0xff5a00 },
    abyss: { stone: 0x3a4a6a, moss: 0xff5c9a, torch: 0x33ffcc },
    cosmic: { stone: 0x4a3a7a, moss: 0x33ffff, torch: 0xb46cff },
    crystal: { stone: 0x4a4266, moss: 0xb85ad0, torch: 0xff66ee },
    sky: { stone: 0xe8ecf4, moss: 0xffffff, torch: 0xfff066 },
    fungal: { stone: 0x6a5a6a, moss: 0x5a8a34, torch: 0x9cff3c },
    olympus: { stone: 0xf2eee2, moss: 0x8a9a5a, torch: 0xffb52e },
    underworld: { stone: 0x3a3038, moss: 0x2f8a5a, torch: 0x66ff99 },
    fairy: { stone: 0xd8c8f0, moss: 0xff9ae0, torch: 0xffe066 },
    shadow: { stone: 0x241e30, moss: 0x5a1a8a, torch: 0xb000ff },
    heaven: { stone: 0xffffff, moss: 0xffe9a8, torch: 0xfff2a8 },
    blossom: { stone: 0xe6d8cc, moss: 0xffa8cc, torch: 0xff6aa0 },
  };
  // Themes whose wall moss glows in the dark.
  const GLOW_MOSS = new Set(['volcano', 'cosmic', 'abyss', 'underworld']);
  // Circle colliders (px), bucketed along x so lookups stay cheap.
  const colliders = new Map(), CB = 400;
  function addCollider(x, y, r, soft = false) { const k = Math.floor(x / CB); if (!colliders.has(k)) colliders.set(k, []); colliders.get(k).push({ x, y, r, soft }); }
  function forNear(x, f) { const k = Math.floor(x / CB); for (let i = k - 1; i <= k + 1; i++) { const a = colliders.get(i); if (a) for (const c of a) f(c); } }
  function pushOut(o, r, ignoreSoft = false) {
    forNear(o.x, (c) => {
      if (ignoreSoft && c.soft) return;
      const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy), m = c.r + r;
      if (d >= m) return;
      if (d < 0.01) { o.x -= m; return; }
      o.x = c.x + (dx / d) * m; o.y = c.y + (dy / d) * m;
    });
  }
  const pads = [];
  const LAIR_R = 210, G_R = 36;
  const segDist = (x, y, a, b) => {
    const sx = b.x - a.x, sy = b.y - a.y, t = Math.max(0, Math.min(1, ((x - a.x) * sx + (y - a.y) * sy) / (sx * sx + sy * sy || 1)));
    return Math.hypot(a.x + sx * t - x, a.y + sy * t - y);
  };
  const LAYOUTS = ZONES.map((Z, z) => {
    const rnd = seeded(z * 7919 + 101), flip = z % 2 ? -1 : 1, x0 = zoneX(z), mid = WORLD_H / 2;
    const Y = (y) => mid + flip * (y - mid), j = (n) => (rnd() - 0.5) * n;
    const P = (dx, dy) => ({ x: x0 + dx, y: Y(dy) });
    const lair = P(1540, 700);
    const peds = [[330 + j(80), 330 + j(100), 0], [380 + j(80), 1070 + j(100), 0], [860 + j(60), 220 + j(60), 1], [880 + j(60), 1180 + j(60), 1],
      [1250 + j(40), 700 + j(220), 2], [1590, 700, 3]].map(([dx, dy, tier]) => ({ ...P(dx, dy), tier }));
    const wA = 620 + j(60), wB = 1080 + j(60);
    const walls = [[wA, 130, 560], [wA, 840, 1270], [wB, 380 + j(60), 1020 + j(60)]]
      .map(([x, a, b]) => ({ x: x0 + x, y0: Math.min(Y(a), Y(b)), y1: Math.max(Y(a), Y(b)) }));
    const path = [[0, 700], [wA, 700], [wA + 200, 700], [wB - 140, 250], [wB + 140, 250], [1330, 700], [1540 - LAIR_R, 700]].map(([dx, dy]) => P(dx, dy));
    const home = P(1420, 700);
    const way = [home, P(1250, 250), P(860, 250), P(wA, 700), P(330, 470), P(200, 700), P(380, 940), P(wA, 700), P(860, 1150), P(1250, 1150)];
    const padsZ = [P(170, 560), P(170, 840), P(wA + 140, 760), P(wB + 150, 1180)].map((q) => ({ ...q, zone: z }));
    pads.push(...padsZ);
    // Is a spot clear for scenery (keeps paths, eggs and the lair open)?
    const free = (x, y, m) => !peds.some((o) => Math.hypot(o.x - x, o.y - y) < 110 + m) && Math.hypot(lair.x - x, lair.y - y) > LAIR_R + 60 + m &&
      !walls.some((w) => Math.abs(w.x - x) < 50 + m && y > w.y0 - 50 - m && y < w.y1 + 50 + m) && !padsZ.some((o) => Math.hypot(o.x - x, o.y - y) < 70 + m) &&
      !path.some((a, i) => i && segDist(x, y, path[i - 1], a) < 70 + m) &&
      !way.some((a, i) => i && segDist(x, y, way[i - 1], a) < 45 + m);
    return { rnd, x0, peds, walls, path, lair, home, way, pads: padsZ, free };
  });

  // Void floor beneath everything
  part(scene, WORLD_W * U + 400, 1, 400, new THREE.MeshLambertMaterial({ color: 0x23302a }), WORLD_W * U / 2, -8, DEPTH / 2, { shadow: false });

  function buildGarden() {
    const g = new THREE.Group(); scene.add(g);
    const W = GARDEN_W * U;
    part(g, W, 1, DEPTH, studMat(0x6fae4a, W / 2, DEPTH / 2), W / 2, -0.5, DEPTH / 2, { shadow: false });
    part(g, (GARDEN_W - 1300) * U, 0.1, 90 * U, studMat(0xb59a6a, 6, 2), (1300 + (GARDEN_W - 1300) / 2) * U, 0.05, SPAWN.y * U, { shadow: false });
    const wall = mat(0x5a6470);
    part(g, W, 3, 1, wall, W / 2, 1.5, -0.5);
    part(g, W, 1.5, 1, wall, W / 2, 0.75, DEPTH + 0.5);
    part(g, 1, 3, DEPTH, wall, -0.5, 1.5, DEPTH / 2);
    // fence along the exit, with a gap for the path
    const gap0 = SPAWN.y - 60, gap1 = SPAWN.y + 60;
    for (let y = 10; y < WORLD_H; y += 40) {
      if (y > gap0 && y < gap1) continue;
      part(g, 0.5, 2.2, 0.5, mat(0x6b4a2f), (GARDEN_W - 8) * U, 1.1, y * U);
    }
    part(g, 0.3, 0.3, gap0 * U, mat(0x6b4a2f), (GARDEN_W - 8) * U, 1.6, gap0 / 2 * U);
    part(g, 0.3, 0.3, (WORLD_H - gap1) * U, mat(0x6b4a2f), (GARDEN_W - 8) * U, 1.6, (WORLD_H + gap1) / 2 * U);
    // trees around the edges of the base
    const grnd = seeded(4242);
    for (let i = 0; i < 70; i++) {
      const x = 40 + grnd() * (GARDEN_W - 90), y = 40 + grnd() * (WORLD_H - 80);
      if (y > 230 && y < WORLD_H - 230) continue;
      decorate(g, 'forest', { x: x * U, z: y * U, s: 0.7 + grnd() * 0.5, v: grnd() * 0.75 }, grnd);
    }
    // spawn pad
    mesh(g, new THREE.CylinderGeometry(2.4, 2.6, 0.4, 24), mat(0x30343c), SPAWN.x * U, 0.2, SPAWN.y * U);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.12, 6, 32), glow(0x2fd36f));
    ring.rotation.x = Math.PI / 2; ring.position.set(SPAWN.x * U, 0.45, SPAWN.y * U); g.add(ring);
    // base sign
    const sz = 260 * U, sx = 615 * U;
    part(g, 0.6, 5, 0.6, mat(0x5a3a22), sx - 6, 2.5, sz); part(g, 0.6, 5, 0.6, mat(0x5a3a22), sx + 6, 2.5, sz);
    part(g, 13, 2.6, 0.4, mat(0x7a5230), sx, 5.4, sz - 0.1);
    const sign = makeLabel('YOUR BASE', { size: 64, color: '#ffd23f', h: 2.0 });
    sign.position.set(sx, 5.4, sz + 0.3); g.add(sign);
    // treadmill
    const T = TREADMILL, tx = (T.x + T.w / 2) * U, tz = (T.y + T.h / 2) * U;
    part(g, T.w * U + 1, 0.6, T.h * U + 1, mat(0x3a3f48), tx, 0.3, tz);
    const beltTex = (() => {
      const c = document.createElement('canvas'); c.width = 16; c.height = 64;
      const x = c.getContext('2d'); x.fillStyle = '#1d1f24'; x.fillRect(0, 0, 16, 64); x.fillStyle = '#34373e'; x.fillRect(0, 0, 16, 10);
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 6); return t;
    })();
    const belt = new THREE.Mesh(new THREE.PlaneGeometry(T.h * U - 0.4, T.w * U - 0.4), new THREE.MeshLambertMaterial({ map: beltTex }));
    belt.rotation.x = -Math.PI / 2; belt.rotation.z = Math.PI / 2; belt.position.set(tx, 0.62, tz); belt.receiveShadow = true; g.add(belt);
    part(g, T.w * U + 1, 0.5, 0.4, glow(0xffd23f), tx, 0.8, tz - T.h * U / 2 - 0.3);
    part(g, T.w * U + 1, 0.5, 0.4, glow(0xffd23f), tx, 0.8, tz + T.h * U / 2 + 0.3);
    part(g, 0.6, 3.5, 0.6, mat(0x555a66), tx + T.w * U / 2 + 0.2, 1.75, tz - 2);
    part(g, 0.6, 3.5, 0.6, mat(0x555a66), tx + T.w * U / 2 + 0.2, 1.75, tz + 2);
    part(g, 0.8, 1.2, 4.6, mat(0x2a2e36), tx + T.w * U / 2 + 0.2, 3.6, tz);
    const tl = makeLabel('TREADMILL', { size: 48, color: '#ffd23f', color2: '#9fd4ff', h: 1.0 });
    tl.position.set(tx, 5.6, tz); g.add(tl);
    animProps.push((t) => { beltTex.offset.y = -t * (onTread ? 3 : 0.3); setLabel(tl, `TREADMILL Lv${S.treadLvl}\n+${fmtD(treadGain(S.treadLvl))} speed/s`); });
    // trails shop: a glowing yellow circle you walk into (like the original)
    const ts = TRAIL_SHOP, sx2 = ts.x * U, sz2 = ts.y * U, sr = ts.r * U;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(sr, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35 }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(sx2, 0.06, sz2); g.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(sr, 0.18, 8, 48), glow(0xffd23f));
    rim.rotation.x = Math.PI / 2; rim.position.set(sx2, 0.15, sz2); g.add(rim);
    const swirl = new THREE.Group(); swirl.position.set(sx2, 0, sz2); g.add(swirl);
    TRAILS.slice(0, 6).forEach((T2, i) => {
      const a = (i / 6) * Math.PI * 2, m = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 6, 20), glow(T2.c[1]));
      m.position.set(Math.cos(a) * (sr - 1.2), 1.2, Math.sin(a) * (sr - 1.2)); swirl.add(m);
    });
    const tsl = makeLabel('TRAILS SHOP', { size: 52, color: '#ffd23f', color2: '#fff2a8', h: 1.1 });
    tsl.position.set(sx2, 4.2, sz2); g.add(tsl);
    animProps.push((t) => {
      disc.material.opacity = 0.3 + Math.sin(t * 2.5) * 0.08; swirl.rotation.y = t * 0.8;
      swirl.children.forEach((m, i) => { m.position.y = 1.2 + Math.sin(t * 2 + i) * 0.4; m.rotation.y = t * 2 + i; });
    });
    return g;
  }

  function slotPos(i) { return { x: 100 + (i % 4) * 270, y: 320 + Math.floor(i / 4) * 270, w: 220, h: 220 }; }
  // Creatures grow with what they earn on a gentle power curve; past ~200K/s (income now reaches
  // over a billion a second) the growth flattens so the giants still fit on their plots.
  const petSize = (z, r) => { const v = income(z, r); return v <= 2e5 ? 2.6 * v ** 0.13 : 2.6 * 2e5 ** 0.13 * (v / 2e5) ** 0.025; };
  const slotViews = [];
  function buildSlots(parent) {
    for (let i = 0; i < MAX_SLOTS; i++) {
      const p = slotPos(i), cx = (p.x + p.w / 2) * U, cz = (p.y + p.h / 2) * U;
      const base = part(parent, p.w * U, 0.6, p.h * U, mat(0x6b4a2f), cx, 0.3, cz);
      const top = part(parent, p.w * U - 0.6, 0.1, p.h * U - 0.6, studMat(0x8a6a48, 3, 3), cx, 0.62, cz, { shadow: false });
      const rim = part(parent, p.w * U + 0.3, 0.3, p.h * U + 0.3, mat(0x30343c), cx, 0.15, cz, { shadow: false });
      const label = makeLabel('', { size: 44, h: 0.8, color: '#ffffff', color2: '#7dff7d' });
      label.position.set(cx, 4.4, cz); parent.add(label);
      slotViews.push({ cx, cz, base, top, rim, label, key: null, obj: null, coinT: Math.random() * 3 });
    }
  }

  const zoneGroups = [];
  function buildZone(z) {
    const Z = ZONES[z], L = LAYOUTS[z], T = THEMES[Z.deco], x0 = zoneX(z) * U, W = ZONE_W * U, g = new THREE.Group(); scene.add(g); zoneGroups.push(g);
    part(g, W, 1, DEPTH, studMat(Z.ground, W / 2, DEPTH / 2), x0 + W / 2, -0.5, DEPTH / 2, { shadow: false });
    const em = mat(Z.edge);
    part(g, W, 3, 1, em, x0 + W / 2, 1.5, -0.5);
    part(g, W, 1.5, 1, em, x0 + W / 2, 0.75, DEPTH + 0.5);
    if (z === ZONES.length - 1) part(g, 1, 3, DEPTH, em, x0 + W + 0.5, 1.5, DEPTH / 2);
    const rnd = L.rnd;
    const title = makeLabel(Z.name.toUpperCase(), { size: 64, h: 1.6, color: '#ffffff' });
    title.position.set(x0 + 5, 9, SPAWN.y * U + 13); g.add(title);

    // Winding dirt path from the gate to the lair
    const pathM = mat(new THREE.Color(Z.ground).lerp(new THREE.Color(Z.deco === 'snow' || Z.deco === 'sky' ? 0x9fb8c8 : Z.deco === 'olympus' || Z.deco === 'heaven' ? 0xffe9a8 : Z.deco === 'shadow' || Z.deco === 'underworld' ? 0x4a3a4a : 0xb59a6a), 0.45).getHex());
    L.path.forEach((b, i) => {
      mesh(g, new THREE.CylinderGeometry(2.4, 2.4, 0.08, 14), pathM, b.x * U, 0.04, b.y * U).castShadow = false;
      if (!i) return;
      const a = L.path[i - 1], dx = (b.x - a.x) * U, dz = (b.y - a.y) * U;
      part(g, Math.hypot(dx, dz), 0.08, 4.8, pathM, (a.x + b.x) / 2 * U, 0.04, (a.y + b.y) / 2 * U, { shadow: false, ry: -Math.atan2(dz, dx) });
    });

    // Broken walls: chains of blocks. Rubble gaps let the player squeeze through but not the big guardian.
    const stoneM = mat(T.stone), mossM = GLOW_MOSS.has(Z.deco) ? glow(T.moss) : mat(T.moss);
    for (const w of L.walls) {
      for (let y = w.y0; y <= w.y1; y += 46) {
        const bx = w.x + (rnd() - 0.5) * 10;
        if (rnd() < 0.11 && y > w.y0 + 40 && y < w.y1 - 40) { part(g, 2.2, 0.7, 2.0, stoneM, bx * U, 0.35, y * U, { ry: rnd() }); continue; }
        const h = 3 + rnd() * 2.8, grp = new THREE.Group(); grp.position.set(bx * U, 0, y * U); g.add(grp);
        part(grp, 2.5, h, 2.5, stoneM, 0, h / 2, 0, { ry: (rnd() - 0.5) * 0.2 });
        part(grp, 2.7, 0.35, 2.7, mossM, 0, h + 0.1, 0, { ry: (rnd() - 0.5) * 0.3 });
        addCollider(bx, y, 27);
        occluders.push({ grp, x: bx * U, z: y * U, r: 1.3, faded: false });
      }
    }

    // Boost pads (green chevrons) for quick getaways
    for (const q of L.pads) {
      const grp = new THREE.Group(); grp.position.set(q.x * U, 0, q.y * U); g.add(grp);
      part(grp, 3.4, 0.25, 3.4, mat(0x2a2e36), 0, 0.12, 0);
      const chev = [];
      for (let i = 0; i < 2; i++) {
        const c = new THREE.Group(); c.position.x = 0.7 - i * 1.2; grp.add(c); chev.push(c);
        part(c, 1.4, 0.12, 0.35, glow(0x3cff7a), 0.3, 0.3, -0.45, { ry: 0.8, shadow: false });
        part(c, 1.4, 0.12, 0.35, glow(0x3cff7a), 0.3, 0.3, 0.45, { ry: -0.8, shadow: false });
      }
      animProps.push((t) => chev.forEach((c, i) => (c.position.y = Math.max(0, Math.sin(t * 6 - i * 1.2)) * 0.15)));
    }

    buildLair(g, z, Z, L, T, rnd);

    // Big landmarks in the corners
    const corners = [[220, 160], [220, WORLD_H - 160], [1200, 140], [1200, WORLD_H - 140], [780, 120], [780, WORLD_H - 120]];
    let placed = 0;
    for (const [cx, cy] of corners) {
      const x = L.x0 + cx + (rnd() - 0.5) * 60, y = cy;
      if (placed >= 3 || !L.free(x, y, 90)) continue;
      landmark(g, Z.deco, x, y, T, rnd); placed++;
    }

    // Scattered scenery
    for (let i = 0, n = 0; i < 160 && n < 48; i++) {
      const x = L.x0 + 40 + rnd() * (ZONE_W - 80), y = 40 + rnd() * (WORLD_H - 80), sc = 0.7 + rnd() * 0.6, v = rnd();
      if (!L.free(x, y, 30 * sc)) continue;
      // no flat water/lava pools: they'd look like hazards
      const vv = Z.deco === 'lake' ? 0.45 + v * 0.55 : Z.deco === 'volcano' ? 0.35 + v * 0.65 : v;
      decorate(g, Z.deco, { x: x * U, z: y * U, s: sc, v: vv }, rnd); n++;
    }
    backdrop(g, Z, x0, W, rnd);
  }

  function buildLair(g, z, Z, L, T, rnd) {
    const lx = L.lair.x * U, lz = L.lair.y * U, R = LAIR_R * U;
    mesh(g, new THREE.CylinderGeometry(R - 0.5, R + 0.3, 0.35, 28), mat(new THREE.Color(T.stone).multiplyScalar(0.8).getHex()), lx, 0.17, lz).castShadow = false;
    mesh(g, new THREE.CylinderGeometry(R * 0.45, R * 0.47, 0.2, 24), mat(T.stone), lx + 2.5, 0.42, lz).castShadow = false;
    const stoneM = mat(T.stone);
    for (let deg = -150; deg <= 150; deg += 30) {
      const a = (deg * Math.PI) / 180, px = L.lair.x + Math.cos(a) * LAIR_R, py = L.lair.y + Math.sin(a) * LAIR_R;
      const h = 6.5 + rnd() * 2.5, grp = new THREE.Group(); grp.position.set(px * U, 0, py * U); g.add(grp);
      part(grp, 1.7, 0.6, 1.7, stoneM, 0, 0.3, 0);
      part(grp, 1.3, h, 1.3, stoneM, 0, h / 2, 0);
      part(grp, 1.8, 0.5, 1.8, stoneM, 0, h + 0.25, 0);
      if (deg % 60 === 0) { const f = part(grp, 0.6, 0.8, 0.6, glow(T.torch), 0, h + 0.9, 0, { shadow: false }); const ph = rnd() * 6; animProps.push((t) => (f.scale.y = 1 + Math.sin(t * 9 + ph) * 0.25)); }
      addCollider(px, py, 26);
      occluders.push({ grp, x: px * U, z: py * U, r: 0.9, faded: false });
    }
    // bones and skulls
    for (let i = 0; i < 9; i++) {
      const a = rnd() * 6.28, r = (0.25 + rnd() * 0.6) * R;
      if (Math.cos(a) < -0.6) continue;
      if (rnd() < 0.5) part(g, 1.2, 0.25, 0.25, mat(0xe9e0c9), lx + Math.cos(a) * r, 0.45, lz + Math.sin(a) * r, { ry: rnd() * 3 });
      else { part(g, 0.6, 0.5, 0.6, mat(0xe9e0c9), lx + Math.cos(a) * r, 0.6, lz + Math.sin(a) * r, { ry: rnd() * 3 }); }
    }
    const name = Z.guard.n.replace(/^The /, '').split(' the ')[0].toUpperCase();
    const lab = makeLabel(`${name}'S LAIR`, { size: 56, h: 1.4, color: '#ff8a8a', bg: 'rgba(20,0,8,.55)' });
    lab.position.set(lx + R * 0.6, 11.5, lz); g.add(lab);
  }

  // One big themed set piece; registers its own collider and fades when in the way.
  function landmark(g, type, x, y, T, rnd) {
    const grp = new THREE.Group(); grp.position.set(x * U, 0, y * U); grp.rotation.y = rnd() * Math.PI; g.add(grp);
    const P = (w, h, d, m, px, py, pz, o) => part(grp, w, h, d, m, px, py, pz, o);
    const M = (geo, m, px, py, pz) => mesh(grp, geo, m, px, py, pz);
    const C2 = (rad, h, m, px, py, pz) => M(new THREE.ConeGeometry(rad, h, 6), m, px, py, pz);
    let r = 110;
    switch (type) {
      case 'forest': // giant dead tree
        P(3, 12, 3, mat(0x3e2c1e), 0, 6, 0); P(7, 1.2, 1.2, mat(0x3e2c1e), 2.5, 10, 0, { rz: 0.5 }); P(1.2, 1.2, 6, mat(0x3e2c1e), 0, 11, 2, { rx: -0.5 });
        P(1.2, 6, 1.2, mat(0x3e2c1e), -2, 13, 0, { rz: 0.5 }); P(8, 4, 8, mat(0x1f3a1c), 0, 15.5, 0); P(5, 3, 5, mat(0x24461f), 1, 18, 1);
        for (let i = 0; i < 5; i++) P(0.3, 0.3, 0.3, glow(0xb05cff), (rnd() - 0.5) * 6, 12 + rnd() * 5, (rnd() - 0.5) * 6, { shadow: false });
        r = 70; break;
      case 'lake': // ruined statue on a rock
        M(new THREE.DodecahedronGeometry(4), mat(0x5a6470), 0, 1.5, 0); P(3, 8, 2.4, mat(0x9aa6ae), 0, 8, 0); P(2.4, 2.4, 2.4, mat(0x9aa6ae), 0, 13.3, 0);
        P(0.6, 5, 0.6, mat(0x9aa6ae), 2, 10, 0, { rz: -0.3 }); P(0.3, 7, 0.3, mat(0xc9a64a), 2.8, 12, 0); break;
      case 'desert': // pyramid
        { const pm = M(new THREE.ConeGeometry(8, 9, 4), mat(0xd8b878), 0, 4.5, 0); pm.rotation.y = Math.PI / 4; P(1.2, 1.2, 1.2, glow(0xffd23f), 0, 9.3, 0); r = 140; } break;
      case 'jungle': // step temple
        P(10, 2.5, 10, mat(0x6a7468), 0, 1.25, 0); P(7.5, 2.5, 7.5, mat(0x5f6a5d), 0, 3.75, 0); P(5, 2.5, 5, mat(0x56614f), 0, 6.25, 0);
        P(3, 2.5, 3, mat(0x4a5546), 0, 8.75, 0); P(1.4, 1, 0.3, glow(0x7dff4a), 0, 8.6, 1.55); P(10.2, 0.4, 10.2, mat(0x2f7a34), 0, 2.6, 0); r = 140; break;
      case 'snow': // giant ice crystals
        { const ice = new THREE.MeshStandardMaterial({ color: 0x9ee6ff, transparent: true, opacity: 0.85, roughness: 0.1, flatShading: true, emissive: 0x2a6a8a, emissiveIntensity: 0.4 });
          for (let i = 0; i < 5; i++) { const c = M(new THREE.ConeGeometry(1.2 + rnd(), 7 + rnd() * 8, 5), ice, (rnd() - 0.5) * 5, 4, (rnd() - 0.5) * 5); c.rotation.z = (rnd() - 0.5) * 0.6; c.rotation.x = (rnd() - 0.5) * 0.6; } r = 90; } break;
      case 'volcano': // small erupting cone
        M(new THREE.CylinderGeometry(2.2, 7, 8, 9), mat(0x2a1a17), 0, 4, 0); M(new THREE.CylinderGeometry(2, 2, 0.4, 9), glow(0xff5a00), 0, 8.1, 0);
        { const rocks = []; for (let i = 0; i < 4; i++) { rocks.push(P(0.6, 0.6, 0.6, glow(0xff8a00), 0, 8, 0, { shadow: false })); }
          animProps.push((t) => rocks.forEach((b, i) => { const k = (t * 0.6 + i / 4) % 1; b.position.set(Math.cos(i * 1.6) * k * 6, 8 + Math.sin(k * Math.PI) * 7, Math.sin(i * 1.6) * k * 6); })); }
        r = 130; break;
      case 'abyss': // sunken ship
        P(12, 3, 4, mat(0x4a3424), 0, 1.2, 0, { rz: 0.12 }); P(3, 4, 4, mat(0x4a3424), 5, 2.5, 0, { rz: 0.12 }); P(0.5, 10, 0.5, mat(0x3a2a1a), -1, 6, 0, { rz: 0.25 });
        P(4, 3, 0.15, mat(0xd8d0b8), -1.5, 7, 0.3, { rz: 0.25 }); P(1, 1, 1, glow(0xffd23f), -3, 3, 1.5); r = 130; break;
      case 'cosmic': // floating monolith with rings
        { const mono = P(2.5, 10, 1, mat(0x111018), 0, 8, 0); const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.2, 6, 32), glow(0x33ffff)); ring.position.y = 8; grp.add(ring);
          const ring2 = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.15, 6, 32), glow(0xb46cff)); ring2.position.y = 8; grp.add(ring2);
          M(new THREE.DodecahedronGeometry(2.5), mat(0x3a2f5a), 0, 1.2, 0);
          animProps.push((t) => { mono.position.y = 8 + Math.sin(t) * 0.6; ring.rotation.x = t * 0.7; ring2.rotation.y = t * 0.5; ring2.rotation.x = 1 + t * 0.3; }); r = 60; } break;
      case 'crystal': // towering crystal cluster
        { const cols = [0xff66ee, 0x9af4ff, 0xb46cff];
          M(new THREE.DodecahedronGeometry(3.5), mat(0x2a2440), 0, 1, 0);
          for (let i = 0; i < 7; i++) {
            const h = 6 + rnd() * 10, c = M(new THREE.OctahedronGeometry(1.4 + rnd() * 0.8), mat(cols[i % 3], 0.55), (rnd() - 0.5) * 5, h / 2, (rnd() - 0.5) * 5);
            c.scale.set(1, h / 2.6, 1); c.rotation.z = (rnd() - 0.5) * 0.7; c.rotation.x = (rnd() - 0.5) * 0.7;
          }
          const gem = M(new THREE.OctahedronGeometry(1.2), glow(0xffffff), 0, 16, 0); animProps.push((t) => { gem.rotation.y = t; gem.position.y = 16 + Math.sin(t * 1.5) * 0.6; });
          r = 90; } break;
      case 'sky': // floating island with a lightning tower
        { const isl = new THREE.Group(); grp.add(isl);
          const rock = mesh(isl, new THREE.ConeGeometry(6, 6, 7), mat(0x8a7a6a), 0, 8, 0); rock.rotation.x = Math.PI;
          mesh(isl, new THREE.CylinderGeometry(6, 6, 1.2, 7), mat(0x6aae5a), 0, 11.6, 0);
          part(isl, 1.6, 7, 1.6, mat(0xe8ecf4), 1.5, 15.5, 0); part(isl, 2.4, 0.6, 2.4, mat(0xffd23f), 1.5, 19.2, 0);
          const orb = mesh(isl, new THREE.OctahedronGeometry(0.9), glow(0xfff066), 1.5, 20.6, 0);
          for (let i = 0; i < 3; i++) mesh(isl, new THREE.SphereGeometry(1.4 + rnd(), 10, 8), mat(0xffffff), -2.5 + rnd() * 2, 12.5 + rnd(), (rnd() - 0.5) * 4);
          P(1, 7, 1, mat(0xc8d0dc), 0, 3.5, 0, { shadow: false });
          animProps.push((t) => { isl.position.y = Math.sin(t * 0.8) * 0.8; orb.rotation.y = t * 3; orb.scale.setScalar(1 + (Math.sin(t * 13) > 0.85 ? 0.6 : 0)); });
          r = 60; } break;
      case 'fungal': // giant mushroom
        { M(new THREE.CylinderGeometry(1.4, 2.2, 11, 12), mat(0xe8dcc8), 0, 5.5, 0);
          const cap = M(new THREE.SphereGeometry(7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd8304a), 0, 10.5, 0); cap.scale.y = 0.6;
          M(new THREE.CylinderGeometry(6.8, 6.8, 0.3, 20), mat(0xf4e8d8), 0, 10.5, 0);
          for (let i = 0; i < 9; i++) { const a = rnd() * 6.28, rr = 2 + rnd() * 4; M(new THREE.SphereGeometry(0.6 + rnd() * 0.4, 8, 6), mat(0xffffff), Math.cos(a) * rr, 10.6 + Math.sqrt(Math.max(0, 49 - rr * rr)) * 0.6 - 0.3, Math.sin(a) * rr); }
          for (let i = 0; i < 6; i++) { const s = M(new THREE.SphereGeometry(0.25, 6, 4), glow(0x9cff3c), 0, 0, 0); const ph = rnd() * 6; animProps.push((t) => { const k = (t * 0.2 + ph) % 1; s.position.set(Math.cos(ph * 3) * 5 * k, 9 - k * 8, Math.sin(ph * 3) * 5 * k); }); }
          r = 80; } break;
      case 'olympus': // greek temple
        { const marble = mat(0xf4f0e6), gold = mat(0xffd23f);
          P(14, 1, 10, marble, 0, 0.5, 0); P(13, 0.6, 9, marble, 0, 1.3, 0);
          for (let i = 0; i < 5; i++) for (const zz of [-3.6, 3.6]) M(new THREE.CylinderGeometry(0.55, 0.6, 7, 12), marble, -5 + i * 2.5, 5.1, zz);
          P(13.5, 0.8, 9.5, marble, 0, 9, 0); P(13.5, 0.3, 9.5, gold, 0, 9.5, 0);
          { const roof = M(new THREE.CylinderGeometry(0.01, 5.2, 13.5, 3), marble, 0, 11.2, 0); roof.rotation.z = Math.PI / 2; roof.scale.set(1, 1, 0.5); }
          const fire = P(1, 1.4, 1, glow(0xffb52e), 0, 2.4, 0, { shadow: false }); animProps.push((t) => (fire.scale.y = 1 + Math.sin(t * 9) * 0.3));
          r = 150; } break;
      case 'underworld': // gates of Hades with soul fire
        { const bone = mat(0xe8e0c8), dark = mat(0x1a1218);
          P(2, 12, 2, dark, -5, 6, 0); P(2, 12, 2, dark, 5, 6, 0); P(13, 2, 2.4, dark, 0, 12.5, 0);
          M(new THREE.SphereGeometry(1.6, 10, 8), bone, 0, 14.6, 0); P(0.5, 0.5, 0.2, glow(0x66ff99), -0.5, 14.8, 1.4); P(0.5, 0.5, 0.2, glow(0x66ff99), 0.5, 14.8, 1.4);
          for (const sx of [-5, 5]) { const f = M(new THREE.ConeGeometry(0.9, 2.5, 8), glow(0x66ff99), sx, 13.6, 0); animProps.push((t) => (f.scale.set(1 + Math.sin(t * 7 + sx) * 0.15, 1 + Math.sin(t * 11 + sx) * 0.3, 1))); }
          for (let i = 0; i < 6; i++) C2(0.3, 3, bone, -4 + i * 1.6, 3.5, 0);
          r = 120; } break;
      case 'fairy': // great glowing fae tree
        { P(2.4, 12, 2.4, mat(0x6a4a5a), 0, 6, 0);
          for (let i = 0; i < 5; i++) { const s = M(new THREE.SphereGeometry(3.4 + rnd() * 1.6, 14, 10), mat(i % 2 ? 0xff9ae0 : 0xd88aff, 0.25), (rnd() - 0.5) * 6, 12 + rnd() * 4, (rnd() - 0.5) * 6); s.scale.y = 0.75; }
          const flies = new THREE.Group(); flies.position.y = 9; grp.add(flies);
          for (let i = 0; i < 12; i++) mesh(flies, new THREE.SphereGeometry(0.2, 6, 4), glow(0xffe066), Math.cos(i) * (5 + (i % 3)), Math.sin(i * 2.3) * 3, Math.sin(i) * (5 + (i % 3)));
          animProps.push((t) => { flies.rotation.y = t * 0.4; flies.position.y = 9 + Math.sin(t) * 0.8; });
          r = 75; } break;
      case 'shadow': // obsidian spire with a watching eye
        { M(new THREE.ConeGeometry(4, 20, 6), mat(0x0c0a12), 0, 10, 0);
          for (let i = 0; i < 4; i++) { const sp = M(new THREE.ConeGeometry(1.2, 8, 5), mat(0x15101e), Math.cos(i * 1.57) * 3.5, 3, Math.sin(i * 1.57) * 3.5); sp.rotation.z = Math.cos(i * 1.57) * -0.4; sp.rotation.x = Math.sin(i * 1.57) * 0.4; }
          const eye = new THREE.Group(); eye.position.y = 14; grp.add(eye);
          mesh(eye, new THREE.SphereGeometry(1.5, 16, 12), glow(0xb000ff), 0, 0, 0); mesh(eye, new THREE.SphereGeometry(0.7, 12, 8), glow(0xff2aff), 0, 0, 1.1);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 6, 32), glow(0xb000ff)); eye.add(ring);
          animProps.push((t) => { eye.rotation.y = Math.sin(t * 0.5) * 1.2; ring.rotation.x = t; ring.rotation.y = t * 0.6; });
          r = 85; } break;
      case 'blossom':
        if (rnd() < 0.55) { // giant cherry tree shedding petals
          const bark = mat(0x5a3a2e);
          M(new THREE.CylinderGeometry(1.2, 2, 10, 10), bark, 0, 5, 0);
          for (const [a, l] of [[0.6, 6], [-0.7, 5], [2.4, 5.5]]) { const br = P(1, l, 1, bark, Math.cos(a) * 2, 10, Math.sin(a) * 2); br.rotation.z = -Math.cos(a) * 0.7; br.rotation.x = Math.sin(a) * 0.7; }
          for (let i = 0; i < 8; i++) { const s = M(new THREE.SphereGeometry(2.6 + rnd() * 1.6, 14, 10), mat(i % 3 ? 0xffb7d5 : 0xff9ac4, 0.12), (rnd() - 0.5) * 9, 12 + rnd() * 4, (rnd() - 0.5) * 9); s.scale.y = 0.75; }
          const petals = [];
          for (let i = 0; i < 10; i++) petals.push(P(0.3, 0.05, 0.3, mat(0xffc8dc, 0.3), 0, 0, 0, { shadow: false }));
          animProps.push((t) => petals.forEach((p, i) => { const k = (t * 0.12 + i / 10) % 1; p.position.set(Math.sin(i * 2.3) * 6 + Math.sin(t + i) * k * 2, 13 - k * 13, Math.cos(i * 2.3) * 6); p.rotation.set(t * 2 + i, t + i, 0); }));
          r = 80;
        } else { // torii gate with stone lanterns
          const red = mat(0xd8303a), dark = mat(0x2a1a1a), stone = mat(0xb8b0a8);
          P(1.1, 10, 1.1, red, -4, 5, 0); P(1.1, 10, 1.1, red, 4, 5, 0);
          P(12, 0.9, 1.4, dark, 0, 10.2, 0); P(10.5, 0.6, 1, red, 0, 8.3, 0); P(0.6, 1.9, 0.6, red, 0, 9.2, 0);
          for (const x of [-7, 7]) {
            P(1.4, 0.4, 1.4, stone, x, 0.2, 0); P(0.6, 2.2, 0.6, stone, x, 1.5, 0); P(1.6, 0.4, 1.6, stone, x, 2.8, 0);
            const l = P(0.9, 0.9, 0.9, glow(0xffd8a0), x, 3.45, 0, { shadow: false }); P(1.8, 0.4, 1.8, stone, x, 4.1, 0);
            animProps.push((t) => l.scale.setScalar(1 + Math.sin(t * 3 + x) * 0.06));
          }
          r = 110;
        }
        break;
      case 'heaven': // golden gate under a halo
        { const gold = mat(0xffd23f, 0.2), white = mat(0xffffff);
          M(new THREE.CylinderGeometry(7, 7.5, 1.2, 20), white, 0, 0.6, 0);
          P(1.6, 11, 1.6, gold, -4.5, 6.5, 0); P(1.6, 11, 1.6, gold, 4.5, 6.5, 0);
          const arch = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.6, 8, 24, Math.PI), gold); arch.position.y = 12; grp.add(arch); arch.castShadow = true;
          for (let i = -3; i <= 3; i++) P(0.2, 9, 0.2, gold, i * 1.1, 5.7, 0, { shadow: false });
          const halo = new THREE.Mesh(new THREE.TorusGeometry(3, 0.25, 8, 32), glow(0xfff2a8)); halo.rotation.x = Math.PI / 2; halo.position.y = 19; grp.add(halo);
          animProps.push((t) => { halo.position.y = 19 + Math.sin(t * 1.3) * 0.7; halo.rotation.z = t * 0.5; });
          r = 110; } break;
    }
    addCollider(x, y, r);
    occluders.push({ grp, x: x * U, z: y * U, r: r * U, faded: false });
  }

  function decorate(g, type, { x, z, s, v }, rnd) {
    const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.scale.setScalar(s); grp.rotation.y = rnd() * Math.PI; g.add(grp);
    const P = (w, h, d, m, px, py, pz, o) => part(grp, w, h, d, m, px, py, pz, o);
    const M = (geo, m, px, py, pz) => mesh(grp, geo, m, px, py, pz);
    switch (type) {
      case 'forest':
        if (v < 0.55) { P(1, 5, 1, mat(0x4a3220), 0, 2.5, 0); P(4.2, 3, 4.2, mat(0x2d5a26), 0, 5.8, 0); P(3, 2, 3, mat(0x264d20), 0, 7.8, 0); }
        else if (v < 0.75) { P(0.9, 6, 0.9, mat(0x5a5048), 0, 3, 0); P(2.5, 0.5, 0.5, mat(0x5a5048), 1, 4.5, 0, { rz: 0.5 }); P(0.5, 0.5, 2, mat(0x5a5048), 0, 5.2, -0.8, { rx: 0.4 }); }
        else if (v < 0.9) { P(1.4, 2, 0.5, mat(0x7a7f88), 0, 1, 0); P(1.6, 0.4, 0.6, mat(0x6a6f78), 0, 2.05, 0); }
        else { P(0.3, 0.8, 0.3, mat(0xd8d0c0), 0, 0.4, 0); const cap = P(0.9, 0.35, 0.9, glow(0xb05cff), 0, 0.9, 0); animProps.push((t) => (cap.scale.y = 1 + Math.sin(t * 2 + x) * 0.15)); }
        break;
      case 'lake':
        if (v < 0.45) { const w = P(6 + v * 6, 0.15, 4 + v * 4, new THREE.MeshLambertMaterial({ color: 0x2a7ab8, transparent: true, opacity: 0.85 }), 0, 0.08, 0, { shadow: false }); animProps.push((t) => (w.position.y = 0.08 + Math.sin(t + x) * 0.03)); }
        else if (v < 0.75) M(new THREE.DodecahedronGeometry(1.2), mat(0x6a7078), 0, 0.6, 0);
        else for (let i = 0; i < 4; i++) P(0.2, 2 + i * 0.4, 0.2, mat(0x3c7a3c), i * 0.3 - 0.5, 1 + i * 0.2, (i % 2) * 0.3);
        break;
      case 'desert':
        if (v < 0.35) { P(1, 4.5, 1, mat(0x3f7a3f), 0, 2.25, 0); P(0.8, 2, 0.8, mat(0x3f7a3f), -1.2, 2.6, 0); P(1.4, 0.7, 0.7, mat(0x3f7a3f), -0.6, 1.9, 0); P(0.8, 1.6, 0.8, mat(0x3f7a3f), 1.2, 3.2, 0); P(1.4, 0.7, 0.7, mat(0x3f7a3f), 0.6, 2.6, 0); }
        else if (v < 0.7) { const h = 2 + v * 5; M(new THREE.CylinderGeometry(0.8, 0.9, h, 8), mat(0xd8c08a), 0, h / 2, 0); P(2.2, 0.6, 2.2, mat(0xc8b07a), 0, h + 0.3, 0, { rz: 0.15 }); }
        else { for (let i = 0; i < 4; i++) P(0.25, 2.2, 0.25, mat(0xe9e0c9), -1 + i * 0.6, 1, 0, { rz: 0.3 - i * 0.2 }); P(0.9, 0.8, 1.1, mat(0xe9e0c9), 1.6, 0.4, 0); }
        break;
      case 'jungle':
        if (v < 0.6) { P(1.2, 8, 1.2, mat(0x5a3d22), 0, 4, 0); P(5.5, 1.3, 5.5, mat(0x1f6b2c), 0, 8.5, 0); P(3.6, 1.1, 3.6, mat(0x2a7d34), 0, 9.7, 0); for (let i = 0; i < 3; i++) P(0.2, 4, 0.2, mat(0x2a6a2a), -2 + i * 2, 6, 2.5); }
        else { P(3, 2, 3, mat(0x6a7468), 0, 1, 0); P(3.1, 0.3, 3.1, mat(0x3a7a3a), 0, 2.1, 0); P(2, 1.5, 2, mat(0x5a6458), 0.8, 2.9, 0.5, { ry: 0.4 }); }
        break;
      case 'snow':
        if (v < 0.55) { P(0.8, 2, 0.8, mat(0x4a3220), 0, 1, 0); for (let i = 0; i < 3; i++) M(new THREE.ConeGeometry(2.6 - i * 0.6, 2.6, 6), mat(i === 2 ? 0xf2f6fa : 0x2a5a4a), 0, 2.5 + i * 1.7, 0); }
        else if (v < 0.8) { const ice = new THREE.MeshStandardMaterial({ color: 0x9ee6ff, transparent: true, opacity: 0.8, roughness: 0.1, flatShading: true }); for (let i = 0; i < 3; i++) { const c = M(new THREE.ConeGeometry(0.6, 3 + i, 4), ice, i - 1, (3 + i) / 2, (i % 2) * 0.6); c.rotation.z = (i - 1) * 0.25; } }
        else P(3, 1, 2, mat(0xffffff), 0, 0.5, 0);
        break;
      case 'volcano':
        if (v < 0.35) { const l = P(5 + v * 6, 0.12, 3 + v * 4, new THREE.MeshBasicMaterial({ color: 0xff5a00 }), 0, 0.07, 0, { shadow: false }); animProps.push((t) => l.material.color.setHSL(0.05 + Math.sin(t * 2 + x) * 0.015, 1, 0.5)); }
        else if (v < 0.75) { M(new THREE.DodecahedronGeometry(1.4), mat(0x2a2020), 0, 0.8, 0); P(0.3, 0.3, 0.3, glow(0xff6a00), 0.6, 1.6, 0.6); }
        else for (let i = 0; i < 3; i++) M(new THREE.ConeGeometry(0.7, 3 + i * 1.5, 4), mat(0x15101a), i - 1, (3 + i * 1.5) / 2, 0);
        break;
      case 'abyss':
        if (v < 0.4) { const k = new THREE.Group(); grp.add(k); for (let i = 0; i < 5; i++) part(k, 0.5, 1.6, 0.3, mat(0x2a7a4a), Math.sin(i) * 0.2, 0.8 + i * 1.6, 0); animProps.push((t) => (k.rotation.z = Math.sin(t * 1.2 + x) * 0.12)); }
        else if (v < 0.75) { const col = v < 0.55 ? 0xff5c9a : 0xff9a3c; P(0.6, 2, 0.6, glow(col), 0, 1, 0); P(0.5, 1.4, 0.5, glow(col), 0.7, 1.6, 0, { rz: -0.5 }); P(0.5, 1.4, 0.5, glow(col), -0.7, 1.4, 0, { rz: 0.5 }); }
        else { M(new THREE.DodecahedronGeometry(1.3), mat(0x22344a), 0, 0.7, 0); P(0.4, 0.4, 0.4, glow(0x33ffcc), 0.5, 1.7, 0.4); }
        break;
      case 'cosmic':
        if (v < 0.5) { const col = v < 0.25 ? 0x33ffff : 0xb46cff; for (let i = 0; i < 3; i++) { const c = M(new THREE.OctahedronGeometry(0.8), mat(col, 0.6), i - 1, 1.6 + i * 0.6, (i % 2) * 0.5); c.scale.set(1, 2.5 + i, 1); c.rotation.z = (i - 1) * 0.3; } }
        else { const by = 3 + v * 4, r = M(new THREE.DodecahedronGeometry(1.2), mat(0x3a2f5a), 0, by, 0); animProps.push((t) => { r.position.y = by + Math.sin(t + x) * 0.6; r.rotation.y = t * 0.3; }); }
        break;
      case 'crystal':
        if (v < 0.5) { const col = [0xff66ee, 0x9af4ff, 0xb46cff][Math.floor(v * 6)]; for (let i = 0; i < 4; i++) { const c = M(new THREE.OctahedronGeometry(0.6), mat(col, 0.55), (i - 1.5) * 0.6, 1.2 + (i % 2) * 0.6, (i % 2) * 0.4); c.scale.set(1, 2.4 + i * 0.5, 1); c.rotation.z = (i - 1.5) * 0.3; } }
        else if (v < 0.8) { for (let i = 0; i < 3; i++) M(new THREE.ConeGeometry(0.7 - i * 0.1, 3.5 + i * 1.2, 6), mat(0x3a3452), i - 1, (3.5 + i * 1.2) / 2, (i % 2) * 0.5); }
        else { M(new THREE.DodecahedronGeometry(1.3), mat(0x4a4266), 0, 0.7, 0); M(new THREE.OctahedronGeometry(0.5), glow(0x9af4ff), 0, 1.5, 0.8); }
        break;
      case 'sky':
        if (v < 0.5) { const cl = new THREE.Group(); grp.add(cl); for (let i = 0; i < 4; i++) mesh(cl, new THREE.SphereGeometry(1.2 + (i % 2) * 0.5, 10, 8), mat(0xffffff), (i - 1.5) * 1.3, 1 + (i % 2) * 0.4, (i % 2) * 0.6); animProps.push((t) => (cl.position.y = Math.sin(t * 0.9 + x) * 0.3)); }
        else if (v < 0.8) { M(new THREE.CylinderGeometry(0.5, 0.6, 4 + v * 3, 10), mat(0xe8ecf4), 0, 2 + v * 1.5, 0); P(1.6, 0.4, 1.6, mat(0xffd23f), 0, 4.2 + v * 3, 0); }
        else { const by = 3 + v * 3, rk = M(new THREE.DodecahedronGeometry(1.1), mat(0x8a7a6a), 0, by, 0); animProps.push((t) => { rk.position.y = by + Math.sin(t * 1.2 + x) * 0.5; rk.rotation.y = t * 0.4; }); }
        break;
      case 'fungal':
        if (v < 0.6) { const h = 1.5 + v * 5, col = [0xd8304a, 0xff9a3c, 0x9a4aff, 0x33aaff][Math.floor(v * 6.6)], gl = v < 0.3 ? 0.4 : 0;
          M(new THREE.CylinderGeometry(0.3, 0.45, h, 8), mat(0xe8dcc8), 0, h / 2, 0);
          const cap = M(new THREE.SphereGeometry(1.2 + v * 1.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(col, gl), 0, h, 0); cap.scale.y = 0.65; }
        else if (v < 0.85) { for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; M(new THREE.CylinderGeometry(0.1, 0.15, 0.7, 6), mat(0xe8dcc8), Math.cos(a) * 1.4, 0.35, Math.sin(a) * 1.4); M(new THREE.SphereGeometry(0.35, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), glow(0x9cff3c), Math.cos(a) * 1.4, 0.7, Math.sin(a) * 1.4); } }
        else { M(new THREE.DodecahedronGeometry(1.1), mat(0x5a4a5a), 0, 0.6, 0); P(1.4, 0.2, 1.4, mat(0x6a9a3a), 0, 1.3, 0); }
        break;
      case 'olympus':
        if (v < 0.45) { const h = 2 + v * 8; M(new THREE.CylinderGeometry(0.6, 0.65, h, 12), mat(0xf4f0e6), 0, h / 2 + 0.3, 0); P(1.8, 0.6, 1.8, mat(0xf4f0e6), 0, 0.3, 0); if (v > 0.2) P(1.8, 0.5, 1.8, mat(0xf4f0e6), 0, h + 0.55, 0); }
        else if (v < 0.75) { P(0.6, 3.5, 0.6, mat(0x6a5a3a), 0, 1.75, 0); for (let i = 0; i < 3; i++) M(new THREE.SphereGeometry(1.2 - i * 0.2, 10, 8), mat(0x7a8a4a), (i - 1) * 0.8, 4 + i * 0.4, (i % 2) * 0.5); }
        else { M(new THREE.CylinderGeometry(0.4, 0.7, 1.4, 10), mat(0xffb52e, 0.15), 0, 0.7, 0); M(new THREE.SphereGeometry(0.75, 10, 8), mat(0xffb52e, 0.15), 0, 1.6, 0); M(new THREE.CylinderGeometry(0.35, 0.3, 0.6, 10), mat(0xffb52e, 0.15), 0, 2.4, 0); }
        break;
      case 'underworld':
        if (v < 0.35) { P(1.4, 2, 0.4, mat(0x4a4248), 0, 1, 0); M(new THREE.CylinderGeometry(0.7, 0.7, 0.4, 12), mat(0x4a4248), 0, 2, 0).rotation.x = Math.PI / 2; }
        else if (v < 0.6) { for (let i = 0; i < 4; i++) P(0.25, 1.8, 0.25, mat(0xe8e0c8), (i - 1.5) * 0.4, 0.3, (i % 2) * 0.4, { rz: 1.2 + i * 0.4 }); M(new THREE.SphereGeometry(0.5, 8, 6), mat(0xe8e0c8), 0.6, 0.5, 0.2); }
        else if (v < 0.8) { P(0.6, 1, 0.6, mat(0x2a2028), 0, 0.5, 0); const f = M(new THREE.ConeGeometry(0.5, 1.6, 8), glow(0x66ff99), 0, 1.8, 0); animProps.push((t) => f.scale.set(1, 1 + Math.sin(t * 10 + x) * 0.3, 1)); }
        else { P(0.7, 6, 0.7, mat(0x1a1218), 0, 3, 0); P(3, 0.4, 0.4, mat(0x1a1218), 0.8, 4.5, 0, { rz: 0.5 }); P(0.4, 0.4, 2.2, mat(0x1a1218), 0, 5.2, -0.6, { rx: 0.5 }); }
        break;
      case 'fairy':
        if (v < 0.5) { const col = [0xff66cc, 0xffe066, 0x9a7bff, 0x66ddff][Math.floor(v * 8)]; for (let i = 0; i < 3; i++) { const h = 1 + i * 0.5; M(new THREE.CylinderGeometry(0.06, 0.08, h, 5), mat(0x3a8a4a), (i - 1) * 0.6, h / 2, (i % 2) * 0.4); const fl = M(new THREE.OctahedronGeometry(0.4), mat(col, 0.4), (i - 1) * 0.6, h + 0.2, (i % 2) * 0.4); fl.scale.y = 0.5; } }
        else if (v < 0.75) { for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; M(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 6), mat(0xf4e8d8), Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5); M(new THREE.SphereGeometry(0.4, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xff4a6a), Math.cos(a) * 1.5, 0.6, Math.sin(a) * 1.5); } }
        else { P(0.9, 5, 0.9, mat(0x6a4a5a), 0, 2.5, 0); const cn = M(new THREE.SphereGeometry(2.2, 12, 8), mat(0xd88aff, 0.2), 0, 5.6, 0); cn.scale.y = 0.75; }
        break;
      case 'shadow':
        if (v < 0.45) { for (let i = 0; i < 3; i++) { const c = M(new THREE.ConeGeometry(0.5, 3 + i * 1.4, 5), mat(0x0c0a12), i - 1, (3 + i * 1.4) / 2, (i % 2) * 0.5); c.rotation.z = (i - 1) * 0.2; } P(0.25, 0.25, 0.25, glow(0xb000ff), 0, 0.3, 0.8, { shadow: false }); }
        else if (v < 0.75) { const by = 2 + v * 3, o = M(new THREE.SphereGeometry(0.7, 12, 8), glow(0xb000ff), 0, by, 0); animProps.push((t) => { o.position.y = by + Math.sin(t * 1.8 + x) * 0.5; o.scale.setScalar(1 + Math.sin(t * 3 + x) * 0.15); }); }
        else { M(new THREE.DodecahedronGeometry(1.3), mat(0x15101e), 0, 0.7, 0); const f = M(new THREE.ConeGeometry(0.4, 1.4, 6), glow(0xff2aff), 0, 1.9, 0); animProps.push((t) => f.scale.set(1, 1 + Math.sin(t * 9 + x) * 0.3, 1)); }
        break;
      case 'blossom':
        if (v < 0.5) { // young cherry tree
          P(0.6, 4, 0.6, mat(0x5a3a2e), 0, 2, 0);
          for (let i = 0; i < 3; i++) { const s = M(new THREE.SphereGeometry(1.5 - i * 0.2, 10, 8), mat(i ? 0xffb7d5 : 0xff9ac4, 0.1), (i - 1) * 0.9, 4.6 + (i % 2) * 0.5, (i % 2) * 0.6); s.scale.y = 0.8; }
        } else if (v < 0.7) { // stone lantern
          const st = mat(0xb8b0a8);
          P(1, 0.3, 1, st, 0, 0.15, 0); P(0.4, 1.4, 0.4, st, 0, 1, 0); P(1.1, 0.3, 1.1, st, 0, 1.85, 0);
          P(0.6, 0.6, 0.6, glow(0xffd8a0), 0, 2.3, 0); M(new THREE.ConeGeometry(0.9, 0.6, 4), st, 0, 2.9, 0).rotation.y = Math.PI / 4;
        } else if (v < 0.88) { // azalea bush
          for (let i = 0; i < 3; i++) M(new THREE.SphereGeometry(0.8, 8, 6), mat(i ? 0xff7ab0 : 0x5a9a4a), (i - 1) * 0.7, 0.6, (i % 2) * 0.4);
        } else { // fallen petals
          for (let i = 0; i < 6; i++) P(0.3, 0.04, 0.3, mat(0xffc8dc), (rnd() - 0.5) * 3, 0.03, (rnd() - 0.5) * 3, { ry: rnd() * 3, shadow: false });
        }
        break;
      case 'heaven':
        if (v < 0.45) { const cl = new THREE.Group(); grp.add(cl); for (let i = 0; i < 4; i++) mesh(cl, new THREE.SphereGeometry(1.1 + (i % 2) * 0.5, 10, 8), mat(i % 2 ? 0xfff4d0 : 0xffffff), (i - 1.5) * 1.2, 0.8 + (i % 2) * 0.4, (i % 2) * 0.6); animProps.push((t) => (cl.position.y = Math.sin(t * 0.8 + x) * 0.25)); }
        else if (v < 0.75) { const h = 4 + v * 4; M(new THREE.CylinderGeometry(0.5, 0.5, h, 12), mat(0xffffff), 0, h / 2, 0); P(1.4, 0.4, 1.4, mat(0xffd23f, 0.2), 0, h + 0.2, 0); const o = M(new THREE.OctahedronGeometry(0.5), glow(0xfff2a8), 0, h + 1.2, 0); animProps.push((t) => (o.rotation.y = t * 2)); }
        else { const hl = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.1, 6, 20), glow(0xffd700)); hl.position.y = 2.5; grp.add(hl); animProps.push((t) => { hl.rotation.x = t; hl.position.y = 2.5 + Math.sin(t * 2 + x) * 0.4; }); }
        break;
    }
    const box = new THREE.Box3().setFromObject(grp), size = box.getSize(new THREE.Vector3());
    if (size.y > 2.2) {
      const r = Math.max(size.x, size.z) / 2;
      occluders.push({ grp, x, z, r, faded: false });
      addCollider(x / U, z / U, Math.max(14, (r * 0.45) / U), true);
    }
  }

  // Props standing between the camera and the player fade out (like Roblox's camera occlusion).
  const occluders = [], fadeCache = new Map();
  function fadeMat(m) {
    if (!fadeCache.has(m)) { const f = m.clone(); f.transparent = true; f.opacity = 0.22; f.depthWrite = false; fadeCache.set(m, f); }
    return fadeCache.get(m);
  }
  function setFaded(obj, block) {
    if (!!obj.userData.faded === block) return;
    obj.userData.faded = block;
    obj.traverse((m) => {
      if (!m.isMesh) return;
      if (block) { m.userData.solid = m.material; m.material = fadeMat(m.material); }
      else if (m.userData.solid) m.material = m.userData.solid;
    });
  }
  // Is a point (x,z in studs) with radius r between the camera and the player?
  function blocksView(x, z, r) {
    const px = player.x * U, pz = player.y * U, cx = camera.position.x, cz = camera.position.z;
    const sx = px - cx, sz = pz - cz, L2 = sx * sx + sz * sz || 1;
    const t = ((x - cx) * sx + (z - cz) * sz) / L2;
    return t > -0.05 && t < 0.97 && Math.hypot(cx + sx * t - x, cz + sz * t - z) < r + 1.4;
  }
  function updateOccluders() {
    const px = player.x * U, pz = player.y * U, cx = camera.position.x, cz = camera.position.z;
    const sx = px - cx, sz = pz - cz, L2 = sx * sx + sz * sz || 1;
    for (const o of occluders) {
      const t = ((o.x - cx) * sx + (o.z - cz) * sz) / L2;
      const block = t > -0.05 && t < 0.97 && Math.hypot(cx + sx * t - o.x, cz + sz * t - o.z) < o.r + 1.4;
      if (block === o.faded) continue;
      o.faded = block;
      o.grp.traverse((m) => {
        if (!m.isMesh) return;
        if (block) { m.userData.solid = m.material; m.material = fadeMat(m.material); m.castShadow = true; }
        else if (m.userData.solid) m.material = m.userData.solid;
      });
    }
  }

  function backdrop(g, Z, x0, W, rnd) {
    for (let i = 0; i < 16; i++) {
      const back = i < 8, x = x0 + ((i % 8) + 0.5) * (W / 8) + (rnd() - 0.5) * 4, h = 10 + rnd() * 16, w = 8 + rnd() * 8;
      const z = back ? -6 - rnd() * 14 : DEPTH + 6 + rnd() * 14;
      if (Z.deco === 'volcano' && (i === 3 || i === 12)) {
        const zz = z + (back ? -10 : 10);
        mesh(g, new THREE.CylinderGeometry(4, 16, 26, 8), mat(0x2a1a17), x, 13, zz);
        mesh(g, new THREE.CylinderGeometry(3.6, 3.6, 0.5, 8), glow(0xff5a00), x, 26.1, zz);
        continue;
      }
      if (Z.deco === 'cosmic') {
        mesh(g, new THREE.SphereGeometry(2 + rnd() * 4, 12, 8), mat([0x7a5cff, 0x33aaff, 0xff66cc][i % 3], 0.3), x, 14 + rnd() * 12, z + (back ? -12 : 12));
        continue;
      }
      if (Z.deco === 'sky' || Z.deco === 'heaven') { // cloud banks instead of mountains
        for (let k = 0; k < 4; k++) mesh(g, new THREE.SphereGeometry(4 + rnd() * 4, 12, 8), mat(Z.deco === 'heaven' && k % 2 ? 0xfff0c8 : 0xffffff), x + (k - 1.5) * 5, 2 + rnd() * 6, z + (back ? -4 : 4)).castShadow = false;
        continue;
      }
      if (Z.deco === 'crystal' && i % 3 === 0) {
        const c = mesh(g, new THREE.OctahedronGeometry(4), mat([0xff66ee, 0x9af4ff, 0xb46cff][i % 3 === 0 ? (i / 3) % 3 : 0], 0.5), x, 10 + rnd() * 6, z + (back ? -6 : 6));
        c.scale.set(1, 3, 1); continue;
      }
      const col = new THREE.Color(Z.edge).lerp(new THREE.Color(Z.sky), 0.35);
      part(g, w, h, 8, new THREE.MeshLambertMaterial({ color: col }), x, h / 2 - 1, z, { shadow: false, ry: (rnd() - 0.5) * 0.5 });
      if (Z.deco === 'snow') part(g, w + 0.2, 2, 8.2, mat(0xffffff), x, h - 1.5, z, { shadow: false });
    }
    if (Z.deco === 'cosmic' || Z.deco === 'abyss' || Z.deco === 'shadow' || Z.deco === 'fairy' || Z.deco === 'heaven' || Z.deco === 'blossom') {
      const n = 500, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { pos[i * 3] = x0 + rnd() * W; pos[i * 3 + 1] = 2 + rnd() * 40; pos[i * 3 + 2] = -30 + rnd() * (DEPTH + 60); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pc = { cosmic: 0xffffff, abyss: 0x88ddff, shadow: 0xb000ff, fairy: 0xffe066, heaven: 0xfff2a8, blossom: 0xffb7d5 }[Z.deco];
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: pc, size: Z.deco === 'abyss' ? 0.25 : 0.35, transparent: true, opacity: 0.8 }));
      g.add(pts);
      if (Z.deco === 'abyss' || Z.deco === 'heaven') animProps.push((t) => (pts.position.y = (t * 1.5) % 10));
      if (Z.deco === 'fairy' || Z.deco === 'shadow') animProps.push((t) => (pts.position.y = Math.sin(t * 0.6) * 2));
      if (Z.deco === 'blossom') animProps.push((t) => { pts.position.y = -((t * 1.2) % 10); pts.position.x = Math.sin(t * 0.4) * 3; });
    }
  }

  const gardenGroup = buildGarden();
  buildSlots(gardenGroup);
  ZONES.forEach((_, z) => buildZone(z));

  const gates = ZONES.map((Z, z) => {
    if (!z) return null;
    const x = zoneX(z) * U;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(DEPTH, 14), new THREE.MeshBasicMaterial({ color: 0xff2a4a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.y = Math.PI / 2; m.position.set(x, 7, DEPTH / 2); scene.add(m);
    part(scene, 1.2, 14, 1.2, mat(0x30343c), x, 7, 0.5);
    const labs = [-1, 1].map((side) => {
      const lab = makeLabel(`LOCKED: ${Z.name}\nNeed ${fmt(Z.req)} speed${Z.final ? '\n★ FINAL LEVEL ★' : ''}`, { size: 52, h: 1.3, color: '#ff6a7a', color2: '#ffffff', bg: 'rgba(20,0,8,.6)' });
      lab.position.set(x - 0.5, 5, SPAWN.y * U + side * 16); scene.add(lab); return lab;
    });
    return { m, labs };
  });

  // ---------------- Actors ----------------
  const player = { x: SPAWN.x, y: SPAWN.y, r: 20, face: Math.PI / 2, moving: false, carrying: null, flying: null, boost: 0, z: 0, vz: 0 };
  const pedestals = [];
  const guardians = [];

  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const eggGeo = new THREE.SphereGeometry(0.85, 16, 12);
  function eggMesh(r, size = 1) {
    const R = RARITIES[r];
    const g = new THREE.Group();
    const m = new THREE.Mesh(eggGeo, new THREE.MeshStandardMaterial({ color: R.hex, roughness: 0.35, metalness: 0.1, emissive: R.hex, emissiveIntensity: r >= 3 ? 0.35 : 0.05, flatShading: true }));
    m.scale.set(size, 1.3 * size, size); m.castShadow = true; g.add(m);
    const spotM = mat(new THREE.Color(R.hex).multiplyScalar(0.55).getHex());
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1, y = (i - 1) * 0.45 * size;
      const sp = new THREE.Mesh(boxG(0.3, 0.3, 0.1), spotM);
      sp.scale.setScalar(size); sp.position.set(Math.cos(a) * 0.8 * size, y, Math.sin(a) * 0.8 * size); sp.lookAt(0, y, 0); g.add(sp);
    }
    if (r >= 2) {
      const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: R.hex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4 + r * 0.1 }));
      gs.scale.setScalar(3.5 * size + r * 0.4); g.add(gs);
    }
    if (r === DIVINE) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.25 * size, 0.09, 6, 28), glow(0xffd700));
      halo.rotation.x = Math.PI / 2; halo.position.y = 1.5 * size; g.add(halo);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6 * size, 0.06, 6, 28), glow(0xffffff));
      ring.rotation.x = 1.2; g.add(ring);
      g.userData.spin = (t) => { ring.rotation.z = t * 2; ring.rotation.x = 1.2 + Math.sin(t) * 0.3; m.material.emissive.setHSL((t * 0.15) % 1, 0.8, 0.35); };
    }
    g.userData.rarity = r;
    return g;
  }

  // Trail ribbon: a fading band of light behind you while you run, coloured by the equipped trail.
  const TRAIL_N = 44, TRAIL_LIFE = 0.6;
  const trail = (() => {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(TRAIL_N * 6), col = new Float32Array(TRAIL_N * 6), idx = [];
    for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
    const ribbon = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ribbon.frustumCulled = false; ribbon.renderOrder = 2; scene.add(ribbon);
    const sg = new THREE.BufferGeometry(), sp = new Float32Array(TRAIL_N * 3), sc = new Float32Array(TRAIL_N * 3);
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.7, map: glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sparks.frustumCulled = false; sparks.renderOrder = 2; scene.add(sparks);
    return { geo, pos, col, ribbon, sg, sp, sc, sparks, pts: [] };
  })();
  const trailColor = new THREE.Color(), trailC2 = new THREE.Color();
  function trailGradient(T2, k, t) {
    const c = T2.c, f = Math.min(0.999, k) * (c.length - 1), i = Math.floor(f);
    trailColor.set(c[i]).lerp(trailC2.set(c[i + 1]), f - i);
    if (T2.n === 'Galaxy Trail' || T2.n === 'Omega Trail') trailColor.offsetHSL(Math.sin(t * 2 + k * 4) * 0.08, 0, 0);
    return trailColor;
  }
  function updateTrail(t) {
    const T2 = S.trail >= 0 ? TRAILS[S.trail] : null, pts = trail.pts;
    const running = T2 && started && !player.flying && (player.moving || player.z > 0);
    if (running) {
      const gy = player.z * 0.85, last = pts[0];
      if (!last || Math.hypot(last.x - player.x * U, last.z - player.y * U) > 0.12 || t - last.t > 0.05)
        pts.unshift({ x: player.x * U, z: player.y * U, y: gy, t, jx: Math.random() - 0.5, jy: Math.random(), jz: Math.random() - 0.5 });
      else { last.y = gy; last.t = t; }
    }
    while (pts.length && (pts.length > TRAIL_N || t - pts[pts.length - 1].t > TRAIL_LIFE)) pts.pop();
    trail.ribbon.visible = trail.sparks.visible = !!T2 && pts.length > 1;
    if (!trail.ribbon.visible) return;
    const { pos, col, sp, sc } = trail, tier = S.trail;
    const w = 0.75 + tier * 0.06;
    for (let i = 0; i < TRAIL_N; i++) {
      const p = pts[Math.min(i, pts.length - 1)], k = Math.min(1, (t - p.t) / TRAIL_LIFE), fade = i < pts.length ? (1 - k) ** 1.4 : 0;
      const mid = p.y + 2.1, hw = w * (1 - k * 0.65);
      pos.set([p.x, mid - hw, p.z, p.x, mid + hw, p.z], i * 6);
      const cc = trailGradient(T2, k, t);
      col.set([cc.r * fade, cc.g * fade, cc.b * fade, cc.r * fade, cc.g * fade, cc.b * fade], i * 6);
      const sf = T2.sparkle ? fade * (0.6 + 0.4 * Math.sin(t * 20 + i * 1.7)) : 0;
      sp.set([p.x + p.jx * (0.6 + k * 1.8), mid + (p.jy - 0.5) * 2.4 + k * 0.8, p.z + p.jz * (0.6 + k * 1.8)], i * 3);
      sc.set([Math.min(1, cc.r + 0.4) * sf, Math.min(1, cc.g + 0.4) * sf, Math.min(1, cc.b + 0.4) * sf], i * 3);
    }
    trail.geo.attributes.position.needsUpdate = trail.geo.attributes.color.needsUpdate = true;
    trail.sg.attributes.position.needsUpdate = trail.sg.attributes.color.needsUpdate = true;
  }

  ZONES.forEach((Z, z) => {
    const L = LAYOUTS[z];
    L.peds.forEach(({ x, y, tier }) => {
      const p = { zone: z, tier, x, y, egg: null, respawn: 0, q: null };
      p.egg = { rarity: rollEgg(p) };
      addCollider(x, y, 30);
      const g = new THREE.Group(); g.position.set(p.x * U, tier === 3 ? 0.4 : 0, p.y * U); scene.add(g);
      mesh(g, new THREE.CylinderGeometry(1.5, 1.8, 1.2, 8), mat(tier === 3 ? 0xc9a64a : 0x6c7078), 0, 0.6, 0);
      if (tier === 3) for (let i = 0; i < 4; i++) part(g, 0.4, 2.2, 0.4, glow(0xffd23f), Math.cos(i * 1.57 + 0.78) * 1.9, 1.1, Math.sin(i * 1.57 + 0.78) * 1.9, { shadow: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.1, 6, 24), glow(0xffffff)); ring.rotation.x = Math.PI / 2; ring.position.y = 1.15; g.add(ring);
      const label = makeLabel('', { size: 44, h: 0.75 }); label.position.y = 4.4; g.add(label);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 120, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
      beam.position.y = 60; beam.visible = false; g.add(beam);
      p.view = { g, ring, label, egg: null, beam };
      pedestals.push(p);
    });
    const way = L.way, home = L.home;
    const model = Models.build(Z.guard.spec);
    const targetH = Z.final ? 22 : 10 + z * 0.5;
    model.scale.setScalar(targetH / model.userData.height);
    const g = new THREE.Group(); g.add(model); g.position.set(home.x * U, 0, home.y * U); scene.add(g);
    const label = makeLabel(Z.guard.n, { size: 48, h: 1.0, color: '#ff8a8a', depthTest: false }); label.position.y = targetH + 1.6; g.add(label);
    const aura = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.8, 32), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    aura.rotation.x = -Math.PI / 2; aura.position.y = 0.08; g.add(aura);
    const dazeStars = new THREE.Group(); dazeStars.position.y = targetH + 0.4; g.add(dazeStars);
    for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), glow(0xffe14a)); st.position.set(Math.cos(i * 2.1) * 1.6, 0, Math.sin(i * 2.1) * 1.6); dazeStars.add(st); }
    guardians.push({ zone: z, x: home.x, y: home.y, home, way, wi: 1, mode: 'patrol', daze: 0, lunge: 0, pause: 0, burst: 0, burstCd: 2, side: 1, unstick: 0, prog: 1, wpT: 0,
      view: { g, model, label, aura, dazeStars, h: targetH }, rot: 0, moving: false });
  });

  // Roblox-style player avatar
  const avatar = (() => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const yellow = mat(0xf5cd30), blue = mat(0x0d69ac), green = mat(0x4b974b);
    const legs = [-0.5, 0.5].map((x) => { const p = new THREE.Group(); p.position.set(x, 2, 0); body.add(p); part(p, 0.98, 2, 1, green, 0, -1, 0); return p; });
    part(body, 2, 2, 1, blue, 0, 3, 0);
    const arms = [-1.5, 1.5].map((x) => { const p = new THREE.Group(); p.position.set(x, 3.9, 0); body.add(p); part(p, 0.98, 2, 1, yellow, 0, -1, 0); return p; });
    mesh(body, new THREE.CylinderGeometry(0.62, 0.62, 1.2, 20), yellow, 0, 4.65, 0);
    const fc = document.createElement('canvas'); fc.width = fc.height = 64;
    const f = fc.getContext('2d'); f.fillStyle = '#111';
    f.beginPath(); f.ellipse(22, 24, 4, 7, 0, 0, 7); f.ellipse(42, 24, 4, 7, 0, 0, 7); f.fill();
    f.lineWidth = 4; f.strokeStyle = '#111'; f.beginPath(); f.arc(32, 32, 16, 0.25 * Math.PI, 0.75 * Math.PI); f.stroke();
    const faceM = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fc), transparent: true }));
    faceM.position.set(0, 4.65, 0.63); body.add(faceM);
    g.scale.setScalar(0.85);
    scene.add(g);
    return { g, body, legs, arms, alt: null };
  })();
  // Imported characters with a skeleton (avatar.rig) swing their limbs; the rest hop, lean and waddle.
  function setCharacter(id) {
    const C = CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
    if (avatar.alt) { avatar.g.remove(avatar.alt); avatar.alt = null; avatar.rig = null; }
    avatar.body.visible = !C.model;
    if (!C.model) return;
    const m = Models.build(C.spec);
    m.scale.setScalar(5.4 / m.userData.height); // about as tall as the classic avatar
    const pivot = new THREE.Group(); pivot.add(m); avatar.g.add(pivot);
    avatar.alt = pivot;
    avatar.rig = m.userData.body.userData.rig || null;
  }
  // Pose a skeleton: sw = stride swing (-1..1), c = its pace (cos of the stride), mv = walking.
  function poseRig(r, t, { sw, c, mv, carrying, air, flying }) {
    const breathe = Math.sin(t * 2) * 0.03, knee = 0.9;
    r.set('Hips', 0, mv ? sw * 0.12 : 0, 0);
    r.set('Spine', mv ? 0.06 : breathe, mv ? -sw * 0.1 : 0, 0);
    r.set('Spine2', mv ? 0.04 : breathe, mv ? -sw * 0.08 : 0, 0);
    r.set('Head', mv ? -0.05 : Math.sin(t * 0.7) * 0.05, mv ? sw * 0.08 : Math.sin(t * 0.45) * 0.15, 0);
    // legs: negative x swings the foot forward; knees bend while the leg travels forward
    let lL = -sw, lR = sw, kL = mv ? Math.max(0, c) * knee : 0, kR = mv ? Math.max(0, -c) * knee : 0;
    if (air) { lL = -0.6; lR = 0.25; kL = 0.9; kR = 0.5; }
    if (flying) { lL = lR = 0.15; kL = kR = 0.25; }
    r.set('LeftUpLeg', lL, 0, 0); r.set('RightUpLeg', lR, 0, 0);
    r.set('LeftLeg', kL, 0, 0); r.set('RightLeg', kR, 0, 0);
    r.set('LeftFoot', -kL * 0.4, 0, 0); r.set('RightFoot', -kR * 0.4, 0, 0);
    // arms swing against the legs; up overhead to carry an egg, wide when flying
    let aL = sw * 0.9, aR = -sw * 0.9, zL = 0.08 + breathe, zR = -0.08 - breathe, eL = -0.25, eR = -0.25;
    if (mv) { eL = eR = -0.45; }
    if (air) { aL = aR = -2.5; zL = 0.3; zR = -0.3; eL = eR = 0; }
    if (carrying) { aL = aR = -2.9; zL = 0.25; zR = -0.25; eL = eR = -0.3; }
    if (flying) { aL = aR = 0; zL = 1.3; zR = -1.3; eL = eR = 0; }
    r.set('LeftArm', aL, 0, zL - r.armDrop); r.set('RightArm', aR, 0, zR + r.armDrop);
    r.set('LeftForeArm', eL, 0, 0); r.set('RightForeArm', eR, 0, 0);
  }
  let carryEgg = null;

  // ---------------- Effects ----------------
  const floaters = [], particles = [];
  function floater(x, y, text, color = '#ffffff', size = 1, height = 6) {
    const sp = makeLabel(text, { size: 64, h: size, color, depthTest: false });
    sp.position.set(x * U, height, y * U); scene.add(sp);
    floaters.push({ sp, t: 0, life: 1.5 });
  }
  function burst(x, y, color, n = 16, height = 2) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(boxG(0.35, 0.35, 0.35), glow(color));
      m.position.set(x * U, height, y * U); scene.add(m);
      const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 7;
      particles.push({ m, vx: Math.cos(a) * v, vy: 6 + Math.random() * 8, vz: Math.sin(a) * v, t: 0, life: 0.7 + Math.random() * 0.5 });
    }
  }

  let shake = 0, paused = true, started = false, muted = false;
  let activePed = null, currentQ = null, usedHint = false, quizId = 0;
  let msgCooldown = 0, stepT = 0, beatT = 0, lastTick = -1;
  let treadStart = 0, feltSpeed = 0, wasInShop = false;
  const studs = (pxs) => (pxs * U).toFixed(1);

  // ---------------- Audio ----------------
  let actx = null;
  function tone(f, dur = 0.12, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* no audio */ }
  }
  // Filtered noise bursts (footsteps, whooshes, cracks, coins).
  let noiseBuf = null;
  function noise(dur = 0.1, vol = 0.15, freq = 1000, q = 1, kind = 'bandpass', delay = 0, toFreq = 0) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (!noiseBuf) {
        noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const t = actx.currentTime + delay, src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
      src.buffer = noiseBuf; f.type = kind; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
      if (toFreq) f.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(actx.destination); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
    } catch (e) { /* no audio */ }
  }
  // A short "voice": sawtooth through two formant filters (for the classic "oof").
  function voice(f0, f1, dur, vol, formants, delay = 0) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain(), out = actx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      formants.forEach(([ff, q]) => { const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q; g.connect(bp).connect(out); });
      out.gain.value = 2.2; out.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* no audio */ }
  }
  const sfx = {
    // Roblox-style classic sounds, synthesized: springy jump, soft land, footsteps, "oof", coin chimes…
    jump: () => { tone(260, 0.18, 'square', 0.05, 340); tone(390, 0.22, 'sine', 0.09, 420, 0.02); noise(0.12, 0.05, 2500, 0.8, 'highpass'); },
    land: () => { noise(0.09, 0.14, 300, 1, 'lowpass'); tone(90, 0.08, 'sine', 0.08, -30); },
    step: (kind) => kind === 'snow' ? noise(0.08, 0.09, 3500, 1.5, 'bandpass')
      : kind === 'sand' ? noise(0.07, 0.07, 2200, 1, 'bandpass')
      : noise(0.05, 0.08, 900 + Math.random() * 300, 1.2, 'bandpass'),
    oof: () => voice(300, 160, 0.32, 0.5, [[650, 6], [1100, 8]]),
    coin: () => { tone(1568, 0.07, 'square', 0.04); tone(2093, 0.18, 'square', 0.04, 0, 0.06); },
    cash: () => { noise(0.05, 0.1, 5000, 1, 'highpass'); [1318, 1760, 2637].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, 0, 0.05 + i * 0.06)); },
    grab: () => { tone(520, 0.08, 'sine', 0.14, 500); tone(1040, 0.1, 'triangle', 0.08, 300, 0.07); },
    crack: () => { noise(0.05, 0.2, 3000, 2, 'bandpass'); noise(0.06, 0.18, 2200, 2, 'bandpass', 0.09); },
    whoosh: () => noise(0.35, 0.12, 400, 1.2, 'bandpass', 0, 3000),
    heartbeat: () => { tone(60, 0.12, 'sine', 0.22, -15); tone(55, 0.12, 'sine', 0.16, -15, 0.16); },
    tick: () => tone(1400, 0.04, 'square', 0.04),
    faster: () => { tone(660, 0.1, 'triangle', 0.07, 300); tone(990, 0.14, 'triangle', 0.06, 400, 0.08); noise(0.25, 0.06, 800, 1, 'bandpass', 0, 4000); },
    equip: () => { [880, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'sine', 0.07, 0, i * 0.05)); noise(0.4, 0.06, 1500, 1, 'bandpass', 0, 6000); },
    right: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.15, 0, i * 0.08)),
    wrong: () => { tone(220, 0.25, 'sawtooth', 0.12, -80); tone(160, 0.35, 'sawtooth', 0.12, -60, 0.18); },
    smack: () => { tone(110, 0.35, 'square', 0.25, -80); tone(900, 0.5, 'sine', 0.1, -800, 0.05); },
    hatch: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.12, 'sine', 0.12, 0, i * 0.07)),
    buy: () => { tone(880, 0.08, 'square', 0.08); tone(1320, 0.12, 'square', 0.08, 0, 0.07); },
    roar: () => { tone(90, 0.7, 'sawtooth', 0.14, 50); tone(70, 0.8, 'square', 0.06, 30, 0.05); },
    place: () => tone(600, 0.1, 'triangle', 0.12, 200),
    boost: () => { tone(400, 0.25, 'triangle', 0.1, 600); tone(800, 0.2, 'sine', 0.06, 600, 0.06); noise(0.35, 0.1, 500, 1.2, 'bandpass', 0, 4000); },
    growl: () => tone(70, 0.45, 'sawtooth', 0.1, 40),
    divine: () => [523, 784, 1046, 1318, 1568, 2093].forEach((f, i) => tone(f, 0.5, 'sine', 0.1, 0, i * 0.11)),
    night: () => { tone(330, 0.8, 'sine', 0.08, -120); tone(247, 1.0, 'sine', 0.07, -80, 0.25); },
    dawn: () => [392, 523, 659].forEach((f, i) => tone(f, 0.35, 'triangle', 0.08, 0, i * 0.12)),
  };

  // ---------------- UI helpers ----------------
  function toast(text, cls = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + cls; el.textContent = text;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3100);
  }
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const stars = (d) => '★'.repeat(Math.ceil(d / 2)) + '☆'.repeat(5 - Math.ceil(d / 2));
  const petPortrait = (z, r) => Models.portrait(ZONES[z].pets[r].spec, `p${z}:${r}`, { tier: r, color: RARITIES[r].hex });
  const guardPortrait = (z) => Models.portrait(ZONES[z].guard.spec, `g${z}`);

  // ---------------- Menu ----------------
  function buildMenu() {
    const box = $('levels'); box.innerHTML = '';
    MathGen.LEVELS.forEach((L, i) => {
      const b = document.createElement('button');
      b.className = 'level' + (hasSave && S.level === i ? ' current' : '');
      const ex = MathGen.gen(i, 6).text;
      b.innerHTML = `<span class="em">${L.emoji}</span><b>${L.name}</b><small>${L.ages}</small><small>${L.desc}</small><div class="ex">${ex}</div>`;
      b.onclick = () => startGame(i);
      box.appendChild(b);
    });
    const r = $('bReset');
    r.hidden = !hasSave; r.textContent = 'Reset all progress'; r.dataset.armed = '';
    const strip = $('menuBeasts');
    if (!strip.childElementCount) ZONES.forEach((Z, z) => { const im = new Image(); im.src = guardPortrait(z); im.title = Z.guard.n; strip.appendChild(im); });
  }
  $('bReset').onclick = (e) => {
    const r = e.currentTarget;
    if (!r.dataset.armed) { r.dataset.armed = '1'; r.textContent = 'Are you sure? Click again to erase everything'; return; }
    S = fresh(); hasSave = false; save(); player.carrying = null; setCharacter(S.character); buildMenu();
  };
  function startGame(level) {
    if (hasSave && S.level !== level) toast(`Math level changed to ${MathGen.LEVELS[level].name}`, 'gold');
    S.level = level; hasSave = true; started = true; feltSpeed = runSpeed();
    pedestals.forEach((p) => (p.q = null));
    $('menu').hidden = true; $('hud').hidden = false; paused = false;
    save();
    if (S.stats.correct + S.stats.wrong === 0) toast('Follow the path into the Haunted Forest and steal an egg!', 'gold');
  }
  $('bMenu').onclick = () => { paused = true; buildMenu(); $('menu').hidden = false; };
  $('bMute').onclick = (e) => { muted = !muted; e.currentTarget.textContent = muted ? '🔇' : '🔊'; };

  // ---------------- Shop ----------------
  function renderShop() {
    const items = [
      { ic: '🏃', name: `Treadmill level ${S.treadLvl + 1}`, desc: `Train faster: ${fmtD(treadGain(S.treadLvl))} → ${fmtD(treadGain(S.treadLvl + 1))} speed/s while standing on it`, cost: treadCost(S.treadLvl),
        buy: () => { S.treadLvl++; } },
      S.slotsUnlocked < MAX_SLOTS
        ? { ic: '🧱', name: `Base plot #${S.slotsUnlocked + 1}`, desc: 'Room for one more creature', cost: slotCost(S.slotsUnlocked), buy: () => { S.slotsUnlocked++; } }
        : { ic: '🧱', name: 'Base is max size', desc: 'All 12 plots unlocked', cost: null },
    ];
    const box = $('shopItems'); box.innerHTML = '';
    items.forEach((it) => {
      const row = document.createElement('div'); row.className = 'shop-item';
      row.innerHTML = `<div class="ic">${it.ic}</div><div class="tx"><b>${it.name}</b><small>${it.desc}</small></div>`;
      const b = document.createElement('button'); b.className = 'primary';
      if (it.cost === null) { b.textContent = 'MAX'; b.disabled = true; }
      else {
        b.textContent = '$' + fmt(it.cost); b.disabled = S.money < it.cost;
        b.onclick = () => { if (S.money < it.cost) return; S.money -= it.cost; it.buy(); sfx.buy(); save(); renderShop(); };
      }
      row.appendChild(b); box.appendChild(row);
    });
    const tr = document.createElement('div'); tr.className = 'shop-item';
    tr.innerHTML = `<div class="ic">✨</div><div class="tx"><b>Trails</b><small>Run up to ×${TRAILS[TRAILS.length - 1].mult} faster. Also sold at the glowing TRAILS SHOP circle in your base.</small></div>`;
    const tb = document.createElement('button'); tb.className = 'primary'; tb.textContent = 'OPEN';
    tb.onclick = () => { $('shop').hidden = true; openTrails(); };
    tr.appendChild(tb); box.appendChild(tr);
    const tip = document.createElement('p'); tip.className = 'sub';
    tip.textContent = 'Correct answers also give cash and speed. Answer streaks give bonus cash!';
    box.appendChild(tip);
  }
  $('bShop').onclick = () => { paused = true; renderShop(); $('shop').hidden = false; };

  // ---------------- Trails shop ----------------
  const hexCss = (h) => '#' + h.toString(16).padStart(6, '0');
  function renderTrails() {
    const box = $('trailItems'); box.innerHTML = '';
    $('trailNow').textContent = `Run speed: ${studs(runSpeed())} studs/s` + (S.trail >= 0 ? ` (${TRAILS[S.trail].n}, ×${TRAILS[S.trail].mult})` : ' (no trail)');
    TRAILS.forEach((T2, i) => {
      const owned = S.trails.includes(i), on = S.trail === i;
      const row = document.createElement('div'); row.className = 'shop-item trail' + (on ? ' on' : '');
      const sw = document.createElement('div'); sw.className = 'swatch';
      sw.style.background = `linear-gradient(90deg, ${T2.c.map(hexCss).join(', ')})`;
      const tx = document.createElement('div'); tx.className = 'tx';
      const nm = document.createElement('b'); nm.textContent = T2.n; nm.style.color = T2.col;
      const sm = document.createElement('small');
      sm.textContent = `${T2.rar} · ×${T2.mult} run speed → ${studs(moveSpeed(S.speed) * T2.mult)} studs/s`;
      tx.append(nm, sm);
      const b = document.createElement('button'); b.className = 'primary';
      if (owned) {
        b.textContent = on ? 'UNEQUIP' : 'EQUIP';
        if (on) b.classList.add('ghost');
        b.onclick = () => { S.trail = on ? -1 : i; if (!on) { sfx.equip(); toast(`✨ ${T2.n} equipped: ×${T2.mult} speed!`, 'gold'); } feltSpeed = runSpeed(); save(); renderTrails(); };
      } else {
        b.textContent = '$' + fmt(T2.cost); b.disabled = S.money < T2.cost;
        b.onclick = () => {
          if (S.money < T2.cost || S.trails.includes(i)) return;
          S.money -= T2.cost; S.trails.push(i); S.trails.sort((a, c) => a - c);
          if (S.trail < i) S.trail = i; // auto-equip if it's better than what you're wearing
          feltSpeed = runSpeed(); sfx.buy(); sfx.equip(); toast(`✨ Bought the ${T2.n}! ×${T2.mult} speed`, 'gold'); save(); renderTrails();
        };
      }
      row.append(sw, tx, b); box.appendChild(row);
    });
  }
  // ---------------- Characters ----------------
  function renderChars() {
    const box = $('charItems'); box.innerHTML = '';
    CHARACTERS.forEach((C) => {
      const on = S.character === C.id;
      const card = document.createElement('button'); card.className = 'char-card' + (on ? ' on' : '');
      const im = new Image(); im.alt = ''; im.src = Models.portrait(C.spec, 'char:' + C.id);
      const nm = document.createElement('b'); nm.textContent = C.n;
      const ds = document.createElement('small'); ds.textContent = on ? '✔ Playing' : C.desc;
      card.append(im, nm, ds);
      card.onclick = () => { if (on) return; S.character = C.id; setCharacter(C.id); sfx.equip(); toast(`You are now playing as ${C.n}!`, 'gold'); save(); renderChars(); };
      box.appendChild(card);
    });
  }
  $('bChar').onclick = () => { paused = true; keys.clear(); renderChars(); $('charPick').hidden = false; };

  function openTrails() { paused = true; keys.clear(); renderTrails(); $('trailShop').hidden = false; }

  // ---------------- Index ----------------
  function renderIndex() {
    let found = 0;
    let html = '<table><tr><th></th>' + RARITIES.map((r) => `<th style="color:${r.color}">${r.name}</th>`).join('') + '</tr>';
    ZONES.forEach((Z, z) => {
      html += `<tr><th>${Z.name}<br><small>${Z.req ? fmt(Z.req) + ' speed' : 'start'}</small></th>`;
      Z.pets.forEach((p, r) => {
        const got = S.discovered[z + ':' + r];
        if (got) found++;
        html += `<td><div class="pcell ${got ? '' : 'unk'}" style="border-color:${RARITIES[r].color}"><img src="${petPortrait(z, r)}" alt="">${got ? p.n : '???'}<br><small>$${fmt(income(z, r))}/s</small></div></td>`;
      });
      html += '</tr>';
    });
    $('indexGrid').innerHTML = html + '</table>';
    const st = S.stats, tot = st.correct + st.wrong;
    $('indexStats').innerHTML = `Discovered <b>${found}/${ZONES.length * RARITIES.length}</b> creatures · Math: <b>${st.correct}</b> right, <b>${st.wrong}</b> wrong` +
      (tot ? ` (${Math.round((100 * st.correct) / tot)}% accuracy)` : '') + ` · Best streak <b>${st.best}</b>`;
  }
  $('bIndex').onclick = () => { paused = true; renderIndex(); $('index').hidden = false; };
  document.querySelectorAll('.overlay .close').forEach((b) => (b.onclick = () => { b.closest('.overlay').hidden = true; paused = false; }));

  // ---------------- Quiz ----------------
  function openQuiz(ped) {
    if (!ped.q) ped.q = MathGen.gen(S.level, difficulty(ped.zone, ped.egg.rarity));
    activePed = ped; currentQ = ped.q; usedHint = false; quizId++; paused = true; keys.clear();
    const Z = ZONES[ped.zone], R = RARITIES[ped.egg.rarity];
    $('qMonster').src = guardPortrait(ped.zone);
    $('qTitle').textContent = ped.isDrop ? `Solve it to grab ${Z.guard.n}'s egg back!` : `${Z.guard.n} blocks your way!`;
    $('qEgg').innerHTML = `Guarding a <b style="color:${R.color}">${R.name}</b> egg · Difficulty <span class="stars">${stars(currentQ.difficulty)}</span>`;
    const qt = $('qText'); qt.textContent = currentQ.text; qt.classList.toggle('long', currentQ.text.length > 40);
    $('qAnswerArea').hidden = false; $('qResult').hidden = true; $('qHintText').hidden = true;
    const choices = !!currentQ.choices;
    $('qChoices').hidden = !choices; $('qForm').hidden = choices; $('qPad').hidden = choices || !isTouch; $('qHint').hidden = choices;
    if (choices) {
      const box = $('qChoices'); box.innerHTML = '';
      currentQ.choices.forEach((c) => {
        const b = document.createElement('button'); b.textContent = c; b.onclick = () => answer(c, String(c)); box.appendChild(b);
      });
    } else {
      $('qInput').value = '';
      $('qInput').readOnly = isTouch;
      if (!isTouch) setTimeout(() => $('qInput').focus(), 30);
    }
    $('quiz').hidden = false;
    sfx.roar();
  }

  ['7', '8', '9', '/', '⌫', '4', '5', '6', '−', '.', '1', '2', '3', '0', '✔'].forEach((k) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = k;
    if (k === '✔') b.className = 'ok';
    b.onclick = () => {
      const inp = $('qInput');
      if (k === '⌫') inp.value = inp.value.slice(0, -1);
      else if (k === '✔') $('qForm').requestSubmit();
      else inp.value += k;
    };
    $('qPad').appendChild(b);
  });

  $('qForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('qInput').value;
    if (!isFinite(MathGen.parse(v))) { $('qInput').animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 200); return; }
    answer(MathGen.parse(v), v);
  });
  $('qHint').onclick = () => {
    usedHint = true;
    const ex = currentQ.explain, ans = currentQ.display, i = ex.lastIndexOf(ans);
    const raw = String(currentQ.answer), j = ex.lastIndexOf(raw);
    const k = i >= 0 ? i : j, len = i >= 0 ? ans.length : raw.length;
    $('qHintText').textContent = '💡 ' + (k >= 0 ? ex.slice(0, k) + '❓' + ex.slice(k + len) : ex) + '  (hint halves the cash reward)';
    $('qHintText').hidden = false;
  };
  $('qLeave').onclick = () => closeQuiz();
  function closeQuiz() { $('quiz').hidden = true; paused = false; activePed = null; }

  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function answer(value, typed) {
    const ped = activePed, q = currentQ, z = ped.zone, r = ped.egg.rarity;
    const right = MathGen.check(q, value);
    $('qAnswerArea').hidden = true;
    const res = $('qResult'); res.hidden = false; res.className = right ? 'right' : 'wrong';
    const id = quizId;
    if (right) {
      S.streak++; S.stats.correct++; S.stats.best = Math.max(S.stats.best, S.streak);
      const coins = Math.round(income(z, r) * 8 * (1 + Math.min(S.streak, 10) * 0.1) * (usedHint ? 0.5 : 1));
      const spd = Math.max(1, Math.round(ZONES[Math.min(z + 1, ZONES.length - 1)].req * 0.03));
      S.money += coins; S.speed += spd;
      res.innerHTML = `<div class="big">✅ CORRECT!</div><div>${q.display} is right!${S.streak > 1 ? ` 🔥 ${S.streak} in a row!` : ''}</div>
        <div class="explain">+$${fmt(coins)} cash · +${fmt(spd)} speed</div><button class="primary" id="qGo">🥚 GRAB THE EGG AND RUN!</button>`;
      sfx.right(); sfx.cash();
      const go = () => { if ($('quiz').hidden || id !== quizId) return; quizId++; closeQuiz(); if (ped.isDrop) pickUpDropped(ped); else grabEgg(ped); };
      $('qGo').onclick = go; $('qGo').focus();
      setTimeout(go, 1800);
    } else {
      S.streak = 0; S.stats.wrong++;
      res.innerHTML = `<div class="big">❌ WRONG!</div><div>You said <b>${escapeHtml(String(typed))}</b>. The answer is <b>${q.display}</b>.</div>
        <div class="explain">📘 ${escapeHtml(q.explain)}</div><button class="primary danger" id="qGo">😵 Brace for the SMACK…</button>`;
      sfx.wrong();
      ped.q = null;
      const go = () => { if ($('quiz').hidden || id !== quizId) return; quizId++; closeQuiz(); guardianSmack(ped); };
      $('qGo').onclick = go; $('qGo').focus();
    }
    save();
  }

  function grabEgg(ped) {
    player.carrying = { zone: ped.zone, rarity: ped.egg.rarity, pi: pedestals.indexOf(ped) };
    ped.egg = null; ped.q = null; ped.held = true; // no new egg while this one is out

    const g = guardians[ped.zone];
    g.mode = 'chase'; g.daze = 1.8; g.burstCd = 2 + Math.random();
    sfx.roar(); sfx.grab();
    floater(player.x, player.y, 'GRAB!', '#ffd23f', 1.6, 8);
    const rn = RARITIES[player.carrying.rarity].name;
    toast(`Got ${/^[AEIOU]/.test(rn) ? 'an' : 'a'} ${rn} egg! Run home before ${ZONES[ped.zone].guard.n} catches you!`, 'good');
  }
  function guardianSmack(ped) {
    const g = guardians[ped.zone];
    g.lunge = 0.45;
    const dx = player.x - g.x, dy = player.y - g.y, d = Math.hypot(dx, dy) || 1;
    g.x = player.x - (dx / d) * 70; g.y = player.y - (dy / d) * 70;
    g.rot = Math.atan2(dx, dy);
    setTimeout(() => launchHome('SMACK!'), 320);
  }
  function launchHome(word) {
    sfx.smack(); sfx.oof(); shake = 0.6; player.z = 0; player.vz = 0;
    burst(player.x, player.y, 0xffffff, 24, 3);
    floater(player.x, player.y, word, '#ff3b3b', 3, 9);
    const d = Math.hypot(player.x - SPAWN.x, player.y - SPAWN.y);
    player.flying = { sx: player.x, sy: player.y, t: 0, dur: Math.min(2.4, 0.9 + d / 5000), spin: 0, h: 0 };
    if (player.carrying) {
      const c = player.carrying, ped = pedestals[c.pi];
      player.carrying = null;
      if (player.x >= zoneX(c.zone)) {
        // Caught inside the monster's own zone: the egg goes straight back to its nest.
        if (ped) { ped.held = false; if (!ped.egg) { ped.egg = { rarity: c.rarity }; burst(ped.x, ped.y, RARITIES[c.rarity].hex, 10, 2.5); } }
        toast(`${ZONES[c.zone].guard.n} took its egg back to the nest!`, 'bad');
      } else {
        // Caught after leaving its zone: the egg is dropped on the spot and can be picked up again.
        if (ped) { ped.held = false; ped.respawn = 7; }
        dropEgg(player.x, player.y, c);
        toast(`You dropped the egg outside ${ZONES[c.zone].name}! Go back and grab it.`, 'gold');
      }
    }
    guardians.forEach((g) => { if (g.mode === 'chase') g.mode = 'return'; });
  }

  // Eggs dropped outside their zone. Walk over one to pick it up again (no question needed).
  const dropped = [];
  function dropEgg(x, y, c) {
    const g = new THREE.Group(); g.position.set(x * U, 0, y * U); scene.add(g);
    const egg = eggMesh(c.rarity); g.add(egg);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 14, 10, 1, true), new THREE.MeshBasicMaterial({ color: RARITIES[c.rarity].hex, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 7; g.add(beam);
    const label = makeLabel(`DROPPED ${RARITIES[c.rarity].name.toUpperCase()} EGG
${isTouch ? 'tap it' : 'press E'}: solve to grab`, { size: 44, h: 0.8, color: RARITIES[c.rarity].color, color2: '#ffffff' });
    label.position.y = 4.6; g.add(label);
    dropped.push({ x, y, zone: c.zone, rarity: c.rarity, pi: c.pi, egg: { rarity: c.rarity }, q: null, isDrop: true, view: { g, egg } });
  }
  function pickUpDropped(d) {
    const di = dropped.indexOf(d);
    if (di < 0) return;
    dropped.splice(di, 1); scene.remove(d.view.g);
    const ped = pedestals[d.pi];
    if (ped && !ped.egg) { ped.held = true; }
    player.carrying = { zone: d.zone, rarity: d.rarity, pi: d.pi };
    sfx.place(); floater(player.x, player.y, 'GOT IT!', '#ffd23f', 1.4, 8);
    // If it's still within the monster's reach, the chase is back on.
    const g = guardians[d.zone];
    if (player.x >= Math.max(GARDEN_W, zoneX(d.zone) - ZONE_W / 2)) { g.mode = 'chase'; g.daze = 1.0; sfx.roar(); toast(`${ZONES[d.zone].guard.n} is coming for its egg!`, 'bad'); }
    else toast('Got your egg back! Bring it home.', 'good');
  }

  // ---------------- Day & night ----------------
  const isNight = () => S.clock >= DAY_LEN;
  let midnightRolled = false;
  function tickClock(dt) {
    const was = isNight();
    S.clock = (S.clock + dt) % CYCLE;
    if (!was && isNight()) nightfall();
    else if (was && !isNight()) dawn();
    // a second, smaller chance half way through the night
    if (isNight() && !midnightRolled && S.clock > DAY_LEN + NIGHT_LEN / 2) { midnightRolled = true; if (!divineOut() && Math.random() < 0.3) spawnDivine(); }
  }
  const divineOut = () => pedestals.some((p) => p.egg && p.egg.rarity === DIVINE);
  function nightfall() {
    S.nights = (S.nights || 0) + 1; midnightRolled = false;
    // Restock: every pedestal that isn't being stolen from gets a fresh egg.
    for (const p of pedestals) if (!p.held) { p.egg = { rarity: rollEgg(p) }; p.q = null; }
    sfx.night();
    banner('🌙 NIGHT HAS FALLEN', `Eggs restocked · Base eggs hatch ${NIGHT_HATCH}× faster · Divine eggs may appear!`, 'night');
    // The first night always brings a Divine so players see the feature; after that it's a 55% chance.
    if (S.nights === 1 || Math.random() < 0.55) setTimeout(() => started && isNight() && spawnDivine(), 3500);
    save();
  }
  function spawnDivine() {
    const open = ZONES.map((Z, z) => z).filter((z) => S.speed >= ZONES[z].req);
    const z = open[Math.floor(Math.random() * open.length)];
    const choices = pedestals.filter((p) => p.zone === z && !p.held);
    if (!choices.length) return;
    const p = choices[Math.floor(Math.random() * choices.length)];
    p.egg = { rarity: DIVINE }; p.q = null;
    burst(p.x, p.y, 0xfff2a8, 30, 3);
    sfx.divine();
    banner('✨ A DIVINE EGG HAS SPAWNED! ✨', `${ZONES[z].name}: steal it before sunrise! Its guardian asks the hardest question.`, 'divine');
    toast(`✨ Divine egg spawned in ${ZONES[z].name}! Follow the golden light.`, 'gold');
  }
  function dawn() {
    let lost = false;
    for (const p of pedestals) if (p.egg && p.egg.rarity === DIVINE && !p.held) { p.egg = { rarity: rollEgg(p) }; p.q = null; lost = true; }
    sfx.dawn();
    banner('☀️ A NEW DAY BEGINS', lost ? 'The Divine egg faded away with the sunrise…' : 'Night returns in 4 minutes.', 'day');
  }
  let bannerTimer = null;
  function banner(title, sub, cls) {
    const el = $('banner');
    el.className = cls; el.innerHTML = `<b>${title}</b><span>${sub}</span>`; el.hidden = false;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => (el.hidden = true), 5000);
  }

  // ---------------- Garden ----------------
  function placeEgg() {
    const { zone, rarity, pi } = player.carrying;
    player.carrying = null;
    if (pedestals[pi]) { pedestals[pi].held = false; pedestals[pi].respawn = 5; }
    guardians[zone].mode = 'return';
    let idx = -1;
    for (let i = 0; i < S.slotsUnlocked; i++) if (!S.slots[i]) { idx = i; break; }
    if (idx < 0) { openBaseFull({ zone, rarity }); return; } // the player chooses what to sell
    putEgg(idx, zone, rarity);
  }
  function putEgg(idx, zone, rarity) {
    S.slots[idx] = { zone, rarity, hatch: RARITIES[rarity].hatch };
    const p = slotPos(idx);
    burst(p.x + p.w / 2, p.y + p.h / 2, RARITIES[rarity].hex, 18, 1.5);
    sfx.place();
    toast(`Egg placed! Hatching in ${RARITIES[rarity].hatch}s…`, 'good');
    save();
  }

  // ---------------- Selling ----------------
  // A creature (or an egg) sells for 20 seconds of its income.
  const sellPrice = (s) => income(s.zone, s.rarity) * 20;
  const slotName = (s) => (s.hatch > 0 ? `${RARITIES[s.rarity].name} egg` : `${RARITIES[s.rarity].name} ${ZONES[s.zone].pets[s.rarity].n}`);
  // The plot (with something on it) you're standing on or next to.
  function slotNear(x, y, m = 40) {
    if (x > GARDEN_W) return -1;
    for (let i = 0; i < S.slotsUnlocked; i++) {
      const p = slotPos(i);
      if (S.slots[i] && x > p.x - m && x < p.x + p.w + m && y > p.y - m && y < p.y + p.h + m) return i;
    }
    return -1;
  }
  function sellSlot(i) {
    const s = S.slots[i]; if (!s) return 0;
    const price = sellPrice(s), p = slotPos(i);
    S.money += price; S.slots[i] = null;
    burst(p.x + p.w / 2, p.y + p.h / 2, 0x7dff7d, 16, 2);
    floater(p.x + p.w / 2, p.y + p.h / 2, '+$' + fmt(price), '#7dff7d', 1.2, 6);
    sfx.buy(); sfx.cash();
    return price;
  }
  // A row for the sell dialogs: portrait (or an egg), name, income and a SELL button.
  function sellRow(s, label, onSell) {
    const R = RARITIES[s.rarity], row = document.createElement('div'); row.className = 'shop-item sell';
    const ic = document.createElement('div'); ic.className = 'ic';
    if (s.hatch > 0 || s.egg) { ic.textContent = '🥚'; ic.style.filter = `drop-shadow(0 0 6px ${R.color})`; }
    else { const im = new Image(); im.alt = ''; im.src = petPortrait(s.zone, s.rarity); ic.appendChild(im); }
    const tx = document.createElement('div'); tx.className = 'tx';
    const nm = document.createElement('b'); nm.textContent = label; nm.style.color = R.color;
    const sm = document.createElement('small'); sm.textContent = `${ZONES[s.zone].name} · earns $${fmt(income(s.zone, s.rarity))}/s` + (s.hatch > 0 || s.egg ? ' once hatched' : '');
    tx.append(nm, sm);
    const b = document.createElement('button'); b.className = 'primary'; b.textContent = `SELL $${fmt(sellPrice(s))}`;
    b.onclick = onSell;
    row.append(ic, tx, b); return row;
  }
  // Selling one creature from its plot.
  let sellIdx = -1;
  function openSell(i) {
    const s = S.slots[i]; if (!s) return;
    sellIdx = i; paused = true; keys.clear();
    const box = $('sellItem'); box.innerHTML = '';
    box.appendChild(sellRow(s, slotName(s), () => {
      if (S.slots[sellIdx] !== s) return;
      const price = sellSlot(sellIdx);
      toast(`Sold your ${slotName(s)} for $${fmt(price)}`, 'gold'); save();
      $('sellOne').hidden = true; paused = false;
    }));
    $('sellOne').hidden = false;
  }
  // Base full: sell one of your creatures to make room, or sell the egg you just brought.
  let pendingEgg = null;
  function openBaseFull(egg) {
    pendingEgg = egg; paused = true; keys.clear();
    const box = $('fullItems'); box.innerHTML = '';
    const R = RARITIES[egg.rarity];
    $('fullEgg').innerHTML = `You brought a <b style="color:${R.color}">${R.name}</b> egg from ${ZONES[egg.zone].name}, but every plot is taken.`;
    const done = (msg) => { toast(msg, 'gold'); pendingEgg = null; $('baseFull').hidden = true; paused = false; save(); };
    box.appendChild(sellRow(Object.assign({ egg: true }, egg), `🆕 The new ${R.name} egg`, () => {
      if (!pendingEgg) return;
      const price = sellPrice(egg); S.money += price; sfx.buy(); sfx.cash();
      done(`Sold the new egg for $${fmt(price)}. Buy more plots in the Shop!`);
    }));
    // weakest first, so the obvious pick is on top
    [...Array(S.slotsUnlocked).keys()].filter((i) => S.slots[i]).sort((a, b) => sellPrice(S.slots[a]) - sellPrice(S.slots[b])).forEach((i) => {
      const s = S.slots[i];
      box.appendChild(sellRow(s, slotName(s), () => {
        if (!pendingEgg || S.slots[i] !== s) return;
        const price = sellSlot(i); putEgg(i, egg.zone, egg.rarity);
        done(`Sold your ${slotName(s)} for $${fmt(price)} and placed the new egg.`);
      }));
    });
    $('baseFull').hidden = false;
  }

  // ---------------- Input ----------------
  const keys = new Set();
  let target = null;
  addEventListener('keydown', (e) => {
    if (!$('quiz').hidden) {
      if (e.key === 'Enter' && $('qGo') && !$('qResult').hidden) { e.preventDefault(); $('qGo').click(); }
      if (e.key === 'Escape' && !$('qAnswerArea').hidden) $('qLeave').click();
      if (currentQ && currentQ.choices && !$('qAnswerArea').hidden && /^[1-4]$/.test(e.key)) $('qChoices').children[+e.key - 1]?.click();
      return;
    }
    if (paused) { if (e.key === 'Escape') document.querySelectorAll('.overlay:not(#menu) .close').forEach((b) => !b.closest('.overlay').hidden && b.click()); return; }
    keys.add(e.key.toLowerCase());
    if (['e', 'enter'].includes(e.key.toLowerCase())) { e.preventDefault(); tryInteract(); }
    if (e.key === ' ') { e.preventDefault(); if (!e.repeat) jump(); }
    if (e.key.startsWith('Arrow')) e.preventDefault();
    target = null;
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  const raycaster = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const eggs = pedestals.filter((p) => p.view.egg).map((p) => p.view.egg);
    const hit = raycaster.intersectObjects(eggs, true)[0];
    let ped = null;
    if (hit) { let o = hit.object; while (o && !o.userData.ped) o = o.parent; ped = o ? o.userData.ped : null; }
    const pt = new THREE.Vector3();
    const ok = raycaster.ray.intersectPlane(groundPlane, pt);
    return { ped, w: ok ? { x: pt.x / U, y: pt.z / U } : null };
  }
  // Camera orbit: Roblox-style third person behind the character.
  // Drag = orbit, click/tap = walk there or steal an egg, touch thumbstick on the left.
  let camYaw = Math.PI / 2, camPitch = 0.32, lastOrbit = -10, zoom = 1;
  const pointerDown = false;
  const ptrs = new Map();
  const stick = { id: null, x: 0, y: 0, vx: 0, vy: 0 };
  const stickEl = $('stick'), knobEl = $('stickKnob');
  canvas.addEventListener('pointerdown', (e) => {
    if (paused) return;
    canvas.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch' && stick.id === null && e.clientX < innerWidth * 0.45 && e.clientY > innerHeight * 0.4) {
      Object.assign(stick, { id: e.pointerId, x: e.clientX, y: e.clientY, vx: 0, vy: 0 });
      stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px'; stickEl.hidden = false;
      knobEl.style.transform = 'translate(-50%,-50%)';
      target = null; return;
    }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, drag: false });
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId === stick.id) {
      let dx = e.clientX - stick.x, dy = e.clientY - stick.y; const d = Math.hypot(dx, dy), max = 55;
      if (d > max) { dx *= max / d; dy *= max / d; }
      stick.vx = dx / max; stick.vy = dy / max;
      knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      return;
    }
    const p = ptrs.get(e.pointerId); if (!p || paused) return;
    if (!p.drag && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 6) p.drag = true;
    if (p.drag) {
      camYaw -= (e.clientX - p.x) * 0.0065;
      camPitch = Math.max(0.05, Math.min(1.1, camPitch + (e.clientY - p.y) * 0.004));
      lastOrbit = performance.now() / 1000;
    }
    p.x = e.clientX; p.y = e.clientY;
  });
  const endPtr = (e) => {
    if (e.pointerId === stick.id) { stick.id = null; stick.vx = stick.vy = 0; stickEl.hidden = true; return; }
    const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId);
    if (!p || p.drag || paused || e.type === 'pointercancel') return;
    const { ped, w } = pick(e);
    const near = ped || (w && nearestEgg(w.x, w.y, 50));
    if (near && Math.hypot(near.x - player.x, near.y - player.y) < 85) { tryInteract(near); return; }
    const si = w && !player.carrying ? slotNear(w.x, w.y, 0) : -1;
    if (si >= 0 && si === slotNear(player.x, player.y)) { openSell(si); return; }
    if (w) target = w;
  };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { zoom = Math.max(0.55, Math.min(1.6, zoom * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: true });

  // Roblox-style jump (Space, or the touch button). Airborne you clear small scenery and skim over mud.
  const JUMP_V = 22, GRAVITY = 62;
  function jump() {
    if (paused || !started || player.flying || player.z > 0.05) return;
    player.vz = JUMP_V; player.z = 0.01; sfx.jump();
  }
  const jumpBtn = $('jumpBtn');
  $('prompt').addEventListener('click', () => { if (!paused && $('prompt').classList.contains('tap')) tryInteract(); });
  jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); jump(); });

  function nearestEgg(x, y, maxD) {
    let best = null, bd = maxD;
    for (const p of pedestals) { if (!p.egg) continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
    // dropped eggs also need a solved question before you can pick them up again
    for (const p of dropped) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  function tryInteract(ped) {
    if (player.flying || player.carrying) return;
    ped = ped || nearestEgg(player.x, player.y, 85);
    if (ped) { openQuiz(ped); return; }
    const i = slotNear(player.x, player.y);
    if (i >= 0) openSell(i);
  }

  // ---------------- Update ----------------
  let hudTimer = 0, saveTimer = 0;
  function update(dt) {
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i]; f.t += dt; f.sp.position.y += 2.5 * dt;
      f.sp.material.opacity = Math.min(1, 2 * (1 - f.t / f.life));
      if (f.t > f.life) { scene.remove(f.sp); f.sp.material.map.dispose(); f.sp.material.dispose(); floaters.splice(i, 1); }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.t += dt;
      p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt; p.vy -= 25 * dt;
      p.m.rotation.x += dt * 5; p.m.scale.setScalar(Math.max(0.01, 1 - p.t / p.life));
      if (p.t > p.life) { scene.remove(p.m); particles.splice(i, 1); }
    }
    shake = Math.max(0, shake - dt);
    if (paused || !started) return;

    tickClock(dt);
    let perSec = 0;
    for (let i = 0; i < S.slotsUnlocked; i++) {
      const s = S.slots[i]; if (!s) continue;
      if (s.hatch > 0) {
        s.hatch -= dt * (isNight() ? NIGHT_HATCH : 1);
        if (s.hatch <= 0) {
          s.hatch = 0; const k = s.zone + ':' + s.rarity, pet = ZONES[s.zone].pets[s.rarity];
          const isNew = !S.discovered[k]; S.discovered[k] = true;
          const p = slotPos(i); burst(p.x + p.w / 2, p.y + p.h / 2, RARITIES[s.rarity].hex, 28, 2); sfx.crack(); sfx.hatch();
          toast(`Hatched a ${RARITIES[s.rarity].name} ${pet.n}!${isNew ? ' NEW in your Index!' : ''}`, 'gold');
          save();
        }
      } else {
        perSec += income(s.zone, s.rarity);
        const v = slotViews[i]; v.coinT -= dt;
        if (v.coinT <= 0) { v.coinT = 3 + Math.random() * 2; const sp = slotPos(i); if (player.x < GARDEN_W + 200) sfx.coin(); floater(sp.x + sp.w / 2, sp.y + sp.h / 2, '+$' + fmt(income(s.zone, s.rarity) * 3), '#7dff7d', 0.8, petSize(s.zone, s.rarity) + 1); }
      }
    }
    S.money += perSec * dt;
    S.incomePerSec = perSec;

    const wasTread = onTread;
    onTread = !player.flying && player.x > TREADMILL.x && player.x < TREADMILL.x + TREADMILL.w && player.y > TREADMILL.y && player.y < TREADMILL.y + TREADMILL.h;
    if (onTread && !wasTread) treadStart = runSpeed();
    if (!onTread && wasTread && runSpeed() > treadStart * 1.002) {
      toast(`🏃 Run speed ${studs(treadStart)} → ${studs(runSpeed())} studs/s (+${((runSpeed() / treadStart - 1) * 100).toFixed(1)}%)`, 'gold');
    }
    // You can feel it: every 4% faster pops a "FASTER!" and the camera widens with speed.
    if (runSpeed() >= feltSpeed * 1.04) {
      feltSpeed = runSpeed();
      floater(player.x, player.y, `⚡ FASTER! ${studs(feltSpeed)} studs/s`, '#5ab0ff', 1.1, 8.5); sfx.faster();
    }
    const inShop = !player.flying && !player.carrying && Math.hypot(player.x - TRAIL_SHOP.x, player.y - TRAIL_SHOP.y) < TRAIL_SHOP.r;
    if (inShop && !wasInShop) openTrails();
    wasInShop = inShop;
    if (onTread) { S.speed += treadGain(S.treadLvl) * dt; if (Math.random() < dt * 2.5) floater(player.x + (Math.random() - 0.5) * 40, player.y, '+' + fmtD(treadGain(S.treadLvl)) + ' speed', '#5ab0ff', 0.7, 5.5); }

    for (const p of pedestals) if (!p.egg && !p.held) { p.respawn -= dt; if (p.respawn <= 0) { p.egg = { rarity: rollEgg(p) }; burst(p.x, p.y, RARITIES[p.egg.rarity].hex, 10, 2.5); } }

    if (player.flying) {
      const F = player.flying; F.t += dt; F.spin += dt * 12;
      const k = Math.min(1, F.t / F.dur), e = 1 - (1 - k) ** 2;
      player.x = F.sx + (SPAWN.x - F.sx) * e;
      player.y = F.sy + (SPAWN.y - F.sy) * e;
      F.h = Math.sin(k * Math.PI) * 20;
      if (k >= 1) { player.flying = null; player.x = SPAWN.x; player.y = SPAWN.y; player.face = camYaw = Math.PI / 2; sfx.land(); floater(player.x, player.y, 'OUCH!', '#ffffff', 1.2, 6); shake = 0.25; }
    } else {
      // Arrow left/right turn the camera (like Roblox); WASD/up/down move relative to it.
      if (keys.has('arrowleft')) { camYaw += 2.4 * dt; lastOrbit = performance.now() / 1000; }
      if (keys.has('arrowright')) { camYaw -= 2.4 * dt; lastOrbit = performance.now() / 1000; }
      let fwd = 0, side = 0;
      if (keys.has('arrowup') || keys.has('w')) fwd++;
      if (keys.has('arrowdown') || keys.has('s')) fwd--;
      if (keys.has('d')) side++;
      if (keys.has('a')) side--;
      if (stick.id !== null && Math.hypot(stick.vx, stick.vy) > 0.15) { fwd = -stick.vy; side = stick.vx; }
      const fx = Math.sin(camYaw), fy = Math.cos(camYaw);
      let dx = fx * fwd - fy * side, dy = fy * fwd + fx * side;
      if (!dx && !dy && target) {
        const tx = target.x - player.x, ty = target.y - player.y, d = Math.hypot(tx, ty);
        if (d > 6) { dx = tx / d; dy = ty / d; } else if (!pointerDown) target = null;
      }
      const len = Math.hypot(dx, dy);
      player.moving = len > 0;
      player.boost = Math.max(0, player.boost - dt);
      if (player.z > 0 || player.vz > 0) {
        player.vz -= GRAVITY * dt; player.z += player.vz * dt;
        if (player.z <= 0) { player.z = 0; player.vz = 0; sfx.land(); }
      }
      const air = player.z > 0.6;
      if (len) {
        const sp = runSpeed() * dt * (player.boost > 0 ? 1.7 : 1), n = Math.ceil(sp / 16);
        // move in small steps so very high speeds can't skip through walls
        for (let i = 1; i < n; i++) { player.x += (dx / len) * sp / n; player.y += (dy / len) * sp / n; pushOut(player, player.r, player.z > 2.2); }
        player.x += (dx / len) * sp / n; player.y += (dy / len) * sp / n;
        player.face = Math.atan2(dx, dy);
        // Camera drifts back behind the character while walking forward-ish.
        const diff = angDiff(camYaw, player.face);
        if (performance.now() / 1000 - lastOrbit > 1.2 && Math.abs(diff) < 1.1) camYaw += diff * Math.min(1, dt * 1.6);
      }
      pushOut(player, player.r, player.z > 2.2);
      // footsteps (sound depends on the ground)
      if (player.moving && !air) {
        stepT -= dt * (runSpeed() / 190) * (player.boost > 0 ? 1.7 : 1);
        if (stepT <= 0) {
          stepT = 0.3;
          const zd = ZONES[zoneAt(player.x)];
          sfx.step(zd && (zd.deco === 'snow' || zd.deco === 'sky' || zd.deco === 'heaven') ? 'snow' : zd && zd.deco === 'desert' ? 'sand' : 'grass');
        }
      }
      player.y = Math.max(25, Math.min(WORLD_H - 25, player.y));
      player.x = Math.max(25, Math.min(WORLD_W - 25, player.x));
      for (const q of pads) {
        if (Math.hypot(q.x - player.x, q.y - player.y) > 50) continue;
        if (player.boost <= 0) { sfx.boost(); floater(player.x, player.y, 'BOOST!', '#3cff7a', 1.1, 7); }
        player.boost = 1.8;
      }
      for (let z = 1; z < ZONES.length; z++) {
        const gx = zoneX(z);
        if (S.speed < ZONES[z].req && player.x > gx - player.r) {
          player.x = gx - player.r;
          if (msgCooldown <= 0) { toast(`🔒 ${ZONES[z].name} needs ${fmt(ZONES[z].req)} speed. Train on the treadmill!`, 'bad'); msgCooldown = 3; }
          break;
        }
      }
      if (player.carrying && player.x < GARDEN_W - 10) placeEgg();
    }
    msgCooldown -= dt;
    // tense heartbeat while a guardian is chasing you
    const chaser = player.carrying && guardians[player.carrying.zone];
    if (chaser && chaser.mode === 'chase' && chaser.daze <= 0) {
      beatT -= dt;
      const d = Math.hypot(chaser.x - player.x, chaser.y - player.y);
      if (beatT <= 0) { sfx.heartbeat(); beatT = d < 350 ? 0.45 : d < 800 ? 0.65 : 0.9; }
    }
    // countdown ticks in the last 5 seconds before night / sunrise
    const toSwitch = (isNight() ? CYCLE : DAY_LEN) - S.clock, sec = Math.ceil(toSwitch);
    if (sec <= 5 && sec !== lastTick) { lastTick = sec; sfx.tick(); }
    if (sec > 5) lastTick = -1;

    for (const g of guardians) {
      const x0 = zoneX(g.zone);
      g.lunge = Math.max(0, g.lunge - dt);
      g.burst = Math.max(0, g.burst - dt);
      g.moving = false;
      if (g.daze > 0) { g.daze -= dt; continue; }
      if (g.mode === 'chase') {
        if (!player.carrying || player.carrying.zone !== g.zone || player.flying) { g.mode = 'return'; continue; }
        // Guardians chase you out of their zone and half way through the previous one, then give up.
        const leash = Math.max(GARDEN_W, x0 - ZONE_W / 2);
        if (g.zone > 0 && player.x < leash) {
          g.mode = 'return'; sfx.place();
          floater(player.x, player.y, 'ESCAPED!', '#3ee08f', 1.4, 8);
          toast(`You escaped ${ZONES[g.zone].guard.n}! Bring the egg home.`, 'good');
          continue;
        }
        const d = Math.hypot(player.x - g.x, player.y - g.y);
        g.burstCd -= dt;
        if (g.burstCd <= 0 && d < 520) { g.burst = 0.7; g.burstCd = 3 + Math.random() * 1.5; sfx.growl(); }
        const mult = (g.burst > 0 ? 1.45 : 1) * (d > 600 ? 1.5 : 1);
        const gs = guardSpeed(g.zone) * mult * dt, gn = Math.ceil(gs / 24);
        for (let i = 0; i < gn; i++) stepGuardian(g, player.x, player.y, gs / gn, dt / gn);
        g.x = Math.max(leash + 30, g.x);
        if (d < 76) { g.lunge = 0.45; launchHome('CAUGHT!'); }
      } else {
        const tgt = g.mode === 'return' ? g.home : g.way[g.wi];
        const d = Math.hypot(tgt.x - g.x, tgt.y - g.y);
        const sp = (g.mode === 'return' ? guardSpeed(g.zone) * 0.7 : 85) * dt;
        g.wpT += dt;
        if (g.pause > 0) {
          g.pause -= dt;
          if (Math.hypot(player.x - g.x, player.y - g.y) < 400) g.rot = Math.atan2(player.x - g.x, player.y - g.y);
        } else if (d > Math.max(sp, 8) && g.wpT < 16) stepGuardian(g, tgt.x, tgt.y, sp, dt);
        else if (g.mode === 'return') { g.mode = 'patrol'; g.wpT = 0; }
        else { g.wi = (g.wi + 1) % g.way.length; g.pause = 0.8 + Math.random() * 1.4; g.wpT = 0; }
        if (g.mode === 'patrol') g.x = Math.max(x0 + 40, Math.min(x0 + ZONE_W - 40, g.x));
      }
    }

    jumpBtn.hidden = !isTouch;
    hudTimer -= dt;
    if (hudTimer <= 0) { hudTimer = 0.1; updateHud(); }
    saveTimer -= dt;
    if (saveTimer <= 0) { saveTimer = 4; save(); }
  }

  // ---------------- Guardian navigation ----------------
  // A coarse grid marks where a guardian's body fits; a BFS flow field leads it around walls and lair pillars.
  const NC = 40, NW = Math.ceil(WORLD_W / NC), NH = Math.ceil(WORLD_H / NC);
  const navBlocked = new Uint8Array(NW * NH);
  function buildNav() {
    for (let j = 0; j < NH; j++) for (let i = 0; i < NW; i++) {
      const x = (i + 0.5) * NC, y = (j + 0.5) * NC;
      let b = y < G_R || y > WORLD_H - G_R;
      // small scenery only blocks its own footprint; guardians slide around it
      if (!b) forNear(x, (c) => { if (!b && Math.hypot(c.x - x, c.y - y) < c.r + (c.soft ? 8 : G_R)) b = true; });
      navBlocked[j * NW + i] = b ? 1 : 0;
    }
  }
  const navAt = (x, y) => navBlocked[Math.max(0, Math.min(NH - 1, Math.floor(y / NC))) * NW + Math.max(0, Math.min(NW - 1, Math.floor(x / NC)))];
  function clearLine(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    for (let s = 30; s < d; s += 18) { const k = s / d; if (navAt(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k)) return false; }
    return true;
  }
  const navCache = new Map(), DI = [1, -1, 0, 0, 1, 1, -1, -1], DJ = [0, 0, 1, -1, 1, -1, 1, -1];
  function flowTo(tx, ty, xa, xb) {
    const ti = Math.max(0, Math.min(NW - 1, Math.floor(tx / NC))), tj = Math.max(0, Math.min(NH - 1, Math.floor(ty / NC)));
    const i0 = Math.max(0, Math.floor(xa / NC / 8) * 8), i1 = Math.min(NW - 1, Math.ceil(xb / NC / 8) * 8);
    const key = ti + ',' + tj + ',' + i0 + ',' + i1;
    let f = navCache.get(key);
    if (f) return f;
    const w = i1 - i0 + 1, dist = new Int16Array(w * NH).fill(-1), q = new Int32Array(w * NH);
    let h = 0, t = 0;
    dist[tj * w + ti - i0] = 0; q[t++] = tj * w + ti - i0;
    while (h < t) {
      const c = q[h++], ci = c % w, cj = (c / w) | 0, nd = dist[c] + 1;
      for (let k = 0; k < 8; k++) {
        const ni = ci + DI[k], nj = cj + DJ[k];
        if (ni < 0 || ni >= w || nj < 0 || nj >= NH) continue;
        const n = nj * w + ni;
        if (dist[n] >= 0 || navBlocked[nj * NW + ni + i0]) continue;
        if (k > 3 && (navBlocked[cj * NW + ni + i0] || navBlocked[nj * NW + ci + i0])) continue;
        dist[n] = nd; q[t++] = n;
      }
    }
    f = { i0, w, dist };
    if (navCache.size > 80) navCache.clear();
    navCache.set(key, f);
    return f;
  }
  // Where should the guardian head next on its way to (tx, ty)?
  function navTarget(g, tx, ty) {
    if (clearLine(g.x, g.y, tx, ty)) return { x: tx, y: ty };
    const f = flowTo(tx, ty, Math.min(g.x, tx) - 500, Math.max(g.x, tx) + 500);
    const D = (i, j) => (i < 0 || i >= f.w || j < 0 || j >= NH ? -1 : f.dist[j * f.w + i]);
    let ci = Math.floor(g.x / NC) - f.i0, cj = Math.floor(g.y / NC), best = null;
    for (let s = 0; s < 10; s++) {
      let bd = D(ci, cj) < 0 ? 1e9 : D(ci, cj), bi = -1, bj = -1;
      for (let k = 0; k < 8; k++) { const d = D(ci + DI[k], cj + DJ[k]); if (d >= 0 && d < bd) { bd = d; bi = ci + DI[k]; bj = cj + DJ[k]; } }
      if (bi < 0) break;
      ci = bi; cj = bj;
      const px = (ci + f.i0 + 0.5) * NC, py = (cj + 0.5) * NC;
      if (best && !clearLine(g.x, g.y, px, py)) break;
      best = { x: px, y: py };
      if (bd === 0) break;
    }
    return best || { x: tx, y: ty };
  }

  // Head along the nav path toward (tx, ty); slide along colliders; sidestep if stuck.
  function stepGuardian(g, fx, fy, sp, dt) {
    const fd = Math.hypot(fx - g.x, fy - g.y);
    if (fd < 1) return;
    const n = navTarget(g, fx, fy), tx = n.x, ty = n.y;
    const d = Math.max(1, Math.hypot(tx - g.x, ty - g.y));
    if (d < 1) return;
    let dx = (tx - g.x) / d, dy = (ty - g.y) / d, ax = 0, ay = 0;
    const look = 170;
    forNear(g.x, (c) => {
      const ox = c.x - g.x, oy = c.y - g.y, along = ox * dx + oy * dy;
      if (along < -c.r || along > look + c.r || along > d + c.r) return;
      const perp = ox * -dy + oy * dx, clear = c.r + G_R + 12;
      if (Math.abs(perp) > clear) return;
      const s = Math.abs(perp) < 6 ? g.side : perp > 0 ? -1 : 1;
      const w = (1 - Math.abs(perp) / clear) * (1 - Math.max(0, along) / (look + c.r)) * 2.2 + 0.25;
      ax += -dy * s * w; ay += dx * s * w;
    });
    dx += ax; dy += ay;
    if (g.unstick > 0) { g.unstick -= dt; const ux = dx; dx = dx * 0.3 - dy * g.side; dy = dy * 0.3 + ux * g.side; }
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const ox = g.x, oy = g.y, step = Math.min(sp, fd);
    g.x += dx * step; g.y += dy * step;
    pushOut(g, G_R, g.mode === 'chase' && fd < 160); // close in, guardians barge through small scenery
    const moved = Math.hypot(g.x - ox, g.y - oy);
    g.prog = g.prog * 0.92 + (moved / Math.max(1e-6, step)) * 0.08;
    if (g.prog < 0.4 && g.unstick <= 0) { g.unstick = 0.8; g.side = -g.side; g.prog = 1; }
    g.moving = moved > 0.01;
    if (moved > 0.01) g.rot = Math.atan2(g.x - ox, g.y - oy);
  }

  function updateHud() {
    $('hMoney').textContent = '$' + fmt(S.money);
    $('hIncome').textContent = '+$' + fmt(S.incomePerSec || 0) + '/s';
    $('hSpeed').textContent = fmt(S.speed);
    $('hRun').textContent = `${studs(runSpeed())} studs/s` + (S.trail >= 0 ? ` ×${TRAILS[S.trail].mult}` : '');
    $('hStreak').textContent = S.streak;
    const tot = S.stats.correct + S.stats.wrong;
    $('hAcc').textContent = tot ? Math.round((100 * S.stats.correct) / tot) + '% right' : 'streak';
    const night = isNight(), left = Math.ceil((night ? CYCLE : DAY_LEN) - S.clock);
    $('hClockL').textContent = night ? '🌙 NIGHT' : '☀️ DAY';
    $('hClock').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    $('hClockS').textContent = night ? 'until sunrise' : 'until night';
    $('hudClock').classList.toggle('night', night);
    const dp = pedestals.find((p) => p.egg && p.egg.rarity === DIVINE);
    const di = $('divineInfo');
    di.hidden = !dp;
    if (dp) di.textContent = `✨ Divine egg in ${ZONES[dp.zone].name}${S.speed < ZONES[dp.zone].req ? ' (locked)' : ''} · ${Math.round(Math.abs(dp.x - player.x) / 20)} studs away`;
    const c = $('carry');
    if (player.carrying) {
      const g = guardians[player.carrying.zone];
      c.hidden = false;
      c.textContent = `${RARITIES[player.carrying.rarity].name.toUpperCase()} EGG! RUN BACK TO BASE!  ${g.daze > 0 ? '(guardian is stunned…)' : ZONES[g.zone].guard.n + ' is chasing you!'}`;
    } else c.hidden = true;
    const pr = $('prompt');
    pr.classList.remove('tap');
    const ped = !player.flying && !player.carrying ? nearestEgg(player.x, player.y, 85) : null;
    if (ped) {
      const R = RARITIES[ped.egg.rarity];
      pr.innerHTML = `${isTouch ? 'Tap the egg' : 'Press <kbd>E</kbd>'} to ${ped.isDrop ? 'grab back the dropped' : 'steal the'} <b style="color:${R.color}">${R.name}</b> egg · <span class="stars">${stars(difficulty(ped.zone, ped.egg.rarity))}</span>`;
      pr.hidden = false;
    } else if (!player.flying && !player.carrying && slotNear(player.x, player.y) >= 0) {
      const s = S.slots[slotNear(player.x, player.y)];
      pr.innerHTML = `${isTouch ? 'Tap here' : 'Press <kbd>E</kbd>'} to sell your <b style="color:${RARITIES[s.rarity].color}">${slotName(s)}</b> for $${fmt(sellPrice(s))}`;
      pr.hidden = false; pr.classList.add('tap');
    } else if (wasInShop) {
      pr.innerHTML = '✨ TRAILS SHOP · step out and back in to reopen'; pr.hidden = false;
    } else if (onTread) {
      pr.innerHTML = `🏃 Training! +${treadGain(S.treadLvl)} speed/s · Upgrade in the Shop`; pr.hidden = false;
    } else if (zoneAt(player.x) === -1 && !player.carrying && S.stats.correct === 0 && !player.flying) {
      pr.innerHTML = 'Follow the path ⬆ into the Haunted Forest to find eggs'; pr.hidden = false;
    } else pr.hidden = true;
  }

  // ---------------- Sync 3D views ----------------
  const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  const tmpColor = new THREE.Color(), tmpColor2 = new THREE.Color();
  let stride = 0;
  function syncViews(t, dt) {
    // Player
    const flying = player.flying, fh = flying ? flying.h : player.z;
    avatar.g.position.set(player.x * U, fh, player.y * U);
    avatar.g.rotation.y += angDiff(avatar.g.rotation.y, player.face) * Math.min(1, dt * 12);
    avatar.body.rotation.x = flying ? flying.spin : 0;
    const mv = (player.moving || onTread) && !flying && player.z <= 0;
    const runK = Math.sqrt(runSpeed() * (player.boost > 0 ? 1.7 : 1) / 200);
    stride += dt * (onTread ? 16 : 11 * runK) * (mv ? 1 : 0);
    const sw = mv ? Math.sin(stride) * Math.min(1.1, 0.7 + runK * 0.15) : 0;
    avatar.legs[0].rotation.x = sw; avatar.legs[1].rotation.x = -sw;
    avatar.arms[0].rotation.x = player.carrying ? -Math.PI : -sw;
    avatar.arms[1].rotation.x = player.carrying ? -Math.PI : sw;
    const airPose = player.z > 0 && !player.carrying;
    if (airPose) { avatar.arms[0].rotation.x = avatar.arms[1].rotation.x = -2.6; avatar.legs[0].rotation.x = 0.35; avatar.legs[1].rotation.x = -0.2; }
    avatar.arms[0].rotation.z = flying ? -1.2 : airPose ? -0.25 : 0; avatar.arms[1].rotation.z = flying ? 1.2 : airPose ? 0.25 : 0;
    if (avatar.rig) {
      const a = avatar.alt, rsw = mv ? Math.sin(stride) * Math.min(0.9, 0.55 + runK * 0.1) : 0;
      poseRig(avatar.rig, t, { sw: rsw, c: Math.cos(stride), mv, carrying: !!player.carrying, air: airPose, flying: !!flying });
      a.position.y = mv ? Math.abs(Math.cos(stride)) * 0.18 : 0; // body rises as each leg passes under it
      a.rotation.x = flying ? flying.spin : mv ? 0.06 + Math.min(0.1, runK * 0.02) : 0;
      a.rotation.z = 0; a.scale.set(1, 1, 1);
    } else if (avatar.alt) {
      const a = avatar.alt, hop = mv ? Math.abs(Math.sin(stride)) : 0;
      a.position.y = hop * 0.45;
      a.rotation.x = flying ? flying.spin : mv ? 0.12 + Math.min(0.15, runK * 0.03) : airPose ? -0.15 : 0;
      a.rotation.z = mv ? Math.sin(stride) * 0.09 : 0;
      a.scale.set(1, mv ? 1 - (1 - hop) * 0.06 : 1 + Math.sin(t * 2) * 0.012, 1); // squash on landing, breathe when idle
    }
    if (player.carrying && (!carryEgg || carryEgg.userData.rarity !== player.carrying.rarity)) { if (carryEgg) scene.remove(carryEgg); carryEgg = eggMesh(player.carrying.rarity, 0.8); scene.add(carryEgg); }
    if (!player.carrying && carryEgg) { scene.remove(carryEgg); carryEgg = null; }
    if (carryEgg) { carryEgg.position.set(player.x * U, fh + 6.6 + Math.sin(t * 10) * 0.1, player.y * U); carryEgg.rotation.y = t * 2; }

    // Pedestals
    for (const p of pedestals) {
      const v = p.view, visible = Math.abs(p.x - player.x) < (p.egg && p.egg.rarity === DIVINE ? 9000 : 3000);
      v.g.visible = visible;
      if (!visible) continue;
      if (p.egg && (!v.egg || v.egg.userData.rarity !== p.egg.rarity)) {
        if (v.egg) v.g.remove(v.egg);
        v.egg = eggMesh(p.egg.rarity); v.egg.userData.ped = p; v.g.add(v.egg);
        v.ring.material = glow(RARITIES[p.egg.rarity].hex);
      }
      if (!p.egg && v.egg) { v.g.remove(v.egg); v.egg = null; v.ring.material = glow(0x444444); }
      if (v.egg) { v.egg.position.y = 2.4 + Math.sin(t * 2 + p.x) * 0.15; v.egg.rotation.y = t * 0.8; if (v.egg.userData.spin) v.egg.userData.spin(t); }
      v.beam.visible = !!(p.egg && p.egg.rarity === DIVINE);
      const near = p.egg && !player.carrying && Math.hypot(p.x - player.x, p.y - player.y) < 85;
      setLabel(v.label, p.egg ? `${p.egg.rarity === DIVINE ? '✨ DIVINE ✨' + (isNight() ? '\ngone at sunrise' : '') : p.tier === 3 ? '★ LAIR EGG ★\n' + RARITIES[p.egg.rarity].name : RARITIES[p.egg.rarity].name}${near ? '\n' + (isTouch ? 'TAP TO STEAL' : '[E] STEAL') : ''}` : p.held ? 'Egg stolen!' : `New egg in ${Math.ceil(p.respawn)}s`);
      v.label.material.color.set(p.egg ? RARITIES[p.egg.rarity].hex : 0xffffff);
      v.label.position.y = (near ? 4.9 : 4.4) + (p.tier === 3 ? 0.8 : 0);
    }

    for (const d of dropped) { d.view.egg.position.y = 1.4 + Math.sin(t * 3) * 0.2; d.view.egg.rotation.y = t * 1.5; if (d.view.egg.userData.spin) d.view.egg.userData.spin(t); }
    if (carryEgg && carryEgg.userData.spin) carryEgg.userData.spin(t);
    for (const v of slotViews) if (v.obj && v.obj.userData.spin) v.obj.userData.spin(t);

    // Guardians
    for (const g of guardians) {
      const v = g.view, visible = Math.abs(g.x - player.x) < 3200;
      v.g.visible = visible;
      if (!visible) continue;
      v.g.position.set(g.x * U, 0, g.y * U);
      v.model.rotation.y += angDiff(v.model.rotation.y, g.rot) * Math.min(1, dt * 6);
      const chasing = g.mode === 'chase' && g.daze <= 0;
      v.model.userData.tick(t * (chasing ? 1.4 : 1), g.moving);
      setFaded(v.model, blocksView(g.x * U, g.y * U, 2.5));
      v.label.visible = Math.hypot(g.x - player.x, g.y - player.y) < 1400 || chasing;
      v.model.scale.setScalar((v.h / v.model.userData.height) * (1 + g.lunge * 0.6));
      v.aura.visible = chasing; v.aura.material.opacity = g.burst > 0 ? 0.95 : 0.4 + Math.sin(t * 12) * 0.2;
      v.aura.scale.setScalar(g.burst > 0 ? 1.35 : 1);
      v.dazeStars.visible = g.daze > 0; v.dazeStars.rotation.y = t * 4;
      setLabel(v.label, ZONES[g.zone].guard.n + (chasing ? ' 😡' : ''));
    }

    zoneGroups.forEach((zg, z) => (zg.visible = player.x > zoneX(z) - 3300 && player.x < zoneX(z) + ZONE_W + 3300));
    gates.forEach((gt, z) => {
      if (!gt) return;
      const locked = S.speed < ZONES[z].req;
      gt.m.visible = locked; gt.labs.forEach((l) => (l.visible = locked));
      gt.m.material.opacity = 0.28 + Math.sin(t * 3) * 0.08;
    });

    // Base plots
    for (let i = 0; i < MAX_SLOTS; i++) {
      const v = slotViews[i], s = S.slots[i], unlocked = i < S.slotsUnlocked;
      v.top.material.color.set(unlocked ? 0x8a6a48 : 0x4a4f58);
      v.base.material = unlocked ? mat(0x6b4a2f) : mat(0x3a3f48);
      const key = !unlocked ? 'locked' : !s ? 'empty' : `${s.zone}:${s.rarity}:${s.hatch > 0 ? 'egg' : 'pet'}`;
      if (key !== v.key) {
        if (v.obj) gardenGroup.remove(v.obj);
        v.obj = null; v.key = key;
        if (s && unlocked) {
          if (s.hatch > 0) { v.obj = eggMesh(s.rarity, 1.2); v.obj.position.set(v.cx, 2, v.cz); }
          else {
            const m = Models.build(ZONES[s.zone].pets[s.rarity].spec, { tier: s.rarity, color: RARITIES[s.rarity].hex });
            m.scale.setScalar(petSize(s.zone, s.rarity) / m.userData.height);
            const holder = new THREE.Group(); holder.add(m); holder.position.set(v.cx, 0.65, v.cz); holder.userData.model = m;
            v.obj = holder;
          }
          gardenGroup.add(v.obj);
        }
      }
      if (v.obj && s) {
        if (s.hatch > 0) v.obj.rotation.z = Math.sin(t * (s.hatch < 3 ? 22 : 6)) * (s.hatch < 3 ? 0.25 : 0.06);
        else { v.obj.userData.model.userData.tick(t + i, false); v.obj.rotation.y = Math.sin(t * 0.4 + i) * 0.5; }
      }
      const R = s ? RARITIES[s.rarity] : null;
      v.label.userData.o.color = R ? R.color : '#ffffff';
      if (!unlocked) setLabel(v.label, i === S.slotsUnlocked ? `🔒 Shop: $${fmt(slotCost(i))}` : '🔒');
      else if (!s) setLabel(v.label, 'Empty plot');
      else if (s.hatch > 0) setLabel(v.label, `${R.name} egg\nHatching ${Math.ceil(s.hatch)}s`);
      else setLabel(v.label, `${ZONES[s.zone].pets[s.rarity].n}\n$${fmt(income(s.zone, s.rarity))}/s`);
      v.label.position.y = s && s.hatch === 0 ? petSize(s.zone, s.rarity) + 2.2 : 4.4;
      v.rim.material = R ? glow(R.hex) : mat(0x30343c);
    }

    animProps.forEach((f) => f(t));
    updateTrail(t);
    updateOccluders();

    // Sky/fog follow the zone you're in (blends near the next gate).
    const zf = (player.x - GARDEN_W) / ZONE_W, z0 = Math.floor(zf);
    const k = Math.min(1, Math.max(0, (zf - z0 - 0.8) * 5));
    const skyOf = (z) => (z < 0 ? 0x8fb5c9 : ZONES[Math.min(z, ZONES.length - 1)].sky);
    tmpColor.set(skyOf(z0)).lerp(tmpColor2.set(skyOf(z0 + 1)), k);
    // Dusk and dawn fade over 6 seconds around the switch.
    const c = S.clock, nk = c < DAY_LEN - 6 ? 0 : c < DAY_LEN ? (c - DAY_LEN + 6) / 6 : c < CYCLE - 6 ? 1 : (CYCLE - c) / 6;
    nightK = nk;
    tmpColor.lerp(tmpColor2.set(0x0a0f2a), nk * 0.88);
    scene.background.lerp(tmpColor, Math.min(1, dt * 3));
    scene.fog.color.copy(scene.background);
    const dark = z0 >= 5;
    hemi.intensity += ((dark ? 0.6 : 0.75) * (1 - 0.55 * nk) - hemi.intensity) * Math.min(1, dt * 2);
    sun.intensity += ((dark ? 0.55 : 0.85) * (1 - 0.6 * nk) - sun.intensity) * Math.min(1, dt * 2);
    sun.color.set(0xfff4e0).lerp(tmpColor2.set(0x8fa8ff), nk);
    lantern.intensity = nk * 1.3;
    lantern.position.set(player.x * U, 6 + (player.flying ? player.flying.h : 0), player.y * U);
    starField.material.opacity = nk; starField.visible = moon.visible = nk > 0.02;
  }

  // ---------------- Loop ----------------
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    baseFov = camera.aspect < 0.8 ? 68 : 50;
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
  }
  let baseFov = 50, fovKick = 0;
  addEventListener('resize', resize); resize();

  const speedFx = $('speedFx');
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), want = new THREE.Vector3(), look = new THREE.Vector3();
  let last = performance.now(), time = 0, camInit = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    update(dt);
    syncViews(time, dt);

    const px = player.x * U, pz = player.y * U, py = player.flying ? player.flying.h * 0.6 : player.z * 0.5;
    const dist = 15 * zoom * (camera.aspect < 0.8 ? 1.2 : 1);
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw), hy = py + 3.6;
    want.set(px - fx * dist * Math.cos(camPitch), hy + 1 + dist * Math.sin(camPitch), pz - fz * dist * Math.cos(camPitch));
    want.z = Math.max(-3.5, want.z); want.y = Math.max(1.5, want.y);
    look.set(px + fx * 3, hy + 0.5, pz + fz * 3);
    if (!started) { want.set(px - 8 + Math.sin(time * 0.15) * 10, 15, pz + 20); look.set(px + 2, 2, pz - 4); }
    if (!camInit) { camPos.copy(want); camLook.copy(look); camInit = true; }
    camPos.lerp(want, Math.min(1, dt * 9)); camLook.lerp(look, Math.min(1, dt * 12));
    camera.position.copy(camPos);
    if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake * 3; camera.position.y += (Math.random() - 0.5) * shake * 3; }
    camera.lookAt(camLook);
    // Speed you can feel: the view widens and speed lines stream in as you get faster.
    const going = started && !paused && player.moving && !player.flying;
    const rs = going ? runSpeed() * (player.boost > 0 ? 1.7 : 1) : 0;
    const kick = going ? Math.min(18, Math.max(0, (rs / 160 - 1) * 6)) : 0;
    fovKick += (kick - fovKick) * Math.min(1, dt * 4);
    if (Math.abs(camera.fov - (baseFov + fovKick)) > 0.01) { camera.fov = baseFov + fovKick; camera.updateProjectionMatrix(); }
    speedFx.style.opacity = going ? Math.min(0.85, Math.max(0, (rs / 160 - 1.7) * 0.35) + (player.boost > 0 ? 0.35 : 0)).toFixed(2) : '0';
    if (going) speedFx.style.transform = `rotate(${(Math.random() * 6).toFixed(1)}deg) scale(1.2)`;
    sun.position.set(px + fx * 12 + 18, 40, pz + fz * 12 + 22); sun.target.position.set(px + fx * 12, 0, pz + fz * 12);
    starField.position.copy(camera.position);
    moon.position.set(camera.position.x + 110, camera.position.y + 120, camera.position.z - 90);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  if (location.hash === '#debug') window.dbg = { setYaw: (a, p) => { camYaw = a; if (p !== undefined) camPitch = p; lastOrbit = performance.now() / 1000 + 30; }, player, guardians, pedestals, dropped, isNight, spawnDivine, LAYOUTS, pads, navAt, navTarget, clearLine, get S() { return S; } };
  buildNav();
  // Imported models load first so pets and portraits never show the stand-in model.
  Models.ready.then(() => { setCharacter(S.character); buildMenu(); requestAnimationFrame(frame); });
})();
