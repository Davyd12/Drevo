<?php
require_once 'config.php';
header('Content-Type: application/json');

$person_id = isset($_POST['person_id']) ? intval($_POST['person_id']) : 0;

if ($person_id <= 0) {
    echo json_encode(["status" => "error", "message" => "Идентификатор записи не передан"]);
    exit;
}

$conn = getDBConnection();

// Удаляем все связи этого человека
$stmt_rel = $conn->prepare("DELETE FROM Relationships WHERE person_id = ? OR relative_id = ?");
$stmt_rel->bind_param("ii", $person_id, $person_id);
$stmt_rel->execute();
$stmt_rel->close();

// Удаляем человека
$stmt = $conn->prepare("DELETE FROM Persons WHERE person_id = ?");
$stmt->bind_param("i", $person_id);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Запись успешно удалена"]);
} else {
    echo json_encode(["status" => "error", "message" => "Ошибка: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
