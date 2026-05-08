<?php
require_once 'config.php';
header('Content-Type: application/json');

$conn = getDBConnection();

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['person_id']) || !isset($data['relative_id'])) {
    echo json_encode(['success' => false, 'error' => 'Отсутствуют необходимые данные']);
    $conn->close();
    exit;
}

$person_id = intval($data['person_id']);
$relative_id = intval($data['relative_id']);

$stmt = $conn->prepare("DELETE FROM Relationships WHERE person_id = ? AND relative_id = ?");
$stmt->bind_param("ii", $person_id, $relative_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Ошибка: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
