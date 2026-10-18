// UT2007 pp. 152-159: factual values rechecked against BooksCodex on 2026-10-15.
// Derived data only; no PDF content or runtime dependency on the library/archive.
import { UT_APHEX_COST_MULTIPLIER } from '../ut-errata.js';
export const UT_EXTENDED_SOURCE = Object.freeze({
  "ut_aphex": {
    "id": "aphex",
    "name": "Armor-Piercing Hardcore Explosive (APHEX)",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 10,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": UT_APHEX_COST_MULTIPLIER,
      "lc": null
    },
    "damage_behavior": "base_plus_followup",
    "damage_table": {
      "10mm": {
        "followup": "1d-4 cr ex",
        "fragmentation": "1d-2 cut"
      },
      "15mm": {
        "followup": "1d-2 cr ex",
        "fragmentation": "1d-1 cut"
      },
      "18.5mm": {
        "followup": "1d-1 cr ex",
        "fragmentation": "1d cut"
      },
      "25mm": {
        "followup": "1d cr ex",
        "fragmentation": "1d+1 cut"
      },
      "40mm": {
        "followup": "2d cr ex",
        "fragmentation": "2d cut"
      },
      "64mm": {
        "followup": "4d cr ex",
        "fragmentation": "3d cut"
      },
      "100mm": {
        "followup": "8d cr ex",
        "fragmentation": "5d cut"
      }
    },
    "source_ref": "UT 152-153",
    "instructions": [
      "Обычный проникающий урон с бронеделителем (2), затем последующий взрыв и осколки.",
      "Взрывной урон TL10–12: +1 за кубик."
    ]
  },
  "ut_flare": {
    "id": "flare",
    "name": "Flare",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 15,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 2,
      "lc": 4
    },
    "damage_behavior": "replace_with_spec",
    "damage_table": {
      "15mm": {
        "damage": "spec.",
        "illumination_radius_yards": 150
      },
      "18.5mm": {
        "damage": "spec.",
        "illumination_radius_yards": 185
      },
      "25mm": {
        "damage": "spec.",
        "illumination_radius_yards": 250
      },
      "40mm": {
        "damage": "spec.",
        "illumination_radius_yards": 400
      },
      "64mm": {
        "damage": "spec.",
        "illumination_radius_yards": 600
      },
      "100mm": {
        "damage": "spec.",
        "illumination_radius_yards": 1000
      }
    },
    "source_ref": "UT 153",
    "instructions": [
      "Прямое попадание: 1d burn. Боеголовка освещает указанную область на пять минут.",
      "В пределах 1% радиуса освещения предусмотрена проверка HT по правилам Flare (в темноте HT-3)."
    ]
  },
  "ut_he": {
    "id": "he",
    "name": "High Explosive (HE)",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 10,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 1,
      "lc": 2
    },
    "damage_behavior": "base_plus_followup_or_proximity",
    "damage_table": {
      "10mm": {
        "explosion": "1d cr ex",
        "fragmentation": "1d-2 cut"
      },
      "15mm": {
        "explosion": "2d cr ex",
        "fragmentation": "1d-1 cut"
      },
      "18.5mm": {
        "explosion": "2d+2 cr ex",
        "fragmentation": "1d cut"
      },
      "25mm": {
        "explosion": "4d cr ex",
        "fragmentation": "1d+1 cut"
      },
      "40mm": {
        "explosion": "8d cr ex",
        "fragmentation": "2d cut"
      },
      "64mm": {
        "explosion": "8d×2 cr ex",
        "fragmentation": "3d cut"
      },
      "100mm": {
        "explosion": "6d×5 cr ex",
        "fragmentation": "5d cut"
      }
    },
    "source_ref": "UT 153-154",
    "instructions": [
      "Ударный взрыватель: пробивающий урон оружия с бронеделителем (0,5), затем последующий взрыв и осколки.",
      "Дистанционный взрыватель: бросок по области с +4, только осколки; цель должна находиться не ближе 40 ярдов.",
      "Не считать дистанционный подрыв отдельным попаданием обычной пулей."
    ]
  },
  "ut_hec": {
    "id": "hec",
    "name": "High Explosive Concussion (HEC)",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 10,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 1,
      "lc": 2
    },
    "damage_behavior": "base_plus_linked",
    "damage_table": {
      "10mm": {
        "linked": "1d cr ex"
      },
      "15mm": {
        "linked": "2d cr ex"
      },
      "18.5mm": {
        "linked": "2d+2 cr ex"
      },
      "25mm": {
        "linked": "4d cr ex"
      },
      "40mm": {
        "linked": "8d cr ex"
      },
      "64mm": {
        "linked": "8d×2 cr ex"
      },
      "100mm": {
        "linked": "6d×5 cr ex"
      }
    },
    "source_ref": "UT 154",
    "instructions": [
      "Обычный пробивающий урон (обычно с бронеделителем 0,5) и отдельный связанный ударный взрыв.",
      "Для электромагнитного оружия бронеделитель 0,5 к пробивающему урону не добавляется."
    ]
  },
  "ut_shaped_charge": {
    "id": "shaped_charge",
    "name": "Shaped Charge",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 25,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 2,
      "lc": 1
    },
    "damage_behavior": "replace_base",
    "damage_table": {
      "25mm": {
        "primary": "5d×3(10) cr inc",
        "linked": "2d cr ex",
        "fragmentation": "1d+1 cut"
      },
      "40mm": {
        "primary": "6d×4(10) cr inc",
        "linked": "4d cr ex",
        "fragmentation": "2d cut"
      },
      "64mm": {
        "primary": "6d×7(10) cr inc",
        "linked": "8d cr ex",
        "fragmentation": "3d cut"
      },
      "100mm": {
        "primary": "6d×10(10) cr inc",
        "linked": "8d×2 cr ex",
        "fragmentation": "5d cut"
      }
    },
    "source_ref": "UT 154",
    "instructions": [
      "Кумулятивный первичный урон и связанный взрыв с осколками.",
      "Обычный пробивающий урон оружия заменяется эффектом боеголовки."
    ]
  },
  "ut_memory_baton": {
    "id": "memory_baton",
    "name": "Memory Baton",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 15,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 5,
      "lc": 4
    },
    "damage_behavior": "modify_base",
    "damage_table": null,
    "source_ref": "UT 154",
    "instructions": [
      "Урон становится crushing с бронеделителем (0,25).",
      "Отбрасывание ×2, дальность ×0,2."
    ]
  },
  "ut_monochain": {
    "id": "monochain",
    "name": "Monochain",
    "min_tl": 9,
    "superscience": true,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": null,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 5,
      "lc": 2
    },
    "damage_behavior": "modify_base",
    "damage_table": null,
    "source_ref": "UT 154",
    "instructions": [
      "Урон и дальность уменьшаются вдвое; +1 к попаданию.",
      "По определённым зонам тела и малым целям — cutting (10); остальные условия см. UT 154."
    ]
  },
  "ut_sefop": {
    "id": "sefop",
    "name": "Smart Explosively Forged Projectile (SEFOP)",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 15,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": true
    },
    "economics": {
      "cost_multiplier": 5,
      "lc": 2
    },
    "damage_behavior": "replace_base",
    "damage_table": {
      "15mm": {
        "damage": "4d(2) imp inc"
      },
      "18.5mm": {
        "damage": "5d(2) imp inc"
      },
      "25mm": {
        "damage": "5d×3(3) cr inc"
      },
      "40mm": {
        "damage": "6d×4(3) cr inc"
      },
      "64mm": {
        "damage": "6d×7(3) cr inc"
      },
      "100mm": {
        "damage": "6d×10(3) cr inc"
      }
    },
    "source_ref": "UT 154",
    "instructions": [
      "Только самонаводящийся снаряд. Можно поразить боковую или верхнюю сторону цели.",
      "При атаке сверху игнорируются соответствующие штрафы положения и укрытие, не защищающее сверху.",
      "На TL10+ возможна заранее запрограммированная замена эффекта на APHEX."
    ]
  },
  "ut_thermobaric": {
    "id": "thermobaric",
    "name": "Thermobaric",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 25,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 5,
      "lc": 1
    },
    "damage_behavior": "replace_base",
    "damage_table": {
      "25mm": {
        "damage": "8d cr ex inc"
      },
      "40mm": {
        "damage": "8d×2 cr ex inc"
      },
      "64mm": {
        "damage": "6d×5 cr ex inc"
      },
      "100mm": {
        "damage": "6d×10 cr ex inc"
      }
    },
    "source_ref": "UT 155",
    "instructions": [
      "Взрывной зажигательный урон; в разреженной среде и вакууме уменьшается по правилам."
    ]
  },
  "ut_burrow_darts": {
    "id": "burrow_darts",
    "name": "Burrow Darts",
    "min_tl": 10,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": null,
      "max_size_exclusive_mm": 10,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false,
      "base_damage_types_any": [
        "pi-",
        "pi"
      ]
    },
    "economics": {
      "cost_multiplier": 3,
      "lc": 2
    },
    "damage_behavior": "modify_base_plus_cyclic",
    "damage_table": null,
    "source_ref": "UT 155",
    "instructions": [
      "При ранении не менее 1 HP снаряд наносит циклический дополнительный урон каждую секунду в пределах правил UT.",
      "Проверить условия остановки эффекта и допустимый калибр."
    ]
  },
  "ut_hemp": {
    "id": "hemp",
    "name": "High Explosive Multi-Purpose (HEMP)",
    "min_tl": 10,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 10,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 2,
      "lc": 1
    },
    "damage_behavior": "replace_base",
    "damage_table": {
      "10mm": {
        "primary": "8d(5) imp inc",
        "linked": "1d-2 cr ex",
        "fragmentation": "1d-2 cut"
      },
      "15mm": {
        "primary": "5d×2(5) imp inc",
        "linked": "1d cr ex",
        "fragmentation": "1d-1 cut"
      },
      "18.5mm": {
        "primary": "6d×2(5) imp inc",
        "linked": "1d+1 cr ex",
        "fragmentation": "1d cut"
      },
      "25mm": {
        "primary": "6d×3(10) cr inc",
        "linked": "2d cr ex",
        "fragmentation": "1d+1 cut"
      },
      "40mm": {
        "primary": "6d×5(10) cr inc",
        "linked": "4d cr ex",
        "fragmentation": "2d cut"
      },
      "64mm": {
        "primary": "6d×8(10) cr inc",
        "linked": "8d cr ex",
        "fragmentation": "3d cut"
      },
      "100mm": {
        "primary": "6d×12(10) cr inc",
        "linked": "8d×2 cr ex",
        "fragmentation": "5d cut"
      }
    },
    "source_ref": "UT 155",
    "instructions": [
      "Основное пробивное или кумулятивное воздействие, связанный взрыв и осколки.",
      "На TL11–12 к основному incendiary-урону добавляется +1 за кубик."
    ]
  },
  "ut_stingray": {
    "id": "stingray",
    "name": "Stingray",
    "min_tl": 10,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 10,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 5,
      "lc": 2
    },
    "damage_behavior": "modify_base_plus_linked",
    "damage_table": {
      "10mm": {
        "linked": "1d-3 burn sur"
      },
      "15mm": {
        "linked": "1d-1 burn sur"
      },
      "18.5mm": {
        "linked": "1d burn sur"
      },
      "25mm": {
        "linked": "1d+1 burn sur"
      },
      "40mm": {
        "linked": "2d burn sur"
      },
      "64mm": {
        "linked": "3d burn sur"
      },
      "100mm": {
        "linked": "5d burn sur"
      }
    },
    "source_ref": "UT 155-156",
    "instructions": [
      "Пробивающий урон уменьшается вдвое с бронеделителем (0,25).",
      "Параллельно наносится указанный связанный электрический burn sur."
    ]
  },
  "ut_swarm": {
    "id": "swarm",
    "name": "Swarm",
    "min_tl": 10,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 40,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 5,
      "lc": null
    },
    "damage_behavior": "replace_with_spec",
    "damage_table": {
      "40mm": {
        "damage": "spec.",
        "capacity": "1 square-yard swarm"
      },
      "64mm": {
        "damage": "spec.",
        "capacity": "4 square-yard swarms"
      },
      "100mm": {
        "damage": "spec.",
        "capacity": "16 square-yard swarms"
      }
    },
    "source_ref": "UT 156",
    "instructions": [
      "Выпускает рой роботов; число роёв/площадь зависит от размера.",
      "Конкретный вид роботов и эффект должны быть указаны в Notes; не подменять их вымышленным уроном."
    ]
  },
  "ut_aphd": {
    "id": "aphd",
    "name": "Armor-Piercing Hyperdense Dart (APHD)",
    "min_tl": 11,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": null,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 10,
      "lc": 1
    },
    "damage_behavior": "modify_base",
    "damage_table": null,
    "source_ref": "UT 156",
    "instructions": [
      "Бронеделитель (5), дальность ×2; уменьшение категории пробивающего урона для калибра менее 20 мм."
    ]
  },
  "ut_mininuke": {
    "id": "mininuke",
    "name": "Mininuke",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": null,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false,
      "min_size_mm_by_tl": {
        "9": 100,
        "10": 64,
        "11": 40,
        "12": 25
      }
    },
    "economics": {
      "cost_multiplier": 1000,
      "lc": 0
    },
    "damage_behavior": "replace_base",
    "damage_table": {
      "0.01kt": {
        "primary": "6d×200 cr ex",
        "linked": "4d×200 burn ex rad sur"
      },
      "0.1kt": {
        "primary": "6d×600 cr ex",
        "linked": "6d×400 burn ex rad sur"
      },
      "1kt": {
        "primary": "6d×2,000 cr ex",
        "linked": "4d×2,000 burn ex rad sur"
      }
    },
    "source_ref": "UT 156",
    "instructions": [
      "Сначала взрыв cr ex, отдельно связанный burn ex rad sur.",
      "Тепловой/радиационный компонент использует особый делитель расстояния, указанный в UT 156.",
      "Перед выстрелом требуется выбрать мощность (0,01 / 0,1 / 1 кт); изменение — манёвр Ready."
    ]
  },
  "ut_micro_antimatter": {
    "id": "micro_antimatter",
    "name": "Micro-Antimatter",
    "min_tl": 10,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": null,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false,
      "min_size_mm_by_tl": {
        "10": 100,
        "11": 40,
        "12": 10
      }
    },
    "economics": {
      "cost_multiplier": 10,
      "lc": 0
    },
    "damage_behavior": "replace_base",
    "damage_table": {
      "0.1ug": {
        "primary": "6d×4 burn ex sur",
        "linked": "6d×10,000 tox rad"
      },
      "1ug": {
        "primary": "6d×12 burn ex sur",
        "linked": "6d×100,000 tox rad"
      },
      "10ug": {
        "primary": "6d×40 burn ex sur",
        "linked": "6d×1,000,000 tox rad"
      }
    },
    "source_ref": "UT 156-157",
    "instructions": [
      "Взрыв burn ex sur плюс связанное токсическое радиационное поражение.",
      "Для основного и радиационного компонентов используются разные делители расстояния по UT 157.",
      "Мощность выбирается по размеру антиматерийного заряда, это не dial-a-yield."
    ]
  },
  "ut_emp": {
    "id": "emp",
    "name": "EMP",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 15,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 10,
      "lc": 2
    },
    "damage_behavior": "replace_base",
    "damage_table": {
      "15mm": {
        "damage": "spec. + 1d-4 cr ex",
        "radius_yards": 1,
        "resist": "HT-8 (2) for electrical targets"
      },
      "18.5mm": {
        "damage": "spec. + 1d-3 cr ex",
        "radius_yards": 1,
        "resist": "HT-8 (2)"
      },
      "25mm": {
        "damage": "spec. + 1d-2 cr ex",
        "radius_yards": 2,
        "resist": "HT-8 (2)"
      },
      "40mm": {
        "damage": "spec. + 1d cr ex",
        "radius_yards": 4,
        "resist": "HT-8 (2)"
      },
      "64mm": {
        "damage": "spec. + 2d cr ex",
        "radius_yards": 8,
        "resist": "HT-8 (2)"
      },
      "100mm": {
        "damage": "spec. + 4d cr ex",
        "radius_yards": 16,
        "resist": "HT-8 (2)"
      }
    },
    "source_ref": "UT 157",
    "instructions": [
      "Только электрическое оборудование и цели с недостатком Electrical проходят HT-8 (2).",
      "При провале устройство отключается на число секунд, равное величине провала; роботы теряют сознание, полные киборги испытывают Seizure.",
      "Кроме эффекта EMP присутствует взрывной урон cr ex, зависящий от калибра."
    ]
  },
  "ut_expendable_jammer": {
    "id": "expendable_jammer",
    "name": "Expendable Jammer",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 10,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 5,
      "lc": 3
    },
    "damage_behavior": "replace_with_spec",
    "damage_table": {
      "10mm": {
        "damage": "spec.",
        "radius_yards": 10
      },
      "15mm": {
        "damage": "spec.",
        "radius_yards": 15
      },
      "18.5mm": {
        "damage": "spec.",
        "radius_yards": 20
      },
      "40mm": {
        "damage": "spec.",
        "radius_yards": 40
      },
      "64mm": {
        "damage": "spec.",
        "radius_yards": 60
      },
      "100mm": {
        "damage": "spec.",
        "radius_yards": 100
      }
    },
    "source_ref": "UT 157",
    "instructions": [
      "Помехи радиосвязи и радарам: -10 к Electronics Operation (Comm) в пределах радиуса.",
      "Таймер запуска устанавливается отдельно. Радиус 25 мм = 25 ярдов — правило OleGURPS, не официальное значение книги."
    ]
  },
  "ut_strobe": {
    "id": "strobe",
    "name": "Strobe",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 25,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 4,
      "lc": 3
    },
    "damage_behavior": "replace_with_affliction",
    "damage_table": {
      "25mm": {
        "damage": "HT-3 aff",
        "radius_yards": 3
      },
      "40mm": {
        "damage": "HT-4 aff",
        "radius_yards": 4
      },
      "64mm": {
        "damage": "HT-6 aff",
        "radius_yards": 6
      },
      "100mm": {
        "damage": "HT-10 aff",
        "radius_yards": 10
      }
    },
    "source_ref": "UT 157",
    "instructions": [
      "Зрительная Affliction действует на тех, кто смотрит на вспышку.",
      "При провале HT: оглушение и Blindness на число секунд, равное величине провала.",
      "При провале на 5+ либо любом провале у персонажа с Epilepsy: Seizure на число минут, равное величине провала.",
      "За каждый ярд от центра эффекта +1 к HT на сопротивление."
    ]
  },
  "ut_warbler": {
    "id": "warbler",
    "name": "Warbler",
    "min_tl": 9,
    "superscience": false,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 25,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 4,
      "lc": 3
    },
    "damage_behavior": "replace_with_affliction",
    "damage_table": {
      "25mm": {
        "damage": "HT-3 aff",
        "radius_yards": 3
      },
      "40mm": {
        "damage": "HT-4 aff",
        "radius_yards": 4
      },
      "64mm": {
        "damage": "HT-6 aff",
        "radius_yards": 6
      },
      "100mm": {
        "damage": "HT-10 aff",
        "radius_yards": 10
      }
    },
    "source_ref": "UT 157",
    "instructions": [
      "Слуховая Affliction; требуется возможность слышать.",
      "При провале HT: Deafness и Moderate Pain на число минут, равное величине провала.",
      "При провале на 5+ наступает длительная потеря слуха, как калечащее ранение.",
      "Каждый ярд от центра даёт +1 к сопротивлению. Эффект длится до 10 секунд; при нахождении в зоне возможны повторные проверки.",
      "Штраф к Hearing: -10 внутри зоны, -5 в пределах двух радиусов, -2 в пределах пяти радиусов."
    ]
  },
  "ut_force": {
    "id": "force",
    "name": "Force",
    "min_tl": 10,
    "superscience": true,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 15,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 5,
      "lc": 2
    },
    "damage_behavior": "replace_base",
    "damage_table": {
      "15mm": {
        "damage": "2d cr dkb ex"
      },
      "18.5mm": {
        "damage": "2d+2 cr dkb ex"
      },
      "25mm": {
        "damage": "4d cr dkb ex"
      },
      "40mm": {
        "damage": "8d cr dkb ex"
      },
      "64mm": {
        "damage": "8d×2 cr dkb ex"
      },
      "100mm": {
        "damage": "6d×5 cr dkb ex"
      }
    },
    "source_ref": "UT 157-158",
    "instructions": [
      "Взрывной crushing-урон с двойным отбрасыванием (dkb); без осколков."
    ]
  },
  "ut_plasma": {
    "id": "plasma",
    "name": "Plasma",
    "min_tl": 10,
    "superscience": true,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 10,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 10,
      "lc": 1
    },
    "damage_behavior": "replace_base",
    "damage_table": {
      "10mm": {
        "damage": "1d+2 burn ex sur"
      },
      "15mm": {
        "damage": "3d burn ex sur"
      },
      "18.5mm": {
        "damage": "3d+2 burn ex sur"
      },
      "25mm": {
        "damage": "6d burn ex sur"
      },
      "40mm": {
        "damage": "6d×2 burn ex sur"
      },
      "64mm": {
        "damage": "6d×4 burn ex sur"
      },
      "100mm": {
        "damage": "6d×10 burn ex sur"
      }
    },
    "source_ref": "UT 158",
    "instructions": [
      "Взрывной burning-урон с surge; обычный пробивающий урон заменяется эффектом боеголовки."
    ]
  },
  "ut_implosion": {
    "id": "implosion",
    "name": "Implosion",
    "min_tl": 11,
    "superscience": true,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 40,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 5,
      "lc": 0
    },
    "damage_behavior": "replace_base",
    "damage_table": {
      "40mm": {
        "primary": "6d×25 cr dkb ex",
        "linked": "6d×40 tox rad ex"
      },
      "64mm": {
        "primary": "6d×50 cr dkb ex",
        "linked": "6d×60 tox rad ex"
      },
      "100mm": {
        "primary": "6d×100 cr dkb ex",
        "linked": "6d×100 tox rad ex"
      }
    },
    "source_ref": "UT 158",
    "instructions": [
      "Связанные crushing dkb ex и tox rad ex; отбрасывание направлено к центру.",
      "Токсический радиационный компонент использует специальный делитель расстояния."
    ]
  },
  "ut_psi_bomb": {
    "id": "psi_bomb",
    "name": "Psi-Bomb",
    "min_tl": 12,
    "superscience": true,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 25,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 10,
      "lc": 2
    },
    "damage_behavior": "replace_with_affliction",
    "damage_table": {
      "25mm": {
        "damage": "spec.",
        "radius_yards": 2,
        "resist": "Will-5"
      },
      "40mm": {
        "damage": "spec.",
        "radius_yards": 4,
        "resist": "Will-5"
      },
      "64mm": {
        "damage": "spec.",
        "radius_yards": 8,
        "resist": "Will-5"
      },
      "100mm": {
        "damage": "spec.",
        "radius_yards": 16,
        "resist": "Will-5"
      }
    },
    "source_ref": "UT 158",
    "instructions": [
      "Все цели в области проверяют Will-5; обычная DR не действует, Mind Shield даёт бонус.",
      "При провале: оглушение, восстановление при -5 и потеря памяти о последних двух секундах.",
      "При провале на 5+: потеря сознания на число минут, равное величине провала.",
      "Не действует на Digital Mind и IQ 0."
    ]
  },
  "ut_message_psi_bomb": {
    "id": "message_psi_bomb",
    "name": "Message Psi-Bomb",
    "min_tl": 12,
    "superscience": true,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 25,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 10,
      "lc": 3
    },
    "damage_behavior": "replace_with_affliction",
    "damage_table": {
      "25mm": {
        "damage": "spec.",
        "radius_yards": 2,
        "resist": "Will-2"
      },
      "40mm": {
        "damage": "spec.",
        "radius_yards": 4,
        "resist": "Will-2"
      },
      "64mm": {
        "damage": "spec.",
        "radius_yards": 8,
        "resist": "Will-2"
      },
      "100mm": {
        "damage": "spec.",
        "radius_yards": 16,
        "resist": "Will-2"
      }
    },
    "source_ref": "UT 158",
    "instructions": [
      "Проверка Will-2, Mind Shield помогает; вместо шума передаётся сообщение из Notes.",
      "По общему правилу Psi-Bomb оглушает, но не вызывает потерю сознания.",
      "При провале на 5+: после восстановления остаётся «эхо» сообщения (Moderate Pain) на число минут, равное величине провала.",
      "Не действует на Digital Mind и IQ 0."
    ]
  },
  "ut_terror_psi_bomb": {
    "id": "terror_psi_bomb",
    "name": "Terror Psi-Bomb",
    "min_tl": 12,
    "superscience": true,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 25,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 10,
      "lc": 2
    },
    "damage_behavior": "replace_with_affliction",
    "damage_table": {
      "25mm": {
        "damage": "spec.",
        "radius_yards": 2,
        "resist": "Fright Check -5"
      },
      "40mm": {
        "damage": "spec.",
        "radius_yards": 4,
        "resist": "Fright Check -5"
      },
      "64mm": {
        "damage": "spec.",
        "radius_yards": 8,
        "resist": "Fright Check -5"
      },
      "100mm": {
        "damage": "spec.",
        "radius_yards": 16,
        "resist": "Fright Check -5"
      }
    },
    "source_ref": "UT 158",
    "instructions": [
      "Все цели в области проходят Fright Check с -5; Mind Shield помогает.",
      "При провале применяются обычные последствия Fright Check; это не бросок HT и не обычный Affliction.",
      "Не действует на Digital Mind и IQ 0."
    ]
  },
  "ut_stasis": {
    "id": "stasis",
    "name": "Stasis",
    "min_tl": 12,
    "superscience": true,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 40,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 500,
      "lc": 0
    },
    "damage_behavior": "replace_with_spec",
    "damage_table": {
      "40mm": {
        "damage": "spec.",
        "radius_yards": 2
      },
      "64mm": {
        "damage": "spec.",
        "radius_yards": 3
      },
      "100mm": {
        "damage": "spec.",
        "radius_yards": 5
      }
    },
    "source_ref": "UT 158-159",
    "instructions": [
      "Сфера стазиса захватывает всё незащищённое в пределах радиуса.",
      "Продолжительность задаётся до выстрела; соответствующие силовые поля защищают."
    ]
  },
  "ut_vortex": {
    "id": "vortex",
    "name": "Vortex",
    "min_tl": 12,
    "superscience": true,
    "compatibility": {
      "source_required": "Ultra-Tech",
      "weapon_min_tl": 9,
      "min_size_mm": 40,
      "max_size_exclusive_mm": null,
      "allowed_warhead_classes": null,
      "platform_any": null,
      "exclude_platforms": [],
      "requires_homing": false
    },
    "economics": {
      "cost_multiplier": 1000,
      "lc": 0
    },
    "damage_behavior": "replace_with_spec",
    "damage_table": {
      "40mm": {
        "damage": "spec.",
        "radius_yards": 2
      },
      "64mm": {
        "damage": "spec.",
        "radius_yards": 3
      },
      "100mm": {
        "damage": "spec.",
        "radius_yards": 5
      }
    },
    "source_ref": "UT 159",
    "instructions": [
      "В атмосфере и поле тяжести предметы, помещающиеся в сферу, уносятся в гиперпространство/червоточину.",
      "Место назначения и возможность возвращения определяет ведущий."
    ]
  }
});
