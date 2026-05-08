<?php
require_once 'config.php';

$conn = getDBConnection();

$sql = "SELECT person_id, first_name, last_name, birth_date FROM Persons";
$result = $conn->query($sql);

$list_html = '';
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $list_html .= '<div class="person-item" data-id="' . intval($row["person_id"]) . '">';
        $list_html .= '<span>' . htmlspecialchars($row["last_name"]) . ' ' . htmlspecialchars($row["first_name"]) . '</span>';
        $list_html .= '<div class="tooltip" id="tooltip-' . intval($row['person_id']) . '">' . htmlspecialchars($row["birth_date"]) . '</div>';
        $list_html .= '</div>';
    }
} else {
    $list_html = "Нет записей";
}

echo $list_html;
$conn->close();
?>
