<?php
// this script contains the initial installation script which just unpacks the release package

require __DIR__ . "/check-requirements.php";

$currentFiles = count(scandir(__DIR__));
$zipFile = __DIR__ . "/app-release.zip";
$outputDirectory = __DIR__;
$canInstall = file_exists($zipFile) && !file_exists(__DIR__ . "/index.php");
$isCli = php_sapi_name() === "cli";

if (($_GET['unpack'] ?? null) && $canInstall) {
    $zipArchive = new ZipArchive();
    $openResult = $zipArchive->open($zipFile, ZipArchive::RDONLY);
    if ($openResult !== true) {
        throw new Exception("Cannot open ZIP File '$zipFile' ($openResult)");
    }
    $zipArchive->extractTo($outputDirectory);
    $zipArchive->close();
    // if installed correctly delete install script and go ahead
    if (is_dir(__DIR__ . "/modules")) {
        unlink(__FILE__);
        unlink(__DIR__ . "/check-requirements.php");
        unlink($zipFile);
    }
    if (!$isCli) {
        // wait 3 seconds to prevent opcache in default configs
        sleep(3);
        header("location: " . str_replace(["?unpack=1", "install.php"], "", $_SERVER['REQUEST_URI']));
    }
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>First Time Setup</title>
    <style>
      body {
        font-family: "Arial", sans-serif;
        font-size: 16px;
        line-height: 1.4;
        text-align: center;
        background: #f5f5f5;
        color: #333;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
      }
      .main {
        margin: 0 auto;
        max-width: 800px;
        background: white;
        padding: 40px;
        box-shadow: rgba(0, 0, 0, 0.1) 0 0 30px;
        border-radius: 40px;
      }
    </style>
</head>
<body>
<div class="main">
    <h1>First Time Setup</h1>
    <?php
    if (!file_exists($zipFile)) {
        echo '"app-release.zip" does not exist in this directory';
    } elseif (!$canInstall) {
        ?>
        Cannot start installation. Some required files are missing.
        <?php
    } else {
        ?>
        <a href="?unpack=1">Click here to start setup</a>
        <?php
    }
    ?>
</div>
</body>
</html>