export const CHARACTERS = Object.freeze([
  {
    id: "custodian",
    name: "Custodian",
    weapon: "slingshot",
    ability: "Sweep",
    description: "A broad broom sweep damages enemies and clears shots.",
    speedMultiplier: 1,
    hpBonus: 0,
    icon: "echo",
  },
  {
    id: "conservator",
    name: "Conservator",
    weapon: "lantern",
    ability: "Restore",
    description: "Freeze nearby exhibits and restore health to your team.",
    speedMultiplier: 1.08,
    hpBonus: -15,
    icon: "frost",
  },
  {
    id: "guard",
    name: "Guard",
    weapon: "disc",
    ability: "Repel",
    description: "A heavy shockwave pushes enemies away and clears shots.",
    speedMultiplier: 0.92,
    hpBonus: 25,
    icon: "thread",
  },
]);
export function getCharacter(id) {
  return CHARACTERS.find((character) => character.id === id) || CHARACTERS[0];
}
export const WEAPONS = Object.freeze({
  slingshot: {
    name: "Slingshot",
    description: "Fires marbles at nearby enemies.",
  },
  lantern: {
    name: "Spirit lantern",
    description: "Pulses light through nearby enemies.",
  },
  disc: {
    name: "Returning disc",
    description: "Cuts through enemies on its way out and back.",
  },
  storm: {
    name: "Storm coil",
    description: "Strikes nearby enemies with lightning.",
  },
});
