<?php
require_once 'config.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["status" => "error", "message" => "Некорректный метод запроса"]);
    exit;
}

$person_id = isset($_POST['person_id']) ? intval($_POST['person_id']) : 0;
$relative_id = isset($_POST['relative_id']) ? intval($_POST['relative_id']) : 0;
$relationship_type = isset($_POST['relationship_type']) ? $_POST['relationship_type'] : '';

if ($person_id <= 0 || $relative_id <= 0 || empty($relationship_type)) {
    echo json_encode(["status" => "error", "message" => "Некорректные данные"]);
    exit;
}

if ($person_id == $relative_id) {
    echo json_encode(["status" => "error", "message" => "Нельзя добавить связь с самим собой"]);
    exit;
}

$conn = getDBConnection();

$stmt = $conn->prepare("INSERT INTO Relationships (person_id, relative_id, relationship_type) VALUES (?, ?, ?)");
$stmt->bind_param("iis", $person_id, $relative_id, $relationship_type);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Родственная связь добавлена"]);
} else {
    echo json_encode(["status" => "error", "message" => "Ошибка: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
