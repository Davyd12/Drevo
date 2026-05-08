<?php
$servername = "localhost";
$username = "y9117055_1";
$password = "davyd_123";
$dbname = "y9117055_1";

function getDBConnection() {
    global $servername, $username, $password, $dbname;
    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");
    return $conn;
}
?>
