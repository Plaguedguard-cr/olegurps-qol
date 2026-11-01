// M2.6 exact-ID data: LT30,62,65,68-70,92-94,115-116. Explicit table Tip Slash exceptions retain precedence.
export const LT_CLOSEOUT_PROFILES={
 "wwqWNCZguZtDPfGy_": {
  "modelId": "lt:crowbar-large",
  "equipmentId": "eUsRcv0aaW45DoX7Q",
  "book": "LT",
  "name": "Crowbar, Large",
  "modeId": "wwqWNCZguZtDPfGy_",
  "usage": "Swung",
  "stats": {
   "damage": "sw+5 cr",
   "reach": "1-2*",
   "parry": "0U",
   "st": "13‡"
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [],
  "attackModifier": 0,
  "sourcePages": [
   "LT30",
   "LT70"
  ],
  "martialGrips": [],
  "hands": 2,
  "sourceFieldsBefore": {
   "damage": "sw+5 cr",
   "reach": "1-2*",
   "parry": "0U",
   "st": "13‡",
   "usage": "Swung"
  },
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0,
    "breakage": 2
   }
  ]
 },
 "wlwJG-TLxGsi3Vw1q": {
  "modelId": "lt:crowbar-large",
  "equipmentId": "eUsRcv0aaW45DoX7Q",
  "book": "LT",
  "name": "Crowbar, Large",
  "modeId": "wlwJG-TLxGsi3Vw1q",
  "usage": "Thrust",
  "stats": {
   "damage": "thr+2 cr",
   "reach": "1-2*",
   "parry": "0",
   "st": "12†"
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [],
  "attackModifier": 0,
  "sourcePages": [
   "LT30",
   "LT70"
  ],
  "martialGrips": [],
  "hands": 2,
  "sourceFieldsBefore": {
   "damage": "thr+2 cr",
   "reach": "1-2*",
   "parry": "0",
   "st": "12†",
   "usage": "Thrust"
  },
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0,
    "breakage": 2
   }
  ]
 },
 "wzKMNRNHAZzBjwZg2": {
  "modelId": "lt:oar",
  "equipmentId": "eEgs4W6k-9iFjnWXQ",
  "book": "LT",
  "name": "Oar",
  "modeId": "wzKMNRNHAZzBjwZg2",
  "usage": "Swung",
  "stats": {
   "damage": "sw+3 cr",
   "reach": "1-2*",
   "parry": "0U",
   "st": "12‡"
  },
  "primarySkills": [
   "Polearm"
  ],
  "sourceOptions": [],
  "attackModifier": 0,
  "sourcePages": [
   "LT60"
  ],
  "martialGrips": [],
  "hands": 2,
  "sourceFieldsBefore": {
   "damage": "sw+3 cr",
   "reach": "1-2*",
   "parry": "0U",
   "st": "12‡",
   "usage": "Swung"
  }
 },
 "weeNQgqI8pLRdPS8y": {
  "modelId": "lt:spike-shuriken",
  "equipmentId": "edBYbyqTMO4WubN7W",
  "book": "LT",
  "name": "Spike Shuriken",
  "modeId": "weeNQgqI8pLRdPS8y",
  "usage": "Punch",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "C",
   "parry": "0",
   "st": null
  },
  "primarySkills": [
   "Brawling"
  ],
  "attackModifier": 0,
  "sourceOptions": [
   {
    "unmodifiedSkills": [
     "Brawling"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": 0,
      "type": "attribute"
     }
    ]
   }
  ],
  "cost": 3,
  "mass": 0.1,
  "sourcePages": [
   "LT73",
   "LT65"
  ],
  "ltConstruction": {
   "modelId": "lt:spike-shuriken",
   "name": "Spike Shuriken",
   "qualityClass": "cutting",
   "construction": "blade",
   "cost": 3,
   "mass": 0.1,
   "sourcePages": [
    "LT73",
    "LT65"
   ],
   "damageTypes": [
    "cut"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "martialGrips": [],
  "hands": 1,
  "sourceFieldsBefore": {
   "damage": "thr-2 cut",
   "reach": "C",
   "parry": "0",
   "st": null,
   "usage": "Punch"
  },
  "unarmedSkillBonus": true
 },
 "wCX-YXcs_j0HKB0rc": {
  "modelId": "lt:star-shuriken",
  "equipmentId": "eWOkljQnuFOlvvblh",
  "book": "LT",
  "name": "Star Shuriken",
  "modeId": "wCX-YXcs_j0HKB0rc",
  "usage": "Punch",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "C",
   "parry": "0",
   "st": null
  },
  "primarySkills": [
   "Brawling"
  ],
  "attackModifier": 0,
  "sourceOptions": [
   {
    "unmodifiedSkills": [
     "Brawling"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": 0,
      "type": "attribute"
     }
    ]
   }
  ],
  "cost": 3,
  "mass": 0.1,
  "sourcePages": [
   "LT73",
   "LT65"
  ],
  "ltConstruction": {
   "modelId": "lt:star-shuriken",
   "name": "Star Shuriken",
   "qualityClass": "cutting",
   "construction": "blade",
   "cost": 3,
   "mass": 0.1,
   "sourcePages": [
    "LT73",
    "LT65"
   ],
   "damageTypes": [
    "cut"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "martialGrips": [],
  "hands": 1,
  "sourceFieldsBefore": {
   "damage": "thr-2 cut",
   "reach": "C",
   "parry": "0",
   "st": null,
   "usage": "Punch"
  },
  "unarmedSkillBonus": true
 },
 "wJyE5rQzEJSt7shYB": {
  "modelId": "lt:wooden-stake",
  "equipmentId": "e3m2R0EN6occeIRSW",
  "book": "LT",
  "name": "Wooden Stake",
  "modeId": "wJyE5rQzEJSt7shYB",
  "usage": "Thrust",
  "stats": {
   "damage": "thr(0.5) imp",
   "reach": "C",
   "parry": "-1",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "attackModifier": 0,
  "sourceOptions": [
   {
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute"
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill"
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill"
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill"
     }
    ]
   }
  ],
  "cost": 4,
  "mass": 0.5,
  "sourcePages": [
   "LT64",
   "LT67"
  ],
  "ltConstruction": {
   "modelId": "lt:wooden-stake",
   "name": "Wooden Stake",
   "qualityClass": "impaling",
   "construction": "wooden-stake",
   "cost": 4,
   "mass": 0.5,
   "sourcePages": [
    "LT64",
    "LT67"
   ],
   "damageTypes": [
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 2,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "wood",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "martialGrips": [],
  "hands": 1,
  "sourceFieldsBefore": {
   "damage": "thr(0.5) imp",
   "reach": "C",
   "parry": "-1",
   "st": "5",
   "usage": "Thrust"
  }
 },
 "wekjDm-aDxkWk8F9m": {
  "modeId": "wekjDm-aDxkWk8F9m",
  "equipmentId": "eKw6vIzpzM-liA6SM",
  "modelId": "lt:roman-scutum-large",
  "book": "LT",
  "name": "Roman Scutum, Large",
  "usage": "Shield Bash",
  "stats": {
   "damage": "thr cr",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-face",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT115"
  ],
  "sourceFieldsBefore": {
   "damage": "thr cr",
   "reach": "1",
   "st": null,
   "parry": null,
   "usage": "Shield Bash"
  },
  "shield": true,
  "cost": 200,
  "mass": 22,
  "shieldBaseModeId": "wekjDm-aDxkWk8F9m",
  "requiredFitting": null,
  "qualityOptions": [],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": []
 },
 "wLTM25SpikewekjDm-aDxkWk8F9m": {
  "modeId": "wLTM25SpikewekjDm-aDxkWk8F9m",
  "equipmentId": "eKw6vIzpzM-liA6SM",
  "modelId": "lt:roman-scutum-large",
  "book": "LT",
  "name": "Roman Scutum, Large",
  "usage": "Shield Bash – шип",
  "stats": {
   "damage": "thr+1 cr",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-spike",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT115"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 200,
  "mass": 22,
  "shieldBaseModeId": "wekjDm-aDxkWk8F9m",
  "requiredFitting": "shield-spike",
  "qualityOptions": [],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wekjDm-aDxkWk8F9m"
 },
 "wLTM25LongSpikewekjDm-aDxkWk8F9m": {
  "modeId": "wLTM25LongSpikewekjDm-aDxkWk8F9m",
  "equipmentId": "eKw6vIzpzM-liA6SM",
  "modelId": "lt:roman-scutum-large",
  "book": "LT",
  "name": "Roman Scutum, Large",
  "usage": "Shield Bash – длинный шип",
  "stats": {
   "damage": "thr+1 imp",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT115"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 200,
  "mass": 22,
  "shieldBaseModeId": "wekjDm-aDxkWk8F9m",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wekjDm-aDxkWk8F9m"
 },
 "wLTM25EdgewekjDm-aDxkWk8F9m": {
  "modeId": "wLTM25EdgewekjDm-aDxkWk8F9m",
  "equipmentId": "eKw6vIzpzM-liA6SM",
  "modelId": "lt:roman-scutum-large",
  "book": "LT",
  "name": "Roman Scutum, Large",
  "usage": "Shield Bash – кромка",
  "stats": {
   "damage": "sw-2 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-edge",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT115"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 200,
  "mass": 22,
  "shieldBaseModeId": "wekjDm-aDxkWk8F9m",
  "requiredFitting": "shield-edge",
  "qualityOptions": [],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wekjDm-aDxkWk8F9m"
 },
 "w4t370RBCVyiebGF6": {
  "modeId": "w4t370RBCVyiebGF6",
  "equipmentId": "eDvyuVqXXIYxrK9O3",
  "modelId": "lt:roman-scutum-medium",
  "book": "LT",
  "name": "Roman Scutum, Medium",
  "usage": "Shield Bash",
  "stats": {
   "damage": "thr cr",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-face",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT115"
  ],
  "sourceFieldsBefore": {
   "damage": "thr cr",
   "reach": "1",
   "st": null,
   "parry": null,
   "usage": "Shield Bash"
  },
  "shield": true,
  "cost": 140,
  "mass": 16,
  "shieldBaseModeId": "w4t370RBCVyiebGF6",
  "requiredFitting": null,
  "qualityOptions": [],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": []
 },
 "wLTM25Spikew4t370RBCVyiebGF6": {
  "modeId": "wLTM25Spikew4t370RBCVyiebGF6",
  "equipmentId": "eDvyuVqXXIYxrK9O3",
  "modelId": "lt:roman-scutum-medium",
  "book": "LT",
  "name": "Roman Scutum, Medium",
  "usage": "Shield Bash – шип",
  "stats": {
   "damage": "thr+1 cr",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-spike",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT115"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 140,
  "mass": 16,
  "shieldBaseModeId": "w4t370RBCVyiebGF6",
  "requiredFitting": "shield-spike",
  "qualityOptions": [],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "w4t370RBCVyiebGF6"
 },
 "wLTM25LongSpikew4t370RBCVyiebGF6": {
  "modeId": "wLTM25LongSpikew4t370RBCVyiebGF6",
  "equipmentId": "eDvyuVqXXIYxrK9O3",
  "modelId": "lt:roman-scutum-medium",
  "book": "LT",
  "name": "Roman Scutum, Medium",
  "usage": "Shield Bash – длинный шип",
  "stats": {
   "damage": "thr+1 imp",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT115"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 140,
  "mass": 16,
  "shieldBaseModeId": "w4t370RBCVyiebGF6",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "w4t370RBCVyiebGF6"
 },
 "wLTM25Edgew4t370RBCVyiebGF6": {
  "modeId": "wLTM25Edgew4t370RBCVyiebGF6",
  "equipmentId": "eDvyuVqXXIYxrK9O3",
  "modelId": "lt:roman-scutum-medium",
  "book": "LT",
  "name": "Roman Scutum, Medium",
  "usage": "Shield Bash – кромка",
  "stats": {
   "damage": "sw-2 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-edge",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT115"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 140,
  "mass": 16,
  "shieldBaseModeId": "w4t370RBCVyiebGF6",
  "requiredFitting": "shield-edge",
  "qualityOptions": [],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "w4t370RBCVyiebGF6"
 },
 "wLTM26HostbuttendeUstq-45wBk7_FmeT": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eUstq-45wBk7_FmeT",
  "book": "LT",
  "name": "Arquebus",
  "modeId": "wLTM26HostbuttendeUstq-45wBk7_FmeT",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26HostbuttendeUstq-45wBk7_FmeT"
 },
 "wLTM26HostbarrelswingeUstq-45wBk7_FmeT": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eUstq-45wBk7_FmeT",
  "book": "LT",
  "name": "Arquebus",
  "modeId": "wLTM26HostbarrelswingeUstq-45wBk7_FmeT",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26HostbarrelswingeUstq-45wBk7_FmeT"
 },
 "wLTM26BayoneteUstq-45wBk7_FmeT": {
  "modelId": "lt:bayonet",
  "equipmentId": "eUstq-45wBk7_FmeT",
  "book": "LT",
  "name": "Arquebus",
  "modeId": "wLTM26BayoneteUstq-45wBk7_FmeT",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteUstq-45wBk7_FmeT"
 },
 "wLTM26HostbuttendeWrPImwlzokA72wRG": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eWrPImwlzokA72wRG",
  "book": "LT",
  "name": "Blunderbuss",
  "modeId": "wLTM26HostbuttendeWrPImwlzokA72wRG",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26HostbuttendeWrPImwlzokA72wRG"
 },
 "wLTM26HostbarrelswingeWrPImwlzokA72wRG": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eWrPImwlzokA72wRG",
  "book": "LT",
  "name": "Blunderbuss",
  "modeId": "wLTM26HostbarrelswingeWrPImwlzokA72wRG",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26HostbarrelswingeWrPImwlzokA72wRG"
 },
 "wLTM26BayoneteWrPImwlzokA72wRG": {
  "modelId": "lt:bayonet",
  "equipmentId": "eWrPImwlzokA72wRG",
  "book": "LT",
  "name": "Blunderbuss",
  "modeId": "wLTM26BayoneteWrPImwlzokA72wRG",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteWrPImwlzokA72wRG"
 },
 "wLTM26HostbuttendeJ9fllNnD0219w6js": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eJ9fllNnD0219w6js",
  "book": "LT",
  "name": "Breechloading Carbine",
  "modeId": "wLTM26HostbuttendeJ9fllNnD0219w6js",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT94"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26HostbuttendeJ9fllNnD0219w6js"
 },
 "wLTM26HostbarrelswingeJ9fllNnD0219w6js": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eJ9fllNnD0219w6js",
  "book": "LT",
  "name": "Breechloading Carbine",
  "modeId": "wLTM26HostbarrelswingeJ9fllNnD0219w6js",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT94"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26HostbarrelswingeJ9fllNnD0219w6js"
 },
 "wLTM26BayoneteJ9fllNnD0219w6js": {
  "modelId": "lt:bayonet",
  "equipmentId": "eJ9fllNnD0219w6js",
  "book": "LT",
  "name": "Breechloading Carbine",
  "modeId": "wLTM26BayoneteJ9fllNnD0219w6js",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteJ9fllNnD0219w6js"
 },
 "wLTM26HostbuttendeT_f8WXR8mRNOpLSl": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eT_f8WXR8mRNOpLSl",
  "book": "LT",
  "name": "Buccaneer Fusil",
  "modeId": "wLTM26HostbuttendeT_f8WXR8mRNOpLSl",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26HostbuttendeT_f8WXR8mRNOpLSl"
 },
 "wLTM26HostbarrelswingeT_f8WXR8mRNOpLSl": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eT_f8WXR8mRNOpLSl",
  "book": "LT",
  "name": "Buccaneer Fusil",
  "modeId": "wLTM26HostbarrelswingeT_f8WXR8mRNOpLSl",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26HostbarrelswingeT_f8WXR8mRNOpLSl"
 },
 "wLTM26BayoneteT_f8WXR8mRNOpLSl": {
  "modelId": "lt:bayonet",
  "equipmentId": "eT_f8WXR8mRNOpLSl",
  "book": "LT",
  "name": "Buccaneer Fusil",
  "modeId": "wLTM26BayoneteT_f8WXR8mRNOpLSl",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteT_f8WXR8mRNOpLSl"
 },
 "wLTM26HostbuttendePh8_14rCd7DrMUhP": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "ePh8_14rCd7DrMUhP",
  "book": "LT",
  "name": "Caliver",
  "modeId": "wLTM26HostbuttendePh8_14rCd7DrMUhP",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26HostbuttendePh8_14rCd7DrMUhP"
 },
 "wLTM26HostbarrelswingePh8_14rCd7DrMUhP": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "ePh8_14rCd7DrMUhP",
  "book": "LT",
  "name": "Caliver",
  "modeId": "wLTM26HostbarrelswingePh8_14rCd7DrMUhP",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26HostbarrelswingePh8_14rCd7DrMUhP"
 },
 "wLTM26BayonetePh8_14rCd7DrMUhP": {
  "modelId": "lt:bayonet",
  "equipmentId": "ePh8_14rCd7DrMUhP",
  "book": "LT",
  "name": "Caliver",
  "modeId": "wLTM26BayonetePh8_14rCd7DrMUhP",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayonetePh8_14rCd7DrMUhP"
 },
 "wLTM26HostbuttendeDwly9qJ7ondSbli6": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eDwly9qJ7ondSbli6",
  "book": "LT",
  "name": "Carbine",
  "modeId": "wLTM26HostbuttendeDwly9qJ7ondSbli6",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26HostbuttendeDwly9qJ7ondSbli6"
 },
 "wLTM26HostbarrelswingeDwly9qJ7ondSbli6": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eDwly9qJ7ondSbli6",
  "book": "LT",
  "name": "Carbine",
  "modeId": "wLTM26HostbarrelswingeDwly9qJ7ondSbli6",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26HostbarrelswingeDwly9qJ7ondSbli6"
 },
 "wLTM26BayoneteDwly9qJ7ondSbli6": {
  "modelId": "lt:bayonet",
  "equipmentId": "eDwly9qJ7ondSbli6",
  "book": "LT",
  "name": "Carbine",
  "modeId": "wLTM26BayoneteDwly9qJ7ondSbli6",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteDwly9qJ7ondSbli6"
 },
 "wLTM26HostlargepistoleAuqzoGL1Fp0OxFeu": {
  "modelId": "lt:pistol",
  "equipmentId": "eAuqzoGL1Fp0OxFeu",
  "book": "LT",
  "name": "Dragoon Pistol, Heavy",
  "modeId": "wLTM26HostlargepistoleAuqzoGL1Fp0OxFeu",
  "usage": "Pistol butt",
  "displayUsage": true,
  "stats": {
   "damage": "sw+1 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "AXE/MACE (DX-5, Flail-4, or Two-Handed Axe/Mace-3)",
    "unmodifiedSkills": [
     "Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT93"
  ],
  "hostRule": "LT63-large-pistol",
  "templateModeId": "wLTM26HostlargepistoleAuqzoGL1Fp0OxFeu"
 },
 "wLTM26Hostlargepistole-QkIPkcPJEgVnWtA": {
  "modelId": "lt:pistol",
  "equipmentId": "e-QkIPkcPJEgVnWtA",
  "book": "LT",
  "name": "Dragoon Pistol, Light",
  "modeId": "wLTM26Hostlargepistole-QkIPkcPJEgVnWtA",
  "usage": "Pistol butt",
  "displayUsage": true,
  "stats": {
   "damage": "sw+1 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "AXE/MACE (DX-5, Flail-4, or Two-Handed Axe/Mace-3)",
    "unmodifiedSkills": [
     "Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT93"
  ],
  "hostRule": "LT63-large-pistol",
  "templateModeId": "wLTM26Hostlargepistole-QkIPkcPJEgVnWtA"
 },
 "wLTM26Hostbuttendeqm-l8KNxjOGPkr2y": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eqm-l8KNxjOGPkr2y",
  "book": "LT",
  "name": "Flintlock Carbine",
  "modeId": "wLTM26Hostbuttendeqm-l8KNxjOGPkr2y",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26Hostbuttendeqm-l8KNxjOGPkr2y"
 },
 "wLTM26Hostbarrelswingeqm-l8KNxjOGPkr2y": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eqm-l8KNxjOGPkr2y",
  "book": "LT",
  "name": "Flintlock Carbine",
  "modeId": "wLTM26Hostbarrelswingeqm-l8KNxjOGPkr2y",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26Hostbarrelswingeqm-l8KNxjOGPkr2y"
 },
 "wLTM26Bayoneteqm-l8KNxjOGPkr2y": {
  "modelId": "lt:bayonet",
  "equipmentId": "eqm-l8KNxjOGPkr2y",
  "book": "LT",
  "name": "Flintlock Carbine",
  "modeId": "wLTM26Bayoneteqm-l8KNxjOGPkr2y",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26Bayoneteqm-l8KNxjOGPkr2y"
 },
 "wLTM26Hostbuttende9FqkRToOywT7jj5F": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "e9FqkRToOywT7jj5F",
  "book": "LT",
  "name": "Fowling Piece, Double",
  "modeId": "wLTM26Hostbuttende9FqkRToOywT7jj5F",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26Hostbuttende9FqkRToOywT7jj5F"
 },
 "wLTM26Hostbarrelswinge9FqkRToOywT7jj5F": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "e9FqkRToOywT7jj5F",
  "book": "LT",
  "name": "Fowling Piece, Double",
  "modeId": "wLTM26Hostbarrelswinge9FqkRToOywT7jj5F",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26Hostbarrelswinge9FqkRToOywT7jj5F"
 },
 "wLTM26Bayonete9FqkRToOywT7jj5F": {
  "modelId": "lt:bayonet",
  "equipmentId": "e9FqkRToOywT7jj5F",
  "book": "LT",
  "name": "Fowling Piece, Double",
  "modeId": "wLTM26Bayonete9FqkRToOywT7jj5F",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26Bayonete9FqkRToOywT7jj5F"
 },
 "wLTM26HostbuttendeeJsYOXLUOfaJPTWK": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eeJsYOXLUOfaJPTWK",
  "book": "LT",
  "name": "Fowling Piece, Single",
  "modeId": "wLTM26HostbuttendeeJsYOXLUOfaJPTWK",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26HostbuttendeeJsYOXLUOfaJPTWK"
 },
 "wLTM26HostbarrelswingeeJsYOXLUOfaJPTWK": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eeJsYOXLUOfaJPTWK",
  "book": "LT",
  "name": "Fowling Piece, Single",
  "modeId": "wLTM26HostbarrelswingeeJsYOXLUOfaJPTWK",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26HostbarrelswingeeJsYOXLUOfaJPTWK"
 },
 "wLTM26BayoneteeJsYOXLUOfaJPTWK": {
  "modelId": "lt:bayonet",
  "equipmentId": "eeJsYOXLUOfaJPTWK",
  "book": "LT",
  "name": "Fowling Piece, Single",
  "modeId": "wLTM26BayoneteeJsYOXLUOfaJPTWK",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteeJsYOXLUOfaJPTWK"
 },
 "wLTM26HostbuttendeP4YOxuKnf5Y3AIuA": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eP4YOxuKnf5Y3AIuA",
  "book": "LT",
  "name": "Fusil de Chasse",
  "modeId": "wLTM26HostbuttendeP4YOxuKnf5Y3AIuA",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26HostbuttendeP4YOxuKnf5Y3AIuA"
 },
 "wLTM26HostbarrelswingeP4YOxuKnf5Y3AIuA": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eP4YOxuKnf5Y3AIuA",
  "book": "LT",
  "name": "Fusil de Chasse",
  "modeId": "wLTM26HostbarrelswingeP4YOxuKnf5Y3AIuA",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26HostbarrelswingeP4YOxuKnf5Y3AIuA"
 },
 "wLTM26BayoneteP4YOxuKnf5Y3AIuA": {
  "modelId": "lt:bayonet",
  "equipmentId": "eP4YOxuKnf5Y3AIuA",
  "book": "LT",
  "name": "Fusil de Chasse",
  "modeId": "wLTM26BayoneteP4YOxuKnf5Y3AIuA",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteP4YOxuKnf5Y3AIuA"
 },
 "wLTM26HostbuttendeObrfS7vuahB9FW9i": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eObrfS7vuahB9FW9i",
  "book": "LT",
  "name": "Fusil Ordinaire",
  "modeId": "wLTM26HostbuttendeObrfS7vuahB9FW9i",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26HostbuttendeObrfS7vuahB9FW9i"
 },
 "wLTM26HostbarrelswingeObrfS7vuahB9FW9i": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eObrfS7vuahB9FW9i",
  "book": "LT",
  "name": "Fusil Ordinaire",
  "modeId": "wLTM26HostbarrelswingeObrfS7vuahB9FW9i",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26HostbarrelswingeObrfS7vuahB9FW9i"
 },
 "wLTM26BayoneteObrfS7vuahB9FW9i": {
  "modelId": "lt:bayonet",
  "equipmentId": "eObrfS7vuahB9FW9i",
  "book": "LT",
  "name": "Fusil Ordinaire",
  "modeId": "wLTM26BayoneteObrfS7vuahB9FW9i",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteObrfS7vuahB9FW9i"
 },
 "wLTM26Hostbuttenden4F5-Hs9cuPtw0ed": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "en4F5-Hs9cuPtw0ed",
  "book": "LT",
  "name": "Jäger Rifle",
  "modeId": "wLTM26Hostbuttenden4F5-Hs9cuPtw0ed",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT94"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26Hostbuttenden4F5-Hs9cuPtw0ed"
 },
 "wLTM26Hostbarrelswingen4F5-Hs9cuPtw0ed": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "en4F5-Hs9cuPtw0ed",
  "book": "LT",
  "name": "Jäger Rifle",
  "modeId": "wLTM26Hostbarrelswingen4F5-Hs9cuPtw0ed",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT94"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26Hostbarrelswingen4F5-Hs9cuPtw0ed"
 },
 "wLTM26Bayoneten4F5-Hs9cuPtw0ed": {
  "modelId": "lt:bayonet",
  "equipmentId": "en4F5-Hs9cuPtw0ed",
  "book": "LT",
  "name": "Jäger Rifle",
  "modeId": "wLTM26Bayoneten4F5-Hs9cuPtw0ed",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26Bayoneten4F5-Hs9cuPtw0ed"
 },
 "wLTM26Hostbuttende1d5I1DEgBx7csoY9": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "e1d5I1DEgBx7csoY9",
  "book": "LT",
  "name": "Jäger Rifle, Double-Barreled",
  "modeId": "wLTM26Hostbuttende1d5I1DEgBx7csoY9",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT94"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26Hostbuttende1d5I1DEgBx7csoY9"
 },
 "wLTM26Hostbarrelswinge1d5I1DEgBx7csoY9": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "e1d5I1DEgBx7csoY9",
  "book": "LT",
  "name": "Jäger Rifle, Double-Barreled",
  "modeId": "wLTM26Hostbarrelswinge1d5I1DEgBx7csoY9",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT94"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26Hostbarrelswinge1d5I1DEgBx7csoY9"
 },
 "wLTM26Bayonete1d5I1DEgBx7csoY9": {
  "modelId": "lt:bayonet",
  "equipmentId": "e1d5I1DEgBx7csoY9",
  "book": "LT",
  "name": "Jäger Rifle, Double-Barreled",
  "modeId": "wLTM26Bayonete1d5I1DEgBx7csoY9",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26Bayonete1d5I1DEgBx7csoY9"
 },
 "wLTM26HostlargepistoleEHSjsOCxFFh6ET2f": {
  "modelId": "lt:pistol",
  "equipmentId": "eEHSjsOCxFFh6ET2f",
  "book": "LT",
  "name": "Military Pistol",
  "modeId": "wLTM26HostlargepistoleEHSjsOCxFFh6ET2f",
  "usage": "Pistol butt",
  "displayUsage": true,
  "stats": {
   "damage": "sw+1 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "AXE/MACE (DX-5, Flail-4, or Two-Handed Axe/Mace-3)",
    "unmodifiedSkills": [
     "Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT93"
  ],
  "hostRule": "LT63-large-pistol",
  "templateModeId": "wLTM26HostlargepistoleEHSjsOCxFFh6ET2f"
 },
 "wLTM26HostbuttendeikIB_Ocnu5vBx_AY": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eikIB_Ocnu5vBx_AY",
  "book": "LT",
  "name": "Musket",
  "modeId": "wLTM26HostbuttendeikIB_Ocnu5vBx_AY",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26HostbuttendeikIB_Ocnu5vBx_AY"
 },
 "wLTM26HostbarrelswingeikIB_Ocnu5vBx_AY": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eikIB_Ocnu5vBx_AY",
  "book": "LT",
  "name": "Musket",
  "modeId": "wLTM26HostbarrelswingeikIB_Ocnu5vBx_AY",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26HostbarrelswingeikIB_Ocnu5vBx_AY"
 },
 "wLTM26BayoneteikIB_Ocnu5vBx_AY": {
  "modelId": "lt:bayonet",
  "equipmentId": "eikIB_Ocnu5vBx_AY",
  "book": "LT",
  "name": "Musket",
  "modeId": "wLTM26BayoneteikIB_Ocnu5vBx_AY",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteikIB_Ocnu5vBx_AY"
 },
 "wLTM26HostsmallpistoleaLpwe40QwHRSk5Ot": {
  "modelId": "lt:pistol",
  "equipmentId": "eaLpwe40QwHRSk5Ot",
  "book": "LT",
  "name": "Pocket Pistol",
  "modeId": "wLTM26HostsmallpistoleaLpwe40QwHRSk5Ot",
  "usage": "Pistol punch",
  "displayUsage": true,
  "stats": {
   "damage": "thr cr",
   "reach": "C",
   "parry": "0",
   "st": null
  },
  "primarySkills": [
   "Brawling",
   "DX"
  ],
  "sourceOptions": [
   {
    "unmodifiedSkills": [
     "Brawling"
    ],
    "defaults": []
   },
   {
    "unmodifiedSkills": [
     "DX"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": 0,
      "type": "attribute",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "fist-load",
  "unarmedSkillBonus": true,
  "sourcePages": [
   "LT63",
   "B271",
   "LT94"
  ],
  "hostRule": "LT63-small-pistol",
  "templateModeId": "wLTM26HostsmallpistoleaLpwe40QwHRSk5Ot"
 },
 "wLTM26HostbuttendeR0fxLNLai2FOHu7t": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eR0fxLNLai2FOHu7t",
  "book": "LT",
  "name": "Teppo",
  "modeId": "wLTM26HostbuttendeR0fxLNLai2FOHu7t",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26HostbuttendeR0fxLNLai2FOHu7t"
 },
 "wLTM26HostbarrelswingeR0fxLNLai2FOHu7t": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eR0fxLNLai2FOHu7t",
  "book": "LT",
  "name": "Teppo",
  "modeId": "wLTM26HostbarrelswingeR0fxLNLai2FOHu7t",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26HostbarrelswingeR0fxLNLai2FOHu7t"
 },
 "wLTM26BayoneteR0fxLNLai2FOHu7t": {
  "modelId": "lt:bayonet",
  "equipmentId": "eR0fxLNLai2FOHu7t",
  "book": "LT",
  "name": "Teppo",
  "modeId": "wLTM26BayoneteR0fxLNLai2FOHu7t",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteR0fxLNLai2FOHu7t"
 },
 "wLTM26HostbuttendeMM2x0c5BYnpcGNh2": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eMM2x0c5BYnpcGNh2",
  "book": "LT",
  "name": "Winged Tiger Gun",
  "modeId": "wLTM26HostbuttendeMM2x0c5BYnpcGNh2",
  "usage": "Butt thrust",
  "displayUsage": true,
  "stats": {
   "damage": "thr+2 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Spear",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-butt-end",
  "templateModeId": "wLTM26HostbuttendeMM2x0c5BYnpcGNh2"
 },
 "wLTM26HostbarrelswingeMM2x0c5BYnpcGNh2": {
  "modelId": "lt:musket-or-rifle",
  "equipmentId": "eMM2x0c5BYnpcGNh2",
  "book": "LT",
  "name": "Winged Tiger Gun",
  "modeId": "wLTM26HostbarrelswingeMM2x0c5BYnpcGNh2",
  "usage": "Barrel swing",
  "displayUsage": true,
  "stats": {
   "damage": "sw+4 cr",
   "reach": null,
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Two-Handed Axe/Mace"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED AXE/MACE (DX-5, Axe/Mace-3, Polearm-4, or Two-Handed Flail-4)",
    "unmodifiedSkills": [
     "Two-Handed Axe/Mace"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Axe/Mace",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Flail",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "firearm-body",
  "unarmedSkillBonus": false,
  "sourcePages": [
   "LT63",
   "LT65",
   "LT69",
   "LT70",
   "LT92"
  ],
  "hostRule": "LT63-barrel-swing",
  "templateModeId": "wLTM26HostbarrelswingeMM2x0c5BYnpcGNh2"
 },
 "wLTM26BayoneteMM2x0c5BYnpcGNh2": {
  "modelId": "lt:bayonet",
  "equipmentId": "eMM2x0c5BYnpcGNh2",
  "book": "LT",
  "name": "Winged Tiger Gun",
  "modeId": "wLTM26BayoneteMM2x0c5BYnpcGNh2",
  "usage": "Bayonet - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+3 imp",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteMM2x0c5BYnpcGNh2"
 },
 "wLTM26TipwLTM25LongSpikew2Kcn0f4gHG7Xs_vz": {
  "modeId": "wLTM26TipwLTM25LongSpikew2Kcn0f4gHG7Xs_vz",
  "equipmentId": "eLKDn4_JQf6yV8Pkh",
  "modelId": "lt:argive-shield",
  "book": "LT",
  "name": "Argive Shield",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 120,
  "mass": 15,
  "shieldBaseModeId": "w2Kcn0f4gHG7Xs_vz",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikew2Kcn0f4gHG7Xs_vz",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:argive-shield"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikew2Kcn0f4gHG7Xs_vz"
 },
 "wLTM26TipwrPDI-eEP9ACxbGfs": {
  "modelId": "lt:backsword",
  "equipmentId": "e7F8fHESvA-JfH4xM",
  "book": "LT",
  "name": "Backsword",
  "modeId": "wLTM26TipwrPDI-eEP9ACxbGfs",
  "sourcePages": [
   "LT54",
   "LT65",
   "LT66",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0",
   "st": "10"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 550,
  "mass": 3,
  "ltConstruction": {
   "modelId": "lt:backsword",
   "name": "Backsword",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 550,
   "mass": 3,
   "sourcePages": [
    "LT54",
    "LT65",
    "LT66"
   ],
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wrPDI-eEP9ACxbGfs",
  "tipOf": "wrPDI-eEP9ACxbGfs"
 },
 "wLTM26TipwAIGP1vi1fHHfzIYC": {
  "modelId": "lt:balisong",
  "equipmentId": "e63hCyhuUmjcmEsXd",
  "book": "LT",
  "name": "Balisong",
  "modeId": "wLTM26TipwAIGP1vi1fHHfzIYC",
  "sourcePages": [
   "LT54",
   "LT67",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-3 cut",
   "reach": "C",
   "parry": "-1",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 50,
  "mass": 0.5,
  "ltConstruction": {
   "modelId": "lt:balisong",
   "name": "Balisong",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 50,
   "mass": 0.5,
   "sourcePages": [
    "LT54",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wAIGP1vi1fHHfzIYC",
  "tipOf": "wAIGP1vi1fHHfzIYC"
 },
 "wLTM26TipwL4sLEK_4j0dU5iu6": {
  "modelId": "lt:cavalry-saber",
  "equipmentId": "espQ32t5diJ_nTjVT",
  "book": "LT",
  "name": "Cavalry Saber",
  "modeId": "wLTM26TipwL4sLEK_4j0dU5iu6",
  "sourcePages": [
   "LT56",
   "LT66",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0",
   "st": "10"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 500,
  "mass": 3,
  "ltConstruction": {
   "modelId": "lt:cavalry-saber",
   "name": "Cavalry Saber",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 500,
   "mass": 3,
   "sourcePages": [
    "LT56",
    "LT66"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wL4sLEK_4j0dU5iu6",
  "tipOf": "wL4sLEK_4j0dU5iu6"
 },
 "wLTM26TipwLTM25LongSpikewNxN2KuElByp51MmT": {
  "modeId": "wLTM26TipwLTM25LongSpikewNxN2KuElByp51MmT",
  "equipmentId": "eEu2vQXan2xiLGFf8",
  "modelId": "lt:comanche-shield",
  "book": "LT",
  "name": "Comanche Shield",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 100,
  "mass": 16,
  "shieldBaseModeId": "wNxN2KuElByp51MmT",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewNxN2KuElByp51MmT",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:comanche-shield"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewNxN2KuElByp51MmT"
 },
 "wLTM26TipwuoxbzN9YqDC3cU5s": {
  "modelId": "lt:cutlass",
  "equipmentId": "ewqtnwgy4C8-NVr65",
  "book": "LT",
  "name": "Cutlass",
  "modeId": "wLTM26TipwuoxbzN9YqDC3cU5s",
  "sourcePages": [
   "LT56",
   "LT69",
   "LT65",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0",
   "st": "8"
  },
  "primarySkills": [
   "Shortsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "SHORTSWORD (DX-5, Broadsword-2, Force Sword-4, Jitte/Sai-3, Knife-4, Saber-4, Smallsword-4, or Tonfa-3)",
    "unmodifiedSkills": [
     "Shortsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Jitte/Sai",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Knife",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Tonfa",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 500,
  "mass": 2,
  "ltConstruction": {
   "modelId": "lt:cutlass",
   "name": "Cutlass",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 500,
   "mass": 2,
   "sourcePages": [
    "LT56",
    "LT69",
    "LT65"
   ],
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wuoxbzN9YqDC3cU5s",
  "tipOf": "wuoxbzN9YqDC3cU5s"
 },
 "wLTM26TipwC7kwiuwzalnQQgh-": {
  "modelId": "lt:dagger",
  "equipmentId": "eEkk6WpqrCj5KoCNQ",
  "book": "LT",
  "name": "Dagger",
  "modeId": "wLTM26TipwC7kwiuwzalnQQgh-",
  "sourcePages": [
   "LT56",
   "LT67",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-3 cut",
   "reach": "C",
   "parry": "-1",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 20,
  "mass": 0.25,
  "ltConstruction": {
   "modelId": "lt:dagger",
   "name": "Dagger",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 20,
   "mass": 0.25,
   "sourcePages": [
    "LT56",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wC7kwiuwzalnQQgh-",
  "tipOf": "wC7kwiuwzalnQQgh-"
 },
 "wLTM26TipwbTCe3V11yvKYbVMy": {
  "modelId": "lt:dao",
  "equipmentId": "ejv_7yhIWr-w7FdOC",
  "book": "LT",
  "name": "Dao",
  "modeId": "wLTM26TipwbTCe3V11yvKYbVMy",
  "sourcePages": [
   "LT56",
   "LT66",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "1",
   "parry": "0U",
   "st": "11"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 700,
  "mass": 5,
  "ltConstruction": {
   "modelId": "lt:dao",
   "name": "Dao",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 700,
   "mass": 5,
   "sourcePages": [
    "LT56",
    "LT66"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wbTCe3V11yvKYbVMy",
  "tipOf": "wbTCe3V11yvKYbVMy"
 },
 "wLTM26Tipw07JOdWjhIVwOzwFo": {
  "modelId": "lt:dress-smallsword",
  "equipmentId": "ekfM7nhB56uunM59T",
  "book": "LT",
  "name": "Dress Smallsword",
  "modeId": "wLTM26Tipw07JOdWjhIVwOzwFo",
  "sourcePages": [
   "LT62",
   "LT69"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "1",
   "parry": "0F",
   "st": "5"
  },
  "primarySkills": [
   "Smallsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "SMALLSWORD (DX-5, Main-Gauche-3, Rapier-3, Saber-3, or Shortsword-4)",
    "unmodifiedSkills": [
     "Smallsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 300,
  "mass": 1,
  "ltConstruction": {
   "modelId": "lt:dress-smallsword",
   "name": "Dress Smallsword",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 300,
   "mass": 1,
   "sourcePages": [
    "LT62",
    "LT69"
   ],
   "damageTypes": [
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "w07JOdWjhIVwOzwFo",
  "tipOf": "w07JOdWjhIVwOzwFo"
 },
 "wLTM26TipwLTM25LongSpikewqNzTaH6PhRlKtdHa": {
  "modeId": "wLTM26TipwLTM25LongSpikewqNzTaH6PhRlKtdHa",
  "equipmentId": "eKUq1vap87PJexK6r",
  "modelId": "lt:dueling-buckler",
  "book": "LT",
  "name": "Dueling Buckler",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield (Buckler)"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield (Buckler)",
    "unmodifiedSkills": [
     "Shield (Buckler)"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 25,
  "mass": 2,
  "shieldBaseModeId": "wqNzTaH6PhRlKtdHa",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewqNzTaH6PhRlKtdHa",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:dueling-buckler"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewqNzTaH6PhRlKtdHa"
 },
 "wLTM26TipwLTM25LongSpikewbr_iBGO9QK06x2dG": {
  "modeId": "wLTM26TipwLTM25LongSpikewbr_iBGO9QK06x2dG",
  "equipmentId": "eh4wim5anWaEyB5Rb",
  "modelId": "lt:dueling-long-shield",
  "book": "LT",
  "name": "Dueling Long Shield",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield",
   "Staff"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   },
   {
    "sourceHeader": "Staff",
    "unmodifiedSkills": [
     "Staff"
    ],
    "defaults": [
     {
      "modifier": -5,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -4,
      "type": "skill",
      "recursive": false,
      "from": "Polearm"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Spear"
     }
    ]
   }
  ],
  "attackModifier": -2,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 200,
  "mass": 16,
  "shieldBaseModeId": "wbr_iBGO9QK06x2dG",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewbr_iBGO9QK06x2dG",
  "skillAttackModifiers": {
   "Shield": -2,
   "Staff": -4
  },
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:dueling-long-shield"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewbr_iBGO9QK06x2dG"
 },
 "wLTM26Tipw7tiFqttK_IsnH_ox": {
  "modelId": "lt:edged-rapier",
  "equipmentId": "e4g-va5KWviMGyE6F",
  "book": "LT",
  "name": "Edged Rapier",
  "modeId": "wLTM26Tipw7tiFqttK_IsnH_ox",
  "sourcePages": [
   "LT61",
   "LT68",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "2",
   "parry": "0F",
   "st": "10"
  },
  "primarySkills": [
   "Rapier"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "RAPIER (DX-5, Broadsword-4, Main-Gauche-3, Saber-3, or Smallsword-3)",
    "unmodifiedSkills": [
     "Rapier"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   },
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 1000,
  "mass": 3,
  "ltConstruction": {
   "modelId": "lt:edged-rapier",
   "name": "Edged Rapier",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 1000,
   "mass": 3,
   "sourcePages": [
    "LT61",
    "LT68"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "w7tiFqttK_IsnH_ox",
  "tipOf": "w7tiFqttK_IsnH_ox"
 },
 "wLTM26Tipw3KTjelathsARN_pu": {
  "modelId": "lt:estoc",
  "equipmentId": "eVsq-INlRIDzirMJa",
  "book": "LT",
  "name": "Estoc",
  "modeId": "wLTM26Tipw3KTjelathsARN_pu",
  "sourcePages": [
   "LT56",
   "LT66",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr cut",
   "reach": "1",
   "parry": "0",
   "st": "10"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 500,
  "mass": 3,
  "ltConstruction": {
   "modelId": "lt:estoc",
   "name": "Estoc",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 500,
   "mass": 3,
   "sourcePages": [
    "LT56",
    "LT66"
   ],
   "damageTypes": [
    "cr",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "w3KTjelathsARN_pu",
  "tipOf": "w3KTjelathsARN_pu"
 },
 "wLTM26TipwACR8Gph0MCxX8_l2": {
  "modelId": "lt:falchion",
  "equipmentId": "eRv_rs5osGxWCFftz",
  "book": "LT",
  "name": "Falchion",
  "modeId": "wLTM26TipwACR8Gph0MCxX8_l2",
  "sourcePages": [
   "LT56",
   "LT69",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-4 cut",
   "reach": "1",
   "parry": "0",
   "st": "10"
  },
  "primarySkills": [
   "Shortsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "SHORTSWORD (DX-5, Broadsword-2, Force Sword-4, Jitte/Sai-3, Knife-4, Saber-4, Smallsword-4, or Tonfa-3)",
    "unmodifiedSkills": [
     "Shortsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Jitte/Sai",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Knife",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Tonfa",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 400,
  "mass": 3,
  "ltConstruction": {
   "modelId": "lt:falchion",
   "name": "Falchion",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 400,
   "mass": 3,
   "sourcePages": [
    "LT56",
    "LT69"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wACR8Gph0MCxX8_l2",
  "tipOf": "wACR8Gph0MCxX8_l2"
 },
 "wLTM26TipwLTM25LongSpikewljCLBzAJeuiCuYSm": {
  "modeId": "wLTM26TipwLTM25LongSpikewljCLBzAJeuiCuYSm",
  "equipmentId": "eyIESVGXulfaCqV2n",
  "modelId": "lt:heater-shield",
  "book": "LT",
  "name": "Heater Shield",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 75,
  "mass": 13,
  "shieldBaseModeId": "wljCLBzAJeuiCuYSm",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewljCLBzAJeuiCuYSm",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:heater-shield"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewljCLBzAJeuiCuYSm"
 },
 "wLTM26TipwLTM25LongSpikewJwFZ0j7hPgANJCy6": {
  "modeId": "wLTM26TipwLTM25LongSpikewJwFZ0j7hPgANJCy6",
  "equipmentId": "eyHMjAdvXz2S18ecs",
  "modelId": "lt:homeric-buckler-large",
  "book": "LT",
  "name": "Homeric Buckler, Large",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield (Buckler)"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield (Buckler)",
    "unmodifiedSkills": [
     "Shield (Buckler)"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 150,
  "mass": 20,
  "shieldBaseModeId": "wJwFZ0j7hPgANJCy6",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewJwFZ0j7hPgANJCy6",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:homeric-buckler-large"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewJwFZ0j7hPgANJCy6"
 },
 "wLTM26TipwLTM25LongSpikewuzq6jICulP14Fhj1": {
  "modeId": "wLTM26TipwLTM25LongSpikewuzq6jICulP14Fhj1",
  "equipmentId": "eIej6GKa1Yxfz-rB1",
  "modelId": "lt:homeric-buckler-medium",
  "book": "LT",
  "name": "Homeric Buckler, Medium",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield (Buckler)"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield (Buckler)",
    "unmodifiedSkills": [
     "Shield (Buckler)"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 100,
  "mass": 16,
  "shieldBaseModeId": "wuzq6jICulP14Fhj1",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewuzq6jICulP14Fhj1",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:homeric-buckler-medium"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewuzq6jICulP14Fhj1"
 },
 "wLTM26Tipw77RJQ7qSA7t-tK_F": {
  "modelId": "lt:hungamunga",
  "equipmentId": "eyFzn-BFYhzHXAAXt",
  "book": "LT",
  "name": "Hungamunga",
  "sourcePages": [
   "LT72",
   "LT78",
   "B272",
   "LT62"
  ],
  "modeId": "wLTM26Tipw77RJQ7qSA7t-tK_F",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "C",
   "parry": "-2",
   "st": "6"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -2,
  "cost": 40,
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "parrySkillAlreadyIncluded": -1,
  "mass": 1,
  "ltConstruction": {
   "modelId": "lt:hungamunga",
   "name": "Hungamunga",
   "qualityClass": "cutting",
   "construction": "blade",
   "cost": 40,
   "mass": 1,
   "sourcePages": [
    "LT72",
    "LT78",
    "B272"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "w77RJQ7qSA7t-tK_F",
  "sourceFieldsBefore": null,
  "tipOf": "w77RJQ7qSA7t-tK_F"
 },
 "wLTM26Tipwu4pvgk8neNTGwwdU": {
  "modelId": "lt:jian",
  "equipmentId": "evVFy7uca9O8D1KNp",
  "book": "LT",
  "name": "Jian",
  "modeId": "wLTM26Tipwu4pvgk8neNTGwwdU",
  "sourcePages": [
   "LT57",
   "LT66",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "2",
   "parry": "0",
   "st": "10"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   },
   {
    "sourceHeader": "RAPIER (DX-5, Broadsword-4, Main-Gauche-3, Saber-3, or Smallsword-3)",
    "unmodifiedSkills": [
     "Rapier"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 700,
  "mass": 3,
  "ltConstruction": {
   "modelId": "lt:jian",
   "name": "Jian",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 700,
   "mass": 3,
   "sourcePages": [
    "LT57",
    "LT66"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wu4pvgk8neNTGwwdU",
  "tipOf": "wu4pvgk8neNTGwwdU"
 },
 "wLTM26TipwikkqnutJTGtZmXiP": {
  "modelId": "lt:katana",
  "equipmentId": "eSH8jtUi7O-Eztex1",
  "book": "LT",
  "name": "Katana",
  "modeId": "wLTM26TipwikkqnutJTGtZmXiP",
  "sourcePages": [
   "LT57",
   "LT66",
   "LT70",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0",
   "st": "11"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 650,
  "mass": 5,
  "ltConstruction": {
   "modelId": "lt:katana",
   "name": "Katana",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 650,
   "mass": 5,
   "sourcePages": [
    "LT57",
    "LT66",
    "LT70"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wikkqnutJTGtZmXiP",
  "tipOf": "wikkqnutJTGtZmXiP"
 },
 "wLTM26TipwFp0g_8TGGs4OEJIX": {
  "modelId": "lt:katana",
  "equipmentId": "eSH8jtUi7O-Eztex1",
  "book": "LT",
  "name": "Katana",
  "modeId": "wLTM26TipwFp0g_8TGGs4OEJIX",
  "sourcePages": [
   "LT57",
   "LT66",
   "LT70",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0",
   "st": "10†"
  },
  "primarySkills": [
   "Two-Handed Sword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED SWORD (DX-5, Broadsword-4, or Force Sword-4)",
    "unmodifiedSkills": [
     "Two-Handed Sword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 650,
  "mass": 5,
  "ltConstruction": {
   "modelId": "lt:katana",
   "name": "Katana",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 650,
   "mass": 5,
   "sourcePages": [
    "LT57",
    "LT66",
    "LT70"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wFp0g_8TGGs4OEJIX",
  "tipOf": "wFp0g_8TGGs4OEJIX"
 },
 "wLTM26TipwiI30yAAM_X052yQI": {
  "modelId": "lt:katar",
  "equipmentId": "eR5Uz8oeA0ZD2Y6_O",
  "book": "LT",
  "name": "Katar",
  "modeId": "wLTM26TipwiI30yAAM_X052yQI",
  "sourcePages": [
   "LT57",
   "LT67",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "C",
   "parry": "-1",
   "st": "6"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 50,
  "mass": 1,
  "ltConstruction": {
   "modelId": "lt:katar",
   "name": "Katar",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 50,
   "mass": 1,
   "sourcePages": [
    "LT57",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wiI30yAAM_X052yQI",
  "tipOf": "wiI30yAAM_X052yQI"
 },
 "wLTM26TipwLTM25LongSpikewpwY_K8gu3ClTpKOl": {
  "modeId": "wLTM26TipwLTM25LongSpikewpwY_K8gu3ClTpKOl",
  "equipmentId": "e82vlur9Jg7K79W9Q",
  "modelId": "lt:kite-shield",
  "book": "LT",
  "name": "Kite Shield",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 120,
  "mass": 18,
  "shieldBaseModeId": "wpwY_K8gu3ClTpKOl",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewpwY_K8gu3ClTpKOl",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:kite-shield"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewpwY_K8gu3ClTpKOl"
 },
 "wLTM26TipwG4kCWRXQyqb7CLDJ": {
  "modelId": "lt:kukri",
  "equipmentId": "e0tmeOQw5QoeJJL-Y",
  "book": "LT",
  "name": "Kukri",
  "modeId": "wLTM26TipwG4kCWRXQyqb7CLDJ",
  "sourcePages": [
   "LT58",
   "LT67",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-3 cut",
   "reach": "C",
   "parry": "0",
   "st": "7"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 50,
  "mass": 1.5,
  "ltConstruction": {
   "modelId": "lt:kukri",
   "name": "Kukri",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 50,
   "mass": 1.5,
   "sourcePages": [
    "LT58",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wG4kCWRXQyqb7CLDJ",
  "tipOf": "wG4kCWRXQyqb7CLDJ"
 },
 "wLTM26TipwOn9TKw_JhbnLHpsQ": {
  "modelId": "lt:large-falchion",
  "equipmentId": "eK17o5feHeURAy5d9",
  "book": "LT",
  "name": "Large Falchion",
  "modeId": "wLTM26TipwOn9TKw_JhbnLHpsQ",
  "sourcePages": [
   "LT56",
   "LT65",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-3 cut",
   "reach": "1",
   "parry": "0U",
   "st": "11"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 625,
  "mass": 4.5,
  "ltConstruction": {
   "modelId": "lt:large-falchion",
   "name": "Large Falchion",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 625,
   "mass": 4.5,
   "sourcePages": [
    "LT56",
    "LT65"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wOn9TKw_JhbnLHpsQ",
  "tipOf": "wOn9TKw_JhbnLHpsQ"
 },
 "wLTM26TipwDvNK7Xe3WVA4ITfW": {
  "modelId": "lt:large-katar",
  "equipmentId": "eBvYYD-dieC5iol_L",
  "book": "LT",
  "name": "Large Katar",
  "modeId": "wLTM26TipwDvNK7Xe3WVA4ITfW",
  "sourcePages": [
   "LT57",
   "LT69",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr cut",
   "reach": "1",
   "parry": "0",
   "st": "8"
  },
  "primarySkills": [
   "Shortsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "SHORTSWORD (DX-5, Broadsword-2, Force Sword-4, Jitte/Sai-3, Knife-4, Saber-4, Smallsword-4, or Tonfa-3)",
    "unmodifiedSkills": [
     "Shortsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Jitte/Sai",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Knife",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Tonfa",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 400,
  "mass": 2,
  "ltConstruction": {
   "modelId": "lt:large-katar",
   "name": "Large Katar",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 400,
   "mass": 2,
   "sourcePages": [
    "LT57",
    "LT69"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wDvNK7Xe3WVA4ITfW",
  "tipOf": "wDvNK7Xe3WVA4ITfW"
 },
 "wLTM26TipwHh4b6lYKhc7xjiCp": {
  "modelId": "lt:large-knife",
  "equipmentId": "e4Cqh4R-bWl7CS7dQ",
  "book": "LT",
  "name": "Large Knife",
  "modeId": "wLTM26TipwHh4b6lYKhc7xjiCp",
  "sourcePages": [
   "LT58",
   "LT67",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "C",
   "parry": "-1",
   "st": "6"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 40,
  "mass": 1,
  "ltConstruction": {
   "modelId": "lt:large-knife",
   "name": "Large Knife",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 40,
   "mass": 1,
   "sourcePages": [
    "LT58",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wHh4b6lYKhc7xjiCp",
  "tipOf": "wHh4b6lYKhc7xjiCp"
 },
 "wLTM26TipwLTM25LongSpikewCqgQxsRG-V2xcTJA": {
  "modeId": "wLTM26TipwLTM25LongSpikewCqgQxsRG-V2xcTJA",
  "equipmentId": "eE75n5IqjUbcK7sUS",
  "modelId": "lt:large-shield-heavy",
  "book": "LT",
  "name": "Large Shield, Heavy",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 90,
  "mass": 20,
  "shieldBaseModeId": "wCqgQxsRG-V2xcTJA",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewCqgQxsRG-V2xcTJA",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:large-shield-heavy"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewCqgQxsRG-V2xcTJA"
 },
 "wLTM26TipwLTM25LongSpikewD3uA-H1b4rrOev1E": {
  "modeId": "wLTM26TipwLTM25LongSpikewD3uA-H1b4rrOev1E",
  "equipmentId": "eOkiGUtUqzkRkrJrx",
  "modelId": "lt:large-shield-light",
  "book": "LT",
  "name": "Large Shield, Light",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 68,
  "mass": 10,
  "shieldBaseModeId": "wD3uA-H1b4rrOev1E",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewD3uA-H1b4rrOev1E",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:large-shield-light"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewD3uA-H1b4rrOev1E"
 },
 "wLTM26TipwAknh3bLiN-z2FcXJ": {
  "modelId": "lt:large-throwing-knife",
  "equipmentId": "eE8_Dy15zRaLiEs45",
  "book": "LT",
  "name": "Large Throwing Knife",
  "sourcePages": [
   "LT75",
   "LT78",
   "B272",
   "LT62"
  ],
  "modeId": "wLTM26TipwAknh3bLiN-z2FcXJ",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "C",
   "parry": "-2",
   "st": "6"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -2,
  "cost": 40,
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "parrySkillAlreadyIncluded": -1,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "mass": 1,
  "ltConstruction": {
   "modelId": "lt:large-throwing-knife",
   "name": "Large Throwing Knife",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 40,
   "mass": 1,
   "sourcePages": [
    "LT75",
    "LT78",
    "B272"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wAknh3bLiN-z2FcXJ",
  "tipOf": "wAknh3bLiN-z2FcXJ"
 },
 "wLTM26TipwsK7j6dJBohe4n8sa": {
  "modelId": "lt:late-katana",
  "equipmentId": "ezTmezdXy1DpJpNW1",
  "book": "LT",
  "name": "Late Katana",
  "modeId": "wLTM26TipwsK7j6dJBohe4n8sa",
  "sourcePages": [
   "LT57",
   "LT66",
   "LT70",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0",
   "st": "10"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 550,
  "mass": 3,
  "ltConstruction": {
   "modelId": "lt:late-katana",
   "name": "Late Katana",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 550,
   "mass": 3,
   "sourcePages": [
    "LT57",
    "LT66",
    "LT70"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wsK7j6dJBohe4n8sa",
  "tipOf": "wsK7j6dJBohe4n8sa"
 },
 "wLTM26TipwRCDB3TogGahkj8hi": {
  "modelId": "lt:late-katana",
  "equipmentId": "ezTmezdXy1DpJpNW1",
  "book": "LT",
  "name": "Late Katana",
  "modeId": "wLTM26TipwRCDB3TogGahkj8hi",
  "sourcePages": [
   "LT57",
   "LT66",
   "LT70",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0",
   "st": "9†"
  },
  "primarySkills": [
   "Two-Handed Sword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED SWORD (DX-5, Broadsword-4, or Force Sword-4)",
    "unmodifiedSkills": [
     "Two-Handed Sword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 550,
  "mass": 3,
  "ltConstruction": {
   "modelId": "lt:late-katana",
   "name": "Late Katana",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 550,
   "mass": 3,
   "sourcePages": [
    "LT57",
    "LT66",
    "LT70"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wRCDB3TogGahkj8hi",
  "tipOf": "wRCDB3TogGahkj8hi"
 },
 "wLTM26Tipw7Od9gGJ58vOv-oC7": {
  "modelId": "lt:light-edged-rapier",
  "equipmentId": "ewpF8TAvUV_1xpjXO",
  "book": "LT",
  "name": "Light Edged Rapier",
  "modeId": "wLTM26Tipw7Od9gGJ58vOv-oC7",
  "sourcePages": [
   "LT61",
   "LT68",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0F",
   "st": "8"
  },
  "primarySkills": [
   "Rapier"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "RAPIER (DX-5, Broadsword-4, Main-Gauche-3, Saber-3, or Smallsword-3)",
    "unmodifiedSkills": [
     "Rapier"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 700,
  "mass": 2.25,
  "ltConstruction": {
   "modelId": "lt:light-edged-rapier",
   "name": "Light Edged Rapier",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 700,
   "mass": 2.25,
   "sourcePages": [
    "LT61",
    "LT68"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "w7Od9gGJ58vOv-oC7",
  "tipOf": "w7Od9gGJ58vOv-oC7"
 },
 "wLTM26TipwbUrBUfm6vAN5BS8d": {
  "modelId": "lt:light-rapier",
  "equipmentId": "e9lnfC0mIL30gEZH3",
  "book": "LT",
  "name": "Light Rapier",
  "modeId": "wLTM26TipwbUrBUfm6vAN5BS8d",
  "sourcePages": [
   "LT61",
   "LT68",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0F",
   "st": "8"
  },
  "primarySkills": [
   "Rapier"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "RAPIER (DX-5, Broadsword-4, Main-Gauche-3, Saber-3, or Smallsword-3)",
    "unmodifiedSkills": [
     "Rapier"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 400,
  "mass": 2,
  "ltConstruction": {
   "modelId": "lt:light-rapier",
   "name": "Light Rapier",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 400,
   "mass": 2,
   "sourcePages": [
    "LT61",
    "LT68"
   ],
   "damageTypes": [
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wbUrBUfm6vAN5BS8d",
  "tipOf": "wbUrBUfm6vAN5BS8d"
 },
 "wLTM26TipwE0lzQQVszFLQXwve": {
  "modelId": "lt:long-knife",
  "equipmentId": "e2nWZSbk5ADtbp5FG",
  "book": "LT",
  "name": "Long Knife",
  "modeId": "wLTM26TipwE0lzQQVszFLQXwve",
  "sourcePages": [
   "LT56",
   "LT67",
   "LT69",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "1",
   "parry": "0",
   "st": "7"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   },
   {
    "sourceHeader": "SHORTSWORD (DX-5, Broadsword-2, Force Sword-4, Jitte/Sai-3, Knife-4, Saber-4, Smallsword-4, or Tonfa-3)",
    "unmodifiedSkills": [
     "Shortsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Jitte/Sai",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Knife",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Tonfa",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 120,
  "mass": 1.5,
  "ltConstruction": {
   "modelId": "lt:long-knife",
   "name": "Long Knife",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 120,
   "mass": 1.5,
   "sourcePages": [
    "LT56",
    "LT67",
    "LT69"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wE0lzQQVszFLQXwve",
  "tipOf": "wE0lzQQVszFLQXwve"
 },
 "wLTM26TipwiA7o63kK_43igjgB": {
  "modelId": "lt:long-knife",
  "equipmentId": "e2nWZSbk5ADtbp5FG",
  "book": "LT",
  "name": "Long Knife",
  "modeId": "wLTM26TipwiA7o63kK_43igjgB",
  "sourcePages": [
   "LT56",
   "LT67",
   "LT69",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "1",
   "parry": "0",
   "st": "7"
  },
  "primarySkills": [
   "Shortsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "SHORTSWORD (DX-5, Broadsword-2, Force Sword-4, Jitte/Sai-3, Knife-4, Saber-4, Smallsword-4, or Tonfa-3)",
    "unmodifiedSkills": [
     "Shortsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Jitte/Sai",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Knife",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Tonfa",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   },
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 120,
  "mass": 1.5,
  "ltConstruction": {
   "modelId": "lt:long-knife",
   "name": "Long Knife",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 120,
   "mass": 1.5,
   "sourcePages": [
    "LT56",
    "LT67",
    "LT69"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wiA7o63kK_43igjgB",
  "tipOf": "wiA7o63kK_43igjgB"
 },
 "wLTM26TipwkePG9X2bhubKRddv": {
  "modelId": "lt:longsword",
  "equipmentId": "e140WNiazx7pJ3WTT",
  "book": "LT",
  "name": "Longsword",
  "sourcePages": [
   "LT58",
   "LT66",
   "LT70",
   "LT62"
  ],
  "modeId": "wLTM26TipwkePG9X2bhubKRddv",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr cut",
   "reach": "2",
   "parry": "0",
   "st": "10"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "cost": 700,
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "mass": 4,
  "ltConstruction": {
   "modelId": "lt:longsword",
   "name": "Longsword",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 700,
   "mass": 4,
   "sourcePages": [
    "LT58",
    "LT66",
    "LT70"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "baselineMaterial": "steel",
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wkePG9X2bhubKRddv",
  "tipOf": "wkePG9X2bhubKRddv"
 },
 "wLTM26TipwSyyMVFZwpR_0-Gfi": {
  "modelId": "lt:longsword",
  "equipmentId": "e140WNiazx7pJ3WTT",
  "book": "LT",
  "name": "Longsword",
  "sourcePages": [
   "LT58",
   "LT66",
   "LT70",
   "LT62"
  ],
  "modeId": "wLTM26TipwSyyMVFZwpR_0-Gfi",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr+1 cut",
   "reach": "2",
   "parry": "0",
   "st": "9†"
  },
  "primarySkills": [
   "Two-Handed Sword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED SWORD (DX-5, Broadsword-4, or Force Sword-4)",
    "unmodifiedSkills": [
     "Two-Handed Sword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "cost": 700,
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "mass": 4,
  "ltConstruction": {
   "modelId": "lt:longsword",
   "name": "Longsword",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 700,
   "mass": 4,
   "sourcePages": [
    "LT58",
    "LT66",
    "LT70"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "baselineMaterial": "steel",
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wSyyMVFZwpR_0-Gfi",
  "tipOf": "wSyyMVFZwpR_0-Gfi"
 },
 "wLTM26TipwUbyroNVVs8tKm2_I": {
  "modelId": "lt:main-gauche",
  "equipmentId": "ectaYaLbAkCo8RdZ-",
  "book": "LT",
  "name": "Main-Gauche",
  "modeId": "wLTM26TipwUbyroNVVs8tKm2_I",
  "sourcePages": [
   "LT59",
   "LT67",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "1",
   "parry": "0F",
   "st": "6"
  },
  "primarySkills": [
   "Main-Gauche"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "MAIN-GAUCHE (DX-5, Jitte/Sai-4, Knife-4, Rapier-3, Saber-3, or Smallsword-3)",
    "unmodifiedSkills": [
     "Main-Gauche"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Jitte/Sai",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Knife",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 50,
  "mass": 1.25,
  "ltConstruction": {
   "modelId": "lt:main-gauche",
   "name": "Main-Gauche",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 50,
   "mass": 1.25,
   "sourcePages": [
    "LT59",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wUbyroNVVs8tKm2_I",
  "tipOf": "wUbyroNVVs8tKm2_I"
 },
 "wLTM26Tipwumg2JAvAPBaRDqSC": {
  "modelId": "lt:main-gauche",
  "equipmentId": "ectaYaLbAkCo8RdZ-",
  "book": "LT",
  "name": "Main-Gauche",
  "modeId": "wLTM26Tipwumg2JAvAPBaRDqSC",
  "sourcePages": [
   "LT59",
   "LT67",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "C",
   "parry": "0",
   "st": "6"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 50,
  "mass": 1.25,
  "ltConstruction": {
   "modelId": "lt:main-gauche",
   "name": "Main-Gauche",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 50,
   "mass": 1.25,
   "sourcePages": [
    "LT59",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wumg2JAvAPBaRDqSC",
  "tipOf": "wumg2JAvAPBaRDqSC"
 },
 "wLTM26TipwLTM25LongSpikew9A9CuCg38ugDmaPD": {
  "modeId": "wLTM26TipwLTM25LongSpikew9A9CuCg38ugDmaPD",
  "equipmentId": "eCGab_4FOc7eX-oaI",
  "modelId": "lt:medium-shield-heavy",
  "book": "LT",
  "name": "Medium Shield, Heavy",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 60,
  "mass": 14,
  "shieldBaseModeId": "w9A9CuCg38ugDmaPD",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikew9A9CuCg38ugDmaPD",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:medium-shield-heavy"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikew9A9CuCg38ugDmaPD"
 },
 "wLTM26TipwLTM25LongSpikewvIYmB-3MNTDxgckD": {
  "modeId": "wLTM26TipwLTM25LongSpikewvIYmB-3MNTDxgckD",
  "equipmentId": "eAC_bC78eyVqPgCWp",
  "modelId": "lt:medium-shield-light",
  "book": "LT",
  "name": "Medium Shield, Light",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 45,
  "mass": 7,
  "shieldBaseModeId": "wvIYmB-3MNTDxgckD",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewvIYmB-3MNTDxgckD",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:medium-shield-light"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewvIYmB-3MNTDxgckD"
 },
 "wLTM26TipwLTM25LongSpikewkKZcc55t55qJtIBV": {
  "modeId": "wLTM26TipwLTM25LongSpikewkKZcc55t55qJtIBV",
  "equipmentId": "e2hF_R9vE532_PYrY",
  "modelId": "lt:parrying-buckler",
  "book": "LT",
  "name": "Parrying Buckler",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield (Buckler)"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield (Buckler)",
    "unmodifiedSkills": [
     "Shield (Buckler)"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 50,
  "mass": 8,
  "shieldBaseModeId": "wkKZcc55t55qJtIBV",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewkKZcc55t55qJtIBV",
  "parryingBuckler": true,
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:parrying-buckler"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewkKZcc55t55qJtIBV"
 },
 "wLTM26Tipw_k2EXcrqJeAiw25K": {
  "modelId": "lt:pata",
  "equipmentId": "eVFFo97xJS4l_aVcY",
  "book": "LT",
  "name": "Pata",
  "modeId": "wLTM26Tipw_k2EXcrqJeAiw25K",
  "sourcePages": [
   "LT60",
   "LT65",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr+1 cut",
   "reach": "1",
   "parry": "0",
   "st": "10"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 650,
  "mass": 3.75,
  "ltConstruction": {
   "modelId": "lt:pata",
   "name": "Pata",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 650,
   "mass": 3.75,
   "sourcePages": [
    "LT60",
    "LT65"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "w_k2EXcrqJeAiw25K",
  "tipOf": "w_k2EXcrqJeAiw25K"
 },
 "wLTM26TipwpruFvHXqsYCIZer7": {
  "modelId": "lt:rapier",
  "equipmentId": "egIzYm2hrjhoVpPTN",
  "book": "LT",
  "name": "Rapier",
  "modeId": "wLTM26TipwpruFvHXqsYCIZer7",
  "sourcePages": [
   "LT61",
   "LT68",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "2",
   "parry": "0F",
   "st": "9"
  },
  "primarySkills": [
   "Rapier"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "RAPIER (DX-5, Broadsword-4, Main-Gauche-3, Saber-3, or Smallsword-3)",
    "unmodifiedSkills": [
     "Rapier"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 500,
  "mass": 2.75,
  "ltConstruction": {
   "modelId": "lt:rapier",
   "name": "Rapier",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 500,
   "mass": 2.75,
   "sourcePages": [
    "LT61",
    "LT68"
   ],
   "damageTypes": [
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wpruFvHXqsYCIZer7",
  "tipOf": "wpruFvHXqsYCIZer7"
 },
 "wLTM26Tipwl_T_sGUxAQKcfS2Q": {
  "modelId": "lt:rondel-dagger",
  "equipmentId": "exp433xr3rkUj9Wuk",
  "book": "LT",
  "name": "Rondel Dagger",
  "modeId": "wLTM26Tipwl_T_sGUxAQKcfS2Q",
  "sourcePages": [
   "LT56",
   "LT67",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "C",
   "parry": "-1",
   "st": "6"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   },
   {
    "sourceHeader": "MAIN-GAUCHE (DX-5, Jitte/Sai-4, Knife-4, Rapier-3, Saber-3, or Smallsword-3)",
    "unmodifiedSkills": [
     "Main-Gauche"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Jitte/Sai",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Knife",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 40,
  "mass": 1,
  "ltConstruction": {
   "modelId": "lt:rondel-dagger",
   "name": "Rondel Dagger",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 40,
   "mass": 1,
   "sourcePages": [
    "LT56",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wl_T_sGUxAQKcfS2Q",
  "tipOf": "wl_T_sGUxAQKcfS2Q"
 },
 "wLTM26Tipwy8JQukvdXJpwTeXE": {
  "modelId": "lt:rondel-dagger",
  "equipmentId": "exp433xr3rkUj9Wuk",
  "book": "LT",
  "name": "Rondel Dagger",
  "modeId": "wLTM26Tipwy8JQukvdXJpwTeXE",
  "sourcePages": [
   "LT56",
   "LT67",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "C",
   "parry": "0F",
   "st": "6"
  },
  "primarySkills": [
   "Main-Gauche"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "MAIN-GAUCHE (DX-5, Jitte/Sai-4, Knife-4, Rapier-3, Saber-3, or Smallsword-3)",
    "unmodifiedSkills": [
     "Main-Gauche"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Jitte/Sai",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Knife",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   },
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 40,
  "mass": 1,
  "ltConstruction": {
   "modelId": "lt:rondel-dagger",
   "name": "Rondel Dagger",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 40,
   "mass": 1,
   "sourcePages": [
    "LT56",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wy8JQukvdXJpwTeXE",
  "tipOf": "wy8JQukvdXJpwTeXE"
 },
 "wLTM26TipwVTmfof1YAbmwCzMQ": {
  "modelId": "lt:saber",
  "equipmentId": "e2uQrabbceGyYIDmM",
  "book": "LT",
  "name": "Saber",
  "modeId": "wLTM26TipwVTmfof1YAbmwCzMQ",
  "sourcePages": [
   "LT61",
   "LT68",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0F",
   "st": "8"
  },
  "primarySkills": [
   "Saber"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "SABER (DX-5, Broadsword-4, Main-Gauche-3, Rapier-3, Shortsword-4, or Smallsword-3)",
    "unmodifiedSkills": [
     "Saber"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 700,
  "mass": 2,
  "ltConstruction": {
   "modelId": "lt:saber",
   "name": "Saber",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 700,
   "mass": 2,
   "sourcePages": [
    "LT61",
    "LT68"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wVTmfof1YAbmwCzMQ",
  "tipOf": "wVTmfof1YAbmwCzMQ"
 },
 "wLTM26Tipw9VqY3etaLshEIIy0": {
  "modelId": "lt:shortsword",
  "equipmentId": "ez4ZjutUoKa4ORnkj",
  "book": "LT",
  "name": "Shortsword",
  "modeId": "wLTM26Tipw9VqY3etaLshEIIy0",
  "sourcePages": [
   "LT61",
   "LT69",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0",
   "st": "8"
  },
  "primarySkills": [
   "Shortsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "SHORTSWORD (DX-5, Broadsword-2, Force Sword-4, Jitte/Sai-3, Knife-4, Saber-4, Smallsword-4, or Tonfa-3)",
    "unmodifiedSkills": [
     "Shortsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Jitte/Sai",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Knife",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Tonfa",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 400,
  "mass": 2,
  "ltConstruction": {
   "modelId": "lt:shortsword",
   "name": "Shortsword",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 400,
   "mass": 2,
   "sourcePages": [
    "LT61",
    "LT69"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "w9VqY3etaLshEIIy0",
  "tipOf": "w9VqY3etaLshEIIy0"
 },
 "wLTM26TipwZNMkUX7_Izf1ow99": {
  "modelId": "lt:shotel",
  "equipmentId": "eFwe9c7n36mOngrR1",
  "book": "LT",
  "name": "Shotel",
  "modeId": "wLTM26TipwZNMkUX7_Izf1ow99",
  "sourcePages": [
   "LT62",
   "LT65"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0",
   "st": "11"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -2,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 200,
  "mass": 3,
  "ltConstruction": {
   "modelId": "lt:shotel",
   "name": "Shotel",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 200,
   "mass": 3,
   "sourcePages": [
    "LT62",
    "LT65"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wZNMkUX7_Izf1ow99",
  "tipOf": "wZNMkUX7_Izf1ow99"
 },
 "wLTM26TipweACtf6r_LsIgLqXP": {
  "modelId": "lt:small-falchion",
  "equipmentId": "edQFaHvX_nrGL4ra6",
  "book": "LT",
  "name": "Small Falchion",
  "modeId": "wLTM26TipweACtf6r_LsIgLqXP",
  "sourcePages": [
   "LT56",
   "LT69",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-4 cut",
   "reach": "1",
   "parry": "0",
   "st": "8"
  },
  "primarySkills": [
   "Shortsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "SHORTSWORD (DX-5, Broadsword-2, Force Sword-4, Jitte/Sai-3, Knife-4, Saber-4, Smallsword-4, or Tonfa-3)",
    "unmodifiedSkills": [
     "Shortsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Jitte/Sai",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Knife",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Tonfa",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 200,
  "mass": 2,
  "ltConstruction": {
   "modelId": "lt:small-falchion",
   "name": "Small Falchion",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 200,
   "mass": 2,
   "sourcePages": [
    "LT56",
    "LT69"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "weACtf6r_LsIgLqXP",
  "tipOf": "weACtf6r_LsIgLqXP"
 },
 "wLTM26TipwHGmPC_2ji_0bPaq8": {
  "modelId": "lt:small-knife",
  "equipmentId": "ee1kRIRXHzUdofj74",
  "book": "LT",
  "name": "Small Knife",
  "modeId": "wLTM26TipwHGmPC_2ji_0bPaq8",
  "sourcePages": [
   "LT58",
   "LT67",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-3 cut",
   "reach": "C",
   "parry": "-1",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 30,
  "mass": 0.5,
  "ltConstruction": {
   "modelId": "lt:small-knife",
   "name": "Small Knife",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 30,
   "mass": 0.5,
   "sourcePages": [
    "LT58",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wHGmPC_2ji_0bPaq8",
  "tipOf": "wHGmPC_2ji_0bPaq8"
 },
 "wLTM26TipwLTM25LongSpikew_ba5IqxUJHkeuwxy": {
  "modeId": "wLTM26TipwLTM25LongSpikew_ba5IqxUJHkeuwxy",
  "equipmentId": "en0UBIZvVnpiXFMq3",
  "modelId": "lt:small-shield-heavy",
  "book": "LT",
  "name": "Small Shield, Heavy",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 40,
  "mass": 6,
  "shieldBaseModeId": "w_ba5IqxUJHkeuwxy",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikew_ba5IqxUJHkeuwxy",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:small-shield-heavy"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikew_ba5IqxUJHkeuwxy"
 },
 "wLTM26TipwLTM25LongSpikewK1PvIUHo-IHo2_xx": {
  "modeId": "wLTM26TipwLTM25LongSpikewK1PvIUHo-IHo2_xx",
  "equipmentId": "eZQSoCM_oYThNMId6",
  "modelId": "lt:small-shield-light",
  "book": "LT",
  "name": "Small Shield, Light",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 30,
  "mass": 3,
  "shieldBaseModeId": "wK1PvIUHo-IHo2_xx",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewK1PvIUHo-IHo2_xx",
  "ltConstruction": {
   "construction": "shield",
   "qualityClass": "cutting",
   "damageTypes": [
    "cr",
    "cut",
    "imp"
   ],
   "modelId": "lt:small-shield-light"
  },
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewK1PvIUHo-IHo2_xx"
 },
 "wLTM26TipwbJlLT2OmOHM-e7m4": {
  "modelId": "lt:small-throwing-knife",
  "equipmentId": "emViZt-5rQnxGAIVU",
  "book": "LT",
  "name": "Small Throwing Knife",
  "sourcePages": [
   "LT75",
   "LT78",
   "B272",
   "LT62"
  ],
  "modeId": "wLTM26TipwbJlLT2OmOHM-e7m4",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-3 cut",
   "reach": "C",
   "parry": "-2",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -2,
  "cost": 30,
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "parrySkillAlreadyIncluded": -1,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "mass": 0.5,
  "ltConstruction": {
   "modelId": "lt:small-throwing-knife",
   "name": "Small Throwing Knife",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 30,
   "mass": 0.5,
   "sourcePages": [
    "LT75",
    "LT78",
    "B272"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wbJlLT2OmOHM-e7m4",
  "tipOf": "wbJlLT2OmOHM-e7m4"
 },
 "wLTM26TipwW5SH263ihTw2_Cd4": {
  "modelId": "lt:smallsword",
  "equipmentId": "eJdmG2XPlfFC_C8B9",
  "book": "LT",
  "name": "Smallsword",
  "modeId": "wLTM26TipwW5SH263ihTw2_Cd4",
  "sourcePages": [
   "LT61",
   "LT69",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0F",
   "st": "5"
  },
  "primarySkills": [
   "Smallsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "SMALLSWORD (DX-5, Main-Gauche-3, Rapier-3, Saber-3, or Shortsword-4)",
    "unmodifiedSkills": [
     "Smallsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 400,
  "mass": 1.5,
  "ltConstruction": {
   "modelId": "lt:smallsword",
   "name": "Smallsword",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 400,
   "mass": 1.5,
   "sourcePages": [
    "LT61",
    "LT69"
   ],
   "damageTypes": [
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wW5SH263ihTw2_Cd4",
  "tipOf": "wW5SH263ihTw2_Cd4"
 },
 "wLTM26TipwSX8z_LtxMkmixQBc": {
  "modelId": "lt:stiletto",
  "equipmentId": "ehWLoxON1p8yydZwT",
  "book": "LT",
  "name": "Stiletto",
  "modeId": "wLTM26TipwSX8z_LtxMkmixQBc",
  "sourcePages": [
   "LT62",
   "LT67"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-3 cut",
   "reach": "C",
   "parry": "-1",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   },
   {
    "sourceHeader": "MAIN-GAUCHE (DX-5, Jitte/Sai-4, Knife-4, Rapier-3, Saber-3, or Smallsword-3)",
    "unmodifiedSkills": [
     "Main-Gauche"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Jitte/Sai",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Knife",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 20,
  "mass": 0.25,
  "ltConstruction": {
   "modelId": "lt:stiletto",
   "name": "Stiletto",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 20,
   "mass": 0.25,
   "sourcePages": [
    "LT62",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wSX8z_LtxMkmixQBc",
  "tipOf": "wSX8z_LtxMkmixQBc"
 },
 "wLTM26TipwGcH0SjyyoDVdadue": {
  "modelId": "lt:stiletto",
  "equipmentId": "ehWLoxON1p8yydZwT",
  "book": "LT",
  "name": "Stiletto",
  "modeId": "wLTM26TipwGcH0SjyyoDVdadue",
  "sourcePages": [
   "LT62",
   "LT67"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-3 cut",
   "reach": "C",
   "parry": "0F",
   "st": "5"
  },
  "primarySkills": [
   "Main-Gauche"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "MAIN-GAUCHE (DX-5, Jitte/Sai-4, Knife-4, Rapier-3, Saber-3, or Smallsword-3)",
    "unmodifiedSkills": [
     "Main-Gauche"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Jitte/Sai",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Knife",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Smallsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   },
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 20,
  "mass": 0.25,
  "ltConstruction": {
   "modelId": "lt:stiletto",
   "name": "Stiletto",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 20,
   "mass": 0.25,
   "sourcePages": [
    "LT62",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wGcH0SjyyoDVdadue",
  "tipOf": "wGcH0SjyyoDVdadue"
 },
 "wLTM26Tipw83g2u0G5r1-hRrGh": {
  "modelId": "lt:thrusting-bastard-sword",
  "equipmentId": "eZ5VeRUQ_ElV7L2cl",
  "book": "LT",
  "name": "Thrusting Bastard Sword",
  "modeId": "wLTM26Tipw83g2u0G5r1-hRrGh",
  "sourcePages": [
   "LT54",
   "LT66",
   "LT70",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr cut",
   "reach": "2",
   "parry": "0U",
   "st": "11"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 750,
  "mass": 5,
  "ltConstruction": {
   "modelId": "lt:thrusting-bastard-sword",
   "name": "Thrusting Bastard Sword",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 750,
   "mass": 5,
   "sourcePages": [
    "LT54",
    "LT66",
    "LT70"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "w83g2u0G5r1-hRrGh",
  "tipOf": "w83g2u0G5r1-hRrGh"
 },
 "wLTM26Tipwksr-kvhYKVTQ_2zT": {
  "modelId": "lt:thrusting-bastard-sword",
  "equipmentId": "eZ5VeRUQ_ElV7L2cl",
  "book": "LT",
  "name": "Thrusting Bastard Sword",
  "modeId": "wLTM26Tipwksr-kvhYKVTQ_2zT",
  "sourcePages": [
   "LT54",
   "LT66",
   "LT70",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr+1 cut",
   "reach": "2",
   "parry": "0",
   "st": "10†"
  },
  "primarySkills": [
   "Two-Handed Sword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED SWORD (DX-5, Broadsword-4, or Force Sword-4)",
    "unmodifiedSkills": [
     "Two-Handed Sword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 750,
  "mass": 5,
  "ltConstruction": {
   "modelId": "lt:thrusting-bastard-sword",
   "name": "Thrusting Bastard Sword",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 750,
   "mass": 5,
   "sourcePages": [
    "LT54",
    "LT66",
    "LT70"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wksr-kvhYKVTQ_2zT",
  "tipOf": "wksr-kvhYKVTQ_2zT"
 },
 "wLTM26TipwYOBxn9NJwkZPg_oW": {
  "modelId": "lt:thrusting-broadsword",
  "equipmentId": "eTZgf42cuj04t5Sej",
  "book": "LT",
  "name": "Thrusting Broadsword",
  "modeId": "wLTM26TipwYOBxn9NJwkZPg_oW",
  "sourcePages": [
   "LT55",
   "LT65",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr cut",
   "reach": "1",
   "parry": "0",
   "st": "10"
  },
  "primarySkills": [
   "Broadsword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "BROADSWORD (DX-5, Force Sword-4, Rapier-4, Saber-4, Shortsword-2, or Two-Handed Sword-4)",
    "unmodifiedSkills": [
     "Broadsword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Rapier",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Saber",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Two-Handed Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 600,
  "mass": 3,
  "ltConstruction": {
   "modelId": "lt:thrusting-broadsword",
   "name": "Thrusting Broadsword",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 600,
   "mass": 3,
   "sourcePages": [
    "LT55",
    "LT65"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wYOBxn9NJwkZPg_oW",
  "tipOf": "wYOBxn9NJwkZPg_oW"
 },
 "wLTM26TipwwqpD5QdjCCHn-McW": {
  "modelId": "lt:thrusting-greatsword",
  "equipmentId": "eKOnhuOmt2tBEfyeK",
  "book": "LT",
  "name": "Thrusting Greatsword",
  "modeId": "wLTM26TipwwqpD5QdjCCHn-McW",
  "sourcePages": [
   "LT56",
   "LT70",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr+1 cut",
   "reach": "2",
   "parry": "0",
   "st": "12†"
  },
  "primarySkills": [
   "Two-Handed Sword"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "TWO-HANDED SWORD (DX-5, Broadsword-4, or Force Sword-4)",
    "unmodifiedSkills": [
     "Two-Handed Sword"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Broadsword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "cost": 900,
  "mass": 7,
  "ltConstruction": {
   "modelId": "lt:thrusting-greatsword",
   "name": "Thrusting Greatsword",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 900,
   "mass": 7,
   "sourcePages": [
    "LT56",
    "LT70"
   ],
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wwqpD5QdjCCHn-McW",
  "tipOf": "wwqpD5QdjCCHn-McW"
 },
 "wLTM26TipwJyE5rQzEJSt7shYB": {
  "modelId": "lt:wooden-stake",
  "equipmentId": "e3m2R0EN6occeIRSW",
  "book": "LT",
  "name": "Wooden Stake",
  "modeId": "wLTM26TipwJyE5rQzEJSt7shYB",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2(0.5) cut",
   "reach": "C",
   "parry": "-1",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "attackModifier": 0,
  "sourceOptions": [
   {
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute"
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill"
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill"
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill"
     }
    ]
   }
  ],
  "cost": 4,
  "mass": 0.5,
  "sourcePages": [
   "LT64",
   "LT67",
   "LT62"
  ],
  "ltConstruction": {
   "modelId": "lt:wooden-stake",
   "name": "Wooden Stake",
   "qualityClass": "impaling",
   "construction": "wooden-stake",
   "cost": 4,
   "mass": 0.5,
   "sourcePages": [
    "LT64",
    "LT67"
   ],
   "damageTypes": [
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 2,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "wood",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "martialGrips": [],
  "hands": 1,
  "sourceFieldsBefore": null,
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wJyE5rQzEJSt7shYB",
  "tipOf": "wJyE5rQzEJSt7shYB"
 },
 "wLTM26TipwLTM21HaladieThrust": {
  "modelId": "lt:haladie",
  "equipmentId": "eLTM21Haladie",
  "book": "LT",
  "name": "Haladie",
  "modeId": "wLTM26TipwLTM21HaladieThrust",
  "sourcePages": [
   "LT56",
   "LT67",
   "MA111-112",
   "LT62"
  ],
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "C",
   "parry": "-1",
   "st": "6"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "KNIFE (DX-4, Force Sword-3, Main-Gauche-3, or Shortsword-3)",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -1,
  "damagePart": "blade",
  "sourceFieldsBefore": null,
  "sourceOnlyId": "lt:haladie:source:2",
  "cost": 80,
  "mass": 1.5,
  "ltConstruction": {
   "modelId": "lt:haladie",
   "name": "Haladie",
   "qualityClass": "sword",
   "construction": "blade",
   "cost": 80,
   "mass": 1.5,
   "sourcePages": [
    "LT56",
    "LT67"
   ],
   "shortBlade": true,
   "damageTypes": [
    "cut",
    "imp"
   ]
  },
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 3,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 19,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "displayUsage": true,
  "motion": "swing",
  "templateModeId": "wLTM21HaladieThrust",
  "tipOf": "wLTM21HaladieThrust"
 },
 "wLTM26TipwLTM26ltarroworboltThrust": {
  "modelId": "lt:arrow-or-bolt",
  "equipmentId": "eLTM26arroworbolt",
  "name": "Arrow or Bolt",
  "techLevel": null,
  "cost": null,
  "mass": null,
  "improvised": true,
  "construction": "fixed",
  "qualityClass": "crushing",
  "sourcePages": [
   "LT63",
   "LT67",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltarroworboltThrust",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-3 cut",
   "reach": "C",
   "parry": "No",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Knife",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "striking-part",
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0,
    "breakage": 2
   }
  ],
  "damageCap": "1d-4",
  "hints": [
   "Обычный наконечник. Барбы и иной тип наконечника выбираются вручную по LT73; предел Damage 1d−4. Поломка на 1–3 после успешного удара/парирования – вручную."
  ],
  "ltConstruction": {
   "construction": "fixed",
   "qualityClass": "crushing",
   "damageTypes": [
    "imp"
   ],
   "modelId": "lt:arrow-or-bolt",
   "improvised": true
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltarroworboltThrust",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltarroworboltThrust"
 },
 "wLTM26TipwLTM26ltbottlebrokenThrust": {
  "modelId": "lt:bottle-broken",
  "equipmentId": "eLTM26bottlebroken",
  "name": "Bottle, Broken",
  "techLevel": null,
  "cost": null,
  "mass": null,
  "improvised": true,
  "construction": "fixed",
  "qualityClass": "crushing",
  "sourcePages": [
   "LT63",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltbottlebrokenThrust",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-3(0.5) cut",
   "reach": "C",
   "parry": "No",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Knife",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -2,
  "hands": 1,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "striking-part",
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0,
    "breakage": 2
   }
  ],
  "ltConstruction": {
   "construction": "fixed",
   "qualityClass": "crushing",
   "damageTypes": [
    "imp"
   ],
   "modelId": "lt:bottle-broken",
   "improvised": true
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltbottlebrokenThrust",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltbottlebrokenThrust"
 },
 "wLTM26TipwLTM26ltcaltropPunch": {
  "modelId": "lt:caltrop",
  "equipmentId": "eLTM26caltrop",
  "name": "Caltrop",
  "techLevel": null,
  "cost": null,
  "mass": null,
  "improvised": true,
  "construction": "fixed",
  "qualityClass": "crushing",
  "sourcePages": [
   "LT63",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltcaltropPunch",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-4 cut",
   "reach": "C",
   "parry": "0",
   "st": null
  },
  "primarySkills": [
   "Brawling"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Brawling",
    "unmodifiedSkills": [
     "Brawling"
    ],
    "defaults": []
   }
  ],
  "attackModifier": -2,
  "hands": 1,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "point",
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0,
    "breakage": 2
   }
  ],
  "unarmedSkillBonus": true,
  "ltConstruction": {
   "construction": "fixed",
   "qualityClass": "crushing",
   "damageTypes": [
    "imp"
   ],
   "modelId": "lt:caltrop",
   "improvised": true
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltcaltropPunch",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltcaltropPunch"
 },
 "wLTM26TipwLTM26ltpenorstylusThrust": {
  "modelId": "lt:pen-or-stylus",
  "equipmentId": "eLTM26penorstylus",
  "name": "Pen or Stylus",
  "techLevel": null,
  "cost": null,
  "mass": null,
  "improvised": true,
  "construction": "fixed",
  "qualityClass": "crushing",
  "sourcePages": [
   "LT63",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltpenorstylusThrust",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-5 cut",
   "reach": "C",
   "parry": "No",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Knife",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -1,
  "hands": 1,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "striking-part",
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0,
    "breakage": 2
   }
  ],
  "ltConstruction": {
   "construction": "fixed",
   "qualityClass": "crushing",
   "damageTypes": [
    "imp"
   ],
   "modelId": "lt:pen-or-stylus",
   "improvised": true
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltpenorstylusThrust",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltpenorstylusThrust"
 },
 "wLTM26TipwLTM26ltpenorstylusHugepen": {
  "modelId": "lt:pen-or-stylus",
  "equipmentId": "eLTM26PenHuge",
  "name": "Pen or Stylus (huge)",
  "techLevel": null,
  "cost": null,
  "mass": null,
  "improvised": true,
  "construction": "fixed",
  "qualityClass": "crushing",
  "sourcePages": [
   "LT63",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltpenorstylusHugepen",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-4 cut",
   "reach": "C",
   "parry": "No",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Knife",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -1,
  "hands": 1,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "striking-part",
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0,
    "breakage": 2
   }
  ],
  "ltConstruction": {
   "construction": "fixed",
   "qualityClass": "crushing",
   "damageTypes": [
    "imp"
   ],
   "modelId": "lt:pen-or-stylus",
   "improvised": true
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltpenorstylusHugepen",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltpenorstylusHugepen"
 },
 "wLTM26TipwLTM26ltpitchforkOnehand": {
  "modelId": "lt:pitchfork",
  "equipmentId": "eLTM26pitchfork",
  "name": "Pitchfork",
  "techLevel": null,
  "cost": null,
  "mass": null,
  "improvised": true,
  "construction": "fixed",
  "qualityClass": "crushing",
  "sourcePages": [
   "LT63",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltpitchforkOnehand",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr(0.5) cut",
   "reach": "1",
   "parry": "0U",
   "st": "11"
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -2,
  "hands": 1,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "striking-part",
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0,
    "breakage": 2
   }
  ],
  "ltConstruction": {
   "construction": "fixed",
   "qualityClass": "crushing",
   "damageTypes": [
    "imp"
   ],
   "modelId": "lt:pitchfork",
   "improvised": true
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltpitchforkOnehand",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltpitchforkOnehand"
 },
 "wLTM26TipwLTM26ltpitchforkTwohands": {
  "modelId": "lt:pitchfork",
  "equipmentId": "eLTM26pitchfork",
  "name": "Pitchfork",
  "techLevel": null,
  "cost": null,
  "mass": null,
  "improvised": true,
  "construction": "fixed",
  "qualityClass": "crushing",
  "sourcePages": [
   "LT63",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltpitchforkTwohands",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr+1(0.5) cut",
   "reach": "2",
   "parry": "0",
   "st": "10†"
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -2,
  "hands": 2,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "striking-part",
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0,
    "breakage": 2
   }
  ],
  "ltConstruction": {
   "construction": "fixed",
   "qualityClass": "crushing",
   "damageTypes": [
    "imp"
   ],
   "modelId": "lt:pitchfork",
   "improvised": true
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltpitchforkTwohands",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltpitchforkTwohands"
 },
 "wLTM26TipwLTM26ltspindlespikeorspitSmallspit": {
  "modelId": "lt:spindle-spike-or-spit",
  "equipmentId": "eLTM26spindlespikeorspit",
  "name": "Spit (small)",
  "techLevel": null,
  "cost": null,
  "mass": null,
  "improvised": true,
  "construction": "fixed",
  "qualityClass": "crushing",
  "sourcePages": [
   "LT63",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltspindlespikeorspitSmallspit",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-5 cut",
   "reach": "C",
   "parry": "-1",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Knife",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -2,
  "hands": 1,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "striking-part",
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0,
    "breakage": 2
   }
  ],
  "ltConstruction": {
   "construction": "fixed",
   "qualityClass": "crushing",
   "damageTypes": [
    "imp"
   ],
   "modelId": "lt:spindle-spike-or-spit",
   "improvised": true
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltspindlespikeorspitSmallspit",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltspindlespikeorspitSmallspit"
 },
 "wLTM26TipwLTM26ltspindlespikeorspitSpike": {
  "modelId": "lt:spindle-spike-or-spit",
  "equipmentId": "eLTM26SpindleDagger",
  "name": "Spindle, Spike, or Spit (dagger size)",
  "techLevel": null,
  "cost": null,
  "mass": null,
  "improvised": true,
  "construction": "fixed",
  "qualityClass": "crushing",
  "sourcePages": [
   "LT63",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltspindlespikeorspitSpike",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-4 cut",
   "reach": "C",
   "parry": "-1",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Knife",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -2,
  "hands": 1,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "striking-part",
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0,
    "breakage": 2
   }
  ],
  "ltConstruction": {
   "construction": "fixed",
   "qualityClass": "crushing",
   "damageTypes": [
    "imp"
   ],
   "modelId": "lt:spindle-spike-or-spit",
   "improvised": true
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltspindlespikeorspitSpike",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltspindlespikeorspitSpike"
 },
 "wLTM26TipwLTM26ltspindlespikeorspitLongspitthrust": {
  "modelId": "lt:spindle-spike-or-spit",
  "equipmentId": "eLTM26SpindleLong",
  "name": "Spindle or Spit (long)",
  "techLevel": null,
  "cost": null,
  "mass": null,
  "improvised": true,
  "construction": "fixed",
  "qualityClass": "crushing",
  "sourcePages": [
   "LT63",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltspindlespikeorspitLongspitthrust",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-3 cut",
   "reach": "C",
   "parry": "-1",
   "st": "6"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Knife",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -2,
  "hands": 1,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "striking-part",
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0,
    "breakage": 2
   }
  ],
  "ltConstruction": {
   "construction": "fixed",
   "qualityClass": "crushing",
   "damageTypes": [
    "imp"
   ],
   "modelId": "lt:spindle-spike-or-spit",
   "improvised": true
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltspindlespikeorspitLongspitthrust",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltspindlespikeorspitLongspitthrust"
 },
 "wLTM26TipwLTM26ltfishingspearThrust": {
  "modelId": "lt:fishing-spear",
  "equipmentId": "eLTM26fishingspear",
  "name": "Fishing Spear",
  "techLevel": 0,
  "cost": 30,
  "mass": 2,
  "improvised": false,
  "construction": "blade",
  "qualityClass": "impaling",
  "sourcePages": [
   "LT29",
   "LT69",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltfishingspearThrust",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "0",
   "st": "6"
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "striking-part",
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 2,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "hints": [
   "Штраф −2 LT29 относится только к метанию; обычный melee Thrust его не получает."
  ],
  "ltConstruction": {
   "modelId": "lt:fishing-spear",
   "equipmentId": "eLTM26fishingspear",
   "name": "Fishing Spear",
   "techLevel": 0,
   "cost": 30,
   "mass": 2,
   "improvised": false,
   "construction": "blade",
   "qualityClass": "impaling",
   "sourcePages": [
    "LT29",
    "LT69"
   ],
   "book": "LT",
   "modeId": "wLTM26ltfishingspearThrust",
   "usage": "Thrust",
   "stats": {
    "damage": "thr+1 imp",
    "reach": "1",
    "parry": "0",
    "st": "6"
   },
   "primarySkills": [
    "Spear"
   ],
   "sourceOptions": [
    {
     "sourceHeader": "Spear",
     "unmodifiedSkills": [
      "Spear"
     ],
     "defaults": [
      {
       "from": "DX",
       "modifier": -5,
       "type": "attribute",
       "recursive": false
      },
      {
       "from": "Polearm",
       "modifier": -4,
       "type": "skill",
       "recursive": false
      },
      {
       "from": "Staff",
       "modifier": -2,
       "type": "skill",
       "recursive": false
      }
     ]
    }
   ],
   "attackModifier": 0,
   "hands": 1,
   "martialGrips": [],
   "displayUsage": true,
   "damagePart": "striking-part",
   "baselineQuality": "Good",
   "baselineMaterial": "published",
   "balanceOptions": [],
   "qualityOptions": [],
   "hints": [
    "Штраф −2 LT29 относится только к метанию; обычный melee Thrust его не получает."
   ],
   "damageTypes": [
    "imp"
   ]
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltfishingspearThrust",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltfishingspearThrust"
 },
 "wLTM26TipwLTM26ltbayonetThrust": {
  "modelId": "lt:bayonet",
  "equipmentId": "eLTM26bayonet",
  "name": "Bayonet (detached)",
  "techLevel": 4,
  "cost": 40,
  "mass": 1,
  "improvised": false,
  "construction": "blade",
  "qualityClass": "cutting",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT67",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltbayonetThrust",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-2 cut",
   "reach": "C",
   "parry": "-1",
   "st": "6"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Knife",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "striking-part",
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 9,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "ltConstruction": {
   "modelId": "lt:bayonet",
   "equipmentId": "eLTM26bayonet",
   "name": "Bayonet (detached)",
   "techLevel": 4,
   "cost": 40,
   "mass": 1,
   "improvised": false,
   "construction": "blade",
   "qualityClass": "cutting",
   "sourcePages": [
    "LT54",
    "LT55",
    "LT67"
   ],
   "book": "LT",
   "modeId": "wLTM26ltbayonetThrust",
   "usage": "Thrust",
   "stats": {
    "damage": "thr imp",
    "reach": "C",
    "parry": "-1",
    "st": "6"
   },
   "primarySkills": [
    "Knife"
   ],
   "sourceOptions": [
    {
     "sourceHeader": "Knife",
     "unmodifiedSkills": [
      "Knife"
     ],
     "defaults": [
      {
       "from": "DX",
       "modifier": -4,
       "type": "attribute",
       "recursive": false
      },
      {
       "from": "Force Sword",
       "modifier": -3,
       "type": "skill",
       "recursive": false
      },
      {
       "from": "Main-Gauche",
       "modifier": -3,
       "type": "skill",
       "recursive": false
      },
      {
       "from": "Shortsword",
       "modifier": -3,
       "type": "skill",
       "recursive": false
      }
     ]
    }
   ],
   "attackModifier": 0,
   "hands": 1,
   "martialGrips": [],
   "displayUsage": true,
   "damagePart": "striking-part",
   "baselineQuality": "Good",
   "baselineMaterial": "published",
   "balanceOptions": [],
   "qualityOptions": [],
   "damageTypes": [
    "imp"
   ]
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltbayonetThrust",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltbayonetThrust"
 },
 "wLTM26TipwLTM26ltpitonThrust": {
  "modelId": "lt:piton",
  "equipmentId": "eLTM26piton",
  "name": "Piton",
  "techLevel": 2,
  "cost": 4,
  "mass": 0.75,
  "improvised": false,
  "construction": "blade",
  "qualityClass": "impaling",
  "sourcePages": [
   "LT125",
   "LT67",
   "LT62"
  ],
  "book": "LT",
  "modeId": "wLTM26TipwLTM26ltpitonThrust",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-3 cut",
   "reach": "C",
   "parry": "-1",
   "st": "5"
  },
  "primarySkills": [
   "Knife"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Knife",
    "unmodifiedSkills": [
     "Knife"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -4,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Force Sword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Main-Gauche",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Shortsword",
      "modifier": -3,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": -2,
  "hands": 1,
  "martialGrips": [],
  "displayUsage": true,
  "damagePart": "striking-part",
  "baselineQuality": "Good",
  "baselineMaterial": "steel",
  "balanceOptions": [
   {
    "level": "Normal",
    "label": "Обычная",
    "skillBonus": 0,
    "costFactor": 0
   },
   {
    "level": "Balanced",
    "skillBonus": 1,
    "costFactor": 4
   },
   {
    "level": "Poorly Balanced",
    "skillBonus": -1,
    "costFactor": -0.6
   }
  ],
  "qualityOptions": [
   {
    "level": "Good",
    "costFactor": 0,
    "damageBonus": 0,
    "breakage": 0,
    "massMultiplier": 1
   },
   {
    "level": "Cheap",
    "costFactor": -0.6,
    "damageBonus": 0,
    "breakage": 2,
    "massMultiplier": 1
   },
   {
    "level": "Fine",
    "costFactor": 2,
    "damageBonus": 1,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -1,
    "massMultiplier": 1
   },
   {
    "level": "Very Fine",
    "costFactor": 49,
    "damageBonus": 2,
    "damageTypes": [
     "cut",
     "imp"
    ],
    "breakage": -2,
    "massMultiplier": 1
   }
  ],
  "ltConstruction": {
   "modelId": "lt:piton",
   "equipmentId": "eLTM26piton",
   "name": "Piton",
   "techLevel": 2,
   "cost": 4,
   "mass": 0.75,
   "improvised": false,
   "construction": "blade",
   "qualityClass": "impaling",
   "sourcePages": [
    "LT125",
    "LT67"
   ],
   "book": "LT",
   "modeId": "wLTM26ltpitonThrust",
   "usage": "Thrust",
   "stats": {
    "damage": "thr-1 imp",
    "reach": "C",
    "parry": "-1",
    "st": "5"
   },
   "primarySkills": [
    "Knife"
   ],
   "sourceOptions": [
    {
     "sourceHeader": "Knife",
     "unmodifiedSkills": [
      "Knife"
     ],
     "defaults": [
      {
       "from": "DX",
       "modifier": -4,
       "type": "attribute",
       "recursive": false
      },
      {
       "from": "Force Sword",
       "modifier": -3,
       "type": "skill",
       "recursive": false
      },
      {
       "from": "Main-Gauche",
       "modifier": -3,
       "type": "skill",
       "recursive": false
      },
      {
       "from": "Shortsword",
       "modifier": -3,
       "type": "skill",
       "recursive": false
      }
     ]
    }
   ],
   "attackModifier": -2,
   "hands": 1,
   "martialGrips": [],
   "displayUsage": true,
   "damagePart": "striking-part",
   "baselineQuality": "Good",
   "baselineMaterial": "published",
   "balanceOptions": [],
   "qualityOptions": [],
   "damageTypes": [
    "imp"
   ]
  },
  "motion": "swing",
  "templateModeId": "wLTM26ltpitonThrust",
  "sourceFieldsBefore": null,
  "tipOf": "wLTM26ltpitonThrust"
 },
 "wLTM26TipwLTM26BayoneteUstq-45wBk7_FmeT": {
  "modelId": "lt:bayonet",
  "equipmentId": "eUstq-45wBk7_FmeT",
  "book": "LT",
  "name": "Arquebus",
  "modeId": "wLTM26TipwLTM26BayoneteUstq-45wBk7_FmeT",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteUstq-45wBk7_FmeT",
  "motion": "swing",
  "tipOf": "wLTM26BayoneteUstq-45wBk7_FmeT"
 },
 "wLTM26TipwLTM26BayoneteWrPImwlzokA72wRG": {
  "modelId": "lt:bayonet",
  "equipmentId": "eWrPImwlzokA72wRG",
  "book": "LT",
  "name": "Blunderbuss",
  "modeId": "wLTM26TipwLTM26BayoneteWrPImwlzokA72wRG",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteWrPImwlzokA72wRG",
  "motion": "swing",
  "tipOf": "wLTM26BayoneteWrPImwlzokA72wRG"
 },
 "wLTM26TipwLTM26BayoneteJ9fllNnD0219w6js": {
  "modelId": "lt:bayonet",
  "equipmentId": "eJ9fllNnD0219w6js",
  "book": "LT",
  "name": "Breechloading Carbine",
  "modeId": "wLTM26TipwLTM26BayoneteJ9fllNnD0219w6js",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteJ9fllNnD0219w6js",
  "motion": "swing",
  "tipOf": "wLTM26BayoneteJ9fllNnD0219w6js"
 },
 "wLTM26TipwLTM26BayoneteT_f8WXR8mRNOpLSl": {
  "modelId": "lt:bayonet",
  "equipmentId": "eT_f8WXR8mRNOpLSl",
  "book": "LT",
  "name": "Buccaneer Fusil",
  "modeId": "wLTM26TipwLTM26BayoneteT_f8WXR8mRNOpLSl",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteT_f8WXR8mRNOpLSl",
  "motion": "swing",
  "tipOf": "wLTM26BayoneteT_f8WXR8mRNOpLSl"
 },
 "wLTM26TipwLTM26BayonetePh8_14rCd7DrMUhP": {
  "modelId": "lt:bayonet",
  "equipmentId": "ePh8_14rCd7DrMUhP",
  "book": "LT",
  "name": "Caliver",
  "modeId": "wLTM26TipwLTM26BayonetePh8_14rCd7DrMUhP",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayonetePh8_14rCd7DrMUhP",
  "motion": "swing",
  "tipOf": "wLTM26BayonetePh8_14rCd7DrMUhP"
 },
 "wLTM26TipwLTM26BayoneteDwly9qJ7ondSbli6": {
  "modelId": "lt:bayonet",
  "equipmentId": "eDwly9qJ7ondSbli6",
  "book": "LT",
  "name": "Carbine",
  "modeId": "wLTM26TipwLTM26BayoneteDwly9qJ7ondSbli6",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteDwly9qJ7ondSbli6",
  "motion": "swing",
  "tipOf": "wLTM26BayoneteDwly9qJ7ondSbli6"
 },
 "wLTM26TipwLTM26Bayoneteqm-l8KNxjOGPkr2y": {
  "modelId": "lt:bayonet",
  "equipmentId": "eqm-l8KNxjOGPkr2y",
  "book": "LT",
  "name": "Flintlock Carbine",
  "modeId": "wLTM26TipwLTM26Bayoneteqm-l8KNxjOGPkr2y",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26Bayoneteqm-l8KNxjOGPkr2y",
  "motion": "swing",
  "tipOf": "wLTM26Bayoneteqm-l8KNxjOGPkr2y"
 },
 "wLTM26TipwLTM26Bayonete9FqkRToOywT7jj5F": {
  "modelId": "lt:bayonet",
  "equipmentId": "e9FqkRToOywT7jj5F",
  "book": "LT",
  "name": "Fowling Piece, Double",
  "modeId": "wLTM26TipwLTM26Bayonete9FqkRToOywT7jj5F",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26Bayonete9FqkRToOywT7jj5F",
  "motion": "swing",
  "tipOf": "wLTM26Bayonete9FqkRToOywT7jj5F"
 },
 "wLTM26TipwLTM26BayoneteeJsYOXLUOfaJPTWK": {
  "modelId": "lt:bayonet",
  "equipmentId": "eeJsYOXLUOfaJPTWK",
  "book": "LT",
  "name": "Fowling Piece, Single",
  "modeId": "wLTM26TipwLTM26BayoneteeJsYOXLUOfaJPTWK",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteeJsYOXLUOfaJPTWK",
  "motion": "swing",
  "tipOf": "wLTM26BayoneteeJsYOXLUOfaJPTWK"
 },
 "wLTM26TipwLTM26BayoneteP4YOxuKnf5Y3AIuA": {
  "modelId": "lt:bayonet",
  "equipmentId": "eP4YOxuKnf5Y3AIuA",
  "book": "LT",
  "name": "Fusil de Chasse",
  "modeId": "wLTM26TipwLTM26BayoneteP4YOxuKnf5Y3AIuA",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteP4YOxuKnf5Y3AIuA",
  "motion": "swing",
  "tipOf": "wLTM26BayoneteP4YOxuKnf5Y3AIuA"
 },
 "wLTM26TipwLTM26BayoneteObrfS7vuahB9FW9i": {
  "modelId": "lt:bayonet",
  "equipmentId": "eObrfS7vuahB9FW9i",
  "book": "LT",
  "name": "Fusil Ordinaire",
  "modeId": "wLTM26TipwLTM26BayoneteObrfS7vuahB9FW9i",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteObrfS7vuahB9FW9i",
  "motion": "swing",
  "tipOf": "wLTM26BayoneteObrfS7vuahB9FW9i"
 },
 "wLTM26TipwLTM26Bayoneten4F5-Hs9cuPtw0ed": {
  "modelId": "lt:bayonet",
  "equipmentId": "en4F5-Hs9cuPtw0ed",
  "book": "LT",
  "name": "Jäger Rifle",
  "modeId": "wLTM26TipwLTM26Bayoneten4F5-Hs9cuPtw0ed",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26Bayoneten4F5-Hs9cuPtw0ed",
  "motion": "swing",
  "tipOf": "wLTM26Bayoneten4F5-Hs9cuPtw0ed"
 },
 "wLTM26TipwLTM26Bayonete1d5I1DEgBx7csoY9": {
  "modelId": "lt:bayonet",
  "equipmentId": "e1d5I1DEgBx7csoY9",
  "book": "LT",
  "name": "Jäger Rifle, Double-Barreled",
  "modeId": "wLTM26TipwLTM26Bayonete1d5I1DEgBx7csoY9",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26Bayonete1d5I1DEgBx7csoY9",
  "motion": "swing",
  "tipOf": "wLTM26Bayonete1d5I1DEgBx7csoY9"
 },
 "wLTM26TipwLTM26BayoneteikIB_Ocnu5vBx_AY": {
  "modelId": "lt:bayonet",
  "equipmentId": "eikIB_Ocnu5vBx_AY",
  "book": "LT",
  "name": "Musket",
  "modeId": "wLTM26TipwLTM26BayoneteikIB_Ocnu5vBx_AY",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteikIB_Ocnu5vBx_AY",
  "motion": "swing",
  "tipOf": "wLTM26BayoneteikIB_Ocnu5vBx_AY"
 },
 "wLTM26TipwLTM26BayoneteR0fxLNLai2FOHu7t": {
  "modelId": "lt:bayonet",
  "equipmentId": "eR0fxLNLai2FOHu7t",
  "book": "LT",
  "name": "Teppo",
  "modeId": "wLTM26TipwLTM26BayoneteR0fxLNLai2FOHu7t",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteR0fxLNLai2FOHu7t",
  "motion": "swing",
  "tipOf": "wLTM26BayoneteR0fxLNLai2FOHu7t"
 },
 "wLTM26TipwLTM26BayoneteMM2x0c5BYnpcGNh2": {
  "modelId": "lt:bayonet",
  "equipmentId": "eMM2x0c5BYnpcGNh2",
  "book": "LT",
  "name": "Winged Tiger Gun",
  "modeId": "wLTM26TipwLTM26BayoneteMM2x0c5BYnpcGNh2",
  "usage": "Bayonet Tip Slash - fitted and mounted",
  "displayUsage": true,
  "stats": {
   "damage": "thr+1 cut",
   "reach": null,
   "parry": null,
   "st": null
  },
  "primarySkills": [
   "Spear"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Spear",
    "unmodifiedSkills": [
     "Spear"
    ],
    "defaults": [
     {
      "from": "DX",
      "modifier": -5,
      "type": "attribute",
      "recursive": false
     },
     {
      "from": "Polearm",
      "modifier": -4,
      "type": "skill",
      "recursive": false
     },
     {
      "from": "Staff",
      "modifier": -2,
      "type": "skill",
      "recursive": false
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 2,
  "martialGrips": [],
  "improvised": true,
  "baselineQuality": "Cheap",
  "baselineMaterial": "published",
  "qualityOptions": [
   {
    "level": "Cheap",
    "damageBonus": 0
   }
  ],
  "balanceOptions": [],
  "cost": null,
  "mass": null,
  "damagePart": "mounted-bayonet",
  "sourcePages": [
   "LT54",
   "LT55",
   "LT69",
   "LT62"
  ],
  "hostRule": "LT54-custom-fit-bayonet",
  "templateModeId": "wLTM26BayoneteMM2x0c5BYnpcGNh2",
  "motion": "swing",
  "tipOf": "wLTM26BayoneteMM2x0c5BYnpcGNh2"
 },
 "wLTM26TipwLTM25LongSpikewekjDm-aDxkWk8F9m": {
  "modeId": "wLTM26TipwLTM25LongSpikewekjDm-aDxkWk8F9m",
  "equipmentId": "eKw6vIzpzM-liA6SM",
  "modelId": "lt:roman-scutum-large",
  "book": "LT",
  "name": "Roman Scutum, Large",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT115",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 200,
  "mass": 22,
  "shieldBaseModeId": "wekjDm-aDxkWk8F9m",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikewekjDm-aDxkWk8F9m",
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikewekjDm-aDxkWk8F9m"
 },
 "wLTM26TipwLTM25LongSpikew4t370RBCVyiebGF6": {
  "modeId": "wLTM26TipwLTM25LongSpikew4t370RBCVyiebGF6",
  "equipmentId": "eDvyuVqXXIYxrK9O3",
  "modelId": "lt:roman-scutum-medium",
  "book": "LT",
  "name": "Roman Scutum, Medium",
  "usage": "Tip Slash",
  "stats": {
   "damage": "thr-1 cut",
   "reach": "1",
   "parry": "No",
   "st": null
  },
  "primarySkills": [
   "Shield"
  ],
  "sourceOptions": [
   {
    "sourceHeader": "Shield",
    "unmodifiedSkills": [
     "Shield"
    ],
    "defaults": [
     {
      "modifier": -4,
      "type": "attribute",
      "recursive": false,
      "from": "DX"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Buckler)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Force)"
     },
     {
      "modifier": -2,
      "type": "skill",
      "recursive": false,
      "from": "Shield (Guige)"
     }
    ]
   }
  ],
  "attackModifier": 0,
  "hands": 1,
  "martialGrips": [],
  "damagePart": "shield-point",
  "tooltipHints": true,
  "sourcePages": [
   "LT68",
   "LT113",
   "LT114",
   "LT116",
   "B220",
   "B287",
   "LT115",
   "LT62"
  ],
  "sourceFieldsBefore": null,
  "shield": true,
  "cost": 140,
  "mass": 16,
  "shieldBaseModeId": "w4t370RBCVyiebGF6",
  "requiredFitting": "shield-long-spike",
  "qualityOptions": [],
  "baselineQuality": "Good",
  "baselineMaterial": "published",
  "balanceOptions": [],
  "templateModeId": "wLTM25LongSpikew4t370RBCVyiebGF6",
  "displayUsage": true,
  "motion": "swing",
  "tipOf": "wLTM25LongSpikew4t370RBCVyiebGF6"
 }
};
