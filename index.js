const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const USERS_FILE = path.join(__dirname, 'users.json');

function readUsers() {
  return new Promise((resolve, reject) => {
    fs.readFile(USERS_FILE, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') return resolve([]); // If file doesn't exist, return empty array
        return reject(err);
      }
      try {
        const users = JSON.parse(data);
        resolve(users);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}

function writeUsers(users) {
  return new Promise((resolve, reject) => {
    fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8', (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}


app.get('/users', async (req, res) => {
  try {
    const users = await readUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read users.' });
  }
});


app.post('/users', async (req, res) => {
  const { name, age } = req.body;

  if (!name || typeof age !== 'number') {
    return res.status(400).json({ error: 'Name and age are required. Age must be a number.' });
  }

  try {
    const users = await readUsers();
    const maxId = users.reduce((max, user) => (user.id > max ? user.id : max), 0);
    const newUser = { id: maxId + 1, name, age };
    users.push(newUser);

    await writeUsers(users);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save user.' });
  }
});


app.put('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, age } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  if (!name && typeof age !== 'number' && typeof age !== 'undefined') {
    return res.status(400).json({ error: 'Provide at least name or age (number) to update.' });
  }

  try {
    const users = await readUsers();
    const userIndex = users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (name) users[userIndex].name = name;
    if (typeof age === 'number') users[userIndex].age = age;

    await writeUsers(users);
    res.json(users[userIndex]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

app.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  try {
    const users = await readUsers();
    const userIndex = users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }

    users.splice(userIndex, 1);

    await writeUsers(users);
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

app.get('/users/search', async (req, res) => {
  const keyword = req.query.name;
  if (!keyword) {
    return res.status(400).json({ error: 'Query parameter "name" is required.' });
  }

  try {
    const users = await readUsers();
    const filtered = users.filter((u) =>
      u.name.toLowerCase().includes(keyword.toLowerCase())
    );
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search users.' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
