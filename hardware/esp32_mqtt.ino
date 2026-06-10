#include <WiFi.h>
#include <PubSubClient.h>

// Update these with your settings
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "YOUR_HOME_ASSISTANT_IP";

WiFiClient espClient;
PubSubClient client(espClient);

// Device Pins
const int LIGHT_PIN = 2;
const int FAN_PIN = 4;
const int LOCK_PIN = 5;

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Control Logic
  if (String(topic) == "home/lights/set") {
    if (message == "ON") digitalWrite(LIGHT_PIN, HIGH);
    else if (message == "OFF") digitalWrite(LIGHT_PIN, LOW);
  }
  else if (String(topic) == "home/fans/set") {
    if (message == "ON") digitalWrite(FAN_PIN, HIGH);
    else if (message == "OFF") digitalWrite(FAN_PIN, LOW);
  }
  else if (String(topic) == "home/lock/set") {
    if (message == "LOCKED") digitalWrite(LOCK_PIN, HIGH);
    else if (message == "UNLOCKED") digitalWrite(LOCK_PIN, LOW);
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP32Client")) {
      Serial.println("connected");
      client.subscribe("home/lights/set");
      client.subscribe("home/fans/set");
      client.subscribe("home/lock/set");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(LOCK_PIN, OUTPUT);
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
}
