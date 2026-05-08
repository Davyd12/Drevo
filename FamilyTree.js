/**
 * FamilyTree — фасад.
 *
 * Публичный API полностью сохранён — вызовы из index.html не меняются:
 *   new FamilyTree('familyTree')
 *   familyTree.buildFamilyTree(mode)
 *   familyTree.refresh()
 *   familyTree.selectPerson(id)
 *   familyTree.zoomIn() / zoomOut() / resetZoom()
 *
 * Подключение скриптов в HTML (в порядке зависимостей):
 *   <script src="FamilyTreeUtils.js"></script>
 *   <script src="FamilyTreeData.js"></script>
 *   <script src="FamilyTreeLayout.js"></script>
 *   <script src="FamilyTreeRenderer.js"></script>
 *   <script src="FamilyTree.js"></script>
 */
class FamilyTree {
    constructor(containerId) {
        this.containerId      = containerId;
        this.mode             = 'family';
        this.selectedPersonId = null;
        this.rootPersonId     = null; // null = первый человек в базе

        // Константы макета (NODE_WIDTH/NODE_HEIGHT/FAMILY_GAP обновятся из FamilyTreeLayout)
        this._constants = {
            NODE_WIDTH:   120,
            NODE_HEIGHT:   54,
            FAMILY_GAP:    20,
            ITEM_GAP:      50,
            LEVEL_HEIGHT: 120,
            LEVEL_GAP:     90,
            WRAP_PAD:      60,
        };

        // Инициализация вспомогательных классов
        this._utils    = new FamilyTreeUtils(this._constants);
        this._data     = new FamilyTreeData();                              // только fetch
        this._layout   = new FamilyTreeLayout(this._utils, this._constants); // нормализация + позиции
        this._renderer = new FamilyTreeRenderer(this._utils, this._constants);

        this._init();
    }

    /* ======================== INIT ======================== */

    _init() {
        // Синхронизируем размеры карточек между Layout и Renderer
        this._renderer.setLayoutConstants(this._layout);
        const { svg, treeGroup, zoom } = this._renderer.init(this.containerId);
        // Сохраняем ссылки на случай прямого обращения из HTML (legacy)
        this.svg       = svg;
        this.treeGroup = treeGroup;
        this.zoom      = zoom;
    }

    /* ======================== PUBLIC API ======================== */

    async refresh() {
        await this.buildFamilyTree(this.mode, this.rootPersonId);
    }

    /** Установить точку отсчёта и перестроить дерево */
    async setRoot(personId) {
        await this.buildFamilyTree(this.mode, personId);
    }

    async buildFamilyTree(mode = 'family', rootId = null) {
        this.mode = mode;
        if (rootId != null) this.rootPersonId = rootId;

        try {
            // 1. Загрузка — только FamilyTreeData
            const { people, relationships } = await this._data.fetchAll();

            if (mode === 'all') {
                this._renderer.renderAllPeople(people, (id) => this._onPersonClick(id));
                return;
            }

            // 2. Нормализация + уровни — FamilyTreeLayout
            const raw = this._layout.normalizeData(people, relationships);

            console.log('=== ЛЮДИ (1 строка = 1 человек) ===');
            raw.forEach(p => {
                console.log(JSON.stringify({
                    id: p.id, name: p.name, gender: p.gender,
                    parents: p.parents, children: p.children,
                    spouses: p.spouses, siblings: p.siblings || []
                }));
            });

            if (!raw.length) {
                this._utils.showMessage('Нет данных для отображения');
                return;
            }

            const { map, levelMap } = this._layout.buildLevelsAndFamilies(raw, this.rootPersonId);

            console.log('=== УРОВНИ (финальные в levelMap) ===');
            Object.keys(levelMap).map(Number).sort((a, b) => a - b).forEach(level => {
                const items = levelMap[level];
                const names = items.map(item => {
                    const p  = item.data;
                    const n1 = p.p1 ? `${p.p1.name}(${p.p1.id})` : '';
                    const n2 = p.p2 ? `+${p.p2.name}(${p.p2.id})` : '';
                    return `[${n1}${n2}]`;
                }).join(' | ');
                console.log(`Уровень ${level}: ${names}`);
            });

            // 3. Расчёт позиций — FamilyTreeLayout
          //  this._layout.sortChildrenByParent(levelMap);
            this._layout.computeLayout(levelMap);
            this._layout.alignIterative(levelMap);
            this._layout.normalizePositions(levelMap);

            // 4. Отрисовка — FamilyTreeRenderer
            this._renderer.renderCustomTree(
                levelMap,
                map,
                (id) => this._onPersonClick(id)
            );

        } catch (error) {
            console.error('Ошибка построения дерева:', error);
            this._utils.showMessage('Ошибка загрузки данных: ' + error.message);
        }
    }

    selectPerson(personId) {
        this.selectedPersonId = personId;
        this._renderer.selectPerson(personId);
    }

    zoomIn()    { this._renderer.zoomIn(); }
    zoomOut()   { this._renderer.zoomOut(); }
    resetZoom() { this._renderer.resetZoom(); }

    /* ======================== PRIVATE ======================== */

    _onPersonClick(personId) {
        this.selectPerson(personId);
        if (window.loadPersonInfo) {
            window.loadPersonInfo(personId);
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
