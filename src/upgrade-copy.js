import { UPGRADES, upgradePreview } from "./sim.js";
import { getCharacter } from "./characters.js";

const ACTIONS = {
  custodian: "broom sweep",
  conservator: "healing burst",
  guard: "shockwave",
};
const DAMAGE = {
  slingshot: "Your slingshot's marbles deal more damage.",
  lantern: "Your lantern's flashes deal more damage.",
  disc: "Your returning discs deal more damage.",
  storm: "Your lightning strikes deal more damage.",
};
const SPEED = {
  slingshot: "Your slingshot fires more often.",
  lantern: "Your lantern flashes more often.",
  disc: "Throw returning discs more often.",
  storm: "Your lightning strikes more often.",
};

// Describe the equipment this player can see, without requiring a glossary of
// weapons or companions they have not acquired. Numeric rules stay in sim.js.
export function upgradeDetails(player, id, context = {}) {
  const item = UPGRADES.find((u) => u.id === id);
  if (!item) return { description: "", stats: [], synergy: "" };
  const weapons = player.weapons || [getCharacter(player.character).weapon];
  const has = (weapon) => weapons.includes(weapon);
  const count = (upgrade) =>
    player.upgrades.filter((u) => u === upgrade).length;
  const soldier = count("mirror") > 0;
  const action = ACTIONS[player.character] || ACTIONS.custodian;
  const actionLabel = action[0].toUpperCase() + action.slice(1);
  const control = context.control ? ` (${context.control})` : "";
  const manual = `Your ${action}${control}`;
  const preview = upgradePreview(player, id);
  let description = item.description,
    stats = preview.stats,
    synergy = "";

  if (id === "heavy" || id === "quick") {
    description =
      weapons.length === 1
        ? (id === "heavy" ? DAMAGE : SPEED)[weapons[0]]
        : id === "heavy"
          ? "All your automatic weapons deal more damage."
          : "All your automatic weapons attack more often.";
    if (soldier)
      description +=
        id === "heavy"
          ? " Your toy soldier's marbles do too."
          : " Your toy soldier also fires more often.";
  } else if (id === "fork" || id === "pierce") {
    const projectiles = has("slingshot") || has("disc") || soldier;
    const light = has("lantern") || has("storm");
    const projectileName =
      has("slingshot") && has("disc")
        ? "marbles and discs"
        : has("slingshot")
          ? "slingshot marbles"
          : has("disc")
            ? "returning discs"
            : "toy soldier's marbles";
    const lightName =
      has("lantern") && has("storm")
        ? "lantern and lightning"
        : has("lantern")
          ? "lantern"
          : "lightning";
    if (id === "fork") {
      const parts = [];
      if (has("slingshot") && has("disc"))
        parts.push("Fire extra marbles and discs each time.");
      else if (has("slingshot"))
        parts.push("Your slingshot fires an extra marble each time.");
      else if (has("disc"))
        parts.push("Throw an extra returning disc each time.");
      if (has("lantern") && has("storm"))
        parts.push(
          "Your lantern reaches farther and lightning hits more enemies.",
        );
      else if (has("lantern"))
        parts.push("Your lantern's light reaches farther.");
      else if (has("storm"))
        parts.push("Your lightning jumps to one more enemy.");
      if (soldier) parts.push("Your toy soldier fires extra marbles too.");
      description = parts.join(" ");
      stats = stats.filter((_, i) =>
        i === 0 ? projectiles : i === 1 ? has("lantern") : has("storm"),
      );
    } else {
      description = [
        projectiles ? `Your ${projectileName} pass through more enemies.` : "",
        light
          ? `Your ${lightName} deal${has("lantern") && has("storm") ? "" : "s"} more damage.`
          : "",
      ]
        .filter(Boolean)
        .join(" ");
      stats = stats.filter((_, i) => (i === 0 ? projectiles : light));
    }
    stats = stats.map((stat) => ({
      ...stat,
      label:
        stat.label === "Marbles and discs per attack"
          ? has("slingshot") && has("disc")
            ? "Marbles and discs per attack"
            : has("disc")
              ? "Discs per throw"
              : has("slingshot")
                ? "Marbles per shot"
                : "Soldier marbles per shot"
          : stat.label === "Extra enemies pierced"
            ? "Extra enemies passed through"
            : stat.label === "Lantern and coil damage"
              ? `${lightName[0].toUpperCase() + lightName.slice(1)} damage`
              : stat.label,
    }));
  } else {
    const descriptions = {
      orbit: context.owned
        ? `${count("orbit") > 1 ? "Small planets circle" : "A small planet circles"} you, hurting enemies and blocking red enemy shots.`
        : `${count("orbit") ? "Add another small planet that circles" : "A small planet circles"} you, hurting enemies and blocking red enemy shots.`,
      echo: `${manual} deals more damage and knocks enemies farther back.`,
      recall: `${manual} recharges faster.`,
      thread: `${manual} reaches farther.`,
      bloom:
        "Medical carts charge while you're nearby, then heal you and hurt enemies. Make that burst stronger and wider.",
      heal: `${manual} restores ${!context.owned && (player.character === "conservator" || count("heal")) ? "more " : ""}health to you${context.teammates ? " and nearby teammates" : ""}. Medical carts restore more health too.`,
      frost: `${manual} slows enemies${player.character === "conservator" ? " for longer" : ""}. The next weapon hit on them deals extra damage.`,
      mirror:
        !context.owned && soldier
          ? "Make your toy soldier's marbles hit harder."
          : "A small toy soldier follows you and automatically shoots marbles at enemies.",
      magnet:
        "Medical carts roll toward you. Blocking red enemy shots fills their charge meter faster.",
    };
    description = descriptions[id] || description;
  }

  const labels = {
    [`${getCharacter(player.character).ability} damage`]: `${actionLabel} damage`,
    [`${getCharacter(player.character).ability} range`]: `${actionLabel} range`,
    [`${getCharacter(player.character).ability} recharge time`]:
      "Time between uses",
    [`${getCharacter(player.character).ability} healing`]: `Health per ${action}`,
    "Firing speed": "Attack speed",
    "Orbiting planets": "Planets circling you",
    "Cart pulse range": "Cart burst range",
    "Companion damage": "Soldier marble damage",
    "Damage when hurt": "Marble damage when hurt",
    "Cart charge per red shot cleared": "Cart charge per blocked shot",
    "Shot-to-cart range": "Range for charging carts with blocked shots",
  };
  stats = stats.map((stat) => ({
    ...stat,
    label: labels[stat.label] || stat.label,
  }));
  if (id === "orbit" && count("magnet"))
    synergy = "The shots it blocks also charge medical carts.";
  if (id === "frost" && context.teammates)
    synergy = "A teammate's hit can trigger that bonus too.";
  if (id === "mirror" && ["heavy", "quick", "fork", "pierce"].some(count))
    synergy = "Benefits from your weapon upgrades.";
  return { description, stats, synergy };
}
