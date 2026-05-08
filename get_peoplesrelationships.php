<?php
require_once 'config.php';
header('Content-Type: application/json');

$conn = getDBConnection();

$sql = "SELECT person_id, relative_id, relationship_type FROM Relationships";
$result = $conn->query($sql);

$relationships = array();
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $relationships[] = array(
            "person_id" => intval($row["person_id"]),
            "relative_id" => intval($row["relative_id"]),
            "relationship_type" => $row["relationship_type"]
        );
    }
}

echo json_encode($relationships, JSON_UNESCAPED_UNICODE);
$conn->close();
?>
