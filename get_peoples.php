<?php
require_once 'config.php';
header('Content-Type: application/json');

$conn = getDBConnection();

$sql = "SELECT person_id, first_name, last_name, birth_date, gender FROM Persons";
$result = $conn->query($sql);

$people = array();
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $people[] = array(
            "id" => intval($row["person_id"]),
            "name" => $row["first_name"] . ' ' . $row["last_name"],
            "birth_date" => $row["birth_date"],
            "gender" => $row["gender"]
        );
    }
}

echo json_encode($people, JSON_UNESCAPED_UNICODE);
$conn->close();
?>
