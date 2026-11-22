/**
 * Curated Character JSON Snapshot Data for Party Sync (Aitusa, Altarion Talendris, Flinn Encantor, Kyrion, Parva)
 * - Syncs Ability Scores, Skill Proficiencies/Expertise, Curated Spells, Inventory, Currency,
 *   Tool Proficiencies, Languages, Extra Feats, Backgrounds, and `professions-reworked-5e` flags.
 * - Uses verified local Foundry icons (zero third-party cdn.5e.tools / githubusercontent cookie warnings).
 * - Converts the 5 "Card of the Resonant Arcana" homebrew magic items into attunable Equipment (Trinket) items
 *   with 1/Long Rest charges, ready-to-use activities, and full automation flags.
 */

export const PARTY_JSON_SYNC_VERSION = 3;

export const EXTERNAL_IMG_MIGRATION_MAP = {
  "https://cdn.5e.tools/2024/img/items/DMG/Bag%20of%20Holding.webp": "icons/containers/bags/coinpouch-cloth-purple.webp",
  "https://cdn.5e.tools/2024/img/items/DMG/Cloak%20of%20Protection.webp": "icons/equipment/back/cloak-collared-blue-gold.webp",
  "https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/items/DMG/Sending%20Stones.webp": "icons/commodities/gems/gem-faceted-oval-blue.webp",
  "https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/backgrounds/BMT/Rewarded.webp": "icons/sundries/flags/banner-blue.webp",
  "https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/backgrounds/BMT/Ruined.webp": "icons/environment/settlement/graveyard-tombstone-night.webp",
  "https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/items/PHB/Trinket%20(PHB).webp": "icons/commodities/treasure/brooch-crown-gold.webp",
  "360_F_539323090_rgemn9ld3PWY4BTQ7X2Gz9gxHIblEjld.jpg": "icons/sundries/gaming/rune-card.webp"
};

