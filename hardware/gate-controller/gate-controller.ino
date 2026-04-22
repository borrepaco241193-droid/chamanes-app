// =============================================================
// Chamanes — Controlador de Acceso
// Hardware: ESP8266 (NodeMCU v3) o ESP32
//
// Función: Cada 2.5 segundos consulta el servidor de Chamanes.
//          Si hay un comando pendiente, activa el relay 4 segundos
//          (tiempo suficiente para que el motor de la barrera abra),
//          luego envía ACK para limpiar el comando.
//
// Conexiones:
//   NodeMCU D1 (GPIO5) → Relay IN
//   NodeMCU 5V         → Relay VCC
//   NodeMCU GND        → Relay GND
//   Relay COM          → Terminal COM del motor/barrera
//   Relay NO           → Terminal de apertura del motor/barrera
// =============================================================

// ── Selecciona tu placa ───────────────────────────────────────
#define USE_ESP8266    // NodeMCU / Wemos D1 Mini
// #define USE_ESP32   // Descomenta esta línea si usas ESP32

#ifdef USE_ESP8266
  #include <ESP8266WiFi.h>
  #include <ESP8266HTTPClient.h>
  #include <WiFiClientSecureBearSSL.h>
#else
  #include <WiFi.h>
  #include <HTTPClient.h>
  #include <WiFiClientSecure.h>
#endif

#include <ArduinoJson.h>

// =============================================================
// ⚙️  CONFIGURACIÓN — Edita estos valores antes de cargar
// =============================================================

const char* WIFI_SSID     = "NOMBRE_DE_TU_WIFI";
const char* WIFI_PASSWORD = "CONTRASENA_DE_TU_WIFI";

// URL base del backend en Railway (sin slash al final)
const char* API_BASE = "https://chamanes-app-production.up.railway.app/api/v1";

// ID de tu comunidad (cópialo de la URL o de la BD)
const char* COMMUNITY_ID = "TU_COMMUNITY_ID";

// Clave secreta — debe coincidir exactamente con GATE_API_KEY en Railway
const char* GATE_API_KEY = "TU_GATE_API_KEY";

// =============================================================
// ⚙️  AJUSTES DE HARDWARE
// =============================================================

#ifdef USE_ESP8266
  #define PIN_RELAY  D1   // GPIO5 — señal al relay
  #define PIN_LED    D4   // LED integrado del NodeMCU (activo en LOW)
  #define LED_ON     LOW
  #define LED_OFF    HIGH
#else
  #define PIN_RELAY  26
  #define PIN_LED    2
  #define LED_ON     HIGH
  #define LED_OFF    LOW
#endif

// Tiempo que el relay permanece activo (ms)
// Ajusta según cuánto tarda en abrir tu barrera
const unsigned long RELAY_OPEN_MS   = 4000;

// Intervalo entre consultas al servidor (ms)
const unsigned long POLL_INTERVAL   = 2500;

// Timeout para cada petición HTTP (ms)
const unsigned long HTTP_TIMEOUT    = 8000;

// =============================================================
// Variables internas
// =============================================================

unsigned long lastPollAt    = 0;
unsigned long relayOpenedAt = 0;
bool          relayActive   = false;

// =============================================================
// Funciones auxiliares
// =============================================================

String endpoint(const char* path) {
  return String(API_BASE) + "/communities/" + String(COMMUNITY_ID) + path;
}

void setRelay(bool open) {
  digitalWrite(PIN_RELAY, open ? HIGH : LOW);
  digitalWrite(PIN_LED, open ? LED_ON : LED_OFF);
  relayActive = open;
  if (open) relayOpenedAt = millis();
  Serial.println(open ? "[Relay] ABIERTO" : "[Relay] CERRADO");
}

// Consulta si hay comando pendiente
// Retorna true si hay un ENTRY o EXIT en cola
bool pollPending() {
  #ifdef USE_ESP8266
    BearSSL::WiFiClientSecure client;
  #else
    WiFiClientSecure client;
  #endif
  client.setInsecure(); // Acepta cualquier certificado SSL (simplificado para hardware)

  HTTPClient http;
  http.begin(client, endpoint("/gate/pending"));
  http.setTimeout(HTTP_TIMEOUT);
  http.addHeader("X-Gate-Key", GATE_API_KEY);

  int code = http.GET();

  if (code != 200) {
    Serial.printf("[Poll] Error HTTP %d\n", code);
    http.end();
    return false;
  }

  String body = http.getString();
  http.end();

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, body)) return false;

  bool pending = doc["pending"] | false;
  if (pending) {
    const char* type = doc["command"]["type"] | "?";
    Serial.printf("[Poll] Comando recibido: %s\n", type);
  }
  return pending;
}

// Confirma al servidor que el comando fue ejecutado
bool sendAck() {
  #ifdef USE_ESP8266
    BearSSL::WiFiClientSecure client;
  #else
    WiFiClientSecure client;
  #endif
  client.setInsecure();

  HTTPClient http;
  http.begin(client, endpoint("/gate/ack"));
  http.setTimeout(HTTP_TIMEOUT);
  http.addHeader("X-Gate-Key", GATE_API_KEY);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST("{\"executed\":true}");
  http.end();

  bool ok = (code == 200);
  Serial.printf("[ACK] %s (HTTP %d)\n", ok ? "OK" : "FALLO", code);
  return ok;
}

void blinkLed(int veces, int ms) {
  for (int i = 0; i < veces; i++) {
    digitalWrite(PIN_LED, LED_ON);  delay(ms);
    digitalWrite(PIN_LED, LED_OFF); delay(ms);
  }
}

// =============================================================
// Setup
// =============================================================

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  setRelay(false);

  Serial.println("\n╔══════════════════════════════╗");
  Serial.println("║  Chamanes Gate Controller    ║");
  Serial.println("╚══════════════════════════════╝");

  // Conectar WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("[WiFi] Conectando a %s", WIFI_SSID);

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
    blinkLed(3, 150); // 3 parpadeos = listo
    Serial.println("[Gate] Iniciando polling...\n");
  } else {
    Serial.println("\n[WiFi] ERROR — Revisa SSID/contraseña");
    Serial.println("[Gate] Reiniciando en 5 segundos...");
    blinkLed(10, 100);
    delay(2000);
    ESP.restart();
  }
}

// =============================================================
// Loop
// =============================================================

void loop() {

  // ── Reconexión WiFi automática ────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Desconectado — reconectando...");
    WiFi.reconnect();
    delay(3000);
    return;
  }

  // ── Cierre automático del relay ───────────────────────────
  if (relayActive && millis() - relayOpenedAt >= RELAY_OPEN_MS) {
    setRelay(false);
  }

  // ── Polling al servidor ───────────────────────────────────
  if (!relayActive && millis() - lastPollAt >= POLL_INTERVAL) {
    lastPollAt = millis();

    bool hayComando = pollPending();
    if (hayComando) {
      setRelay(true);    // Abrir barrera
      delay(300);
      sendAck();         // Notificar al servidor
    }
  }
}
