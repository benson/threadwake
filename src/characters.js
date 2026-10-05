export const CHARACTERS = Object.freeze([
  {
    id: "custodian",
    name: "Custodian",
    weapon: "slingshot",
    ability: "Sweep",
    description:
      "A broom sweep damages and pushes back enemies, clearing red shots.",
    speedMultiplier: 1,
    hpBonus: 0,
    icon: "echo",
  },
  {
    id: "conservator",
    name: "Conservator",
    weapon: "lantern",
    ability: "Restore",
    description:
      "Damage and stop nearby enemies, boosting the next weapon hit. Heal yourself and nearby teammates.",
    speedMultiplier: 1.08,
    hpBonus: -15,
    icon: "frost",
  },
  {
    id: "guard",
    name: "Guard",
    weapon: "disc",
    ability: "Repel",
    description:
      "A shockwave damages and pushes back enemies, clearing red shots.",
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
    description:
      "Automatically damages all enemies near your lantern with pulses of light.",
  },
  disc: {
    name: "Returning disc",
    description: "Cuts through enemies on its way out and back.",
  },
  storm: {
    name: "Storm coil",
    description:
      "Automatically strikes an enemy with lightning that jumps to nearby enemies.",
  },
});
