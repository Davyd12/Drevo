<?php
require_once 'config.php';
header('Content-Type: application/json');

$conn = getDBConnection();
$person_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($person_id <= 0) {
    echo json_encode([]);
    $conn->close();
    exit;
}

$stmt = $conn->prepare("SELECT person_id, relative_id, relationship_type FROM Relationships WHERE person_id = ? OR relative_id = ?");
$stmt->bind_param("ii", $person_id, $person_id);
$stmt->execute();
$result = $stmt->get_result();

$relationships = array();
while ($row = $result->fetch_assoc()) {
    $row['person_id'] = intval($row['person_id']);
    $row['relative_id'] = intval($row['relative_id']);
    $relationships[] = $row;
}

echo json_encode($relationships, JSON_UNESCAPED_UNICODE);
$stmt->close();
$conn->close();
?>
