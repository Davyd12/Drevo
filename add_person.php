<?php
require_once 'config.php';
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Метод запроса должен быть POST");
    }

    $first_name = isset($_POST['first_name']) ? trim($_POST['first_name']) : '';
    $last_name = isset($_POST['last_name']) ? trim($_POST['last_name']) : '';
    $birth_date = isset($_POST['birth_date']) ? $_POST['birth_date'] : '';
    $death_date = isset($_POST['death_date']) && !empty($_POST['death_date']) ? $_POST['death_date'] : null;
    $gender = isset($_POST['gender']) ? $_POST['gender'] : '';

    if (empty($first_name)) throw new Exception("Имя является обязательным полем");
    if (empty($last_name)) throw new Exception("Фамилия является обязательным полем");
    if (empty($birth_date)) throw new Exception("Дата рождения является обязательным полем");
    if (empty($gender)) throw new Exception("Пол является обязательным полем");

    $allowed_genders = ['male', 'female'];
    if (!in_array($gender, $allowed_genders)) {
        throw new Exception("Некорректное значение пола");
    }

    $conn = getDBConnection();

    $stmt = $conn->prepare("INSERT INTO Persons (first_name, last_name, birth_date, death_date, gender) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $first_name, $last_name, $birth_date, $death_date, $gender);

    if ($stmt->execute()) {
        echo json_encode([
            "status" => "success",
            "message" => "Новая запись успешно добавлена",
            "person_id" => $conn->insert_id
        ]);
    } else {
        throw new Exception("Ошибка при добавлении: " . $stmt->error);
    }

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
