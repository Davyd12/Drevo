/**
 * FamilyTreeLayout — упрощённая версия.
 *
 * Правила:
 *   - супруги стоят рядом на одном уровне
 *   - дети стоят под своими родителями
 *   - уровни считаются по цепочке родитель→ребёнок
 *   - никакой логики сиблингов, ориентации, кластеров
 */
class FamilyTreeLayout {
    constructor(utils, constants) {
        this.utils = utils;

        this.NODE_W       = 140;  // ширина одной карточки
        this.NODE_H       = 60;   // высота карточки
        this.PAIR_GAP     = 4;    // зазор между супругами внутри пары
        this.ITEM_GAP     = 40;   // зазор между узлами одного уровня
        this.LEVEL_HEIGHT = constants.LEVEL_HEIGHT;
        this.LEVEL_GAP    = constants.LEVEL_GAP;

        // Синхронизируем с utils и renderer
        this.utils.NODE_WIDTH = this.NODE_W;
        this.utils.FAMILY_GAP = this.PAIR_GAP;
    }

    /* ======================== NORMALIZE ======================== */

    normalizeData(people, relationships) {
        const pMap = new Map();
        people.forEach(p => {
            pMap.set(Number(p.id), {
                id:         Number(p.id),
                name:       (p.name || ((p.first_name || '') + ' ' + (p.last_name || '')).trim()) || 'Неизвестно',
                gender:     p.gender || '',
                birth_date: p.birth_date || '',
                parents:    [],
                spouses:    [],
                children:   [],
                siblings:   []
            });
        });

        relationships.forEach(rel => {
            const pid = Number(rel.person_id);
            const rid = Number(rel.relative_id);
            const type = rel.relationship_type;

            if (type === 'parent') {
                const child = pMap.get(pid), parent = pMap.get(rid);
                if (child && parent) {
                    if (!child.parents.includes(rid))    child.parents.push(rid);
                    if (!parent.children.includes(pid))  parent.children.push(pid);
                }
            } else if (type === 'child') {
                const parent = pMap.get(pid), child = pMap.get(rid);
                if (parent && child) {
                    if (!parent.children.includes(rid))  parent.children.push(rid);
                    if (!child.parents.includes(pid))    child.parents.push(pid);
                }
            } else if (type === 'spouse') {
                const a = pMap.get(pid), b = pMap.get(rid);
                if (a && b) {
                    if (!a.spouses.includes(rid)) a.spouses.push(rid);
                    if (!b.spouses.includes(pid)) b.spouses.push(pid);
                }
            } else if (type === 'sibling') {
                const a = pMap.get(pid), b = pMap.get(rid);
                if (a && b) {
                    if (!a.siblings.includes(rid)) a.siblings.push(rid);
                    if (!b.siblings.includes(pid)) b.siblings.push(pid);
                }
            }
        });

        return Array.from(pMap.values());
    }

