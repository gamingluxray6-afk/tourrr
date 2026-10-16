<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json');

if (($_SESSION['user_role'] ?? '') !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Admin login required.']);
    exit;
}

const WX_LAT = 16.5314;
const WX_LON = 120.3941;
const WX_TZ  = 'Asia/Manila';

function wx_label($code) {
    $map = [
        0 => 'Clear sky', 1 => 'Mainly clear', 2 => 'Partly cloudy', 3 => 'Overcast',
        45 => 'Foggy', 48 => 'Foggy',
        51 => 'Light drizzle', 53 => 'Drizzle', 55 => 'Heavy drizzle',
        56 => 'Freezing drizzle', 57 => 'Freezing drizzle',
        61 => 'Slight rain', 63 => 'Moderate rain', 65 => 'Heavy rain',
        66 => 'Freezing rain', 67 => 'Freezing rain',
        71 => 'Light snow', 73 => 'Snow', 75 => 'Heavy snow',
        80 => 'Rain showers', 81 => 'Rain showers', 82 => 'Violent showers',
        95 => 'Thunderstorm', 96 => 'Thunderstorm, hail', 99 => 'Thunderstorm, hail',
    ];
    return $map[(int)$code] ?? 'Unknown';
}

function wx_http_get($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_FOLLOWLOCATION => true]);
        $out = curl_exec($ch);
        curl_close($ch);
        return $out;
    }
    $ctx = stream_context_create(['http' => ['timeout' => 20]]);
    return @file_get_contents($url, false, $ctx);
}

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS weather_log (
        log_date DATE PRIMARY KEY,
        temp_max DECIMAL(5,1) NULL,
        temp_min DECIMAL(5,1) NULL,
        rain_mm DECIMAL(6,1) NULL,
        wind_max DECIMAL(5,1) NULL,
        weather_code INT NULL,
        summary VARCHAR(60) NULL,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    $have = $pdo->query("SHOW COLUMNS FROM weather_log")->fetchAll(PDO::FETCH_COLUMN);
    foreach (['temp_mean' => 'DECIMAL(5,1)', 'feels_max' => 'DECIMAL(5,1)', 'humidity' => 'INT', 'cloud' => 'INT', 'rain_hours' => 'DECIMAL(4,1)',
              'gust_max' => 'DECIMAL(5,1)', 'wind_dir' => 'INT', 'sun_hours' => 'DECIMAL(4,1)', 'uv_max' => 'DECIMAL(4,1)',
              'sunrise' => 'VARCHAR(5)', 'sunset' => 'VARCHAR(5)'] as $col => $type) {
        if (!in_array($col, $have, true)) $pdo->exec("ALTER TABLE weather_log ADD COLUMN $col $type NULL");
    }

    $action = $_GET['action'] ?? 'list';

    if ($action === 'sync') {
        $tz = new DateTimeZone(WX_TZ);
        $today = new DateTime('today', $tz);
        $isDate = fn($s) => is_string($s) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $s);
        $from = $isDate($_GET['from'] ?? null) ? new DateTime($_GET['from'], $tz) : (clone $today)->modify('-60 days');
        $to   = $isDate($_GET['to'] ?? null)   ? new DateTime($_GET['to'], $tz)   : clone $today;
        if ($to > $today) $to = clone $today;
        if ($from > $to) [$from, $to] = [$to, $from];
        $minFrom = (clone $to)->modify('-1000 days');
        if ($from < $minFrom) $from = $minFrom;

        $fresh = (clone $today)->modify('-5 days');
        $have = $pdo->prepare("SELECT log_date FROM weather_log WHERE log_date BETWEEN ? AND ? AND log_date < ? AND humidity IS NOT NULL");
        $have->execute([$from->format('Y-m-d'), $to->format('Y-m-d'), $fresh->format('Y-m-d')]);
        $saved = array_flip($have->fetchAll(PDO::FETCH_COLUMN));
        $need = [];
        for ($d = clone $from; $d <= $to; $d->modify('+1 day')) {
            if (!isset($saved[$d->format('Y-m-d')])) $need[] = $d->format('Y-m-d');
        }
        if (!$need) { echo json_encode(['success' => true, 'saved' => 0]); exit; }

        $split = (clone $today)->modify('-85 days')->format('Y-m-d');
        $old = array_values(array_filter($need, fn($x) => $x < $split));
        $new = array_values(array_filter($need, fn($x) => $x >= $split));
        $daily = 'daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max'
               . ',temperature_2m_mean,apparent_temperature_max,relative_humidity_2m_mean,cloud_cover_mean,precipitation_hours'
               . ',wind_gusts_10m_max,wind_direction_10m_dominant,sunshine_duration,uv_index_max,sunrise,sunset';
        $base = 'latitude=' . WX_LAT . '&longitude=' . WX_LON . '&' . $daily . '&timezone=' . urlencode(WX_TZ);
        $urls = [];
        if ($old) $urls[] = 'https://archive-api.open-meteo.com/v1/archive?' . $base . '&start_date=' . $old[0] . '&end_date=' . end($old);
        if ($new) $urls[] = 'https://api.open-meteo.com/v1/forecast?' . $base . '&start_date=' . $new[0] . '&end_date=' . end($new);

        $stmt = $pdo->prepare("INSERT INTO weather_log (log_date, temp_max, temp_min, rain_mm, wind_max, weather_code, summary,
                temp_mean, feels_max, humidity, cloud, rain_hours, gust_max, wind_dir, sun_hours, uv_max, sunrise, sunset)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE temp_max=VALUES(temp_max), temp_min=VALUES(temp_min), rain_mm=VALUES(rain_mm),
                wind_max=VALUES(wind_max), weather_code=VALUES(weather_code), summary=VALUES(summary),
                temp_mean=VALUES(temp_mean), feels_max=VALUES(feels_max), humidity=VALUES(humidity), cloud=VALUES(cloud),
                rain_hours=VALUES(rain_hours), gust_max=VALUES(gust_max), wind_dir=VALUES(wind_dir), sun_hours=VALUES(sun_hours),
                uv_max=VALUES(uv_max), sunrise=VALUES(sunrise), sunset=VALUES(sunset), saved_at=CURRENT_TIMESTAMP");
        $hm = fn($iso) => $iso ? substr($iso, 11, 5) : null;
        $count = 0; $failed = false;
        foreach ($urls as $url) {
            $data = json_decode((string)wx_http_get($url), true);
            if (!$data || empty($data['daily']['time'])) { $failed = true; continue; }
            $d = $data['daily'];
            foreach ($d['time'] as $i => $day) {
                $code = $d['weather_code'][$i] ?? null;
                if ($code === null) continue;
                $stmt->execute([
                    $day,
                    $d['temperature_2m_max'][$i] ?? null,
                    $d['temperature_2m_min'][$i] ?? null,
                    $d['precipitation_sum'][$i] ?? null,
                    $d['wind_speed_10m_max'][$i] ?? null,
                    $code,
                    wx_label($code),
                    $d['temperature_2m_mean'][$i] ?? null,
                    $d['apparent_temperature_max'][$i] ?? null,
                    isset($d['relative_humidity_2m_mean'][$i]) ? round($d['relative_humidity_2m_mean'][$i]) : null,
                    isset($d['cloud_cover_mean'][$i]) ? round($d['cloud_cover_mean'][$i]) : null,
                    $d['precipitation_hours'][$i] ?? null,
                    $d['wind_gusts_10m_max'][$i] ?? null,
                    isset($d['wind_direction_10m_dominant'][$i]) ? round($d['wind_direction_10m_dominant'][$i]) : null,
                    isset($d['sunshine_duration'][$i]) ? round($d['sunshine_duration'][$i] / 3600, 1) : null,
                    $d['uv_index_max'][$i] ?? null,
                    $hm($d['sunrise'][$i] ?? null),
                    $hm($d['sunset'][$i] ?? null),
                ]);
                $count++;
            }
        }
        if ($failed && !$count) {
            echo json_encode(['success' => false, 'message' => 'Could not reach the weather service. The saved days are still available.']);
            exit;
        }
        echo json_encode(['success' => true, 'saved' => $count]);
        exit;
    }

    $f = $_GET['from'] ?? ''; $t = $_GET['to'] ?? '';
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $f) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $t)) {
        $q = $pdo->prepare("SELECT log_date, temp_max, temp_min, rain_mm, wind_max, weather_code, summary, temp_mean, feels_max, humidity, cloud, rain_hours, gust_max, wind_dir, sun_hours, uv_max, sunrise, sunset
                            FROM weather_log WHERE log_date BETWEEN ? AND ? ORDER BY log_date DESC");
        $q->execute([min($f, $t), max($f, $t)]);
        echo json_encode(['success' => true, 'rows' => $q->fetchAll(PDO::FETCH_ASSOC)]);
        exit;
    }
    $days = max(1, min(1000, (int)($_GET['days'] ?? 365)));
    $rows = $pdo->query("SELECT log_date, temp_max, temp_min, rain_mm, wind_max, weather_code, summary, temp_mean, feels_max, humidity, cloud, rain_hours, gust_max, wind_dir, sun_hours, uv_max, sunrise, sunset
                         FROM weather_log ORDER BY log_date DESC LIMIT $days")->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'rows' => $rows]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Weather error: ' . $e->getMessage()]);
}
