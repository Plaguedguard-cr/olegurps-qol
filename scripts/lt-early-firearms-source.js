import {ltArtilleryProfile,ltArtilleryAdmission,ltArtilleryConfiguration} from './lt-artillery-source.js';
import {ltFlameProfile,ltFlameAdmission,ltFlameConfiguration} from './lt-flame-source.js';
// LT-P4: source-backed personal firearms and the two explicitly scoped LT88 shot modes.
const rows = [
 {
  "modeId": "WeCQz_2guzg8JWBca",
  "equipmentId": "eUstq-45wBk7_FmeT",
  "name": "Arquebus",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "matchlock",
  "powder": "serpentine",
  "pellets": 1,
  "reloadSeconds": 60,
  "muzzleloading": true,
  "source": "LT93",
  "ammoIds": [
   "lt_arquebus_bullet_lt93"
  ],
  "stats": {
   "damage": "2d+2 pi+",
   "accuracy": "2",
   "range": "65/660",
   "rate_of_fire": "1",
   "shots": "1(60)",
   "strength": "9†",
   "bulk": "-6",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Musket",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WLVaW6s5nqfPoH8G_",
  "equipmentId": "eWrPImwlzokA72wRG",
  "name": "Blunderbuss",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 7,
  "reloadSeconds": 40,
  "muzzleloading": true,
  "source": "LT92",
  "ammoIds": [
   "lt_blunderbuss_shot_lt92"
  ],
  "stats": {
   "damage": "1d pi",
   "accuracy": "2",
   "range": "45/810",
   "rate_of_fire": "1x7",
   "shots": "1(40)",
   "strength": "7†",
   "bulk": "-6",
   "recoil": "1"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Shotgun",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Shotgun",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Shotgun",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WoX0iI3NTeQcKFRxT",
  "equipmentId": "eJ9fllNnD0219w6js",
  "name": "Breechloading Carbine",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "wheellock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 10,
  "muzzleloading": false,
  "source": "LT94",
  "ammoIds": [
   "lt_breechloading_carbine_bullet_lt94"
  ],
  "stats": {
   "damage": "2d pi+",
   "accuracy": "3",
   "range": "55/570",
   "rate_of_fire": "1",
   "shots": "1(10)",
   "strength": "9†",
   "bulk": "-5",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Rifle",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Rifle",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Rifle",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "W3hYAnNy6LbS07aXN",
  "equipmentId": "eT_f8WXR8mRNOpLSl",
  "name": "Buccaneer Fusil",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 40,
  "muzzleloading": true,
  "source": "LT92",
  "ammoIds": [
   "lt_buccaneer_fusil_ball"
  ],
  "stats": {
   "damage": "3d+1 pi++",
   "accuracy": "1",
   "range": "75/750",
   "rate_of_fire": "1",
   "shots": "1(40)",
   "strength": "10†",
   "bulk": "-11",
   "recoil": "4"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Musket",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WbtqX-V-jIgXJn8FL",
  "equipmentId": "ePh8_14rCd7DrMUhP",
  "name": "Caliver",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "matchlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 60,
  "muzzleloading": true,
  "source": "LT93",
  "ammoIds": [
   "lt_caliver_bullet_lt93"
  ],
  "stats": {
   "damage": "3d+1 pi+",
   "accuracy": "2",
   "range": "85/870",
   "rate_of_fire": "1",
   "shots": "1(60)",
   "strength": "9†",
   "bulk": "-5",
   "recoil": "4"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Musket",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "W145kPyYunTnGRwY6",
  "equipmentId": "eDwly9qJ7ondSbli6",
  "name": "Carbine",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "wheellock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 40,
  "muzzleloading": true,
  "source": "LT93",
  "ammoIds": [
   "lt_carbine_bullet_lt93"
  ],
  "stats": {
   "damage": "3d pi++",
   "accuracy": "2",
   "range": "80/800",
   "rate_of_fire": "1",
   "shots": "1(40)",
   "strength": "9†",
   "bulk": "-4",
   "recoil": "4"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Musket",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WXLhR6qAupk40x1vV",
  "equipmentId": "eERSJptdTrUhViqRJ",
  "name": "Crouching Tiger Gun",
  "usage": "Lead Shot",
  "kind": "single",
  "places": 1,
  "lock": "cannonlock",
  "powder": "source-black-powder",
  "pellets": 100,
  "reloadSeconds": 60,
  "muzzleloading": true,
  "source": "LT88",
  "ammoIds": [
   "lt_crouching_tiger_gun_shot_lt87"
  ],
  "stats": {
   "damage": "1d-1 pi+",
   "accuracy": "1",
   "range": "130/1200",
   "rate_of_fire": "1x100",
   "shots": "1(60)",
   "strength": "19M†",
   "bulk": "-8",
   "recoil": "1"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Artillery",
    "specialization": "Cannon",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Artillery",
     "specialization": "Cannon",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "iq",
    "modifier": -5
   },
   {
    "type": "skill",
    "name": "Artillery",
    "specialization": "Cannon",
    "modifier": 0
   }
  ],
  "problemIds": [
   "F16",
   "F26",
   "F31"
  ]
 },
 {
  "modeId": "WN1t6vbkRJTcxlSa9",
  "equipmentId": "eAuqzoGL1Fp0OxFeu",
  "name": "Dragoon Pistol, Heavy",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 20,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_dragoon_pistol_heavy_bullet_lt94"
  ],
  "stats": {
   "damage": "2d pi+",
   "accuracy": "1",
   "range": "55/540",
   "rate_of_fire": "1",
   "shots": "1(20)",
   "strength": "10",
   "bulk": "-4",
   "recoil": "3"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Pistol",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "W9zu4Mgjt_cwxISAV",
  "equipmentId": "e-QkIPkcPJEgVnWtA",
  "name": "Dragoon Pistol, Light",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 20,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_dragoon_pistol_light_bullet_lt94"
  ],
  "stats": {
   "damage": "2d-1 pi+",
   "accuracy": "1",
   "range": "45/490",
   "rate_of_fire": "1",
   "shots": "1(20)",
   "strength": "9",
   "bulk": "-4",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Pistol",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WNE2rB6BVUwchQrnf",
  "equipmentId": "eeoIt6AJrsf9pxzmy",
  "name": "Duck’s Foot Pistol",
  "usage": "Shoot",
  "kind": "duck",
  "places": 4,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 20,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_duck_s_foot_pistol_bullet_lt94"
  ],
  "stats": {
   "damage": "1d+1 pi",
   "accuracy": "1",
   "range": "40/420",
   "rate_of_fire": "1x4",
   "shots": "4(20i)",
   "strength": "7",
   "bulk": "-3",
   "recoil": "1"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Pistol",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F17",
   "F31"
  ]
 },
 {
  "modeId": "WMqVwH46upN0TpmQE",
  "equipmentId": "eqm-l8KNxjOGPkr2y",
  "name": "Flintlock Carbine",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 40,
  "muzzleloading": true,
  "source": "LT93",
  "ammoIds": [
   "lt_flintlock_carbine_bullet_lt93"
  ],
  "stats": {
   "damage": "2d+2 pi++",
   "accuracy": "3",
   "range": "65/670",
   "rate_of_fire": "1",
   "shots": "1(40)",
   "strength": "8†",
   "bulk": "-4",
   "recoil": "4"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Musket",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WuIDDaiXX7__TlDkJ",
  "equipmentId": "e9FqkRToOywT7jj5F",
  "name": "Fowling Piece, Double",
  "usage": "Shoot",
  "kind": "barrels",
  "places": 2,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 175,
  "reloadSeconds": 40,
  "muzzleloading": true,
  "source": "LT92",
  "ammoIds": [
   "lt_fowling_piece_shot_lt92"
  ],
  "stats": {
   "damage": "1d+1(0.5) pi-",
   "accuracy": "2",
   "range": "15/330",
   "rate_of_fire": "1x175",
   "shots": "2(40i)",
   "strength": "8†",
   "bulk": "-8",
   "recoil": "1"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Shotgun",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Shotgun",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Shotgun",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WGd_9lR6GSvYtwJYq",
  "equipmentId": "eeJsYOXLUOfaJPTWK",
  "name": "Fowling Piece, Single",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 175,
  "reloadSeconds": 40,
  "muzzleloading": true,
  "source": "LT92",
  "ammoIds": [
   "lt_fowling_piece_shot_lt92"
  ],
  "stats": {
   "damage": "1d+1(0.5) pi-",
   "accuracy": "2",
   "range": "15/330",
   "rate_of_fire": "1x175",
   "shots": "1(40)",
   "strength": "7†",
   "bulk": "-7",
   "recoil": "1"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Shotgun",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Shotgun",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Shotgun",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WiBwgEFvhbNbmRLJR",
  "equipmentId": "eP4YOxuKnf5Y3AIuA",
  "name": "Fusil de Chasse",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 40,
  "muzzleloading": true,
  "source": "LT93",
  "ammoIds": [
   "lt_fusil_de_chasse_bullet_lt93"
  ],
  "stats": {
   "damage": "2d+2 pi+",
   "accuracy": "2",
   "range": "75/750",
   "rate_of_fire": "1",
   "shots": "1(40)",
   "strength": "9†",
   "bulk": "-5",
   "recoil": "3"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Musket",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WYW6_n9V6s4yG4UMc",
  "equipmentId": "eObrfS7vuahB9FW9i",
  "name": "Fusil Ordinaire",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 40,
  "muzzleloading": true,
  "source": "LT93",
  "ammoIds": [
   "lt_fusil_ordinaire_bullet_lt93"
  ],
  "stats": {
   "damage": "3d pi++",
   "accuracy": "1",
   "range": "75/750",
   "rate_of_fire": "1",
   "shots": "1(40)",
   "strength": "9†",
   "bulk": "-5",
   "recoil": "4"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Musket",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WQdIGb0JaGIWkcygT",
  "equipmentId": "eRS8VyYOWFgYlcFMu",
  "name": "Gonne",
  "usage": "Shoot Bullet",
  "kind": "single",
  "places": 1,
  "lock": "cannonlock",
  "powder": "serpentine",
  "pellets": 1,
  "reloadSeconds": 30,
  "muzzleloading": true,
  "source": "LT91",
  "ammoIds": [
   "lt_gonne_bullet_lt91"
  ],
  "stats": {
   "damage": "2d+1 pi++",
   "accuracy": "1",
   "range": "55/550",
   "rate_of_fire": "1",
   "shots": "1(30)",
   "strength": "10†",
   "bulk": "-5",
   "recoil": "4"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Gonne",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -4
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "W45k0TnnRzNd72k0-",
  "equipmentId": "eRS8VyYOWFgYlcFMu",
  "name": "Gonne",
  "usage": "Shoot Bolt",
  "kind": "single",
  "places": 1,
  "lock": "cannonlock",
  "powder": "serpentine",
  "pellets": 1,
  "reloadSeconds": 30,
  "muzzleloading": true,
  "source": "LT91",
  "ammoIds": [
   "lt_gonne_bolt_lt91"
  ],
  "stats": {
   "damage": "1d imp",
   "accuracy": "1",
   "range": "75/1200",
   "rate_of_fire": "1",
   "shots": "1(30)",
   "strength": "9†",
   "bulk": "-5",
   "recoil": "3"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Gonne",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -4
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WsCvHv5FcwbhLT8td",
  "equipmentId": "e0bHi9bawivyZ3RGD",
  "name": "Highland Pistol",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 20,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_highland_pistol_bullet_lt94"
  ],
  "stats": {
   "damage": "1d+2 pi+",
   "accuracy": "1",
   "range": "45/500",
   "rate_of_fire": "1",
   "shots": "1(20)",
   "strength": "9",
   "bulk": "-3",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Pistol",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WoqqZuhaS1_bS7PGP",
  "equipmentId": "en4F5-Hs9cuPtw0ed",
  "name": "Jäger Rifle",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "wheellock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 60,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_jager_rifle_bullet_lt94"
  ],
  "stats": {
   "damage": "3d+1 pi+",
   "accuracy": "3",
   "range": "65/650",
   "rate_of_fire": "1",
   "shots": "1(60)",
   "strength": "10†",
   "bulk": "-6",
   "recoil": "3"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Rifle",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Rifle",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Rifle",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WaYnIpM4t6wH57ZYg",
  "equipmentId": "e1d5I1DEgBx7csoY9",
  "name": "Jäger Rifle, Double-Barreled",
  "usage": "Shoot",
  "kind": "barrels",
  "places": 2,
  "lock": "wheellock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 60,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_double_jager_ball"
  ],
  "stats": {
   "damage": "3d+1 pi+",
   "accuracy": "3",
   "range": "65/650",
   "rate_of_fire": "1",
   "shots": "2(60i)",
   "strength": "10†",
   "bulk": "-7",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Rifle",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Rifle",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Rifle",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WFiGuhETQ5MGheGwO",
  "equipmentId": "eTuv8WfYTc5EsMMId",
  "name": "Long-Range Awe-Inspiring Gun",
  "usage": "Lead Shot",
  "kind": "single",
  "places": 1,
  "lock": "cannonlock",
  "powder": "source-black-powder",
  "pellets": 100,
  "reloadSeconds": 60,
  "muzzleloading": true,
  "source": "LT88",
  "ammoIds": [
   "lt_long_range_awe_inspiring_gun_lead_shot_lt87"
  ],
  "stats": {
   "damage": "1d-1 pi+",
   "accuracy": "1",
   "range": "130/1200",
   "rate_of_fire": "1x100",
   "shots": "1(60)",
   "strength": "21M†",
   "bulk": "-10",
   "recoil": "1"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Artillery",
    "specialization": "Cannon",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Artillery",
     "specialization": "Cannon",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "iq",
    "modifier": -5
   },
   {
    "type": "skill",
    "name": "Artillery",
    "specialization": "Cannon",
    "modifier": 0
   }
  ],
  "problemIds": [
   "F16",
   "F26",
   "F31"
  ]
 },
 {
  "modeId": "W5zqJN2fmDIv9gXIP",
  "equipmentId": "eEHSjsOCxFFh6ET2f",
  "name": "Military Pistol",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "wheellock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 20,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_military_pistol_bullet_lt94"
  ],
  "stats": {
   "damage": "2d-1 pi+",
   "accuracy": "1",
   "range": "50/500",
   "rate_of_fire": "1",
   "shots": "1(20)",
   "strength": "10",
   "bulk": "-4",
   "recoil": "3"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Pistol",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "Wk0G5zIrN66TWDaod",
  "equipmentId": "eEhkIZOjs7PhrvwwY",
  "name": "Mr. Facing-Both-Ways Gonne",
  "usage": "Shoot",
  "kind": "facing",
  "places": 2,
  "lock": "cannonlock",
  "powder": "serpentine",
  "pellets": 1,
  "reloadSeconds": 30,
  "muzzleloading": true,
  "source": "LT91",
  "ammoIds": [
   "lt_multi_gonne_ball"
  ],
  "stats": {
   "damage": "2d+1 pi++",
   "accuracy": "1",
   "range": "55/550",
   "rate_of_fire": "1",
   "shots": "2(30i)",
   "strength": "9†",
   "bulk": "-6",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Gonne",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -4
   }
  ],
  "problemIds": [
   "F22",
   "F31"
  ]
 },
 {
  "modeId": "W5NUBEljC3LY6b9SX",
  "equipmentId": "eikIB_Ocnu5vBx_AY",
  "name": "Musket",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "matchlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 60,
  "muzzleloading": true,
  "source": "LT93",
  "ammoIds": [
   "lt_musket_bullet_lt93"
  ],
  "stats": {
   "damage": "4d+2 pi++",
   "accuracy": "2",
   "range": "120/1200",
   "rate_of_fire": "1",
   "shots": "1(60)",
   "strength": "12R†",
   "bulk": "-7",
   "recoil": "4"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Musket",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "W01YwRKnRlk_R3DYW",
  "equipmentId": "ezwT3uQOuPnl9J7Oa",
  "name": "Petronel",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "wheellock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 40,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_petronel_bullet_lt94"
  ],
  "stats": {
   "damage": "2d+2 pi+",
   "accuracy": "2",
   "range": "60/630",
   "rate_of_fire": "1",
   "shots": "1(40)",
   "strength": "11",
   "bulk": "-7",
   "recoil": "3"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Pistol",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WpgFmfGe-T9BEPFaW",
  "equipmentId": "eaLpwe40QwHRSk5Ot",
  "name": "Pocket Pistol",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "wheellock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 20,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_pocket_pistol_bullet_lt94"
  ],
  "stats": {
   "damage": "1d pi",
   "accuracy": "1",
   "range": "25/300",
   "rate_of_fire": "1",
   "shots": "1(20)",
   "strength": "6",
   "bulk": "-1",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Pistol",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WRLeJSlkTELYgEN_u",
  "equipmentId": "ek9PiJhQ5UEqXYawL",
  "name": "Puckle Gun",
  "usage": "Shoot",
  "kind": "puckle",
  "places": 9,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 10,
  "muzzleloading": true,
  "source": "LT93",
  "ammoIds": [
   "lt_puckle_round_ball_lt93"
  ],
  "stats": {
   "damage": "2d+1 pi++",
   "accuracy": "1",
   "range": "55/510",
   "rate_of_fire": "1",
   "shots": "9(10i)",
   "strength": "18M†",
   "bulk": "-8",
   "recoil": "1"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Musket",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "W9s533ghb5-D_YjQh",
  "equipmentId": "eXrjLew_ws9E0wkPB",
  "name": "Puffer Pistol",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "wheellock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 20,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_puffer_pistol_bullet_lt94"
  ],
  "stats": {
   "damage": "2d-1 pi+",
   "accuracy": "1",
   "range": "50/550",
   "rate_of_fire": "1",
   "shots": "1(20)",
   "strength": "9",
   "bulk": "-3",
   "recoil": "3"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Pistol",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WjJflZyHGasVNIg-c",
  "equipmentId": "e8bSmtIoMuno3Qqwu",
  "name": "Queen Anne Pistol",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 60,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_queen_anne_pistol_bullet_lt94"
  ],
  "stats": {
   "damage": "1d+2 pi+",
   "accuracy": "2",
   "range": "45/490",
   "rate_of_fire": "1",
   "shots": "1(60)",
   "strength": "9",
   "bulk": "-3",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Pistol",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "W0ytp97D1m7zBpVnM",
  "equipmentId": "eT2hYlAKFxdycDv8b",
  "name": "Snaphaunce Pistol",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "flintlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 20,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_snaphaunce_pistol_bullet_lt94"
  ],
  "stats": {
   "damage": "1d+1 pi",
   "accuracy": "1",
   "range": "40/420",
   "rate_of_fire": "1",
   "shots": "1(20)",
   "strength": "7",
   "bulk": "-2",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Pistol",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WZFbOwuQe-xNHJAZa",
  "equipmentId": "eke2A4uq0LU-VWWzI",
  "name": "Tantsutsu",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "matchlock",
  "powder": "serpentine",
  "pellets": 1,
  "reloadSeconds": 45,
  "muzzleloading": true,
  "source": "LT94",
  "ammoIds": [
   "lt_tantsutsu_bullet_lt94"
  ],
  "stats": {
   "damage": "1d+2 pi++",
   "accuracy": "1",
   "range": "40/400",
   "rate_of_fire": "1",
   "shots": "1(45)",
   "strength": "11",
   "bulk": "-5",
   "recoil": "3"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Pistol",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Pistol",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WZsyvYVuMLMho_olT",
  "equipmentId": "enxEQxvu3l4PJ3rWB",
  "name": "Ten-Eyed Gonne",
  "usage": "1st Shot",
  "kind": "ten-eyed",
  "places": 10,
  "lock": "cannonlock",
  "powder": "serpentine",
  "pellets": 1,
  "reloadSeconds": 30,
  "muzzleloading": true,
  "source": "LT91",
  "ammoIds": [
   "lt_multi_gonne_ball"
  ],
  "stats": {
   "damage": "2d pi++",
   "accuracy": "1",
   "range": "50/510",
   "rate_of_fire": "1",
   "shots": "10(30i)",
   "strength": "11†",
   "bulk": "-7",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Gonne",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -4
   }
  ],
  "problemIds": [
   "F05",
   "F22",
   "F31"
  ]
 },
 {
  "modeId": "WtbxiVp4UnahK1ipb",
  "equipmentId": "enxEQxvu3l4PJ3rWB",
  "name": "Ten-Eyed Gonne",
  "usage": "2nd Shot",
  "kind": "ten-eyed",
  "places": 10,
  "lock": "cannonlock",
  "powder": "serpentine",
  "pellets": 1,
  "reloadSeconds": 30,
  "muzzleloading": true,
  "source": "LT91",
  "ammoIds": [
   "lt_multi_gonne_ball"
  ],
  "stats": {
   "damage": "2d+1 pi++",
   "accuracy": "1",
   "range": "60/590",
   "rate_of_fire": "1",
   "shots": "10(30i)",
   "strength": "11†",
   "bulk": "-7",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Gonne",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -4
   }
  ],
  "problemIds": [
   "F05",
   "F22",
   "F31"
  ]
 },
 {
  "modeId": "WtCjdhkE6xPYvdH_i",
  "equipmentId": "enxEQxvu3l4PJ3rWB",
  "name": "Ten-Eyed Gonne",
  "usage": "3rd Shot",
  "kind": "ten-eyed",
  "places": 10,
  "lock": "cannonlock",
  "powder": "serpentine",
  "pellets": 1,
  "reloadSeconds": 30,
  "muzzleloading": true,
  "source": "LT91",
  "ammoIds": [
   "lt_multi_gonne_ball"
  ],
  "stats": {
   "damage": "2d+2 pi++",
   "accuracy": "1",
   "range": "65/630",
   "rate_of_fire": "1",
   "shots": "10(30i)",
   "strength": "11†",
   "bulk": "-7",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Gonne",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -4
   }
  ],
  "problemIds": [
   "F05",
   "F22",
   "F31"
  ]
 },
 {
  "modeId": "WQHeXdJ-jVlDztUou",
  "equipmentId": "enxEQxvu3l4PJ3rWB",
  "name": "Ten-Eyed Gonne",
  "usage": "4th Shot",
  "kind": "ten-eyed",
  "places": 10,
  "lock": "cannonlock",
  "powder": "serpentine",
  "pellets": 1,
  "reloadSeconds": 30,
  "muzzleloading": true,
  "source": "LT91",
  "ammoIds": [
   "lt_multi_gonne_ball"
  ],
  "stats": {
   "damage": "2d+2 pi++",
   "accuracy": "1",
   "range": "65/650",
   "rate_of_fire": "1",
   "shots": "10(30i)",
   "strength": "11†",
   "bulk": "-7",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Gonne",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -4
   }
  ],
  "problemIds": [
   "F05",
   "F22",
   "F31"
  ]
 },
 {
  "modeId": "WBnarXoat3qLrySda",
  "equipmentId": "enxEQxvu3l4PJ3rWB",
  "name": "Ten-Eyed Gonne",
  "usage": "5th Shot",
  "kind": "ten-eyed",
  "places": 10,
  "lock": "cannonlock",
  "powder": "serpentine",
  "pellets": 1,
  "reloadSeconds": 30,
  "muzzleloading": true,
  "source": "LT91",
  "ammoIds": [
   "lt_multi_gonne_ball"
  ],
  "stats": {
   "damage": "2d+3 pi++",
   "accuracy": "1",
   "range": "65/660",
   "rate_of_fire": "1",
   "shots": "10(30i)",
   "strength": "11†",
   "bulk": "-7",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Gonne",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Gonne",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -4
   }
  ],
  "problemIds": [
   "F05",
   "F22",
   "F31"
  ]
 },
 {
  "modeId": "WKYEp8I6N0arA1v3A",
  "equipmentId": "eR0fxLNLai2FOHu7t",
  "name": "Teppo",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "matchlock",
  "powder": "serpentine",
  "pellets": 1,
  "reloadSeconds": 60,
  "muzzleloading": true,
  "source": "LT93",
  "ammoIds": [
   "lt_teppo_bullet_lt93"
  ],
  "stats": {
   "damage": "1d+2 pi+",
   "accuracy": "2",
   "range": "45/500",
   "rate_of_fire": "1",
   "shots": "1(60)",
   "strength": "8†",
   "bulk": "-5",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Musket",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WMfHkvvdm6OGB_4Vt",
  "equipmentId": "edCOPZI0HlMPYn3ed",
  "name": "Wall Gun",
  "usage": "Shoot",
  "kind": "single",
  "places": 1,
  "lock": "wheellock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 40,
  "muzzleloading": true,
  "source": "LT93",
  "ammoIds": [
   "lt_wall_gun_bullet_lt93"
  ],
  "stats": {
   "damage": "5d+1 pi++",
   "accuracy": "2",
   "range": "120/1200",
   "rate_of_fire": "1",
   "shots": "1(40)",
   "strength": "13M†",
   "bulk": "-7",
   "recoil": "3"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Musket",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 },
 {
  "modeId": "WdgjNzGS4n0xMiSi4",
  "equipmentId": "eMM2x0c5BYnpcGNh2",
  "name": "Winged Tiger Gun",
  "usage": "Shoot",
  "kind": "barrels",
  "places": 3,
  "lock": "matchlock",
  "powder": "corned",
  "pellets": 1,
  "reloadSeconds": 60,
  "muzzleloading": true,
  "source": "LT93",
  "ammoIds": [
   "lt_winged_tiger_gun_bullet_lt93"
  ],
  "stats": {
   "damage": "2d-1 pi+",
   "accuracy": "2",
   "range": "45/470",
   "rate_of_fire": "1",
   "shots": "3(60i)",
   "strength": "8†",
   "bulk": "-5",
   "recoil": "2"
  },
  "governing_skill": {
   "status": "resolved",
   "skill": {
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   "candidates": [
    {
     "name": "Guns",
     "specialization": "Musket",
     "modifier": 0
    }
   ],
   "basis": "unique unmodified skill default"
  },
  "defaults": [
   {
    "type": "dx",
    "modifier": -4
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": "Musket",
    "modifier": 0
   },
   {
    "type": "skill",
    "name": "Guns",
    "specialization": null,
    "modifier": -2
   }
  ],
  "problemIds": [
   "F31"
  ]
 }
];
// LT10 and B198-199: Gonne defaults both ways at -4; GL/Gyroc/LAW also use -4.
for(const p of rows){
 if(p.modeId==='WFiGuhETQ5MGheGwO'){p.stats.strength='21M†';p.stats.bulk='-10';}
 const skill=p.governing_skill.skill;
 p.defaults=skill.name==='Artillery'?[{type:'skill',name:'Artillery',specialization:'Cannon',modifier:0},{type:'iq',modifier:-5}]:
  [{type:'skill',name:'Guns',specialization:skill.specialization,modifier:0},{type:'dx',modifier:-4},
   ...['Gonne','Musket','Pistol','Rifle','Shotgun','Light Machine Gun','Submachine Gun','Grenade Launcher','Gyroc','Light Anti-Armor Weapon'].filter(s=>s!==skill.specialization).map(s=>({type:'skill',name:'Guns',specialization:s,modifier:skill.specialization==='Gonne'||['Gonne','Grenade Launcher','Gyroc','Light Anti-Armor Weapon'].includes(s)?-4:-2}))];
}
export const LT_EARLY_PROFILES=Object.freeze(Object.fromEntries(rows.map(p=>[p.modeId,Object.freeze(p)])));

export const LT_TEN_EYED_MODES=Object.freeze(['WZsyvYVuMLMho_olT','WtbxiVp4UnahK1ipb','WtCjdhkE6xPYvdH_i','WQHeXdJ-jVlDztUou','WBnarXoat3qLrySda']);
export const ltEarlyProfile=value=>LT_EARLY_PROFILES[typeof value==='string'?value:value?.standaloneModeId??value?.catalogModeId]??ltArtilleryProfile(value)??ltFlameProfile(value);
export const ltEarlyImprovisedId=p=>'lt_p4_improvised_'+p.equipmentId;
export function ltEarlyFitValid(p,fit){
 return !!p&&fit?.equipmentId===p.equipmentId&&typeof fit.weaponId==='string'&&!!fit.weaponId&&Array.isArray(fit.barrels)&&
  fit.barrels.length>0&&fit.barrels.every(n=>Number.isSafeInteger(n)&&n>=0&&n<p.places)&&new Set(fit.barrels).size===fit.barrels.length;
}
export function ltEarlyPhysicalAdmission(modeId,ammoId,kind,fit){
 const p=ltEarlyProfile(modeId);if(!p)return null;
 if(p.kind==='artillery')return ltArtilleryAdmission(modeId,ammoId,kind);
 if(p.kind==='flame')return ltFlameAdmission(modeId,ammoId,kind);
 if(ammoId==='lt_puckle_gun_bullet_lt93')return {status:'incompatible',reasons:[{code:'LT_PUCKLE_LOADING_DEVICE',message:'Исходная запись относится к Puckle Gun Cylinder. Цилиндр — устройство заряжания; выберите отдельную круглую пулю.'}]};
 if(kind!=='ammo-item')return {status:'undetermined',reasons:[{code:'LT_EARLY_ITEM_REQUIRED',message:'Выберите конкретный снаряд и его подготовленную партию.'}]};
 if(ammoId==='lt_puckle_square_bullet_lt93')return {status:'undetermined',reasons:[{code:'LT_PUCKLE_SQUARE_UNDETERMINED',message:'LT93 подтверждает отдельную квадратную конструкцию Puckle, но не задаёт её отдельные Damage/Range. Профиль круглой пули ей не присваивается.'}]};
 const allowed=p.ammoIds.includes(ammoId)||p.usage!=='Shoot Bolt'&&ammoId===ltEarlyImprovisedId(p);
 if(!allowed)return {status:'incompatible',reasons:[{code:'LT_EARLY_WRONG_PROJECTILE',message:'Физический снаряд не относится к этому режиму LT.'}]};
 if(['ten-eyed','facing'].includes(p.kind)&&!ltEarlyFitValid(p,fit))return {status:'undetermined',reasons:[{code:'LT_EARLY_FITTED_BARRELS_REQUIRED',message:'LT87,91: нужна партия, подогнанная к этому экземпляру и указанным зарядным местам.'}]};
 return {status:'compatible',reasons:[]};
}
export function ltEarlyConfiguration(weapon){
 if(ltFlameProfile(weapon))return ltFlameConfiguration(weapon);
 if(ltArtilleryProfile(weapon))return ltArtilleryConfiguration(weapon);
 const s=weapon?.ltEarly?.settings??{};
 return {crew:s.crew===2?2:1,ignitionReady:s.ignitionReady===true,stockCollapsed:s.stockCollapsed===true};
}
export function projectLTEarlyFirearmsSource(book,data){
 if(book==='weapons')for(const e of data.equipment??[])if(e.source==='LT')for(const m of e.modes??[]){
  const p=LT_EARLY_PROFILES[m.weapon_mode_id];if(!p||e.equipment_id!==p.equipmentId)continue;
  const s={...p.stats};delete s.damage;Object.assign(m.stats,s);
  const match=/^(\d+d(?:[+-]\d+)?)\s*(?:\(([^)]+)\))?\s+(\S+)$/.exec(p.stats.damage);
  if(match)m.stats.damage={base:match[1],...(match[2]?{armor_divisor:match[2]}:{}),type:match[3]};
  m.raw_calc={...m.raw_calc,damage:p.stats.damage};m.governing_skill=structuredClone(p.governing_skill);m.defaults=structuredClone(p.defaults);
  m.lt_early_contract={...p};m.weapon_family='firearm';
  m.lt_ammo_item_ids=[...new Set([...(m.lt_ammo_item_ids??[]),...p.ammoIds,...(p.usage==='Shoot Bolt'?[]:[ltEarlyImprovisedId(p)]),...(p.kind==='puckle'?['lt_puckle_square_bullet_lt93']:[])])];
 }
 if(book==='lt'){
  const add=item=>{let r=data.ammo_items.find(a=>a.id===item.id);if(!r){r={...item,specific_model_only:true,catalog_added_from_book:true,variant_id:null};data.ammo_items.push(r);}else r.weapon_mode_ids=[...new Set([...r.weapon_mode_ids,...item.weapon_mode_ids])];
   let family=data.ammo_families.find(f=>f.id===r.ammo_family_id);if(!family){family={id:r.ammo_family_id,name:r.name,ammo_item_ids:[],compatible_weapon_mode_ids:[]};data.ammo_families.push(family);}
   family.ammo_item_ids=[...new Set([...family.ammo_item_ids,r.id])];family.compatible_weapon_mode_ids=[...new Set([...family.compatible_weapon_mode_ids,...r.weapon_mode_ids])];};
  for(const p of rows)if(p.usage!=='Shoot Bolt')add({id:ltEarlyImprovisedId(p),ammo_family_id:ltEarlyImprovisedId(p),name:p.name+' — подручный снаряд',weapon_mode_ids:rows.filter(q=>q.equipmentId===p.equipmentId&&q.usage!=='Shoot Bolt').map(q=>q.modeId),projectile_classes:['black_powder_firearm'],source_ref_raw:'LT95',tech_level_raw:null,lt_early_improvised:true});
  add({id:'lt_puckle_square_bullet_lt93',ammo_family_id:'lt_puckle_square_bullet',name:'Puckle Gun — квадратная пуля, отдельная конструкция',weapon_mode_ids:['WRLeJSlkTELYgEN_u'],projectile_classes:['black_powder_firearm'],source_ref_raw:'LT93',tech_level_raw:'4',lt_early_source_undetermined:true});
  add({id:'lt_puckle_round_ball_lt93',ammo_family_id:'lt_puckle_round_ball',name:'Puckle Gun — круглая пуля',source_equipment_id:'ek9PiJhQ5UEqXYawL',weapon_mode_ids:['WRLeJSlkTELYgEN_u'],projectile_classes:['black_powder_firearm'],source_ref_raw:'LT92–93',tech_level_raw:'4'});
  const cylinder=data.ammo_items.find(a=>a.id==='lt_puckle_gun_bullet_lt93');if(cylinder)cylinder.lt_early_loading_device=true;
  for(const id of ['lt_early_load'])if(!data.projectile_options.some(v=>v.id===id))data.projectile_options.push({id,name:'Подготовленная партия раннего огнестрела',applies_to:['black_powder_firearm','black_powder_cannonball'],min_tl:3,source_ref:'LT84-95'});
  for(const p of rows)for(const id of p.ammoIds){const a=data.ammo_items.find(a=>a.id===id);if(a)a.lt_early_physical_unit={kind:p.pellets>1?'projectile-set':'projectile',projectiles:p.pellets,weightPerProjectilePublished:false};}
 }
 return data;
}
