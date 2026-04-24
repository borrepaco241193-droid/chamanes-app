// =============================================================
// Chamanes — Controlador de Acceso (Doble Relay)
// Hardware: ESP8266 NodeMCU v3
//
// Relay 1 (ENTRADA): D1 = GPIO5
// Relay 2 (SALIDA):  D2 = GPIO4
//
// Wiring:
//   NodeMCU D1 (GPIO5) → Relay IN1  (entrada)
//   NodeMCU D2 (GPIO4) → Relay IN2  (salida)
//   NodeMCU VIN (5V)   → Relay JD-VCC  ← IMPORTANTE: 5V no 3.3V
//   NodeMCU 3.3V       → Relay VCC
//   NodeMCU GND        → Relay GND
// =============================================================

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>
#include <ArduinoJson.h>

// =============================================================
// ⚙️  CONFIGURACIÓN — Edita estos valores antes de cargar
// =============================================================

const char* WIFI_SSID     = "NOMBRE_DE_TU_NUEVO_WIFI";   // ← Cambia esto
const char* WIFI_PASSWORD = "CONTRASENA_DE_TU_WIFI";      // ← Cambia esto

const char* API_BASE      = "https://chamanes-app-production.up.railway.app/api/v1";
const char* COMMUNITY_ID  = "TU_COMMUNITY_ID";             // ← ID de tu comunidad
const char* GATE_API_KEY  = "TU_GATE_API_KEY";             // ← Clave secreta

// =============================================================
// ⚙️  PINES — GPIO directos para evitar error 'D1 not declared'
// =============================================================

#define PIN_ENTRADA  5    // D1 = GPIO5
#define PIN_SALIDA   4    // D2 = GPIO4
#define PIN_LED      2    // D4 = LED integrado (activo en LOW)

#define RELE_ON   LOW     // Módulo de relay activo-LOW
#define RELE_OFF  HIGH
#define LED_ON    LOW
#define LED_OFF   HIGH

// =============================================================
// ⚙️  TIEMPOS
// =============================================================

const unsigned long RELAY_OPEN_MS = 4000;   // Tiempo que queda abierto el relay
const unsigned long POLL_INTERVAL = 2500;   // Polling al servidor
const unsigned long HTTP_TIMEOUT  = 8000;   // Timeout HTTP

// =============================================================
// Variables internas
// =============================================================

struct Relay {
  int  pin;
  bool active;
  unsigned long openedAt;
  const char*   name;
};

Relay entrada = { PIN_ENTRADA, false, 0, "ENTRADA" };
Relay salida  = { PIN_SALIDA,  false, 0, "SALIDA"  };

unsigned long lastPollAt = 0;

// Cliente HTTPS global — evita fragmentación del heap en ESP8266
BearSSL::WiFiClientSecure secureClient;

// =============================================================
// Helpers
// =============================================================

String endpoint(const char* path) {
  return String(API_BASE) + "/communities/" + String(COMMUNITY_ID) + path;
}

void setRelay(Relay& r, bool open) {
  digitalWrite(r.pin, open ? RELE_ON : RELE_OFF);
  r.active   = open;
  r.openedAt = open ? millis() : 0;
  Serial.printf("[Relay %s] %s\n", r.name, open ? "ABIERTO" : "CERRADO");
}

void tickRelays() {
  unsigned long now = millis();
  if (entrada.active && now - entrada.openedAt >= RELAY_OPEN_MS) setRelay(entrada, false);
  if (salida.active  && now - salida.openedAt  >= RELAY_OPEN_MS) setRelay(salida,  false);
}

void blinkLed(int veces, int ms) {
  for (int i = 0; i < veces; i++) {
    digitalWrite(PIN_LED, LED_ON);  delay(ms);
    digitalWrite(PIN_LED, LED_OFF); delay(ms);
  }
}

// =============================================================
// Poll — consulta entry y exit por separado
// =============================================================

