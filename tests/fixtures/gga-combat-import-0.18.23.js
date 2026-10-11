// Research fixture: installed GGA 0.18.23 ActorImporter combat method, unchanged body.
function importCombatFromGCS(ads, skills, spells, equipment) {
        let melee = {};
        let ranged = {};
        let m_index = 0;
        let r_index = 0;
        let temp = [].concat(ads, skills, spells, equipment);
        let all = [];
        for (let i of temp) {
            all = all.concat(this.recursiveGet(i));
        }
        for (let i of all) {
            if (i.weapons?.length) {
                for (let w of i.weapons) {
                    if (this.GCSVersion === 5) {
                        w.type = w.id.startsWith('w') ? 'melee_weapon' : 'ranged_weapon';
                    }
                    if (w.type == 'melee_weapon') {
                        let m = new Melee();
                        m.name = i.name || i.description || '';
                        m.originalName = i.name;
                        m.st = w.strength || '';
                        m.weight = i.weight || '';
                        m.techlevel = i.tech_level || '';
                        m.cost = i.value || '';
                        m.notes = i.notes || '';
                        m.pageRef(i.reference || '');
                        m.mode = w.usage || '';
                        m.import = w.calc?.level?.toString() || '0';
                        m.damage = w.calc?.damage || '';
                        m.reach = w.reach || '';
                        m.parry = w.calc?.parry || '';
                        m.block = w.calc?.block || '';
                        m = this._substituteItemReplacements(m, i);
                        let old = this._findElementIn('melee', false, m.name, m.mode);
                        this._migrateOtfsAndNotes(old, m, i.vtt_notes, w.usage_notes);
                        GURPS.put(melee, { ...m }, m_index++);
                    }
                    else if (w.type == 'ranged_weapon') {
                        let r = new Ranged();
                        r.name = i.name || i.description || '';
                        r.originalName = i.name;
                        r.st = w.strength || '';
                        r.bulk = w.bulk || '';
                        r.legalityclass = i.legality_class || '4';
                        r.ammo = 0;
                        r.notes = i.notes || '';
                        r.pageRef(i.reference || '');
                        r.mode = w.usage || '';
                        r.import = w.calc?.level || '0';
                        r.damage = w.calc?.damage || '';
                        r.acc = w.accuracy || '';
                        let m = r.acc.trim().match(/(\d+)([+-]\d+)/);
                        if (m) {
                            r.acc = m[1];
                            r.notes += ' [' + m[2] + ' ' + game.i18n.localize('GURPS.acc') + ']';
                        }
                        r.rof = w.rate_of_fire || '';
                        r.shots = w.shots || '';
                        r.rcl = w.recoil || '';
                        r.range = w.calc?.range || w.range || '';
                        r = this._substituteItemReplacements(r, i);
                        let old = this._findElementIn('ranged', false, r.name, r.mode);
                        this._migrateOtfsAndNotes(old, r, i.vtt_notes, w.usage_notes);
                        GURPS.put(ranged, { ...r }, r_index++);
                    }
                }
            }
        }
        return {
            ...replaceValue('system.melee', melee),
            ...replaceValue('system.ranged', ranged),
        };
    }
