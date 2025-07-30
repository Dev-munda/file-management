// const express = require('express');
// const dotenv = require('dotenv');
// const path = require('path');
// const sql = require('mssql');
// const nodemailer = require('nodemailer');
// const session = require('express-session');
// const flash = require('connect-flash');
// const bcrypt = require('bcrypt');


// dotenv.config();

// const app = express();
// const port = process.env.PORT || 3000;


// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));
// app.use(express.static(path.join(__dirname, 'stylesheet')));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use((req, res, next) => {
//   res.set('Cache-Control', 'no-store');
//   next();
// });

// app.use(session({
//   secret: 'your-secret-key', 
//   resave: false,
//   saveUninitialized: false
// }));
// // SQL Server connection config
// const config = {
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   server: process.env.DB_SERVER,
//   database: process.env.DB_NAME,
//   options: {
//     encrypt: false,
//     trustServerCertificate: true,
//   },

// };

// // Connect to DB
// async function connectToDB() {
//   try {
//     await sql.connect(config);
//     console.log('Connected to SQL Server');
//   } catch (err) {
//     console.error('DB connection failed:', err);
//   }
// }

// // Routes
// app.get('/', (req, res) => {
//   res.render('login', { error: null });
// });

// //  login logic inside POST route
// app.post('/login', async (req, res) => {
//   const { username, password } = req.body;

//   try {
//     // Get user by username
//     const result = await sql.query`
//       SELECT * FROM users WHERE username = ${username}
//     `;

//     if (result.recordset.length > 0) {
//       const user = result.recordset[0];
//       console.log(user);

//       //  Compare entered password with hashed password from DB
//       const isMatch = await bcrypt.compare(password, user.password);

//       if (isMatch) {
//         // Set session if password matches
//         req.session.loggedIn = true;
//         req.session.username = username;

//         res.redirect('/dashboard');
//       } else {
//         // Password does not match
//         res.render('login', { error: 'Invalid username or password' });
//       }

//     } else {
//       // Username not found
//       res.render('login', { error: 'Invalid username or password' });
//     }

//   } catch (err) {
//     console.error('Login error:', err);
//     res.status(500).send('Server error');
//   }
// });


// // Dashboard route
// app.get('/dashboard', (req, res) => {
//   if (req.session.loggedIn) {
//     res.render('dashboard', { username: req.session.username });
//   } else {
//     res.redirect('/');
//   }
// });

// //logout route
// app.get('/logout', (req, res) => {
//   req.session.destroy(() => {
//     res.redirect('/');
//   });
// });

// //signup
// app.get('/signup', (req, res) => {
//   res.render('signup');
//   // res.redirect('/');

//   });

// app.post('/signup', async (req, res) => {
//   const { username, password, passkey } = req.body;
//   const errors = [];

//     // const password1 = password;
//     console.log(password);
//     const hashedpassword = await bcrypt.hash(password, 10);
//     console.log(hashedpassword);

//   try {
//     // Check passkey
//     if (passkey !== '123') {
//       errors.push('Invalid passkey');
//     }
//     // Check if username exists
//     const result = await sql.query`
//       SELECT * FROM users WHERE username = ${username}
//     `;
//     if (result.recordset.length > 0) {
//       errors.push('Username already exists');
//     }
//     // If any errors, re-render the signup page
//     if (errors.length > 0) {
//       return res.render('signup', { errors });
//     }
//     // Insert user into DB
//     await sql.query`
//       INSERT INTO users (username, password)
//       VALUES (${username}, ${hashedpassword})
//     `;
//     console.log('User registered successfully');
//     res.redirect('/');
//   } catch (err) {
//     console.error('Signup error:', err);
//     res.status(500).send('Server error');
//   }
//  });

//  app.get("/create-company",(req, res)=>{
//     res.render("create-company.ejs");
//   })

// //submit
// app.post("/show",(req, res) =>{
//   const data = req.body;
//   res.render("show.ejs",{data: req.body});
// })

// // this is otp part 



// // Start server
// app.listen(port, () => {
//   console.log(`App running at http://localhost:${port}`);
//   connectToDB();
// });