void checkCommunity(const char* communityId) {
  HTTPClient http;
  String url = String(API_BASE) + "/communities/" + String(communityId) + "/gate/pending";
  http.begin(secureClient, url);
  http.setTimeout(HTTP_TIMEOUT);
  http.addHeader("X-Gate-Key", GATE_API_KEY);

  int code = http.GET();
  if (code != 200) {
    Serial.printf("[Poll] HTTP %d para comunidad %s\n", code, communityId);
    http.end();
    return;
  }

  String body = http.getString();
  http.end();
  yield();

  JsonDocument doc;
  if (deserializeJson(doc, body)) {
    Serial.println("[Poll] JSON inválido");
    return;
  }

  bool entryPending = doc["entry"]["pending"] | false;
  bool exitPending  = doc["exit"]["pending"]  | false;

  // ── Procesar ENTRADA ────────────────────────────────────────
  if (entryPending) {
    Serial.printf("[Poll] ENTRADA pendiente en %s\n", communityId);

    // ACK primero para evitar doble activación
    HTTPClient ackHttp;
    String ackUrl = String(API_BASE) + "/communities/" + String(communityId) + "/gate/ack";
    ackHttp.begin(secureClient, ackUrl);
    ackHttp.addHeader("Content-Type", "application/json");
    ackHttp.addHeader("X-Gate-Key", GATE_API_KEY);
    int ackCode = ackHttp.POST("{\"executed\":true,\"type\":\"ENTRY\"}");
    ackHttp.end();
    yield();
    Serial.printf("[ACK ENTRY] HTTP %d\n", ackCode);

    setRelay(entrada, true);
  }

  // ── Procesar SALIDA ─────────────────────────────────────────
  if (exitPending) {
    Serial.printf("[Poll] SALIDA pendiente en %s\n", communityId);

    HTTPClient ackHttp;
    String ackUrl = String(API_BASE) + "/communities/" + String(communityId) + "/gate/ack";
    ackHttp.begin(secureClient, ackUrl);
    ackHttp.addHeader("Content-Type", "application/json");
    ackHttp.addHeader("X-Gate-Key", GATE_API_KEY);
    int ackCode = ackHttp.POST("{\"executed\":true,\"type\":\"EXIT\"}");
    ackHttp.end();
    yield();
    Serial.printf("[ACK EXIT] HTTP %d\n", ackCode);

    setRelay(salida, true);
  }
}

// =============================================================
// Setup
// =============================================================

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(PIN_ENTRADA, OUTPUT);
  pinMode(PIN_SALIDA,  OUTPUT);
  pinMode(PIN_LED,     OUTPUT);

  setRelay(entrada, false);
  setRelay(salida,  false);
  digitalWrite(PIN_LED, LED_OFF);

  secureClient.setInsecure(); // Acepta cualquier certificado SSL

  Serial.println("\n╔══════════════════════════════╗");
  Serial.println("║  Chamanes Gate Controller    ║");
  Serial.println("║  Doble Relay (Entrada+Salida) ║");
  Serial.println("╚══════════════════════════════╝");
  Serial.printf("[WiFi] Conectando a: %s\n", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 40) {
    delay(500);
    Serial.print(".");
    intentos++;
    digitalWrite(PIN_LED, intentos % 2 == 0 ? LED_ON : LED_OFF);
  }
  digitalWrite(PIN_LED, LED_OFF);

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Conectado — IP: %s\n", WiFi.localIP().toString().c_str());
    blinkLed(3, 150);
    Serial.printf("[Gate] Comunidad: %s\n", COMMUNITY_ID);
    Serial.println("[Gate] Iniciando polling...\n");
  } else {
    Serial.println("\n[WiFi] ERROR — Revisa SSID/contraseña en el sketch");
    blinkLed(10, 80);
    delay(1000);
    ESP.restart();
  }
}

// =============================================================
// Loop
// =============================================================

void loop() {
  // Reconexión automática
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Desconectado — reconectando...");
    WiFi.reconnect();
    delay(3000);
    return;
  }

  // Cierre automático de relays
  tickRelays();

  // Polling
  if (millis() - lastPollAt >= POLL_INTERVAL) {
    lastPollAt = millis();
    checkCommunity(COMMUNITY_ID);
  }

  yield();
}
