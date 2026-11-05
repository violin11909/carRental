const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { once } = require('node:events');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Car = require('../models/Car');
const User = require('../models/User');
const Booking = require('../models/Booking');
const root = path.resolve(__dirname, '..');
const userId = '507f1f77bcf86cd799439011';
const carId = '507f1f77bcf86cd799439012';
const bookingId = '507f1f77bcf86cd799439013';
let server, baseUrl, token, swaggerSchema;
let requestCount = 0;
const originals = [];

function stub(object, method, replacement) {
  originals.push([object, method, object[method]]);
  object[method] = replacement;
}

before(async () => {
  // Exercise the real server's middleware and routes without loading secrets,
  // connecting to MongoDB, sending mail, or occupying the configured port.
  const realRequire = createRequire(path.join(root, 'server.js'));
  const environment = {
    NODE_ENV: 'test', JWT_SECRET: 'compatibility-tests-only',
    JWT_EXPIRE: '1d', JWT_COOKIE_EXPIRE: '1', PORT: '0'
  };
  for (const [key, value] of Object.entries(environment)) {
    originals.push([process.env, key, process.env[key]]);
    process.env[key] = value;
  }
  const listen = express.application.listen;
  express.application.listen = function () {
    server = listen.call(this, 0, '127.0.0.1');
    return server;
  };
  try {
    vm.runInNewContext(fs.readFileSync(path.join(root, 'server.js'), 'utf8'), {
      require(name) {
        if (name === './config/db') return async () => {};
        if (name === 'dotenv') return { config() {} };
        if (name === 'swagger-jsdoc') return options => {
          swaggerSchema = realRequire(name)(options);
          return swaggerSchema;
        };
        return realRequire(name);
      },
      process: { env: process.env, on() {} },
      console: { log() {} }
    }, { filename: path.join(root, 'server.js') });
  } finally {
    express.application.listen = listen;
  }
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  token = jwt.sign({ id: userId }, environment.JWT_SECRET, { expiresIn: '1d' });
  stub(User, 'findById', (id, callback) => {
    const user = { id: userId, _id: userId, role: 'user', name: 'Test User' };
    if (callback) { callback(null, user); return; }
    return Promise.resolve(user);
  });
});

after(async () => {
  for (const [object, key, value] of originals.reverse()) {
    if (value === undefined) delete object[key];
    else object[key] = value;
  }
  if (server) await new Promise(resolve => server.close(resolve));
});

async function request(route, options = {}) {
  requestCount++;
  const response = await fetch(baseUrl + route, options);
  return { status: response.status, headers: response.headers, body: await response.json() };
}

test('public car list retains filtering, selection, sorting, and pagination', async () => {
  const calls = {};
  const data = [{ _id: carId, model: 'Test Car' }];
  const query = Promise.resolve(data);
  for (const method of ['select', 'sort', 'skip', 'limit']) {
    query[method] = value => { calls[method] = value; return query; };
  }
  stub(Car, 'find', filter => { calls.filter = filter; return query; });
  stub(Car, 'countDocuments', async () => 7);
  const result = await request('/api/v1/cars?dayRate[gte]=100&select=model,dayRate&sort=dayRate,model&page=2&limit=2');
  assert.equal(result.status, 200);
  assert.deepEqual(calls, {
    filter: { dayRate: { $gte: '100' } }, select: 'model dayRate',
    sort: 'dayRate model', skip: 2, limit: 2
  });
  assert.deepEqual(result.body, {
    success: true, count: 1, pagination: {
      next: { page: 3, limit: 2 }, prev: { page: 1, limit: 2 }
    }, data
  });
  assert.equal(result.headers.get('access-control-allow-origin'), '*');
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(result.headers.get('x-ratelimit-limit'), '100');
});

test('JSON and form login retain missing-credential responses', async () => {
  for (const [type, body] of [['application/json', '{}'], ['application/x-www-form-urlencoded', 'email=test%40example.com']]) {
    const result = await request('/api/v1/auth/login', {
      method: 'POST', headers: { 'content-type': type }, body
    });
    assert.equal(result.status, 400);
    assert.deepEqual(result.body, { success: false, msg: 'Please provide an email and password' });
  }
});

test('login preserves JWT payload, response fields, and HTTP-only cookie', async () => {
  const user = new User({ _id: userId, name: 'Test User', email: 'test@example.com', tel: '0812345678' });
  user.password = await bcrypt.hash('password123', 10);
  stub(User, 'findOne', filter => {
    assert.deepEqual(filter, { email: 'test@example.com' });
    return { select: async field => { assert.equal(field, '+password'); return user; } };
  });
  const result = await request('/api/v1/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
  });
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.body).sort(), ['_id', 'email', 'name', 'success', 'token']);
  assert.equal(result.body._id, userId);
  assert.equal(jwt.verify(result.body.token, process.env.JWT_SECRET).id, userId);
  assert.match(result.headers.get('set-cookie'), /token=.*HttpOnly/);
});

