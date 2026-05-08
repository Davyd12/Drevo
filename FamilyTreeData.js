/**
 * FamilyTreeData — только загрузка данных с сервера.
 * Никакой обработки — просто fetch и возврат сырого JSON.
 */
class FamilyTreeData {

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

    /** Удобный метод — загружает всё сразу */
    async fetchAll() {
        const [people, relationships] = await Promise.all([
            this.fetchPeople(),
            this.fetchRelationships()
        ]);
        return { people, relationships };
    }
}
