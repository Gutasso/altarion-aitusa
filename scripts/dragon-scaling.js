/**
 * Dragon Scaling Engine for Altarion & Aitusa
 * Dynamically updates actor size, movement/flight speeds, AC formula, Hit Die denomination,
 * and damage immunities/resistances based on the Dragon's level and size tier.
 */

export class DragonScalingManager {
  /**
   * Determine size tier and metadata from dragon level
   * Tier 1: Tiny (1-3)
   * Tier 2: Small (4-7)
   * Tier 3: Medium (8-12)
   * Tier 4: Large (13-17)
   * Tier 5: Huge (18-20)
   */
  static getSizeData(level = 4) {
    if (level < 4) {
      return {
        tier: 1,
        sizeCode: "tiny",
        sizeLabel: "Tiny",
        hitDie: "d4",
        walkSpeed: 20,
        flySpeed: 0,
        foodMultiplier: "1x",
        clawDice: "1d4 + @mod",
        bitePiercing: "1d4 + @mod",
        biteForce: "1d6",
        tailReach: 5,
        tailDice: "1d4 + @mod",
        wingRange: 5,
        breathCone: 15,
        breathDice: "2d10",
        wardDice: "2d6",
        rayRange: 30,
        rayDice: "4d6",
        shieldingDice: "2d6",
        burstingDice: "3d6",
        surgeDice: "5d6",
        markingRange: 10
      };
    } else if (level < 8) {
      return {
        tier: 2,
        sizeCode: "sm",
        sizeLabel: "Small",
        hitDie: "d6",
        walkSpeed: 30,
        flySpeed: 15,
        foodMultiplier: "2x",
        clawDice: "1d4 + @mod",
        bitePiercing: "1d4 + @mod",
        biteForce: "1d6",
        tailReach: 10,
        tailDice: "2d4 + @mod",
        wingRange: 10,
        breathCone: 15,
        breathDice: "2d10",
        wardDice: "3d6",
        rayRange: 45,
        rayDice: "5d6",
        shieldingDice: "3d6",
        burstingDice: "4d6",
        surgeDice: "6d6",
        markingRange: 15
      };
    } else if (level < 13) {
      return {
        tier: 3,
        sizeCode: "med",
        sizeLabel: "Medium",
        hitDie: "d8",
        walkSpeed: 30,
        flySpeed: 30,
        foodMultiplier: "4x",
        clawDice: "2d4 + @mod",
        bitePiercing: "2d4 + @mod",
        biteForce: "2d6",
        tailReach: 10,
        tailDice: "2d4 + @mod",
        wingRange: 10,
        breathCone: 30,
        breathDice: "4d10",
        wardDice: "4d6",
        rayRange: 60,
        rayDice: "6d6",
        shieldingDice: "4d6",
        burstingDice: "4d6",
        surgeDice: "6d6",
        markingRange: 15
      };
    } else if (level < 18) {
      return {
        tier: 4,
        sizeCode: "lg",
        sizeLabel: "Large",
        hitDie: "d10",
        walkSpeed: 35,
        flySpeed: 70,
        foodMultiplier: "8x",
        clawDice: "2d6 + @mod",
        bitePiercing: "2d6 + @mod",
        biteForce: "3d6",
        tailReach: 15,
        tailDice: "2d6 + @mod",
        wingRange: 15,
        breathCone: 60,
        breathDice: "6d10",
        wardDice: "5d6",
        rayRange: 75,
        rayDice: "7d6",
        shieldingDice: "5d6",
        burstingDice: "5d6",
        surgeDice: "7d6",
        markingRange: 30
      };
    } else {
      return {
        tier: 5,
        sizeCode: "huge",
        sizeLabel: "Huge",
        hitDie: "d12",
        walkSpeed: 45,
        flySpeed: 90,
        foodMultiplier: "12x",
        clawDice: "2d8 + @mod",
        bitePiercing: "2d8 + @mod",
        biteForce: "4d6",
        tailReach: 20,
        tailDice: "2d8 + @mod",
        wingRange: 20,
        breathCone: 90,
        breathDice: "8d10",
        wardDice: "6d6",
        rayRange: 90,
        rayDice: "8d6",
        shieldingDice: "6d6",
        burstingDice: "6d6",
        surgeDice: "8d6",
        markingRange: 60
      };
    }
  }

  /**
   * Apply trait, speed, AC, Hit Die, and immunity scaling to Aitusa actor.
   * (Feature descriptions and activities are scaled directly via PlutoniumDataBridge.)
   */
  static async scaleAitusa(actor) {
    if (!actor) return;

    const dragonClass = actor.items.find(
      i => i.type === "class" && (i.system.identifier === "dragon" || i.name.toLowerCase() === "dragon")
    );
    const level = dragonClass?.system?.levels || actor.system.details?.level || 4;
    const sizeData = this.getSizeData(level);

    // 1. Update actor traits, speeds, and AC calculation
    const updates = {
      "system.traits.size": sizeData.sizeCode,
      "system.attributes.movement.walk": sizeData.walkSpeed,
      "system.attributes.movement.swim": sizeData.walkSpeed,
      "system.attributes.movement.fly": sizeData.flySpeed,
      "system.attributes.ac.calc": "custom",
      "system.attributes.ac.formula": "11 + @abilities.con.mod + @prof"
    };

    // Ensure Force Damage Immunity
    if (actor.system.traits?.di) {
      const diList = Array.from(actor.system.traits.di.value || []);
      if (!diList.includes("force")) {
        diList.push("force");
        updates["system.traits.di.value"] = diList;
      }
    }

    await actor.update(updates);

    // 2. Scale Dragon class Hit Die denomination according to Dragon Statistics (d4/d6/d8/d10/d12)
    if (dragonClass) {
      const currentHd = dragonClass.system?.hd?.denomination || dragonClass.system?.hitDice;
      if (currentHd !== sizeData.hitDie) {
        await dragonClass.update({
          "system.hitDice": sizeData.hitDie,
          "system.hd.denomination": sizeData.hitDie
        });
      }
    }
  }

  /**
   * Apply trait scaling (Force Resistance at lvl 1+, Force Immunity at lvl 11+ via Draconic Body) to Altarion actor.
   */
  static async scaleAltarion(actor, riderLevel = null) {
    if (!actor) return;

    if (riderLevel === null) {
      const drClass = actor.items.find(
        i => i.type === "class" && (i.system.identifier === "dragon-rider" || i.name.toLowerCase() === "dragon rider")
      );
      riderLevel = drClass?.system?.levels || 4;
    }

    const updates = {};

    // Force Resistance on Altarion (Dragon Ancestry)
    if (actor.system.traits?.dr) {
      const drList = Array.from(actor.system.traits.dr.value || []);
      if (!drList.includes("force")) {
        drList.push("force");
        updates["system.traits.dr.value"] = drList;
      }
    }

    // Force Immunity at level 11+ (Draconic Body)
    if (actor.system.traits?.di) {
      const diList = Array.from(actor.system.traits.di.value || []);
      const hasForceImmunity = diList.includes("force");
      if (riderLevel >= 11 && !hasForceImmunity) {
        diList.push("force");
        updates["system.traits.di.value"] = diList;
      } else if (riderLevel < 11 && hasForceImmunity) {
        updates["system.traits.di.value"] = diList.filter(v => v !== "force");
      }
    }

    if (!foundry.utils.isEmpty(updates)) {
      await actor.update(updates);
    }
  }
}
