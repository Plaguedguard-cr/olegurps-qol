import { applyUTErrataCatalog, UT_ERRATA_DEFINITION_ONLY } from './ut-errata.js';
import { applyUTCompatibilityPolicy } from './ut-compatibility-policy.js';
import { gaussProfile, projectGaussCatalog } from './ut-gauss-source.js';
import { beamProfile, projectBeamCatalog } from './ut-beam-source.js';
import { utDazzlerProfile, projectDazzlerCatalog } from './ut-dazzler-source.js';
// Verified UT2007 data only, followed by approved errata. Original JSON/GCS bytes and Actor state are never written.
export const UT_DATA_REVISION = "ut-2007-1";
export const UT_STAT_CORRECTIONS = [
  {
    "equipment_id": "e7Mft8MiyBUm7ODkP",
    "mode_id": "W6Egpk7c3gUzZxExi",
    "path": "raw_calc.damage",
    "previous": "7dx50(2) burn ex",
    "corrected": "4dx50(2) burn ex",
    "source": "Ultra-Tech 128",
    "audit_row": 5
  },
  {
    "equipment_id": "e7Mft8MiyBUm7ODkP",
    "mode_id": "W6Egpk7c3gUzZxExi",
    "path": "stats.damage",
    "previous": {
      "type": "burn ex",
      "base": "7dx50",
      "armor_divisor": 2
    },
    "corrected": {
      "type": "burn ex",
      "base": "4dx50",
      "armor_divisor": 2.0
    },
    "source": "Ultra-Tech 128",
    "audit_row": 5
  },
  {
    "equipment_id": "e7Mft8MiyBUm7ODkP",
    "mode_id": "W6Egpk7c3gUzZxExi",
    "path": "attack_resolution.raw",
    "previous": "7dx50(2) burn ex",
    "corrected": "4dx50(2) burn ex",
    "source": "Ultra-Tech 128",
    "audit_row": 5
  },
  {
    "equipment_id": "eCOQaE4DsVSKPPPGQ",
    "mode_id": "WmiUP8hzgsvbFNy4_",
    "path": "stats.shots",
    "previous": "100(3)",
    "corrected": "40(3)",
    "source": "Ultra-Tech 142",
    "audit_row": 6
  },
  {
    "equipment_id": "e2hU5T9XCUTYsADES",
    "mode_id": "WegCPnwG-HS41cU29",
    "path": "raw_calc.damage",
    "previous": "6d+2(3) pi-",
    "corrected": "6d+2(3) pi",
    "source": "Ultra-Tech 142",
    "audit_row": 10
  },
  {
    "equipment_id": "e2hU5T9XCUTYsADES",
    "mode_id": "WegCPnwG-HS41cU29",
    "path": "stats.damage",
    "previous": {
      "type": "pi-",
      "base": "6d+2",
      "armor_divisor": 3
    },
    "corrected": {
      "type": "pi",
      "base": "6d+2",
      "armor_divisor": 3.0
    },
    "source": "Ultra-Tech 142",
    "audit_row": 10
  },
  {
    "equipment_id": "e2hU5T9XCUTYsADES",
    "mode_id": "WegCPnwG-HS41cU29",
    "path": "attack_resolution.raw",
    "previous": "6d+2(3) pi-",
    "corrected": "6d+2(3) pi",
    "source": "Ultra-Tech 142",
    "audit_row": 10
  },
  {
    "equipment_id": "egR7ZGoGlG4YLaznp",
    "mode_id": "Ws-cZZZh97ol2rCjy",
    "path": "raw_calc.damage",
    "previous": "6dx10 burn ex",
    "corrected": "6dx10(\u221e) burn ex",
    "source": "Ultra-Tech 131",
    "audit_row": 11
  },
  {
    "equipment_id": "egR7ZGoGlG4YLaznp",
    "mode_id": "Ws-cZZZh97ol2rCjy",
    "path": "stats.damage",
    "previous": {
      "type": "burn ex",
      "base": "6dx10"
    },
    "corrected": {
      "type": "burn ex",
      "base": "6dx10",
      "armor_divisor": "infinity"
    },
    "source": "Ultra-Tech 131",
    "audit_row": 11
  },
  {
    "equipment_id": "egR7ZGoGlG4YLaznp",
    "mode_id": "Ws-cZZZh97ol2rCjy",
    "path": "attack_resolution.raw",
    "previous": "6dx10 burn ex",
    "corrected": "6dx10(\u221e) burn ex",
    "source": "Ultra-Tech 131",
    "audit_row": 11
  },
  {
    "equipment_id": "e3p6dD7cCTRMSrfFl",
    "mode_id": "Wjehd13gUuNCUaJCG",
    "path": "stats.shots",
    "previous": "28(5)",
    "corrected": "28(3)",
    "source": "Ultra-Tech 118",
    "audit_row": 13
  },
  {
    "equipment_id": "e4HcTNx2vdgulClRI",
    "mode_id": "WLqS0QPml7P8uYbox",
    "path": "raw_calc.damage",
    "previous": "2d cr",
    "corrected": "2d cr dkb",
    "source": "Ultra-Tech 84",
    "audit_row": 16
  },
  {
    "equipment_id": "e4HcTNx2vdgulClRI",
    "mode_id": "WLqS0QPml7P8uYbox",
    "path": "stats.damage",
    "previous": {
      "type": "cr",
      "base": "2d"
    },
    "corrected": {
      "type": "cr dkb",
      "base": "2d"
    },
    "source": "Ultra-Tech 84",
    "audit_row": 16
  },
  {
    "equipment_id": "e4HcTNx2vdgulClRI",
    "mode_id": "WLqS0QPml7P8uYbox",
    "path": "attack_resolution.raw",
    "previous": "2d cr",
    "corrected": "2d cr dkb",
    "source": "Ultra-Tech 84",
    "audit_row": 16
  },
  {
    "equipment_id": "e4HcTNx2vdgulClRI",
    "mode_id": "WLqS0QPml7P8uYbox",
    "path": "stats.accuracy",
    "previous": null,
    "corrected": "0",
    "source": "Ultra-Tech 84",
    "audit_row": 17
  },
  {
    "equipment_id": "e4HcTNx2vdgulClRI",
    "mode_id": "WLqS0QPml7P8uYbox",
    "path": "stats.range",
    "previous": "1",
    "corrected": "C/1",
    "source": "Ultra-Tech 84",
    "audit_row": 18
  },
  {
    "equipment_id": "ejQp95bc35NJ63EsJ",
    "mode_id": "WsTDNWZ0K8Loqnxp6",
    "path": "raw_calc.damage",
    "previous": "3d cr",
    "corrected": "3d cr dkb",
    "source": "Ultra-Tech 84",
    "audit_row": 19
  },
  {
    "equipment_id": "ejQp95bc35NJ63EsJ",
    "mode_id": "WsTDNWZ0K8Loqnxp6",
    "path": "stats.damage",
    "previous": {
      "type": "cr",
      "base": "3d"
    },
    "corrected": {
      "type": "cr dkb",
      "base": "3d"
    },
    "source": "Ultra-Tech 84",
    "audit_row": 19
  },
  {
    "equipment_id": "ejQp95bc35NJ63EsJ",
    "mode_id": "WsTDNWZ0K8Loqnxp6",
    "path": "attack_resolution.raw",
    "previous": "3d cr",
    "corrected": "3d cr dkb",
    "source": "Ultra-Tech 84",
    "audit_row": 19
  },
  {
    "equipment_id": "ejQp95bc35NJ63EsJ",
    "mode_id": "WsTDNWZ0K8Loqnxp6",
    "path": "stats.accuracy",
    "previous": null,
    "corrected": "0",
    "source": "Ultra-Tech 84",
    "audit_row": 20
  },
  {
    "equipment_id": "ejQp95bc35NJ63EsJ",
    "mode_id": "WsTDNWZ0K8Loqnxp6",
    "path": "stats.range",
    "previous": "1",
    "corrected": "C/1",
    "source": "Ultra-Tech 84",
    "audit_row": 21
  },
  {
    "equipment_id": "ebHQUsAn03woUW7De",
    "mode_id": "WeWDVUcj3u60GEyCq",
    "path": "stats.bulk",
    "previous": "-2",
    "corrected": "-3",
    "source": "Ultra-Tech 143",
    "audit_row": 22
  },
  {
    "equipment_id": "e-uedEmEf2DgJdhK-",
    "mode_id": "WiXbfGBQ36W2_cYb2",
    "path": "raw_calc.damage",
    "previous": "4d cr",
    "corrected": "4d cr dkb",
    "source": "Ultra-Tech 84",
    "audit_row": 23
  },
  {
    "equipment_id": "e-uedEmEf2DgJdhK-",
    "mode_id": "WiXbfGBQ36W2_cYb2",
    "path": "stats.damage",
    "previous": {
      "type": "cr",
      "base": "4d"
    },
    "corrected": {
      "type": "cr dkb",
      "base": "4d"
    },
    "source": "Ultra-Tech 84",
    "audit_row": 23
  },
  {
    "equipment_id": "e-uedEmEf2DgJdhK-",
    "mode_id": "WiXbfGBQ36W2_cYb2",
    "path": "attack_resolution.raw",
    "previous": "4d cr",
    "corrected": "4d cr dkb",
    "source": "Ultra-Tech 84",
    "audit_row": 23
  },
  {
    "equipment_id": "e-uedEmEf2DgJdhK-",
    "mode_id": "WiXbfGBQ36W2_cYb2",
    "path": "stats.accuracy",
    "previous": null,
    "corrected": "0",
    "source": "Ultra-Tech 84",
    "audit_row": 24
  },
  {
    "equipment_id": "e-uedEmEf2DgJdhK-",
    "mode_id": "WiXbfGBQ36W2_cYb2",
    "path": "stats.range",
    "previous": "1",
    "corrected": "C/1",
    "source": "Ultra-Tech 84",
    "audit_row": 25
  },
  {
    "equipment_id": "e4VDvxYSSKQ5KadZU",
    "mode_id": "W_-PdY7cWRJEp-TD3",
    "path": "raw_calc.damage",
    "previous": "6d cr",
    "corrected": "6d cr dkb",
    "source": "Ultra-Tech 84",
    "audit_row": 26
  },
  {
    "equipment_id": "e4VDvxYSSKQ5KadZU",
    "mode_id": "W_-PdY7cWRJEp-TD3",
    "path": "stats.damage",
    "previous": {
      "type": "cr",
      "base": "6d"
    },
    "corrected": {
      "type": "cr dkb",
      "base": "6d"
    },
    "source": "Ultra-Tech 84",
    "audit_row": 26
  },
  {
    "equipment_id": "e4VDvxYSSKQ5KadZU",
    "mode_id": "W_-PdY7cWRJEp-TD3",
    "path": "attack_resolution.raw",
    "previous": "6d cr",
    "corrected": "6d cr dkb",
    "source": "Ultra-Tech 84",
    "audit_row": 26
  },
  {
    "equipment_id": "e4VDvxYSSKQ5KadZU",
    "mode_id": "W_-PdY7cWRJEp-TD3",
    "path": "stats.accuracy",
    "previous": null,
    "corrected": "0",
    "source": "Ultra-Tech 84",
    "audit_row": 27
  },
  {
    "equipment_id": "e4VDvxYSSKQ5KadZU",
    "mode_id": "W_-PdY7cWRJEp-TD3",
    "path": "stats.range",
    "previous": "1",
    "corrected": "C/1",
    "source": "Ultra-Tech 84",
    "audit_row": 28
  },
  {
    "equipment_id": "e9GHjRGPBxHYFCVEA",
    "mode_id": "WR8ML6-xfVf56Ynog",
    "path": "raw_calc.damage",
    "previous": "1d cr nkb",
    "corrected": "1d(\u221e) cr nkb",
    "source": "Ultra-Tech 129",
    "audit_row": 29
  },
  {
    "equipment_id": "e9GHjRGPBxHYFCVEA",
    "mode_id": "WR8ML6-xfVf56Ynog",
    "path": "stats.damage",
    "previous": {
      "type": "cr nkb",
      "base": "1d"
    },
    "corrected": {
      "type": "cr nkb",
      "base": "1d",
      "armor_divisor": "infinity"
    },
    "source": "Ultra-Tech 129",
    "audit_row": 29
  },
  {
    "equipment_id": "e9GHjRGPBxHYFCVEA",
    "mode_id": "WR8ML6-xfVf56Ynog",
    "path": "attack_resolution.raw",
    "previous": "1d cr nkb",
    "corrected": "1d(\u221e) cr nkb",
    "source": "Ultra-Tech 129",
    "audit_row": 29
  },
  {
    "equipment_id": "eHeazkzIkVzYNq0mb",
    "mode_id": "W4BIGYNul_J0XrRdO",
    "path": "raw_calc.damage",
    "previous": "6dx5 cr nkb",
    "corrected": "6dx5(\u221e) cr nkb",
    "source": "Ultra-Tech 129",
    "audit_row": 30
  },
  {
    "equipment_id": "eHeazkzIkVzYNq0mb",
    "mode_id": "W4BIGYNul_J0XrRdO",
    "path": "stats.damage",
    "previous": {
      "type": "cr nkb",
      "base": "6dx5"
    },
    "corrected": {
      "type": "cr nkb",
      "base": "6dx5",
      "armor_divisor": "infinity"
    },
    "source": "Ultra-Tech 129",
    "audit_row": 30
  },
  {
    "equipment_id": "eHeazkzIkVzYNq0mb",
    "mode_id": "W4BIGYNul_J0XrRdO",
    "path": "attack_resolution.raw",
    "previous": "6dx5 cr nkb",
    "corrected": "6dx5(\u221e) cr nkb",
    "source": "Ultra-Tech 129",
    "audit_row": 30
  },
  {
    "equipment_id": "epm75MfcI62G-PPLu",
    "mode_id": "Wkdox45b3HYFGcCNu",
    "path": "raw_calc.damage",
    "previous": "1d+2 cr nkb",
    "corrected": "1d+2(\u221e) cr nkb",
    "source": "Ultra-Tech 129",
    "audit_row": 31
  },
  {
    "equipment_id": "epm75MfcI62G-PPLu",
    "mode_id": "Wkdox45b3HYFGcCNu",
    "path": "stats.damage",
    "previous": {
      "type": "cr nkb",
      "base": "1d+2"
    },
    "corrected": {
      "type": "cr nkb",
      "base": "1d+2",
      "armor_divisor": "infinity"
    },
    "source": "Ultra-Tech 129",
    "audit_row": 31
  },
  {
    "equipment_id": "epm75MfcI62G-PPLu",
    "mode_id": "Wkdox45b3HYFGcCNu",
    "path": "attack_resolution.raw",
    "previous": "1d+2 cr nkb",
    "corrected": "1d+2(\u221e) cr nkb",
    "source": "Ultra-Tech 129",
    "audit_row": 31
  },
  {
    "equipment_id": "eB8qoXfDsZUsuQMBX",
    "mode_id": "W7Q5gY_183gqDH43U",
    "path": "raw_calc.damage",
    "previous": "3d cr nkb",
    "corrected": "3d(\u221e) cr nkb",
    "source": "Ultra-Tech 129",
    "audit_row": 33
  },
  {
    "equipment_id": "eB8qoXfDsZUsuQMBX",
    "mode_id": "W7Q5gY_183gqDH43U",
    "path": "stats.damage",
    "previous": {
      "type": "cr nkb",
      "base": "3d"
    },
    "corrected": {
      "type": "cr nkb",
      "base": "3d",
      "armor_divisor": "infinity"
    },
    "source": "Ultra-Tech 129",
    "audit_row": 33
  },
  {
    "equipment_id": "eB8qoXfDsZUsuQMBX",
    "mode_id": "W7Q5gY_183gqDH43U",
    "path": "attack_resolution.raw",
    "previous": "3d cr nkb",
    "corrected": "3d(\u221e) cr nkb",
    "source": "Ultra-Tech 129",
    "audit_row": 33
  },
  {
    "equipment_id": "ekBY23H_nDia71IRM",
    "mode_id": "WBP_BamKPzdsBHOnI",
    "path": "stats.shots",
    "previous": "7(3)",
    "corrected": "6(3)",
    "source": "Ultra-Tech 145",
    "audit_row": 34
  },
  {
    "equipment_id": "eBOX9WN82HzT5Oyak",
    "mode_id": "WiFzne2T6efUmwoS_",
    "path": "stats.shots",
    "previous": "72(3)",
    "corrected": "83(3)",
    "source": "Ultra-Tech 120",
    "audit_row": 37
  },
  {
    "equipment_id": "ewlZFyF2z955yS_yt",
    "mode_id": "WvPgyUYHlHInY18AI",
    "path": "raw_calc.damage",
    "previous": "6dx20 burn ex",
    "corrected": "6dx20(\u221e) burn ex",
    "source": "Ultra-Tech 131",
    "audit_row": 39
  },
  {
    "equipment_id": "ewlZFyF2z955yS_yt",
    "mode_id": "WvPgyUYHlHInY18AI",
    "path": "stats.damage",
    "previous": {
      "type": "burn ex",
      "base": "6dx20"
    },
    "corrected": {
      "type": "burn ex",
      "base": "6dx20",
      "armor_divisor": "infinity"
    },
    "source": "Ultra-Tech 131",
    "audit_row": 39
  },
  {
    "equipment_id": "ewlZFyF2z955yS_yt",
    "mode_id": "WvPgyUYHlHInY18AI",
    "path": "attack_resolution.raw",
    "previous": "6dx20 burn ex",
    "corrected": "6dx20(\u221e) burn ex",
    "source": "Ultra-Tech 131",
    "audit_row": 39
  },
  {
    "equipment_id": "eQMcVy89jDzIvotgM",
    "mode_id": "W9chB7ydzOWTAxQP0",
    "path": "stats.bulk",
    "previous": "-2",
    "corrected": "-3",
    "source": "Ultra-Tech 137",
    "audit_row": 41
  },
  {
    "equipment_id": "exYOC6emseKRHSAyl",
    "mode_id": "WJKny3UHj4SVw7sTF",
    "path": "stats.range",
    "previous": "90/2,700",
    "corrected": "900/2,700",
    "source": "Ultra-Tech 117",
    "audit_row": 42
  },
  {
    "equipment_id": "evik07ShWozm6tugt",
    "mode_id": "WC9xrdk8qWqC3tsHh",
    "path": "stats.accuracy",
    "previous": null,
    "corrected": "0",
    "source": "Ultra-Tech 145",
    "audit_row": 43
  },
  {
    "equipment_id": "exFH5B3e4deifd5CC",
    "mode_id": "WngbnzWRwLntvaRbR",
    "path": "raw_calc.damage",
    "previous": "2d pi-",
    "corrected": "2d pi",
    "source": "Ultra-Tech 137",
    "audit_row": 44
  },
  {
    "equipment_id": "exFH5B3e4deifd5CC",
    "mode_id": "WngbnzWRwLntvaRbR",
    "path": "stats.damage",
    "previous": {
      "type": "pi-",
      "base": "2d"
    },
    "corrected": {
      "type": "pi",
      "base": "2d"
    },
    "source": "Ultra-Tech 137",
    "audit_row": 44
  },
  {
    "equipment_id": "exFH5B3e4deifd5CC",
    "mode_id": "WngbnzWRwLntvaRbR",
    "path": "attack_resolution.raw",
    "previous": "2d pi-",
    "corrected": "2d pi",
    "source": "Ultra-Tech 137",
    "audit_row": 44
  },
  {
    "equipment_id": "edINZumToAELOPNRc",
    "mode_id": "WPP4GGv21sVx2-CHg",
    "path": "raw_calc.damage",
    "previous": "1d-1(0.2) pi-",
    "corrected": "1d-1 (0.25) pi-",
    "source": "Ultra-Tech 140",
    "audit_row": 46
  },
  {
    "equipment_id": "edINZumToAELOPNRc",
    "mode_id": "WPP4GGv21sVx2-CHg",
    "path": "stats.damage",
    "previous": {
      "type": "pi-",
      "base": "1d-1",
      "armor_divisor": 0.2
    },
    "corrected": {
      "type": "(0.25) pi-",
      "base": "1d-1"
    },
    "source": "Ultra-Tech 140",
    "audit_row": 46
  },
  {
    "equipment_id": "edINZumToAELOPNRc",
    "mode_id": "WPP4GGv21sVx2-CHg",
    "path": "attack_resolution.raw",
    "previous": "1d-1(0.2) pi-",
    "corrected": "1d-1 (0.25) pi-",
    "source": "Ultra-Tech 140",
    "audit_row": 46
  },
  {
    "equipment_id": "eANNUkHRbCEIhyacu",
    "mode_id": "Wci8UZ1PotNMyGWgA",
    "path": "stats.rate_of_fire",
    "previous": "10",
    "corrected": "1",
    "source": "Ultra-Tech 115",
    "audit_row": 47
  },
  {
    "equipment_id": "eANNUkHRbCEIhyacu",
    "mode_id": "Wci8UZ1PotNMyGWgA",
    "path": "stats.strength",
    "previous": null,
    "corrected": "0",
    "source": "Ultra-Tech 115",
    "audit_row": 48
  },
  {
    "equipment_id": "eANNUkHRbCEIhyacu",
    "mode_id": "Wci8UZ1PotNMyGWgA",
    "path": "stats.bulk",
    "previous": null,
    "corrected": "0",
    "source": "Ultra-Tech 115",
    "audit_row": 49
  },
  {
    "equipment_id": "eXxvmiDy3aPO9TqMr",
    "mode_id": "WEKZc3qKlKcbdRyNi",
    "path": "stats.range",
    "previous": "500/1,500",
    "corrected": "700/2,100",
    "source": "Ultra-Tech 116",
    "audit_row": 51
  },
  {
    "equipment_id": "eqORhSIIsOaa8qjb0",
    "mode_id": "W3JTDeFHeu59yRTF-",
    "path": "raw_calc.damage",
    "previous": "HT-4 aff (3 yd)",
    "corrected": "HT-4 aff (1 yd)",
    "source": "Ultra-Tech 122",
    "audit_row": 53
  },
  {
    "equipment_id": "eqORhSIIsOaa8qjb0",
    "mode_id": "W3JTDeFHeu59yRTF-",
    "path": "stats.damage",
    "previous": {
      "type": "HT-4 aff (3 yd)"
    },
    "corrected": {
      "type": "HT-4 aff (1 yd)"
    },
    "source": "Ultra-Tech 122",
    "audit_row": 53
  },
  {
    "equipment_id": "eqORhSIIsOaa8qjb0",
    "mode_id": "W3JTDeFHeu59yRTF-",
    "path": "attack_resolution.raw",
    "previous": "HT-4 aff (3 yd)",
    "corrected": "HT-4 aff (1 yd)",
    "source": "Ultra-Tech 122",
    "audit_row": 53
  },
  {
    "equipment_id": "eY1oUl_-JTrzPuaef",
    "mode_id": "W5_0Tkbdr1S4b4Hlv",
    "path": "stats.rate_of_fire",
    "previous": "10",
    "corrected": "3",
    "source": "Ultra-Tech 137",
    "audit_row": 54
  },
  {
    "equipment_id": "eEszHGWcbIfvKntSo",
    "mode_id": "WlqvLkGz-INk0A-_o",
    "path": "raw_calc.damage",
    "previous": "2d+2 pi-",
    "corrected": "2d+2 pi",
    "source": "Ultra-Tech 137",
    "audit_row": 56
  },
  {
    "equipment_id": "eEszHGWcbIfvKntSo",
    "mode_id": "WlqvLkGz-INk0A-_o",
    "path": "stats.damage",
    "previous": {
      "type": "pi-",
      "base": "2d+2"
    },
    "corrected": {
      "type": "pi",
      "base": "2d+2"
    },
    "source": "Ultra-Tech 137",
    "audit_row": 56
  },
  {
    "equipment_id": "eEszHGWcbIfvKntSo",
    "mode_id": "WlqvLkGz-INk0A-_o",
    "path": "attack_resolution.raw",
    "previous": "2d+2 pi-",
    "corrected": "2d+2 pi",
    "source": "Ultra-Tech 137",
    "audit_row": 56
  },
  {
    "equipment_id": "ecskO6ZiDAiMBHNIM",
    "mode_id": "WHv4EWlz3Tg6-cvQn",
    "path": "stats.shots",
    "previous": "6(5i)",
    "corrected": "6(5)",
    "source": "Ultra-Tech 146",
    "audit_row": 58
  },
  {
    "equipment_id": "enpedPMhDr_Y1fIin",
    "mode_id": "W7v0_whpuR9MtD4tH",
    "path": "stats.shots",
    "previous": "6(5i)",
    "corrected": "6(5)",
    "source": "Ultra-Tech 146",
    "audit_row": 59
  },
  {
    "equipment_id": "e5bjENSnMI58luL2O",
    "mode_id": "WYpXdcsWIyhNVC6x3",
    "path": "stats.range",
    "previous": "80",
    "corrected": "360/3,000",
    "source": "Ultra-Tech 138",
    "audit_row": 63
  },
  {
    "equipment_id": "ekZha7uYdpjrLUN_r",
    "mode_id": "WTVT6tvGqOqE1N6e6",
    "path": "tech_level",
    "previous": "9",
    "corrected": "10",
    "source": "Ultra-Tech 140",
    "audit_row": 66
  },
  {
    "equipment_id": "eX-etcj5LJvUYagdH",
    "mode_id": "W8SYi-R8B4aFolQUw",
    "path": "stats.rate_of_fire",
    "previous": "Jet",
    "corrected": "1",
    "source": "Ultra-Tech 134",
    "audit_row": 67
  },
  {
    "equipment_id": "eVZB_NdIt0pp7Dh3P",
    "mode_id": "WdV0VzMAch5j8pxdy",
    "path": "raw_calc.damage",
    "previous": "6dx25(3) pi++",
    "corrected": "6dx25(3) pi",
    "source": "Ultra-Tech 142",
    "audit_row": 72
  },
  {
    "equipment_id": "eVZB_NdIt0pp7Dh3P",
    "mode_id": "WdV0VzMAch5j8pxdy",
    "path": "stats.damage",
    "previous": {
      "type": "pi++",
      "base": "6dx25",
      "armor_divisor": 3
    },
    "corrected": {
      "type": "pi",
      "base": "6dx25",
      "armor_divisor": 3.0
    },
    "source": "Ultra-Tech 142",
    "audit_row": 72
  },
  {
    "equipment_id": "eVZB_NdIt0pp7Dh3P",
    "mode_id": "WdV0VzMAch5j8pxdy",
    "path": "attack_resolution.raw",
    "previous": "6dx25(3) pi++",
    "corrected": "6dx25(3) pi",
    "source": "Ultra-Tech 142",
    "audit_row": 72
  },
  {
    "equipment_id": "eVZB_NdIt0pp7Dh3P",
    "mode_id": "WdV0VzMAch5j8pxdy",
    "path": "stats.rate_of_fire",
    "previous": "1",
    "corrected": "20",
    "source": "Ultra-Tech 142",
    "audit_row": 73
  },
  {
    "equipment_id": "edmYyO6iyS424Ay8F",
    "mode_id": "WQ2l-NQg-aohXfpJq",
    "path": "stats.strength",
    "previous": null,
    "corrected": "0",
    "source": "Ultra-Tech 117",
    "audit_row": 75
  },
  {
    "equipment_id": "edmYyO6iyS424Ay8F",
    "mode_id": "WQ2l-NQg-aohXfpJq",
    "path": "stats.bulk",
    "previous": null,
    "corrected": "0",
    "source": "Ultra-Tech 117",
    "audit_row": 76
  },
  {
    "equipment_id": "eE5I4zXp72jkI4tYR",
    "mode_id": "W4Cgkpefx8fSmFgmB",
    "path": "stats.shots",
    "previous": "20(5)",
    "corrected": "50(5)",
    "source": "Ultra-Tech 123",
    "audit_row": 80
  },
  {
    "equipment_id": "eE5I4zXp72jkI4tYR",
    "mode_id": "W4Cgkpefx8fSmFgmB",
    "path": "stats.bulk",
    "previous": "-10",
    "corrected": "-8",
    "source": "Ultra-Tech 123",
    "audit_row": 81
  },
  {
    "equipment_id": "eTREuOSMiOhHEUEeN",
    "mode_id": "WC6YLmtyp7E3t5ucg",
    "path": "raw_calc.damage",
    "previous": "6d cr nkb",
    "corrected": "6d(\u221e) cr nkb",
    "source": "Ultra-Tech 129",
    "audit_row": 84
  },
  {
    "equipment_id": "eTREuOSMiOhHEUEeN",
    "mode_id": "WC6YLmtyp7E3t5ucg",
    "path": "stats.damage",
    "previous": {
      "type": "cr nkb",
      "base": "6d"
    },
    "corrected": {
      "type": "cr nkb",
      "base": "6d",
      "armor_divisor": "infinity"
    },
    "source": "Ultra-Tech 129",
    "audit_row": 84
  },
  {
    "equipment_id": "eTREuOSMiOhHEUEeN",
    "mode_id": "WC6YLmtyp7E3t5ucg",
    "path": "attack_resolution.raw",
    "previous": "6d cr nkb",
    "corrected": "6d(\u221e) cr nkb",
    "source": "Ultra-Tech 129",
    "audit_row": 84
  },
  {
    "equipment_id": "eTREuOSMiOhHEUEeN",
    "mode_id": "WC6YLmtyp7E3t5ucg",
    "path": "stats.range",
    "previous": "2,900",
    "corrected": "2,900/8,700",
    "source": "Ultra-Tech 129",
    "audit_row": 85
  },
  {
    "equipment_id": "etE8H6yu0IeEbB-4J",
    "mode_id": "WBZHReQ7xAJVZ8Bzc",
    "path": "stats.bulk",
    "previous": null,
    "corrected": "0",
    "source": "Ultra-Tech 166",
    "audit_row": 89
  },
  {
    "equipment_id": "eqJdVEFMICLuX_qAP",
    "mode_id": "WPLKersc7PxMqDCWi",
    "path": "stats.bulk",
    "previous": null,
    "corrected": "0",
    "source": "Ultra-Tech 126",
    "audit_row": 90
  },
  {
    "equipment_id": "eoxz7D2WloB6O857w",
    "mode_id": "WpAt6DyOnZkKbNfJr",
    "path": "stats.rate_of_fire",
    "previous": "Jet",
    "corrected": "1",
    "source": "Ultra-Tech 134",
    "audit_row": 91
  },
  {
    "equipment_id": "eoxz7D2WloB6O857w",
    "mode_id": "WpAt6DyOnZkKbNfJr",
    "path": "stats.strength",
    "previous": "4",
    "corrected": "2",
    "source": "Ultra-Tech 134",
    "audit_row": 92
  },
  {
    "equipment_id": "eoxz7D2WloB6O857w",
    "mode_id": "WpAt6DyOnZkKbNfJr",
    "path": "stats.bulk",
    "previous": "-4",
    "corrected": "-2",
    "source": "Ultra-Tech 134",
    "audit_row": 93
  },
  {
    "equipment_id": "e49dEmc9T8KpD3kvU",
    "mode_id": "WXki2UKT5ScYY4QsY",
    "path": "stats.range",
    "previous": "2",
    "corrected": "3",
    "source": "Ultra-Tech 134",
    "audit_row": 94
  },
  {
    "equipment_id": "e49dEmc9T8KpD3kvU",
    "mode_id": "WXki2UKT5ScYY4QsY",
    "path": "stats.rate_of_fire",
    "previous": "Jet",
    "corrected": "1",
    "source": "Ultra-Tech 134",
    "audit_row": 95
  },
  {
    "equipment_id": "eWe57Mr7MD87Sh5T0",
    "mode_id": "W30vD5BH3t_VdkWUZ",
    "path": "raw_calc.damage",
    "previous": "7d pi+",
    "corrected": "7d pi++",
    "source": "Ultra-Tech 137",
    "audit_row": 96
  },
  {
    "equipment_id": "eWe57Mr7MD87Sh5T0",
    "mode_id": "W30vD5BH3t_VdkWUZ",
    "path": "stats.damage",
    "previous": {
      "type": "pi+",
      "base": "7d"
    },
    "corrected": {
      "type": "pi++",
      "base": "7d"
    },
    "source": "Ultra-Tech 137",
    "audit_row": 96
  },
  {
    "equipment_id": "eWe57Mr7MD87Sh5T0",
    "mode_id": "W30vD5BH3t_VdkWUZ",
    "path": "attack_resolution.raw",
    "previous": "7d pi+",
    "corrected": "7d pi++",
    "source": "Ultra-Tech 137",
    "audit_row": 96
  },
  {
    "equipment_id": "evrv2eyOqOxeQIir8",
    "mode_id": "WmyROTLk0gs7lrYCE",
    "path": "raw_calc.damage",
    "previous": "9d pi+",
    "corrected": "9d pi++",
    "source": "Ultra-Tech 138",
    "audit_row": 97
  },
  {
    "equipment_id": "evrv2eyOqOxeQIir8",
    "mode_id": "WmyROTLk0gs7lrYCE",
    "path": "stats.damage",
    "previous": {
      "type": "pi+",
      "base": "9d"
    },
    "corrected": {
      "type": "pi++",
      "base": "9d"
    },
    "source": "Ultra-Tech 138",
    "audit_row": 97
  },
  {
    "equipment_id": "evrv2eyOqOxeQIir8",
    "mode_id": "WmyROTLk0gs7lrYCE",
    "path": "attack_resolution.raw",
    "previous": "9d pi+",
    "corrected": "9d pi++",
    "source": "Ultra-Tech 138",
    "audit_row": 97
  },
  {
    "equipment_id": "eE5kO-aISuGU4e8Gn",
    "mode_id": "W3Ggl5bTeg_44b_rU",
    "path": "stats.accuracy",
    "previous": "5",
    "corrected": "4",
    "source": "Ultra-Tech 137",
    "audit_row": 99
  },
  {
    "equipment_id": "euFAYN0ssxmBW31H3",
    "mode_id": "WkudgdqO3lymAYks5",
    "path": "raw_calc.damage",
    "previous": "4d pi++",
    "corrected": "4d+4 pi++",
    "source": "Weapon Tables 11; Ultra-Tech 138 incomplete",
    "audit_row": 110
  },
  {
    "equipment_id": "euFAYN0ssxmBW31H3",
    "mode_id": "WkudgdqO3lymAYks5",
    "path": "stats.damage",
    "previous": {
      "type": "pi++",
      "base": "4d"
    },
    "corrected": {
      "type": "pi++",
      "base": "4d+4"
    },
    "source": "Weapon Tables 11; Ultra-Tech 138 incomplete",
    "audit_row": 110
  },
  {
    "equipment_id": "euFAYN0ssxmBW31H3",
    "mode_id": "WkudgdqO3lymAYks5",
    "path": "attack_resolution.raw",
    "previous": "4d pi++",
    "corrected": "4d+4 pi++",
    "source": "Weapon Tables 11; Ultra-Tech 138 incomplete",
    "audit_row": 110
  },
  {
    "equipment_id": "euFAYN0ssxmBW31H3",
    "mode_id": "WkudgdqO3lymAYks5",
    "path": "stats.accuracy",
    "previous": "1",
    "corrected": "2",
    "source": "Ultra-Tech 138",
    "audit_row": 111
  },
  {
    "equipment_id": "euFAYN0ssxmBW31H3",
    "mode_id": "WkudgdqO3lymAYks5",
    "path": "stats.rate_of_fire",
    "previous": "3",
    "corrected": "2",
    "source": "Ultra-Tech 138",
    "audit_row": 112
  },
  {
    "equipment_id": "euFAYN0ssxmBW31H3",
    "mode_id": "WkudgdqO3lymAYks5",
    "path": "stats.shots",
    "previous": "5+1(3)",
    "corrected": "5+1(3i)",
    "source": "Ultra-Tech 138",
    "audit_row": 113
  },
  {
    "equipment_id": "euFAYN0ssxmBW31H3",
    "mode_id": "WkudgdqO3lymAYks5",
    "path": "stats.recoil",
    "previous": "5",
    "corrected": "4",
    "source": "Ultra-Tech 138",
    "audit_row": 115
  },
  {
    "equipment_id": "eslG-WfeXUSCD8bV5",
    "mode_id": "Wkj-hXVqccdySMffW",
    "path": "stats.accuracy",
    "previous": "18",
    "corrected": "24",
    "source": "Ultra-Tech 118",
    "audit_row": 120
  },
  {
    "equipment_id": "elEW6MrVe8fRVux42",
    "mode_id": "WAg2AcFXMlFlVMhp9",
    "path": "stats.accuracy",
    "previous": "18",
    "corrected": "24",
    "source": "Ultra-Tech 118",
    "audit_row": 122
  },
  {
    "equipment_id": "eBOX9WN82HzT5Oyak",
    "mode_id": "WMZEjvyCLOgv-r_In",
    "path": "stats.shots",
    "previous": null,
    "corrected": "83(3)",
    "source": "Ultra-Tech120",
    "audit_row": "dependent-mode"
  },
  {
    "equipment_id": "eE5I4zXp72jkI4tYR",
    "mode_id": "WhdBP6Ms5ATOcZa9z",
    "path": "stats.shots",
    "previous": "20(5)",
    "corrected": "50(5)",
    "source": "Ultra-Tech123",
    "audit_row": "dependent-mode"
  },
  {
    "equipment_id": "eE5I4zXp72jkI4tYR",
    "mode_id": "WhdBP6Ms5ATOcZa9z",
    "path": "stats.bulk",
    "previous": "-10",
    "corrected": "-8",
    "source": "Ultra-Tech123",
    "audit_row": "dependent-mode"
  }
];
export const UT_NEW_MODELS = [
  {
    "name": "Gauss Needler, 3mm",
    "equipment_id": "eUT2007GaussNeedler3mm",
    "mode_id": "WUT2007GaussNeedler3mm",
    "damage": "2d(3) pi-",
    "stats": {
      "damage": {
        "base": "2d",
        "type": "pi-",
        "armor_divisor": 3
      },
      "strength": "7\u2020",
      "accuracy": "2",
      "range": "100/300",
      "rate_of_fire": "12",
      "shots": "100(3)",
      "bulk": "-2",
      "recoil": "2"
    },
    "family": "3mm_em",
    "caliber": 3,
    "cell": "B",
    "cell_count": 2,
    "shots_per_power_set": 100,
    "weight": "1.5/0.5",
    "cost": 2000,
    "lc": 2
  },
  {
    "name": "Gauss PDW, 4mm",
    "equipment_id": "eUT2007GaussPDW4mm",
    "mode_id": "WUT2007GaussPDW4mm",
    "damage": "4d(3) pi-",
    "stats": {
      "damage": {
        "base": "4d",
        "type": "pi-",
        "armor_divisor": 3
      },
      "strength": "9\u2020",
      "accuracy": "6+1",
      "range": "700/2,900",
      "rate_of_fire": "16",
      "shots": "80(3)",
      "bulk": "-3",
      "recoil": "2"
    },
    "family": "4mm_em",
    "caliber": 4,
    "cell": "C",
    "cell_count": 1,
    "shots_per_power_set": 80,
    "weight": "4.6/1",
    "cost": 3600,
    "lc": 2
  }
];

