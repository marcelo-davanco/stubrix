// scripts/mongo-init.js
// Inicializa o banco stubrix com coleções de exemplo

db = db.getSiblingDB("stubrix");

db.createCollection("USERS");
db.createCollection("MOCKVALUES");

db.USERS.insertMany([
  {
    name: "Alice",
    email: "alice@example.com",
    role: "admin",
    createdAt: new Date(),
  },
  {
    name: "Bob",
    email: "bob@example.com",
    role: "user",
    createdAt: new Date(),
  },
]);

db.MOCKVALUES.insertMany([
  { key: "api_timeout", value: 5000, environment: "development" },
  { key: "max_retries", value: 3, environment: "production" },
]);

print(
  "✅ MongoDB initialized: stubrix database with USERS and MOCKVALUES collections",
);
