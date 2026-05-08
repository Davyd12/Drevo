class FamilyTree {
    constructor(containerId) {
        this.containerId = containerId;
        this.svg = null;
        this.treeGroup = null;
        this.zoom = null;
        this.mode = 'family';
        this.selectedPersonId = null;

        // Константы макета (из index.html)
        this.NODE_WIDTH  = 120;
        this.NODE_HEIGHT = 54;
        this.FAMILY_GAP  = 20;
        this.ITEM_GAP    = 50;
        this.LEVEL_HEIGHT = 120;
        this.LEVEL_GAP   = 90;
        this.WRAP_PAD    = 60;

        this.init();
    }

    /* ======================== INIT ======================== */
    init() {
        const container = d3.select(`#${this.containerId}`);
        container.html('');

        const rect = container.node().getBoundingClientRect();
        const width  = rect.width  || 900;
        const height = rect.height || 600;

        this.svg = container.append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background-color', '#f9f9f9');

        this.treeGroup = this.svg.append('g').attr('class', 'tree-group');

        this.setupZoom(width, height);
    }

    setupZoom(width, height) {
        this.zoom = d3.zoom()
            .scaleExtent([0.05, 4])
            .on('zoom', (event) => {
                this.treeGroup.attr('transform', event.transform);
            });

        this.svg.call(this.zoom)
            .call(this.zoom.transform,
                  d3.zoomIdentity.translate(width / 2, 50).scale(0.85));
    }

    /* ======================== PUBLIC API ======================== */
    async refresh() {
        await this.buildFamilyTree(this.mode);
    }

    async buildFamilyTree(mode = 'family') {
        this.mode = mode;

        try {
            const [people, relationships] = await Promise.all([
                this.fetchPeople(),
                this.fetchRelationships()
            ]);

            if (mode === 'all') {
                this.renderAllPeople(people);
                return;
            }

            const raw = this.normalizeData(people, relationships);

            console.log('=== ЛЮДИ (1 строка = 1 человек) ===');
            raw.forEach(p => {
                console.log(JSON.stringify({
                    id: p.id, name: p.name, gender: p.gender,
                    parents: p.parents, children: p.children,
                    spouses: p.spouses, siblings: p.siblings || []
                }));
            });

            if (!raw.length) {
                this.showMessage('Нет данных для отображения');
                return;
            }

            const { map, levelMap } = this.buildLevelsAndFamilies(raw);

            console.log('=== УРОВНИ (финальные в levelMap) ===');
            Object.keys(levelMap).map(Number).sort((a,b)=>a-b).forEach(level => {
                const items = levelMap[level];
                const names = items.map(item => {
                    const p = item.data;
                    const n1 = p.p1 ? `${p.p1.name}(${p.p1.id})` : '';
                    const n2 = p.p2 ? `+${p.p2.name}(${p.p2.id})` : '';
                    return `[${n1}${n2}]`;
                }).join(' | ');
                console.log(`Уровень ${level}: ${names}`);
            });

            this.sortChildrenByParent(levelMap);
            this.computeLayout(levelMap);
            this.orientFamilies(levelMap, map);
            this.alignIterative(levelMap);
            this.normalizePositions(levelMap);
            this.renderCustomTree(levelMap, map);

        } catch (error) {
            console.error('Ошибка построения дерева:', error);
            this.showMessage('Ошибка загрузки данных: ' + error.message);
        }
    }

    /* ======================== FETCH ======================== */
    async fetchPeople() {
        const r = await fetch('/Drevo/get_peoples.php');
        if (!r.ok) throw new Error('Ошибка загрузки людей');
        return r.json();
    }

    async fetchRelationships() {
        const r = await fetch('/Drevo/get_peoplesrelationships.php');
        if (!r.ok) throw new Error('Ошибка загрузки связей');
        return r.json();
    }

    /* ======================== NORMALIZE ======================== */
    normalizeData(people, relationships) {
        const pMap = new Map();
        people.forEach(p => {
            pMap.set(Number(p.id), {
                id:     Number(p.id),
                name:   (p.name || ((p.first_name || '') + ' ' + (p.last_name || '')).trim()) || 'Неизвестно',
                gender: p.gender || '',
                birth_date: p.birth_date || '',
                parents:  [],
                spouses:  [],
                children: [],
                siblings: []
            });
        });

        relationships.forEach(rel => {
            const pid = Number(rel.person_id);
            const rid = Number(rel.relative_id);

            if (rel.relationship_type === 'parent') {
                const child  = pMap.get(pid);
                const parent = pMap.get(rid);
                if (child && parent) {
                    if (!child.parents.includes(rid))   child.parents.push(rid);
                    if (!parent.children.includes(pid))  parent.children.push(pid);
                }
            } else if (rel.relationship_type === 'child') {
                const parent = pMap.get(pid);
                const child  = pMap.get(rid);
                if (parent && child) {
                    if (!parent.children.includes(rid)) parent.children.push(rid);
                    if (!child.parents.includes(pid))   child.parents.push(pid);
                }
            } else if (rel.relationship_type === 'spouse') {
                const a = pMap.get(pid);
                const b = pMap.get(rid);
                if (a && b) {
                    if (!a.spouses.includes(rid)) a.spouses.push(rid);
                    if (!b.spouses.includes(pid)) b.spouses.push(pid);
                }
            } else if (rel.relationship_type === 'sibling') {
                const a = pMap.get(pid);
                const b = pMap.get(rid);
                if (a && b) {
                    if (!a.siblings) a.siblings = [];
                    if (!b.siblings) b.siblings = [];
                    if (!a.siblings.includes(rid)) a.siblings.push(rid);
                    if (!b.siblings.includes(pid)) b.siblings.push(pid);
                }
            }
        });

        // Второй проход: выравниваем родителей через sibling-связи
        const syncSiblingParents = (pMap) => {
            let changed = true;
            while (changed) {
                changed = false;
                pMap.forEach(p => {
                    if (!p.siblings || !p.siblings.length) return;
                    p.siblings.forEach(sibId => {
                        const sib = pMap.get(sibId);
                        if (!sib) return;
                        if (p.parents.length === 0 && sib.parents.length > 0) {
                            sib.parents.forEach(pid => {
                                if (!p.parents.includes(pid)) {
                                    p.parents.push(pid);
                                    const par = pMap.get(pid);
                                    if (par && !par.children.includes(p.id)) {
                                        par.children.push(p.id);
                                    }
                                    changed = true;
                                }
                            });
                        }
                    });
                });
            }
        };
        syncSiblingParents(pMap);

        return Array.from(pMap.values());
    }

    /* ======================== LOG HELPER ======================== */
    logLevels(label, raw) {
        console.log(`--- ${label} ---`);
        [...raw]
            .sort((a, b) => a._level - b._level || a.id - b.id)
            .forEach(p => {
                console.log(`  [${p._level}] ${p.name}(${p.id})  parents:[${p.parents}]  spouses:[${p.spouses}]  siblings:[${p.siblings||[]}]`);
            });
    }

    /* ======================== LEVELS & FAMILIES ======================== */
    buildLevelsAndFamilies(raw) {
        const map = {};
        raw.forEach(p => { map[p.id] = p; });

        // ── ШАГ 1: уровни по родителям ────────────────────────────────────
        const visiting = new Set();
        const calcLevel = (id) => {
            const p = map[id];
            if (!p) return 0;
            if (!p.parents.length) return 0;
            if (p._level !== undefined) return p._level;
            if (visiting.has(id)) return 0;
            visiting.add(id);
            p._level = Math.max(...p.parents.map(pid => calcLevel(pid))) + 1;
            visiting.delete(id);
            return p._level;
        };
        raw.forEach(p => { p._level = calcLevel(p.id); });

        this.logLevels('ШАГ 1: уровни по родителям', raw);

        // ── ШАГ 2: синхронизируем уровни братьев/сестёр ───────────────────
        // Берём максимальный уровень среди всех сиблингов — все встают на него.
        // Итерируем до стабилизации (цепочки: A-B-C могут требовать 2+ прохода).
        let sibChanged = true;
        let sibIter = 0;
        while (sibChanged) {
            sibChanged = false;
            sibIter++;
            raw.forEach(p => {
                if (!p.siblings || !p.siblings.length) return;
                p.siblings.forEach(sibId => {
                    const sib = map[sibId];
                    if (!sib) return;
                    const maxLvl = Math.max(p._level, sib._level);
                    if (p._level < maxLvl) {
                        console.log(`  [сиблинг iter${sibIter}] ${p.name}(${p.id}): ${p._level} → ${maxLvl}  (из-за ${sib.name}(${sib.id}))`);
                        p._level = maxLvl;
                        sibChanged = true;
                    }
                    if (sib._level < maxLvl) {
                        console.log(`  [сиблинг iter${sibIter}] ${sib.name}(${sib.id}): ${sib._level} → ${maxLvl}  (из-за ${p.name}(${p.id}))`);
                        sib._level = maxLvl;
                        sibChanged = true;
                    }
                });
            });
        }

        this.logLevels('ШАГ 2: после синхронизации сиблингов', raw);

        // ── ШАГ 3: синхронизируем уровни супругов ─────────────────────────
        raw.forEach(p => {
            if (p.spouses.length) {
                const s = map[p.spouses[0]];
                if (s) {
                    const lvl = Math.max(p._level, s._level);
                    if (p._level !== lvl || s._level !== lvl) {
                        console.log(`  [супруги] ${p.name}(${p.id}) ${p._level} + ${s.name}(${s.id}) ${s._level} → оба ${lvl}`);
                    }
                    p._level = lvl;
                    s._level = lvl;
                }
            }
        });

        this.logLevels('ШАГ 3: после синхронизации супругов', raw);

        // ── ШАГ 4: пересчитываем детей — только повышаем, не понижаем ─────
        const recalcVisiting = new Set();
        const recalcLevel = (id) => {
            const p = map[id];
            if (!p || !p.parents.length) return p ? p._level : 0;
            if (recalcVisiting.has(id)) return p._level;
            recalcVisiting.add(id);
            const parentMax = Math.max(...p.parents.map(pid => map[pid] ? map[pid]._level : 0));
            const newLevel = parentMax + 1;
            if (newLevel > p._level) {
                console.log(`  [ребёнок] ${p.name}(${p.id}): ${p._level} → ${newLevel}  (родители: [${p.parents.map(pid => `${map[pid]?.name}=${map[pid]?._level}`)}])`);
                p._level = newLevel;
            }
            recalcVisiting.delete(id);
            return p._level;
        };
        raw.filter(p => p.parents.length).forEach(p => { recalcLevel(p.id); });

        this.logLevels('ШАГ 4: после пересчёта детей', raw);

        // ── ШАГ 5: для людей без родителей но с детьми ─────────────────────
        let changed = true;
        while (changed) {
            changed = false;
            raw.forEach(p => {
                if (p.parents.length > 0) return;
                if (!p.children.length) return;
                const childLevels = p.children.map(cid => map[cid] ? map[cid]._level : 1);
                const targetLevel = Math.min(...childLevels) - 1;
                if (targetLevel !== p._level) {
                    console.log(`  [корень] ${p.name}(${p.id}): ${p._level} → ${targetLevel}  (дети: [${p.children.map(cid => `${map[cid]?.name}=${map[cid]?._level}`)}])`);
                    p._level = targetLevel;
                    changed = true;
                }
            });
        }

        this.logLevels('ШАГ 5: после корректировки корней', raw);

        // ── ШАГ 6: нормализуем — минимальный уровень = 0 ──────────────────
        const minLevel = Math.min(...raw.map(p => p._level));
        if (minLevel < 0) raw.forEach(p => { p._level -= minLevel; });

        this.logLevels('ШАГ 6: после нормализации (финал)', raw);

        // ── Собираем семьи (пары) ──────────────────────────────────────────
        const used = new Set();
        const families = [];

        raw.forEach(p => {
            if (!p.spouses.length) return;
            const s = map[p.spouses[0]];
            if (!s) return;
            const key = [p.id, s.id].sort().join('-');
            if (used.has(key)) return;
            used.add(key);
            families.push({ p1: p, p2: s, level: p._level });
        });

        const levelMap = {};
        const rendered = new Set();

        const addItem = (level, item) => {
            if (!levelMap[level]) levelMap[level] = [];
            levelMap[level].push(item);
        };

        families.forEach(f => {
            addItem(f.level, { type: 'family', data: { p1: f.p1, p2: f.p2 } });
            rendered.add(f.p1.id);
            rendered.add(f.p2.id);
        });

        // Дети пар, которые сами ещё не в паре — одиночные узлы
        families.forEach(f => {
            const p1Kids = (f.p1.children || []).map(id => map[id]).filter(Boolean);
            const p2Kids = (f.p2.children || []).map(id => map[id]).filter(Boolean);
            const p2KidIds = new Set(p2Kids.map(k => k.id));
            const common = p1Kids.filter(k => p2KidIds.has(k.id));

            common.forEach(k => {
                if (rendered.has(k.id)) return;
                rendered.add(k.id);
                addItem(k._level, { type: 'family', data: { p1: k, p2: null } });
            });
        });

        // Все оставшиеся люди
        raw.forEach(p => {
            if (rendered.has(p.id)) return;
            let displayLevel = p._level;
            if (!p.spouses.length && !p.children.length && p.siblings && p.siblings.length) {
                const sibLevels = p.siblings.map(sid => map[sid] ? map[sid]._level : p._level);
                displayLevel = Math.max(p._level, ...sibLevels);
            }
            addItem(displayLevel, { type: 'family', data: { p1: p, p2: null } });
        });

        return { map, levelMap };
    }

    /* ======================== HELPERS ======================== */
    getPeople(item) {
        return item.data.p2 ? [item.data.p1, item.data.p2] : [item.data.p1];
    }

    getItemWidth(item) {
        return item.data.p2
            ? this.NODE_WIDTH * 2 + this.FAMILY_GAP
            : this.NODE_WIDTH;
    }

    hasSiblingConnection(a, b) {
        const A = this.getPeople(a);
        const B = this.getPeople(b);
        return A.some(x =>
            B.some(y =>
                x.parents.length &&
                y.parents.length &&
                x.parents.some(p => y.parents.includes(p))
            )
        );
    }

    /* ======================== SORT ======================== */
    sortChildrenByParent(levelMap) {
        const levels = Object.keys(levelMap).map(Number).sort((a, b) => a - b);

        for (const level of levels) {
            if (level === 0) continue;
            const items = levelMap[level];
            const parentItems = levelMap[level - 1];
            if (!parentItems) continue;

            items.forEach(item => {
                const people = this.getPeople(item);
                let totalIdx = 0, count = 0;

                people.forEach(p => {
                    if (!p.parents.length) return;
                    const pi = parentItems.findIndex(it =>
                        this.getPeople(it).some(pp => p.parents.includes(pp.id))
                    );
                    if (pi >= 0) { totalIdx += pi; count++; }
                });

                item._parentOrder = count > 0 ? totalIdx / count : 999;
            });

            items.sort((a, b) => a._parentOrder - b._parentOrder);
        }
    }

    /* ======================== LAYOUT ======================== */
    computeLayout(levelMap) {
        Object.keys(levelMap).forEach(level => {
            const items = levelMap[level];
            let total = 0;
            items.forEach((item, i) => {
                total += this.getItemWidth(item);
                if (i < items.length - 1) total += this.ITEM_GAP;
            });

            let cursor = -total / 2;
            items.forEach(item => {
                const w = this.getItemWidth(item);
                item.left  = cursor;
                item.width = w;
                item.x     = cursor + w / 2;
                cursor += w + this.ITEM_GAP;
            });
        });
    }

    /* ======================== ORIENT ======================== */
    orientFamilies(levelMap, map) {
        Object.keys(levelMap).forEach(level => {
            const items = levelMap[level];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (!item.data.p2) continue;

                const p1 = item.data.p1;
                const p2 = item.data.p2;
                const right = items[i + 1];
                if (!right) continue;

                const p1Rel = this.hasSiblingConnection({ data: { p1 } }, right);
                const p2Rel = this.hasSiblingConnection({ data: { p1: p2 } }, right);

                if (p1Rel && !p2Rel) {
                    item.data.p1 = p2;
                    item.data.p2 = p1;
                }
            }
        });
    }

    /* ======================== ALIGN ======================== */
    alignIterative(levelMap) {
        const MAX_ITER = 50;

        for (let iter = 0; iter < MAX_ITER; iter++) {
            let totalMovement = 0;

            // Bottom-up: центрируем родителей над детьми
            const levelsDesc = Object.keys(levelMap).map(Number).sort((a, b) => b - a);

            for (const level of levelsDesc) {
                const items = levelMap[level];
                const parentItems = levelMap[level - 1];
                if (!parentItems) continue;

                const parentChildMap = new Map();

                items.forEach(childItem => {
                    this.getPeople(childItem).forEach(child => {
                        if (!child.parents.length) return;
                        const parentItem = parentItems.find(it =>
                            this.getPeople(it).some(p => child.parents.includes(p.id))
                        );
                        if (!parentItem) return;
                        if (!parentChildMap.has(parentItem))
                            parentChildMap.set(parentItem, new Set());
                        parentChildMap.get(parentItem).add(childItem);
                    });
                });

                parentChildMap.forEach((childSet, parentItem) => {
                    const centers = [...childSet].map(ci => ci.x);
                    const center = (Math.min(...centers) + Math.max(...centers)) / 2;
                    const dx = center - parentItem.x;
                    if (Math.abs(dx) < 1) return;
                    parentItem.left += dx;
                    parentItem.x   += dx;
                    totalMovement  += Math.abs(dx);
                });
            }

            // Устраняем наложения
            const levelsAsc = Object.keys(levelMap).map(Number).sort((a, b) => a - b);

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
                        totalMovement += dx;
                    }
                }
            }

            if (totalMovement < 1) break;
        }
    }

    /* ======================== NORMALIZE POSITIONS ======================== */
    normalizePositions(levelMap) {
        let min = Infinity;
        Object.values(levelMap).forEach(items => {
            items.forEach(i => { min = Math.min(min, i.left); });
        });

        const shift = min < 0 ? -min + 20 : 0;
        Object.values(levelMap).forEach(items => {
            items.forEach(i => { i.left += shift; i.x += shift; });
        });
    }

    /* ======================== RENDER (SVG) ======================== */
    renderCustomTree(levelMap, map) {
        this.treeGroup.selectAll('*').remove();

        const levels = Object.keys(levelMap).map(Number).sort((a, b) => a - b);
        const FAMILY_HEIGHT = this.NODE_HEIGHT + 12;
        const FAMILY_TOP = Math.round((this.LEVEL_HEIGHT - FAMILY_HEIGHT) / 2);

        let maxRight = 0;

        levels.forEach(level => {
            const y = level * (this.LEVEL_HEIGHT + this.LEVEL_GAP);

            levelMap[level].forEach(item => {
                maxRight = Math.max(maxRight, item.left + item.width);

                const people = this.getPeople(item);

                if (item.data.p2) {
                    this.treeGroup.append('rect')
                        .attr('x', item.left - 7)
                        .attr('y', y + FAMILY_TOP - 5)
                        .attr('width', item.width + 14)
                        .attr('height', FAMILY_HEIGHT + 10)
                        .attr('rx', 10)
                        .attr('fill', 'rgba(155, 89, 182, 0.06)')
                        .attr('stroke', '#9b59b6')
                        .attr('stroke-width', 1.5)
                        .attr('stroke-dasharray', '6,3');
                }

                people.forEach((p, idx) => {
                    const nx = item.left + idx * (this.NODE_WIDTH + this.FAMILY_GAP);
                    const ny = y + FAMILY_TOP;
                    this.renderNode(p, nx, ny);
                });
            });
        });

        this.renderConnectorLines(levelMap, levels, FAMILY_TOP, FAMILY_HEIGHT);
        this.centerTree();
    }

    renderNode(person, x, y) {
        const g = this.treeGroup.append('g')
            .attr('class', 'person-node')
            .attr('transform', `translate(${x}, ${y})`)
            .style('cursor', 'pointer')
            .on('click', () => {
                this.selectPerson(person.id);
                if (window.loadPersonInfo) {
                    window.loadPersonInfo(person.id);
                }
            });

        const isFemale = person.gender === 'female';

        g.append('rect')
            .attr('class', `tree-node ${person.gender || ''}`)
            .attr('data-person-id', person.id)
            .attr('width', this.NODE_WIDTH)
            .attr('height', this.NODE_HEIGHT)
            .attr('rx', 8)
            .attr('fill', isFemale ? '#fce4ec' : '#e3f2fd')
            .attr('stroke', isFemale ? '#e91e63' : '#2196f3')
            .attr('stroke-width', 2);

        const displayName = person.name.length > 14
            ? person.name.substring(0, 14) + '…'
            : person.name;

        g.append('text')
            .attr('x', this.NODE_WIDTH / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('fill', isFemale ? '#c2185b' : '#1565c0')
            .style('pointer-events', 'none')
            .text(displayName);

        if (person.birth_date && person.birth_date !== '0000-00-00') {
            g.append('text')
                .attr('x', this.NODE_WIDTH / 2)
                .attr('y', 36)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('fill', '#666')
                .style('pointer-events', 'none')
                .text(person.birth_date);
        }

        g.append('text')
            .attr('x', this.NODE_WIDTH / 2)
            .attr('y', this.NODE_HEIGHT - 4)
            .attr('text-anchor', 'middle')
            .style('font-size', '8px')
            .style('fill', '#aaa')
            .style('pointer-events', 'none')
            .text('ID: ' + person.id);
    }

    renderConnectorLines(levelMap, levels, FAMILY_TOP, FAMILY_HEIGHT) {
        const levelY = (n) => n * (this.LEVEL_HEIGHT + this.LEVEL_GAP);
        const maxLevel = Math.max(...levels);

        levels.forEach(level => {
            const items = levelMap[level];

            items.forEach(parentItem => {
                const parentPeople = this.getPeople(parentItem);
                const parentChildIds = new Set(parentPeople.flatMap(pp => pp.children || []));
                if (!parentChildIds.size) return;

                const childrenByLevel = {};
                for (let cl = level + 1; cl <= maxLevel; cl++) {
                    const childItems = levelMap[cl];
                    if (!childItems) continue;
                    childItems.forEach(childItem => {
                        this.getPeople(childItem).forEach((cp, idx) => {
                            if (parentChildIds.has(cp.id)) {
                                const cx = childItem.left + idx * (this.NODE_WIDTH + this.FAMILY_GAP) + this.NODE_WIDTH / 2;
                                if (!childrenByLevel[cl]) childrenByLevel[cl] = [];
                                childrenByLevel[cl].push(cx);
                            }
                        });
                    });
                }

                const childLevels = Object.keys(childrenByLevel).map(Number).sort((a, b) => a - b);
                if (!childLevels.length) return;

                const px = parentItem.x;
                const py = parentItem.data.p2
                    ? levelY(level) + FAMILY_TOP + FAMILY_HEIGHT + 5
                    : levelY(level) + FAMILY_TOP + this.NODE_HEIGHT;

                const nearestLevel = childLevels[0];
                const cy = levelY(nearestLevel) + FAMILY_TOP;
                const midY = Math.round((py + cy) / 2);

                const allChildXs = childLevels.flatMap(cl => childrenByLevel[cl]);
                const minX = Math.min(px, ...allChildXs);
                const maxX = Math.max(px, ...allChildXs);

                this.addLine(px, py, px, midY);
                if (maxX - minX > 1) this.addLine(minX, midY, maxX, midY);

                childrenByLevel[nearestLevel].forEach(cx => {
                    this.addLine(cx, midY, cx, cy);
                });

                childLevels.slice(1).forEach(cl => {
                    const farCy = levelY(cl) + FAMILY_TOP;
                    childrenByLevel[cl].forEach(cx => {
                        this.addLine(cx, midY, cx, farCy);
                    });
                });
            });
        });
    }

    addLine(x1, y1, x2, y2) {
        this.treeGroup.append('line')
            .attr('x1', x1).attr('y1', y1)
            .attr('x2', x2).attr('y2', y2)
            .attr('stroke', '#999')
            .attr('stroke-width', 2);
    }

    /* ======================== RENDER ALL PEOPLE (grid) ======================== */
    renderAllPeople(people) {
        this.treeGroup.selectAll('*').remove();

        const W = 150, H = 80, GAP_X = 40, GAP_Y = 40, COLS = 4;

        people.forEach((p, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = col * (W + GAP_X);
            const y = row * (H + GAP_Y);

            const isFemale = p.gender === 'female';

            const g = this.treeGroup.append('g')
                .style('cursor', 'pointer')
                .attr('transform', `translate(${x}, ${y})`)
                .on('click', () => {
                    this.selectPerson(p.id);
                    if (window.loadPersonInfo) window.loadPersonInfo(p.id);
                });

            g.append('rect')
                .attr('class', `tree-node ${p.gender || ''}`)
                .attr('data-person-id', p.id)
                .attr('width', W).attr('height', H)
                .attr('rx', 8)
                .attr('fill', isFemale ? '#fadbd8' : '#d4e6f1')
                .attr('stroke', isFemale ? '#e74c3c' : '#3498db')
                .attr('stroke-width', 2);

            const name = (p.name || ((p.first_name || '') + ' ' + (p.last_name || '')).trim()) || 'Неизвестно';
            g.append('text')
                .attr('x', W / 2).attr('y', 22)
                .attr('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('font-weight', 'bold')
                .style('fill', '#2c3e50')
                .text(name.length > 18 ? name.substring(0, 18) + '…' : name);

            if (p.birth_date && p.birth_date !== '0000-00-00') {
                g.append('text')
                    .attr('x', W / 2).attr('y', 42)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '11px')
                    .style('fill', '#34495e')
                    .text(p.birth_date);
            }

            g.append('text')
                .attr('x', W / 2).attr('y', 60)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('fill', '#7f8c8d')
                .style('opacity', '0.6')
                .text('ID: ' + p.id);
        });

        this.centerTree();
    }

    /* ======================== SELECT ======================== */
    selectPerson(personId) {
        this.selectedPersonId = personId;

        this.treeGroup.selectAll('.tree-node')
            .classed('selected', false)
            .attr('stroke-width', 2)
            .each(function () {
                const node = d3.select(this);
                const g = node.attr('class') || '';
                if (g.includes('female')) {
                    node.attr('stroke', '#e91e63');
                } else {
                    node.attr('stroke', '#2196f3');
                }
            });

        this.treeGroup.selectAll(`.tree-node[data-person-id="${personId}"]`)
            .classed('selected', true)
            .attr('stroke', '#f39c12')
            .attr('stroke-width', 3);
    }

    /* ======================== CENTER / ZOOM ======================== */
    centerTree() {
        if (!this.svg || !this.treeGroup) return;

        setTimeout(() => {
            const container = this.svg.node();
            const bbox = this.treeGroup.node().getBBox();
            if (bbox.width === 0 || bbox.height === 0) return;

            const cw = container.getBoundingClientRect().width;
            const ch = container.getBoundingClientRect().height;

            const scale = Math.min(
                cw / (bbox.width + 100),
                ch / (bbox.height + 100),
                1
            );

            const tx = cw / 2 - (bbox.x + bbox.width / 2) * scale;
            const ty = ch / 2 - (bbox.y + bbox.height / 2) * scale;

            this.svg.transition().duration(500)
                .call(this.zoom.transform,
                      d3.zoomIdentity.translate(tx, ty).scale(scale));
        }, 100);
    }

    zoomIn()    { this.svg.transition().duration(300).call(this.zoom.scaleBy, 1.2); }
    zoomOut()   { this.svg.transition().duration(300).call(this.zoom.scaleBy, 0.8); }
    resetZoom() { this.centerTree(); }

    /* ======================== MESSAGES ======================== */
    showMessage(msg) {
        console.log(msg);
        if (window.messageTextContent) {
            window.messageTextContent(msg, 'message error');
        }
    }
}

/* ======================== BOOTSTRAP ======================== */
document.addEventListener('DOMContentLoaded', function () {
    window.familyTree = new FamilyTree('familyTree');
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FamilyTree;
}