export const PARTY_JSON_DATA = {
  "aitusa": {
    "sourceName": "Aitusa",
    "currency": {
      "pp": 0,
      "gp": 0,
      "ep": 0,
      "sp": 0,
      "cp": 0
    },
    "tools": {},
    "languages": {
      "value": [
        "common",
        "draconic"
      ],
      "custom": "",
      "communication": {}
    },
    "professionsFlags": {
      "treinosAtivos": [
        "Atributo"
      ],
      "listaTreinamentos": [
        {
          "categoria": "Atributo",
          "nome": "Treinamento de Força",
          "attrKey": "str",
          "acertosAtuais": 0,
          "totalNecessario": 30,
          "dificuldadeEspecifica": "Fácil",
          "infoExtra": "(Valor atual: 14 - Fácil)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        },
        {
          "categoria": "Atributo",
          "nome": "Treinamento de Constituição",
          "attrKey": "con",
          "acertosAtuais": 0,
          "totalNecessario": 30,
          "dificuldadeEspecifica": "Fácil",
          "infoExtra": "(Valor atual: 14 - Fácil)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        },
        {
          "categoria": "Atributo",
          "nome": "Treinamento de Inteligência",
          "attrKey": "int",
          "acertosAtuais": 0,
          "totalNecessario": 30,
          "dificuldadeEspecifica": "Fácil",
          "infoExtra": "(Valor atual: 14 - Fácil)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        }
      ]
    },
    "items": [
      {
        "origId": "Mmo9uud7LwkI3HTY",
        "doc": {
          "name": "Card of the Resonant Arcana (The High Priestess)",
          "type": "equipment",
          "img": "icons/sundries/gaming/rune-card.webp",
          "system": {
            "description": {
              "value": "<p>This rectangular slab of polished black quartz appears to hold a fragment of the night sky within it. While you are attuned to the card, stardust drifts inside the stone to form the illustration of a Major Arcana that resonates with your soul.</p><p data-path-to-node=\"4\">The card has 1 charge. You can expend this charge to use the property of the arcana engraved upon it. The card regains its expended charge daily at dawn.</p><p></p><p><strong>The High Priestess.</strong> While holding this card, you can expend its charge to cast the <em data-path-to-node=\"9\" data-index-in-node=\"81\">detect magic</em> spell without expending a spell slot or requiring components. Additionally, if the user focuses it's sight on an object, creature, or magical effect within 30 feet, it gains truesight against that specific target for 10 minutes.</p>",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "rarity": "veryRare",
            "identified": true,
            "attunement": "required",
            "attuned": false,
            "equipped": false,
            "properties": [
              "mgc"
            ],
            "type": {
              "value": "trinket",
              "baseItem": ""
            },
            "armor": {
              "value": null,
              "magicalBonus": null,
              "dex": null
            },
            "uses": {
              "spent": 0,
              "max": "1",
              "recovery": [
                {
                  "period": "lr",
                  "type": "recoverAll"
                }
              ]
            },
            "activities": {
              "resArcHighPri001": {
                "_id": "resArcHighPri001",
                "type": "utility",
                "name": "Use The High Priestess (Detect Magic + Truesight 30 ft)",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "value": "1",
                      "target": "",
                      "scaling": {}
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": false
                },
                "description": {
                  "chatFlavor": "Expends 1 charge to cast Detect Magic (no spell slot or components) and grants Truesight 30 ft for 10 minutes."
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": null,
                  "units": "self",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft"
                  },
                  "affects": {
                    "count": "",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": false,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "prompt": false,
                  "visible": false,
                  "name": "",
                  "formula": ""
                },
                "sort": 0
              }
            },
            "source": {
              "custom": "Coria Homebrew",
              "rules": "2014"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0,
          "flags": {
            "dnd5e": {},
            "altarion-aitusa": {
              "isResonantArcanaCard": true,
              "resonantArcanaKey": "high-priestess"
            }
          }
        }
      }
    ],
    "abilities": {
      "str": {
        "value": 14,
        "proficient": 0
      },
      "dex": {
        "value": 10,
        "proficient": 0
      },
      "con": {
        "value": 14,
        "proficient": 1
      },
      "int": {
        "value": 14,
        "proficient": 1
      },
      "wis": {
        "value": 12,
        "proficient": 0
      },
      "cha": {
        "value": 8,
        "proficient": 0
      }
    },
    "skills": {
      "arc": 1,
      "inv": 1
    },
    "spells": [
      {
        "origId": "fPJaXYufCQDKTLhh",
        "doc": {
          "name": "Comprehend Languages",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "224",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>For the duration, you understand the literal meaning of any spoken language that you hear. You also understand any written language that you see, but you must be touching the surface on which the words are written. It takes about 1 minute to read one page of text.</p><p>This spell doesn't decode secret messages in a text or a glyph, such as an arcane sigil, that isn't part of a written language.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "material",
              "ritual"
            ],
            "materials": {
              "value": "a pinch of soot and salt",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "self",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "comprehend-languages"
          },
          "img": "icons/skills/trades/academics-book-study-runes.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "comprehend%20languages_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "77uItCmffdlEIT3O",
        "doc": {
          "name": "Cure Wounds",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "230",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>A creature you touch regains a number of hit points equal to [[/r 1d8]] + your spellcasting ability modifier. This spell has no effect on undead or constructs.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, the healing increases by [[/r 1d8]] for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "evo",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "heal",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "healing": {
                  "number": 1,
                  "denomination": 8,
                  "bonus": "@mod",
                  "types": [
                    "healing"
                  ],
                  "custom": {
                    "enabled": false,
                    "formula": ""
                  },
                  "scaling": {
                    "mode": "whole",
                    "number": 1,
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "cure-wounds"
          },
          "img": "icons/magic/life/cross-flared-green.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "cure%20wounds_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "oSss2qylemox75do",
        "doc": {
          "name": "Detect Magic",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "231",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>For the duration, you sense the presence of magic within 30 feet of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object in the area that bears magic, and you learn its <a href=\"https://5e.tools/book.html#PHB,10,the%20schools%20of%20magic,0\">school of magic</a>, if any.</p><p>The spell can penetrate most barriers, but it is blocked by 1 foot of stone, 1 inch of common metal, a thin sheet of lead, or 3 feet of wood or dirt.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "ritual",
              "concentration"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "type": "radius",
                "size": "30",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "10",
              "units": "minute"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "detect-magic"
          },
          "img": "icons/magic/unholy/hands-cloud-light-pink.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "detect%20magic_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "SEbWYySCfjacymow",
        "doc": {
          "name": "Find Familiar",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "240",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You gain the service of a familiar, a spirit that takes an animal form you choose: @creature[bat], @creature[cat], @creature[crab], @creature[frog] (toad), @creature[hawk], @creature[lizard], @creature[octopus], @creature[owl], @creature[poisonous snake], fish (@creature[quipper]), @creature[rat], @creature[raven], @creature[sea horse], @creature[spider], or @creature[weasel]. Appearing in an unoccupied space within range, the familiar has the statistics of the chosen form, though it is a celestial, fey, or fiend (your choice) instead of a beast.</p><p><i class=\"ve-muted\">Additional <a href=\"https://5e.tools/bestiary.html#blankhash,flstmiscellaneous:familiar=1\">animal form choices</a> may be available at the DM's discretion.</i></p><p>Your familiar acts independently of you, but it always obeys your commands. In combat, it rolls its own initiative and acts on its own turn. A familiar can't attack, but it can take other actions as normal.</p><p>When the familiar drops to 0 hit points, it disappears, leaving behind no physical form. It reappears after you cast this spell again. As an action, you can temporarily dismiss the familiar to a pocket dimension. Alternatively, you can dismiss it forever. As an action while it is temporarily dismissed, you can cause it to reappear in any unoccupied space within 30 feet of you. Whenever the familiar drops to 0 hit points or disappears into the pocket dimension, it leaves behind in its space anything it was wearing or carrying.</p><p>While your familiar is within 100 feet of you, you can communicate with it telepathically. Additionally, as an action, you can see through your familiar's eyes and hear what it hears until the start of your next turn, gaining the benefits of any special senses that the familiar has. During this time, you are &amp;Reference[condition=deafened]{deaf} and &amp;Reference[condition=blinded]{blind} with regard to your own senses.</p><p>You can't have more than one familiar at a time. If you cast this spell while you already have a familiar, you instead cause it to adopt a new form. Choose one of the forms from the above list. Your familiar transforms into the chosen creature.</p><p>Finally, when you cast a spell with a range of touch, your familiar can deliver the spell as if it had cast the spell. Your familiar must be within 100 feet of you, and it must use its reaction to deliver the spell when you cast it. If the spell requires an attack roll, you use your attack modifier for the roll.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "con",
            "properties": [
              "vocal",
              "somatic",
              "material",
              "ritual"
            ],
            "materials": {
              "value": "10 gp worth of charcoal, incense, and herbs that must be consumed by fire in a brass brazier",
              "consumed": true,
              "cost": 10,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "space",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "any",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "10",
              "units": "ft"
            },
            "activation": {
              "type": "hour",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "summon",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "bonuses": {},
                "creatureSizes": [],
                "creatureTypes": [],
                "match": {
                  "attacks": false,
                  "disposition": false,
                  "proficiency": false,
                  "saves": false
                },
                "profiles": [],
                "summon": {
                  "mode": "",
                  "prompt": true
                },
                "visibility": {
                  "identifier": "",
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                },
                "img": null,
                "sort": 0,
                "flags": {}
              }
            },
            "identifier": "find-familiar"
          },
          "img": "icons/creatures/birds/corvid-call-sound-glowing.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "find%20familiar_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "cn8rVTywhA6oyUdI",
        "doc": {
          "name": "Identify",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "252",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You choose one object that you must touch throughout the casting of the spell. If it is a magic item or some other magic-imbued object, you learn its properties and how to use them, whether it requires attunement to use, and how many charges it has, if any. You learn whether any spells are affecting the item and what they are. If the item was created by a spell, you learn which spell created it.</p><p>If you instead touch a creature throughout the casting, you learn what spells, if any, are currently affecting it.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "material",
              "ritual"
            ],
            "materials": {
              "value": "a pearl worth at least 100 gp and an owl feather",
              "consumed": false,
              "cost": 100,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "object",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "minute",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "identify"
          },
          "img": "icons/sundries/scrolls/scroll-bound-blue-red.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "identify_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "c4UgEcfH6mO1Ejpp",
        "doc": {
          "name": "Light",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "255",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet. The light can be colored as you like. Completely covering the object with something opaque blocks the light. The spell ends if you cast it again or dismiss it as an action.</p><p>If you target an object held or worn by a hostile creature, that creature must succeed on a Dexterity saving throw to avoid the spell.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "evo",
            "properties": [
              "vocal",
              "material"
            ],
            "materials": {
              "value": "a firefly or phosphorescent moss",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "object",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "save",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "none",
                  "parts": []
                },
                "save": {
                  "ability": [
                    "dex"
                  ],
                  "dc": {
                    "calculation": "spellcasting",
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "light"
          },
          "img": "icons/magic/light/orb-lightbulb-gray.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "light_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "fGiqphJ9BqqFcxHj",
        "doc": {
          "name": "Longstrider",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "256",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You touch a creature. The target's speed increases by 10 feet until the spell ends.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "trs",
            "properties": [
              "vocal",
              "somatic",
              "material"
            ],
            "materials": {
              "value": "a pinch of dirt",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "longstrider"
          },
          "img": "icons/equipment/feet/boots-leather-laced-brown.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "longstrider_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "bDJPpRFqawAXi9wz",
        "doc": {
          "name": "Mage Hand",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "256",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action. The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again.</p><p>You can use your action to control the hand. You can use the hand to manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour the contents out of a vial. You can move the hand up to 30 feet each time you use it.</p><p>The hand can't attack, activate magic items, or carry more than 10 pounds.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "con",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "space",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "30",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "mage-hand"
          },
          "img": "icons/magic/light/orbs-hand-gray.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "mage%20hand_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "j6vWC17b7kNDsIhI",
        "doc": {
          "name": "Shield",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "275",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from @spell[magic missile].</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "abj",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "self",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "reaction",
              "condition": "which you take when you are hit by an attack or targeted by the magic missile spell",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "round"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [
                  {
                    "_id": "6pbotGIvqQkraPva",
                    "level": {}
                  }
                ],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "shield"
          },
          "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "shield_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": [
            {
              "_id": "6pbotGIvqQkraPva",
              "flags": {
                "plutonium": {
                  "dedupeId": "shield"
                }
              },
              "changes": [
                {
                  "key": "system.attributes.ac.bonus",
                  "mode": 2,
                  "value": "5",
                  "priority": null
                }
              ],
              "disabled": false,
              "duration": {
                "startTime": null,
                "rounds": 1,
                "seconds": null,
                "combat": null,
                "turns": null,
                "startRound": null,
                "startTurn": null
              },
              "origin": "Item.FlLKKv7bQBlIAs11",
              "tint": "#ffffff",
              "transfer": false,
              "name": "Shield",
              "description": "<p>Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.</p>",
              "statuses": [],
              "_stats": {
                "compendiumSource": null,
                "duplicateSource": null,
                "coreVersion": "13.351",
                "systemId": "dnd5e",
                "systemVersion": "3.3.1",
                "createdTime": null,
                "modifiedTime": null,
                "lastModifiedBy": null,
                "exportSource": null
              },
              "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
              "type": "base",
              "system": {},
              "sort": 0
            }
          ]
        }
      },
      {
        "origId": "DPQYlAFXMlkzve1k",
        "doc": {
          "name": "Silvery Barbs",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "SCC",
              "page": "38",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You magically distract the triggering creature and turn its momentary uncertainty into encouragement for another creature. The triggering creature must reroll the [[/r d20]] and use the lower roll.</p><p>You can then choose a different creature you can see within range (you can choose yourself). The chosen creature has advantage on the next attack roll, ability check, or saving throw it makes within 1 minute. A creature can be empowered by only one use of this spell at a time.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "enc",
            "properties": [
              "vocal"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "60",
              "units": "ft"
            },
            "activation": {
              "type": "reaction",
              "condition": "which you take when a creature you can see within 60 feet of yourself succeeds on an attack roll, an ability check, or a saving throw",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "d20",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "silvery-barbs"
          },
          "img": "icons/magic/control/energy-stream-link-white.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "SCC",
              "hash": "silvery%20barbs_scc",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "HyFI68LIGSwN9QnR",
        "doc": {
          "name": "Absorb Elements",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "XGE",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>The spell captures some of the incoming energy, lessening its effect on you and storing it for your next melee attack. You have resistance to the triggering damage type until the start of your next turn. Also, the first time you hit with a melee attack on your next turn, the target takes an extra [[/damage 1d6]] damage of the triggering type, and the spell ends.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, the extra damage increases by [[/damage 1d6]] for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "abj",
            "properties": [
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "self",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "reaction",
              "condition": "which you take when you take acid, cold, fire, lightning, or thunder damage",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "round"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "damage",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "critical": {
                    "allow": false,
                    "bonus": ""
                  },
                  "parts": [
                    {
                      "number": 1,
                      "denomination": 6,
                      "bonus": "",
                      "types": [],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "whole",
                        "number": 1,
                        "formula": ""
                      }
                    }
                  ]
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "absorb-elements"
          },
          "img": "icons/magic/symbols/elements-air-earth-fire-water.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "XGE",
              "hash": "absorb%20elements_xge",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      }
    ]
  },
  "altarion": {
    "sourceName": "Altarion Talendris",
    "currency": {
      "pp": 0,
      "gp": 0,
      "ep": 0,
      "sp": 2,
      "cp": 0
    },
    "tools": {
      "calligrapher": {
        "value": 1,
        "ability": "int",
        "roll": {
          "min": null,
          "max": null,
          "mode": 0
        },
        "bonuses": {
          "check": ""
        }
      },
      "cartographer": {
        "value": 0,
        "ability": "wis",
        "roll": {
          "min": null,
          "max": null,
          "mode": 0
        },
        "bonuses": {
          "check": ""
        }
      }
    },
    "languages": {
      "value": [
        "celestial",
        "common",
        "draconic",
        "dwarvish",
        "elvish"
      ],
      "custom": "",
      "communication": {}
    },
    "professionsFlags": {
      "profissoesAtivas": [
        "Escriba",
        "Cartógrafo"
      ],
      "colapsos": {
        "Coureiro": false,
        "Escriba": false,
        "Sicário": true
      },
      "projetos": [
        {
          "profissao": "Cartógrafo",
          "nome": "Novo Projeto de Cartógrafo",
          "subTipo": "Desenho de Mapa",
          "complexidade": "Simples",
          "acertosAtuais": 0,
          "atributoPadrao": "int",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": "",
          "fase": "rascunho",
          "totalNecessario": 0,
          "bioma": "Pradaria",
          "dificuldadeEspecifica": "Fácil"
        }
      ],
      "ferramentasEquipadas": {
        "Escriba": "pJpPAZKy8tGizKdX"
      },
      "treinosAtivos": [
        "Atributo",
        "Profissão"
      ],
      "listaTreinamentos": [
        {
          "categoria": "Atributo",
          "nome": "Treinamento de Força",
          "attrKey": "str",
          "acertosAtuais": 0,
          "totalNecessario": 30,
          "dificuldadeEspecifica": "Fácil",
          "infoExtra": "(Valor atual: 16 - Fácil)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        },
        {
          "categoria": "Atributo",
          "nome": "Treinamento de Inteligência",
          "attrKey": "int",
          "acertosAtuais": 0,
          "totalNecessario": 30,
          "dificuldadeEspecifica": "Fácil",
          "infoExtra": "(Valor atual: 16 - Fácil)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        },
        {
          "categoria": "Profissão",
          "profissaoAlvo": "Escriba",
          "nome": "Treinamento de Escriba",
          "timestamp": 1792378539191,
          "acertosAtuais": 0,
          "totalNecessario": 10,
          "dificuldadeEspecifica": "Variável",
          "infoExtra": "(Profissão Conhecida - Possui Proficiência na Ferramenta - Ganhe XP completando projetos de Escriba)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        }
      ]
    },
    "items": [
      {
        "origId": "MQj9GnYZU7Xp1UJH",
        "doc": {
          "name": "Splint Armor",
          "type": "equipment",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>This armor is made of narrow vertical strips of metal riveted to a backing of leather that is worn over cloth padding. Flexible chain mail protects the joints.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "145",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 60,
              "units": "lb"
            },
            "price": {
              "value": 200,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "cover": null,
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": 17,
              "dex": 0
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "speed": {
              "value": null,
              "conditions": "",
              "units": "ft"
            },
            "strength": 15,
            "proficient": null,
            "type": {
              "value": "heavy",
              "baseItem": "splint"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [
              "stealthDisadvantage"
            ],
            "attuned": false,
            "activities": {},
            "identifier": "splint-armor",
            "crew": {
              "value": []
            }
          },
          "img": "icons/equipment/chest/breastplate-layered-steel.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "splint%20armor_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "Y5rQOjhzIdWsllgJ",
        "doc": {
          "name": "Sage",
          "type": "background",
          "system": {
            "description": {
              "value": "<div><div class=\"rd__b  rd__b--1\"><div class=\"rd__b  rd__b--2\"><div class=\"rd__b  rd__b--3\"><p>You spent years learning the lore of the multiverse. You scoured manuscripts, studied scrolls, and listened to the greatest experts on the subjects that interest you. Your efforts have made you a master in your fields of study.</p></div></div></div><hr /><div class=\"rd__b  rd__b--1\"><ul class=\"rd__list rd__list-hang-notitle\"><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Skill Proficiencies:\"><span class=\"bold rd__list-item-name\">Skill Proficiencies:</span> &amp;Reference[skill=Arcana], &amp;Reference[skill=History]</p></li><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Languages:\"><span class=\"bold rd__list-item-name\">Languages:</span> Two of your choice</p></li><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Equipment:\"><span class=\"bold rd__list-item-name\">Equipment:</span> A @item[Ink (1-ounce bottle)|phb|bottle of black ink], a quill, a small knife, a letter from a dead colleague posing a question you have not yet been able to answer, a set of @item[common clothes|phb], and a belt @item[pouch|phb] containing 10 gp</p></li></ul><div data-roll-name-ancestor=\"Feature: Researcher\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"1\"> <span class=\"entry-title-inner\">Feature: Researcher</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it. Usually, this information comes from a library, scriptorium, university, or a sage or other learned person or creature. Your DM might rule that the knowledge you seek is secreted away in an almost inaccessible place, or that it simply cannot be found. Unearthing the deepest secrets of the multiverse can require an adventure or even a whole campaign.</p></div><div data-roll-name-ancestor=\"Specialty\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"2\"> <span class=\"entry-title-inner\">Specialty</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>To determine the nature of your scholarly training, roll a d8 or choose from the options in the table below.</p><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-1 ve-text-center\" data-rd-isroller=\"true\">[[/r d8]]</th><th class=\"ve-col-11\" data-rd-isroller=\"false\">Field of Study</th></tr></thead><tbody><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-11\">Alchemist</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-11\">Astronomer</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-11\">Discredited academic</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-11\">Librarian</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-11\">Professor</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-11\">Researcher</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"7\" data-roll-max=\"7\">7</td><td class=\"ve-col-11\">Wizard's apprentice</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"8\" data-roll-max=\"8\">8</td><td class=\"ve-col-11\">Scribe</td></tr></tbody></table></div><div data-roll-name-ancestor=\"Suggested Characteristics\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"3\"> <span class=\"entry-title-inner\">Suggested Characteristics</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>Sages are defined by their extensive studies, and their characteristics reflect this life of study. Devoted to scholarly pursuits, a sage values knowledge highly—sometimes in its own right, sometimes as a means toward other ideals.</p><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-1 ve-text-center\" data-rd-isroller=\"true\">[[/r d8]]</th><th class=\"ve-col-11\" data-rd-isroller=\"false\">Personality Trait</th></tr></thead><tbody><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-11\">I use polysyllabic words that convey the impression of great erudition.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-11\">I've read every book in the world's greatest libraries—or I like to boast that I have.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-11\">I'm used to helping out those who aren't as smart as I am, and I patiently explain anything and everything to others.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-11\">There's nothing I like more than a good mystery.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-11\">I'm willing to listen to every side of an argument before I make my own judgment.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-11\">I... speak... slowly... when talking... to idiots,... which... almost... everyone... is... compared... to me.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"7\" data-roll-max=\"7\">7</td><td class=\"ve-col-11\">I am horribly, horribly awkward in social situations.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"8\" data-roll-max=\"8\">8</td><td class=\"ve-col-11\">I'm convinced that people are always trying to steal my secrets.</td></tr></tbody></table><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-1 ve-text-center\" data-rd-isroller=\"true\">[[/r d6]]</th><th class=\"ve-col-11\" data-rd-isroller=\"false\">Ideal</th></tr></thead><tbody><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-11\">Knowledge. The path to power and self-improvement is through knowledge. (Neutral)</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-11\">Beauty. What is beautiful points us beyond itself toward what is true. (Good)</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-11\">Logic. Emotions must not cloud our logical thinking. (Lawful)</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-11\">No Limits. Nothing should fetter the infinite possibility inherent in all existence. (Chaotic)</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-11\">Power. Knowledge is the path to power and domination. (Evil)</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-11\">Self-Improvement. The goal of a life of study is the betterment of oneself. (Any)</td></tr></tbody></table><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-1 ve-text-center\" data-rd-isroller=\"true\">[[/r d6]]</th><th class=\"ve-col-11\" data-rd-isroller=\"false\">Bond</th></tr></thead><tbody><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-11\">It is my duty to protect my students.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-11\">I have an ancient text that holds terrible secrets that must not fall into the wrong hands.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-11\">I work to preserve a library, university, scriptorium, or monastery.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-11\">My life's work is a series of tomes related to a specific field of lore.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-11\">I've been searching my whole life for the answer to a certain question.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-11\">I sold my soul for knowledge. I hope to do great deeds and win it back.</td></tr></tbody></table><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-1 ve-text-center\" data-rd-isroller=\"true\">[[/r d6]]</th><th class=\"ve-col-11\" data-rd-isroller=\"false\">Flaw</th></tr></thead><tbody><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-11\">I am easily distracted by the promise of information.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-11\">Most people scream and run when they see a demon. I stop and take notes on its anatomy.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-11\">Unlocking an ancient mystery is worth the price of a civilization.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-11\">I overlook obvious solutions in favor of complicated ones.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-11\">I speak without really thinking through my words, invariably insulting others.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-11\">I can't keep a secret to save my life, or anyone else's.</td></tr></tbody></table></div></div></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "137",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "advancement": {},
            "startingEquipment": [],
            "identifier": "sage"
          },
          "flags": {
            "plutonium": {
              "page": "backgrounds.html",
              "source": "PHB",
              "hash": "sage_phb",
              "propDroppable": "background",
              "isDirectImport": true
            }
          },
          "effects": [],
          "img": "modules/plutonium/media/icon/archive-research.svg",
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "HxCZxVFUnqIjwBH5",
        "doc": {
          "name": "Common Clothes",
          "type": "equipment",
          "system": {
            "description": {
              "value": "",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 3,
              "units": "lb"
            },
            "price": {
              "value": 5,
              "denomination": "sp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "cover": null,
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": null,
              "dex": null
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "speed": {
              "value": null,
              "conditions": "",
              "units": "ft"
            },
            "strength": null,
            "proficient": null,
            "type": {
              "value": "clothing",
              "baseItem": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "",
                  "value": null,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "0",
                  "units": "ft",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "0",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "common-clothes",
            "crew": {
              "value": []
            }
          },
          "img": "icons/equipment/leg/pants-brown-leather-pants.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "common%20clothes_phb"
            },
            "dnd5e": {}
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "kbiQdD6MuSWCQGpx",
        "doc": {
          "name": "Ink (1-ounce bottle)",
          "type": "loot",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>Ink (1-ounce bottle)</p></div>",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 10,
              "denomination": "gp"
            },
            "identified": true,
            "rarity": "",
            "type": {
              "value": "gear",
              "subtype": ""
            },
            "properties": [],
            "unidentified": {
              "description": ""
            },
            "container": null,
            "identifier": "ink-1-ounce-bottle"
          },
          "img": "systems/dnd5e/icons/svg/items/loot.svg",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "ink%20(1-ounce%20bottle)_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "Uf5kQ0uK9sp7PYcZ",
        "doc": {
          "name": "Pouch",
          "type": "container",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>A cloth or leather pouch can hold up to 20 @item[sling bullet|phb|sling bullets] or 50 @item[blowgun needle|phb|blowgun needles], among other things. A compartmentalized pouch for holding spell components is called a @item[component pouch|phb]. A pouch can hold up to ⅕ cubic foot or 6 pounds of gear.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "153",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 1,
              "units": "lb"
            },
            "price": {
              "value": 5,
              "denomination": "sp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "capacity": {
              "weight": {
                "value": 6,
                "units": "lb"
              },
              "volume": {
                "units": "cubicFoot"
              }
            },
            "currency": {
              "cp": 0,
              "sp": 0,
              "ep": 0,
              "gp": 0,
              "pp": 0
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "identifier": "pouch"
          },
          "img": "icons/containers/bags/pouch-simple-leather-tan.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "pouch_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "QuhZNZp2n3wzO4xh",
        "doc": {
          "name": "Quill",
          "type": "loot",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "137",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "identified": true,
            "rarity": "",
            "type": {
              "value": "junk",
              "subtype": ""
            },
            "properties": [],
            "unidentified": {
              "description": ""
            },
            "container": null,
            "identifier": "quill"
          },
          "img": "modules/plutonium/media/icon/battle-gear.svg",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "quill_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "RBV2vp3NkU0jNo61",
        "doc": {
          "name": "Small Knife",
          "type": "loot",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "137",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "identified": true,
            "rarity": "",
            "type": {
              "value": "junk",
              "subtype": ""
            },
            "properties": [],
            "unidentified": {
              "description": ""
            },
            "container": null,
            "identifier": "small-knife"
          },
          "img": "icons/weapons/daggers/knife-green.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "small%20knife_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "MKsfQWJBL68ll9kb",
        "doc": {
          "name": "Letter from a Dead Colleague Posing a Question You Have Not Yet Been Able to Answer",
          "type": "loot",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "137",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "identified": true,
            "rarity": "",
            "type": {
              "value": "junk",
              "subtype": ""
            },
            "properties": [],
            "unidentified": {
              "description": ""
            },
            "container": null,
            "identifier": "letter-from-a-dead-colleague-posing-a-question-you-have-not-yet-been-able-to-answer"
          },
          "img": "modules/plutonium/media/icon/battle-gear.svg",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "letter%20from%20a%20dead%20colleague%20posing%20a%20question%20you%20have%20not%20yet%20been%20able%20to%20answer_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "fqnSUUCwStZxjNZb",
        "doc": {
          "name": "Spellbook",
          "type": "loot",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>Essential for wizards, a spellbook is a leather-bound tome with 100 blank vellum pages suitable for recording spells.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "153",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 3,
              "units": "lb"
            },
            "price": {
              "value": 50,
              "denomination": "gp"
            },
            "rarity": "",
            "identified": true,
            "type": {
              "value": "",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "identifier": "spellbook"
          },
          "img": "icons/sundries/books/book-embossed-jewel-gold-purple.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "spellbook_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "pJpPAZKy8tGizKdX",
        "doc": {
          "name": "Calligrapher's Supplies",
          "type": "tool",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"></div><div class=\"rd__b  rd__b--2\"><p>Calligraphy treats writing as a delicate, beautiful art. Calligraphers produce text that is pleasing to the eye, using a style that is difficult to forge. Their supplies also give them some ability to examine scripts and determine if they are legitimate, since a calligrapher's training involves long hours of studying writing and attempting to replicate its style and design.</p><div data-roll-name-ancestor=\"Components\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">Components.</span></span> <p>Calligrapher's supplies include ink, a dozen sheets of parchment, and three quills.</p></div><div data-roll-name-ancestor=\"Arcana\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"2\"> <span class=\"entry-title-inner\">Arcana.</span></span> <p>Although calligraphy is of little help in deciphering the content of magical writings, proficiency with these supplies can aid in identifying who wrote a script of a magical nature.</p></div><div data-roll-name-ancestor=\"History\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"3\"> <span class=\"entry-title-inner\">History.</span></span> <p>This tool proficiency can augment the benefit of successful checks made to analyze or investigate ancient writings, scrolls, or other texts, including runes etched in stone or messages in frescoes or other displays.</p></div><div data-roll-name-ancestor=\"Decipher Treasure Map\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"4\"> <span class=\"entry-title-inner\">Decipher Treasure Map.</span></span> <p>This tool proficiency grants you expertise in examining maps. You can make an Intelligence check to determine a map's age, whether a map includes any hidden messages, or similar facts.</p></div><table class=\"w-100 rd__table  stripe-odd-table\" data-roll-name-ancestor=\"Calligrapher's Supplies\"><caption>Calligrapher's Supplies</caption><thead><tr><th class=\"ve-col-6\" data-rd-isroller=\"false\">Activity</th><th class=\"ve-col-6\" data-rd-isroller=\"false\">DC</th></tr></thead><tbody><tr><td class=\"ve-col-6\">Identify writer of nonmagical script</td><td class=\"ve-col-6\">10</td></tr><tr><td class=\"ve-col-6\">Determine writer's state of mind</td><td class=\"ve-col-6\">15</td></tr><tr><td class=\"ve-col-6\">Spot forged text</td><td class=\"ve-col-6\">15</td></tr><tr><td class=\"ve-col-6\">Forge a signature</td><td class=\"ve-col-6\">20</td></tr></tbody></table></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "154",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 5,
              "units": "lb"
            },
            "price": {
              "value": 10,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "ability": "int",
            "chatFlavor": "",
            "proficient": null,
            "bonus": "",
            "type": {
              "value": "art",
              "baseItem": "calligrapher"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "check",
                "activation": {
                  "type": "",
                  "value": null,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "0",
                  "units": "ft",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "0",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "check": {
                  "ability": "int",
                  "associated": [],
                  "dc": {}
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "calligraphers-supplies"
          },
          "img": "icons/sundries/documents/document-official-capital.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "calligrapher's%20supplies_phb"
            },
            "dnd5e": {}
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "CUyvBY4ACZU6EN1S",
        "doc": {
          "name": "Sending Stones",
          "type": "equipment",
          "system": {
            "source": {
              "custom": "",
              "book": "DMG",
              "page": "199",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p><i>Sending stones</i> come in pairs, with each smooth stone carved to match the other so the pairing is easily recognized. While you touch one stone, you can use an action to cast the @spell[sending] spell from it. The target is the bearer of the other stone. If no creature bears the other stone, you know that fact as soon as you use the stone and don't cast the spell.</p><p>Once @spell[sending] is cast through the stones, they can't be used again until the next dawn. If one of the stones in a pair is destroyed, the other one becomes nonmagical.</p></div>",
              "chat": ""
            },
            "proficient": null,
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "attuned": false,
            "identified": true,
            "equipped": true,
            "rarity": "uncommon",
            "type": {
              "value": "trinket",
              "baseItem": ""
            },
            "properties": [
              "mgc"
            ],
            "attunement": "",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": null,
              "dex": null
            },
            "strength": null,
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "speed": {
              "value": null,
              "conditions": "",
              "units": "ft"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "cover": null,
            "activities": {},
            "identifier": "sending-stones",
            "crew": {
              "value": []
            }
          },
          "img": "icons/commodities/gems/gem-faceted-oval-blue.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "sending%20stones_dmg"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "JZzQqRnkFsiMFVyI",
        "doc": {
          "name": "Card of the Resonant Arcana (The Hierophant)",
          "type": "equipment",
          "img": "icons/sundries/gaming/rune-card.webp",
          "system": {
            "description": {
              "value": "<p>This rectangular slab of polished black quartz appears to hold a fragment of the night sky within it. While you are attuned to the card, stardust drifts inside the stone to form the illustration of a Major Arcana that resonates with your soul.</p><p data-path-to-node=\"4\">The card has 1 charge. You can expend this charge to use the property of the arcana engraved upon it. The card regains its expended charge daily at dawn.</p><p></p><p><strong>The Hierophant.</strong> As a reaction when you or a creature you can see within 30 feet of you fails a saving throw against a spell, you can expend the card's charge to allow the target to reroll the saving throw. If the school of the spell is from Illusion or Enchantment, the target rolls with advantage. If the target succeeds against the save, it becomes immune to illusions created by that specific source for 1 minute.</p>",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "rarity": "veryRare",
            "identified": true,
            "attunement": "required",
            "attuned": false,
            "equipped": false,
            "properties": [
              "mgc"
            ],
            "type": {
              "value": "trinket",
              "baseItem": ""
            },
            "armor": {
              "value": null,
              "magicalBonus": null,
              "dex": null
            },
            "uses": {
              "spent": 0,
              "max": "1",
              "recovery": [
                {
                  "period": "lr",
                  "type": "recoverAll"
                }
              ]
            },
            "activities": {
              "resArcHieroph001": {
                "_id": "resArcHieroph001",
                "type": "utility",
                "name": "Use The Hierophant (Reaction — Reroll Spell Save)",
                "activation": {
                  "type": "reaction",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "value": "1",
                      "target": "",
                      "scaling": {}
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": false
                },
                "description": {
                  "chatFlavor": "As a reaction when a creature within 30 ft fails a saving throw against a spell, allow it to reroll (with advantage vs Enchantment or Illusion). On a success, it becomes immune to illusions from that source for 1 minute."
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": null,
                  "units": "self",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft"
                  },
                  "affects": {
                    "count": "",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": false,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "prompt": false,
                  "visible": false,
                  "name": "",
                  "formula": ""
                },
                "sort": 0
              }
            },
            "source": {
              "custom": "Coria Homebrew",
              "rules": "2014"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0,
          "flags": {
            "dnd5e": {},
            "altarion-aitusa": {
              "isResonantArcanaCard": true,
              "resonantArcanaKey": "hierophant"
            }
          }
        }
      },
      {
        "origId": "Sm001xUyonnP8JUE",
        "doc": {
          "name": "War Caster",
          "type": "feat",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB'14",
              "page": "170",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "description": {
              "value": "<div><hr /><div>\n\t\t\t\t<p><i>Prerequisite: The ability to cast at least one spell</i></p>\n\t\t\t\t\n\t\t\t\t<div class=\"ve-rd__b  ve-rd__b--3\"><p>You have practiced casting spells in the midst of combat, learning techniques that grant you the following benefits:</p><ul class=\"ve-rd__list\"><li class=\"ve-rd__li \">You have advantage on Constitution saving throws that you make to maintain your @status[concentration] on a spell when you take damage.</li><li class=\"ve-rd__li \">You can perform the somatic components of spells even when you have weapons or a @item[shield|phb] in one or both hands.</li><li class=\"ve-rd__li \">When a hostile creature's movement provokes an opportunity attack from you, you can use your reaction to cast a spell at the creature, rather than making an opportunity attack. The spell must have a casting time of 1 action and must target only that creature.</li></ul></div>\n\t\t\t</div></div>",
              "chat": ""
            },
            "requirements": "The ability to cast at least one spell",
            "uses": {
              "max": "",
              "recovery": [],
              "spent": 0
            },
            "type": {
              "value": "feat",
              "subtype": ""
            },
            "properties": [],
            "advancement": {},
            "activities": {
              "dnd5eactivity005": {
                "_id": "dnd5eactivity005",
                "type": "utility",
                "img": null,
                "activation": {
                  "type": "reaction",
                  "value": 1,
                  "condition": "When a hostile creature's movement provokes an opportunity attack from you, you can use",
                  "override": false
                },
                "consumption": {
                  "scaling": {
                    "allowed": false
                  },
                  "spellSlot": true,
                  "targets": []
                },
                "description": {},
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "template": {
                    "contiguous": false,
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false,
                  "prompt": true
                },
                "uses": {
                  "spent": 0,
                  "recovery": []
                },
                "roll": {
                  "prompt": false,
                  "visible": false
                },
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "war-caster",
            "crewed": false,
            "enchant": {},
            "prerequisites": {
              "items": [],
              "repeatable": false
            }
          },
          "img": "modules/plutonium/media/icon/feat/phb-war-caster.webp",
          "flags": {
            "plutonium": {
              "page": "feats.html",
              "source": "PHB",
              "hash": "war%20caster_phb"
            }
          },
          "effects": [
            {
              "name": "War Caster",
              "img": "modules/plutonium/media/icon/feat/phb-war-caster.webp",
              "description": "",
              "changes": [
                {
                  "key": "system.attributes.concentration.roll.mode",
                  "mode": 5,
                  "value": "1",
                  "priority": 4
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": 0,
                "startTurn": 0,
                "combat": null
              },
              "origin": "Actor.LXYylp801JU6lm22.Item.Sm001xUyonnP8JUE",
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "war-caster"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            }
          ],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "m7PWkN0tK5FBNFlv",
        "doc": {
          "name": "Cartographer's Tools",
          "type": "tool",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"></div><div class=\"ve-rd__b  ve-rd__b--2\"><p>Using cartographer's tools, you can create accurate maps to make travel easier for yourself and those who come after you. These maps can range from large-scale depictions of mountain ranges to diagrams that show the layout of a dungeon level.</p><div data-roll-name-ancestor=\"Components\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner \">Components.</span></span> Cartographer's tools consist of a quill, ink, parchment, a pair of compasses, calipers, and a ruler.</p></div><div data-roll-name-ancestor=\"Arcana, History, Religion\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"2\"> <span class=\"entry-title-inner \">Arcana, History, Religion.</span></span> You can use your knowledge of maps and locations to unearth more detailed information when you use these skills. For instance, you might spot hidden messages in a map, identify when the map was made to determine if geographical features have changed since then, and so forth.</p></div><div data-roll-name-ancestor=\"Nature\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"3\"> <span class=\"entry-title-inner \">Nature.</span></span> Your familiarity with physical geography makes it easier for you to answer questions or solve issues relating to the terrain around you.</p></div><div data-roll-name-ancestor=\"Survival\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"4\"> <span class=\"entry-title-inner \">Survival.</span></span> Your understanding of geography makes it easier to find paths to civilization, to predict areas where villages or towns might be found, and to avoid becoming lost. You have studied so many maps that common patterns, such as how trade routes evolve and where settlements arise in relation to geographic locations, are familiar to you.</p></div><div data-roll-name-ancestor=\"Craft a Map\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"5\"> <span class=\"entry-title-inner \">Craft a Map.</span></span> While traveling, you can draw a map as you go in addition to engaging in other activity.</p></div><table class=\"ve-w-100 ve-rd__table  stripe-odd-table\" data-roll-name-ancestor=\"Cartographer's Tools\"><caption>Cartographer's Tools</caption><thead><tr><th class=\"ve-rd__th ve-col-10 \" data-rd-isroller=\"false\">Activity</th><th class=\"ve-rd__th ve-col-2 ve-text-center \" data-rd-isroller=\"false\">DC</th></tr></thead><tbody><tr><td class=\"ve-rd__th ve-col-10 \">Determine a map's age and origin</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">10</td></tr><tr><td class=\"ve-rd__th ve-col-10 \">Estimate direction and distance to a landmark</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">15</td></tr><tr><td class=\"ve-rd__th ve-col-10 \">Discern that a map is fake</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">15</td></tr><tr><td class=\"ve-rd__th ve-col-10 \">Fill in a missing part of a map</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">20</td></tr></tbody></table></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB'14",
              "page": "154",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 1,
            "weight": {
              "value": 6,
              "units": "lb"
            },
            "price": {
              "value": 15,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "ability": "int",
            "chatFlavor": "",
            "proficient": null,
            "bonus": "",
            "type": {
              "value": "art",
              "baseItem": "cartographer"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "uses": {
              "max": "",
              "recovery": [],
              "spent": 0
            },
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "check",
                "activation": {
                  "type": "",
                  "value": null,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "check": {
                  "ability": "int",
                  "dc": {},
                  "associated": []
                },
                "uses": {
                  "spent": 0,
                  "recovery": []
                },
                "sort": 0,
                "img": null,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "attuned": false,
            "identifier": "cartographers-tools"
          },
          "img": "icons/tools/navigation/map-marked-red.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "cartographer's%20tools_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      }
    ],
    "abilities": {
      "str": {
        "value": 16,
        "proficient": 0
      },
      "dex": {
        "value": 8,
        "proficient": 0
      },
      "con": {
        "value": 14,
        "proficient": 1
      },
      "int": {
        "value": 16,
        "proficient": 1
      },
      "wis": {
        "value": 10,
        "proficient": 0
      },
      "cha": {
        "value": 10,
        "proficient": 0
      }
    },
    "skills": {
      "arc": 1,
      "his": 1,
      "inv": 1,
      "nat": 1,
      "prc": 1,
      "sur": 1
    },
    "spells": [
      {
        "origId": "3XVp43VY0Ldzm1Yc",
        "doc": {
          "name": "Detect Magic",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "231",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>For the duration, you sense the presence of magic within 30 feet of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object in the area that bears magic, and you learn its <a href=\"https://5e.tools/book.html#PHB,10,the%20schools%20of%20magic,0\">school of magic</a>, if any.</p><p>The spell can penetrate most barriers, but it is blocked by 1 foot of stone, 1 inch of common metal, a thin sheet of lead, or 3 feet of wood or dirt.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "ritual",
              "concentration"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "type": "radius",
                "size": "30",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "10",
              "units": "minute"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "detect-magic"
          },
          "img": "icons/magic/unholy/hands-cloud-light-pink.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "detect%20magic_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "eiRqSTGjfXLmSNo4",
        "doc": {
          "name": "Find Familiar",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "240",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You gain the service of a familiar, a spirit that takes an animal form you choose: @creature[bat], @creature[cat], @creature[crab], @creature[frog] (toad), @creature[hawk], @creature[lizard], @creature[octopus], @creature[owl], @creature[poisonous snake], fish (@creature[quipper]), @creature[rat], @creature[raven], @creature[sea horse], @creature[spider], or @creature[weasel]. Appearing in an unoccupied space within range, the familiar has the statistics of the chosen form, though it is a celestial, fey, or fiend (your choice) instead of a beast.</p><p><i class=\"ve-muted\">Additional <a href=\"https://5e.tools/bestiary.html#blankhash,flstmiscellaneous:familiar=1\">animal form choices</a> may be available at the DM's discretion.</i></p><p>Your familiar acts independently of you, but it always obeys your commands. In combat, it rolls its own initiative and acts on its own turn. A familiar can't attack, but it can take other actions as normal.</p><p>When the familiar drops to 0 hit points, it disappears, leaving behind no physical form. It reappears after you cast this spell again. As an action, you can temporarily dismiss the familiar to a pocket dimension. Alternatively, you can dismiss it forever. As an action while it is temporarily dismissed, you can cause it to reappear in any unoccupied space within 30 feet of you. Whenever the familiar drops to 0 hit points or disappears into the pocket dimension, it leaves behind in its space anything it was wearing or carrying.</p><p>While your familiar is within 100 feet of you, you can communicate with it telepathically. Additionally, as an action, you can see through your familiar's eyes and hear what it hears until the start of your next turn, gaining the benefits of any special senses that the familiar has. During this time, you are &amp;Reference[condition=deafened]{deaf} and &amp;Reference[condition=blinded]{blind} with regard to your own senses.</p><p>You can't have more than one familiar at a time. If you cast this spell while you already have a familiar, you instead cause it to adopt a new form. Choose one of the forms from the above list. Your familiar transforms into the chosen creature.</p><p>Finally, when you cast a spell with a range of touch, your familiar can deliver the spell as if it had cast the spell. Your familiar must be within 100 feet of you, and it must use its reaction to deliver the spell when you cast it. If the spell requires an attack roll, you use your attack modifier for the roll.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "con",
            "properties": [
              "vocal",
              "somatic",
              "material",
              "ritual"
            ],
            "materials": {
              "value": "10 gp worth of charcoal, incense, and herbs that must be consumed by fire in a brass brazier",
              "consumed": true,
              "cost": 10,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "space",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "any",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "10",
              "units": "ft"
            },
            "activation": {
              "type": "hour",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "ability": "",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 0,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "summon",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "bonuses": {},
                "creatureSizes": [],
                "creatureTypes": [],
                "match": {
                  "ability": "",
                  "attacks": false,
                  "disposition": false,
                  "proficiency": false,
                  "saves": false
                },
                "profiles": [],
                "summon": {
                  "mode": "",
                  "prompt": false
                },
                "visibility": {
                  "identifier": "",
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                },
                "img": null,
                "sort": 0,
                "flags": {}
              }
            },
            "identifier": "find-familiar"
          },
          "img": "icons/creatures/birds/corvid-call-sound-glowing.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "find%20familiar_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "shP8h377LspfZUzp",
        "doc": {
          "name": "Identify",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "252",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You choose one object that you must touch throughout the casting of the spell. If it is a magic item or some other magic-imbued object, you learn its properties and how to use them, whether it requires attunement to use, and how many charges it has, if any. You learn whether any spells are affecting the item and what they are. If the item was created by a spell, you learn which spell created it.</p><p>If you instead touch a creature throughout the casting, you learn what spells, if any, are currently affecting it.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "material",
              "ritual"
            ],
            "materials": {
              "value": "a pearl worth at least 100 gp and an owl feather",
              "consumed": false,
              "cost": 100,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "object",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "minute",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 0,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "identify"
          },
          "img": "icons/sundries/scrolls/scroll-bound-blue-red.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "identify_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "ouqOcMWKa8nlQCSw",
        "doc": {
          "name": "Longstrider",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "256",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You touch a creature. The target's speed increases by 10 feet until the spell ends.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "trs",
            "properties": [
              "vocal",
              "somatic",
              "material"
            ],
            "materials": {
              "value": "a pinch of dirt",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "ability": "",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "longstrider"
          },
          "img": "icons/equipment/feet/boots-leather-laced-brown.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "longstrider_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "kCJMSdskur8wjdiR",
        "doc": {
          "name": "Shield",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "275",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from @spell[magic missile].</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "abj",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "self",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "reaction",
              "condition": "which you take when you are hit by an attack or targeted by the magic missile spell",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "round"
            },
            "ability": "",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [
                  {
                    "_id": "6pbotGIvqQkraPva",
                    "level": {}
                  }
                ],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "shield"
          },
          "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "shield_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": [
            {
              "_id": "6pbotGIvqQkraPva",
              "flags": {
                "plutonium": {
                  "dedupeId": "shield"
                }
              },
              "changes": [
                {
                  "key": "system.attributes.ac.bonus",
                  "mode": 2,
                  "value": "5",
                  "priority": null
                }
              ],
              "disabled": false,
              "duration": {
                "startTime": null,
                "rounds": 1,
                "seconds": null,
                "combat": null,
                "turns": null,
                "startRound": null,
                "startTurn": null
              },
              "origin": "Item.FlLKKv7bQBlIAs11",
              "tint": "#ffffff",
              "transfer": false,
              "name": "Shield",
              "description": "<p>Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.</p>",
              "statuses": [],
              "_stats": {
                "compendiumSource": null,
                "duplicateSource": null,
                "coreVersion": "13.351",
                "systemId": "dnd5e",
                "systemVersion": "3.3.1",
                "createdTime": null,
                "modifiedTime": null,
                "lastModifiedBy": null,
                "exportSource": null
              },
              "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
              "type": "base",
              "system": {},
              "sort": 0
            }
          ]
        }
      },
      {
        "origId": "dEJeOkdXYO6naOjb",
        "doc": {
          "name": "Silvery Barbs",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "SCC",
              "page": "38",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You magically distract the triggering creature and turn its momentary uncertainty into encouragement for another creature. The triggering creature must reroll the [[/r d20]] and use the lower roll.</p><p>You can then choose a different creature you can see within range (you can choose yourself). The chosen creature has advantage on the next attack roll, ability check, or saving throw it makes within 1 minute. A creature can be empowered by only one use of this spell at a time.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "enc",
            "properties": [
              "vocal"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "60",
              "units": "ft"
            },
            "activation": {
              "type": "reaction",
              "condition": "which you take when a creature you can see within 60 feet of yourself succeeds on an attack roll, an ability check, or a saving throw",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "d20",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "silvery-barbs"
          },
          "img": "icons/magic/control/energy-stream-link-white.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "SCC",
              "hash": "silvery%20barbs_scc",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "X2ziXShCSRgN8ibn",
        "doc": {
          "name": "Absorb Elements",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "XGE",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>The spell captures some of the incoming energy, lessening its effect on you and storing it for your next melee attack. You have resistance to the triggering damage type until the start of your next turn. Also, the first time you hit with a melee attack on your next turn, the target takes an extra [[/damage 1d6]] damage of the triggering type, and the spell ends.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, the extra damage increases by [[/damage 1d6]] for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "abj",
            "properties": [
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "self",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "reaction",
              "condition": "which you take when you take acid, cold, fire, lightning, or thunder damage",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "round"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "damage",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "critical": {
                    "allow": false,
                    "bonus": ""
                  },
                  "parts": [
                    {
                      "number": 1,
                      "denomination": 6,
                      "bonus": "",
                      "types": [],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "whole",
                        "number": 1,
                        "formula": ""
                      }
                    }
                  ]
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "absorb-elements"
          },
          "img": "icons/magic/symbols/elements-air-earth-fire-water.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "XGE",
              "hash": "absorb%20elements_xge",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "RNjTpKbxEnHz3zgJ",
        "doc": {
          "name": "Light",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "255",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet. The light can be colored as you like. Completely covering the object with something opaque blocks the light. The spell ends if you cast it again or dismiss it as an action.</p><p>If you target an object held or worn by a hostile creature, that creature must succeed on a Dexterity saving throw to avoid the spell.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "evo",
            "properties": [
              "vocal",
              "material"
            ],
            "materials": {
              "value": "a firefly or phosphorescent moss",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "object",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "save",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "none",
                  "parts": []
                },
                "save": {
                  "ability": [
                    "dex"
                  ],
                  "dc": {
                    "calculation": "spellcasting",
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "light"
          },
          "img": "icons/magic/light/orb-lightbulb-gray.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "light_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "VqgFM1z1ZP41MwNX",
        "doc": {
          "name": "Mage Hand",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "256",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action. The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again.</p><p>You can use your action to control the hand. You can use the hand to manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour the contents out of a vial. You can move the hand up to 30 feet each time you use it.</p><p>The hand can't attack, activate magic items, or carry more than 10 pounds.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "con",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "space",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "30",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "mage-hand"
          },
          "img": "icons/magic/light/orbs-hand-gray.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "mage%20hand_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "s6DHnSSudHHrNk25",
        "doc": {
          "name": "Comprehend Languages",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "224",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>For the duration, you understand the literal meaning of any spoken language that you hear. You also understand any written language that you see, but you must be touching the surface on which the words are written. It takes about 1 minute to read one page of text.</p><p>This spell doesn't decode secret messages in a text or a glyph, such as an arcane sigil, that isn't part of a written language.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "material",
              "ritual"
            ],
            "materials": {
              "value": "a pinch of soot and salt",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "self",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "comprehend-languages"
          },
          "img": "icons/skills/trades/academics-book-study-runes.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "comprehend%20languages_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "KRYmFKLXArZd0aGz",
        "doc": {
          "name": "Cure Wounds",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "230",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>A creature you touch regains a number of hit points equal to [[/r 1d8]] + your spellcasting ability modifier. This spell has no effect on undead or constructs.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, the healing increases by [[/r 1d8]] for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "evo",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "heal",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "healing": {
                  "number": 1,
                  "denomination": 8,
                  "bonus": "@mod",
                  "types": [
                    "healing"
                  ],
                  "custom": {
                    "enabled": false,
                    "formula": ""
                  },
                  "scaling": {
                    "mode": "whole",
                    "number": 1,
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "cure-wounds"
          },
          "img": "icons/magic/life/cross-flared-green.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "cure%20wounds_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "G7YQJypce53tl4Wb",
        "doc": {
          "name": "Heroism",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB'14",
              "page": "250",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--3\"><p>A willing creature you touch is imbued with bravery. Until the spell ends, the creature is immune to being &amp;Reference[condition=frightened] and gains temporary hit points equal to your spellcasting ability modifier at the start of each of its turns. When the spell ends, the target loses any remaining temporary hit points from this spell.</p></div><div class=\"ve-rd__b  ve-rd__b--3\"><p></p><div data-roll-name-ancestor=\"At Higher Levels\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner \">At Higher Levels.</span></span> When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "enc",
            "properties": [
              "vocal",
              "somatic",
              "concentration"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "template": {
                "contiguous": false,
                "type": "",
                "units": "ft",
                "stationary": false
              },
              "affects": {
                "count": "1",
                "type": "creature",
                "choice": false,
                "special": ""
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "value": 1,
              "condition": ""
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "uses": {
              "max": "",
              "recovery": [],
              "spent": 0
            },
            "method": "spell",
            "prepared": 1,
            "sourceItem": "class:dragon-rider",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "heal",
                "activation": {
                  "type": "special",
                  "value": null,
                  "override": true,
                  "condition": "When a creature under the effects of this spell starts their turn."
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": false
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "override": true,
                  "units": "spec",
                  "special": ""
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "healing": {
                  "number": null,
                  "denomination": null,
                  "bonus": "",
                  "types": [
                    "temphp"
                  ],
                  "custom": {
                    "enabled": true,
                    "formula": "@mod"
                  },
                  "scaling": {
                    "mode": "whole",
                    "number": null,
                    "formula": ""
                  }
                },
                "uses": {
                  "spent": 0,
                  "recovery": [],
                  "max": ""
                },
                "sort": 100000,
                "name": "Grant Temporary Hit Points",
                "img": "",
                "visibility": {
                  "level": {
                    "min": null,
                    "max": null
                  },
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                },
                "flags": {}
              },
              "s8S50epEPffDG1NB": {
                "type": "utility",
                "name": "Cast",
                "_id": "s8S50epEPffDG1NB",
                "img": null,
                "sort": 0,
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "scaling": {
                    "allowed": false
                  },
                  "spellSlot": true,
                  "targets": []
                },
                "description": {},
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [
                  {
                    "_id": "c4iy2EIj29eRA2qq",
                    "level": {}
                  }
                ],
                "flags": {},
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false,
                  "prompt": true
                },
                "uses": {
                  "spent": 0,
                  "recovery": []
                },
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                },
                "roll": {
                  "prompt": false,
                  "visible": false
                }
              }
            },
            "identifier": "heroism"
          },
          "img": "icons/magic/control/buff-strength-muscle-damage-orange.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "heroism_phb",
              "propDroppable": "spell",
              "spellClassNames": [
                "Bard",
                "Paladin"
              ]
            },
            "altarion-aitusa": {}
          },
          "effects": [
            {
              "name": "Heroism",
              "img": "icons/magic/control/buff-strength-muscle-damage-orange.webp",
              "origin": "Compendium.dnd5e.spells.Item.ge3Saet9zPTDyaoL",
              "transfer": false,
              "_id": "c4iy2EIj29eRA2qq",
              "type": "base",
              "system": {},
              "changes": [
                {
                  "key": "system.traits.ci.value",
                  "mode": 2,
                  "value": "frightened",
                  "priority": null
                }
              ],
              "disabled": false,
              "duration": {
                "startTime": null,
                "combat": null,
                "seconds": 60,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null
              },
              "description": "<p>You have been imbued with bravery. Until the spell ends, you are immune to being &amp;reference[Frightened apply=false] and gain Temporary Hit Points equal to the caster's Spellcasting ability modifier at the start of each of your turns. When the spell ends, you lose any remaining temporary hit points from this spell.</p>",
              "tint": "#ffffff",
              "statuses": [],
              "sort": 0,
              "flags": {
                "dnd5e": {
                  "riders": {
                    "statuses": []
                  }
                },
                "plutonium": {
                  "dedupeId": "heroism"
                }
              },
              "_stats": {
                "compendiumSource": null,
                "duplicateSource": null,
                "exportSource": null,
                "coreVersion": "13.351",
                "systemId": "dnd5e",
                "systemVersion": "5.3.2",
                "lastModifiedBy": null
              }
            }
          ]
        }
      }
    ]
  },
  "flinn": {
    "sourceName": "Flinn Encantor",
    "currency": {
      "pp": 0,
      "gp": 0,
      "ep": 0,
      "sp": 6,
      "cp": 6
    },
    "tools": {
      "chess": {
        "value": 1,
        "ability": "int",
        "roll": {
          "min": null,
          "max": null,
          "mode": 0
        },
        "bonuses": {
          "check": ""
        }
      },
      "potter": {
        "value": 1,
        "ability": "int",
        "roll": {
          "min": null,
          "max": null,
          "mode": 0
        },
        "bonuses": {
          "check": ""
        }
      }
    },
    "languages": {
      "value": [
        "common",
        "elvish",
        "halfling",
        "primordial",
        "sylvan"
      ],
      "custom": "",
      "communication": {}
    },
    "professionsFlags": {
      "profissoesAtivas": [
        "Oleiro"
      ],
      "colapsos": {
        "Oleiro": false,
        "Herbalista": true,
        "Alquimista": true
      },
      "projetos": [
        {
          "profissao": "Oleiro",
          "nome": "Vaso Deformado",
          "subTipo": "Obra de Arte de Argila",
          "complexidade": "Simples",
          "acertosAtuais": 1,
          "atributoPadrao": "int",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": "",
          "dificuldadeEspecifica": "Difícil"
        }
      ],
      "ferramentasEquipadas": {
        "Oleiro": "nPjIGu0f2Kw53H0q"
      },
      "treinosAtivos": [
        "Atributo"
      ],
      "listaTreinamentos": [
        {
          "categoria": "Atributo",
          "nome": "Treinamento de Inteligência",
          "attrKey": "int",
          "acertosAtuais": 15.25,
          "totalNecessario": 60,
          "dificuldadeEspecifica": "Médio",
          "infoExtra": "(Valor atual: 18 - Médio)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        }
      ]
    },
    "items": [
      {
        "origId": "UQM5SuvKA9BYlSO9",
        "doc": {
          "name": "Rewarded",
          "type": "background",
          "system": {
            "description": {
              "value": "<div><div class=\"rd__b  rd__b--1\"><p>You were living a difficult life before your destiny suddenly changed through a miraculous turn of good fortune. Perhaps a benevolent deity gave you precisely what you most desired. You might have stumbled across a Deck of Many Things and drawn a card with a potent, positive effect. Or maybe you inherited a modest fortune from a distant relative you didn't know you had.</p><p>Regardless, you left the daily miseries of your old life behind in favor of a life of adventure and excitement. Your old debts have been paid, responsibilities you thought inescapable are behind you, or you suddenly possess rare and unusual skills unknown to ordinary folk.</p></div><hr /><div class=\"rd__b  rd__b--1\"><ul class=\"rd__list rd__list-hang-notitle\"><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Skill Proficiencies:\"><span class=\"bold rd__list-item-name\">Skill Proficiencies:</span> &amp;Reference[skill=Insight], &amp;Reference[skill=Persuasion]</p></li><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Languages:\"><span class=\"bold rd__list-item-name\">Languages:</span> One of your choice</p></li><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Equipment:\"><span class=\"bold rd__list-item-name\">Equipment:</span> A bottle of black ink, an @item[ink pen|PHB], five sheets of paper, a @item[gaming set|PHB] (matching your chosen proficiency), a @item[signet ring|PHB], a set of @item[fine clothes|PHB], and a @item[pouch|PHB] containing 18 gp</p></li><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Tool Proficiencies:\"><span class=\"bold rd__list-item-name\">Tool Proficiencies:</span> One <a href=\"https://5e.tools/items.html#blankhash,flstsource:phb=1,flstmiscellaneous:mundane=1,flsttype:gaming%20set=1\">gaming set</a> of your choice (such as @item[playing card set|phb|playing cards] or @item[three-dragon ante set|phb|three-dragon ante cards])</p></li></ul><div data-roll-name-ancestor=\"Feature: Fortune's Favor\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"1\"> <span class=\"entry-title-inner\">Feature: Fortune's Favor</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>Your unexpected good fortune is reflected by a minor boon. You gain the @feat[Lucky], @feat[Magic Initiate], or @feat[Skilled] feat (your choice). Your choice of feat reflects the transformation that changed your life. An encounter with a genie who gave you three wishes might have resulted in magical powers represented by Magic Initiate. If you paid off all your family debts with a fortuitous round of three-dragon ante, you might be Lucky instead. Alternatively, you could use the Skilled feat to reflect whatever trial you endured to secure your new destiny and to model the knowledge and abilities imparted to you by whatever force transformed your life.</p></div><div data-roll-name-ancestor=\"Suggested Characteristics\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"2\"> <span class=\"entry-title-inner\">Suggested Characteristics</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>Your character's perspective on life has changed thanks to their new destiny. The Rewarded Personality Traits table suggests traits you might adopt for your character and cards from the @item[Deck of Many Things] that might have prompted this trait.</p><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-2 ve-text-center\" data-rd-isroller=\"true\">[[/r d6]]</th><th class=\"ve-col-10\" data-rd-isroller=\"false\">Personality Trait</th></tr></thead><tbody><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-10\">A safe home is a foundation on which anything else can be built. (Key, Throne)</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-10\">I was elevated to heights I could never otherwise attain, and I won't waste my fortune. (Star, Sun)</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-10\">I try to be a source of inspiration and joy to others. Life is never as bad as you think! (Euryale, Jester)</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-10\">Courage and boldness can carry the day when all else fails. (Comet, Knight)</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-10\">My good fortune means I can lift others up as well. (Gem, Moon)</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-10\">Having the right answers is the first step to solving any problem, no matter how dire. (Fates, Sage)</td></tr></tbody></table></div><div data-roll-name-ancestor=\"Building a Rewarded Character\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"3\"> <span class=\"entry-title-inner\">Building a Rewarded Character</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>Rewarded characters have varied histories, but they have one thing in common: they were down on their luck before their lives abruptly turned around. They might have given up all hope of a happier life, only to suddenly get a second chance. A rewarded character has often spent many years struggling to escape painful circumstances. Now, extricated from the (sometimes literal) prison that was their former life, they throw their cares to the wind and become adventurers.</p><p>If your character's life was changed by a @item[Deck of Many Things], consider which card was responsible. Perhaps the Fates card undid a tragic mistake your character made in their youth. The Gem card could have wiped out debts incurred over a lifetime. Maybe the Sage card provided the advice needed to escape a hopeless situation, the Star card increased an ability score to its current value, or a @spell[Wish] spell cast after drawing the Moon card transformed your character from a peddler to a fledgling sorcerer infused with magic and new knowledge and skills. If you're making a character at higher than 1st level, magic items they have could have been granted by the Key or Sun card.</p></div><div data-roll-name-ancestor=\"Rewarded Trinkets\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"4\"> <span class=\"entry-title-inner\">Rewarded Trinkets</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>When you make your character, you can roll once on the Rewarded Trinkets table instead of on the Trinkets table in the <a href=\"https://5e.tools/book.html#PHB\">Player's Handbook</a> for your starting trinket.</p><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-2 ve-text-center\" data-rd-isroller=\"true\">[[/r d6]]</th><th class=\"ve-col-10\" data-rd-isroller=\"false\">Trinket</th></tr></thead><tbody><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-10\">A perfumed silk scarf from an admirer</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-10\">A crystal bead that glows like a candle in the dark</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-10\">A letter of introduction and invitation from an influential person in a far-off city</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-10\">A motto or symbol whose meaning eludes you, etched on a piece of your equipment</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-10\">A crisp playing card that never seems to tear or soil, depicting the card that affected you</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-10\">Half a medallion designed to be rejoined to its other half</td></tr></tbody></table></div></div></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "BMT",
              "page": "57",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "advancement": {},
            "startingEquipment": [],
            "identifier": "rewarded"
          },
          "flags": {
            "plutonium": {
              "page": "backgrounds.html",
              "source": "BMT",
              "hash": "rewarded_bmt",
              "propDroppable": "background",
              "isDirectImport": true
            }
          },
          "effects": [],
          "img": "icons/sundries/flags/banner-blue.webp",
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "k3lnilwMhZ7xKZGI",
        "doc": {
          "name": "Fine Clothes",
          "type": "equipment",
          "system": {
            "description": {
              "value": "",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 6,
              "units": "lb"
            },
            "price": {
              "value": 15,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "cover": null,
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": null,
              "dex": null
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "speed": {
              "value": null,
              "conditions": "",
              "units": "ft"
            },
            "strength": null,
            "proficient": null,
            "type": {
              "value": "clothing",
              "baseItem": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "",
                  "value": null,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "0",
                  "units": "ft",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "0",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "fine-clothes",
            "crew": {
              "value": []
            }
          },
          "img": "icons/equipment/hand/glove-frayed-cloth-white.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "fine%20clothes_phb"
            },
            "dnd5e": {}
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "HyKHEhIL7cYpbYQu",
        "doc": {
          "name": "Gaming Set (Matching Your Chosen Proficiency)",
          "type": "loot",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "154",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>Multiple variations of this item exist, as listed below:</p><ul class=\"rd__list\"><li class=\"rd__li \">@item[Dice Set|PHB]</li><li class=\"rd__li \">@item[Dragonchess Set|PHB]</li><li class=\"rd__li \">@item[Playing Card Set|PHB]</li><li class=\"rd__li \">@item[Three-Dragon Ante Set|PHB]</li></ul></div><div class=\"rd__b  rd__b--2\"></div>",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "identified": true,
            "rarity": "",
            "type": {
              "value": "gear",
              "subtype": ""
            },
            "properties": [],
            "unidentified": {
              "description": ""
            },
            "container": null,
            "identifier": "gaming-set-matching-your-chosen-proficiency"
          },
          "img": "modules/plutonium/media/icon/rolling-dices.svg",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "gaming%20set_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "wYoJ0mmm2ugyY0rt",
        "doc": {
          "name": "Ink Pen",
          "type": "loot",
          "system": {
            "description": {
              "value": "",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 2,
              "denomination": "cp"
            },
            "rarity": "",
            "identified": true,
            "container": "Qy2aRjl4iQ8EmaT5",
            "type": {
              "value": "",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "properties": [],
            "identifier": "ink-pen"
          },
          "img": "icons/tools/scribal/ink-quill-red.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "ink%20pen_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "DMkpRXpDsyjtwVoR",
        "doc": {
          "name": "Pouch",
          "type": "container",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>A cloth or leather pouch can hold up to 20 @item[sling bullet|phb|sling bullets] or 50 @item[blowgun needle|phb|blowgun needles], among other things. A compartmentalized pouch for holding spell components is called a @item[component pouch|phb]. A pouch can hold up to ⅕ cubic foot or 6 pounds of gear.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "153",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 1,
              "units": "lb"
            },
            "price": {
              "value": 5,
              "denomination": "sp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "capacity": {
              "weight": {
                "value": 6,
                "units": "lb"
              },
              "volume": {
                "units": "cubicFoot"
              }
            },
            "currency": {
              "cp": 0,
              "sp": 0,
              "ep": 0,
              "gp": 0,
              "pp": 0
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "identifier": "pouch"
          },
          "img": "icons/containers/bags/pouch-simple-leather-tan.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "pouch_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "BKUqNb29jk2Diu8q",
        "doc": {
          "name": "Signet Ring",
          "type": "loot",
          "system": {
            "description": {
              "value": "",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 5,
              "denomination": "gp"
            },
            "rarity": "",
            "identified": true,
            "type": {
              "value": "",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "identifier": "signet-ring"
          },
          "img": "icons/equipment/finger/ring-crown-crystal.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "signet%20ring_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "SRpixM0jo1Jcnf20",
        "doc": {
          "name": "Bottle of Black Ink",
          "type": "loot",
          "system": {
            "source": {
              "custom": "",
              "book": "BMT",
              "page": "57",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "identified": true,
            "rarity": "",
            "type": {
              "value": "junk",
              "subtype": ""
            },
            "properties": [],
            "unidentified": {
              "description": ""
            },
            "container": null,
            "identifier": "bottle-of-black-ink"
          },
          "img": "modules/plutonium/media/icon/battle-gear.svg",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "BMT",
              "hash": "bottle%20of%20black%20ink_bmt"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "2PPni1hIsZDQpG3I",
        "doc": {
          "name": "Sheets of Paper",
          "type": "loot",
          "system": {
            "source": {
              "custom": "",
              "book": "BMT",
              "page": "57",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "",
              "chat": ""
            },
            "quantity": 5,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "identified": true,
            "rarity": "",
            "type": {
              "value": "junk",
              "subtype": ""
            },
            "properties": [],
            "unidentified": {
              "description": ""
            },
            "container": null,
            "identifier": "sheets-of-paper"
          },
          "img": "modules/plutonium/media/icon/battle-gear.svg",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "BMT",
              "hash": "sheets%20of%20paper_bmt"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "TxFGtO66lRW2FrKp",
        "doc": {
          "name": "Crystal",
          "type": "weapon",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>An arcane focus is a special item designed to channel the power of arcane spells. A sorcerer, warlock, or wizard can use such an item as a spellcasting focus.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "151",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 1,
              "units": "lb"
            },
            "price": {
              "value": 10,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "cover": null,
            "range": {
              "value": 0,
              "long": 0,
              "units": "ft"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "damage": {
              "versatile": {
                "number": null,
                "denomination": null,
                "bonus": "",
                "types": [],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              },
              "base": {
                "types": [],
                "custom": {
                  "enabled": false
                },
                "scaling": {
                  "number": 1
                }
              }
            },
            "armor": {
              "value": null
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "properties": [],
            "proficient": null,
            "type": {
              "value": "natural",
              "baseItem": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "0",
                  "units": "ft",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "0",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "crystal",
            "crew": {
              "value": []
            },
            "ammunition": {}
          },
          "img": "icons/commodities/gems/gem-rough-cushion-purple-pink.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "crystal_phb"
            },
            "dnd5e": {}
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "jZBay5Lr1yBM0CFu",
        "doc": {
          "name": "Quarterstaff",
          "type": "weapon",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "149",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 4,
              "units": "lb"
            },
            "price": {
              "value": 2,
              "denomination": "sp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "cover": null,
            "range": {
              "value": null,
              "long": 0,
              "units": "ft"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "damage": {
              "versatile": {
                "number": 1,
                "denomination": 8,
                "bonus": "",
                "types": [],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              },
              "base": {
                "number": 1,
                "denomination": 6,
                "bonus": "",
                "types": [
                  "bludgeoning"
                ],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              }
            },
            "armor": {
              "value": null
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "properties": [
              "ver"
            ],
            "proficient": null,
            "type": {
              "value": "simpleM",
              "baseItem": "quarterstaff"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "attack",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "ft",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "0",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "attack": {
                  "ability": "",
                  "bonus": "",
                  "critical": {
                    "threshold": null
                  },
                  "flat": false,
                  "type": {
                    "value": "melee",
                    "classification": "weapon"
                  }
                },
                "damage": {
                  "critical": {
                    "bonus": ""
                  },
                  "includeBase": true,
                  "parts": []
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "quarterstaff",
            "crew": {
              "value": []
            },
            "ammunition": {}
          },
          "img": "icons/weapons/staves/staff-simple-gold.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "quarterstaff_phb"
            },
            "dnd5e": {}
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "NqTf1KteFCEpSTtS",
        "doc": {
          "name": "Backpack",
          "type": "container",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>A backpack can hold one cubic foot or 30 pounds of gear. You can also strap items, such as a bedroll or a coil of rope, to the outside of a backpack.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "153",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 5,
              "units": "lb"
            },
            "price": {
              "value": 2,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "capacity": {
              "weight": {
                "value": 30,
                "units": "lb"
              },
              "volume": {
                "units": "cubicFoot"
              }
            },
            "currency": {
              "cp": 0,
              "sp": 0,
              "ep": 0,
              "gp": 0,
              "pp": 0
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "identifier": "backpack"
          },
          "img": "icons/containers/bags/pack-rounded-leather-brown.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "backpack_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "6lYv9RZQMHupINuH",
        "doc": {
          "name": "Book",
          "type": "loot",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>A book might contain poetry, historical accounts, information pertaining to a particular field of lore, diagrams and notes on gnomish contraptions, or just about anything else that can be represented using text or pictures. A book of spells is a @item[spellbook|phb].</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "151",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 5,
              "units": "lb"
            },
            "price": {
              "value": 25,
              "denomination": "gp"
            },
            "rarity": "",
            "identified": true,
            "type": {
              "value": "",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": "NqTf1KteFCEpSTtS",
            "properties": [],
            "identifier": "book"
          },
          "img": "icons/sundries/books/book-worn-brown.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "book_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "rbmZBEFiAFnqtsIZ",
        "doc": {
          "name": "Ink (1-ounce bottle)",
          "type": "loot",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>Ink (1-ounce bottle)</p></div>",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 10,
              "denomination": "gp"
            },
            "identified": true,
            "rarity": "",
            "type": {
              "value": "gear",
              "subtype": ""
            },
            "properties": [],
            "container": "NqTf1KteFCEpSTtS",
            "unidentified": {
              "description": ""
            },
            "identifier": "ink-1-ounce-bottle"
          },
          "img": "systems/dnd5e/icons/svg/items/loot.svg",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "ink%20(1-ounce%20bottle)_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "zL1R37RRmf8Qtm0H",
        "doc": {
          "name": "Ink Pen",
          "type": "loot",
          "system": {
            "description": {
              "value": "",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 2,
              "denomination": "cp"
            },
            "rarity": "",
            "identified": true,
            "container": "NqTf1KteFCEpSTtS",
            "type": {
              "value": "",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "properties": [],
            "identifier": "ink-pen"
          },
          "img": "icons/tools/scribal/ink-quill-red.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "ink%20pen_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "HypkTrGygaY7FKW7",
        "doc": {
          "name": "Parchment (one sheet)",
          "type": "loot",
          "system": {
            "description": {
              "value": "",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 1,
              "denomination": "sp"
            },
            "rarity": "",
            "identified": true,
            "container": "NqTf1KteFCEpSTtS",
            "type": {
              "value": "",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "properties": [],
            "identifier": "parchment-one-sheet"
          },
          "img": "icons/sundries/documents/document-symbol-circle-gold-red.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "parchment%20(one%20sheet)_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "neqxcHfV5QeyaRsb",
        "doc": {
          "name": "Little Bag of Sand",
          "type": "loot",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "151",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "identified": true,
            "rarity": "",
            "type": {
              "value": "gear",
              "subtype": ""
            },
            "properties": [],
            "container": "NqTf1KteFCEpSTtS",
            "unidentified": {
              "description": ""
            },
            "identifier": "little-bag-of-sand"
          },
          "img": "systems/dnd5e/icons/svg/items/loot.svg",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "little%20bag%20of%20sand_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "oO7IuNpOtbozgIdO",
        "doc": {
          "name": "Small Knife",
          "type": "loot",
          "system": {
            "description": {
              "value": "",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "151",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "rarity": "",
            "identified": true,
            "type": {
              "value": "",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": "NqTf1KteFCEpSTtS",
            "properties": [],
            "identifier": "small-knife"
          },
          "img": "icons/weapons/daggers/knife-green.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "small%20knife_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "UgfyTNSfIPe6dsT0",
        "doc": {
          "name": "Spellbook",
          "type": "loot",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>Essential for wizards, a spellbook is a leather-bound tome with 100 blank vellum pages suitable for recording spells.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "153",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 3,
              "units": "lb"
            },
            "price": {
              "value": 50,
              "denomination": "gp"
            },
            "rarity": "",
            "identified": true,
            "type": {
              "value": "",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "identifier": "spellbook"
          },
          "img": "icons/sundries/books/book-embossed-jewel-gold-purple.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "spellbook_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "v8zcNnToSLg8mM1c",
        "doc": {
          "name": "Sending Stones",
          "type": "equipment",
          "system": {
            "source": {
              "custom": "",
              "book": "DMG",
              "page": "199",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p><i>Sending stones</i> come in pairs, with each smooth stone carved to match the other so the pairing is easily recognized. While you touch one stone, you can use an action to cast the @spell[sending] spell from it. The target is the bearer of the other stone. If no creature bears the other stone, you know that fact as soon as you use the stone and don't cast the spell.</p><p>Once @spell[sending] is cast through the stones, they can't be used again until the next dawn. If one of the stones in a pair is destroyed, the other one becomes nonmagical.</p></div>",
              "chat": ""
            },
            "proficient": null,
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "attuned": false,
            "identified": true,
            "equipped": true,
            "rarity": "uncommon",
            "type": {
              "value": "trinket",
              "baseItem": ""
            },
            "properties": [
              "mgc"
            ],
            "attunement": "",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": null,
              "dex": null
            },
            "strength": null,
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "speed": {
              "value": null,
              "conditions": "",
              "units": "ft"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "cover": null,
            "activities": {},
            "identifier": "sending-stones",
            "crew": {
              "value": []
            }
          },
          "img": "icons/commodities/gems/gem-faceted-oval-blue.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "sending%20stones_dmg"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "t7lHG0NOqjPhOLtc",
        "doc": {
          "name": "Card of the Resonant Arcana (The Fool)",
          "type": "equipment",
          "img": "icons/sundries/gaming/rune-card.webp",
          "system": {
            "description": {
              "value": "<p>This rectangular slab of polished black quartz appears to hold a fragment of the night sky within it. While you are attuned to the card, stardust drifts inside the stone to form the illustration of a Major Arcana that resonates with your soul.</p><p data-path-to-node=\"4\">The card has 1 charge. You can expend this charge to use the property of the arcana engraved upon it. The card regains its expended charge daily at dawn.</p><p></p><p><strong>The Fool.</strong> As a reaction when you take damage from an attack or spell, you can expend the card's charge to warp the probability around you. Roll 1d4:</p><ul data-path-to-node=\"12\"><li><p data-path-to-node=\"12,0,0\"><strong data-path-to-node=\"12,0,0\" data-index-in-node=\"0\">1–2:</strong> The damage from that attack is halved, and you teleport up to 10 feet to an unoccupied space you can see.</p></li><li><p data-path-to-node=\"12,1,0\"><strong data-path-to-node=\"12,1,0\" data-index-in-node=\"0\">3–4:</strong> You take no damage from the attack. Additionally, the attacker takes force damage equal to the damage you would have taken (up to a maximum of 15 force damage).</p></li></ul>",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "rarity": "veryRare",
            "identified": true,
            "attunement": "required",
            "attuned": false,
            "equipped": false,
            "properties": [
              "mgc"
            ],
            "type": {
              "value": "trinket",
              "baseItem": ""
            },
            "armor": {
              "value": null,
              "magicalBonus": null,
              "dex": null
            },
            "uses": {
              "spent": 0,
              "max": "1",
              "recovery": [
                {
                  "period": "lr",
                  "type": "recoverAll"
                }
              ]
            },
            "activities": {
              "resArcTheFool001": {
                "_id": "resArcTheFool001",
                "type": "utility",
                "name": "Use The Fool (Reaction — Warp Probability 1d4)",
                "activation": {
                  "type": "reaction",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "value": "1",
                      "target": "",
                      "scaling": {}
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": false
                },
                "description": {
                  "chatFlavor": "As a reaction when you take damage, roll 1d4: on 1–2 halve the damage and teleport up to 10 ft; on 3–4 take 0 damage and reflect up to 15 Force damage to the attacker."
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": null,
                  "units": "self",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft"
                  },
                  "affects": {
                    "count": "",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": false,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "prompt": false,
                  "visible": false,
                  "name": "",
                  "formula": ""
                },
                "sort": 0
              }
            },
            "source": {
              "custom": "Coria Homebrew",
              "rules": "2014"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0,
          "flags": {
            "dnd5e": {},
            "altarion-aitusa": {
              "isResonantArcanaCard": true,
              "resonantArcanaKey": "fool"
            }
          }
        }
      },
      {
        "origId": "nPjIGu0f2Kw53H0q",
        "doc": {
          "name": "Potter's Tools",
          "type": "tool",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"></div><div class=\"ve-rd__b  ve-rd__b--2\"><p>Potter's tools are used to create a variety of ceramic objects, most typically pots and similar vessels.</p><div data-roll-name-ancestor=\"Components\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner \">Components.</span></span> Potter's tools include potter's needles, ribs, scrapers, a knife, and calipers.</p></div><div data-roll-name-ancestor=\"History\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"2\"> <span class=\"entry-title-inner \">History.</span></span> Your expertise aids you in identifying ceramic objects, including when they were created and their likely place or culture of origin.</p></div><div data-roll-name-ancestor=\"Investigation, Perception\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"3\"> <span class=\"entry-title-inner \">Investigation, Perception.</span></span> You gain additional insight when inspecting ceramics, uncovering clues others would overlook by spotting minor irregularities.</p></div><div data-roll-name-ancestor=\"Reconstruction\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"4\"> <span class=\"entry-title-inner \">Reconstruction.</span></span> By examining pottery shards, you can determine an object's original, intact form and its likely purpose.</p></div><table class=\"ve-w-100 ve-rd__table  stripe-odd-table\" data-roll-name-ancestor=\"Potter's Tools\"><caption>Potter's Tools</caption><thead><tr><th class=\"ve-rd__th ve-col-10 \" data-rd-isroller=\"false\">Activity</th><th class=\"ve-rd__th ve-col-2 ve-text-center \" data-rd-isroller=\"false\">DC</th></tr></thead><tbody><tr><td class=\"ve-rd__th ve-col-10 \">Determine what a vessel once held</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">10</td></tr><tr><td class=\"ve-rd__th ve-col-10 \">Create a serviceable pot</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">15</td></tr><tr><td class=\"ve-rd__th ve-col-10 \">Find a weak point in a ceramic object</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">20</td></tr></tbody></table></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB'14",
              "page": "154",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 1,
            "weight": {
              "value": 3,
              "units": "lb"
            },
            "price": {
              "value": 10,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "ability": "int",
            "chatFlavor": "",
            "proficient": null,
            "bonus": "",
            "type": {
              "value": "art",
              "baseItem": "potter"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "uses": {
              "max": "",
              "recovery": [],
              "spent": 0
            },
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "check",
                "activation": {
                  "type": "",
                  "value": null,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "check": {
                  "ability": "int",
                  "dc": {},
                  "associated": []
                },
                "uses": {
                  "spent": 0,
                  "recovery": []
                },
                "sort": 0,
                "img": null,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "attuned": false,
            "identifier": "potters-tools"
          },
          "img": "icons/commodities/materials/pottery-jug.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "potter's%20tools_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "BdRmUWrCAuLazlXx",
        "doc": {
          "name": "+1 Amulet of the Devout",
          "type": "equipment",
          "system": {
            "source": {
              "custom": "",
              "book": "TCoE",
              "page": "119",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "description": {
              "value": "<div><i>(requires attunement by a cleric or paladin)</i></div>\n\t\t<div class=\"ve-rd__b  ve-rd__b--2\"><p>This amulet bears the symbol of a deity inlaid with precious stones or metals. While you wear the holy symbol, you gain a +1 bonus to spell attack rolls and the saving throw DCs of your spells.</p><p>While you wear this amulet, you can use your Channel Divinity feature without expending one of the feature's uses. Once this property is used, it can't be used again until the next dawn.</p></div>",
              "chat": ""
            },
            "proficient": null,
            "quantity": 1,
            "weight": {
              "value": 1,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "attuned": true,
            "identified": true,
            "equipped": true,
            "rarity": "uncommon",
            "type": {
              "value": "wondrous",
              "baseItem": ""
            },
            "properties": [
              "mgc"
            ],
            "attunement": "required",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": null,
              "dex": null,
              "magicalBonus": ""
            },
            "strength": null,
            "activities": {},
            "identifier": "1-amulet-of-the-devout",
            "unidentified": {
              "description": ""
            },
            "container": null,
            "crew": {
              "value": []
            }
          },
          "img": "icons/equipment/neck/amulet-carved-stone-cross.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "TCE",
              "hash": "%2b1%20amulet%20of%20the%20devout_tce"
            }
          },
          "effects": [
            {
              "name": "Spell Attack Bonus (Melee)",
              "img": "icons/equipment/neck/amulet-carved-stone-cross.webp",
              "description": "",
              "changes": [
                {
                  "key": "system.bonuses.msak.attack",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "spell-attack-bonus-melee"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            },
            {
              "name": "Spell Attack Bonus (Ranged)",
              "img": "icons/equipment/neck/amulet-carved-stone-cross.webp",
              "description": "",
              "changes": [
                {
                  "key": "system.bonuses.rsak.attack",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "spell-attack-bonus-ranged"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            },
            {
              "name": "Spell Save DC Bonus",
              "img": "icons/equipment/neck/amulet-carved-stone-cross.webp",
              "description": "",
              "changes": [
                {
                  "key": "system.bonuses.spell.dc",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "spell-save-dc-bonus"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            }
          ],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "aJ9o76X2NZu0Yr1q",
        "doc": {
          "name": "+1 Arcane Grimoire",
          "type": "equipment",
          "system": {
            "source": {
              "custom": "",
              "book": "TCoE",
              "page": "120",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "description": {
              "value": "<div><i>(requires attunement by a wizard)</i></div>\n\t\t<div class=\"ve-rd__b  ve-rd__b--2\"><p>While you are holding this leather-bound book, you can use it as a spellcasting focus for your wizard spells, and you gain a +1 bonus to spell attack rolls and to the saving throw DCs of your wizard spells.</p><p>You can use this book as a spellbook. In addition, when you use your Arcane Recovery feature, you can increase the number of spell slot levels you regain by 1.</p></div>",
              "chat": ""
            },
            "proficient": null,
            "quantity": 1,
            "weight": {
              "value": 3,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "attuned": true,
            "identified": true,
            "equipped": true,
            "rarity": "uncommon",
            "type": {
              "value": "wondrous",
              "baseItem": ""
            },
            "properties": [
              "foc",
              "mgc"
            ],
            "attunement": "required",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": null,
              "dex": null,
              "magicalBonus": ""
            },
            "strength": null,
            "activities": {},
            "identifier": "1-arcane-grimoire",
            "unidentified": {
              "description": ""
            },
            "container": null,
            "crew": {
              "value": []
            }
          },
          "img": "modules/altarion-aitusa/flinn_icons/arcane-grimoire-tophat.jpg",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "TCE",
              "hash": "%2b1%20arcane%20grimoire_tce"
            }
          },
          "effects": [
            {
              "name": "Spell Attack Bonus (Melee)",
              "img": "modules/altarion-aitusa/flinn_icons/arcane-grimoire-tophat.jpg",
              "description": "",
              "changes": [
                {
                  "key": "system.bonuses.msak.attack",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "spell-attack-bonus-melee"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            },
            {
              "name": "Spell Attack Bonus (Ranged)",
              "img": "modules/altarion-aitusa/flinn_icons/arcane-grimoire-tophat.jpg",
              "description": "",
              "changes": [
                {
                  "key": "system.bonuses.rsak.attack",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "spell-attack-bonus-ranged"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            },
            {
              "name": "Spell Save DC Bonus",
              "img": "modules/altarion-aitusa/flinn_icons/arcane-grimoire-tophat.jpg",
              "description": "",
              "changes": [
                {
                  "key": "system.bonuses.spell.dc",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "spell-save-dc-bonus"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            }
          ],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "6ZQ2UcAKsdn4KYlF",
        "doc": {
          "name": "Potion of Comprehension",
          "type": "consumable",
          "system": {
            "source": {
              "custom": "",
              "book": "WDMM",
              "page": "62",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>When you drink this potion, you gain the effect of a @spell[comprehend languages] spell for 1 hour. This liquid is a clear concoction with bits of salt and soot swirling in it.</p></div>",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "attuned": false,
            "equipped": false,
            "identified": true,
            "rarity": "common",
            "type": {
              "value": "potion",
              "subtype": ""
            },
            "properties": [
              "mgc"
            ],
            "attunement": "",
            "uses": {
              "max": "1",
              "spent": 0,
              "recovery": [],
              "autoDestroy": true
            },
            "magicalBonus": "0",
            "damage": {
              "base": {
                "types": [],
                "custom": {
                  "enabled": false
                },
                "scaling": {
                  "number": 1
                }
              },
              "replace": false
            },
            "activities": {},
            "identifier": "potion-of-comprehension",
            "unidentified": {
              "description": ""
            },
            "container": null
          },
          "img": "icons/consumables/potions/potion-tube-corked-glowing-red.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "WDMM",
              "hash": "potion%20of%20comprehension_wdmm"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "LfLB2bwTuJkHliHj",
        "doc": {
          "name": "Potion of Healing",
          "type": "consumable",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>You regain [[/r 2d4 + 2]] hit points when you drink this potion. The potion's red liquid glimmers when agitated.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "DMG'14",
              "page": "187",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 4,
            "weight": {
              "value": 0.5,
              "units": "lb"
            },
            "price": {
              "value": 50,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "common",
            "identified": true,
            "uses": {
              "max": "1",
              "recovery": [],
              "autoDestroy": true,
              "spent": 0
            },
            "damage": {
              "base": {
                "number": 2,
                "denomination": 4,
                "bonus": "2",
                "types": [
                  "healing"
                ],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              },
              "replace": false
            },
            "type": {
              "value": "potion",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [
              "mgc"
            ],
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "heal",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "value": "1",
                      "target": "",
                      "scaling": {}
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "touch",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "1",
                    "type": "creature",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "healing": {
                  "number": 2,
                  "denomination": 4,
                  "bonus": "2",
                  "types": [
                    "healing"
                  ],
                  "custom": {
                    "enabled": false,
                    "formula": ""
                  },
                  "scaling": {
                    "mode": "whole",
                    "number": null,
                    "formula": ""
                  }
                },
                "uses": {
                  "spent": 0,
                  "recovery": [],
                  "max": ""
                },
                "sort": 0,
                "name": "",
                "img": "",
                "visibility": {
                  "requireMagic": true,
                  "level": {
                    "min": null,
                    "max": null
                  },
                  "identifier": "",
                  "requireAttunement": false,
                  "requireIdentification": false
                },
                "flags": {}
              }
            },
            "attuned": false,
            "identifier": "potion-of-healing"
          },
          "img": "icons/consumables/potions/potion-tube-corked-red.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "potion%20of%20healing_dmg"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "t1OXtFaK1co5on9h",
        "doc": {
          "name": "Bag of Holding",
          "type": "container",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>This bag has an interior space considerably larger than its outside dimensions, roughly 2 feet in diameter at the mouth and 4 feet deep. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. The bag weighs 15 pounds, regardless of its contents. Retrieving an item from the bag requires an action.</p><p>If the bag is overloaded, pierced, or torn, it ruptures and is destroyed, and its contents are scattered in the Astral Plane. If the bag is turned inside out, its contents spill forth, unharmed, but the bag must be put right before it can be used again. Breathing creatures inside the bag can survive up to a number of minutes equal to 10 divided by the number of creatures (minimum 1 minute), after which time they begin to suffocate.</p><p>Placing a <i>bag of holding</i> inside an extradimensional space created by a @item[Heward's handy haversack], @item[portable hole], or similar item instantly destroys both items and opens a gate to the Astral Plane. The gate originates where the one item was placed inside the other. Any creature within 10 feet of the gate is sucked through it to a random location on the Astral Plane. The gate then closes. The gate is one-way only and can't be reopened.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "DMG'14",
              "page": "153",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 1,
            "weight": {
              "value": 15,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "uncommon",
            "identified": true,
            "capacity": {
              "weight": {
                "value": 500,
                "units": "lb"
              },
              "volume": {
                "units": "cubicFoot"
              }
            },
            "currency": {
              "cp": 0,
              "sp": 0,
              "ep": 0,
              "gp": 0,
              "pp": 0
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [
              "mgc",
              "weightlessContents"
            ],
            "attuned": false,
            "identifier": "bag-of-holding"
          },
          "img": "icons/containers/bags/coinpouch-cloth-purple.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "bag%20of%20holding_dmg"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      }
    ],
    "abilities": {
      "str": {
        "value": 8,
        "proficient": 0
      },
      "dex": {
        "value": 14,
        "proficient": 0
      },
      "con": {
        "value": 14,
        "proficient": 0
      },
      "int": {
        "value": 18,
        "proficient": 1
      },
      "wis": {
        "value": 12,
        "proficient": 1
      },
      "cha": {
        "value": 12,
        "proficient": 0
      }
    },
    "skills": {
      "arc": 2,
      "his": 2,
      "ins": 1,
      "inv": 1,
      "per": 1,
      "rel": 2
    },
    "spells": [
      {
        "origId": "bjkKslEISQLr5AXC",
        "doc": {
          "name": "Light",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "255",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet. The light can be colored as you like. Completely covering the object with something opaque blocks the light. The spell ends if you cast it again or dismiss it as an action.</p><p>If you target an object held or worn by a hostile creature, that creature must succeed on a Dexterity saving throw to avoid the spell.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "evo",
            "properties": [
              "vocal",
              "material"
            ],
            "materials": {
              "value": "a firefly or phosphorescent moss",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "object",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "ability": "int",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "save",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "none",
                  "parts": []
                },
                "save": {
                  "ability": [
                    "dex"
                  ],
                  "dc": {
                    "calculation": "int",
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "light",
            "sourceItem": "class:cleric"
          },
          "img": "icons/magic/light/orb-lightbulb-gray.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "light_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {
              "sourceId": "Actor.k5Gvzp4DWvNsxcGk.Item.bjkKslEISQLr5AXC",
              "advancementOrigin": "l0uX6YelG7ID9lOp.LwCeGQ3AvWesoaNw"
            },
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "Ml1ehrzFYZbGZN0l",
        "doc": {
          "name": "Cure Wounds",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "230",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>A creature you touch regains a number of hit points equal to [[/r 1d8]] + your spellcasting ability modifier. This spell has no effect on undead or constructs.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, the healing increases by [[/r 1d8]] for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "evo",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "ability": "int",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "innate",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "heal",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "healing": {
                  "number": 1,
                  "denomination": 8,
                  "bonus": "@mod",
                  "types": [
                    "healing"
                  ],
                  "custom": {
                    "enabled": false,
                    "formula": ""
                  },
                  "scaling": {
                    "mode": "",
                    "number": 1,
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "cure-wounds",
            "sourceItem": "class:cleric"
          },
          "img": "icons/magic/life/cross-flared-green.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "cure%20wounds_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {
              "sourceId": "Actor.k5Gvzp4DWvNsxcGk.Item.Ml1ehrzFYZbGZN0l",
              "advancementOrigin": "5mNpQ5s4ml0sazwE.HWTMcarIQRg5dn2x"
            },
            "midiProperties": {
              "confirmTargets": "default",
              "autoFailFriendly": false,
              "autoSaveFriendly": false,
              "critOther": false,
              "offHandWeapon": false,
              "magicdam": false,
              "magiceffect": false,
              "noConcentrationCheck": false,
              "toggleEffect": false,
              "ignoreTotalCover": false,
              "idr": false,
              "idi": false,
              "idv": false,
              "ida": false
            },
            "midi-qol": {
              "rollAttackPerTarget": "default",
              "removeAttackDamageButtons": "default",
              "itemCondition": "",
              "effectCondition": ""
            },
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "hWhQGRGhEDMoJOBx",
        "doc": {
          "name": "Lesser Restoration",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "255",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You touch a creature and can end either one disease or one condition afflicting it. The condition can be &amp;Reference[condition=blinded], &amp;Reference[condition=deafened], &amp;Reference[condition=paralyzed], or &amp;Reference[condition=poisoned].</p></div>",
              "chat": ""
            },
            "level": 2,
            "school": "abj",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "ability": "wis",
            "uses": {
              "max": "1",
              "recovery": [
                {
                  "period": "lr",
                  "type": "recoverAll"
                }
              ],
              "spent": 0
            },
            "method": "innate",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "target": "",
                      "value": "1",
                      "scaling": {
                        "mode": "",
                        "formula": ""
                      }
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "lesser-restoration",
            "sourceItem": "class:cleric"
          },
          "img": "icons/magic/nature/leaf-oak-wreath-glow-green.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "lesser%20restoration_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {
              "sourceId": "Actor.k5Gvzp4DWvNsxcGk.Item.hWhQGRGhEDMoJOBx",
              "advancementOrigin": "5mNpQ5s4ml0sazwE.HWTMcarIQRg5dn2x"
            },
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "UO5ZKHHeGYPaV9xU",
        "doc": {
          "name": "Fire Bolt",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "242",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes [[/damage 1d10 type=fire]] damage. A flammable object hit by this spell ignites if it isn't being worn or carried.</p><p>This spell's damage increases by [[/r 1d10]] when you reach 5th level ([[/damage 2d10]]), 11th level ([[/damage 3d10]]), and 17th level ([[/damage 4d10]]).</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "evo",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "120",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "ability": "int",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "sourceItem": "class:wizard",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "attack",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "attack": {
                  "ability": "int",
                  "bonus": "",
                  "critical": {
                    "threshold": null
                  },
                  "flat": false,
                  "type": {
                    "value": "ranged",
                    "classification": "spell"
                  }
                },
                "damage": {
                  "critical": {
                    "bonus": ""
                  },
                  "includeBase": true,
                  "parts": [
                    {
                      "number": 1,
                      "denomination": 10,
                      "bonus": "",
                      "types": [
                        "fire"
                      ],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "whole",
                        "number": 1,
                        "formula": ""
                      }
                    }
                  ]
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "fire-bolt"
          },
          "img": "icons/magic/fire/projectile-bolt-zigzag-orange.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "fire%20bolt_phb",
              "propDroppable": "spell",
              "parentClassName": "Wizard",
              "parentClassSource": "PHB",
              "parentSubclassName": "School of Divination",
              "parentSubclassSource": "PHB"
            },
            "tidy5e-sheet": {
              "parentClass": "wizard"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "9Gn1MqKiF6Aog7rI",
        "doc": {
          "name": "Mage Hand",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "256",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action. The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again.</p><p>You can use your action to control the hand. You can use the hand to manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour the contents out of a vial. You can move the hand up to 30 feet each time you use it.</p><p>The hand can't attack, activate magic items, or carry more than 10 pounds.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "con",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "space",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "30",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "ability": "int",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "sourceItem": "class:wizard",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "mage-hand"
          },
          "img": "icons/magic/light/orbs-hand-gray.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "mage%20hand_phb",
              "propDroppable": "spell",
              "parentClassName": "Wizard",
              "parentClassSource": "PHB",
              "parentSubclassName": "School of Divination",
              "parentSubclassSource": "PHB"
            },
            "tidy5e-sheet": {
              "parentClass": "wizard"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "7vbQJ0xzpVTqArGm",
        "doc": {
          "name": "Prestidigitation",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "267",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>This spell is a minor magical trick that novice spellcasters use for practice. You create one of the following magical effects within range:</p><ul class=\"rd__list\"><li class=\"rd__li \">You create an instantaneous, harmless sensory effect, such as a shower of sparks, a puff of wind, faint musical notes, or an odd odor.</li><li class=\"rd__li \">You instantaneously light or snuff out a candle, a torch, or a small campfire.</li><li class=\"rd__li \">You instantaneously clean or soil an object no larger than 1 cubic foot.</li><li class=\"rd__li \">You chill, warm, or flavor up to 1 cubic foot of nonliving material for 1 hour.</li><li class=\"rd__li \">You make a color, a small mark, or a symbol appear on an object or a surface for 1 hour.</li><li class=\"rd__li \">You create a nonmagical trinket or an illusory image that can fit in your hand and that lasts until the end of your next turn.</li></ul><p>If you cast this spell multiple times, you can have up to three of its non-instantaneous effects active at a time, and you can dismiss such an effect as an action.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "trs",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "10",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "ability": "int",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "sourceItem": "class:wizard",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "prestidigitation"
          },
          "img": "icons/magic/light/hand-sparks-smoke-green.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "prestidigitation_phb",
              "propDroppable": "spell",
              "parentClassName": "Wizard",
              "parentClassSource": "PHB",
              "parentSubclassName": "School of Divination",
              "parentSubclassSource": "PHB"
            },
            "tidy5e-sheet": {
              "parentClass": "wizard"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "ym2DQ2h02yQ9nGWE",
        "doc": {
          "name": "Guidance",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "248",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You touch one willing creature. Once before the spell ends, the target can roll a [[/r d4]] and add the number rolled to one ability check of its choice. It can roll the die before or after making the ability check. The spell then ends.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "concentration"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "ability": "wis",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "sourceItem": "class:cleric",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "guidance"
          },
          "img": "icons/skills/ranged/arrow-flying-ornate-gold.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "guidance_phb",
              "propDroppable": "spell",
              "parentClassName": "Cleric",
              "parentClassSource": "PHB",
              "parentSubclassName": "Knowledge Domain",
              "parentSubclassSource": "PHB"
            },
            "tidy5e-sheet": {
              "parentClass": "cleric"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "Bh1KNLG4rbACdnoL",
        "doc": {
          "name": "Sacred Flame",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "272",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take [[/damage 1d8 type=radiant]] damage. The target gains no benefit from cover for this saving throw.</p><p>The spell's damage increases by [[/r 1d8]] when you reach 5th level ([[/damage 2d8]]), 11th level ([[/damage 3d8]]), and 17th level ([[/damage 4d8]]).</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "evo",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "60",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "ability": "wis",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "save",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "none",
                  "parts": [
                    {
                      "number": 1,
                      "denomination": 8,
                      "bonus": "",
                      "types": [
                        "radiant"
                      ],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "whole",
                        "number": 1,
                        "formula": ""
                      }
                    }
                  ]
                },
                "save": {
                  "ability": [
                    "dex"
                  ],
                  "dc": {
                    "calculation": "int",
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "sacred-flame",
            "sourceItem": "class:cleric"
          },
          "img": "icons/magic/fire/projectile-fireball-orange-green.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "sacred%20flame_phb",
              "propDroppable": "spell",
              "parentClassName": "Cleric",
              "parentClassSource": "PHB",
              "parentSubclassName": "Knowledge Domain",
              "parentSubclassSource": "PHB"
            },
            "tidy5e-sheet": {
              "parentClass": "cleric"
            },
            "midiProperties": {
              "confirmTargets": "default",
              "saveDamage": "default",
              "bonusSaveDamage": "default",
              "autoFailFriendly": false,
              "autoSaveFriendly": false,
              "critOther": false,
              "offHandWeapon": false,
              "magicdam": false,
              "magiceffect": false,
              "noConcentrationCheck": false,
              "toggleEffect": false,
              "ignoreTotalCover": false,
              "idr": false,
              "idi": false,
              "idv": false,
              "ida": false
            },
            "midi-qol": {
              "rollAttackPerTarget": "default",
              "removeAttackDamageButtons": "default",
              "itemCondition": "",
              "effectCondition": ""
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "FOw4Rs007xiuJZTC",
        "doc": {
          "name": "Toll the Dead",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "XGE",
              "page": "169",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You point at one creature you can see within range, and the sound of a dolorous bell fills the air around it for a moment. The target must succeed on a Wisdom saving throw or take [[/damage 1d8 type=necrotic]] damage. If the target is missing any of its hit points, it instead takes [[/damage 1d12 type=necrotic]] damage.</p><p>The spell's damage increases by one die when you reach 5th level ([[/damage 2d8]] or [[/damage 2d12]]), 11th level ([[/damage 3d8]] or [[/damage 3d12]]), and 17th level ([[/damage 4d8]] or [[/damage 4d12]]).</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "nec",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "60",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "ability": "wis",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "save",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "none",
                  "parts": [
                    {
                      "number": null,
                      "denomination": null,
                      "bonus": "",
                      "types": [
                        "necrotic"
                      ],
                      "custom": {
                        "enabled": true,
                        "formula": "(floor(((@details.level + @details.spellLevel) + 1) / 6) + 1)d8[if uninjured]"
                      },
                      "scaling": {
                        "mode": "",
                        "number": null,
                        "formula": ""
                      }
                    }
                  ]
                },
                "save": {
                  "ability": [
                    "wis"
                  ],
                  "dc": {
                    "calculation": "int",
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              },
              "dnd5eactivity200": {
                "_id": "dnd5eactivity200",
                "type": "damage",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "critical": {
                    "allow": false,
                    "bonus": ""
                  },
                  "parts": [
                    {
                      "number": null,
                      "denomination": null,
                      "bonus": "",
                      "types": [],
                      "custom": {
                        "enabled": true,
                        "formula": "(floor(((@details.level + @details.spellLevel) + 1) / 6) + 1)d12[if injured]"
                      },
                      "scaling": {
                        "mode": "",
                        "number": null,
                        "formula": ""
                      }
                    }
                  ]
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "toll-the-dead",
            "sourceItem": "class:cleric"
          },
          "img": "icons/magic/sonic/bell-alarm-red-purple.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "XGE",
              "hash": "toll%20the%20dead_xge",
              "propDroppable": "spell",
              "parentClassName": "Cleric",
              "parentClassSource": "PHB",
              "parentSubclassName": "Knowledge Domain",
              "parentSubclassSource": "PHB"
            },
            "tidy5e-sheet": {
              "parentClass": "cleric"
            },
            "midiProperties": {
              "confirmTargets": "default",
              "saveDamage": "default",
              "bonusSaveDamage": "default",
              "otherSaveDamage": "default",
              "autoFailFriendly": false,
              "autoSaveFriendly": false,
              "critOther": false,
              "offHandWeapon": false,
              "magicdam": false,
              "magiceffect": false,
              "noConcentrationCheck": false,
              "toggleEffect": false,
              "ignoreTotalCover": false,
              "idr": false,
              "idi": false,
              "idv": false,
              "ida": false
            },
            "midi-qol": {
              "rollAttackPerTarget": "default",
              "removeAttackDamageButtons": "default",
              "itemCondition": "",
              "otherCondition": "",
              "effectCondition": ""
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "b2Fjak9VbmExiirH",
        "doc": {
          "name": "Command",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "223",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You speak a one-word command to a creature you can see within range. The target must succeed on a Wisdom saving throw or follow the command on its next turn. The spell has no effect if the target is undead, if it doesn't understand your language, or if your command is directly harmful to it.</p><p>Some typical commands and their effects follow. You might issue a command other than one described here. If you do so, the DM determines how the target behaves. If the target can't follow your command, the spell ends.</p><div data-roll-name-ancestor=\"Approach\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">Approach.</span></span> <p>The target moves toward you by the shortest and most direct route, ending its turn if it moves within 5 feet of you.</p></div><div data-roll-name-ancestor=\"Drop\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"2\"> <span class=\"entry-title-inner\">Drop.</span></span> <p>The target drops whatever it is holding and then ends its turn.</p></div><div data-roll-name-ancestor=\"Flee\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"3\"> <span class=\"entry-title-inner\">Flee.</span></span> <p>The target spends its turn moving away from you by the fastest available means.</p></div><div data-roll-name-ancestor=\"Grovel\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"4\"> <span class=\"entry-title-inner\">Grovel.</span></span> <p>The target falls &amp;Reference[condition=prone] and then ends its turn.</p></div><div data-roll-name-ancestor=\"Halt\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"5\"> <span class=\"entry-title-inner\">Halt.</span></span> <p>The target doesn't move and takes no actions. A flying creature stays aloft, provided that it is able to do so. If it must move to stay aloft, it flies the minimum distance needed to remain in the air.</p></div></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, you can affect one additional creature for each slot level above 1st. The creatures must be within 30 feet of each other when you target them.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "enc",
            "properties": [
              "vocal"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "60",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "round"
            },
            "ability": "",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "save",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "half",
                  "parts": []
                },
                "save": {
                  "ability": [
                    "wis"
                  ],
                  "dc": {
                    "calculation": "spellcasting",
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "command",
            "sourceItem": "class:cleric"
          },
          "img": "icons/magic/control/control-influence-puppet.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "command_phb",
              "propDroppable": "spell"
            },
            "midiProperties": {
              "confirmTargets": "default",
              "autoFailFriendly": false,
              "autoSaveFriendly": false,
              "critOther": false,
              "offHandWeapon": false,
              "magicdam": false,
              "magiceffect": false,
              "noConcentrationCheck": false,
              "toggleEffect": false,
              "ignoreTotalCover": false,
              "idr": false,
              "idi": false,
              "idv": false,
              "ida": false
            },
            "midi-qol": {
              "rollAttackPerTarget": "default",
              "itemCondition": "",
              "effectCondition": ""
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "EZqDHnxi7WX6qoD5",
        "doc": {
          "name": "Identify",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "252",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You choose one object that you must touch throughout the casting of the spell. If it is a magic item or some other magic-imbued object, you learn its properties and how to use them, whether it requires attunement to use, and how many charges it has, if any. You learn whether any spells are affecting the item and what they are. If the item was created by a spell, you learn which spell created it.</p><p>If you instead touch a creature throughout the casting, you learn what spells, if any, are currently affecting it.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "material",
              "ritual"
            ],
            "materials": {
              "value": "a pearl worth at least 100 gp and an owl feather",
              "consumed": false,
              "cost": 100,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "object",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "minute",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "identify",
            "sourceItem": "class:cleric"
          },
          "img": "icons/sundries/scrolls/scroll-bound-blue-red.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "identify_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "CtmAuvuwmIbfaReG",
        "doc": {
          "name": "Augury",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "215",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>By casting gem-inlaid sticks, rolling dragon bones, laying out ornate cards, or employing some other divining tool, you receive an omen from an otherworldly entity about the results of a specific course of action that you plan to take within the next 30 minutes. The DM chooses from the following possible omens:</p><ul class=\"rd__list\"><li class=\"rd__li \">Weal, for good results</li><li class=\"rd__li \">Woe, for bad results</li><li class=\"rd__li \">Weal and woe, for both good and bad results</li><li class=\"rd__li \">Nothing, for results that aren't especially good or bad</li></ul><p>The spell doesn't take into account any possible circumstances that might change the outcome, such as the casting of additional spells or the loss or gain of a companion.</p><p>If you cast the spell two or more times before completing your next long rest, there is a cumulative [[/r 1d100]]{25 percent} chance for each casting after the first that you get a random reading. The DM makes this roll in secret.</p></div>",
              "chat": ""
            },
            "level": 2,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "material",
              "ritual"
            ],
            "materials": {
              "value": "specially marked sticks, bones, or similar tokens worth at least 25 gp",
              "consumed": false,
              "cost": 25,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "minute",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "augury",
            "sourceItem": "class:cleric"
          },
          "img": "icons/magic/light/orb-hands-humanoid-yellow.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "augury_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "dKgV912o7Oq3KgWE",
        "doc": {
          "name": "Detect Magic",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "231",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>For the duration, you sense the presence of magic within 30 feet of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object in the area that bears magic, and you learn its <a href=\"https://5e.tools/book.html#PHB,10,the%20schools%20of%20magic,0\">school of magic</a>, if any.</p><p>The spell can penetrate most barriers, but it is blocked by 1 foot of stone, 1 inch of common metal, a thin sheet of lead, or 3 feet of wood or dirt.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "ritual",
              "concentration"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "type": "radius",
                "size": "30",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "10",
              "units": "minute"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 0,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "detect-magic",
            "sourceItem": "class:cleric"
          },
          "img": "icons/magic/unholy/hands-cloud-light-pink.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "detect%20magic_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "QJaTrX2kvWq43CDP",
        "doc": {
          "name": "Mage Armor",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "256",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You touch a willing creature who isn't wearing armor, and a protective magical force surrounds it until the spell ends. The target's base AC becomes 13 + its Dexterity modifier. The spell ends if the target dons armor or if you dismiss the spell as an action.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "abj",
            "properties": [
              "vocal",
              "somatic",
              "material"
            ],
            "materials": {
              "value": "a piece of cured leather",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "8",
              "units": "hour"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [
                  {
                    "_id": "cfwMU7LuOJ619Lny",
                    "level": {}
                  }
                ],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "mage-armor",
            "sourceItem": "class:wizard"
          },
          "img": "icons/equipment/chest/breastplate-helmet-metal.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "mage%20armor_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": [
            {
              "_id": "cfwMU7LuOJ619Lny",
              "changes": [
                {
                  "key": "system.attributes.ac.calc",
                  "mode": 5,
                  "value": "mage",
                  "priority": null
                }
              ],
              "disabled": false,
              "duration": {
                "startTime": null,
                "seconds": 28800,
                "combat": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null
              },
              "origin": "Compendium.dnd5e.spells.CKZTpZlxj7hjjo2H",
              "transfer": false,
              "flags": {
                "plutonium": {
                  "dedupeId": "mage-armor"
                }
              },
              "tint": "#ffffff",
              "name": "Mage Armor",
              "description": "<p>The target's base AC becomes 13 + its Dexterity modifier.</p>",
              "statuses": [],
              "_stats": {
                "compendiumSource": null,
                "duplicateSource": null,
                "coreVersion": "13.351",
                "systemId": "dnd5e",
                "systemVersion": "3.3.1",
                "createdTime": null,
                "modifiedTime": null,
                "lastModifiedBy": null,
                "exportSource": null
              },
              "img": "icons/equipment/chest/breastplate-helmet-metal.webp",
              "type": "base",
              "system": {},
              "sort": 0
            }
          ]
        }
      },
      {
        "origId": "JG8N8Nfm0muWdowZ",
        "doc": {
          "name": "Shield",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "275",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from @spell[magic missile].</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "abj",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "reaction",
              "condition": "which you take when you are hit by an attack or targeted by the magic missile spell",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "round"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [
                  {
                    "_id": "6pbotGIvqQkraPva",
                    "level": {}
                  }
                ],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "shield",
            "sourceItem": "class:wizard"
          },
          "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "shield_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": [
            {
              "_id": "6pbotGIvqQkraPva",
              "flags": {
                "plutonium": {
                  "dedupeId": "shield"
                }
              },
              "changes": [
                {
                  "key": "system.attributes.ac.bonus",
                  "mode": 2,
                  "value": "5",
                  "priority": null
                }
              ],
              "disabled": false,
              "duration": {
                "startTime": null,
                "rounds": 1,
                "seconds": null,
                "combat": null,
                "turns": null,
                "startRound": null,
                "startTurn": null
              },
              "origin": "Item.FlLKKv7bQBlIAs11",
              "tint": "#ffffff",
              "transfer": false,
              "name": "Shield",
              "description": "<p>Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.</p>",
              "statuses": [],
              "_stats": {
                "compendiumSource": null,
                "duplicateSource": null,
                "coreVersion": "13.351",
                "systemId": "dnd5e",
                "systemVersion": "3.3.1",
                "createdTime": null,
                "modifiedTime": null,
                "lastModifiedBy": null,
                "exportSource": null
              },
              "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
              "type": "base",
              "system": {},
              "sort": 0
            }
          ]
        }
      },
      {
        "origId": "iKWkO5C1xBPzcuOd",
        "doc": {
          "name": "Silvery Barbs",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "SCC",
              "page": "38",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You magically distract the triggering creature and turn its momentary uncertainty into encouragement for another creature. The triggering creature must reroll the [[/r d20]] and use the lower roll.</p><p>You can then choose a different creature you can see within range (you can choose yourself). The chosen creature has advantage on the next attack roll, ability check, or saving throw it makes within 1 minute. A creature can be empowered by only one use of this spell at a time.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "enc",
            "properties": [
              "vocal"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "60",
              "units": "ft"
            },
            "activation": {
              "type": "reaction",
              "condition": "which you take when a creature you can see within 60 feet of yourself succeeds on an attack roll, an ability check, or a saving throw",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "d20",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "silvery-barbs",
            "sourceItem": "class:wizard"
          },
          "img": "icons/magic/control/energy-stream-link-white.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "SCC",
              "hash": "silvery%20barbs_scc",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "ES8XCDFukV7jRxTx",
        "doc": {
          "name": "Absorb Elements",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "XGE",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>The spell captures some of the incoming energy, lessening its effect on you and storing it for your next melee attack. You have resistance to the triggering damage type until the start of your next turn. Also, the first time you hit with a melee attack on your next turn, the target takes an extra [[/damage 1d6]] damage of the triggering type, and the spell ends.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, the extra damage increases by [[/damage 1d6]] for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "abj",
            "properties": [
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "reaction",
              "condition": "which you take when you take acid, cold, fire, lightning, or thunder damage",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "round"
            },
            "ability": "",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "damage",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "critical": {
                    "allow": false,
                    "bonus": ""
                  },
                  "parts": [
                    {
                      "number": 1,
                      "denomination": 6,
                      "bonus": "",
                      "types": [],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "whole",
                        "number": 1,
                        "formula": ""
                      }
                    }
                  ]
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "absorb-elements",
            "sourceItem": "class:wizard"
          },
          "img": "icons/magic/symbols/elements-air-earth-fire-water.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "XGE",
              "hash": "absorb%20elements_xge",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "dbasWTvjkDJaNBR2",
        "doc": {
          "name": "Mind Spike",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "XGE",
              "page": "162",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You reach into the mind of one creature you can see within range. The target must make a Wisdom saving throw, taking [[/damage 3d8 type=psychic]] damage on a failed save, or half as much damage on a successful one. On a failed save, you also always know the target's location until the spell ends, but only while the two of you are on the same plane of existence. While you have this knowledge, the target can't become hidden from you, and if it's &amp;Reference[condition=invisible], it gains no benefit from that condition against you.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 3rd level or higher, the damage increases by [[/damage 1d8]] for each slot level above 2nd.</p></div></div>",
              "chat": ""
            },
            "level": 2,
            "school": "div",
            "properties": [
              "somatic",
              "concentration"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "60",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "save",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "half",
                  "parts": [
                    {
                      "number": 3,
                      "denomination": 8,
                      "bonus": "",
                      "types": [
                        "psychic"
                      ],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "whole",
                        "number": 1,
                        "formula": ""
                      }
                    }
                  ]
                },
                "save": {
                  "ability": [
                    "wis"
                  ],
                  "dc": {
                    "calculation": "spellcasting",
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "mind-spike",
            "sourceItem": "class:wizard"
          },
          "img": "icons/magic/light/explosion-impact-purple.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "XGE",
              "hash": "mind%20spike_xge",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "n1TjxHWUbwFcLHAt",
        "doc": {
          "name": "Bless",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "219",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target can roll a [[/r d4]] and add the number rolled to the attack roll or saving throw.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "enc",
            "properties": [
              "vocal",
              "somatic",
              "material",
              "concentration"
            ],
            "materials": {
              "value": "a sprinkling of holy water",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "3",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "30",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [
                  {
                    "_id": "8rP3gwmXVTgZqYZE",
                    "level": {}
                  }
                ],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "bless",
            "sourceItem": "class:cleric"
          },
          "img": "icons/magic/life/heart-hand-gold-green.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "bless_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": [
            {
              "_id": "8rP3gwmXVTgZqYZE",
              "flags": {
                "plutonium": {
                  "dedupeId": "bless"
                }
              },
              "changes": [
                {
                  "key": "system.bonuses.abilities.save",
                  "mode": 2,
                  "value": "1d4",
                  "priority": null
                },
                {
                  "key": "system.bonuses.mwak.attack",
                  "mode": 2,
                  "value": "1d4",
                  "priority": null
                },
                {
                  "key": "system.bonuses.msak.attack",
                  "mode": 2,
                  "value": "1d4",
                  "priority": null
                },
                {
                  "key": "system.bonuses.rsak.attack",
                  "mode": 2,
                  "value": "1d4",
                  "priority": null
                },
                {
                  "key": "system.bonuses.rwak.attack",
                  "mode": 2,
                  "value": "1d4",
                  "priority": null
                }
              ],
              "disabled": false,
              "duration": {
                "startTime": null,
                "seconds": 60,
                "rounds": 10,
                "combat": null,
                "turns": null,
                "startRound": null,
                "startTurn": null
              },
              "origin": "Item.kZZAZ6kp9YzgPQEe",
              "tint": "#ffffff",
              "transfer": false,
              "name": "Bless",
              "description": "",
              "statuses": [],
              "_stats": {
                "compendiumSource": null,
                "duplicateSource": null,
                "coreVersion": "13.351",
                "systemId": "dnd5e",
                "systemVersion": "3.3.1",
                "createdTime": null,
                "modifiedTime": null,
                "lastModifiedBy": null,
                "exportSource": null
              },
              "img": "icons/magic/life/heart-hand-gold-green.webp",
              "type": "base",
              "system": {},
              "sort": 0
            }
          ]
        }
      },
      {
        "origId": "QYnru6FUiABV8IDG",
        "doc": {
          "name": "Sanctuary",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "272",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You ward a creature within range against attack. Until the spell ends, any creature who targets the warded creature with an attack or a harmful spell must first make a Wisdom saving throw. On a failed save, the creature must choose a new target or lose the attack or spell. This spell doesn't protect the warded creature from area effects, such as the explosion of a @spell[fireball].</p><p>If the warded creature makes an attack, casts a spell that affects an enemy, or deals damage to another creature, this spell ends.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "abj",
            "properties": [
              "vocal",
              "somatic",
              "material"
            ],
            "materials": {
              "value": "a small silver mirror",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "30",
              "units": "ft"
            },
            "activation": {
              "type": "bonus",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "save",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "half",
                  "parts": []
                },
                "save": {
                  "ability": [
                    "wis"
                  ],
                  "dc": {
                    "calculation": "spellcasting",
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "sanctuary",
            "sourceItem": "class:cleric"
          },
          "img": "icons/magic/holy/barrier-shield-winged-blue.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "sanctuary_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "qpbNNdHIzaMghmfp",
        "doc": {
          "name": "Comprehend Languages",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "224",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>For the duration, you understand the literal meaning of any spoken language that you hear. You also understand any written language that you see, but you must be touching the surface on which the words are written. It takes about 1 minute to read one page of text.</p><p>This spell doesn't decode secret messages in a text or a glyph, such as an arcane sigil, that isn't part of a written language.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "material",
              "ritual"
            ],
            "materials": {
              "value": "a pinch of soot and salt",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "self",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 0,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "comprehend-languages",
            "sourceItem": "class:wizard"
          },
          "img": "icons/skills/trades/academics-book-study-runes.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "comprehend%20languages_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "1yqvcYETguV8sxLf",
        "doc": {
          "name": "Feather Fall",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "239",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>Choose up to five falling creatures within range. A falling creature's rate of descent slows to 60 feet per round until the spell ends. If the creature lands before the spell ends, it takes no falling damage and can land on its feet, and the spell ends for that creature.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "trs",
            "properties": [
              "vocal",
              "material"
            ],
            "materials": {
              "value": "a small feather or a piece of down",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "5",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "60",
              "units": "ft"
            },
            "activation": {
              "type": "reaction",
              "condition": "which you take when you or a creature within 60 feet of you falls",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 0,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "feather-fall",
            "sourceItem": "class:wizard"
          },
          "img": "icons/commodities/materials/feather-white-glowing-fire.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "feather%20fall_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "KlZLUDhy8Y5XVOM7",
        "doc": {
          "name": "Sleep",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "276",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>This spell sends creatures into a magical slumber. Roll [[/r 5d8]]; the total is how many hit points of creatures this spell can affect. Creatures within 20 feet of a point you choose within range are affected in ascending order of their current hit points (ignoring &amp;Reference[condition=unconscious] creatures).</p><p>Starting with the creature that has the lowest current hit points, each creature affected by this spell falls &amp;Reference[condition=unconscious] until the spell ends, the sleeper takes damage, or someone uses an action to shake or slap the sleeper awake. Subtract each creature's hit points from the total before moving on to the creature with the next lowest hit points. A creature's hit points must be equal to or less than the remaining total for that creature to be affected.</p><p>Undead and creatures immune to being &amp;Reference[condition=charmed] aren't affected by this spell.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, roll an additional [[/r 2d8]] for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "enc",
            "properties": [
              "vocal",
              "somatic",
              "material"
            ],
            "materials": {
              "value": "a pinch of fine sand, rose petals, or a cricket",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "type": "sphere",
                "size": "20",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "90",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "damage",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [
                  {
                    "_id": "MowBnXpRu2aG48i9",
                    "level": {}
                  }
                ],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "critical": {
                    "allow": false,
                    "bonus": ""
                  },
                  "parts": [
                    {
                      "number": 5,
                      "denomination": 8,
                      "bonus": "",
                      "types": [],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "whole",
                        "number": 2,
                        "formula": ""
                      }
                    }
                  ]
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "sleep",
            "sourceItem": "class:wizard"
          },
          "img": "icons/magic/control/sleep-bubble-purple.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "sleep_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": [
            {
              "name": "Sleep",
              "origin": "Compendium.dnd5e.spells.Item.KhwiSi9fwVfUPtku",
              "duration": {
                "startTime": null,
                "seconds": 60,
                "combat": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null
              },
              "disabled": false,
              "_id": "MowBnXpRu2aG48i9",
              "changes": [],
              "description": "<p>The creature affected by this spell falls Unconscious until the spell ends, the sleeper takes damage, or someone uses an action to shake or slap the sleeper awake.</p>",
              "transfer": false,
              "statuses": [
                "unconscious",
                "incapacitated"
              ],
              "flags": {
                "plutonium": {
                  "dedupeId": "sleep"
                }
              },
              "tint": "#ffffff",
              "_stats": {
                "compendiumSource": null,
                "duplicateSource": null,
                "coreVersion": "13.351",
                "systemId": "dnd5e",
                "systemVersion": "3.3.1",
                "createdTime": null,
                "modifiedTime": null,
                "lastModifiedBy": null,
                "exportSource": null
              },
              "img": "icons/magic/control/sleep-bubble-purple.webp",
              "type": "base",
              "system": {},
              "sort": 0
            }
          ]
        }
      },
      {
        "origId": "KHmuy54aysjTyv4w",
        "doc": {
          "name": "Chill Touch",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "221",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You create a ghostly, skeletal hand in the space of a creature within range. Make a ranged spell attack against the creature to assail it with the chill of the grave. On a hit, the target takes [[/damage 1d8 type=necrotic]] damage, and it can't regain hit points until the start of your next turn. Until then, the hand clings to the target.</p><p>If you hit an undead target, it also has disadvantage on attack rolls against you until the end of your next turn.</p><p>This spell's damage increases by [[/r 1d8]] when you reach 5th level ([[/damage 2d8]]), 11th level ([[/damage 3d8]]), and 17th level ([[/damage 4d8]]).</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "nec",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "120",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "round"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "attack",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "attack": {
                  "ability": "",
                  "bonus": "",
                  "critical": {
                    "threshold": null
                  },
                  "flat": false,
                  "type": {
                    "value": "ranged",
                    "classification": "spell"
                  }
                },
                "damage": {
                  "critical": {
                    "bonus": ""
                  },
                  "includeBase": true,
                  "parts": [
                    {
                      "number": 1,
                      "denomination": 8,
                      "bonus": "",
                      "types": [
                        "necrotic"
                      ],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "whole",
                        "number": 1,
                        "formula": ""
                      }
                    }
                  ]
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "chill-touch",
            "sourceItem": "class:wizard"
          },
          "img": "icons/magic/lightning/claws-unarmed-strike-teal.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "chill%20touch_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "5hyJeuvrNxqzsNhC",
        "doc": {
          "name": "Misty Step",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "260",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see.</p></div>",
              "chat": ""
            },
            "level": 2,
            "school": "con",
            "properties": [
              "vocal"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "space",
                "count": "30",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "bonus",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 0,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "misty-step",
            "sourceItem": "class:wizard"
          },
          "img": "icons/magic/water/projectile-ice-impact-stone.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "misty%20step_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "h7RQWTcFgtEKRdmV",
        "doc": {
          "name": "See Invisibility",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "274",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>For the duration, you see &amp;Reference[condition=invisible] creatures and objects as if they were visible, and you can see into the Ethereal Plane. Ethereal creatures and objects appear ghostly and translucent.</p></div>",
              "chat": ""
            },
            "level": 2,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "material"
            ],
            "materials": {
              "value": "a pinch of talc and a small sprinkling of powdered silver",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "self",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "see-invisibility",
            "sourceItem": "class:wizard"
          },
          "img": "icons/magic/control/silhouette-aura-energy.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "see%20invisibility_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {
              "flinnSpellOrigin": "wizard"
            }
          },
          "effects": []
        }
      },
      {
        "origId": "tzhs0TixmylJIiDa",
        "doc": {
          "name": "Guiding Bolt",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB'14",
              "page": "248",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--3\"><p>A flash of light streaks toward a creature of your choice within range. Make a ranged spell attack against the target. On a hit, the target takes [[/damage 4d6 type=radiant]] damage, and the next attack roll made against this target before the end of your next turn has advantage, thanks to the mystical dim light glittering on the target until then.</p></div><div class=\"ve-rd__b  ve-rd__b--3\"><p></p><div data-roll-name-ancestor=\"At Higher Levels\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner \">At Higher Levels.</span></span> When you cast this spell using a spell slot of 2nd level or higher, the damage increases by [[/damage 1d6]] for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "evo",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "template": {
                "contiguous": false,
                "type": "",
                "units": "ft",
                "stationary": false
              },
              "affects": {
                "count": "1",
                "type": "creature",
                "choice": false,
                "special": ""
              }
            },
            "range": {
              "value": "120",
              "units": "ft",
              "special": ""
            },
            "activation": {
              "type": "action",
              "value": 1,
              "condition": ""
            },
            "duration": {
              "value": "1",
              "units": "round"
            },
            "uses": {
              "max": "",
              "recovery": [],
              "spent": 0
            },
            "method": "spell",
            "prepared": 1,
            "sourceItem": "class:cleric",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "attack",
                "activation": {
                  "type": "action",
                  "value": null,
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [
                  {
                    "_id": "hf1g2XNPqQFMw35j",
                    "level": {}
                  }
                ],
                "range": {
                  "override": false,
                  "units": "self"
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "attack": {
                  "ability": "",
                  "bonus": "",
                  "critical": {
                    "threshold": null
                  },
                  "flat": false,
                  "type": {
                    "value": "ranged",
                    "classification": ""
                  }
                },
                "damage": {
                  "critical": {
                    "bonus": ""
                  },
                  "includeBase": true,
                  "parts": [
                    {
                      "number": 4,
                      "denomination": 6,
                      "bonus": "",
                      "types": [
                        "radiant"
                      ],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "whole",
                        "number": 1,
                        "formula": ""
                      }
                    }
                  ]
                },
                "uses": {
                  "spent": 0,
                  "recovery": [],
                  "max": ""
                },
                "sort": 0,
                "name": "Cast",
                "img": "",
                "visibility": {
                  "level": {
                    "min": null,
                    "max": null
                  },
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                },
                "flags": {}
              }
            },
            "identifier": "guiding-bolt",
            "ability": ""
          },
          "img": "icons/magic/fire/projectile-fireball-purple.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "guiding%20bolt_phb",
              "propDroppable": "spell",
              "spellClassNames": [
                "Cleric"
              ]
            },
            "altarion-aitusa": {
              "flinnSpellOrigin": "cleric"
            }
          },
          "effects": [
            {
              "name": "Guiding Bolt",
              "img": "icons/magic/fire/projectile-fireball-purple.webp",
              "origin": "Compendium.dnd5e.spells.Item.7buEm5KhI5lP8m1z",
              "transfer": false,
              "_id": "hf1g2XNPqQFMw35j",
              "type": "base",
              "system": {},
              "changes": [],
              "disabled": false,
              "duration": {
                "startTime": null,
                "combat": null,
                "seconds": 6,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null
              },
              "description": "<p>The next attack roll made against you before the end of the caster's next turn has advantage thanks to the mystical dim light glittering on you.</p>",
              "tint": "#ffffff",
              "statuses": [],
              "sort": 0,
              "flags": {
                "dnd5e": {
                  "riders": {
                    "statuses": []
                  }
                },
                "plutonium": {
                  "dedupeId": "guiding-bolt"
                }
              },
              "_stats": {
                "compendiumSource": null,
                "duplicateSource": null,
                "exportSource": null,
                "coreVersion": "13.351",
                "systemId": "dnd5e",
                "systemVersion": "5.3.2",
                "lastModifiedBy": null
              }
            }
          ]
        }
      }
    ]
  },
  "kyrion": {
    "sourceName": "Kyrion",
    "currency": {
      "pp": 0,
      "gp": 0,
      "ep": 0,
      "sp": 3,
      "cp": 0
    },
    "tools": {
      "thief": {
        "value": 1,
        "ability": "int",
        "roll": {
          "min": null,
          "max": null,
          "mode": 0
        },
        "bonuses": {
          "check": ""
        }
      },
      "pois": {
        "value": 1,
        "ability": "int",
        "roll": {
          "min": null,
          "max": null,
          "mode": 0
        },
        "bonuses": {
          "check": ""
        }
      }
    },
    "languages": {
      "value": [
        "abyssal",
        "cant",
        "common",
        "elvish",
        "halfling",
        "infernal"
      ],
      "custom": "",
      "communication": {}
    },
    "professionsFlags": {
      "profissoesAtivas": [
        "Sicário"
      ],
      "treinosAtivos": [
        "Talento",
        "Atributo",
        "Profissão"
      ],
      "listaTreinamentos": [
        {
          "categoria": "Talento",
          "nome": "Treinamento de Talento: Dual Wielder",
          "atributoPadrao": "dex",
          "acertosAtuais": 4.25,
          "totalNecessario": 100,
          "dificuldadeEspecifica": "Difícil",
          "infoExtra": "(Talento - Difícil - Atributo: Inteligência)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        },
        {
          "categoria": "Atributo",
          "nome": "Treinamento de Carisma",
          "attrKey": "cha",
          "acertosAtuais": 8.25,
          "totalNecessario": 60,
          "dificuldadeEspecifica": "Médio",
          "infoExtra": "(Valor atual: 18 - Médio)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        },
        {
          "categoria": "Profissão",
          "profissaoAlvo": "Sicário",
          "nome": "Treinamento de Sicário",
          "timestamp": 1792378071548,
          "acertosAtuais": 10,
          "totalNecessario": 10,
          "dificuldadeEspecifica": "Variável",
          "infoExtra": "(Profissão Conhecida - Possui Proficiência na Ferramenta - Ganhe XP completando projetos de Sicário)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        }
      ],
      "treinosColapsos": {
        "Talento": false
      },
      "projetos": [
        {
          "profissao": "Sicário",
          "nome": "Novo Projeto de Sicário",
          "subTipo": "Filtração de Veneno",
          "complexidade": "Simples",
          "acertosAtuais": 0,
          "atributoPadrao": "int",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": "",
          "tipoErva": "Veneno Básico",
          "dificuldadeEspecifica": "Fácil",
          "acertosTotaisPreparo": 4
        },
        {
          "profissao": "Sicário",
          "nome": "Novo Projeto de Sicário",
          "subTipo": "Coleta de Erva Venenosa",
          "complexidade": "Simples",
          "acertosAtuais": 0,
          "atributoPadrao": "int",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": "",
          "tipoErva": "Veneno Básico",
          "bioma": "",
          "dificuldadeEspecifica": "Selecione Bioma"
        }
      ],
      "colapsos": {
        "Sicário": false
      },
      "ferramentasEquipadas": {
        "Sicário": "d97M9so5NNexTpgR"
      }
    },
    "items": [
      {
        "origId": "xFmFORoJgUKJ8mZf",
        "doc": {
          "name": "Ruined",
          "type": "background",
          "system": {
            "description": {
              "value": "<div><div class=\"rd__b  rd__b--1\"><p>Everything was going so well! You had a life of luxury, love, and comfort when you suddenly lost it all. Perhaps you were framed for crimes you didn't commit and lost your reputation, fortune, and career. Maybe a rampaging dragon or another monster wiped out everything you had in a single calamitous afternoon. Or you might have sought out a Deck of Many Things, hoping to make your successful life even more glorious—only to draw a destructive card that changed your destiny forever.</p><p>Your desperation has driven you to the career of adventurer. You don't seek out dark dungeons and their monstrous inhabitants for excitement and glory; you do it because every other path is closed to you. But you have risen high on fortune's wheel once before, and with luck and fortitude, you could do so again.</p></div><hr /><div class=\"rd__b  rd__b--1\"><ul class=\"rd__list rd__list-hang-notitle\"><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Skill Proficiencies:\"><span class=\"bold rd__list-item-name\">Skill Proficiencies:</span> &amp;Reference[skill=Stealth], &amp;Reference[skill=Survival]</p></li><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Languages:\"><span class=\"bold rd__list-item-name\">Languages:</span> One of your choice</p></li><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Equipment:\"><span class=\"bold rd__list-item-name\">Equipment:</span> A cracked @item[hourglass|PHB], a set of rusty @item[manacles|PHB], a half-empty bottle, a @item[hunting trap|PHB], a @item[gaming set|PHB] (matching your chosen proficiency), a set of @item[traveler's clothes|PHB], and a @item[pouch|PHB] containing 13 gp</p></li><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Tool Proficiencies:\"><span class=\"bold rd__list-item-name\">Tool Proficiencies:</span> One <a href=\"https://5e.tools/items.html#blankhash,flstsource:phb=1,flstmiscellaneous:mundane=1,flsttype:gaming%20set=1\">gaming set</a> of your choice (such as playing cards or three-dragon ante cards)</p></li></ul><div data-roll-name-ancestor=\"Feature: Still Standing\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"1\"> <span class=\"entry-title-inner\">Feature: Still Standing</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>You have weathered ruinous misfortune, and you possess hidden reserves others don't expect. You gain the @feat[Alert], @feat[Skilled], or @feat[Tough] feat (your choice). Your choice of feat reflects how you've dealt with the terrible loss that changed your life forever. If you've kept your senses sharp for every opportunity and climbed your way out of misery by seizing the tiniest scrap of hope, choose Alert. If you've redoubled your efforts to reclaim what was once yours, choose Skilled. If you've stoically persevered through your misfortune, select Tough.</p></div><div data-roll-name-ancestor=\"Suggested Characteristics\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"2\"> <span class=\"entry-title-inner\">Suggested Characteristics</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>Rising above misfortune shapes one's perspective. The Ruined Personality Traits table suggests traits you might adopt for your character (and ruinous cards that might have prompted this trait).</p><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-2 ve-text-center\" data-rd-isroller=\"true\">[[/r d6]]</th><th class=\"ve-col-10\" data-rd-isroller=\"false\">Personality Trait</th></tr></thead><tbody><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-10\">I've changed from my past, and I work to live up to my new path. (Balance, Throne)</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-10\">Every moment is a gift I refuse to squander. (Euryale, Skull)</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-10\">Now that I've overcome having nothing, I can survive anything. (Fool, Ruin, Talons)</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-10\">I know enemies are set against me, and I always prepare for the worst. (Flames, Rogue)</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-10\">I interpret every event as part of a larger pattern I just haven't worked out yet. (Puzzle, Star)</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-10\">I must make up for so much time I've already lost. (Donjon, Void)</td></tr></tbody></table></div><div data-roll-name-ancestor=\"Building a Ruined Character\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"3\"> <span class=\"entry-title-inner\">Building a Ruined Character</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>Ruined characters were on top of the world before misfortune struck. Many were wealthy. Others come from modest backgrounds, but they were surrounded by friends, family, and loved ones. They might have been famous, or simply never encountered serious hardship before. Some were born to privilege or rose to prominence through trickery or a false reputation. Now a @item[Deck of Many Things]—or another calamity—has knocked them down like a house of cards.</p><p>If your character's life was ruined by a @item[Deck of Many Things], consider which card was responsible. Perhaps your character was imprisoned for years by the Donjon or Void card, and now everyone they knew has died. Maybe your character drew the Rogue card, and the person closest to them—a spouse, child, or parent—turned against them. A devil unleashed by the Flames card might have destroyed their life. The Ruin or Talons card might have stolen the character's material goods or saddled them with vast debt.</p></div><div data-roll-name-ancestor=\"Ruined Trinkets\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"4\"> <span class=\"entry-title-inner\">Ruined Trinkets</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>When you make your character, you can roll once on the Ruined Trinkets table instead of on the Trinkets table in the <a href=\"https://5e.tools/book.html#PHB\">Player's Handbook</a>.</p><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-2 ve-text-center\" data-rd-isroller=\"true\">[[/r d6]]</th><th class=\"ve-col-10\" data-rd-isroller=\"false\">Trinket</th></tr></thead><tbody><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-10\">A rusted scrap of a once-beloved family heirloom</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-10\">A land deed, but all the names and markings that once tied it to you have faded into obscurity</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-10\">A bauble once imbued with powerful magic</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-10\">A battered playing card with a hole pierced in it, its face depicting the card that affected you</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-10\">A yellowed Humanoid tooth that whispers eerily when placed under a pillow</td></tr><tr><td class=\"ve-col-2 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-10\">A keepsake from someone you were once close to but who is now your enemy</td></tr></tbody></table></div></div></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "BMT",
              "page": "58",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "advancement": {},
            "startingEquipment": [],
            "identifier": "ruined"
          },
          "flags": {
            "plutonium": {
              "page": "backgrounds.html",
              "source": "BMT",
              "hash": "ruined_bmt",
              "propDroppable": "background",
              "isDirectImport": true
            }
          },
          "effects": [],
          "img": "icons/environment/settlement/graveyard-tombstone-night.webp",
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "xyGnVVZ2EuDVl8bu",
        "doc": {
          "name": "Gaming Set (Matching Your Chosen Proficiency)",
          "type": "loot",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "154",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>Multiple variations of this item exist, as listed below:</p><ul class=\"rd__list\"><li class=\"rd__li \">@item[Dice Set|PHB]</li><li class=\"rd__li \">@item[Dragonchess Set|PHB]</li><li class=\"rd__li \">@item[Playing Card Set|PHB]</li><li class=\"rd__li \">@item[Three-Dragon Ante Set|PHB]</li></ul></div><div class=\"rd__b  rd__b--2\"></div>",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "identified": true,
            "rarity": "",
            "type": {
              "value": "gear",
              "subtype": ""
            },
            "properties": [],
            "unidentified": {
              "description": ""
            },
            "container": null,
            "identifier": "gaming-set-matching-your-chosen-proficiency"
          },
          "img": "modules/plutonium/media/icon/rolling-dices.svg",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "gaming%20set_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "lyelLpJVOQf7wcSh",
        "doc": {
          "name": "Cracked Hourglass",
          "type": "loot",
          "system": {
            "description": {
              "value": "",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 1,
              "units": "lb"
            },
            "price": {
              "value": 25,
              "denomination": "gp"
            },
            "rarity": "",
            "identified": true,
            "type": {
              "value": "",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "identifier": "cracked-hourglass"
          },
          "img": "icons/tools/navigation/hourglass-yellow.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "hourglass_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "4yrWjw3MoBj4DyIq",
        "doc": {
          "name": "Hunting Trap",
          "type": "consumable",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>When you use your action to set it, this trap forms a saw-toothed steel ring that snaps shut when a creature steps on a pressure plate in the center. The trap is affixed by a heavy chain to an immobile object, such as a tree or a spike driven into the ground. A creature that steps on the plate must succeed on a DC 13 Dexterity saving throw or take [[/damage 1d4 type=piercing]] damage and stop moving. Thereafter, until the creature breaks free of the trap, its movement is limited by the length of the chain (typically 3 feet long). A creature can use its action to make a DC 13 Strength check, freeing itself or another creature within its reach on a success. Each failed check deals 1 piercing damage to the trapped creature.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "152",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 25,
              "units": "lb"
            },
            "price": {
              "value": 5,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "uses": {
              "max": "1",
              "autoDestroy": false,
              "spent": 0,
              "recovery": []
            },
            "damage": {
              "base": {
                "number": 1,
                "denomination": 4,
                "bonus": "",
                "types": [
                  "piercing"
                ],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              },
              "replace": false
            },
            "type": {
              "value": "trinket",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "save",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "target": "",
                      "value": "1",
                      "scaling": {
                        "mode": "",
                        "formula": ""
                      }
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "0",
                  "units": "touch",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "1",
                    "type": "creature",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "half",
                  "parts": []
                },
                "save": {
                  "ability": [
                    "dex"
                  ],
                  "dc": {
                    "calculation": "",
                    "formula": "13"
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              },
              "dnd5eactivity200": {
                "_id": "dnd5eactivity200",
                "type": "damage",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "target": "",
                      "value": "1",
                      "scaling": {
                        "mode": "",
                        "formula": ""
                      }
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "0",
                  "units": "touch",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "1",
                    "type": "creature",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "critical": {
                    "allow": false,
                    "bonus": ""
                  },
                  "parts": [
                    {
                      "number": null,
                      "denomination": null,
                      "bonus": "",
                      "types": [],
                      "custom": {
                        "enabled": true,
                        "formula": "1"
                      },
                      "scaling": {
                        "mode": "whole",
                        "number": null,
                        "formula": ""
                      }
                    }
                  ]
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "hunting-trap"
          },
          "img": "icons/environment/traps/trap-jaw-green.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "hunting%20trap_phb"
            },
            "dnd5e": {}
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "38ZmzZEdv2bS8cE8",
        "doc": {
          "name": "Set of Rusty Manacles",
          "type": "consumable",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>These metal restraints can bind a Small or Medium creature. Escaping the manacles requires a successful DC 20 Dexterity check. Breaking them requires a successful DC 20 Strength check. Each set of manacles comes with one key. Without the key, a creature proficient with @item[thieves' tools|PHB] can pick the manacles' lock with a successful DC 15 Dexterity check. Manacles have 15 hit points.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "152",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 6,
              "units": "lb"
            },
            "price": {
              "value": 2,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "uses": {
              "max": "1",
              "autoDestroy": false,
              "spent": 0,
              "recovery": []
            },
            "damage": {
              "base": {
                "types": [],
                "custom": {
                  "enabled": false
                },
                "scaling": {
                  "number": 1
                }
              },
              "replace": false
            },
            "type": {
              "value": "trinket",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "check",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "Creature must be Small or Medium.",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "target": "",
                      "value": "1",
                      "scaling": {
                        "mode": "",
                        "formula": ""
                      }
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "0",
                  "units": "touch",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "1",
                    "type": "creature",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "check": {
                  "ability": "",
                  "associated": [],
                  "dc": {}
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              },
              "dnd5eactivity100": {
                "_id": "dnd5eactivity100",
                "type": "save",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "Creature must be Small or Medium.",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "target": "",
                      "value": "1",
                      "scaling": {
                        "mode": "",
                        "formula": ""
                      }
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "0",
                  "units": "touch",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "1",
                    "type": "creature",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "half",
                  "parts": []
                },
                "save": {
                  "ability": [
                    "dex"
                  ],
                  "dc": {
                    "calculation": "",
                    "formula": "20"
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "set-of-rusty-manacles"
          },
          "img": "icons/sundries/survival/cuffs-shackles-steel.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "manacles_phb"
            },
            "dnd5e": {}
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "jqXpkGmU1R1fGI8T",
        "doc": {
          "name": "Pouch",
          "type": "container",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>A cloth or leather pouch can hold up to 20 @item[sling bullet|phb|sling bullets] or 50 @item[blowgun needle|phb|blowgun needles], among other things. A compartmentalized pouch for holding spell components is called a @item[component pouch|phb]. A pouch can hold up to ⅕ cubic foot or 6 pounds of gear.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "153",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 1,
              "units": "lb"
            },
            "price": {
              "value": 5,
              "denomination": "sp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "capacity": {
              "weight": {
                "value": 6,
                "units": "lb"
              },
              "volume": {
                "units": "cubicFoot"
              }
            },
            "currency": {
              "cp": 0,
              "sp": 0,
              "ep": 0,
              "gp": 0,
              "pp": 0
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "identifier": "pouch"
          },
          "img": "icons/containers/bags/pouch-simple-leather-tan.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "pouch_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "kl7xAUpQAu2dFW1o",
        "doc": {
          "name": "Traveler's Clothes",
          "type": "equipment",
          "system": {
            "description": {
              "value": "",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 4,
              "units": "lb"
            },
            "price": {
              "value": 2,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "cover": null,
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": null,
              "dex": null
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "speed": {
              "value": null,
              "conditions": "",
              "units": "ft"
            },
            "strength": null,
            "proficient": null,
            "type": {
              "value": "clothing",
              "baseItem": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "",
                  "value": null,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "0",
                  "units": "ft",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "0",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "travelers-clothes",
            "crew": {
              "value": []
            }
          },
          "img": "icons/equipment/head/hood-cloth-brown.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "traveler's%20clothes_phb"
            },
            "dnd5e": {}
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "zktwI9KRWv0uWqf3",
        "doc": {
          "name": "Half-Empty Bottle",
          "type": "loot",
          "system": {
            "source": {
              "custom": "",
              "book": "BMT",
              "page": "58",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "identified": true,
            "rarity": "",
            "type": {
              "value": "junk",
              "subtype": ""
            },
            "properties": [],
            "unidentified": {
              "description": ""
            },
            "container": null,
            "identifier": "half-empty-bottle"
          },
          "img": "modules/plutonium/media/icon/battle-gear.svg",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "BMT",
              "hash": "half-empty%20bottle_bmt"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "dFGWXM2pOVhZ40sH",
        "doc": {
          "name": "Dagger",
          "type": "weapon",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "149",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 1,
              "units": "lb"
            },
            "price": {
              "value": 2,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "cover": null,
            "range": {
              "value": 20,
              "long": 60,
              "units": "ft"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "damage": {
              "versatile": {
                "number": null,
                "denomination": null,
                "bonus": "",
                "types": [],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              },
              "base": {
                "number": 1,
                "denomination": 4,
                "bonus": "",
                "types": [
                  "piercing"
                ],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              }
            },
            "armor": {
              "value": null
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "properties": [
              "fin",
              "lgt",
              "thr"
            ],
            "proficient": null,
            "type": {
              "value": "simpleM",
              "baseItem": "dagger"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "attack",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "20",
                  "units": "ft",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "0",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "attack": {
                  "ability": "cha",
                  "bonus": "",
                  "critical": {
                    "threshold": null
                  },
                  "flat": false,
                  "type": {
                    "value": "melee",
                    "classification": "weapon"
                  }
                },
                "damage": {
                  "critical": {
                    "bonus": ""
                  },
                  "includeBase": true,
                  "parts": []
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "dagger",
            "crew": {
              "value": []
            },
            "ammunition": {}
          },
          "img": "icons/weapons/daggers/dagger-black.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "dagger_phb"
            },
            "dnd5e": {
              "last": {
                "dnd5eactivity000": {
                  "damageType": {
                    "0": "piercing"
                  }
                }
              }
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "sTE63NJZ8EPUvlaG",
        "doc": {
          "name": "Scale Mail",
          "type": "equipment",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>This armor consists of a coat and leggings (and perhaps a separate skirt) of leather covered with overlapping pieces of metal, much like the scales of a fish. The suit includes gauntlets.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "144",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 45,
              "units": "lb"
            },
            "price": {
              "value": 50,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "cover": null,
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": 14,
              "dex": 2
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "speed": {
              "value": null,
              "conditions": "",
              "units": "ft"
            },
            "strength": null,
            "proficient": null,
            "type": {
              "value": "medium",
              "baseItem": "scalemail"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [
              "stealthDisadvantage"
            ],
            "attuned": false,
            "activities": {},
            "identifier": "scale-mail",
            "crew": {
              "value": []
            }
          },
          "img": "icons/equipment/chest/breastplate-scale-grey.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "scale%20mail_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "tHxa0velbqtoksS7",
        "doc": {
          "name": "Shortsword",
          "type": "weapon",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "149",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 2,
              "units": "lb"
            },
            "price": {
              "value": 10,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "cover": null,
            "range": {
              "value": null,
              "long": 0,
              "units": "ft"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "damage": {
              "versatile": {
                "number": null,
                "denomination": null,
                "bonus": "",
                "types": [],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              },
              "base": {
                "number": 1,
                "denomination": 6,
                "bonus": "",
                "types": [
                  "piercing"
                ],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              }
            },
            "armor": {
              "value": null
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "properties": [
              "fin",
              "lgt"
            ],
            "proficient": null,
            "type": {
              "value": "martialM",
              "baseItem": "shortsword"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "attack",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "ft",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "0",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "attack": {
                  "ability": "cha",
                  "bonus": "",
                  "critical": {
                    "threshold": 20
                  },
                  "flat": false,
                  "type": {
                    "value": "melee",
                    "classification": "weapon"
                  }
                },
                "damage": {
                  "critical": {
                    "bonus": ""
                  },
                  "includeBase": true,
                  "parts": []
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "shortsword",
            "crew": {
              "value": []
            },
            "ammunition": {}
          },
          "img": "icons/weapons/swords/sword-guard-brown.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "shortsword_phb"
            },
            "dnd5e": {
              "last": {
                "dnd5eactivity000": {
                  "attackMode": "oneHanded",
                  "damageType": {
                    "0": "piercing"
                  }
                }
              }
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "ww1Elx7qxy9grW0r",
        "doc": {
          "name": "Alert",
          "type": "feat",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "165",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div><hr /><div>\n\t\t\t\t\n\t\t\t\t\n\t\t\t\t<div class=\"rd__b  rd__b--3\"><p>Always on the lookout for danger, you gain the following benefits:</p><ul class=\"rd__list\"><li class=\"rd__li \">You gain a +5 bonus to initiative.</li><li class=\"rd__li \">You can't be @status[surprised] while you are conscious.</li><li class=\"rd__li \">Other creatures don't gain advantage on attack rolls against you as a result of being unseen by you.</li></ul></div>\n\t\t\t</div></div>",
              "chat": ""
            },
            "requirements": "",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "type": {
              "value": "feat",
              "subtype": ""
            },
            "properties": [],
            "cover": null,
            "crewed": false,
            "prerequisites": {
              "level": null,
              "items": [],
              "repeatable": false
            },
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "",
                  "value": null,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "advancement": {},
            "identifier": "alert",
            "enchant": {}
          },
          "img": "modules/plutonium/media/icon/feat/phb-alert.webp",
          "flags": {
            "plutonium": {
              "page": "feats.html",
              "source": "PHB",
              "hash": "alert_phb"
            },
            "dnd5e": {}
          },
          "effects": [
            {
              "name": "Alert",
              "changes": [
                {
                  "key": "flags.dnd5e.initiativeAlert",
                  "mode": 5,
                  "value": "true",
                  "priority": 4
                }
              ],
              "disabled": true,
              "duration": {
                "startTime": 0,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "alert"
                }
              },
              "img": "modules/plutonium/media/icon/feat/phb-alert.webp",
              "type": "base",
              "system": {},
              "description": "",
              "tint": "#ffffff",
              "statuses": [],
              "sort": 0
            }
          ],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "yOZtUW5fxsLEQtKq",
        "doc": {
          "name": "Card of the Resonant Arcana (The Strength)",
          "type": "equipment",
          "img": "icons/sundries/gaming/rune-card.webp",
          "system": {
            "description": {
              "value": "<p>This rectangular slab of polished black quartz appears to hold a fragment of the night sky within it. While you are attuned to the card, stardust drifts inside the stone to form the illustration of a Major Arcana that resonates with your soul.</p><p data-path-to-node=\"4\">The card has 1 charge. You can expend this charge to use the property of the arcana engraved upon it. The card regains its expended charge daily at dawn.</p><p></p><p><strong>The Strength.</strong> As a bonus action, you can expend the card's charge to tame your inner essence for 1 minute. You gain temporary hit points equal to 1d8 + your Proficiency Bonus + your Constitution modifier. While you have any of these temporary hit points, you deal an extra 1d4 psychic damage whenever you hit a creature with a melee weapon attack.</p>",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "rarity": "veryRare",
            "identified": true,
            "attunement": "required",
            "attuned": false,
            "equipped": false,
            "properties": [
              "mgc"
            ],
            "type": {
              "value": "trinket",
              "baseItem": ""
            },
            "armor": {
              "value": null,
              "magicalBonus": null,
              "dex": null
            },
            "uses": {
              "spent": 0,
              "max": "1",
              "recovery": [
                {
                  "period": "lr",
                  "type": "recoverAll"
                }
              ]
            },
            "activities": {
              "resArcStreng0001": {
                "_id": "resArcStreng0001",
                "type": "utility",
                "name": "Use The Strength (Temp HP + 1d4 Psychic Melee)",
                "activation": {
                  "type": "bonus",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "value": "1",
                      "target": "",
                      "scaling": {}
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": false
                },
                "description": {
                  "chatFlavor": "As a bonus action, gain 1d8 + Proficiency Bonus + CON modifier Temporary Hit Points. While you have Temporary Hit Points, your melee weapon attacks deal an extra +1d4 Psychic damage."
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": null,
                  "units": "self",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft"
                  },
                  "affects": {
                    "count": "",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": false,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "prompt": false,
                  "visible": false,
                  "name": "",
                  "formula": ""
                },
                "sort": 0
              }
            },
            "source": {
              "custom": "Coria Homebrew",
              "rules": "2014"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0,
          "flags": {
            "dnd5e": {},
            "altarion-aitusa": {
              "isResonantArcanaCard": true,
              "resonantArcanaKey": "strength"
            }
          }
        }
      },
      {
        "origId": "d97M9so5NNexTpgR",
        "doc": {
          "name": "Poisoner's Kit",
          "type": "tool",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>A poisoner's kit includes the vials, chemicals, and other equipment necessary for the creation of poisons. Proficiency with this kit lets you add your proficiency bonus to any ability checks you make to craft or use poisons.</p><p>Additionally, the <a href=\"https://5e.tools/book.html#dmg,8,crafting%20and%20harvesting%20poison,0\">Crafting and Harvesting Poison</a> rules require the use of a poisoner's kit.</p></div><div class=\"ve-rd__b  ve-rd__b--2\"><p>A poisoner's kit is a favored resource for thieves, assassins, and others who engage in skulduggery. It allows you to apply poisons and create them from various materials. Your knowledge of poisons also helps you treat them.</p><div data-roll-name-ancestor=\"Components\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner \">Components.</span></span> A poisoner's kit includes glass vials, a mortar and pestle, chemicals, and a glass stirring rod.</p></div><div data-roll-name-ancestor=\"History\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"2\"> <span class=\"entry-title-inner \">History.</span></span> Your training with poisons can help you when you try to recall facts about infamous poisonings.</p></div><div data-roll-name-ancestor=\"Investigation, Perception\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"3\"> <span class=\"entry-title-inner \">Investigation, Perception.</span></span> Your knowledge of poisons has taught you to handle those substances carefully, giving you an edge when you inspect &amp;Reference[condition=poisoned] objects or try to extract clues from events that involve poison.</p></div><div data-roll-name-ancestor=\"Medicine\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"4\"> <span class=\"entry-title-inner \">Medicine.</span></span> When you treat the victim of a poison, your knowledge grants you added insight into how to provide the best care to your patient.</p></div><div data-roll-name-ancestor=\"Nature, Survival\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"5\"> <span class=\"entry-title-inner \">Nature, Survival.</span></span> Working with poisons enables you to acquire lore about which plants and animals are poisonous.</p></div><div data-roll-name-ancestor=\"Handle Poison\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"6\"> <span class=\"entry-title-inner \">Handle Poison.</span></span> Your proficiency allows you to handle and apply a poison without risk of exposing yourself to its effects.</p></div><table class=\"ve-w-100 ve-rd__table  stripe-odd-table\" data-roll-name-ancestor=\"Poisoner's Tools\"><caption>Poisoner's Tools</caption><thead><tr><th class=\"ve-rd__th ve-col-10 \" data-rd-isroller=\"false\">Activity</th><th class=\"ve-rd__th ve-col-2 ve-text-center \" data-rd-isroller=\"false\">DC</th></tr></thead><tbody><tr><td class=\"ve-rd__th ve-col-10 \">Spot a &amp;Reference[condition=poisoned] object</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">10</td></tr><tr><td class=\"ve-rd__th ve-col-10 \">Determine the effects of a poison</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">20</td></tr></tbody></table></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB'14",
              "page": "154",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 1,
            "weight": {
              "value": 2,
              "units": "lb"
            },
            "price": {
              "value": 50,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "ability": "wis",
            "chatFlavor": "",
            "proficient": null,
            "bonus": "",
            "type": {
              "value": "",
              "baseItem": "pois"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "uses": {
              "max": "",
              "recovery": [],
              "spent": 0
            },
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "check",
                "activation": {
                  "type": "",
                  "value": null,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "check": {
                  "ability": "wis",
                  "dc": {},
                  "associated": []
                },
                "uses": {
                  "spent": 0,
                  "recovery": []
                },
                "sort": 0,
                "img": null,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "attuned": false,
            "identifier": "poisoners-kit"
          },
          "img": "icons/tools/laboratory/bowl-liquid-black.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "poisoner's%20kit_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "EqaahJbll5rU2h9E",
        "doc": {
          "name": "Basic Poison (vial)",
          "type": "consumable",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>You can use the poison in this vial to coat one slashing or piercing weapon or up to three pieces of ammunition. Applying the poison takes an action. A creature hit by the poisoned weapon or ammunition must make a [[/save ability=con dc=10]] saving throw or take [[/damage 1d4 type=poison]] damage. Once applied, the poison retains potency for 1 minute before drying.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB'14",
              "page": "153",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 10,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 100,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "uses": {
              "max": "20",
              "recovery": [],
              "autoDestroy": true,
              "spent": 0
            },
            "damage": {
              "base": {
                "number": 1,
                "denomination": 4,
                "bonus": "",
                "types": [
                  "poison"
                ],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              },
              "replace": false
            },
            "type": {
              "value": "poison",
              "subtype": "injury"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "save",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "one slashing or piercing weapon, or up to three pieces of ammunition",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "target": "",
                      "value": "1",
                      "scaling": {
                        "mode": "",
                        "formula": ""
                      }
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "1",
                  "units": "minute",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "touch",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "damage": {
                  "onSave": "half",
                  "parts": [
                    {
                      "number": 1,
                      "denomination": 4,
                      "bonus": "",
                      "types": [
                        "poison"
                      ],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "whole",
                        "number": null,
                        "formula": ""
                      }
                    }
                  ]
                },
                "save": {
                  "ability": [
                    "con"
                  ],
                  "dc": {
                    "calculation": "",
                    "formula": "10"
                  }
                },
                "uses": {
                  "spent": 0,
                  "recovery": []
                },
                "sort": 0,
                "img": null,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "attuned": false,
            "identifier": "basic-poison"
          },
          "img": "icons/consumables/potions/potion-tube-corked-bubbling-green.webp",
          "flags": {
            "dnd5e": {
              "migratedUses": 20
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "ui7CejTTcwLt1yxs",
        "doc": {
          "name": "Erva de Veneno Básico",
          "type": "consumable",
          "img": "icons/consumables/plants/leaf-herb-poison-green.webp",
          "system": {
            "description": {
              "value": "<p>Uma erva venenosa básica que pode ser processada em um veneno básico por um Sicário.</p>",
              "chat": ""
            },
            "weight": {
              "value": 0.1,
              "units": "lb"
            },
            "price": {
              "value": 1,
              "denomination": "gp"
            },
            "quantity": 1,
            "activities": {},
            "uses": {
              "spent": 0,
              "recovery": [],
              "autoDestroy": false
            },
            "identifier": "erva-de-veneno-basico",
            "source": {
              "revision": 1,
              "rules": "2014"
            },
            "identified": true,
            "unidentified": {
              "description": ""
            },
            "container": null,
            "rarity": "",
            "attunement": "",
            "attuned": false,
            "equipped": false,
            "damage": {
              "base": {
                "types": [],
                "custom": {
                  "enabled": false
                },
                "scaling": {
                  "number": 1
                }
              },
              "replace": false
            },
            "properties": [],
            "type": {
              "value": "",
              "subtype": ""
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0,
          "flags": {}
        }
      },
      {
        "origId": "jyCcifnH5XdPXxpP",
        "doc": {
          "name": "Cloak of Protection",
          "type": "equipment",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>You gain a +1 bonus to AC and saving throws while you wear this cloak.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "DMG'14",
              "page": "159",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "attunement": "required",
            "equipped": true,
            "rarity": "uncommon",
            "identified": true,
            "cover": null,
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": null,
              "dex": null,
              "magicalBonus": "1"
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "speed": {
              "value": null,
              "conditions": "",
              "units": "ft"
            },
            "strength": null,
            "proficient": null,
            "type": {
              "value": "clothing",
              "baseItem": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [
              "mgc"
            ],
            "activities": {},
            "attuned": true,
            "identifier": "cloak-of-protection",
            "crew": {
              "value": []
            }
          },
          "img": "icons/equipment/back/cloak-collared-blue-gold.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "cloak%20of%20protection_dmg"
            }
          },
          "effects": [
            {
              "name": "Bonus AC",
              "img": "icons/equipment/back/cloak-collared-blue-gold.webp",
              "description": "",
              "changes": [
                {
                  "key": "system.attributes.ac.bonus",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "bonus-ac"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            },
            {
              "name": "Saving Throw Bonus",
              "img": "icons/equipment/back/cloak-collared-blue-gold.webp",
              "description": "",
              "changes": [
                {
                  "key": "system.bonuses.abilities.save",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "saving-throw-bonus"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            }
          ],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "0a3nmQ09Vm6m32XC",
        "doc": {
          "name": "+1 Shortsword",
          "type": "weapon",
          "system": {
            "source": {
              "custom": "",
              "book": "DMG'14",
              "page": "213",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>You have a +1 bonus to attack and damage rolls made with this magic weapon.</p></div>",
              "chat": ""
            },
            "proficient": null,
            "quantity": 1,
            "weight": {
              "value": 2,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "attuned": false,
            "identified": true,
            "equipped": true,
            "rarity": "uncommon",
            "type": {
              "value": "martialM",
              "baseItem": "shortsword"
            },
            "range": {
              "value": null,
              "long": null,
              "reach": 5,
              "units": "ft"
            },
            "properties": [
              "fin",
              "lgt",
              "mgc"
            ],
            "attunement": "",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "magicalBonus": "+1",
            "damage": {
              "base": {
                "types": [
                  "piercing"
                ],
                "number": 1,
                "denomination": 6,
                "bonus": "",
                "scaling": {
                  "mode": "",
                  "number": 1
                },
                "custom": {
                  "enabled": false
                }
              },
              "versatile": {
                "types": [],
                "custom": {
                  "enabled": false
                },
                "scaling": {
                  "number": 1
                }
              }
            },
            "ammunition": {
              "type": ""
            },
            "mastery": "",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "attack",
                "img": "",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "scaling": {
                    "allowed": false
                  },
                  "spellSlot": true,
                  "targets": []
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "template": {
                    "contiguous": false,
                    "units": "ft",
                    "stationary": false,
                    "type": ""
                  },
                  "affects": {
                    "choice": false,
                    "type": ""
                  },
                  "override": false,
                  "prompt": true
                },
                "uses": {
                  "spent": 0,
                  "recovery": [],
                  "max": ""
                },
                "attack": {
                  "critical": {
                    "threshold": null
                  },
                  "flat": false,
                  "type": {
                    "value": "melee",
                    "classification": "weapon"
                  },
                  "bonus": "",
                  "ability": "cha"
                },
                "damage": {
                  "critical": {
                    "bonus": ""
                  },
                  "includeBase": true,
                  "parts": []
                },
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {
                    "min": null,
                    "max": null
                  },
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false,
                  "identifier": ""
                },
                "name": ""
              }
            },
            "identifier": "1-shortsword",
            "unidentified": {
              "description": ""
            },
            "container": null,
            "crew": {
              "value": []
            },
            "armor": {}
          },
          "img": "icons/weapons/swords/shortsword-guard-gold.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "%2b1%20shortsword_dmg"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "CeHdEV6MEbUtHDDy",
        "doc": {
          "name": "Assassin's Blood",
          "type": "consumable",
          "system": {
            "source": {
              "custom": "",
              "book": "DMG'14",
              "page": "258",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>A creature subjected to this poison must make a [[/save ability=con dc=10]] saving throw. On a failed save, it takes 6 ([[/damage 1d12 type=poison]]) damage and is &amp;Reference[condition=poisoned] for 24 hours. On a successful save, the creature takes half damage and isn't &amp;Reference[condition=poisoned].</p></div>",
              "chat": ""
            },
            "quantity": 3,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 150,
              "denomination": "gp"
            },
            "attuned": false,
            "equipped": false,
            "identified": true,
            "rarity": "",
            "type": {
              "value": "poison",
              "subtype": "ingested"
            },
            "properties": [],
            "attunement": "",
            "uses": {
              "max": "1",
              "spent": 0,
              "recovery": [],
              "autoDestroy": true
            },
            "magicalBonus": "0",
            "damage": {
              "base": {
                "types": [],
                "custom": {
                  "enabled": false
                },
                "scaling": {
                  "number": 1
                }
              },
              "replace": false
            },
            "activities": {},
            "identifier": "assassins-blood",
            "unidentified": {
              "description": ""
            },
            "container": null
          },
          "img": "systems/dnd5e/icons/svg/items/consumable.svg",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "assassin's%20blood_dmg"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "wXjj5elkD2OBVOkZ",
        "doc": {
          "name": "Potion of Healing",
          "type": "consumable",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>You regain [[/r 2d4 + 2]] hit points when you drink this potion. The potion's red liquid glimmers when agitated.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "DMG'14",
              "page": "187",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 2,
            "weight": {
              "value": 0.5,
              "units": "lb"
            },
            "price": {
              "value": 50,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "common",
            "identified": true,
            "uses": {
              "max": "1",
              "recovery": [],
              "autoDestroy": true,
              "spent": 0
            },
            "damage": {
              "base": {
                "number": 2,
                "denomination": 4,
                "bonus": "2",
                "types": [
                  "healing"
                ],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              },
              "replace": false
            },
            "type": {
              "value": "potion",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [
              "mgc"
            ],
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "heal",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "value": "1",
                      "target": "",
                      "scaling": {}
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "touch",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "1",
                    "type": "creature",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "healing": {
                  "number": 2,
                  "denomination": 4,
                  "bonus": "2",
                  "types": [
                    "healing"
                  ],
                  "custom": {
                    "enabled": false,
                    "formula": ""
                  },
                  "scaling": {
                    "mode": "whole",
                    "number": null,
                    "formula": ""
                  }
                },
                "uses": {
                  "spent": 0,
                  "recovery": [],
                  "max": ""
                },
                "sort": 0,
                "name": "",
                "img": "",
                "visibility": {
                  "requireMagic": true,
                  "level": {
                    "min": null,
                    "max": null
                  },
                  "identifier": "",
                  "requireAttunement": false,
                  "requireIdentification": false
                },
                "flags": {}
              }
            },
            "attuned": false,
            "identifier": "potion-of-healing"
          },
          "img": "icons/consumables/potions/potion-tube-corked-red.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "potion%20of%20healing_dmg"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "YdWAbWe4r1lLUcbA",
        "doc": {
          "name": "Potion of Heroism",
          "type": "consumable",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>For 1 hour after drinking it, you gain 10 temporary hit points that last for 1 hour. For the same duration, you are under the effect of the @spell[bless] spell (no @status[concentration] required). This blue potion bubbles and steams as if boiling.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "DMG'14",
              "page": "188",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 2,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "rare",
            "identified": true,
            "uses": {
              "max": "1",
              "recovery": [],
              "autoDestroy": true,
              "spent": 0
            },
            "damage": {
              "base": {
                "number": null,
                "denomination": null,
                "bonus": "",
                "types": [
                  "temphp"
                ],
                "custom": {
                  "enabled": true,
                  "formula": "10"
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              },
              "replace": false
            },
            "type": {
              "value": "potion",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [
              "mgc"
            ],
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "heal",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "value": "1",
                      "target": "",
                      "scaling": {}
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "1",
                  "units": "hour",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "touch",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "1",
                    "type": "creature",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "healing": {
                  "number": null,
                  "denomination": null,
                  "bonus": "",
                  "types": [
                    "temphp"
                  ],
                  "custom": {
                    "enabled": true,
                    "formula": "10"
                  },
                  "scaling": {
                    "mode": "whole",
                    "number": null,
                    "formula": ""
                  }
                },
                "uses": {
                  "spent": 0,
                  "recovery": [],
                  "max": ""
                },
                "sort": 0,
                "name": "",
                "img": "",
                "visibility": {
                  "requireMagic": true,
                  "level": {
                    "min": null,
                    "max": null
                  },
                  "identifier": "",
                  "requireAttunement": false,
                  "requireIdentification": false
                },
                "flags": {}
              },
              "dnd5eactivity300": {
                "_id": "dnd5eactivity300",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "value": "1",
                      "target": "",
                      "scaling": {}
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "1",
                  "units": "hour",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "touch",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "1",
                    "type": "creature",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "roll": {
                  "formula": "1d4",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "uses": {
                  "spent": 0,
                  "recovery": [],
                  "max": ""
                },
                "sort": 0,
                "name": "",
                "img": "",
                "visibility": {
                  "requireMagic": true,
                  "level": {
                    "min": null,
                    "max": null
                  },
                  "identifier": "",
                  "requireAttunement": false,
                  "requireIdentification": false
                },
                "flags": {}
              }
            },
            "attuned": false,
            "identifier": "potion-of-heroism"
          },
          "img": "icons/consumables/potions/bottle-round-corked-pink.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "potion%20of%20heroism_dmg"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "KH0YNzy5k1Q3WuwU",
        "doc": {
          "name": "Potion of Speed",
          "type": "consumable",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>When you drink this potion, you gain the effect of the @spell[haste] spell for 1 minute (no @status[concentration] required). The potion's yellow fluid is streaked with black and swirls on its own.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "DMG'14",
              "page": "188",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 2,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "veryRare",
            "identified": true,
            "uses": {
              "max": "1",
              "recovery": [],
              "autoDestroy": true,
              "spent": 0
            },
            "damage": {
              "base": {
                "number": null,
                "denomination": null,
                "types": [],
                "custom": {
                  "enabled": false
                },
                "scaling": {
                  "number": 1
                }
              },
              "replace": false
            },
            "type": {
              "value": "potion",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [
              "mgc"
            ],
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "value": "1",
                      "target": "",
                      "scaling": {}
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "1",
                  "units": "minute",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "touch",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "1",
                    "type": "creature",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "uses": {
                  "spent": 0,
                  "recovery": [],
                  "max": ""
                },
                "sort": 0,
                "name": "",
                "img": "",
                "visibility": {
                  "requireMagic": true,
                  "level": {
                    "min": null,
                    "max": null
                  },
                  "identifier": "",
                  "requireAttunement": false,
                  "requireIdentification": false
                },
                "flags": {}
              }
            },
            "attuned": false,
            "identifier": "potion-of-speed"
          },
          "img": "icons/consumables/potions/potion-bottle-corked-fancy-orange.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "potion%20of%20speed_dmg"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "s6fh577sErYg5yu3",
        "doc": {
          "type": "consumable",
          "name": "Potion of Feather Fall",
          "img": "systems/dnd5e/icons/svg/items/consumable.svg",
          "system": {
            "activities": {},
            "uses": {
              "spent": 0,
              "recovery": [],
              "autoDestroy": false,
              "max": ""
            },
            "description": {
              "value": "",
              "chat": ""
            },
            "identifier": "new-consumable",
            "source": {
              "revision": 1,
              "rules": "2014"
            },
            "identified": true,
            "unidentified": {
              "description": ""
            },
            "container": null,
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "rarity": "",
            "attunement": "",
            "attuned": false,
            "equipped": false,
            "damage": {
              "base": {
                "types": [],
                "custom": {
                  "enabled": false
                },
                "scaling": {
                  "number": 1
                }
              },
              "replace": false
            },
            "properties": [],
            "type": {
              "value": "",
              "subtype": ""
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0,
          "flags": {}
        }
      },
      {
        "origId": "TBlQcKyyUbYQT5BA",
        "doc": {
          "type": "consumable",
          "name": "Potion Praga Arcana Ethan.Vane",
          "img": "systems/dnd5e/icons/svg/items/consumable.svg",
          "system": {
            "activities": {},
            "uses": {
              "spent": 0,
              "recovery": [],
              "autoDestroy": false,
              "max": ""
            },
            "description": {
              "value": "",
              "chat": ""
            },
            "identifier": "new-consumable",
            "source": {
              "revision": 1,
              "rules": "2014"
            },
            "identified": true,
            "unidentified": {
              "description": ""
            },
            "container": null,
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "rarity": "",
            "attunement": "",
            "attuned": false,
            "equipped": false,
            "damage": {
              "base": {
                "types": [],
                "custom": {
                  "enabled": false
                },
                "scaling": {
                  "number": 1
                }
              },
              "replace": false
            },
            "properties": [],
            "type": {
              "value": "",
              "subtype": ""
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0,
          "flags": {}
        }
      }
    ],
    "abilities": {
      "str": {
        "value": 8,
        "proficient": 0
      },
      "dex": {
        "value": 14,
        "proficient": 1
      },
      "con": {
        "value": 16,
        "proficient": 0
      },
      "int": {
        "value": 8,
        "proficient": 0
      },
      "wis": {
        "value": 12,
        "proficient": 1
      },
      "cha": {
        "value": 18,
        "proficient": 0
      }
    },
    "skills": {
      "acr": 1,
      "ins": 2,
      "itm": 1,
      "prc": 2,
      "slt": 1,
      "ste": 1
    },
    "spells": [
      {
        "origId": "HVhKRAUQycqQlE0x",
        "doc": {
          "name": "Mage Hand",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "256",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action. The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again.</p><p>You can use your action to control the hand. You can use the hand to manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour the contents out of a vial. You can move the hand up to 30 feet each time you use it.</p><p>The hand can't attack, activate magic items, or carry more than 10 pounds.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "con",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "space",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "30",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "ability": "cha",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "mage-hand",
            "sourceItem": "race:tiefling-shadow-touched"
          },
          "img": "icons/magic/light/orbs-hand-gray.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "mage%20hand_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {
              "sourceId": "Actor.HVf1fVyJi40Jstlf.Item.HVhKRAUQycqQlE0x",
              "advancementOrigin": "hc3drMe3fqXsFy5s.Z2V4FHRaP24wHS6W"
            },
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "MAAmS8qvSD9YWD1A",
        "doc": {
          "name": "Shield",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "275",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from @spell[magic missile].</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "abj",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "reaction",
              "condition": "which you take when you are hit by an attack or targeted by the magic missile spell",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "round"
            },
            "ability": "",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "pact",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [
                  {
                    "_id": "6pbotGIvqQkraPva",
                    "level": {}
                  }
                ],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "shield"
          },
          "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "shield_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": [
            {
              "_id": "6pbotGIvqQkraPva",
              "flags": {
                "plutonium": {
                  "dedupeId": "shield"
                }
              },
              "changes": [
                {
                  "key": "system.attributes.ac.bonus",
                  "mode": 2,
                  "value": "5",
                  "priority": null
                }
              ],
              "disabled": false,
              "duration": {
                "startTime": null,
                "rounds": 1,
                "seconds": null,
                "combat": null,
                "turns": null,
                "startRound": null,
                "startTurn": null
              },
              "origin": "Item.FlLKKv7bQBlIAs11",
              "tint": "#ffffff",
              "transfer": false,
              "name": "Shield",
              "description": "<p>Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.</p>",
              "statuses": [],
              "_stats": {
                "compendiumSource": null,
                "duplicateSource": null,
                "coreVersion": "13.351",
                "systemId": "dnd5e",
                "systemVersion": "3.3.1",
                "createdTime": null,
                "modifiedTime": null,
                "lastModifiedBy": null,
                "exportSource": null
              },
              "img": "icons/magic/defensive/shield-barrier-deflect-teal.webp",
              "type": "base",
              "system": {},
              "sort": 0
            }
          ]
        }
      },
      {
        "origId": "KPuXmONRo2Nj7GkG",
        "doc": {
          "name": "Wrathful Smite",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "289",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>The next time you hit with a melee weapon attack during this spell's duration, your attack deals an extra [[/damage 1d6 type=necrotic]] damage. Additionally, if the target is a creature, it must make a Wisdom saving throw or be &amp;Reference[condition=frightened] of you until the spell ends. As an action, the creature can make a Wisdom check against your spell save DC to steel its resolve and end this spell.</p></div>",
              "chat": ""
            },
            "level": 1,
            "school": "evo",
            "properties": [
              "vocal",
              "concentration"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "bonus",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "ability": "",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "pact",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "save",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "half",
                  "parts": [
                    {
                      "number": 1,
                      "denomination": 6,
                      "bonus": "",
                      "types": [
                        "necrotic"
                      ],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "",
                        "number": null,
                        "formula": ""
                      }
                    }
                  ]
                },
                "save": {
                  "ability": [
                    "wis"
                  ],
                  "dc": {
                    "calculation": "spellcasting",
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "wrathful-smite"
          },
          "img": "icons/weapons/polearms/spear-flared-silver-pink.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "wrathful%20smite_phb",
              "propDroppable": "spell"
            },
            "midiProperties": {
              "confirmTargets": "default",
              "saveDamage": "default",
              "bonusSaveDamage": "default",
              "autoFailFriendly": false,
              "autoSaveFriendly": false,
              "critOther": false,
              "offHandWeapon": false,
              "magicdam": false,
              "magiceffect": false,
              "noConcentrationCheck": false,
              "toggleEffect": false,
              "ignoreTotalCover": false,
              "idr": false,
              "idi": false,
              "idv": false,
              "ida": false
            },
            "midi-qol": {
              "rollAttackPerTarget": "default",
              "removeAttackDamageButtons": "default",
              "itemCondition": "",
              "effectCondition": ""
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      }
    ]
  },
  "parva": {
    "sourceName": "Parva",
    "currency": {
      "pp": 0,
      "gp": 1,
      "ep": 0,
      "sp": 2,
      "cp": 0
    },
    "tools": {
      "cartographer": {
        "value": 1,
        "ability": "int",
        "roll": {
          "min": null,
          "max": null,
          "mode": 0
        },
        "bonuses": {
          "check": ""
        }
      }
    },
    "languages": {
      "value": [
        "aquan",
        "celestial",
        "common",
        "deep",
        "halfling"
      ],
      "custom": "",
      "communication": {}
    },
    "professionsFlags": {
      "profissoesAtivas": [
        "Cartógrafo"
      ],
      "projetos": [
        {
          "profissao": "Cartógrafo",
          "nome": "Caverna",
          "subTipo": "Desenho de Mapa",
          "complexidade": "Simples",
          "acertosAtuais": 1.25,
          "atributoPadrao": "dex",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": "",
          "fase": "definitivo",
          "totalNecessario": 1.25,
          "bioma": "Pradaria",
          "dificuldadeEspecifica": "Difícil",
          "isConcluido": true,
          "dataConclusao": 1792379496673,
          "itemColetado": true,
          "xpColetado": true
        },
        {
          "profissao": "Cartógrafo",
          "nome": "Mapa Syramar",
          "subTipo": "Cópia de Mapa",
          "complexidade": "Moderadamente Complexo",
          "acertosAtuais": 4,
          "atributoPadrao": "dex",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": "",
          "dificuldadeEspecifica": "Médio",
          "isConcluido": true,
          "dataConclusao": 1792379951902,
          "itemColetado": true,
          "xpColetado": true
        },
        {
          "profissao": "Cartógrafo",
          "nome": "Mapa Vordoral",
          "subTipo": "Cópia de Mapa",
          "complexidade": "Moderadamente Complexo",
          "acertosAtuais": 2.25,
          "atributoPadrao": "dex",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": "",
          "dificuldadeEspecifica": "Médio"
        },
        {
          "profissao": "Cartógrafo",
          "nome": "Mapa Mundi",
          "subTipo": "Cópia de Mapa",
          "complexidade": "Moderadamente Complexo",
          "acertosAtuais": 0,
          "atributoPadrao": "int",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": "",
          "dificuldadeEspecifica": "Médio"
        }
      ],
      "treinosAtivos": [
        "Profissão",
        "Atributo",
        "Talento"
      ],
      "treinosColapsos": {
        "Profissão": true,
        "Atributo": true,
        "Talento": true
      },
      "colapsos": {
        "Cartógrafo": true
      },
      "listaTreinamentos": [
        {
          "categoria": "Atributo",
          "nome": "Treinamento de Carisma",
          "attrKey": "cha",
          "acertosAtuais": 8,
          "totalNecessario": 60,
          "dificuldadeEspecifica": "Médio",
          "infoExtra": "(Valor atual: 18 - Médio)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        },
        {
          "categoria": "Talento",
          "nome": "Treinamento de Talento: Metamagic Adept",
          "atributoPadrao": "cha",
          "acertosAtuais": 6,
          "totalNecessario": 100,
          "dificuldadeEspecifica": "Difícil",
          "infoExtra": "(Talento - Difícil - Atributo: Inteligência)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        },
        {
          "categoria": "Profissão",
          "profissaoAlvo": "Cartógrafo",
          "nome": "Treinamento de Cartógrafo",
          "timestamp": 1792379375100,
          "acertosAtuais": 5.25,
          "totalNecessario": 10,
          "dificuldadeEspecifica": "Variável",
          "infoExtra": "(Profissão Conhecida - Possui Proficiência na Ferramenta - Ganhe XP completando projetos de Cartógrafo)",
          "usoVantagem": false,
          "usoDesvantagem": false,
          "bonusSituacional": ""
        }
      ],
      "ferramentasEquipadas": {
        "Cartógrafo": "JhoqArWUpNFJbSEw"
      }
    },
    "items": [
      {
        "origId": "6c9g00eymv5OLrmJ",
        "doc": {
          "name": "Leather Armor",
          "type": "equipment",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>The breastplate and shoulder protectors of this armor are made of leather that has been stiffened by being boiled in oil. The rest of the armor is made of softer and more flexible materials.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "144",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 10,
              "units": "lb"
            },
            "price": {
              "value": 10,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "cover": null,
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": 11,
              "dex": null
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "speed": {
              "value": null,
              "conditions": "",
              "units": "ft"
            },
            "strength": null,
            "proficient": null,
            "type": {
              "value": "light",
              "baseItem": "leather"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "activities": {},
            "identifier": "leather-armor",
            "crew": {
              "value": []
            }
          },
          "img": "icons/equipment/chest/breastplate-scale-leather.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "leather%20armor_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "1VG2LVm1AG7EGCEL",
        "doc": {
          "name": "Sailor",
          "type": "background",
          "system": {
            "description": {
              "value": "<div><div class=\"rd__b  rd__b--1\"><div class=\"rd__b  rd__b--2\"><div class=\"rd__b  rd__b--3\"><p>You sailed on a seagoing vessel for years. In that time, you faced down mighty storms, monsters of the deep, and those who wanted to sink your craft to the bottomless depths. Your first love is the distant line of the horizon, but the time has come to try your hand at something new.</p><p>Discuss the nature of the ship you previously sailed with your Dungeon Master. Was it a merchant ship, a naval vessel, a ship of discovery, or a pirate ship? How famous (or infamous) is it? Is it widely traveled? Is it still sailing, or is it missing and presumed lost with all hands?</p><p>What were your duties on board–boatswain, captain, navigator, cook, or some other position? Who were the captain and first mate? Did you leave your ship on good terms with your fellows, or on the run?</p></div></div></div><hr /><div class=\"rd__b  rd__b--1\"><ul class=\"rd__list rd__list-hang-notitle\"><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Skill Proficiencies:\"><span class=\"bold rd__list-item-name\">Skill Proficiencies:</span> &amp;Reference[skill=Athletics], &amp;Reference[skill=Perception]</p></li><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Tool Proficiencies:\"><span class=\"bold rd__list-item-name\">Tool Proficiencies:</span> @item[Navigator's tools|phb], <a href=\"https://5e.tools/items.html#blankhash,flstsource:phb=1~dmg=1,flstmiscellaneous:mundane=1,flsttype:vehicle%20(water)=1\">vehicles (water)</a></p></li><li class=\"rd__li \"><p class=\"rd__p-list-item\" data-roll-name-ancestor=\"Equipment:\"><span class=\"bold rd__list-item-name\">Equipment:</span> A belaying pin (@item[club|phb]), @item[silk rope (50 feet)|phb], a lucky charm such as a rabbit foot or a small stone with a hole in the center (or you may roll for a random @item[trinket|phb] on the Trinkets table in chapter 5), a set of @item[common clothes|phb], and a belt @item[pouch|phb] containing 10 gp</p></li></ul><div data-roll-name-ancestor=\"Feature: Ship's Passage\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"1\"> <span class=\"entry-title-inner\">Feature: Ship's Passage</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>When you need to, you can secure free passage on a sailing ship for yourself and your adventuring companions. You might sail on the ship you served on, or another ship you have good relations with (perhaps one captained by a former crewmate). Because you're calling in a favor, you can't be certain of a schedule or route that will meet your every need. Your Dungeon Master will determine how long it takes to get where you need to go. In return for your free passage, you and your companions are expected to assist the crew during the voyage.</p></div><div data-roll-name-ancestor=\"Suggested Characteristics\" class=\"rd__b  rd__b--2\"><h3 class=\"rd__h rd__h--2\" data-title-index=\"2\"> <span class=\"entry-title-inner\">Suggested Characteristics</span><span class=\"ve-flex-vh-center\"><span class=\"rd__h-toggle ml-2 clickable no-select no-print lst-is-exporting-image__hidden\" data-rd-h-toggle-button=\"true\" title=\"Toggle Visibility (CTRL to Toggle All)\">[–]</span></span></h3> <p>Sailors can be a rough lot, but the responsibilities of life on a ship make them generally reliable as well. Life aboard a ship shapes their outlook and forms their most important attachments.</p><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-1 ve-text-center\" data-rd-isroller=\"true\">[[/r d8]]</th><th class=\"ve-col-11\" data-rd-isroller=\"false\">Personality Trait</th></tr></thead><tbody><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-11\">My friends know they can rely on me, no matter what.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-11\">I work hard so that I can play hard when the work is done.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-11\">I enjoy sailing into new ports and making new friends over a flagon of ale.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-11\">I stretch the truth for the sake of a good story.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-11\">To me, a tavern brawl is a nice way to get to know a new city.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-11\">I never pass up a friendly wager.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"7\" data-roll-max=\"7\">7</td><td class=\"ve-col-11\">My language is as foul as an otyugh nest.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"8\" data-roll-max=\"8\">8</td><td class=\"ve-col-11\">I like a job well done, especially if I can convince someone else to do it.</td></tr></tbody></table><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-1 ve-text-center\" data-rd-isroller=\"true\">[[/r d6]]</th><th class=\"ve-col-11\" data-rd-isroller=\"false\">Ideal</th></tr></thead><tbody><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-11\">Respect. The thing that keeps a ship together is mutual respect between captain and crew. (Good)</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-11\">Fairness. We all do the work, so we all share in the rewards. (Lawful)</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-11\">Freedom. The sea is freedom—the freedom to go anywhere and do anything. (Chaotic)</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-11\">Mastery. I'm a predator, and the other ships on the sea are my prey. (Evil)</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-11\">People. I'm committed to my crewmates, not to ideals. (Neutral)</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-11\">Aspiration. Someday, I'll own my own ship and chart my own destiny. (Any)</td></tr></tbody></table><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-1 ve-text-center\" data-rd-isroller=\"true\">[[/r d6]]</th><th class=\"ve-col-11\" data-rd-isroller=\"false\">Bond</th></tr></thead><tbody><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-11\">I'm loyal to my captain first, everything else second.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-11\">The ship is most important—crewmates and captains come and go.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-11\">I'll always remember my first ship.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-11\">In a harbor town, I have a paramour whose eyes nearly stole me from the sea.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-11\">I was cheated out of my fair share of the profits, and I want to get my due.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-11\">Ruthless pirates murdered my captain and crewmates, plundered our ship, and left me to die. Vengeance will be mine.</td></tr></tbody></table><table class=\"w-100 rd__table  stripe-odd-table\"><thead><tr><th class=\"ve-col-1 ve-text-center\" data-rd-isroller=\"true\">[[/r d6]]</th><th class=\"ve-col-11\" data-rd-isroller=\"false\">Flaw</th></tr></thead><tbody><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">1</td><td class=\"ve-col-11\">I follow orders, even if I think they're wrong.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">2</td><td class=\"ve-col-11\">I'll say anything to avoid having to do extra work.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">3</td><td class=\"ve-col-11\">Once someone questions my courage, I never back down no matter how dangerous the situation.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">4</td><td class=\"ve-col-11\">Once I start drinking, it's hard for me to stop.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">5</td><td class=\"ve-col-11\">I can't help but pocket loose coins and other trinkets I come across.</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">6</td><td class=\"ve-col-11\">My pride will probably lead to my destruction.</td></tr></tbody></table></div></div></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "139",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "advancement": {},
            "startingEquipment": [],
            "identifier": "sailor"
          },
          "flags": {
            "plutonium": {
              "page": "backgrounds.html",
              "source": "PHB",
              "hash": "sailor_phb",
              "propDroppable": "background",
              "isDirectImport": true
            }
          },
          "effects": [],
          "img": "modules/plutonium/media/icon/farmer.svg",
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "SChKthvI1Ci3FGMj",
        "doc": {
          "name": "Belaying Pin",
          "type": "weapon",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "149",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 2,
              "units": "lb"
            },
            "price": {
              "value": 1,
              "denomination": "sp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "cover": null,
            "range": {
              "value": null,
              "long": 0,
              "units": "ft"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "damage": {
              "versatile": {
                "number": null,
                "denomination": null,
                "bonus": "",
                "types": [],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              },
              "base": {
                "number": 1,
                "denomination": 4,
                "bonus": "",
                "types": [
                  "bludgeoning"
                ],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              }
            },
            "armor": {
              "value": null
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "properties": [
              "lgt"
            ],
            "proficient": null,
            "type": {
              "value": "simpleM",
              "baseItem": "club"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "attack",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "ft",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "0",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "attack": {
                  "ability": "",
                  "bonus": "",
                  "critical": {
                    "threshold": null
                  },
                  "flat": false,
                  "type": {
                    "value": "melee",
                    "classification": "weapon"
                  }
                },
                "damage": {
                  "critical": {
                    "bonus": ""
                  },
                  "includeBase": true,
                  "parts": []
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "belaying-pin",
            "crew": {
              "value": []
            },
            "ammunition": {}
          },
          "img": "icons/weapons/clubs/club-simple-black.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "club_phb"
            },
            "dnd5e": {}
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "Uy12fVDaeCChQW8Y",
        "doc": {
          "name": "Common Clothes",
          "type": "equipment",
          "system": {
            "description": {
              "value": "",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "150",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 3,
              "units": "lb"
            },
            "price": {
              "value": 5,
              "denomination": "sp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "cover": null,
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": null,
              "dex": null
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "speed": {
              "value": null,
              "conditions": "",
              "units": "ft"
            },
            "strength": null,
            "proficient": null,
            "type": {
              "value": "clothing",
              "baseItem": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "",
                  "value": null,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "0",
                  "units": "ft",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "0",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "common-clothes",
            "crew": {
              "value": []
            }
          },
          "img": "icons/equipment/leg/pants-brown-leather-pants.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "common%20clothes_phb"
            },
            "dnd5e": {}
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "01DGyYN6eFWQveES",
        "doc": {
          "name": "Pouch",
          "type": "container",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>A cloth or leather pouch can hold up to 20 @item[sling bullet|phb|sling bullets] or 50 @item[blowgun needle|phb|blowgun needles], among other things. A compartmentalized pouch for holding spell components is called a @item[component pouch|phb]. A pouch can hold up to ⅕ cubic foot or 6 pounds of gear.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "153",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 1,
              "units": "lb"
            },
            "price": {
              "value": 5,
              "denomination": "sp"
            },
            "attunement": "",
            "equipped": true,
            "rarity": "",
            "identified": true,
            "capacity": {
              "weight": {
                "value": 6,
                "units": "lb"
              },
              "volume": {
                "units": "cubicFoot"
              }
            },
            "currency": {
              "cp": 0,
              "sp": 0,
              "ep": 0,
              "gp": 0,
              "pp": 0
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "identifier": "pouch"
          },
          "img": "icons/containers/bags/pouch-simple-leather-tan.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "pouch_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "58arBPxnlJicOHyx",
        "doc": {
          "name": "Silk Rope (50 feet)",
          "type": "consumable",
          "system": {
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>Rope, whether made of hemp or silk, has 2 hit points and can be burst with a DC 17 Strength check.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "153",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "quantity": 1,
            "weight": {
              "value": 5,
              "units": "lb"
            },
            "price": {
              "value": 10,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "uses": {
              "max": "1",
              "autoDestroy": false,
              "spent": 0,
              "recovery": []
            },
            "damage": {
              "base": {
                "types": [],
                "custom": {
                  "enabled": false
                },
                "scaling": {
                  "number": 1
                }
              },
              "replace": false
            },
            "type": {
              "value": "trinket",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "attuned": false,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "check",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "target": "",
                      "value": "1",
                      "scaling": {
                        "mode": "",
                        "formula": ""
                      }
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "0",
                  "units": "ft",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "0",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "check": {
                  "ability": "",
                  "associated": [],
                  "dc": {}
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              },
              "dnd5eactivity100": {
                "_id": "dnd5eactivity100",
                "type": "save",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "target": "",
                      "value": "1",
                      "scaling": {
                        "mode": "",
                        "formula": ""
                      }
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": "0",
                  "units": "ft",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "0",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "half",
                  "parts": []
                },
                "save": {
                  "ability": [
                    "str"
                  ],
                  "dc": {
                    "calculation": "",
                    "formula": "17"
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "silk-rope-50-feet"
          },
          "img": "icons/sundries/survival/rope-wrapped-purple.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "silk%20rope%20(50%20feet)_phb"
            },
            "dnd5e": {}
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "eOQmPji9LgwMYrSQ",
        "doc": {
          "name": "Lucky Charm",
          "type": "loot",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "159",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--2\"><p>When you make your character, you can roll once on the Trinkets table to gain a trinket, a simple item lightly touched by mystery. The DM might also use this table. It can help stock a room in a dungeon or fill a creatures pockets.</p><table class=\"w-100 rd__table  stripe-odd-table\" data-roll-name-ancestor=\"Player's Handbook Trinket Table\"><caption>Player's Handbook Trinket Table</caption><thead><tr><th class=\"ve-col-1 ve-text-center\" data-rd-isroller=\"true\">[[/r d100]]</th><th class=\"ve-col-11\" data-rd-isroller=\"false\">Trinket</th></tr></thead><tbody><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"1\" data-roll-max=\"1\">01</td><td class=\"ve-col-11\">A mummified goblin hand</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"2\" data-roll-max=\"2\">02</td><td class=\"ve-col-11\">A piece of crystal that faintly glows in the moonlight</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"3\" data-roll-max=\"3\">03</td><td class=\"ve-col-11\">A gold coin minted in an unknown land</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"4\" data-roll-max=\"4\">04</td><td class=\"ve-col-11\">A diary written in a language you don't know</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"5\" data-roll-max=\"5\">05</td><td class=\"ve-col-11\">A brass ring that never tarnishes</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"6\" data-roll-max=\"6\">06</td><td class=\"ve-col-11\">An old chess piece made from glass</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"7\" data-roll-max=\"7\">07</td><td class=\"ve-col-11\">A pair of knucklebone dice, each with a skull symbol on the side that would normally show six pips</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"8\" data-roll-max=\"8\">08</td><td class=\"ve-col-11\">A small idol depicting a nightmarish creature that gives you unsettling dreams when you sleep near it</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"9\" data-roll-max=\"9\">09</td><td class=\"ve-col-11\">A rope necklace from which dangles four mummified elf fingers</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"10\" data-roll-max=\"10\">10</td><td class=\"ve-col-11\">The deed for a parcel of land in a realm unknown to you</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"11\" data-roll-max=\"11\">11</td><td class=\"ve-col-11\">A 1-ounce block made from an unknown material</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"12\" data-roll-max=\"12\">12</td><td class=\"ve-col-11\">A small cloth doll skewered with needles</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"13\" data-roll-max=\"13\">13</td><td class=\"ve-col-11\">A tooth from an unknown beast</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"14\" data-roll-max=\"14\">14</td><td class=\"ve-col-11\">An enormous scale, perhaps from a dragon</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"15\" data-roll-max=\"15\">15</td><td class=\"ve-col-11\">A bright green feather</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"16\" data-roll-max=\"16\">16</td><td class=\"ve-col-11\">An old divination card bearing your likeness</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"17\" data-roll-max=\"17\">17</td><td class=\"ve-col-11\">A glass orb filled with moving smoke</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"18\" data-roll-max=\"18\">18</td><td class=\"ve-col-11\">A 1-pound egg with a bright red shell</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"19\" data-roll-max=\"19\">19</td><td class=\"ve-col-11\">A pipe that blows bubbles</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"20\" data-roll-max=\"20\">20</td><td class=\"ve-col-11\">A glass jar containing a weird bit of flesh floating in pickling fluid</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"21\" data-roll-max=\"21\">21</td><td class=\"ve-col-11\">A tiny gnome-crafted music box that plays a song you dimly remember from your childhood</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"22\" data-roll-max=\"22\">22</td><td class=\"ve-col-11\">A small wooden statuette of a smug halfling</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"23\" data-roll-max=\"23\">23</td><td class=\"ve-col-11\">A brass orb etched with strange runes</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"24\" data-roll-max=\"24\">24</td><td class=\"ve-col-11\">A multicolored stone disk</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"25\" data-roll-max=\"25\">25</td><td class=\"ve-col-11\">A tiny silver icon of a raven</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"26\" data-roll-max=\"26\">26</td><td class=\"ve-col-11\">A bag containing forty-seven humanoid teeth, one of which is rotten</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"27\" data-roll-max=\"27\">27</td><td class=\"ve-col-11\">A shard of obsidian that always feels warm to the touch</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"28\" data-roll-max=\"28\">28</td><td class=\"ve-col-11\">A dragon's bony talon hanging from a plain leather necklace</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"29\" data-roll-max=\"29\">29</td><td class=\"ve-col-11\">A pair of old socks</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"30\" data-roll-max=\"30\">30</td><td class=\"ve-col-11\">A blank book whose pages refuse to hold ink, chalk, graphite, or any other substance or marking</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"31\" data-roll-max=\"31\">31</td><td class=\"ve-col-11\">A silver badge in the shape of a five-pointed star</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"32\" data-roll-max=\"32\">32</td><td class=\"ve-col-11\">A knife that belonged to a relative</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"33\" data-roll-max=\"33\">33</td><td class=\"ve-col-11\">A glass vial filled with nail clippings</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"34\" data-roll-max=\"34\">34</td><td class=\"ve-col-11\">A rectangular metal device with two tiny metal cups on one end that throws sparks when wet</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"35\" data-roll-max=\"35\">35</td><td class=\"ve-col-11\">A white, sequined glove sized for a human</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"36\" data-roll-max=\"36\">36</td><td class=\"ve-col-11\">A vest with one hundred tiny pockets</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"37\" data-roll-max=\"37\">37</td><td class=\"ve-col-11\">A small, weightless stone block</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"38\" data-roll-max=\"38\">38</td><td class=\"ve-col-11\">A tiny sketch portrait of a goblin</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"39\" data-roll-max=\"39\">39</td><td class=\"ve-col-11\">An empty glass vial that smells of perfume when opened</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"40\" data-roll-max=\"40\">40</td><td class=\"ve-col-11\">A gemstone that looks like a lump of coal when examined by anyone but you</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"41\" data-roll-max=\"41\">41</td><td class=\"ve-col-11\">A scrap of cloth from an old banner</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"42\" data-roll-max=\"42\">42</td><td class=\"ve-col-11\">A rank insignia from a lost legionnaire</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"43\" data-roll-max=\"43\">43</td><td class=\"ve-col-11\">A tiny silver bell without a clapper</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"44\" data-roll-max=\"44\">44</td><td class=\"ve-col-11\">A mechanical canary inside a gnomish lamp</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"45\" data-roll-max=\"45\">45</td><td class=\"ve-col-11\">A tiny chest carved to look like it has numerous feet on the bottom</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"46\" data-roll-max=\"46\">46</td><td class=\"ve-col-11\">A dead @creature[sprite] inside a clear glass bottle</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"47\" data-roll-max=\"47\">47</td><td class=\"ve-col-11\">A metal can that has no opening but sounds as if it is filled with liquid, sand, spiders, or broken glass (your choice)</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"48\" data-roll-max=\"48\">48</td><td class=\"ve-col-11\">A glass orb filled with water, in which swims a clockwork goldfish</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"49\" data-roll-max=\"49\">49</td><td class=\"ve-col-11\">A silver spoon with an 'M' engraved on the handle</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"50\" data-roll-max=\"50\">50</td><td class=\"ve-col-11\">A whistle made from gold-colored wood</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"51\" data-roll-max=\"51\">51</td><td class=\"ve-col-11\">A dead scarab beetle the size of your hand</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"52\" data-roll-max=\"52\">52</td><td class=\"ve-col-11\">Two toy soldiers, one with a missing head </td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"53\" data-roll-max=\"53\">53</td><td class=\"ve-col-11\">A small box filled with different-sized buttons</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"54\" data-roll-max=\"54\">54</td><td class=\"ve-col-11\">A candle that can't be lit</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"55\" data-roll-max=\"55\">55</td><td class=\"ve-col-11\">A tiny cage with no door</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"56\" data-roll-max=\"56\">56</td><td class=\"ve-col-11\">An old key</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"57\" data-roll-max=\"57\">57</td><td class=\"ve-col-11\">An indecipherable treasure map</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"58\" data-roll-max=\"58\">58</td><td class=\"ve-col-11\">A hilt from a broken sword</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"59\" data-roll-max=\"59\">59</td><td class=\"ve-col-11\">A rabbit's foot</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"60\" data-roll-max=\"60\">60</td><td class=\"ve-col-11\">A glass eye</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"61\" data-roll-max=\"61\">61</td><td class=\"ve-col-11\">A cameo carved in the likeness of a hideous person</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"62\" data-roll-max=\"62\">62</td><td class=\"ve-col-11\">A silver skull the size of a coin</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"63\" data-roll-max=\"63\">63</td><td class=\"ve-col-11\">An alabaster mask</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"64\" data-roll-max=\"64\">64</td><td class=\"ve-col-11\">A pyramid of sticky black incense that smells very bad</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"65\" data-roll-max=\"65\">65</td><td class=\"ve-col-11\">A nightcap that, when worn, gives you pleasant dreams</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"66\" data-roll-max=\"66\">66</td><td class=\"ve-col-11\">A single caltrop made from bone</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"67\" data-roll-max=\"67\">67</td><td class=\"ve-col-11\">A gold monocle frame without the lens</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"68\" data-roll-max=\"68\">68</td><td class=\"ve-col-11\">A 1-inch cube, each side painted a different color</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"69\" data-roll-max=\"69\">69</td><td class=\"ve-col-11\">A crystal knob from a door</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"70\" data-roll-max=\"70\">70</td><td class=\"ve-col-11\">A small packet filled with pink dust</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"71\" data-roll-max=\"71\">71</td><td class=\"ve-col-11\">A fragment of a beautiful song, written as musical notes on two pieces of parchment</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"72\" data-roll-max=\"72\">72</td><td class=\"ve-col-11\">A silver teardrop earring made from a real teardrop</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"73\" data-roll-max=\"73\">73</td><td class=\"ve-col-11\">The shell of an egg painted with scenes of human misery in disturbing detail</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"74\" data-roll-max=\"74\">74</td><td class=\"ve-col-11\">A fan that, when unfolded, shows a sleeping cat</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"75\" data-roll-max=\"75\">75</td><td class=\"ve-col-11\">A set of bone pipes</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"76\" data-roll-max=\"76\">76</td><td class=\"ve-col-11\">A four-leaf clover pressed inside a book discussing manners and etiquette</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"77\" data-roll-max=\"77\">77</td><td class=\"ve-col-11\">A sheet of parchment upon which is drawn a complex mechanical contraption</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"78\" data-roll-max=\"78\">78</td><td class=\"ve-col-11\">An ornate scabbard that fits no blade you have found so far</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"79\" data-roll-max=\"79\">79</td><td class=\"ve-col-11\">An invitation to a party where a murder happened</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"80\" data-roll-max=\"80\">80</td><td class=\"ve-col-11\">A bronze pentacle with an etching of a rat's head in its center</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"81\" data-roll-max=\"81\">81</td><td class=\"ve-col-11\">A purple handkerchief embroidered with the name of a powerful @creature[archmage]</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"82\" data-roll-max=\"82\">82</td><td class=\"ve-col-11\">Half of a floorplan for a temple, castle, or some other structure</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"83\" data-roll-max=\"83\">83</td><td class=\"ve-col-11\">A bit of folded cloth that, when unfolded, turns into a stylish cap</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"84\" data-roll-max=\"84\">84</td><td class=\"ve-col-11\">A receipt of deposit at a bank in a far-flung city</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"85\" data-roll-max=\"85\">85</td><td class=\"ve-col-11\">A diary with seven missing pages</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"86\" data-roll-max=\"86\">86</td><td class=\"ve-col-11\">An empty silver snuffbox bearing an inscription on the surface that says \"dreams\"</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"87\" data-roll-max=\"87\">87</td><td class=\"ve-col-11\">An iron holy symbol devoted to an unknown god</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"88\" data-roll-max=\"88\">88</td><td class=\"ve-col-11\">A book that tells the story of a legendary hero's rise and fall, with the last chapter missing</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"89\" data-roll-max=\"89\">89</td><td class=\"ve-col-11\">A vial of dragon blood</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"90\" data-roll-max=\"90\">90</td><td class=\"ve-col-11\">An ancient arrow of elven design</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"91\" data-roll-max=\"91\">91</td><td class=\"ve-col-11\">A needle that never bends</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"92\" data-roll-max=\"92\">92</td><td class=\"ve-col-11\">An ornate brooch of dwarven design</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"93\" data-roll-max=\"93\">93</td><td class=\"ve-col-11\">An empty wine bottle bearing a pretty label that says, \"The Wizard of Wines Winery, Red Dragon Crush, 331422-W\"</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"94\" data-roll-max=\"94\">94</td><td class=\"ve-col-11\">A mosaic tile with a multicolored, glazed surface</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"95\" data-roll-max=\"95\">95</td><td class=\"ve-col-11\">A &amp;Reference[condition=petrified] mouse</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"96\" data-roll-max=\"96\">96</td><td class=\"ve-col-11\">A black pirate flag adorned with a dragon's skull and crossbones</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"97\" data-roll-max=\"97\">97</td><td class=\"ve-col-11\">A tiny mechanical crab or spider that moves about when it's not being observed</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"98\" data-roll-max=\"98\">98</td><td class=\"ve-col-11\">A glass jar containing lard with a label that reads, \"Griffon Grease\"</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"99\" data-roll-max=\"99\">99</td><td class=\"ve-col-11\">A wooden box with a ceramic bottom that holds a living worm with a head on each end of its body</td></tr><tr><td class=\"ve-col-1 ve-text-center\" data-roll-min=\"100\" data-roll-max=\"100\">100</td><td class=\"ve-col-11\">A metal urn containing the ashes of a hero</td></tr></tbody></table></div>",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "identified": true,
            "rarity": "",
            "type": {
              "value": "gear",
              "subtype": ""
            },
            "properties": [],
            "unidentified": {
              "description": ""
            },
            "container": null,
            "identifier": "lucky-charm"
          },
          "img": "icons/commodities/treasure/brooch-crown-gold.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "trinket_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "Kawi1zi0TVxOKzTB",
        "doc": {
          "name": "Card of the Resonant Arcana (The Moon)",
          "type": "equipment",
          "img": "icons/sundries/gaming/rune-card.webp",
          "system": {
            "description": {
              "value": "<p>This rectangular slab of polished black quartz appears to hold a fragment of the night sky within it. While you are attuned to the card, stardust drifts inside the stone to form the illustration of a Major Arcana that resonates with your soul.</p><p data-path-to-node=\"4\">The card has 1 charge. You can expend this charge to use the property of the arcana engraved upon it. The card regains its expended charge daily at dawn.</p><p></p><p><strong>The Moon.</strong> As an action, you can expend the card's charge and target one creature you can see within 30 feet of you. The target must succeed on a Wisdom saving throw against your spell save DC. On a failed save, the creature takes 3d6 psychic damage and is frightened of you until the end of your next turn. On a successful save, the target takes half as much damage and isn't frightened.</p>",
              "chat": ""
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "rarity": "veryRare",
            "identified": true,
            "attunement": "required",
            "attuned": false,
            "equipped": false,
            "properties": [
              "mgc"
            ],
            "type": {
              "value": "trinket",
              "baseItem": ""
            },
            "armor": {
              "value": null,
              "magicalBonus": null,
              "dex": null
            },
            "uses": {
              "spent": 0,
              "max": "1",
              "recovery": [
                {
                  "period": "lr",
                  "type": "recoverAll"
                }
              ]
            },
            "activities": {
              "resArcTheMoon001": {
                "_id": "resArcTheMoon001",
                "type": "utility",
                "name": "Use The Moon (WIS Save — 3d6 Psychic + Frightened)",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "value": "1",
                      "target": "",
                      "scaling": {}
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": false
                },
                "description": {
                  "chatFlavor": "As an action, target a creature within 30 ft (Wisdom Save vs your Spell Save DC): on a failure it takes 3d6 Psychic damage and is Frightened until the end of your next turn; on a success it takes half damage and isn't Frightened."
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "value": null,
                  "units": "self",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft"
                  },
                  "affects": {
                    "count": "",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": false,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "prompt": false,
                  "visible": false,
                  "name": "",
                  "formula": ""
                },
                "sort": 0
              }
            },
            "source": {
              "custom": "Coria Homebrew",
              "rules": "2014"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0,
          "flags": {
            "dnd5e": {},
            "altarion-aitusa": {
              "isResonantArcanaCard": true,
              "resonantArcanaKey": "moon"
            }
          }
        }
      },
      {
        "origId": "WDZwIqf3Wg0RZG2h",
        "doc": {
          "name": "Shadow Touched",
          "type": "feat",
          "system": {
            "source": {
              "custom": "",
              "book": "TCE",
              "page": "80",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div><hr /><div>\n\t\t\t\t\n\t\t\t\t\n\t\t\t\t<div class=\"rd__b  rd__b--3\"><p>Your exposure to the Shadowfell's magic has changed you, granting you the following benefits:</p><ul class=\"rd__list\"><li class=\"rd__li \">Increase your Intelligence, Wisdom, or Charisma by 1, to a maximum of 20.</li><li class=\"rd__li \">You learn the @spell[invisibility] spell and one <a href=\"https://5e.tools/spells.html#blankhash,flstlevel:1=1,flstschool:i=1~n=1\">1st-level spell</a> of your choice. The <a href=\"https://5e.tools/spells.html#blankhash,flstlevel:1=1,flstschool:i=1~n=1\">1st-level spell</a> must be from the illusion or necromancy school of magic. You can cast each of these spells without expending a spell slot. Once you cast either of these spells in this way, you can't cast that spell in this way again until you finish a long rest. You can also cast these spells using spell slots you have of the appropriate level. The spells' spellcasting ability is the ability increased by this feat.</li></ul></div>\n\t\t\t</div></div>",
              "chat": ""
            },
            "requirements": "",
            "uses": {
              "max": "1",
              "recovery": [
                {
                  "period": "lr",
                  "type": "recoverAll"
                }
              ],
              "spent": 0
            },
            "type": {
              "value": "feat",
              "subtype": ""
            },
            "properties": [],
            "cover": null,
            "crewed": false,
            "prerequisites": {
              "level": null,
              "items": [],
              "repeatable": false
            },
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "special",
                  "value": null,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "target": "",
                      "value": "1",
                      "scaling": {
                        "mode": "",
                        "formula": ""
                      }
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "advancement": {},
            "identifier": "shadow-touched",
            "enchant": {}
          },
          "img": "icons/magic/death/hand-withered-gray.webp",
          "flags": {
            "plutonium": {
              "page": "feats.html",
              "source": "TCE",
              "hash": "shadow%20touched_tce"
            },
            "dnd5e": {}
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "JhoqArWUpNFJbSEw",
        "doc": {
          "name": "Cartographer's Tools",
          "type": "tool",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"></div><div class=\"ve-rd__b  ve-rd__b--2\"><p>Using cartographer's tools, you can create accurate maps to make travel easier for yourself and those who come after you. These maps can range from large-scale depictions of mountain ranges to diagrams that show the layout of a dungeon level.</p><div data-roll-name-ancestor=\"Components\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner \">Components.</span></span> Cartographer's tools consist of a quill, ink, parchment, a pair of compasses, calipers, and a ruler.</p></div><div data-roll-name-ancestor=\"Arcana, History, Religion\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"2\"> <span class=\"entry-title-inner \">Arcana, History, Religion.</span></span> You can use your knowledge of maps and locations to unearth more detailed information when you use these skills. For instance, you might spot hidden messages in a map, identify when the map was made to determine if geographical features have changed since then, and so forth.</p></div><div data-roll-name-ancestor=\"Nature\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"3\"> <span class=\"entry-title-inner \">Nature.</span></span> Your familiarity with physical geography makes it easier for you to answer questions or solve issues relating to the terrain around you.</p></div><div data-roll-name-ancestor=\"Survival\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"4\"> <span class=\"entry-title-inner \">Survival.</span></span> Your understanding of geography makes it easier to find paths to civilization, to predict areas where villages or towns might be found, and to avoid becoming lost. You have studied so many maps that common patterns, such as how trade routes evolve and where settlements arise in relation to geographic locations, are familiar to you.</p></div><div data-roll-name-ancestor=\"Craft a Map\" class=\"ve-rd__b  ve-rd__b--3\"><p><span class=\"ve-rd__h ve-rd__h--3\" data-title-index=\"5\"> <span class=\"entry-title-inner \">Craft a Map.</span></span> While traveling, you can draw a map as you go in addition to engaging in other activity.</p></div><table class=\"ve-w-100 ve-rd__table  stripe-odd-table\" data-roll-name-ancestor=\"Cartographer's Tools\"><caption>Cartographer's Tools</caption><thead><tr><th class=\"ve-rd__th ve-col-10 \" data-rd-isroller=\"false\">Activity</th><th class=\"ve-rd__th ve-col-2 ve-text-center \" data-rd-isroller=\"false\">DC</th></tr></thead><tbody><tr><td class=\"ve-rd__th ve-col-10 \">Determine a map's age and origin</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">10</td></tr><tr><td class=\"ve-rd__th ve-col-10 \">Estimate direction and distance to a landmark</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">15</td></tr><tr><td class=\"ve-rd__th ve-col-10 \">Discern that a map is fake</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">15</td></tr><tr><td class=\"ve-rd__th ve-col-10 \">Fill in a missing part of a map</td><td class=\"ve-rd__th ve-col-2 ve-text-center \">20</td></tr></tbody></table></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "PHB'14",
              "page": "154",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 1,
            "weight": {
              "value": 6,
              "units": "lb"
            },
            "price": {
              "value": 15,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "",
            "identified": true,
            "ability": "int",
            "chatFlavor": "",
            "proficient": null,
            "bonus": "",
            "type": {
              "value": "art",
              "baseItem": "cartographer"
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [],
            "uses": {
              "max": "",
              "recovery": [],
              "spent": 0
            },
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "check",
                "activation": {
                  "type": "",
                  "value": null,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "",
                    "type": "",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "check": {
                  "ability": "int",
                  "dc": {},
                  "associated": []
                },
                "uses": {
                  "spent": 0,
                  "recovery": []
                },
                "sort": 0,
                "img": null,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "attuned": false,
            "identifier": "cartographers-tools"
          },
          "img": "icons/tools/navigation/map-marked-red.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "PHB",
              "hash": "cartographer's%20tools_phb"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "HfSJ8HtKvnbDLlPF",
        "doc": {
          "name": "Specific Map - Caverna",
          "type": "loot",
          "img": "icons/sundry/books/map-rolled-leather-tan.webp",
          "system": {
            "description": {
              "value": "<p>Um mapa específico e focado, como o plano de uma masmorra, castelo ou ruína.</p>",
              "chat": ""
            },
            "weight": {
              "value": 0.1,
              "units": "lb"
            },
            "price": {
              "value": 30,
              "denomination": "gp"
            },
            "quantity": 1,
            "identifier": "specific-map-caverna",
            "source": {
              "revision": 1,
              "rules": "2014"
            },
            "identified": true,
            "unidentified": {
              "description": ""
            },
            "container": null,
            "rarity": "",
            "properties": [],
            "type": {
              "value": "",
              "subtype": ""
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0,
          "flags": {}
        }
      },
      {
        "origId": "bgobxHu49QRyjnEE",
        "doc": {
          "name": "Mapa Syramar - Cópia de Mapa",
          "type": "loot",
          "img": "icons/sundry/books/scroll-bound-white.webp",
          "system": {
            "description": {
              "value": "<p>Uma cópia precisa e detalhada de um mapa existente.</p>",
              "chat": ""
            },
            "weight": {
              "value": 0.1,
              "units": "lb"
            },
            "price": {
              "value": 10,
              "denomination": "gp"
            },
            "quantity": 1,
            "identifier": "mapa-syramar-copia-de-mapa",
            "source": {
              "revision": 1,
              "rules": "2014"
            },
            "identified": true,
            "unidentified": {
              "description": ""
            },
            "container": null,
            "rarity": "",
            "properties": [],
            "type": {
              "value": "",
              "subtype": ""
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0,
          "flags": {}
        }
      },
      {
        "origId": "16ARpuY3A2qE7ZFN",
        "doc": {
          "name": "Potion of Healing",
          "type": "consumable",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>You regain [[/r 2d4 + 2]] hit points when you drink this potion. The potion's red liquid glimmers when agitated.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "DMG'14",
              "page": "187",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 5,
            "weight": {
              "value": 0.5,
              "units": "lb"
            },
            "price": {
              "value": 50,
              "denomination": "gp"
            },
            "attunement": "",
            "equipped": false,
            "rarity": "common",
            "identified": true,
            "uses": {
              "max": "1",
              "recovery": [],
              "autoDestroy": true,
              "spent": 0
            },
            "damage": {
              "base": {
                "number": 2,
                "denomination": 4,
                "bonus": "2",
                "types": [
                  "healing"
                ],
                "custom": {
                  "enabled": false,
                  "formula": ""
                },
                "scaling": {
                  "mode": "",
                  "number": null,
                  "formula": ""
                }
              },
              "replace": false
            },
            "type": {
              "value": "potion",
              "subtype": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [
              "mgc"
            ],
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "heal",
                "activation": {
                  "type": "action",
                  "value": 1,
                  "condition": "",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "value": "1",
                      "target": "",
                      "scaling": {}
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "concentration": false,
                  "value": "",
                  "units": "inst",
                  "special": "",
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "touch",
                  "special": "",
                  "override": false
                },
                "target": {
                  "template": {
                    "count": "",
                    "contiguous": false,
                    "type": "",
                    "size": "",
                    "width": "",
                    "height": "",
                    "units": "ft",
                    "stationary": false
                  },
                  "affects": {
                    "count": "1",
                    "type": "creature",
                    "choice": false,
                    "special": ""
                  },
                  "prompt": true,
                  "override": false
                },
                "healing": {
                  "number": 2,
                  "denomination": 4,
                  "bonus": "2",
                  "types": [
                    "healing"
                  ],
                  "custom": {
                    "enabled": false,
                    "formula": ""
                  },
                  "scaling": {
                    "mode": "whole",
                    "number": null,
                    "formula": ""
                  }
                },
                "uses": {
                  "spent": 0,
                  "recovery": [],
                  "max": ""
                },
                "sort": 0,
                "name": "",
                "img": "",
                "visibility": {
                  "requireMagic": true,
                  "level": {
                    "min": null,
                    "max": null
                  },
                  "identifier": "",
                  "requireAttunement": false,
                  "requireIdentification": false
                },
                "flags": {}
              }
            },
            "attuned": false,
            "identifier": "potion-of-healing"
          },
          "img": "icons/consumables/potions/potion-tube-corked-red.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "potion%20of%20healing_dmg"
            }
          },
          "effects": [],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "lvbfX4jQmJZ4nC7U",
        "doc": {
          "name": "+1 Rod of the Pact Keeper",
          "type": "equipment",
          "system": {
            "source": {
              "custom": "",
              "book": "DMG'14",
              "page": "197",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "description": {
              "value": "<div><i>(requires attunement by a warlock)</i></div>\n\t\t<div class=\"ve-rd__b  ve-rd__b--2\"><p>While holding this rod, you gain a +1 bonus to spell attack rolls and to the saving throw DCs of your warlock spells.</p><p>In addition, you can regain one warlock spell slot as an action while holding the rod. You can't use this property again until you finish a long rest.</p></div>",
              "chat": ""
            },
            "proficient": null,
            "quantity": 1,
            "weight": {
              "value": 2,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "attuned": true,
            "identified": true,
            "equipped": true,
            "rarity": "uncommon",
            "type": {
              "value": "rod",
              "baseItem": ""
            },
            "properties": [
              "mgc"
            ],
            "attunement": "required",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": null,
              "dex": null,
              "magicalBonus": ""
            },
            "strength": null,
            "activities": {},
            "identifier": "1-rod-of-the-pact-keeper",
            "unidentified": {
              "description": ""
            },
            "container": null,
            "crew": {
              "value": []
            }
          },
          "img": "icons/commodities/tech/pipe-metal.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "%2b1%20rod%20of%20the%20pact%20keeper_dmg"
            }
          },
          "effects": [
            {
              "name": "Spell Attack Bonus (Melee)",
              "img": "icons/commodities/tech/pipe-metal.webp",
              "description": "",
              "changes": [
                {
                  "key": "system.bonuses.msak.attack",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "spell-attack-bonus-melee"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            },
            {
              "name": "Spell Attack Bonus (Ranged)",
              "img": "icons/commodities/tech/pipe-metal.webp",
              "description": "",
              "changes": [
                {
                  "key": "system.bonuses.rsak.attack",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "spell-attack-bonus-ranged"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            },
            {
              "name": "Spell Save DC Bonus",
              "img": "icons/commodities/tech/pipe-metal.webp",
              "description": "",
              "changes": [
                {
                  "key": "system.bonuses.spell.dc",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "spell-save-dc-bonus"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            }
          ],
          "folder": null,
          "sort": 0
        }
      },
      {
        "origId": "Sug8TgjkAxoR7PAr",
        "doc": {
          "name": "Cloak of Protection",
          "type": "equipment",
          "system": {
            "description": {
              "value": "<div class=\"ve-rd__b  ve-rd__b--2\"><p>You gain a +1 bonus to AC and saving throws while you wear this cloak.</p></div>",
              "chat": ""
            },
            "source": {
              "custom": "",
              "book": "DMG'14",
              "page": "159",
              "license": "",
              "rules": "2014",
              "revision": 1
            },
            "quantity": 1,
            "weight": {
              "value": 0,
              "units": "lb"
            },
            "price": {
              "value": 0,
              "denomination": "gp"
            },
            "attunement": "required",
            "equipped": true,
            "rarity": "uncommon",
            "identified": true,
            "cover": null,
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "armor": {
              "value": null,
              "dex": null,
              "magicalBonus": "1"
            },
            "hp": {
              "value": 0,
              "max": 0,
              "dt": null,
              "conditions": ""
            },
            "speed": {
              "value": null,
              "conditions": "",
              "units": "ft"
            },
            "strength": null,
            "proficient": null,
            "type": {
              "value": "clothing",
              "baseItem": ""
            },
            "unidentified": {
              "description": ""
            },
            "container": null,
            "properties": [
              "mgc"
            ],
            "activities": {},
            "attuned": true,
            "identifier": "cloak-of-protection",
            "crew": {
              "value": []
            }
          },
          "img": "icons/equipment/back/cloak-collared-blue-gold.webp",
          "flags": {
            "plutonium": {
              "page": "items.html",
              "source": "DMG",
              "hash": "cloak%20of%20protection_dmg"
            }
          },
          "effects": [
            {
              "name": "Bonus AC",
              "img": "icons/equipment/back/cloak-collared-blue-gold.webp",
              "description": "",
              "changes": [
                {
                  "key": "system.attributes.ac.bonus",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "bonus-ac"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            },
            {
              "name": "Saving Throw Bonus",
              "img": "icons/equipment/back/cloak-collared-blue-gold.webp",
              "description": "",
              "changes": [
                {
                  "key": "system.bonuses.abilities.save",
                  "mode": 2,
                  "value": "+1",
                  "priority": 7
                }
              ],
              "statuses": [],
              "disabled": false,
              "duration": {
                "startTime": 60,
                "seconds": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null,
                "combat": null
              },
              "origin": null,
              "transfer": true,
              "flags": {
                "plutonium": {
                  "dedupeId": "saving-throw-bonus"
                }
              },
              "type": "base",
              "system": {},
              "tint": "#ffffff",
              "sort": 0
            }
          ],
          "folder": null,
          "sort": 0
        }
      }
    ],
    "abilities": {
      "str": {
        "value": 8,
        "proficient": 0
      },
      "dex": {
        "value": 16,
        "proficient": 0
      },
      "con": {
        "value": 14,
        "proficient": 0
      },
      "int": {
        "value": 10,
        "proficient": 0
      },
      "wis": {
        "value": 10,
        "proficient": 1
      },
      "cha": {
        "value": 18,
        "proficient": 1
      }
    },
    "skills": {
      "dec": 1,
      "his": 1,
      "inv": 1,
      "per": 1,
      "rel": 1
    },
    "spells": [
      {
        "origId": "4PmkRsbfnSdFEL3O",
        "doc": {
          "name": "Eldritch Blast",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "237",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes [[/damage 1d10 type=force]] damage.</p><p>The spell creates more than one beam when you reach higher levels: two beams at 5th level, three beams at 11th level, and four beams at 17th level. You can direct the beams at the same target or at different ones. Make a separate attack roll for each beam.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "evo",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "120",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "ability": "cha",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "sourceItem": "class:warlock",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "attack",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "attack": {
                  "ability": "cha",
                  "bonus": "",
                  "critical": {
                    "threshold": null
                  },
                  "flat": false,
                  "type": {
                    "value": "ranged",
                    "classification": "spell"
                  }
                },
                "damage": {
                  "critical": {
                    "bonus": ""
                  },
                  "includeBase": true,
                  "parts": [
                    {
                      "number": 1,
                      "denomination": 10,
                      "bonus": "",
                      "types": [
                        "force"
                      ],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "",
                        "number": null,
                        "formula": ""
                      }
                    }
                  ]
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "eldritch-blast"
          },
          "img": "icons/magic/light/beam-explosion-pink-purple.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "eldritch%20blast_phb",
              "propDroppable": "spell",
              "parentClassName": "Warlock",
              "parentClassSource": "PHB",
              "parentSubclassName": "The Fathomless",
              "parentSubclassSource": "TCE"
            },
            "tidy5e-sheet": {
              "parentClass": "warlock"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "3ETFu5NyLBfrrTI8",
        "doc": {
          "name": "Friends",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "244",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>For the duration, you have advantage on all Charisma checks directed at one creature of your choice that isn't hostile toward you. When the spell ends, the creature realizes that you used magic to influence its mood and becomes hostile toward you. A creature prone to violence might attack you. Another creature might seek retribution in other ways (at the DM's discretion), depending on the nature of your interaction with it.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "enc",
            "properties": [
              "somatic",
              "material",
              "concentration"
            ],
            "materials": {
              "value": "a small amount of makeup applied to the face as this spell is cast",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "self",
                "count": "0",
                "choice": false
              },
              "template": {
                "units": "self",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "ability": "cha",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "sourceItem": "class:warlock",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "friends"
          },
          "img": "icons/consumables/drinks/alcohol-beer-mug-yellow.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "friends_phb",
              "propDroppable": "spell",
              "parentClassName": "Warlock",
              "parentClassSource": "PHB",
              "parentSubclassName": "The Fathomless",
              "parentSubclassSource": "TCE"
            },
            "tidy5e-sheet": {
              "parentClass": "warlock"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "8NjVXBGuxjd5gREY",
        "doc": {
          "name": "Shape Water",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "XGE",
              "page": "164",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You choose an area of water that you can see within range and that fits within a 5-foot cube. You manipulate it in one of the following ways:</p><ul class=\"rd__list\"><li class=\"rd__li \">You instantaneously move or otherwise change the flow of the water as you direct, up to 5 feet in any direction. This movement doesn't have enough force to cause damage.</li><li class=\"rd__li \">You cause the water to form into simple shapes and animate at your direction. This change lasts for 1 hour.</li><li class=\"rd__li \">You change the water's color or opacity. The water must be changed in the same way throughout. This change lasts for 1 hour.</li><li class=\"rd__li \">You freeze the water, provided that there are no creatures in it. The water unfreezes in 1 hour.</li></ul><p>If you cast this spell multiple times, you can have no more than two of its non-instantaneous effects active at a time, and you can dismiss such an effect as an action.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "trs",
            "properties": [
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "type": "cube",
                "size": "5",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "30",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "ability": "cha",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "shape-water"
          },
          "img": "icons/creatures/fish/fish-marlin-swordfight-blue.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "XGE",
              "hash": "shape%20water_xge",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "WTIxMx7A09wbMCcw",
        "doc": {
          "name": "Mage Hand",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "256",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action. The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again.</p><p>You can use your action to control the hand. You can use the hand to manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour the contents out of a vial. You can move the hand up to 30 feet each time you use it.</p><p>The hand can't attack, activate magic items, or carry more than 10 pounds.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "con",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "space",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "30",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "ability": "cha",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "mage-hand"
          },
          "img": "icons/magic/light/orbs-hand-gray.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "mage%20hand_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "HqAqKsKullSkWSs4",
        "doc": {
          "name": "Guidance",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "248",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You touch one willing creature. Once before the spell ends, the target can roll a [[/r d4]] and add the number rolled to one ability check of its choice. It can roll the die before or after making the ability check. The spell then ends.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "div",
            "properties": [
              "vocal",
              "somatic",
              "concentration"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "ability": "cha",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "guidance"
          },
          "img": "icons/skills/ranged/arrow-flying-ornate-gold.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "guidance_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "9NIRqJAr02mwTDmf",
        "doc": {
          "name": "Mending",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "259",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>This spell repairs a single break or tear in an object you touch, such as broken chain link, two halves of a broken key, a torn cloak, or a leaking wineskin. As long as the break or tear is no larger than 1 foot in any dimension, you mend it, leaving no trace of the former damage.</p><p>This spell can physically repair a magic item or construct, but the spell can't restore magic to such an object.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "trs",
            "properties": [
              "vocal",
              "somatic",
              "material"
            ],
            "materials": {
              "value": "two lodestones",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "object",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "minute",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "ability": "cha",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "sourceItem": "class:sorcerer",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "mending"
          },
          "img": "icons/skills/trades/textiles-stitching-leather-brown.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "mending_phb",
              "propDroppable": "spell",
              "parentClassName": "Sorcerer",
              "parentClassSource": "PHB",
              "parentSubclassName": "Divine Soul",
              "parentSubclassSource": "XGE"
            },
            "tidy5e-sheet": {
              "parentClass": "sorcerer"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "EcAhT3TzIEDmpqjm",
        "doc": {
          "name": "Message",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "259",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You point your finger toward a creature within range and whisper a message. The target (and only the target) hears the message and can reply in a whisper that only you can hear.</p><p>You can cast this spell through solid objects if you are familiar with the target and know it is beyond the barrier. Magical silence, 1 foot of stone, 1 inch of common metal, a thin sheet of lead, or 3 feet of wood blocks the spell. The spell doesn't have to follow a straight line and can travel freely around corners or through openings.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "trs",
            "properties": [
              "vocal",
              "somatic",
              "material"
            ],
            "materials": {
              "value": "a short piece of copper wire",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "120",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "round"
            },
            "ability": "cha",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "sourceItem": "class:sorcerer",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "message"
          },
          "img": "icons/skills/social/diplomacy-writing-letter.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "message_phb",
              "propDroppable": "spell",
              "parentClassName": "Sorcerer",
              "parentClassSource": "PHB",
              "parentSubclassName": "Divine Soul",
              "parentSubclassSource": "XGE"
            },
            "tidy5e-sheet": {
              "parentClass": "sorcerer"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "nwWgw57LZ1MXG9Cm",
        "doc": {
          "name": "Minor Illusion",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "260",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You create a sound or an image of an object within range that lasts for the duration. The illusion also ends if you dismiss it as an action or cast this spell again.</p><p>If you create a sound, its volume can range from a whisper to a scream. It can be your voice, someone else's voice, a lion's roar, a beating of drums, or any other sound you choose. The sound continues unabated throughout the duration, or you can make discrete sounds at different times before the spell ends.</p><p>If you create an image of an object—such as a chair, muddy footprints, or a small chest—it must be no larger than a 5-foot cube. The image can't create sound, light, smell, or any other sensory effect. Physical interaction with the image reveals it to be an illusion, because things can pass through it.</p><p>If a creature uses its action to examine the sound or image, the creature can determine that it is an illusion with a successful Intelligence (&amp;Reference[skill=Investigation]) check against your spell save DC. If a creature discerns the illusion for what it is, the illusion becomes faint to the creature.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "ill",
            "properties": [
              "somatic",
              "material"
            ],
            "materials": {
              "value": "a bit of fleece",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "type": "cube",
                "size": "5",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "30",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "minute"
            },
            "ability": "cha",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "sourceItem": "class:sorcerer",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "minor-illusion"
          },
          "img": "icons/magic/perception/eye-winged-pink.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "minor%20illusion_phb",
              "propDroppable": "spell",
              "parentClassName": "Sorcerer",
              "parentClassSource": "PHB",
              "parentSubclassName": "Divine Soul",
              "parentSubclassSource": "XGE"
            },
            "tidy5e-sheet": {
              "parentClass": "sorcerer"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "oYstnUNvnXcYLPom",
        "doc": {
          "name": "Prestidigitation",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "267",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>This spell is a minor magical trick that novice spellcasters use for practice. You create one of the following magical effects within range:</p><ul class=\"rd__list\"><li class=\"rd__li \">You create an instantaneous, harmless sensory effect, such as a shower of sparks, a puff of wind, faint musical notes, or an odd odor.</li><li class=\"rd__li \">You instantaneously light or snuff out a candle, a torch, or a small campfire.</li><li class=\"rd__li \">You instantaneously clean or soil an object no larger than 1 cubic foot.</li><li class=\"rd__li \">You chill, warm, or flavor up to 1 cubic foot of nonliving material for 1 hour.</li><li class=\"rd__li \">You make a color, a small mark, or a symbol appear on an object or a surface for 1 hour.</li><li class=\"rd__li \">You create a nonmagical trinket or an illusory image that can fit in your hand and that lasts until the end of your next turn.</li></ul><p>If you cast this spell multiple times, you can have up to three of its non-instantaneous effects active at a time, and you can dismiss such an effect as an action.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "trs",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "10",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "ability": "cha",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "sourceItem": "class:sorcerer",
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "prestidigitation"
          },
          "img": "icons/magic/light/hand-sparks-smoke-green.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "prestidigitation_phb",
              "propDroppable": "spell",
              "parentClassName": "Sorcerer",
              "parentClassSource": "PHB",
              "parentSubclassName": "Divine Soul",
              "parentSubclassSource": "XGE"
            },
            "tidy5e-sheet": {
              "parentClass": "sorcerer"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "6JXa0wYrLJC6Foc1",
        "doc": {
          "name": "Cure Wounds",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "230",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>A creature you touch regains a number of hit points equal to [[/r 1d8]] + your spellcasting ability modifier. This spell has no effect on undead or constructs.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, the healing increases by [[/r 1d8]] for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "evo",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "heal",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "healing": {
                  "number": 1,
                  "denomination": 8,
                  "bonus": "@mod",
                  "types": [
                    "healing"
                  ],
                  "custom": {
                    "enabled": false,
                    "formula": ""
                  },
                  "scaling": {
                    "mode": "whole",
                    "number": 1,
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "cure-wounds"
          },
          "img": "icons/magic/life/cross-flared-green.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "cure%20wounds_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "RDcb8V3dtHUfpXV0",
        "doc": {
          "name": "Light",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "255",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet. The light can be colored as you like. Completely covering the object with something opaque blocks the light. The spell ends if you cast it again or dismiss it as an action.</p><p>If you target an object held or worn by a hostile creature, that creature must succeed on a Dexterity saving throw to avoid the spell.</p></div>",
              "chat": ""
            },
            "level": 0,
            "school": "evo",
            "properties": [
              "vocal",
              "material"
            ],
            "materials": {
              "value": "a firefly or phosphorescent moss",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "object",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "ability": "cha",
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 2,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "save",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "onSave": "none",
                  "parts": []
                },
                "save": {
                  "ability": [
                    "dex"
                  ],
                  "dc": {
                    "calculation": "cha",
                    "formula": ""
                  }
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "light",
            "sourceItem": "race:aasimar-necrotic-shroud"
          },
          "img": "icons/magic/light/orb-lightbulb-gray.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "light_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {
              "sourceId": "Actor.saSGJEUnw3E8rnG8.Item.RDcb8V3dtHUfpXV0",
              "advancementOrigin": "S8IYmv25wljCv0uO.qkKNrplljPYwoIVu"
            },
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "OWYYcTxqDACFqbRY",
        "doc": {
          "name": "Create or Destroy Water",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "229",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You either create or destroy water.</p><div data-roll-name-ancestor=\"Create Water\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">Create Water.</span></span> <p>You create up to 10 gallons of clean water within range in an open container. Alternatively, the water falls as rain in a 30-foot cube within range, extinguishing exposed flames in the area.</p></div><div data-roll-name-ancestor=\"Destroy Water\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"2\"> <span class=\"entry-title-inner\">Destroy Water.</span></span> <p>You destroy up to 10 gallons of water in an open container within range. Alternatively, you destroy fog in a 30-foot cube within range.</p></div></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, you create or destroy 10 additional gallons of water, or the size of the cube increases by 5 feet, for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "trs",
            "properties": [
              "vocal",
              "somatic",
              "material"
            ],
            "materials": {
              "value": "a drop of water if creating water or a few grains of sand if destroying it",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "type": "cube",
                "size": "30",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "30",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "create-or-destroy-water"
          },
          "img": "icons/consumables/potions/potion-flash-open-blue.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "create%20or%20destroy%20water_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "TBuVzMjmTPFHoO80",
        "doc": {
          "name": "Fog Cloud",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "243",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You create a 20-foot-radius sphere of fog centered on a point within range. The sphere spreads around corners, and its area is &amp;Reference[rule=heavilyobscured]{heavily obscured}. It lasts for the duration or until a wind of moderate or greater speed (at least 10 miles per hour) disperses it.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, the radius of the fog increases by 20 feet for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "con",
            "properties": [
              "vocal",
              "somatic",
              "concentration"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "choice": false
              },
              "template": {
                "units": "ft",
                "type": "sphere",
                "size": "20",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "120",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "fog-cloud"
          },
          "img": "icons/commodities/tech/smoke-spout-blue.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "fog%20cloud_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "AEr2xW0KUpFuUtMH",
        "doc": {
          "name": "Hex",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "251",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You place a curse on a creature that you can see within range. Until the spell ends, you deal an extra [[/damage 1d6 type=necrotic]] damage to the target whenever you hit it with an attack. Also, choose one ability when you cast the spell. The target has disadvantage on ability checks made with the chosen ability.</p><p>If the target drops to 0 hit points before this spell ends, you can use a bonus action on a subsequent turn of yours to curse a new creature.</p><p>A @spell[remove curse] cast on the target ends this spell early.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 3rd or 4th level, you can maintain your @status[concentration] on the spell for up to 8 hours. When you use a spell slot of 5th level or higher, you can maintain your @status[concentration] on the spell for up to 24 hours.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "enc",
            "properties": [
              "vocal",
              "somatic",
              "material",
              "concentration"
            ],
            "materials": {
              "value": "the petrified eye of a newt",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "90",
              "units": "ft"
            },
            "activation": {
              "type": "bonus",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "damage",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "critical": {
                    "allow": false,
                    "bonus": ""
                  },
                  "parts": [
                    {
                      "number": 1,
                      "denomination": 6,
                      "bonus": "",
                      "types": [
                        "necrotic"
                      ],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "",
                        "number": null,
                        "formula": ""
                      }
                    }
                  ]
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "hex"
          },
          "img": "icons/magic/control/voodoo-doll-pain-damage-red.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "hex_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "2g3M9s7Zhk1rGQbc",
        "doc": {
          "name": "Magic Missile",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "257",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals [[/damage 1d4 + 1 type=force]] damage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or several.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, the spell creates one more dart for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "evo",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "120",
              "units": "ft"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "damage",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "damage": {
                  "critical": {
                    "allow": false,
                    "bonus": ""
                  },
                  "parts": [
                    {
                      "number": null,
                      "denomination": null,
                      "bonus": "",
                      "types": [
                        "force"
                      ],
                      "custom": {
                        "enabled": true,
                        "formula": "(1d4 + 1) * (2 + @item.level)"
                      },
                      "scaling": {
                        "mode": "",
                        "number": null,
                        "formula": ""
                      }
                    }
                  ]
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "magic-missile"
          },
          "img": "icons/magic/light/projectile-stars-blue.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "magic%20missile_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "6Vm9nHLvZQnkJmEP",
        "doc": {
          "name": "Misty Step",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "260",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see.</p></div>",
              "chat": ""
            },
            "level": 2,
            "school": "con",
            "properties": [
              "vocal"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "space",
                "count": "30",
                "choice": false
              },
              "template": {
                "units": "ft",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "self"
            },
            "activation": {
              "type": "bonus",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "",
              "spent": 0,
              "recovery": []
            },
            "method": "spell",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "misty-step"
          },
          "img": "icons/magic/water/projectile-ice-impact-stone.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "misty%20step_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      },
      {
        "origId": "tHBRe6Sjw0lmp5e7",
        "doc": {
          "name": "Invisibility",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "254",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>A creature you touch becomes &amp;Reference[condition=invisible] until the spell ends. Anything the target is wearing or carrying is &amp;Reference[condition=invisible] as long as it is on the target's person. The spell ends for a target that attacks or casts a spell.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 3rd level or higher, you can target one additional creature for each slot level above 2nd.</p></div></div>",
              "chat": ""
            },
            "level": 2,
            "school": "ill",
            "properties": [
              "vocal",
              "somatic",
              "material",
              "concentration"
            ],
            "materials": {
              "value": "an eyelash encased in gum arabic",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "1",
              "units": "hour"
            },
            "uses": {
              "max": "1",
              "recovery": [
                {
                  "period": "lr",
                  "type": "recoverAll"
                }
              ],
              "spent": 0
            },
            "method": "innate",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "utility",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "target": "",
                      "value": "1",
                      "scaling": {
                        "mode": "",
                        "formula": ""
                      }
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [
                  {
                    "_id": "TeFxBRKYKIXtg6pS",
                    "level": {}
                  }
                ],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "roll": {
                  "formula": "",
                  "name": "",
                  "prompt": false,
                  "visible": false
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "invisibility"
          },
          "img": "icons/creatures/reptiles/chameleon-camouflage-green-brown.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "invisibility_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": [
            {
              "name": "Invisibility",
              "origin": "Compendium.dnd5e.spells.Item.1N8dDMMgZ1h1YJ3B",
              "duration": {
                "startTime": null,
                "seconds": 3600,
                "combat": null,
                "rounds": null,
                "turns": null,
                "startRound": null,
                "startTurn": null
              },
              "disabled": false,
              "_id": "TeFxBRKYKIXtg6pS",
              "changes": [],
              "description": "<p>The target becomes Invisible until the spell ends. Anything the target is wearing or carrying is invisible as long as it is on the target's person. The spell ends for a target that attacks or casts a spell.</p>",
              "transfer": false,
              "statuses": [
                "invisible"
              ],
              "flags": {
                "plutonium": {
                  "dedupeId": "invisibility"
                }
              },
              "tint": "#ffffff",
              "_stats": {
                "compendiumSource": null,
                "duplicateSource": null,
                "coreVersion": "13.351",
                "systemId": "dnd5e",
                "systemVersion": "3.3.1",
                "createdTime": null,
                "modifiedTime": null,
                "lastModifiedBy": null,
                "exportSource": null
              },
              "img": "icons/creatures/reptiles/chameleon-camouflage-green-brown.webp",
              "type": "base",
              "system": {},
              "sort": 0
            }
          ]
        }
      },
      {
        "origId": "hDIjrZ5LbFu3kqcB",
        "doc": {
          "name": "Inflict Wounds",
          "type": "spell",
          "system": {
            "source": {
              "custom": "",
              "book": "PHB",
              "page": "253",
              "license": "",
              "revision": 1,
              "rules": "2014"
            },
            "description": {
              "value": "<div class=\"rd__b  rd__b--3\"><p>Make a melee spell attack against a creature you can reach. On a hit, the target takes [[/damage 3d10 type=necrotic]] damage.</p></div><div class=\"rd__b  rd__b--3\"><div data-roll-name-ancestor=\"At Higher Levels\" class=\"rd__b  rd__b--3\"><span class=\"rd__h rd__h--3\" data-title-index=\"1\"> <span class=\"entry-title-inner\">At Higher Levels.</span></span> <p>When you cast this spell using a spell slot of 2nd level or higher, the damage increases by [[/damage 1d10]] for each slot level above 1st.</p></div></div>",
              "chat": ""
            },
            "level": 1,
            "school": "nec",
            "properties": [
              "vocal",
              "somatic"
            ],
            "materials": {
              "value": "",
              "consumed": false,
              "cost": 0,
              "supply": 0
            },
            "target": {
              "affects": {
                "type": "creature",
                "count": "1",
                "choice": false
              },
              "template": {
                "units": "touch",
                "contiguous": false,
                "stationary": false
              }
            },
            "range": {
              "value": "0",
              "units": "touch"
            },
            "activation": {
              "type": "action",
              "condition": "",
              "value": 1
            },
            "duration": {
              "value": "",
              "units": "inst"
            },
            "uses": {
              "max": "1",
              "recovery": [
                {
                  "period": "lr",
                  "type": "recoverAll"
                }
              ],
              "spent": 0
            },
            "method": "innate",
            "prepared": 1,
            "activities": {
              "dnd5eactivity000": {
                "_id": "dnd5eactivity000",
                "type": "attack",
                "activation": {
                  "type": "action",
                  "override": false
                },
                "consumption": {
                  "targets": [
                    {
                      "type": "itemUses",
                      "target": "",
                      "value": "1",
                      "scaling": {
                        "mode": "",
                        "formula": ""
                      }
                    }
                  ],
                  "scaling": {
                    "allowed": false,
                    "max": ""
                  },
                  "spellSlot": true
                },
                "description": {
                  "chatFlavor": ""
                },
                "duration": {
                  "units": "inst",
                  "concentration": false,
                  "override": false
                },
                "effects": [],
                "range": {
                  "units": "self",
                  "override": false
                },
                "target": {
                  "prompt": true,
                  "template": {
                    "contiguous": false,
                    "stationary": false,
                    "units": "ft"
                  },
                  "affects": {
                    "choice": false
                  },
                  "override": false
                },
                "uses": {
                  "spent": 0,
                  "max": "",
                  "recovery": []
                },
                "attack": {
                  "ability": "",
                  "bonus": "",
                  "critical": {
                    "threshold": null
                  },
                  "flat": false,
                  "type": {
                    "value": "melee",
                    "classification": "spell"
                  }
                },
                "damage": {
                  "critical": {
                    "bonus": ""
                  },
                  "includeBase": true,
                  "parts": [
                    {
                      "number": 3,
                      "denomination": 10,
                      "bonus": "",
                      "types": [
                        "necrotic"
                      ],
                      "custom": {
                        "enabled": false,
                        "formula": ""
                      },
                      "scaling": {
                        "mode": "whole",
                        "number": 1,
                        "formula": ""
                      }
                    }
                  ]
                },
                "img": null,
                "sort": 0,
                "flags": {},
                "visibility": {
                  "level": {},
                  "requireAttunement": false,
                  "requireIdentification": false,
                  "requireMagic": false
                }
              }
            },
            "identifier": "inflict-wounds"
          },
          "img": "icons/magic/control/voodoo-doll-pain-damage-pink.webp",
          "flags": {
            "plutonium": {
              "page": "spells.html",
              "source": "PHB",
              "hash": "inflict%20wounds_phb",
              "propDroppable": "spell"
            },
            "dnd5e": {},
            "altarion-aitusa": {}
          },
          "effects": []
        }
      }
    ]
  }
};
