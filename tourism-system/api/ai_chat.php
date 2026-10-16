<?php
require __DIR__ . '/config.php';
require __DIR__ . '/ai_config.php';
header('Content-Type: application/json');

function fail($reason) { echo json_encode(['success' => false, 'reason' => $reason]); exit; }

if (!defined('ANTHROPIC_API_KEY') || trim(ANTHROPIC_API_KEY) === '') fail('no_key');
if (!function_exists('curl_init')) fail('no_curl');

$in = json_decode(file_get_contents('php://input'), true);
$message = trim((string)($in['message'] ?? ''));
if ($message === '') fail('empty');
$message = mb_substr($message, 0, 600);
$role = ($in['role'] ?? '') === 'admin' ? 'admin' : 'tourist';

$now = time();
$_SESSION['ai_hits'] = array_values(array_filter($_SESSION['ai_hits'] ?? [], fn($t) => $now - $t < 60));
if (count($_SESSION['ai_hits']) >= 15) fail('rate_limit');
$_SESSION['ai_hits'][] = $now;

$messages = [];
foreach (array_slice($in['history'] ?? [], -8) as $m) {
    $r = ($m['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
    $c = trim(mb_substr((string)($m['content'] ?? ''), 0, 1500));
    if ($c !== '') $messages[] = ['role' => $r, 'content' => $c];
}
while ($messages && $messages[0]['role'] !== 'user') array_shift($messages);
$messages[] = ['role' => 'user', 'content' => $message];

$spotsTxt = ''; $productsTxt = '';
try {
    foreach ($pdo->query("SELECT name, category, location, points_reward, rating, description, features FROM tourist_spots ORDER BY id") as $s)
        $spotsTxt .= "- {$s['name']} ({$s['category']}) | {$s['location']} | +{$s['points_reward']} pts | rating {$s['rating']} | {$s['description']} | Features: {$s['features']}\n";
    foreach ($pdo->query("SELECT name, category, location, price, description FROM products ORDER BY id") as $p)
        $productsTxt .= "- {$p['name']} ({$p['category']}) | sold at {$p['location']} | PHP {$p['price']} | {$p['description']}\n";
} catch (Exception $e) {  }

$system = <<<TXT
You are the "Naguilian Tourism AI", the friendly local guide inside the LakbayNaguilian app for Naguilian, La Union, Philippines.
Answer ANY question about Naguilian, La Union: history, geography, barangays, government, economy, culture, Basi, food, festivals, tourist spots, getting around, weather, safety, nearby places (San Fernando, Bauang, Baguio, Bagulin, Burgos, Caba, Aringay, the La Union coast), and how to use the app (scan a spot's QR code to earn points, redeem points for tickets/rewards, the Map page).

VERIFIED FACTS ABOUT NAGUILIAN, LA UNION
- 1st class municipality at the geographic center of La Union; nicknames: "The True Heart of La Union" and "Home of the Original Basi".
- Land area about 100.87 sq km; 37 barangays; population 52,189 (2020 census), about 54,159 in 2015. Languages: Iloko and Tagalog. Mostly Roman Catholic.
- Neighbors: north San Fernando City and Bagulin; south Caba and Aringay; east Burgos; west Bauang. On the Naguilian Road/Highway between Baguio and the coast; buses regularly run Baguio - La Union through the town.
- History: settlers from coastal Bauang followed the river inland to a fertile valley. The Catholic church (St. Augustine of Hippo Parish Church) was built in 1739; the 1839 centennial marked the town's separation from Bauang. Naguilian was one of the original towns when La Union became a province in 1850. The name comes from "nag-ili-an" (a place where a town was made).
- Patron: St. Augustine of Hippo. Parochial fiesta May 5; town fiesta February 21-23. The Basi Festival celebrates Basi (street dancing, sports, agri-trade fair); its schedule has been reported differently between sources and years, so say dates can vary and suggest checking the municipality's announcements.
- Basi: fermented sugarcane wine aged in earthen jars (burnay/tapayan); the town's One Town One Product. The La Union method ferments about two months. The Naguilian Agricultural Complex shows how it is made.
- Market days: Tuesday, Friday, Sunday. Municipal tourist destinations listed by the LGU: Tuddingan Falls, San Antonio Mini Rice Terraces, Naguilian Agricultural Complex.
- A different town, Naguilian in Isabela province, exists; this app is about Naguilian, La Union.

SPOTS IN THE APP (live from the database):
{$spotsTxt}
PRODUCTS IN THE APP (live from the database):
{$productsTxt}
RULES
- Use the app data above for spots, points, ratings and products. Use your own knowledge for general facts about the town and region, and be honest about uncertainty.
- Never invent opening hours, entrance fees, phone numbers, prices, event dates or names of officials. If you are not sure, say so and suggest the Naguilian Municipal Tourism Office / municipal hall. Officials change with elections, so do not name them.
- If asked about something unrelated to Naguilian, La Union or travel there, politely say you focus on Naguilian and steer back with an example question.
- Reply in the same language the user writes in (English, Filipino/Tagalog or Iloko).
- Keep answers short and friendly (about 60 to 150 words). Use short bullet lines starting with "- " and **bold** for key names. No headings or tables.
- The user is a {$role}. Admins may ask about managing spots, reviews and analytics in the app; the analytics page currently uses sample numbers, so do not present them as real statistics.
TXT;

$payload = json_encode([
    'model' => AI_MODEL,
    'max_tokens' => 700,
    'system' => $system,
    'messages' => $messages,
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'content-type: application/json',
        'x-api-key: ' . ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01',
    ],
    CURLOPT_POSTFIELDS => $payload,
]);
$raw = curl_exec($ch);
if ($raw === false) { error_log('ai_chat curl: ' . curl_error($ch)); fail('network'); }
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($raw, true);
if ($code !== 200 || empty($data['content'])) { error_log('ai_chat api ' . $code . ': ' . $raw); fail('api_error'); }

$reply = '';
foreach ($data['content'] as $block) if (($block['type'] ?? '') === 'text') $reply .= $block['text'];
$reply = trim($reply);
if ($reply === '') fail('empty_reply');

echo json_encode(['success' => true, 'reply' => $reply]);
