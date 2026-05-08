<?php
require_once 'config.php';
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Метод запроса должен быть POST");
    }

    $conn = getDBConnection();
    $conn->begin_transaction();

    try {
        $person_id = isset($_POST['person_id']) ? intval($_POST['person_id']) : 0;

        if ($person_id > 0) {
            // Обновление существующего человека
            $first_name = trim($_POST['first_name'] ?? '');
            $last_name = trim($_POST['last_name'] ?? '');
            $birth_date = $_POST['birth_date'] ?? '';
            $death_date = !empty($_POST['death_date']) ? $_POST['death_date'] : null;
            $gender = $_POST['gender'] ?? '';

            $allowed_genders = ['male', 'female'];
            if (!in_array($gender, $allowed_genders)) {
                throw new Exception("Некорректное значение пола");
            }

            if ($death_date === null) {
                $sql = "UPDATE Persons SET first_name=?, last_name=?, birth_date=?, death_date=NULL, gender=? WHERE person_id=?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ssssi", $first_name, $last_name, $birth_date, $gender, $person_id);
            } else {
                $sql = "UPDATE Persons SET first_name=?, last_name=?, birth_date=?, death_date=?, gender=? WHERE person_id=?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("sssssi", $first_name, $last_name, $birth_date, $death_date, $gender, $person_id);
            }

            if (!$stmt->execute()) {
                throw new Exception("Ошибка обновления: " . $stmt->error);
            }
            $stmt->close();

            // Обновление существующих связей
            if (isset($_POST['updated_relatives']) && is_array($_POST['updated_relatives'])) {
                foreach ($_POST['updated_relatives'] as $updated) {
                    if (isset($updated['relative_id']) && isset($updated['relationship_type'])) {
                        $rel_stmt = $conn->prepare("UPDATE Relationships SET relationship_type = ? WHERE person_id = ? AND relative_id = ?");
                        $rel_id = intval($updated['relative_id']);
                        $rel_type = $updated['relationship_type'];
                        $rel_stmt->bind_param("sii", $rel_type, $person_id, $rel_id);
                        $rel_stmt->execute();
                        $rel_stmt->close();
                    }
                }
            }

            // Добавление новых связей
            if (isset($_POST['new_relatives']) && is_array($_POST['new_relatives'])) {
                foreach ($_POST['new_relatives'] as $new) {
                    if (isset($new['relative_id']) && isset($new['relationship_type'])) {
                        $rel_stmt = $conn->prepare("INSERT INTO Relationships (person_id, relative_id, relationship_type) VALUES (?, ?, ?)");
                        $rel_id = intval($new['relative_id']);
                        $rel_type = $new['relationship_type'];
                        $rel_stmt->bind_param("iis", $person_id, $rel_id, $rel_type);
                        $rel_stmt->execute();
                        $rel_stmt->close();
                    }
                }
            }

            $result = ['status' => 'success', 'message' => 'Данные успешно обновлены'];

        } else {
            // Создание нового человека
            $first_name = trim($_POST['first_name'] ?? '');
            $last_name = trim($_POST['last_name'] ?? '');
            $birth_date = $_POST['birth_date'] ?? '';
            $death_date = !empty($_POST['death_date']) ? $_POST['death_date'] : null;
            $gender = $_POST['gender'] ?? '';

            if (empty($first_name) || empty($last_name) || empty($birth_date) || empty($gender)) {
                throw new Exception("Заполните все обязательные поля");
            }

            $stmt = $conn->prepare("INSERT INTO Persons (first_name, last_name, birth_date, death_date, gender) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("sssss", $first_name, $last_name, $birth_date, $death_date, $gender);

            if (!$stmt->execute()) {
                throw new Exception("Ошибка добавления: " . $stmt->error);
            }

            $person_id = $conn->insert_id;
            $stmt->close();

            // Добавление связей
            if (isset($_POST['new_relatives']) && is_array($_POST['new_relatives'])) {
                foreach ($_POST['new_relatives'] as $new) {
                    if (isset($new['relative_id']) && isset($new['relationship_type'])) {
                        $rel_stmt = $conn->prepare("INSERT INTO Relationships (person_id, relative_id, relationship_type) VALUES (?, ?, ?)");
                        $rel_id = intval($new['relative_id']);
                        $rel_type = $new['relationship_type'];
                        $rel_stmt->bind_param("iis", $person_id, $rel_id, $rel_type);
                        $rel_stmt->execute();
                        $rel_stmt->close();
                    }
                }
            }

            $result = ['status' => 'success', 'message' => 'Новый человек добавлен', 'person_id' => $person_id];
        }

        $conn->commit();
        echo json_encode($result);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

    $conn->close();

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
