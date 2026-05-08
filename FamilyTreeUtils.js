/**
 * FamilyTreeUtils — вспомогательные (утилитарные) методы.
 * Не зависит от других классов дерева.
 */
class FamilyTreeUtils {
    constructor(constants) {
        // Константы макета передаются из FamilyTree
        this.NODE_WIDTH  = constants.NODE_WIDTH;
        this.NODE_HEIGHT = constants.NODE_HEIGHT;
        this.FAMILY_GAP  = constants.FAMILY_GAP;
    }

    /** Возвращает массив людей из узла (1 или 2 человека) */
    getPeople(item) {
        return item.data.p2 ? [item.data.p1, item.data.p2] : [item.data.p1];
    }

    /** Ширина узла (одиночный или пара) */
    getItemWidth(item) {
        return item.data.p2
            ? this.NODE_WIDTH * 2 + this.FAMILY_GAP
            : this.NODE_WIDTH;
    }

    /** Проверяет, связаны ли два узла через общих родителей (сиблинговая связь) */
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

    /** Выводит в консоль текущие уровни для отладки */
    logLevels(label, raw) {
        console.log(`--- ${label} ---`);
        [...raw]
            .sort((a, b) => a._level - b._level || a.id - b.id)
            .forEach(p => {
                console.log(
                    `  [${p._level}] ${p.name}(${p.id})` +
                    `  parents:[${p.parents}]` +
                    `  spouses:[${p.spouses}]` +
                    `  siblings:[${p.siblings || []}]`
                );
            });
    }

    /** Показывает сообщение об ошибке/статусе */
    showMessage(msg) {
        console.log(msg);
        if (window.messageTextContent) {
            window.messageTextContent(msg, 'message error');
        }
    }
}
