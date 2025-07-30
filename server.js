const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const sql = require('mssql');
const nodemailer = require('nodemailer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// View Engine & Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'stylesheet')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// SQL Server Config
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Connect DB on startup
async function connectToDB() {
  try {
    await sql.connect(dbConfig);
    console.log('Connected to SQL Server');
  } catch (err) {
    console.error('DB connection failed:', err);
  }
}

// Auth Middleware
function isAuthenticated(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect('/');
}

// OTP & Mail Setup
let OTP_STORE = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: '92a3a1003@smtp-brevo.com',
    pass: process.env.SMTP_PASS
  }
});

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

// Multer  file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });



// Login
app.get('/', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await sql.query`SELECT * FROM users WHERE username = ${username}`;
    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        req.session.loggedIn = true;
        req.session.username = username;
        res.redirect('/otp');
      } else {
        res.render('login', { error: 'Invalid username or password' });
      }
    } else {
      res.render('login', { error: 'Invalid username or password' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server error');
  }
});

// Signup
app.get('/signup', (req, res) => {
  res.render('signup', { errors: [] });
});

app.post('/signup', async (req, res) => {
  const { username, password, passkey } = req.body;
  const errors = [];

  if (passkey !== '123') errors.push('Invalid passkey');

  const result = await sql.query`SELECT * FROM users WHERE username = ${username}`;
  if (result.recordset.length > 0) errors.push('Username already exists');

  if (errors.length > 0) return res.render('signup', { errors });

  const hashedPassword = await bcrypt.hash(password, 10);
  await sql.query`INSERT INTO users (username, password) VALUES (${username}, ${hashedPassword})`;
  res.redirect('/');
});

// OTP
app.get('/otp', isAuthenticated, (req, res) => {
  res.render('index', { message: null });
});

app.post('/send-otp', isAuthenticated, async (req, res) => {
  const email = 'devmunda.personal@gmail.com';
  const otp = generateOTP();
  const expiresAt = Date.now() + 60 * 1000;
  OTP_STORE[email] = { otp, expiresAt };

  const mailOptions = {
    from: 'devmunda.personal@gmail.com',
    to: 'devmunda.mail@gmail.com',
    subject: 'Your OTP Code',
    text: `Your OTP is: ${otp}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.render('verify', { email, message: 'OTP sent.', expiresAt });
  } catch (err) {
    console.error(err);
    res.render('index', { message: 'Failed to send OTP. Check email config.' });
  }
});
//verify-otp
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = OTP_STORE[email];

  if (!record || Date.now() > record.expiresAt) return res.redirect('/');

  if (record.otp !== otp) {
    return res.render('verify', {
      email,
      message: 'Incorrect OTP.',
      expiresAt: record.expiresAt
    });
  }

  delete OTP_STORE[email];
  res.redirect('/dashboard');
});

// Dashboard
app.get('/dashboard', isAuthenticated, (req, res) => {
  res.render('dashboard', { username: req.session.username });
});

// Create Company
app.get('/create-company', isAuthenticated, (req, res) => {
  res.render('create-company');
});

app.post('/show', isAuthenticated, (req, res) => {
  const data = req.body;
  res.render('show', { data });
});

// File Upload Routes
app.get('/upload-form', isAuthenticated, (req, res) => {
  res.render('upload-form');
});

app.post('/upload', isAuthenticated, upload.single('uploadedFile'), async (req, res) => {
  const { filename, date, fileLink } = req.body;
  let stored_filename;


  if (req.file) {
    stored_filename = req.file.filename; 
  } else if (fileLink && fileLink.trim() !== '') {
    stored_filename = fileLink.trim();
  } else {
    return res.send('Please upload a file or enter a valid link.');
  }

  try {
    await sql.connect(dbConfig);
    await sql.query`
      INSERT INTO resources (filename, filelink, uploaded_at)
      VALUES (${filename}, ${stored_filename}, ${date})`;
    res.redirect('/file-list');
  } catch (err) {
    res.send('Upload error: ' + err.message);
  }
});


// File List
app.get('/file-list', isAuthenticated, async (req, res) => {
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`SELECT * FROM resources uploaded_at`;
    res.render('file-list', { files: result.recordset });
  } catch (err) {
    res.send('file-list error: ' + err.message);
  }
});

// DELETE file
app.get('/delete/:id', isAuthenticated, async (req, res) => {
  const fileId = req.params.id;
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`SELECT filelink FROM resources WHERE id = ${fileId}`;
    if (result.recordset.length > 0) {
      const filelink = result.recordset[0].filelink;
      const filepath = path.join(__dirname, 'uploads', filelink);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath); // delete file from disk
    }

    await sql.query`DELETE FROM resources WHERE id = ${fileId}`;
    res.redirect('/file-list');
  } catch (err) {
    res.send('Delete error: ' + err.message);
  }
});

//update
app.get('/update/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`SELECT * FROM resources WHERE id = ${id}`;
    const file = result.recordset[0];
    if (!file) return res.send('File not found');
    res.render('update-form', { file });
  } catch (err) {
    res.send('Error fetching file: ' + err.message);
  }
});

// UPDATE submit
app.post('/update/:id', isAuthenticated, upload.single('uploadedFile'), async (req, res) => {
  const { id } = req.params;
  const { filename, date, filelink } = req.body;

  try {
    await sql.connect(dbConfig);

   
    let newFileLink;
    if (filelink && filelink.startsWith('http')) {
      newFileLink = filelink;
    } else if (req.file) {
      newFileLink = req.file.filename;
    } else {
      const oldFile = await sql.query`SELECT filelink FROM resources WHERE id = ${id}`;
      newFileLink = oldFile.recordset[0].filelink;
    }

    await sql.query`
      UPDATE resources 
      SET filename = ${filename}, 
          filelink = ${newFileLink}, 
          uploaded_at = ${date} 
      WHERE id = ${id}`;

    res.redirect('/file-list');
  } catch (err) {
    res.send('Update error: ' + err.message);
  }
});



// Serve Uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Server Start
app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
  connectToDB();
});


