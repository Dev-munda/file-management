server.js is the file to start the app

//USE MSSQL
//for users table structure

CREATE TABEL users(
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    Created_at DATETIME DEFAULT GETDATE()
)

//for resources table structure

CREATE TABLE resources (
    id INT IDENTITY(1,1) PRIMARY KEY,
    filename NVARCHAR(MAX) NOT NULL,
    filelink NVARCHAR(MAX) NOT NULL,
     uploaded_at DATETIME DEFAULT GETDATE()
);