    /* ======================== LEVELS & FAMILIES ======================== */
buildLevelsAndFamilies(raw, rootId) {
    const map = {};
    raw.forEach(p => { map[p.id] = p; });

    // ── ШАГ 1: Собираем пары (супруги) ──────────────────────────────────
    // Пара — единица построения уровней. Уровень пары = max(уровень обоих).

    const pairKey = (a, b) => [a, b].sort().join('-');

    const pairMap   = new Map(); // key -> { p1, p2 }
    const personPair = new Map(); // personId -> pairKey

    raw.forEach(p => {
        if (!p.spouses.length) return;

        const s = map[p.spouses[0]];
        if (!s) return;

        const key = pairKey(p.id, s.id);

        if (pairMap.has(key)) return;

        pairMap.set(key, {
            p1: p,
            p2: s
        });

        personPair.set(p.id, key);
        personPair.set(s.id, key);
    });

    // ── ШАГ 1.5: Автоматически определяем siblings по родителям ────────

    raw.forEach(p => {
        raw.forEach(other => {
            if (p.id === other.id) return;

            const sharedParents = p.parents.some(pid =>
                other.parents.includes(pid)
            );

            if (!sharedParents) return;

            if (!p.siblings.includes(other.id)) {
                p.siblings.push(other.id);
            }

            if (!other.siblings.includes(p.id)) {
                other.siblings.push(p.id);
            }
        });
    });

    // ── ШАГ 2: Итеративно строим уровни ─────────────────────────────────

    // Начальный уровень всех = 0
    raw.forEach(p => {
        p._level = 0;
    });

    // Вспомогательная:
    // уровень человека = max уровень родителей + 1
    // супруги всегда на одном уровне
    // siblings всегда на одном уровне

    let changed = true;
    let iter    = 0;

    while (changed && iter < 100) {
        changed = false;
        iter++;

        // ── Родители → дети ─────────────────────────────────────────────
        raw.forEach(p => {
            if (!p.parents.length) return;

            let maxParentLevel = -1;

            p.parents.forEach(pid => {
                const par = map[pid];
                if (!par) return;

                const parPairKey = personPair.get(pid);

                // Если родитель в паре
                if (parPairKey) {
                    const pair = pairMap.get(parPairKey);

                    const pairLevel = Math.max(
                        pair.p1._level,
                        pair.p2._level
                    );

                    maxParentLevel = Math.max(
                        maxParentLevel,
                        pairLevel
                    );
                } else {
                    maxParentLevel = Math.max(
                        maxParentLevel,
                        par._level
                    );
                }
            });

            const target = maxParentLevel + 1;

            if (target > p._level) {
                p._level = target;
                changed  = true;

                console.log(
                    `  [iter${iter}] ${p.name}(${p.id}): → ${target}`
                );
            }
        });

        // ── Синхронизация супругов ─────────────────────────────────────
        pairMap.forEach(({ p1, p2 }) => {
            const lvl = Math.max(
                p1._level,
                p2._level
            );

            if (p1._level !== lvl) {
                p1._level = lvl;
                changed   = true;
            }

            if (p2._level !== lvl) {
                p2._level = lvl;
                changed   = true;
            }
        });

        // ── Синхронизация братьев/сестер ───────────────────────────────
        raw.forEach(p => {
            if (!p.siblings.length) return;

            let maxLevel = p._level;

            p.siblings.forEach(sid => {
                const sib = map[sid];
                if (!sib) return;

                maxLevel = Math.max(
                    maxLevel,
                    sib._level
                );
            });

            // Сам человек
            if (p._level !== maxLevel) {
                p._level = maxLevel;
                changed  = true;
            }

            // Все siblings
            p.siblings.forEach(sid => {
                const sib = map[sid];
                if (!sib) return;

                if (sib._level !== maxLevel) {
                    sib._level = maxLevel;
                    changed    = true;
                }
            });
        });
    }

    // ── ШАГ 3: Корни без родителей — ставим на min(дети)-1 ─────────────

    changed = true;

    while (changed) {
        changed = false;

        raw.forEach(p => {
            if (p.parents.length > 0 || !p.children.length) return;

            const minChild = Math.min(
                ...p.children.map(cid =>
                    map[cid]
                        ? map[cid]._level
                        : 1
                )
            );

            const target = minChild - 1;

            if (target !== p._level) {
                p._level = target;
                changed  = true;
            }
        });

        // Супруги
        pairMap.forEach(({ p1, p2 }) => {
            const lvl = Math.max(
                p1._level,
                p2._level
            );

            if (p1._level !== lvl) {
                p1._level = lvl;
                changed   = true;
            }

            if (p2._level !== lvl) {
                p2._level = lvl;
                changed   = true;
            }
        });

        // Siblings
        raw.forEach(p => {
            if (!p.siblings.length) return;

            let maxLevel = p._level;

            p.siblings.forEach(sid => {
                const sib = map[sid];
                if (!sib) return;

                maxLevel = Math.max(
                    maxLevel,
                    sib._level
                );
            });

            if (p._level !== maxLevel) {
                p._level = maxLevel;
                changed  = true;
            }

            p.siblings.forEach(sid => {
                const sib = map[sid];
                if (!sib) return;

                if (sib._level !== maxLevel) {
                    sib._level = maxLevel;
                    changed    = true;
                }
            });
        });
    }

    // ── ШАГ 4: Нормализуем — минимум = 0 ───────────────────────────────

    const minLvl = Math.min(
        ...raw.map(p => p._level)
    );

    if (minLvl < 0) {
        raw.forEach(p => {
            p._level -= minLvl;
        });
    }

    this.utils.logLevels(
        'Финальные уровни',
        raw
    );

    // ── ШАГ 5: Собираем levelMap ───────────────────────────────────────

    const levelMap = {};
    const rendered = new Set();

    const addItem = (level, item) => {
        if (!levelMap[level]) {
            levelMap[level] = [];
        }

        levelMap[level].push(item);
    };

    // Пары
    pairMap.forEach(({ p1, p2 }) => {
        const lvl = p1._level;

        addItem(lvl, {
            type: 'family',
            data: { p1, p2 }
        });

        rendered.add(p1.id);
        rendered.add(p2.id);
    });

    // Одиночки
    raw.forEach(p => {
        if (rendered.has(p.id)) return;

        addItem(p._level, {
            type: 'family',
            data: {
                p1: p,
                p2: null
            }
        });
    });

    return {
        map,
        levelMap
    };
}





