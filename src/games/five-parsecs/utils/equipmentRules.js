export function getCrewMemberName(crewMembers, crewMemberId) {
  const member = crewMembers.find((item) => item.crewMemberId === crewMemberId);

  return member?.name || "";
}

export function getCrewMemberSpecies(crewMember) {
  return (
    crewMember?.speciesType ||
    crewMember?.species ||
    crewMember?.origin ||
    ""
  );
}

export function isBotOrSoulless(crewMember) {
  const species = getCrewMemberSpecies(crewMember).toLowerCase();

  return species === "bot" || species === "soulless";
}

export function canAttachGunModToWeapon({ equipment, mod }) {
  if (!equipment || equipment.category !== "weapon") {
    return {
      ok: false,
      message: "Gun mods can only be attached to weapons.",
    };
  }

  const weapon = equipment.weapon || {};
  const traits = weapon.traits || [];
  const weaponName = equipment.name || "";

  if (mod.name === "Assault blade" && traits.includes("Pistol")) {
    return {
      ok: false,
      message: "Assault blade is Non-Pistol only.",
    };
  }

  if (mod.name === "Bipod" && traits.includes("Pistol")) {
    return {
      ok: false,
      message: "Bipod is Non-Pistol only.",
    };
  }

  if (mod.name === "Hot shot pack") {
    const allowed = ["Blast pistol", "Blast rifle", "Hand laser", "Infantry laser"];

    if (!allowed.map((item) => item.toLowerCase()).includes(weaponName.toLowerCase())) {
      return {
        ok: false,
        message: "Hot shot pack can only be fitted to a Blast Pistol, Blast Rifle, Hand Laser, or Infantry Laser.",
      };
    }
  }

  return {
    ok: true,
    message: "",
  };
}

export function canAttachGunSightToWeapon({ equipment, sight }) {
  if (!equipment || equipment.category !== "weapon") {
    return {
      ok: false,
      message: "Gun sights can only be attached to weapons.",
    };
  }

  const weapon = equipment.weapon || {};
  const traits = weapon.traits || [];
  const shots = Number(weapon.shots || 0);
  const range = String(weapon.range || "");

  if (traits.includes("Melee") || range.toLowerCase() === "brawl") {
    return {
      ok: false,
      message: "Sights must be fitted to a non-melee weapon.",
    };
  }

  if (traits.includes("Single use")) {
    return {
      ok: false,
      message: "Sights cannot be fitted to a single-use weapon.",
    };
  }

  if (shots <= 0) {
    return {
      ok: false,
      message: "Sights must be fitted to a weapon that can shoot.",
    };
  }

  if (sight.name === "Laser sight" && !traits.includes("Pistol")) {
    return {
      ok: false,
      message: "Laser sight can only be fitted to a Pistol.",
    };
  }

  return {
    ok: true,
    message: "",
  };
}

export function canAssignEquipmentToCrewMember({
  equipment,
  allEquipment,
  crewMembers,
  targetCrewMemberId,
}) {
  const crewMember = crewMembers.find(
    (item) => item.crewMemberId === targetCrewMemberId
  );

  if (!crewMember) {
    return {
      ok: false,
      message: "Select a valid crew member.",
    };
  }

  if (equipment.category === "consumable") {
    return {
      ok: false,
      message: "Consumables are not carried by a specific character. Keep them in the Stash.",
    };
  }

  if (equipment.category === "onboard") {
    return {
      ok: false,
      message: "On-board items are not carried into battle by a specific crew member. Keep them in the Stash/ship inventory.",
    };
  }

  if (equipment.category === "protection") {
    const subtype = equipment.subtype;

    if (subtype === "Armor" || subtype === "Screen") {
      const alreadyEquipped = allEquipment.find((item) => {
        return (
          item.equipmentId !== equipment.equipmentId &&
          item.category === "protection" &&
          item.subtype === subtype &&
          item.locationType === "crewMember" &&
          item.crewMemberId === targetCrewMemberId
        );
      });

      if (alreadyEquipped) {
        return {
          ok: false,
          message: `This crew member already has ${alreadyEquipped.name} equipped as their ${subtype}. A character may wear no more than one Armor and one Screen.`,
        };
      }
    }
  }

  if (equipment.category === "implant") {
    if (isBotOrSoulless(crewMember)) {
      return {
        ok: false,
        message: "Bots and Soulless cannot use implants.",
      };
    }

    const currentImplants = allEquipment.filter((item) => {
      return (
        item.equipmentId !== equipment.equipmentId &&
        item.category === "implant" &&
        item.locationType === "crewMember" &&
        item.crewMemberId === targetCrewMemberId
      );
    });

    if (currentImplants.length >= 2) {
      return {
        ok: false,
        message: "This crew member already has 2 implants. A character may have up to 2 implants.",
      };
    }
  }

  if (equipment.category === "utility") {
    const currentUtilityDevices = allEquipment.filter((item) => {
      return (
        item.equipmentId !== equipment.equipmentId &&
        item.category === "utility" &&
        item.locationType === "crewMember" &&
        item.crewMemberId === targetCrewMemberId
      );
    });

    if (currentUtilityDevices.length >= 3) {
      return {
        ok: false,
        message: "This crew member already has 3 utility devices. A character can carry up to 3 items from the Utility Devices list.",
      };
    }
  }

  return {
    ok: true,
    message: "",
  };
}