export const UT_POWER_MODE_IDS = ["WdI9_2mws5U3wSQl-", "W__0RKAth-4yvVBSl", "Wcll8hDIppP48GXcD", "WD2iXlhuCPJV64Nt7", "WbvkCgoaLuWViWyKK", "WUVbnxIkj1gtEBekV", "WmiUP8hzgsvbFNy4_", "WQgMjnVvLnZiHzMnk", "WJstukbcBFPxQFtJE", "W0SxgGEVdQ84ypsCw", "W7FIiW8jX03PnOzxz", "WWkrDTQ7VS2Qucb0-", "WjHw1alZr-q5nItrB", "Wd5PTxwpIa1Irq42i", "WegCPnwG-HS41cU29", "WibFBUhe4qzQPgxpB", "WdZSw5CqcSq_d3eSV", "WdV0VzMAch5j8pxdy", "WkhAN9tcmB9eEkmY6", "Wq7SXzV-qosc5iY1q", "WUT2007GaussNeedler3mm", "WUT2007GaussPDW4mm", ...UT_ERRATA_DEFINITION_ONLY];

const UT_SOURCE_HASH = "21f9ddb6ddc2936d74e5ad781af43a6d3787352172e0e1f74a80d85db7cbf5f1";
const powerModes = new Set(UT_POWER_MODE_IDS);
export function requiresUTPowerAccounting(modeId) { return powerModes.has(modeId) && !gaussProfile(modeId) && !beamProfile(modeId) && !utDazzlerProfile(modeId); }