    /* ======================== LAYOUT ======================== */

    /** Расставляет узлы по X, начиная от центра */
    computeLayout(levelMap) {
        Object.keys(levelMap).forEach(level => {
            const items = levelMap[level];
            let total   = 0;
            items.forEach((item, i) => {
                total += this._itemWidth(item);
                if (i < items.length - 1) total += this.ITEM_GAP;
            });

            let cursor = -Math.round(total / 2);
            items.forEach(item => {
                const w    = this._itemWidth(item);
                item.left  = cursor;
                item.width = w;
                item.x     = cursor + Math.round(w / 2);
                cursor    += w + this.ITEM_GAP;
            });
        });
    }

    _itemWidth(item) {
        return item.data.p2
            ? this.NODE_W * 2 + this.PAIR_GAP
            : this.NODE_W;
    }





alignIterative(levelMap) {
    const MAX_ITER = 30;

    for (let iter = 0; iter < MAX_ITER; iter++) {
        let moved = 0;

        console.log(`\n[ALIGN] ================= ITER ${iter} =================`);

        // ─────────────────────────────────────────────
        // СНИЗУ ВВЕРХ: центрируем родителей по детям
        // ─────────────────────────────────────────────
        const levelsDesc = Object.keys(levelMap)
            .map(Number)
            .sort((a, b) => b - a);

        for (const level of levelsDesc) {
            const parentItems = levelMap[level - 1];
            const childrenItems = levelMap[level];

            if (!parentItems || !childrenItems) continue;

            const childMap = new Map();

            // связываем детей с родителями
            childrenItems.forEach(childItem => {
                const people = this.utils.getPeople(childItem);

                people.forEach(cp => {
                    if (!cp.parents.length) return;

                    const parentItem = parentItems.find(it =>
                        this.utils.getPeople(it).some(pp =>
                            cp.parents.includes(pp.id)
                        )
                    );

                    if (!parentItem) return;

                    if (!childMap.has(parentItem)) {
                        childMap.set(parentItem, []);
                    }

                    childMap.get(parentItem).push(childItem);
                });
            });

            // центрируем родителей
            childMap.forEach((children, parentItem) => {

                const minX = Math.min(...children.map(c => c.x));
                const maxX = Math.max(...children.map(c => c.x));

                const center = Math.round((minX + maxX) / 2);
                const parentCenter = parentItem.x;

                const dx = center - parentCenter;

                console.log(
                    `[ALIGN][iter ${iter}] parent=${this.utils.getPeople(parentItem).map(p => p.name).join(', ')} | ` +
                    `children=${children.length} | center=${center} | parentCenter=${parentCenter} | dx=${dx}`
                );

                if (Math.abs(dx) < 1) return;

                parentItem.left += dx;
                parentItem.x    += dx;
                moved           += Math.abs(dx);
            });
        }

        // ─────────────────────────────────────────────
        // СВЕРХУ ВНИЗ: убираем наложения
        // ─────────────────────────────────────────────
        const levelsAsc = Object.keys(levelMap)
            .map(Number)
            .sort((a, b) => a - b);

        for (const level of levelsAsc) {
            const items = levelMap[level];
            if (!items || items.length < 2) continue;

            items.sort((a, b) => a.left - b.left);

            for (let i = 1; i < items.length; i++) {
                const prev = items[i - 1];
                const curr = items[i];

                const minLeft = prev.left + prev.width + this.ITEM_GAP;

                if (curr.left < minLeft) {
                    const dx = minLeft - curr.left;

                    curr.left += dx;
                    curr.x    += dx;

                    moved += Math.abs(dx);

                    console.log(
                        `[ALIGN][overlap] level=${level} shift=${dx}`
                    );
                }
            }
        }

        console.log(`[ALIGN] iter ${iter} moved=${moved}`);

        if (moved < 1) break;
    }
}

    /* ======================== NORMALIZE POSITIONS ======================== */

    normalizePositions(levelMap) {
        let min = Infinity;
        Object.values(levelMap).forEach(items =>
            items.forEach(i => { min = Math.min(min, i.left); })
        );
        const shift = min < 0 ? -min + 20 : 0;
        Object.values(levelMap).forEach(items =>
            items.forEach(i => { i.left += shift; i.x += shift; })
        );
    }
}
