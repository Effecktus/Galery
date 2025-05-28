// Конфигурация базы данных
module.exports = {
  host: process.env.DB_HOST || "localhost",
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "gallery_db",
  port: process.env.DB_PORT || 3306,
  dialect: "mysql",
  logging: process.env.NODE_ENV === "test" ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
}; 