const pathValue = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
function setPath(object, path, value) {
  const keys = path.split("."), field = keys.pop();
  const parent = keys.reduce((value, key) => value[key], object);
  parent[field] = structuredClone(value);
}
function correctedWeapons(original) {
  if (!original.sources?.some(source => source.code === "UT" && source.sha256 === UT_SOURCE_HASH)) return original;
  const data = structuredClone(original);
  const equipment = new Map(data.equipment.map(item => [item.equipment_id, item]));
  for (const patch of UT_STAT_CORRECTIONS) {
    const item = equipment.get(patch.equipment_id);
    const mode = item?.modes.find(mode => mode.weapon_mode_id === patch.mode_id);
    if (!item || item.source !== "UT" || !mode) continue; // Never recreate a missing source record.
    const target = patch.path === "tech_level" ? item : mode;
    if (JSON.stringify(pathValue(target, patch.path)) !== JSON.stringify(patch.previous)) {
      throw Object.assign(new Error("UT source correction conflicts with supplied data: " + patch.mode_id + "." + patch.path),
        { code: "UT_DATA_SOURCE_MISMATCH", path: patch.mode_id + "." + patch.path });
    }
    setPath(target, patch.path, patch.corrected);
    mode.ut_source_data ??= { revision: UT_DATA_REVISION, corrections: [] };
    mode.ut_source_data.corrections.push({ field: patch.path, source: patch.source });
    if (patch.path === "tech_level" && mode.ammunition_profile) mode.ammunition_profile.native_weapon_tl = "10";
  }
  const anchor = equipment.get("eCOQaE4DsVSKPPPGQ");
  if (anchor?.source === "UT" && anchor.modes[0]?.ammunition_profile?.primary_ammo_family_id === "4mm_em") {
    for (const definition of UT_NEW_MODELS) {
      if (equipment.has(definition.equipment_id)) throw Error("Duplicate UT2007 addition");
      const item = structuredClone(anchor), mode = item.modes[0];
      Object.assign(item, { equipment_id: definition.equipment_id, name: definition.name, reference: "UT142", tech_level: "10", local_notes: null });
      Object.assign(mode, { weapon_mode_id: definition.mode_id, index: 0, usage: null, hidden: false, role: "attack" });
      Object.assign(mode.stats, structuredClone(definition.stats));
      mode.raw_calc.damage = definition.damage;
      mode.attack_resolution.raw = definition.damage;
      mode.hand_use = { value: "two-handed-marker", basis: "strength-notation-\u2020" };
      mode.caliber_hint = definition.caliber + "mm";
      mode.mechanism.source_reference = "UT141-142";
      mode.ammunition_profile = { ...mode.ammunition_profile, primary_ammo_family_id: definition.family,
        alternate_ammo_family_ids: [], special_load_ids: [], default_warhead_id: null, suggested_warhead_ids: [],
        caliber_mm: definition.caliber, warhead_class: null, native_weapon_tl: "10",
        link_basis: "Exact UT141-143 published electromagnetic weapon and ammunition identity." };
      mode.ut_source_data = { revision: UT_DATA_REVISION, new_definition: true, origin: "module-owned-source-transcription",
        sources: ["Ultra-Tech141", "Ultra-Tech142", "Ultra-Tech143"], special_variants_pending: true,
        published_weight: definition.weight, published_cost: definition.cost, published_lc: definition.lc,
        power_requirement: { cell_class: definition.cell, cells: definition.cell_count,
          shots_per_set: definition.shots_per_power_set, source: "Ultra-Tech143", accounting: "not-implemented" } };
      data.equipment.push(item);
    }
  }
  for (const item of data.equipment.filter(item => item.source === "UT")) for (const mode of item.modes) {
    if (powerModes.has(mode.weapon_mode_id)) {
      mode.ut_source_data ??= { revision: UT_DATA_REVISION };
      mode.ut_source_data.power_accounting_required = true;
      mode.ut_source_data.readiness = "definition-only";
    }
    if (item.equipment_id === "elsxkyUIf5Hn_1JMi") {
      mode.ut_source_data ??= { revision: UT_DATA_REVISION };
      mode.ut_source_data.source_conflict = "UT141:4mm/4000 versus UT143:7mm/200; no new physical identity approval";
    }
    if (mode.weapon_mode_id === "WJstukbcBFPxQFtJE") {
      mode.ut_source_data.source_conflict = "UT141:TL9 versus UT143:TL10; new approval requires source decision";
    }
    if (mode.weapon_mode_id === "WkudgdqO3lymAYks5") {
      mode.ut_source_data.host_inheritance = { source: "Ultra-Tech136", fields: ["bulk", "strength", "sighting_bonuses"],
        minimum_host_bulk_text: "Bulk -3 or more", automatic_host_link: false };
      mode.ut_source_data.published_damage_supplement = { primary: "UT138:4d+ pi++", source: "Weapon Tables11", user_authorized: true };
    }
    if (mode.weapon_mode_id === "WOMuCBSS_c_nIstvm") {
      mode.ut_source_data ??= { revision: UT_DATA_REVISION };
      mode.ut_source_data.published_damage_supplement = { primary: "UT138:6dx25; type unstated", source: "Weapon Tables11:pi++", user_authorized: true };
    }
    if (["Wci8UZ1PotNMyGWgA", "WQ2l-NQg-aohXfpJq"].includes(mode.weapon_mode_id)) {
      mode.ut_source_data.one_shot_crystal = { source: mode.weapon_mode_id === "Wci8UZ1PotNMyGWgA" ? "Ultra-Tech115" : "Ultra-Tech117",
        integrated_cell: true, separate_installed_resources: true, accounting: "not-implemented" };
    }
    if (["W8SYi-R8B4aFolQUw", "WpAt6DyOnZkKbNfJr", "WXki2UKT5ScYY4QsY"].includes(mode.weapon_mode_id))
      mode.attack_resolution.geometry = { ...mode.attack_resolution.geometry, basis: "Acc Jet notation (Ultra-Tech134); RoF 1" };
    if (mode.weapon_mode_id === "W3JTDeFHeu59yRTF-")
      mode.attack_resolution.geometry = { type: "cone", maximum_width_yards: 1, source: "Ultra-Tech122" };
  }
  data.ut_source_data = { revision: UT_DATA_REVISION, primary: "Ultra-Tech Fourth Edition Version1.0 May22 2007",
    original_sources_unchanged: true, added_equipment_ids: UT_NEW_MODELS.map(model => model.equipment_id) };
  return data;
}
function correctedAmmunition(original) {
  if (original.compatibility_pointer_source_sha256 !== "cc4d4286bce5eba3936081da60d77a62dee781630c0803cb73fa982fc7723933") return original;
  const data = structuredClone(original);
  for (const family of data.ammo_families) {
    if (["conventional", "conventional_shotgun", "payload_rifle_cannon", "splat_gun", "grenade_launcher_mortar"].includes(family.category)) family.source_ref = "UT 139";
    for (const link of family.linked_weapon_modes) if (link.weapon_mode_id === "WTVT6tvGqOqE1N6e6") link.native_tl = "10";
    for (const model of UT_NEW_MODELS.filter(model => model.family === family.id)) {
      if (!family.linked_weapon_modes.some(link => link.weapon_mode_id === model.mode_id))
        family.linked_weapon_modes.push({ equipment_id: model.equipment_id, weapon_mode_id: model.mode_id,
          weapon_name: model.name, usage: null, native_tl: "10" });
    }
    family.linked_weapon_mode_count = family.linked_weapon_modes.length;
  }
  data.ut_source_data = { revision: UT_DATA_REVISION, original_families_preserved: true, added_links: 2 };
  return data;
}
export function projectUTSourceData(book, original) {
  const data=book === "weapons" ? correctedWeapons(original) : book === "ut" ? correctedAmmunition(original) : original;
  return projectDazzlerCatalog(book,projectBeamCatalog(book,projectGaussCatalog(book,applyUTCompatibilityPolicy(book,applyUTErrataCatalog(book,data)))));
}
