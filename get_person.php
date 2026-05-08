<?php
require_once 'config.php';
header('Content-Type: application/json');

$conn = getDBConnection();
$personId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($personId > 0) {
    $stmt = $conn->prepare("SELECT person_id, first_name, last_name, birth_date, death_date, gender FROM Persons WHERE person_id = ?");
    $stmt->bind_param('i', $personId);
    $stmt->execute();
    $result = $stmt->get_result();
    $person = $result->fetch_assoc();

    if ($person) {
        $person['person_id'] = intval($person['person_id']);
        echo json_encode($person, JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['error' => 'Человек не найден']);
    }
    $stmt->close();
} else {
    echo json_encode(['error' => 'Неверный идентификатор']);
}

$conn->close();
?>
