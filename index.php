<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/dagre/0.8.5/dagre.min.js"></script>

    <title>Генеалогическое древо</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        .main-container {
            display: flex;
            width: 100%;
            gap: 20px;
        }
        .sidebar {
            width: 300px;
            flex-shrink: 0;
        }
        .tree-container {
            flex-grow: 1;
            min-height: 600px;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 0;
            background-color: #f9f9f9;
            overflow: hidden;
            position: relative;
        }
        .tree-container svg {
            display: block;
            width: 100%;
            height: 100%;
            min-height: 600px;
        }
        .form-container {
            width: 300px;
            margin-right: 20px;
        }
        form {
            border: 1px solid #ccc;
            padding: 20px;
            border-radius: 5px;
        }
        label, input, select {
            display: block;
            margin-bottom: 10px;
            width: 100%;
        }
        input[type="submit"], input[type="button"] {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            margin-top: 10px;
            cursor: pointer;
            border-radius: 5px;
        }
        input[type="button"] {
            background-color: #3498db;
        }
        input[type="submit"]:hover {
            background-color: #45a049;
        }
        input[type="button"]:hover {
            background-color: #2980b9;
        }
        .message {
            position: fixed;
            top: 1%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 10px 20px;
            color: white;
            border-radius: 5px;
            font-size: 16px;
            text-align: center;
            z-index: 1000;
            display: none;
        }
        .message.success {
            border-color: #4CAF50;
            color: #4CAF50;
        }
        .message.error {
            border-color: #f44336;
            color: #f44336;
        }
        .people-list {
            width: 100%;
            border: 1px solid #ccc;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .people-list h3 {
            margin-top: 0;
            font-size: 16px;
        }
        .person-item {
            margin-bottom: 10px;
            font-size: 14px;
            position: relative;
            cursor: pointer;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 5px;
        }
        .tooltip {
            display: none;
            position: absolute;
            left: 110%;
            top: 0;
            z-index: 1;
            width: 200px;
            background-color: #fff;
            border: 1px solid #ccc;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .person-item:hover .tooltip {
            display: block;
        }
        .select-container {
            display: flex;
            align-items: center;
        }
        .select-container select {
            margin-right: 10px;
        }
        .relatives-section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        .relatives-section h3 {
            margin-top: 0;
            color: #333;
            font-size: 16px;
        }
        .relative-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            margin: 8px 0;
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            transition: background-color 0.2s;
        }
        .relative-item:hover {
            background-color: #f8f9fa;
        }
        .relative-info {
            flex-grow: 1;
            display: flex;
            align-items: center;
        }
        .relative-type {
            font-weight: bold;
            color: #2c3e50;
            margin-right: 12px;
            min-width: 100px;
        }
        .relative-name {
            color: #34495e;
            font-weight: 500;
        }
        .delete-relative {
            background-color: #e74c3c;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        }
        .delete-relative:hover {
            background-color: #c0392b;
        }
        .add-relationship-section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f0f8ff;
        }
        .add-relationship-section h3 {
            margin-top: 0;
            color: #2c3e50;
            font-size: 16px;
        }
        .relative-group-header {
            font-weight: bold;
            color: #2c3e50;
            margin: 15px 0 8px 0;
            padding-bottom: 5px;
            border-bottom: 2px solid #3498db;
            font-size: 14px;
        }

        /* ===== Стили для узлов дерева (SVG) ===== */
        .tree-node {
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .tree-node:hover {
            filter: brightness(1.05);
            stroke-width: 3px;
        }
        .tree-node.selected {
            stroke: #f39c12 !important;
            stroke-width: 4px !important;
            filter: drop-shadow(0 0 8px rgba(243, 156, 18, 0.5));
        }
        .tree-node.male {
            fill: #d4e6f1;
            stroke: #3498db;
        }
        .tree-node.female {
            fill: #fadbd8;
            stroke: #e74c3c;
        }

        /* Управление деревом */
        .tree-controls {
            margin-bottom: 0;
            padding: 10px 15px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            border-bottom: 1px solid #eee;
            background: #fff;
            position: relative;
            z-index: 1;
        }
        .tree-controls button {
            padding: 8px 15px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }
        .tree-controls button:hover {
            background-color: #2980b9;
        }

        /* Цветовые акценты для типов отношений */
        .relative-item[data-type="parent"] {
            border-left: 4px solid #3498db;
        }
        .relative-item[data-type="child"] {
            border-left: 4px solid #2ecc71;
        }
        .relative-item[data-type="sibling"] {
            border-left: 4px solid #f39c12;
        }
        .relative-item[data-type="spouse"] {
            border-left: 4px solid #9b59b6;
        }
    </style>
</head>
<body>
    <h1>Генеалогическое древо</h1>
    
    <div class="main-container">
        <div class="sidebar">
            <div class="people-list">
                <h3>Добавленные люди:</h3>
                <button id="createPersonButton">СОЗДАТЬ</button>
                <div id="peopleList">
                    <!-- Список людей будет загружен с помощью AJAX -->
                </div>
            </div>

            <div class="edit-form-container" id="editFormContainer" style="display: none">
                <form id="editPersonForm">
                    <input type="hidden" id="edit_person_id" name="person_id">

                    <label for="edit_first_name">Имя:</label>
                    <input type="text" id="edit_first_name" name="first_name" required>

                    <label for="edit_last_name">Фамилия:</label>
                    <input type="text" id="edit_last_name" name="last_name" required>

                    <label for="edit_birth_date">Дата рождения:</label>
                    <input type="date" id="edit_birth_date" name="birth_date" required>

                    <label for="edit_death_date">Дата смерти (если есть):</label>
                    <input type="date" id="edit_death_date" name="death_date">

                    <label for="edit_gender">Пол:</label>
                    <select id="edit_gender" name="gender" required>
                        <option value="male">Мужской</option>
                        <option value="female">Женский</option>
                    </select>

                    <!-- БЛОК ДЛЯ ОТОБРАЖЕНИЯ РОДСТВЕННИКОВ -->
                    <div class="relatives-section">
                        <h3>Ближайшие родственники:</h3>
                        <div id="currentRelatives">
                            <!-- Здесь будут отображаться текущие родственники -->
                        </div>
                    </div>

                    <!-- БЛОК ДЛЯ ДОБАВЛЕНИЯ НОВОЙ СВЯЗИ -->
                    <div class="add-relationship-section">
                        <h3>Добавить родственную связь:</h3>
                        <div class="select-container">
                            <select id="selectRelative" name="relative_id">
                                <option value="">Выберите человека</option>
                            </select>
                            <select id="relationshipType" name="relationship_type">
                                <option value="parent">Родитель</option>
                                <option value="child">Ребенок</option>
                                <option value="sibling">Брат/Сестра</option>
                                <option value="spouse">Супруг/Супруга</option>
                            </select>
                        </div>
                        <input type="button" id="addRelationshipButton" value="Добавить связь" style="margin-top: 10px;">
                    </div>

                    <input type="submit" value="Сохранить изменения">
                    <input type="button" id="deletePersonButton" value="Удалить">
                </form>
            </div>
        </div>

        <div class="tree-container">
            <div class="tree-controls">
                <button id="buildTreeBtn">Построить дерево</button>
                <button id="centerTreeBtn">Центрировать</button>
                <button id="zoomInBtn">Увеличить</button>
                <button id="zoomOutBtn">Уменьшить</button>
                <button id="resetZoomBtn">Сбросить масштаб</button>
                <button id="showFamilyTreeBtn">Семейное дерево</button>
                <button id="showAllPeopleBtn">Все люди</button>
            </div>
            <div id="familyTree"></div>
        </div>
    </div>

    <div class="message" id="message" style="display: none"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/6.7.0/d3.min.js"></script>
<!-- <script src="/Drevo/family-tree.js?t=<?php echo date('YmdHis'); ?>"></script> -->
<script src="/Drevo/FamilyTreeUtils.js?t=<?php echo date('YmdHis'); ?>"></script>
<script src="/Drevo/FamilyTreeData.js?t=<?php echo date('YmdHis'); ?>"></script>
<script src="/Drevo/FamilyTreeLayout.js?t=<?php echo date('YmdHis'); ?>"></script>
<script src="/Drevo/FamilyTreeRenderer.js?t=<?php echo date('YmdHis'); ?>"></script>
<script src="/Drevo/FamilyTree.js?t=<?php echo date('YmdHis'); ?>"></script>

<script>
    // Основные функции
    function updatePeopleList() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/Drevo/get_people_list.php', true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                document.getElementById('peopleList').innerHTML = xhr.responseText;
                populateSelects();
            }
        };
        xhr.onerror = function () {
            messageTextContent('Ошибка запроса','message error');
        };
        xhr.send();
    }

    function messageTextContent(mesageText, messageError){
        var message = document.getElementById('message');
        message.textContent = mesageText;
        message.className = messageError;
        message.style.display = 'block';
        
        setTimeout(function() {
            message.style.display = 'none';
        }, 2000);
    }

    function populateSelects() {
        const personSelect = document.getElementById('selectRelative');
        if (!personSelect) {
            console.error('Элемент #selectRelative не найден');
            return;
        }

        personSelect.innerHTML = '';
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Выберите человека';
        personSelect.appendChild(emptyOption);

        const personItems = document.querySelectorAll('.person-item');
        if (personItems.length === 0) {
            return;
        }

        personItems.forEach(item => {
            const personId = item.dataset.id;
            if (isNaN(personId)) return;

            const personNameElement = item.querySelector('span');
            if (!personNameElement) return;

            const personName = personNameElement.textContent;
            const option = document.createElement('option');
            option.value = personId;
            option.textContent = personName;
            personSelect.appendChild(option);
        });
    }

    // Функции для работы с родственниками
    function getRelationshipTypeText(type) {
        const types = {
            'parent': 'Родитель',
            'child': 'Ребенок', 
            'sibling': 'Брат/Сестра',
            'spouse': 'Супруг/Супруга'
        };
        return types[type] || type;
    }

    function getInverseRelationshipType(type) {
        const inverseTypes = {
            'parent': 'Ребенок',
            'child': 'Родитель',
            'sibling': 'Брат/Сестра',
            'spouse': 'Супруг/Супруга'
        };
        return inverseTypes[type] || type;
    }

    function getCorrectRelationshipType(originalType, isDirect) {
        return isDirect
            ? getRelationshipTypeText(originalType)
            : getInverseRelationshipType(originalType);
    }

    function getRelativeName(relativeId) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `/Drevo/get_person.php?id=${relativeId}`, true);
            xhr.onload = function() {
                if (xhr.status === 200) {
                    try {
                        const person = JSON.parse(xhr.responseText);
                        resolve(`${person.last_name} ${person.first_name}`);
                    } catch (e) {
                        resolve('Неизвестно');
                    }
                } else {
                    resolve('Неизвестно');
                }
            };
            xhr.onerror = function() { resolve('Неизвестно'); };
            xhr.send();
        });
    }

    function displayCurrentRelatives(relationships, personId) {
        const container = document.getElementById('currentRelatives');
        container.innerHTML = '';
        
        if (!Array.isArray(relationships) || relationships.length === 0) {
            container.innerHTML = '<p>Нет родственных связей</p>';
            return;
        }
        
        const promises = relationships.map(relationship => {
            return new Promise((resolve) => {
                const isDirect = parseInt(relationship.person_id) === parseInt(personId);
                const relativeId = isDirect ? relationship.relative_id : relationship.person_id;
                
                getRelativeName(relativeId).then(relativeName => {
                    resolve({
                        relationship: relationship,
                        relativeId: relativeId,
                        relativeName: relativeName,
                        displayType: getCorrectRelationshipType(relationship.relationship_type, isDirect),
                        originalType: relationship.relationship_type,
                        isDirect: isDirect
                    });
                });
            });
        });

        Promise.all(promises).then(results => {
            const grouped = {};
            results.forEach(result => {
                if (!grouped[result.displayType]) grouped[result.displayType] = [];
                grouped[result.displayType].push(result);
            });
            
            const typeOrder = ['Супруг/Супруга', 'Родитель', 'Ребенок', 'Брат/Сестра'];
            
            typeOrder.forEach(type => {
                if (grouped[type] && grouped[type].length > 0) {
                    const groupHeader = document.createElement('div');
                    groupHeader.className = 'relative-group-header';
                    groupHeader.textContent = type + ' (' + grouped[type].length + ')';
                    container.appendChild(groupHeader);
                    
                    grouped[type].forEach(result => {
                        const relativeItem = document.createElement('div');
                        relativeItem.className = 'relative-item';
                        relativeItem.setAttribute('data-type', result.originalType);
                        
                        relativeItem.innerHTML = `
                            <div class="relative-info">
                                <span class="relative-name">${result.relativeName}</span>
                            </div>
                            <button class="delete-relative" onclick="deleteRelationship(${personId}, ${result.relativeId})">
                                Удалить
                            </button>
                        `;
                        container.appendChild(relativeItem);
                    });
                }
            });
            
            Object.keys(grouped).forEach(type => {
                if (!typeOrder.includes(type)) {
                    grouped[type].forEach(result => {
                        const relativeItem = document.createElement('div');
                        relativeItem.className = 'relative-item';
                        relativeItem.innerHTML = `
                            <div class="relative-info">
                                <span class="relative-type">${type}:</span>
                                <span class="relative-name">${result.relativeName}</span>
                            </div>
                            <button class="delete-relative" onclick="deleteRelationship(${personId}, ${result.relativeId})">
                                Удалить
                            </button>
                        `;
                        container.appendChild(relativeItem);
                    });
                }
            });
        });
    }

    function deleteRelationship(personId, relativeId) {
        if (confirm('Вы уверены, что хотите удалить эту связь?')) {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/Drevo/delete_relationship.php', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onload = function() {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        messageTextContent("Связь успешно удалена", "message success");
                        loadRelationships(personId);
                        setTimeout(() => window.familyTree.refresh(), 500);
                    } else {
                        messageTextContent("Ошибка при удалении связи", "message error");
                    }
                }
            };
            xhr.send(JSON.stringify({
                person_id: personId,
                relative_id: relativeId
            }));
        }
    }

    function loadRelationships(personId) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/Drevo/get_relationships.php?id=${personId}`, true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    const relationships = JSON.parse(xhr.responseText);
                    displayCurrentRelatives(relationships, personId);
                } catch (e) {
                    console.error('Ошибка при загрузке связей:', e);
                }
            }
        };
        xhr.send();
    }

    function handlePersonData(person) {
        document.getElementById('edit_person_id').value = person.person_id;
        document.getElementById('edit_first_name').value = person.first_name;
        document.getElementById('edit_last_name').value = person.last_name;
        document.getElementById('edit_birth_date').value = person.birth_date;
        
        if (person.gender) {
            document.getElementById('edit_gender').value = person.gender;
        } else {
            document.getElementById('edit_gender').selectedIndex = 0;
        }

        document.getElementById('edit_death_date').value =
            (person.death_date === "0000-00-00" || !person.death_date) ? "" : person.death_date;
        
        setTimeout(populateSelects, 100);
    }

    // Глобальная функция для загрузки информации о человеке (вызывается из дерева)
    window.loadPersonInfo = function(personId) {
        document.getElementById('editFormContainer').style.display = 'block';

        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/Drevo/get_person.php?id=${personId}`, true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    const person = JSON.parse(xhr.responseText);
                    handlePersonData(person);
                    loadRelationships(personId);
                    setTimeout(populateSelects, 100);
                } catch (e) {
                    console.error('Ошибка при загрузке информации:', e);
                }
            }
        };
        xhr.send();
    };

    // Обработчики событий
    document.getElementById('createPersonButton').addEventListener('click', function() {
        document.getElementById('edit_person_id').value = '';
        document.getElementById('edit_first_name').value = '';
        document.getElementById('edit_last_name').value = '';
        document.getElementById('edit_birth_date').value = '';
        document.getElementById('edit_death_date').value = '';
        document.getElementById('edit_gender').selectedIndex = 0;
        document.getElementById('selectRelative').value = '';
        document.getElementById('relationshipType').selectedIndex = 0;
        document.getElementById('currentRelatives').innerHTML = '<p>Нет родственных связей</p>';
        document.getElementById('editFormContainer').style.display = 'block';
    });

    document.getElementById('addRelationshipButton').addEventListener('click', function() {
        const personId = document.getElementById('edit_person_id').value;
        const relativeId = document.getElementById('selectRelative').value;
        const relationshipType = document.getElementById('relationshipType').value;
        
        if (!personId) {
            alert('Сначала сохраните человека');
            return;
        }
        
        if (!relativeId || !relationshipType) {
            alert('Выберите человека и тип связи');
            return;
        }
        
        const formData = new FormData();
        formData.append('person_id', personId);
        formData.append('relative_id', relativeId);
        formData.append('relationship_type', relationshipType);
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/Drevo/add_relationship.php', true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.status === "success") {
                    messageTextContent(response.message, "message success");
                    loadRelationships(personId);
                    document.getElementById('selectRelative').value = '';
                    document.getElementById('relationshipType').selectedIndex = 0;
                    setTimeout(() => window.familyTree.refresh(), 500);
                } else {
                    messageTextContent(response.message, "message error");
                }
            }
        };
        xhr.send(formData);
    });

    document.getElementById('deletePersonButton').onclick = function() {
        var personId = document.getElementById('edit_person_id').value;
        if (personId) {
            if (confirm('Вы уверены, что хотите удалить эту запись?')) {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', '/Drevo/delete_person.php', true);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        messageTextContent("Запись успешно удалена","message success");
                        document.getElementById('editFormContainer').style.display = 'none';
                        updatePeopleList();
                        document.getElementById('editPersonForm').reset();
                        setTimeout(() => window.familyTree.refresh(), 500);
                    } else {
                        messageTextContent("Ошибка при удалении записи","message error");
                    }
                };
                xhr.send('person_id=' + encodeURIComponent(personId));
            }
        } else {
            alert('Выберите запись для удаления');
        }
    };

    document.getElementById('peopleList').addEventListener('click', function(event) {
        var target = event.target.closest('.person-item');
        if (target) {
            document.getElementById('editFormContainer').style.display = 'block';
            setTimeout(populateSelects, 100);

            var personId = target.getAttribute('data-id');

            var personRequest = new XMLHttpRequest();
            personRequest.open('GET', `/Drevo/get_person.php?id=${personId}`, true);
            personRequest.onload = function() {
                if (personRequest.status === 200) {
                    try {
                        var person = JSON.parse(personRequest.responseText);
                        handlePersonData(person);
                        loadRelationships(personId);
                    } catch (e) {
                        console.error('Ошибка при разборе данных о человеке:', e);
                    }
                } else {
                    console.error('Ошибка при получении данных о человеке:', personRequest.statusText);
                }
            };
            personRequest.send();
        }
    });

    document.getElementById('editPersonForm').addEventListener('submit', function(event) {
        event.preventDefault();
        var personId = document.getElementById('edit_person_id').value;
        
        if (personId === '') {
            var formData = new FormData(this);
            var xhr = new XMLHttpRequest();
            xhr.open('POST', '/Drevo/add_person.php', true);
            xhr.onload = function () {
                if (xhr.status === 200) {
                    var response = JSON.parse(xhr.responseText);
                    if (response.status === "success") {
                        messageTextContent(response.message,'message success');
                        updatePeopleList();
                        document.getElementById('editFormContainer').style.display="none";
                        setTimeout(() => window.familyTree.refresh(), 500);
                    } else {
                        messageTextContent(response.message, 'message error');
                    }
                } else {
                    messageTextContent('Ошибка: ' + xhr.statusText, 'message error');
                }
            };
            xhr.onerror = function () {
                messageTextContent('Ошибка запроса','message error');
            };
            xhr.send(formData);
        } else {
            var formData = new FormData(this);
            var xhr = new XMLHttpRequest();
            xhr.open('POST', '/Drevo/update_person.php', true);
            xhr.onload = function () {
                if (xhr.status === 200) {
                    var response = JSON.parse(xhr.responseText);
                    if (response.status === "success") {
                        messageTextContent(response.message,"message success");
                        updatePeopleList();
                        document.getElementById('editFormContainer').style.display = 'none';
                        setTimeout(() => window.familyTree.refresh(), 500);
                    } else {
                        messageTextContent("Ошибка изменения записи ","message error");
                    }
                }
            };
            xhr.send(formData);
        }
    });
    
     
 
    // Обработчики для кнопок дерева
    document.getElementById('buildTreeBtn').addEventListener('click', () => window.familyTree.buildFamilyTree());
    document.getElementById('centerTreeBtn').addEventListener('click', () => window.familyTree.centerTree());
    document.getElementById('zoomInBtn').addEventListener('click', () => window.familyTree.zoomIn());
    document.getElementById('zoomOutBtn').addEventListener('click', () => window.familyTree.zoomOut());
    document.getElementById('resetZoomBtn').addEventListener('click', () => window.familyTree.resetZoom());
    document.getElementById('showFamilyTreeBtn').addEventListener('click', () => window.familyTree.buildFamilyTree('family'));
    document.getElementById('showAllPeopleBtn').addEventListener('click', () => window.familyTree.buildFamilyTree('all'));
    
    

    // Инициализация
    window.onload = function() {
        updatePeopleList();
        setTimeout(() => window.familyTree.buildFamilyTree(), 1500);
    };
    

</script>

</body>
</html>
