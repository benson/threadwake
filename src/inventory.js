import { UPGRADES } from "./sim.js";
import { upgradeDetails } from "./upgrade-copy.js";
import { WEAPONS } from "./characters.js";
import { WEAPON_BALANCE } from "./config.js";

export function acquiredItems(player, context = {}) {
  if (!player) return [];
  const count = (id) => player.upgrades.filter((value) => value === id).length;
  return [
    ...player.weapons.map((id) => {
      const weapon = WEAPONS[id],
        rule = WEAPON_BALANCE[id];
      const damage =
        rule.damage *
        (1 + 0.35 * count("heavy")) *
        (["lantern", "storm"].includes(id) ? 1 + 0.12 * count("pierce") : 1);
      const stats = [
        {
          label: "Damage per hit",
          value: String(Math.round(damage * 10) / 10),
        },
        {
          label: "Attacks per second",
          value: (1 / (rule.interval * Math.pow(0.8, count("quick")))).toFixed(
            1,
          ),
        },
      ];
      if (id === "storm")
        stats.push({
          label: "Lightning targets",
          value: String(rule.targets + count("fork")),
        });
      return {
        key: `weapon:${id}`,
        name: weapon.name,
        description: weapon.description,
        stats,
      };
    }),
    ...[...new Set(player.upgrades)].map((id) => {
      const upgrade = UPGRADES.find((item) => item.id === id);
      const details = upgradeDetails(player, id, { ...context, owned: true });
      return {
        key: `curio:${id}`,
        icon: id,
        count: count(id),
        name: upgrade.name,
        description: details.description,
        stats: details.stats
          .filter((stat) => stat.label !== "Health now")
          .map((stat) => ({ label: stat.label, value: stat.before })),
      };
    }),
  ];
}
