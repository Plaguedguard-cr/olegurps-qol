// Reviewed nominal metric designations in the HT161-163 and HT176-177 cartridge tables.
// Exact ammo IDs only: this data never joins weapons by name, bore or numeric caliber.
export const HT_REVIEWED_PLATFORMS = Object.freeze({
  W4EbC4v3uPyORRhTC: "anti_materiel_rifle", WdNlv4XvVH5vNfQoh: "anti_materiel_rifle"
}); // HT118-119: exact Barrett .50 AMR roles, not a generic large-caliber inference.
// HT110-127,176-177: reviewed rifle/MG cartridge identities, excluding pistol-cartridge chamberings.
// HT167 permits APDS for this class, including experimental rifle loads; no factory model is implied.
export const HT_RIFLE_CARTRIDGE_IDS = Object.freeze([
  "ht_30_m1_carbine_7_62x33mm", "ht_30_remington_7_62x52mm", "ht_30_06_springfield_7_62x63mm",
  "ht_30_30_winchester_7_62x51mmr", "ht_30_40_krag_7_62x59mmr", "ht_35_remington_8_9x49mm",
  "ht_40_90_sharps_10_2x67mmr", "ht_45_55_springfield_11_43x53mmr", "ht_45_70_springfield_11_43x53mmr",
  "ht_45_75_winchester_11_43x48mmr", "ht_45_110_sharps_11_43x73mmr", "ht_50_browning_12_7x99mm",
  "ht_50_70_government_13x44mmr", "ht_50_90_sharps_12_9x64mmr", "ht_50_95_winchester_express_12_7x49mmr",
  "ht_50_140_sharps_12_9x83mmr", "ht_56_50_spencer_14x22mmr", "ht_56_56_spencer_14x22mmr",
  "ht_58_berdan_15x44mmr", "ht_220_swift_5_56x56mmr", "ht_280_remington_7x65mm_express",
  "ht_300_remington_ultra_magnum_7_62x72mmrb", "ht_300_winchester_magnum_7_62x66mmb", "ht_303_british_7_7x56mmr",
  "ht_338_lapua_magnum_8_6x70mm", "ht_375_h_h_magnum_9_35x72mmb", "ht_444_marlin_10_9x57mmr",
  "ht_450_gardner_gatling_11_43x63mmr", "ht_450_martini_henry_11_43x59mmr", "ht_458_winchester_magnum_11_63x64mmb",
  "ht_460_weatherby_magnum_11_63x74mmb", "ht_470_nitro_express_12x83mmr", "ht_577_snider_14_6x51mmr",
  "ht_600_nitro_express_15_2x76mmr", "ht_700_nitro_express_17_8x80mmr", "ht_5_6x57mmb", "ht_5_8x42mm",
  "ht_5_45x39mm", "ht_5_56x45mm_nato", "ht_6_5x50mmsr_arisaka", "ht_6_5x52mm_mannlicher_carcano",
  "ht_6_5x53mmr_dutch_mannlicher", "ht_6_5x55mm_mauser", "ht_6x60mm_lee_236_navy", "ht_7_5x54mm_mas",
  "ht_7_7x58mm_arisaka", "ht_7_7x58mmsr_arisaka", "ht_7_62x39mm", "ht_7_62x42mm",
  "ht_7_62x51mm_nato_308_winchester", "ht_7_62x54mmr_mosin_nagant", "ht_7_65x53mm_mauser",
  "ht_7_92x33mm_kurz", "ht_7_92x57mm_mauser", "ht_7x57mm_mauser", "ht_7x64mmb_remington_magnum",
  "ht_8x50mmr_lebel", "ht_8x50mmr_mannlicher", "ht_8x58mmr_krag", "ht_8x60mm_mauser", "ht_8x63mm_bofors",
  "ht_9_3x74mmr", "ht_9x39mm", "ht_10_75x58mmr_berdan", "ht_10_75x68mm_mauser",
  "ht_11_15x58mmr_43_spanish_remington", "ht_12_7x77mm", "ht_12_7x108mm", "ht_13x92mmsr_mauser",
  "ht_14_5x114mm", "ht_15_43x54mm_dreyse", "ht_book_44_90_remington_special_11_2x62mmr",
  "ht_book_44_90_sharps_11_3x61mmr", "ht_book_11_4x50mmr_43_egyptian_remington", "ht_223_remington"
]);
export const HT_KINETIC_FAMILY_FACTS = Object.freeze({
  "ht_22_long_rifle_5_7x16mmr": {
    "caliberMm": 5.7
  },
  "ht_22_short_5_6x11mmr": {
    "caliberMm": 5.6
  },
  "ht_25_acp_6_35x16mmsr_browning": {
    "caliberMm": 6.35
  },
  "ht_30_m1_carbine_7_62x33mm": {
    "caliberMm": 7.62
  },
  "ht_30_remington_7_62x52mm": {
    "caliberMm": 7.62
  },
  "ht_30_06_springfield_7_62x63mm": {
    "caliberMm": 7.62
  },
  "ht_30_30_winchester_7_62x51mmr": {
    "caliberMm": 7.62
  },
  "ht_30_40_krag_7_62x59mmr": {
    "caliberMm": 7.62
  },
  "ht_32_acp_7_65x17mmsr_browning": {
    "caliberMm": 7.65
  },
  "ht_32_long_rifle_7_92x24mmr": {
    "caliberMm": 7.92
  },
  "ht_32_20_winchester_7_92x33mmr": {
    "caliberMm": 7.92
  },
  "ht_35_remington_8_9x49mm": {
    "caliberMm": 8.9
  },
  "ht_38_acp_9x23mmsr": {
    "caliberMm": 9
  },
  "ht_38_s_w_9x20mmr": {
    "caliberMm": 9
  },
  "ht_38_special_9x29mmr": {
    "caliberMm": 9
  },
  "ht_38_super_auto_9x23mmsr": {
    "caliberMm": 9
  },
  "ht_38_40_winchester_10x33mmr": {
    "caliberMm": 10
  },
  "ht_40_s_w_10x21mm": {
    "caliberMm": 10
  },
  "ht_40_90_sharps_10_2x67mmr": {
    "caliberMm": 10.2
  },
  "ht_41_long_colt_10x29mmr": {
    "caliberMm": 10
  },
  "ht_41_short_remington_10x12mmr": {
    "caliberMm": 10
  },
  "ht_44_american_11x23mmr": {
    "caliberMm": 11
  },
  "ht_44_colt_11_25x28mmr": {
    "caliberMm": 11.25
  },
  "ht_44_henry_10_7x22mmr": {
    "caliberMm": 10.7
  },
  "ht_44_magnum_10_9x33mmr": {
    "caliberMm": 10.9
  },
  "ht_44_russian_11x25mmr": {
    "caliberMm": 11
  },
  "ht_44_special_10_9x29mmr": {
    "caliberMm": 10.9
  },
  "ht_44_40_winchester_10_8x33mmr": {
    "caliberMm": 10.8
  },
  "ht_45_acp_11_43x23mm": {
    "caliberMm": 11.43
  },
  "ht_45_gap_11_43x19mm": {
    "caliberMm": 11.43
  },
  "ht_45_s_w_11_43x28mmr": {
    "caliberMm": 11.43
  },
  "ht_45_55_springfield_11_43x53mmr": {
    "caliberMm": 11.43
  },
  "ht_45_70_springfield_11_43x53mmr": {
    "caliberMm": 11.43
  },
  "ht_45_75_winchester_11_43x48mmr": {
    "caliberMm": 11.43
  },
  "ht_45_110_sharps_11_43x73mmr": {
    "caliberMm": 11.43
  },
  "ht_50_action_express_12_7x33mm": {
    "caliberMm": 12.7
  },
  "ht_50_browning_12_7x99mm": {
    "caliberMm": 12.7
  },
  "ht_50_70_government_13x44mmr": {
    "caliberMm": 13
  },
  "ht_50_90_sharps_12_9x64mmr": {
    "caliberMm": 12.9
  },
  "ht_50_95_winchester_express_12_7x49mmr": {
    "caliberMm": 12.7
  },
  "ht_50_140_sharps_12_9x83mmr": {
    "caliberMm": 12.9
  },
  "ht_56_50_spencer_14x22mmr": {
    "caliberMm": 14
  },
  "ht_56_56_spencer_14x22mmr": {
    "caliberMm": 14
  },
  "ht_58_berdan_15x44mmr": {
    "caliberMm": 15
  },
  "ht_220_swift_5_56x56mmr": {
    "caliberMm": 5.56
  },
  "ht_280_remington_7x65mm_express": {
    "caliberMm": 7
  },
  "ht_300_remington_ultra_magnum_7_62x72mmrb": {
    "caliberMm": 7.62
  },
  "ht_300_winchester_magnum_7_62x66mmb": {
    "caliberMm": 7.62
  },
  "ht_303_british_7_7x56mmr": {
    "caliberMm": 7.7
  },
  "ht_338_lapua_magnum_8_6x70mm": {
    "caliberMm": 8.6
  },
  "ht_357_magnum_9x33mmr": {
    "caliberMm": 9
  },
  "ht_357_sig_9x22mm": {
    "caliberMm": 9
  },
  "ht_375_h_h_magnum_9_35x72mmb": {
    "caliberMm": 9.35
  },
  "ht_380_acp_9x17mm": {
    "caliberMm": 9
  },
  "ht_442_ric_11_2x17mmr": {
    "caliberMm": 11.2
  },
  "ht_444_marlin_10_9x57mmr": {
    "caliberMm": 10.9
  },
  "ht_450_adams_12_05x17mmr": {
    "caliberMm": 12.05
  },
  "ht_450_gardner_gatling_11_43x63mmr": {
    "caliberMm": 11.43
  },
  "ht_450_martini_henry_11_43x59mmr": {
    "caliberMm": 11.43
  },
  "ht_454_casull_11_43x35mmr": {
    "caliberMm": 11.43
  },
  "ht_455_webley_11_5x19mmr": {
    "caliberMm": 11.5
  },
  "ht_458_winchester_magnum_11_63x64mmb": {
    "caliberMm": 11.63
  },
  "ht_460_weatherby_magnum_11_63x74mmb": {
    "caliberMm": 11.63
  },
  "ht_470_nitro_express_12x83mmr": {
    "caliberMm": 12
  },
  "ht_476_enfield_12_05x22mmr": {
    "caliberMm": 12.05
  },
  "ht_577_snider_14_6x51mmr": {
    "caliberMm": 14.6
  },
  "ht_600_nitro_express_15_2x76mmr": {
    "caliberMm": 15.2
  },
  "ht_700_nitro_express_17_8x80mmr": {
    "caliberMm": 17.8
  },
  "ht_4_6x30mm_royal_ordnance": {
    "caliberMm": 4.6
  },
  "ht_4_73x33mm_dynamit_nobel": {
    "caliberMm": 4.73
  },
  "ht_5_6x57mmb": {
    "caliberMm": 5.6
  },
  "ht_5_7x26mm_usel": {
    "caliberMm": 5.7
  },
  "ht_5_7x28mm_fabrique_nationale": {
    "caliberMm": 5.7
  },
  "ht_5_8x42mm": {
    "caliberMm": 5.8
  },
  "ht_5_45x39mm": {
    "caliberMm": 5.45
  },
  "ht_5_56x45mm_nato": {
    "caliberMm": 5.56
  },
  "ht_5_66x39mm": {
    "caliberMm": 5.66
  },
  "ht_6_5x50mmsr_arisaka": {
    "caliberMm": 6.5
  },
  "ht_6_5x52mm_mannlicher_carcano": {
    "caliberMm": 6.5
  },
  "ht_6_5x53mmr_dutch_mannlicher": {
    "caliberMm": 6.5
  },
  "ht_6_5x55mm_mauser": {
    "caliberMm": 6.5
  },
  "ht_6x60mm_lee_236_navy": {
    "caliberMm": 6
  },
  "ht_7_5x54mm_mas": {
    "caliberMm": 7.5
  },
  "ht_7_7x58mm_arisaka": {
    "caliberMm": 7.7
  },
  "ht_7_7x58mmsr_arisaka": {
    "caliberMm": 7.7
  },
  "ht_7_62x25mm_tokarev": {
    "caliberMm": 7.62
  },
  "ht_7_62x39mm": {
    "caliberMm": 7.62
  },
  "ht_7_62x39mmr_nagant": {
    "caliberMm": 7.62
  },
  "ht_7_62x42mm": {
    "caliberMm": 7.62
  },
  "ht_7_62x51mm_nato_308_winchester": {
    "caliberMm": 7.62
  },
  "ht_7_62x54mmr_mosin_nagant": {
    "caliberMm": 7.62
  },
  "ht_7_63x25mm_mauser": {
    "caliberMm": 7.63
  },
  "ht_7_65x21mm_parabellum": {
    "caliberMm": 7.65
  },
  "ht_7_65x53mm_mauser": {
    "caliberMm": 7.65
  },
  "ht_7_92x33mm_kurz": {
    "caliberMm": 7.92
  },
  "ht_7_92x57mm_mauser": {
    "caliberMm": 7.92
  },
  "ht_7x57mm_mauser": {
    "caliberMm": 7
  },
  "ht_7x64mmb_remington_magnum": {
    "caliberMm": 7
  },
  "ht_8_bore_21_2x70mmr": {
    "caliberMm": 21.2
  },
  "ht_8x21mm_nambu": {
    "caliberMm": 8
  },
  "ht_8x50mmr_lebel": {
    "caliberMm": 8
  },
  "ht_8x50mmr_mannlicher": {
    "caliberMm": 8
  },
  "ht_8x58mmr_krag": {
    "caliberMm": 8
  },
  "ht_8x60mm_mauser": {
    "caliberMm": 8
  },
  "ht_8x63mm_bofors": {
    "caliberMm": 8
  },
  "ht_9_3x74mmr": {
    "caliberMm": 9.3
  },
  "ht_9x18mm_makarov": {
    "caliberMm": 9
  },
  "ht_9x19mm_parabellum": {
    "caliberMm": 9
  },
  "ht_9x21mm_gyurza": {
    "caliberMm": 9
  },
  "ht_9x23mm_bergmann_bayard": {
    "caliberMm": 9
  },
  "ht_9x25mm_mauser": {
    "caliberMm": 9
  },
  "ht_9x39mm": {
    "caliberMm": 9
  },
  "ht_10_75x58mmr_berdan": {
    "caliberMm": 10.75
  },
  "ht_10_75x68mm_mauser": {
    "caliberMm": 10.75
  },
  "ht_10x25mm_auto": {
    "caliberMm": 10
  },
  "ht_11_15x58mmr_43_spanish_remington": {
    "caliberMm": 11.15
  },
  "ht_12_7x77mm": {
    "caliberMm": 12.7
  },
  "ht_12_7x108mm": {
    "caliberMm": 12.7
  },
  "ht_12x16mm_lefaucheux": {
    "caliberMm": 12
  },
  "ht_13x36mm_gyrojet": {
    "caliberMm": 13
  },
  "ht_13x92mmsr_mauser": {
    "caliberMm": 13
  },
  "ht_14_5x114mm": {
    "caliberMm": 14.5
  },
  "ht_15_43x54mm_dreyse": {
    "caliberMm": 15.43
  },
  "ht_book_44_90_remington_special_11_2x62mmr": {
    "caliberMm": 11.2
  },
  "ht_book_44_90_sharps_11_3x61mmr": {
    "caliberMm": 11.3
  },
  "ht_book_11_4x50mmr_43_egyptian_remington": {
    "caliberMm": 11.4
  },
  "ht_223_remington": {
    "caliberMm": 5.56
  },
  "ht_38_long_colt": {
    "caliberMm": 9
  },
  "ht_45_long_colt": {
    "caliberMm": 11.43
  }
});