test('protected endpoints and role checks retain status and response shape', async () => {
  const denied = await request('/api/v1/bookings');
  assert.equal(denied.status, 401);
  assert.deepEqual(denied.body, { success: false, message: 'Not authorize to access this route' });
  const forbidden = await request('/api/v1/cars', {
    method: 'POST', headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(forbidden.status, 403);
  assert.deepEqual(forbidden.body, { success: false, message: 'User role user is not authorized to access this route' });
});

test('nested booking creation retains validation and successful response', async () => {
  stub(Car, 'findById', async id => { assert.equal(id, carId); return { _id: id }; });
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const invalid = await request(`/api/v1/cars/${carId}/bookings`, {
    method: 'POST', headers, body: JSON.stringify({ pickupDate: '2026-10-03', returnDate: '2026-10-02' })
  });
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body, { success: false, message: 'The return date should be after the pickup date.' });
  stub(Booking, 'create', async body => ({ _id: bookingId, ...body }));
  const body = { pickupDate: '2026-10-02', returnDate: '2026-10-03', pickupLocation: 'A', returnLocation: 'B' };
  const created = await request(`/api/v1/cars/${carId}/bookings`, { method: 'POST', headers, body: JSON.stringify(body) });
  assert.equal(created.status, 200);
  assert.deepEqual(created.body, { success: true, data: { _id: bookingId, ...body, car: carId, user: userId } });
});

test('booking deletion retains document removal and response', async () => {
  let removed = false;
  stub(Booking, 'findById', async () => ({ user: userId, async remove() { removed = true; } }));
  const result = await request(`/api/v1/bookings/${bookingId}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
  assert.equal(removed, true);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { success: true, data: {} });
});

test('Swagger page and generated API schema remain available', async () => {
  requestCount++;
  const response = await fetch(baseUrl + '/api-docs/');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Swagger UI/);
  // Normalize the VM realm while comparing every schema value and array order.
  assert.deepEqual(JSON.parse(JSON.stringify(swaggerSchema)), JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/swagger.json'), 'utf8')));
});

test('bcrypt preserves existing stored hashes including Unicode and long passwords', async () => {
  for (const { password, hash } of require('./fixtures/passwords.json')) {
    assert.equal(await bcrypt.compare(password, hash), true);
    assert.equal(await bcrypt.compare('incorrect password', hash), false);
  }
});

test('mail transport preserves callback API without contacting SMTP', async () => {
  const transport = require('nodemailer').createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  const info = await new Promise((resolve, reject) => transport.sendMail({ from: 'test@example.com', to: 'recipient@example.com', subject: 'Booking Confirmation', text: 'Booking details' }, (error, result) => error ? reject(error) : resolve(result)));
  assert.match(info.message.toString(), /Subject: Booking Confirmation/);
  assert.match(info.message.toString(), /Booking details/);
});

test('query sanitization and duplicate-parameter handling remain active', async () => {
  let filter;
  const query = Promise.resolve([]);
  for (const method of ['sort', 'skip', 'limit']) query[method] = () => query;
  stub(Car, 'find', value => { filter = value; return query; });
  const result = await request('/api/v1/cars?model=first&model=last&description=%3Cscript%3Ealert(1)%3C%2Fscript%3E&unsafe[$ne]=x');
  assert.equal(result.status, 200);
  assert.equal(filter.model, 'last');
  // Preserve the controller's existing operator replacement inside strings too.
  assert.equal(filter.description, '&$lt;script>alert(1)&$lt;/script>');
  assert.deepEqual(filter.unsafe, {});
});

test('the rate limit remains 100 requests per ten-minute window', async () => {
  while (requestCount < 100) {
    const response = await request('/api/v1/auth/logout');
    assert.equal(response.status, 200);
  }
  const response = await fetch(baseUrl + '/api/v1/auth/logout');
  assert.equal(response.status, 429);
  assert.equal(await response.text(), 'Too many requests, please try again later.');
  assert.equal(response.headers.get('x-ratelimit-limit'), '100');
  assert.equal(response.headers.get('x-ratelimit-remaining'), '0');
  const retryAfter = Number(response.headers.get('retry-after'));
  assert.ok(retryAfter > 0 && retryAfter <= 600);
});
