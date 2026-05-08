/**
 * FamilyTreeRenderer — всё, что касается отрисовки SVG.
 * Зависит от FamilyTreeUtils.
 */
class FamilyTreeRenderer {
    constructor(utils, constants) {
        this.utils = utils;

        // Базовые константы из конфига
        // NODE_WIDTH / NODE_HEIGHT / FAMILY_GAP могут быть переопределены
        // через setLayoutConstants() после инициализации FamilyTreeLayout
        this.NODE_WIDTH   = constants.NODE_WIDTH;
        this.NODE_HEIGHT  = constants.NODE_HEIGHT;
        this.FAMILY_GAP   = constants.FAMILY_GAP;
        this.LEVEL_HEIGHT = constants.LEVEL_HEIGHT;
        this.LEVEL_GAP    = constants.LEVEL_GAP;

        // Ссылки на SVG-элементы устанавливаются через init()
        this.svg       = null;
        this.treeGroup = null;
        this.zoom      = null;
    }

    /** Синхронизирует размеры карточек с FamilyTreeLayout */
    setLayoutConstants(layout) {
        this.NODE_WIDTH  = layout.NODE_W;
        this.NODE_HEIGHT = layout.NODE_H;
        this.FAMILY_GAP  = layout.PAIR_GAP;
    }

    /* ======================== INIT ======================== */

    /** Инициализирует SVG и zoom; возвращает { svg, treeGroup, zoom } */
    init(containerId) {
        const container = d3.select(`#${containerId}`);
        container.html('');

        const rect   = container.node().getBoundingClientRect();
        const width  = rect.width  || 900;
        const height = rect.height || 600;

        this.svg = container.append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background-color', '#f9f9f9');

        this.treeGroup = this.svg.append('g').attr('class', 'tree-group');

        this.zoom = d3.zoom()
            .scaleExtent([0.05, 4])
            .on('zoom', (event) => {
                this.treeGroup.attr('transform', event.transform);
            });

        this.svg.call(this.zoom)
            .call(this.zoom.transform,
                  d3.zoomIdentity.translate(width / 2, 50).scale(0.85));

        return { svg: this.svg, treeGroup: this.treeGroup, zoom: this.zoom };
    }

    /* ======================== RENDER TREE ======================== */

    renderCustomTree(levelMap, map, onPersonClick) {
        this.treeGroup.selectAll('*').remove();

        const levels = Object.keys(levelMap).map(Number).sort((a, b) => a - b);
        const FAMILY_HEIGHT = this.NODE_HEIGHT + 12;
        const FAMILY_TOP    = Math.round((this.LEVEL_HEIGHT - FAMILY_HEIGHT) / 2);

        levels.forEach(level => {
            const y = level * (this.LEVEL_HEIGHT + this.LEVEL_GAP);

            levelMap[level].forEach(item => {
                const people = this.utils.getPeople(item);

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
                    this.renderNode(p, nx, ny, onPersonClick);
                });
            });
        });

        this.renderConnectorLines(levelMap, levels, FAMILY_TOP, FAMILY_HEIGHT);
        this.centerTree();
    }

    /* ======================== RENDER NODE ======================== */

    renderNode(person, x, y, onPersonClick) {
        const g = this.treeGroup.append('g')
            .attr('class', 'person-node')
            .attr('transform', `translate(${x}, ${y})`)
            .style('cursor', 'pointer')
            .on('click', () => {
                if (onPersonClick) onPersonClick(person.id);
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

    /* ======================== CONNECTOR LINES ======================== */

    renderConnectorLines(levelMap, levels, FAMILY_TOP, FAMILY_HEIGHT) {
        const levelY   = (n) => n * (this.LEVEL_HEIGHT + this.LEVEL_GAP);
        const maxLevel = Math.max(...levels);

        levels.forEach(level => {
            levelMap[level].forEach(parentItem => {
                const parentPeople    = this.utils.getPeople(parentItem);
                const parentChildIds  = new Set(parentPeople.flatMap(pp => pp.children || []));
                if (!parentChildIds.size) return;

                const childrenByLevel = {};
                for (let cl = level + 1; cl <= maxLevel; cl++) {
                    const childItems = levelMap[cl];
                    if (!childItems) continue;
                    childItems.forEach(childItem => {
                        this.utils.getPeople(childItem).forEach((cp, idx) => {
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
                const cy   = levelY(nearestLevel) + FAMILY_TOP;
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

    renderAllPeople(people, onPersonClick) {
        this.treeGroup.selectAll('*').remove();

        const W = 150, H = 80, GAP_X = 40, GAP_Y = 40, COLS = 4;

        people.forEach((p, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x   = col * (W + GAP_X);
            const y   = row * (H + GAP_Y);

            const isFemale = p.gender === 'female';

            const g = this.treeGroup.append('g')
                .style('cursor', 'pointer')
                .attr('transform', `translate(${x}, ${y})`)
                .on('click', () => {
                    if (onPersonClick) onPersonClick(p.id);
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
                cw / (bbox.width  + 100),
                ch / (bbox.height + 100),
                1
            );

            const tx = cw / 2 - (bbox.x + bbox.width  / 2) * scale;
            const ty = ch / 2 - (bbox.y + bbox.height / 2) * scale;

            this.svg.transition().duration(500)
                .call(this.zoom.transform,
                      d3.zoomIdentity.translate(tx, ty).scale(scale));
        }, 100);
    }

    zoomIn()    { this.svg.transition().duration(300).call(this.zoom.scaleBy, 1.2); }
    zoomOut()   { this.svg.transition().duration(300).call(this.zoom.scaleBy, 0.8); }
    resetZoom() { this.centerTree(); }
}
